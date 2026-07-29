use std::path::Path;

use sbls_package_codec::{
    decode_project_package, encode_project_package_from_borrowed, AssetCapture,
    AssetCaptureDecision, AssetOwner, CaseSurface, LogoRole, PackageCreator, PlatformKind,
    ProjectPackageFailure, TechnicalKind,
};
use serde::{Deserialize, Serialize};
use tauri::http::HeaderMap;
use tauri::ipc::{InvokeBody, Request, Response};

use crate::commands::project_files::{
    path_from_headers, path_from_named_header, read_project_bytes_request_with,
    ProjectFileCommandFailure,
};
use crate::legacy_project_identity::{
    compare_legacy_source_destination, LegacyDestinationIdentity,
};
use crate::project_binary_io::{self, BinaryProjectReadError};
use crate::project_file::{self, AtomicProjectWritePhase};

const LEGACY_SOURCE_PATH_HEADER_NAME: &str = "x-sbls-legacy-source-path-v1";
const WRITE_REQUEST_MAGIC: &[u8; 8] = b"SBLSPSV1";
const WRITE_REQUEST_HEADER_BYTES: usize = 16;
const MAX_CAPTURE_PLAN_BYTES: usize = 2_097_152;
const MAX_PROJECT_JSON_BYTES: usize = 16_777_216;
const MAX_CONCRETE_OWNERS: usize = 4_096;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectPackageCommandCause {
    stage: &'static str,
}

#[derive(Debug, Serialize)]
pub(crate) struct ProjectPackageCommandFailure {
    status: &'static str,
    code: &'static str,
    recoverable: bool,
    message: &'static str,
    cause: ProjectPackageCommandCause,
}

impl From<ProjectPackageFailure> for ProjectPackageCommandFailure {
    fn from(failure: ProjectPackageFailure) -> Self {
        Self {
            status: failure.status(),
            code: failure.code.as_str(),
            recoverable: failure.recoverable(),
            message: failure.safe_message(),
            cause: ProjectPackageCommandCause {
                stage: failure.stage.as_str(),
            },
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub(crate) enum DecodeProjectPackageFileFailure {
    ProjectFile(ProjectFileCommandFailure),
    ProjectPackage(ProjectPackageCommandFailure),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum DestinationFailureCode {
    ExtensionInvalid,
    ConflictsSource,
}

impl DestinationFailureCode {
    const fn as_str(self) -> &'static str {
        match self {
            Self::ExtensionInvalid => "project.package.destination-extension-invalid",
            Self::ConflictsSource => "project.legacy-conversion.destination-conflicts-source",
        }
    }

    const fn message(self) -> &'static str {
        match self {
            Self::ExtensionInvalid => "The package destination must end in .sbls.",
            Self::ConflictsSource => {
                "The package destination must be different from the legacy project source."
            }
        }
    }

    const fn stage(self) -> &'static str {
        match self {
            Self::ExtensionInvalid => "destination-validation",
            Self::ConflictsSource => "destination-identity",
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectPackageDestinationFailure {
    status: &'static str,
    code: &'static str,
    recoverable: bool,
    message: &'static str,
    cause: ProjectPackageDestinationCause,
}

#[derive(Debug, Serialize)]
struct ProjectPackageDestinationCause {
    stage: &'static str,
}

impl ProjectPackageDestinationFailure {
    fn new(code: DestinationFailureCode) -> Self {
        Self {
            status: "failure",
            code: code.as_str(),
            recoverable: true,
            message: code.message(),
            cause: ProjectPackageDestinationCause {
                stage: code.stage(),
            },
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub(crate) enum EncodeAndWriteProjectPackageFileFailure {
    ProjectFile(ProjectFileCommandFailure),
    ProjectPackage(ProjectPackageCommandFailure),
    Destination(ProjectPackageDestinationFailure),
}

#[derive(Debug, Serialize)]
pub(crate) struct EncodeAndWriteProjectPackageFileSuccess {
    status: &'static str,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CapturePlanDto {
    version: u8,
    captures: Vec<CaptureDto>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CaptureDto {
    owner_id: String,
    decision: CaptureDecisionDto,
}

#[derive(Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum CaptureDecisionDto {
    NoAcceptedAsset,
    ProjectOwnedDataUrl,
    QualifiedBuiltIn { compatibility_id: String },
    UnsupportedNonportableAsset,
}

#[derive(Debug)]
struct ParsedWriteRequest<'a> {
    project_json: &'a [u8],
    captures: Vec<AssetCapture>,
}

fn write_request_failure(category: &'static str) -> EncodeAndWriteProjectPackageFileFailure {
    EncodeAndWriteProjectPackageFileFailure::ProjectFile(
        ProjectFileCommandFailure::package_write_request_failure(
            category,
            "project-package-write-request",
        ),
    )
}

fn read_be_u32(bytes: &[u8]) -> Option<usize> {
    let bytes: [u8; 4] = bytes.try_into().ok()?;
    usize::try_from(u32::from_be_bytes(bytes)).ok()
}

fn parse_index(value: &str) -> Option<usize> {
    if value.is_empty() || (value.len() > 1 && value.starts_with('0')) {
        return None;
    }
    let value = value.parse::<usize>().ok()?;
    (value < MAX_CONCRETE_OWNERS).then_some(value)
}

fn parse_surface(value: &str) -> Option<CaseSurface> {
    match value {
        "cover" => Some(CaseSurface::Cover),
        "tray" => Some(CaseSurface::Tray),
        "spine-left" => Some(CaseSurface::SpineLeft),
        "spine-right" => Some(CaseSurface::SpineRight),
        _ => None,
    }
}

fn parse_platform(value: &str) -> Option<PlatformKind> {
    match value {
        "pc" => Some(PlatformKind::Pc),
        "windows" => Some(PlatformKind::Windows),
        "linux" => Some(PlatformKind::Linux),
        "steamDeck" => Some(PlatformKind::SteamDeck),
        "macos" => Some(PlatformKind::Macos),
        _ => None,
    }
}

fn parse_technical(value: &str) -> Option<TechnicalKind> {
    match value {
        "audio" => Some(TechnicalKind::Audio),
        "surround" => Some(TechnicalKind::Surround),
        "codec" => Some(TechnicalKind::Codec),
        "middleware" => Some(TechnicalKind::Middleware),
        "technology" => Some(TechnicalKind::Technology),
        _ => None,
    }
}

fn parse_owner_id(value: &str) -> Option<AssetOwner> {
    let mut segments = value.split('.');
    let first = segments.next()?;
    let second = segments.next()?;
    let third = segments.next();
    let fourth = segments.next();
    let fifth = segments.next();
    if segments.next().is_some() {
        return None;
    }

    match (first, second, third, fourth, fifth) {
        ("disc", "background", None, None, None) => Some(AssetOwner::DiscBackground),
        ("disc", "steam-banner", None, None, None) => Some(AssetOwner::DiscSteamBanner),
        ("disc", "logo", Some(role), None, None) => Some(AssetOwner::DiscPrimaryLogo {
            role: match role {
                "developer" => LogoRole::Developer,
                "publisher" => LogoRole::Publisher,
                _ => return None,
            },
        }),
        ("disc", "logo", Some(role), Some("additional"), Some(index)) => {
            Some(AssetOwner::DiscAdditionalLogo {
                role: match role {
                    "developer" => LogoRole::Developer,
                    "publisher" => LogoRole::Publisher,
                    _ => return None,
                },
                index: parse_index(index)?,
            })
        }
        ("disc", "title", Some("current"), None, None) => Some(AssetOwner::DiscTitleCurrent),
        ("disc", "title", Some("default"), None, None) => Some(AssetOwner::DiscTitleDefault),
        ("disc", "artwork", Some("additional"), Some(index), None) => {
            Some(AssetOwner::DiscAdditionalArtwork {
                index: parse_index(index)?,
            })
        }
        ("disc", "rating", Some("custom"), None, None) => Some(AssetOwner::DiscRatingCustom),
        ("disc", "media", Some("custom"), None, None) => Some(AssetOwner::DiscMediaCustom),
        ("disc", "platform", Some(platform), None, None) => Some(AssetOwner::DiscPlatformCustom {
            platform: parse_platform(platform)?,
        }),
        ("disc", "technical", Some(technical), None, None) => {
            Some(AssetOwner::DiscTechnicalPrimary {
                technical: parse_technical(technical)?,
            })
        }
        ("disc", "technical", Some(technical), Some("additional"), Some(index)) => {
            Some(AssetOwner::DiscTechnicalAdditional {
                technical: parse_technical(technical)?,
                index: parse_index(index)?,
            })
        }
        ("case", surface, Some("banner"), None, None) => Some(AssetOwner::CaseBanner {
            surface: parse_surface(surface)?,
        }),
        ("case", surface, Some("background"), None, None) => Some(AssetOwner::CaseBackground {
            surface: parse_surface(surface)?,
        }),
        ("case", surface, Some("title"), Some("current"), None) => {
            Some(AssetOwner::CaseTitleCurrent {
                surface: parse_surface(surface)?,
            })
        }
        ("case", surface, Some("title"), Some("default"), None) => {
            Some(AssetOwner::CaseTitleDefault {
                surface: parse_surface(surface)?,
            })
        }
        ("case", surface, Some(kind), Some(index), None) => {
            let surface = parse_surface(surface)?;
            let index = parse_index(index)?;
            match kind {
                "artwork" => Some(AssetOwner::CaseArtwork { surface, index }),
                "logo" => Some(AssetOwner::CaseLogo { surface, index }),
                "mark" => Some(AssetOwner::CaseMark { surface, index }),
                _ => None,
            }
        }
        _ => None,
    }
}

fn parse_write_request(bytes: &[u8]) -> Result<ParsedWriteRequest<'_>, &'static str> {
    if bytes.len() < WRITE_REQUEST_HEADER_BYTES || &bytes[..8] != WRITE_REQUEST_MAGIC {
        return Err("framing-invalid");
    }
    let plan_length = read_be_u32(&bytes[8..12]).ok_or("framing-invalid")?;
    let project_length = read_be_u32(&bytes[12..16]).ok_or("framing-invalid")?;
    if plan_length > MAX_CAPTURE_PLAN_BYTES || project_length > MAX_PROJECT_JSON_BYTES {
        return Err("size-limit-exceeded");
    }
    let plan_end = WRITE_REQUEST_HEADER_BYTES
        .checked_add(plan_length)
        .ok_or("size-limit-exceeded")?;
    let project_end = plan_end
        .checked_add(project_length)
        .ok_or("size-limit-exceeded")?;
    if project_end != bytes.len() {
        return Err("framing-invalid");
    }
    let plan: CapturePlanDto = serde_json::from_slice(&bytes[WRITE_REQUEST_HEADER_BYTES..plan_end])
        .map_err(|_| "capture-plan-invalid")?;
    if plan.version != 1 || plan.captures.len() > MAX_CONCRETE_OWNERS {
        return Err("capture-plan-invalid");
    }
    let mut captures = Vec::new();
    captures
        .try_reserve_exact(plan.captures.len())
        .map_err(|_| "allocation-denied")?;
    for capture in plan.captures {
        let owner = parse_owner_id(&capture.owner_id).ok_or("capture-plan-invalid")?;
        let decision = match capture.decision {
            CaptureDecisionDto::NoAcceptedAsset => AssetCaptureDecision::NoAcceptedAsset,
            CaptureDecisionDto::ProjectOwnedDataUrl => AssetCaptureDecision::ProjectOwnedDataUrl,
            CaptureDecisionDto::QualifiedBuiltIn { compatibility_id } => {
                AssetCaptureDecision::qualified_built_in(&compatibility_id)
                    .map_err(|_| "capture-plan-invalid")?
            }
            CaptureDecisionDto::UnsupportedNonportableAsset => {
                AssetCaptureDecision::UnsupportedNonportableAsset
            }
        };
        captures.push(AssetCapture::new(owner, decision));
    }
    Ok(ParsedWriteRequest {
        project_json: &bytes[plan_end..project_end],
        captures,
    })
}

fn has_sbls_suffix(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("sbls"))
}

fn require_distinct_legacy_destination(
    source: &Path,
    destination: &Path,
) -> Result<(), EncodeAndWriteProjectPackageFileFailure> {
    match compare_legacy_source_destination(source, destination) {
        LegacyDestinationIdentity::Distinct => Ok(()),
        LegacyDestinationIdentity::Conflict | LegacyDestinationIdentity::Indeterminate => {
            Err(EncodeAndWriteProjectPackageFileFailure::Destination(
                ProjectPackageDestinationFailure::new(DestinationFailureCode::ConflictsSource),
            ))
        }
    }
}

fn encode_and_write_request_with<F>(
    headers: &HeaderMap,
    body: &InvokeBody,
    before_commit_identity_check: F,
) -> Result<EncodeAndWriteProjectPackageFileSuccess, EncodeAndWriteProjectPackageFileFailure>
where
    F: FnMut(),
{
    let mut before_commit_identity_check = before_commit_identity_check;
    let destination = path_from_headers(headers).map_err(|failure| {
        EncodeAndWriteProjectPackageFileFailure::ProjectFile(
            ProjectFileCommandFailure::package_write_request_failure(
                failure.category(),
                "project-package-write-destination",
            ),
        )
    })?;
    if !has_sbls_suffix(&destination) {
        return Err(EncodeAndWriteProjectPackageFileFailure::Destination(
            ProjectPackageDestinationFailure::new(DestinationFailureCode::ExtensionInvalid),
        ));
    }
    let legacy_source =
        path_from_named_header(headers, LEGACY_SOURCE_PATH_HEADER_NAME).map_err(|failure| {
            EncodeAndWriteProjectPackageFileFailure::ProjectFile(
                ProjectFileCommandFailure::package_write_request_failure(
                    failure.category(),
                    "project-package-write-legacy-source",
                ),
            )
        })?;
    if let Some(source) = &legacy_source {
        require_distinct_legacy_destination(source, &destination)?;
    }
    let bytes = match body {
        InvokeBody::Raw(bytes) => bytes.as_slice(),
        InvokeBody::Json(_) => return Err(write_request_failure("raw-body-required")),
    };
    let request = parse_write_request(bytes).map_err(write_request_failure)?;
    let creator = PackageCreator::steam_backup_label_studio(env!("CARGO_PKG_VERSION"))
        .map_err(ProjectPackageCommandFailure::from)
        .map_err(EncodeAndWriteProjectPackageFileFailure::ProjectPackage)?;
    let package =
        encode_project_package_from_borrowed(request.project_json, &creator, &request.captures)
            .map_err(ProjectPackageCommandFailure::from)
            .map_err(EncodeAndWriteProjectPackageFileFailure::ProjectPackage)?;
    drop(request.captures);

    let write_result = project_file::write_with_precommit_guard(&destination, &package, || {
        before_commit_identity_check();
        if let Some(source) = &legacy_source {
            match compare_legacy_source_destination(source, &destination) {
                LegacyDestinationIdentity::Distinct => Ok(()),
                LegacyDestinationIdentity::Conflict | LegacyDestinationIdentity::Indeterminate => {
                    Err(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        "legacy source identity conflict",
                    ))
                }
            }
        } else {
            Ok(())
        }
    });
    drop(package);
    if let Err(error) = write_result {
        if error.phase() == AtomicProjectWritePhase::PreCommitValidation {
            return Err(EncodeAndWriteProjectPackageFileFailure::Destination(
                ProjectPackageDestinationFailure::new(DestinationFailureCode::ConflictsSource),
            ));
        }
        return Err(EncodeAndWriteProjectPackageFileFailure::ProjectFile(
            ProjectFileCommandFailure::from_atomic(error),
        ));
    }
    Ok(EncodeAndWriteProjectPackageFileSuccess { status: "success" })
}

fn encode_and_write_request(
    headers: &HeaderMap,
    body: &InvokeBody,
) -> Result<EncodeAndWriteProjectPackageFileSuccess, EncodeAndWriteProjectPackageFileFailure> {
    encode_and_write_request_with(headers, body, || {})
}

#[tauri::command]
pub(crate) fn encode_and_write_project_package_file(
    request: Request<'_>,
) -> Result<EncodeAndWriteProjectPackageFileSuccess, EncodeAndWriteProjectPackageFileFailure> {
    encode_and_write_request(request.headers(), request.body())
}

fn decode_request_with<R, D>(
    headers: &HeaderMap,
    body: &InvokeBody,
    read_file: R,
    decode: D,
) -> Result<Response, DecodeProjectPackageFileFailure>
where
    R: FnOnce(&Path) -> Result<Vec<u8>, BinaryProjectReadError>,
    D: FnOnce(&[u8]) -> Result<Vec<u8>, ProjectPackageFailure>,
{
    let package_bytes = read_project_bytes_request_with(headers, body, read_file)
        .map_err(DecodeProjectPackageFileFailure::ProjectFile)?;
    let hydrated_json = decode(&package_bytes)
        .map_err(ProjectPackageCommandFailure::from)
        .map_err(DecodeProjectPackageFileFailure::ProjectPackage)?;
    drop(package_bytes);
    Ok(Response::new(hydrated_json))
}

#[tauri::command]
pub(crate) fn decode_project_package_file(
    request: Request<'_>,
) -> Result<Response, DecodeProjectPackageFileFailure> {
    decode_request_with(
        request.headers(),
        request.body(),
        |path| project_binary_io::read(path),
        |package_bytes| {
            let decoded = decode_project_package(package_bytes)?;
            let (hydrated_json, _metadata) = decoded.into_parts();
            Ok(hydrated_json)
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use sbls_package_codec::{
        encode_project_package, AssetCapture, AssetCaptureDecision, AssetOwner, CaseSurface,
        FailureCode, FailureStage, LogoRole, PackageCreator, PlatformKind,
        ProjectPackageEncodeInput, TechnicalKind,
    };
    use serde_json::json;
    use std::fs;
    use std::io;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::{Arc, Barrier};
    use tauri::http::HeaderValue;
    use tauri::ipc::{InvokeResponseBody, IpcResponse};

    static TEST_DIRECTORY_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let sequence = TEST_DIRECTORY_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "sbls-package-write-command-{}-{sequence}",
                std::process::id()
            ));
            fs::create_dir(&path).unwrap();
            Self(path)
        }

        fn join(&self, name: &str) -> PathBuf {
            self.0.join(name)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn encode_path(path: &str) -> String {
        let mut encoded = String::new();
        for byte in path.as_bytes() {
            if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
                encoded.push(char::from(*byte));
            } else {
                const HEX: &[u8; 16] = b"0123456789ABCDEF";
                encoded.push('%');
                encoded.push(char::from(HEX[usize::from(*byte >> 4)]));
                encoded.push(char::from(HEX[usize::from(*byte & 0x0f)]));
            }
        }
        encoded
    }

    fn headers_for(path: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            crate::commands::project_files::PROJECT_PATH_HEADER_NAME,
            HeaderValue::from_str(&encode_path(path)).unwrap(),
        );
        headers
    }

    fn project_asset(owner: AssetOwner) -> AssetCapture {
        AssetCapture::new(owner, AssetCaptureDecision::ProjectOwnedDataUrl)
    }

    fn no_asset(owner: AssetOwner) -> AssetCapture {
        AssetCapture::new(owner, AssetCaptureDecision::NoAcceptedAsset)
    }

    fn qualified_asset(owner: AssetOwner, compatibility_id: &str) -> AssetCapture {
        AssetCapture::new(
            owner,
            AssetCaptureDecision::qualified_built_in(compatibility_id).unwrap(),
        )
    }

    fn disc_captures() -> Vec<AssetCapture> {
        let mut captures = vec![
            project_asset(AssetOwner::DiscBackground),
            project_asset(AssetOwner::DiscSteamBanner),
            project_asset(AssetOwner::DiscPrimaryLogo {
                role: LogoRole::Developer,
            }),
            project_asset(AssetOwner::DiscPrimaryLogo {
                role: LogoRole::Publisher,
            }),
            project_asset(AssetOwner::DiscTitleCurrent),
            project_asset(AssetOwner::DiscTitleDefault),
            project_asset(AssetOwner::DiscRatingCustom),
            project_asset(AssetOwner::DiscMediaCustom),
        ];
        captures.extend(
            PlatformKind::ALL
                .into_iter()
                .map(|platform| project_asset(AssetOwner::DiscPlatformCustom { platform })),
        );
        captures.extend(
            TechnicalKind::ALL
                .into_iter()
                .map(|technical| project_asset(AssetOwner::DiscTechnicalPrimary { technical })),
        );
        captures
    }

    fn case_captures() -> Vec<AssetCapture> {
        let mut captures = Vec::new();
        for surface in CaseSurface::ALL {
            captures.extend([
                project_asset(AssetOwner::CaseBanner { surface }),
                project_asset(AssetOwner::CaseBackground { surface }),
                project_asset(AssetOwner::CaseTitleCurrent { surface }),
                project_asset(AssetOwner::CaseTitleDefault { surface }),
            ]);
        }
        captures
    }

    fn default_disc_captures() -> Vec<AssetCapture> {
        let mut captures = vec![
            no_asset(AssetOwner::DiscBackground),
            qualified_asset(AssetOwner::DiscSteamBanner, "steam-banner:banner-lockup"),
            qualified_asset(
                AssetOwner::DiscPrimaryLogo {
                    role: LogoRole::Developer,
                },
                "logo:developer",
            ),
            qualified_asset(
                AssetOwner::DiscPrimaryLogo {
                    role: LogoRole::Publisher,
                },
                "logo:publisher",
            ),
            no_asset(AssetOwner::DiscTitleCurrent),
            no_asset(AssetOwner::DiscTitleDefault),
            no_asset(AssetOwner::DiscRatingCustom),
            no_asset(AssetOwner::DiscMediaCustom),
        ];
        captures.extend(
            PlatformKind::ALL
                .into_iter()
                .map(|platform| no_asset(AssetOwner::DiscPlatformCustom { platform })),
        );
        captures.extend(
            TechnicalKind::ALL
                .into_iter()
                .map(|technical| no_asset(AssetOwner::DiscTechnicalPrimary { technical })),
        );
        captures
    }

    fn default_case_captures() -> Vec<AssetCapture> {
        let mut captures = Vec::new();
        for surface in CaseSurface::ALL {
            captures.extend([
                qualified_asset(
                    AssetOwner::CaseBanner { surface },
                    match surface {
                        CaseSurface::Cover | CaseSurface::Tray => "steam-banner:banner-lockup",
                        CaseSurface::SpineLeft | CaseSurface::SpineRight => {
                            "steam-banner:spine-icon"
                        }
                    },
                ),
                no_asset(AssetOwner::CaseBackground { surface }),
                no_asset(AssetOwner::CaseTitleCurrent { surface }),
                no_asset(AssetOwner::CaseTitleDefault { surface }),
            ]);
        }
        captures
    }

    fn package(project: &[u8], captures: Vec<AssetCapture>) -> Vec<u8> {
        encode_project_package(&ProjectPackageEncodeInput::new(
            project.to_vec(),
            PackageCreator::steam_backup_label_studio("0.1.0").unwrap(),
            captures,
        ))
        .unwrap()
    }

    fn owner_id(owner: AssetOwner) -> String {
        match owner {
            AssetOwner::DiscBackground => "disc.background".into(),
            AssetOwner::DiscSteamBanner => "disc.steam-banner".into(),
            AssetOwner::DiscPrimaryLogo { role } => format!(
                "disc.logo.{}",
                match role {
                    LogoRole::Developer => "developer",
                    LogoRole::Publisher => "publisher",
                }
            ),
            AssetOwner::DiscAdditionalLogo { role, index } => format!(
                "disc.logo.{}.additional.{index}",
                match role {
                    LogoRole::Developer => "developer",
                    LogoRole::Publisher => "publisher",
                }
            ),
            AssetOwner::DiscTitleCurrent => "disc.title.current".into(),
            AssetOwner::DiscTitleDefault => "disc.title.default".into(),
            AssetOwner::DiscAdditionalArtwork { index } => {
                format!("disc.artwork.additional.{index}")
            }
            AssetOwner::DiscRatingCustom => "disc.rating.custom".into(),
            AssetOwner::DiscMediaCustom => "disc.media.custom".into(),
            AssetOwner::DiscPlatformCustom { platform } => {
                format!("disc.platform.{}", platform.as_str())
            }
            AssetOwner::DiscTechnicalPrimary { technical } => {
                format!("disc.technical.{}", technical.as_str())
            }
            AssetOwner::DiscTechnicalAdditional { technical, index } => {
                format!("disc.technical.{}.additional.{index}", technical.as_str())
            }
            AssetOwner::CaseBanner { surface } => {
                format!("case.{}.banner", surface_id(surface))
            }
            AssetOwner::CaseBackground { surface } => {
                format!("case.{}.background", surface_id(surface))
            }
            AssetOwner::CaseTitleCurrent { surface } => {
                format!("case.{}.title.current", surface_id(surface))
            }
            AssetOwner::CaseTitleDefault { surface } => {
                format!("case.{}.title.default", surface_id(surface))
            }
            AssetOwner::CaseArtwork { surface, index } => {
                format!("case.{}.artwork.{index}", surface_id(surface))
            }
            AssetOwner::CaseLogo { surface, index } => {
                format!("case.{}.logo.{index}", surface_id(surface))
            }
            AssetOwner::CaseMark { surface, index } => {
                format!("case.{}.mark.{index}", surface_id(surface))
            }
        }
    }

    fn surface_id(surface: CaseSurface) -> &'static str {
        match surface {
            CaseSurface::Cover => "cover",
            CaseSurface::Tray => "tray",
            CaseSurface::SpineLeft => "spine-left",
            CaseSurface::SpineRight => "spine-right",
        }
    }

    fn write_request(project: &[u8], captures: &[AssetCapture]) -> Vec<u8> {
        let capture_values = captures
            .iter()
            .map(|capture| {
                let decision = match capture.decision() {
                    AssetCaptureDecision::NoAcceptedAsset => {
                        json!({"kind": "no-accepted-asset"})
                    }
                    AssetCaptureDecision::ProjectOwnedDataUrl => {
                        json!({"kind": "project-owned-data-url"})
                    }
                    AssetCaptureDecision::QualifiedBuiltIn { compatibility_id } => json!({
                        "kind": "qualified-built-in",
                        "compatibilityId": compatibility_id,
                    }),
                    AssetCaptureDecision::UnsupportedNonportableAsset => {
                        json!({"kind": "unsupported-nonportable-asset"})
                    }
                    AssetCaptureDecision::CapturedBytes { .. }
                    | AssetCaptureDecision::BuiltInCaptureRequired => {
                        panic!("decision is not representable by the package-write request")
                    }
                };
                json!({
                    "ownerId": owner_id(capture.owner()),
                    "decision": decision,
                })
            })
            .collect::<Vec<_>>();
        let plan = serde_json::to_vec(&json!({
            "version": 1,
            "captures": capture_values,
        }))
        .unwrap();
        let mut request = Vec::with_capacity(16 + plan.len() + project.len());
        request.extend_from_slice(WRITE_REQUEST_MAGIC);
        request.extend_from_slice(&u32::try_from(plan.len()).unwrap().to_be_bytes());
        request.extend_from_slice(&u32::try_from(project.len()).unwrap().to_be_bytes());
        request.extend_from_slice(&plan);
        request.extend_from_slice(project);
        request
    }

    fn write_headers(destination: &Path, legacy_source: Option<&Path>) -> HeaderMap {
        let mut headers = headers_for(destination.to_str().unwrap());
        if let Some(source) = legacy_source {
            headers.insert(
                LEGACY_SOURCE_PATH_HEADER_NAME,
                HeaderValue::from_str(&encode_path(source.to_str().unwrap())).unwrap(),
            );
        }
        headers
    }

    fn one_pixel_bmp_data_url() -> String {
        const BASE64: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut bmp = [0_u8; 58];
        bmp[0..2].copy_from_slice(b"BM");
        bmp[2..6].copy_from_slice(&58_u32.to_le_bytes());
        bmp[10..14].copy_from_slice(&54_u32.to_le_bytes());
        bmp[14..18].copy_from_slice(&40_u32.to_le_bytes());
        bmp[18..22].copy_from_slice(&1_u32.to_le_bytes());
        bmp[22..26].copy_from_slice(&1_u32.to_le_bytes());
        bmp[26..28].copy_from_slice(&1_u16.to_le_bytes());
        bmp[28..30].copy_from_slice(&24_u16.to_le_bytes());
        bmp[34..38].copy_from_slice(&4_u32.to_le_bytes());
        bmp[54..57].copy_from_slice(&[0x11, 0x22, 0x33]);

        let mut encoded = String::from("data:image/bmp;base64,");
        for chunk in bmp.chunks(3) {
            let first = chunk[0];
            let second = chunk.get(1).copied().unwrap_or(0);
            let third = chunk.get(2).copied().unwrap_or(0);
            encoded.push(char::from(BASE64[usize::from(first >> 2)]));
            encoded.push(char::from(
                BASE64[usize::from(((first & 0x03) << 4) | (second >> 4))],
            ));
            encoded.push(if chunk.len() > 1 {
                char::from(BASE64[usize::from(((second & 0x0f) << 2) | (third >> 6))])
            } else {
                '='
            });
            encoded.push(if chunk.len() > 2 {
                char::from(BASE64[usize::from(third & 0x3f)])
            } else {
                '='
            });
        }
        encoded
    }

    fn minimal_disc_project() -> Vec<u8> {
        let asset = one_pixel_bmp_data_url();
        serde_json::to_vec(&json!({
            "schemaVersion": "0.2.0",
            "projectType": "disc",
            "template": {"type": "disc"},
            "background": {"imageDataUrl": &asset, "imageSource": {"source": "uploaded"}},
            "steamBackupLogo": {
                "lockupImageDataUrl": &asset,
                "lockupImageSource": {"source": "custom"}
            },
            "logoAssets": {
                "developerLogoDataUrl": &asset,
                "developerLogoSource": {"source": "custom"},
                "publisherLogoDataUrl": &asset,
                "publisherLogoSource": {"source": "custom"},
                "additionalDeveloperLogos": [],
                "additionalPublisherLogos": []
            },
            "titleArtwork": {
                "imageDataUrl": &asset,
                "imageSource": {"source": "custom"},
                "defaultSteamLogo": {
                    "imageDataUrl": &asset,
                    "imageSource": {"source": "steam-artwork"}
                }
            },
            "additionalArtwork": {"elements": []},
            "ratingBadge": {"customImageDataUrl": &asset},
            "mediaMark": {"customImageDataUrl": &asset},
            "platformMarks": {"assets": {
                "pc": {"customImageDataUrl": &asset},
                "windows": {"customImageDataUrl": &asset},
                "linux": {"customImageDataUrl": &asset},
                "steamDeck": {"customImageDataUrl": &asset},
                "macos": {"customImageDataUrl": &asset}
            }},
            "technicalMarks": {
                "assets": {
                    "audio": {"customImageDataUrl": &asset},
                    "surround": {"customImageDataUrl": &asset},
                    "codec": {"customImageDataUrl": &asset},
                    "middleware": {"customImageDataUrl": &asset},
                    "technology": {"customImageDataUrl": &asset}
                },
                "additionalAssets": {
                    "audio": [], "surround": [], "codec": [], "middleware": [], "technology": []
                }
            }
        }))
        .unwrap()
    }

    fn empty_case_surface() -> serde_json::Value {
        let asset = one_pixel_bmp_data_url();
        json!({
            "steamBanner": {
                "lockupImageDataUrl": &asset,
                "lockupImageSource": {"source": "custom"}
            },
            "background": {"imageDataUrl": &asset, "imageSource": {"source": "uploaded"}},
            "titleArtwork": {
                "imageDataUrl": &asset,
                "imageSource": {"source": "custom"},
                "defaultSteamLogo": {
                    "imageDataUrl": &asset,
                    "imageSource": {"source": "steam-artwork"}
                }
            },
            "artworkSlots": [],
            "logoSlots": [],
            "markSlots": []
        })
    }

    fn minimal_case_project() -> Vec<u8> {
        serde_json::to_vec(&json!({
            "schemaVersion": "0.2.0",
            "projectType": "caseInsert",
            "template": {"type": "caseInsert"},
            "caseInsert": {
                "templates": {
                    "cover": empty_case_surface(),
                    "tray": empty_case_surface()
                },
                "spine": {
                    "left": empty_case_surface(),
                    "right": empty_case_surface()
                }
            }
        }))
        .unwrap()
    }

    fn default_disc_project() -> Vec<u8> {
        serde_json::to_vec(&json!({
            "schemaVersion": "0.2.0",
            "projectType": "disc",
            "template": {"type": "disc"},
            "background": {"imageDataUrl": null},
            "steamBackupLogo": {"placement": "top", "lockupImageDataUrl": null},
            "logoAssets": {
                "developerLogoDataUrl": null,
                "publisherLogoDataUrl": null,
                "additionalDeveloperLogos": [],
                "additionalPublisherLogos": []
            },
            "additionalArtwork": {"elements": []}
        }))
        .unwrap()
    }

    fn default_case_surface(source_id: &str) -> serde_json::Value {
        json!({
            "steamBanner": {
                "lockupImageDataUrl": null,
                "lockupImageSource": {
                    "source": "built-in",
                    "sourceId": source_id
                }
            },
            "background": {"imageDataUrl": null},
            "artworkSlots": [],
            "logoSlots": [],
            "markSlots": []
        })
    }

    fn default_case_project() -> Vec<u8> {
        serde_json::to_vec(&json!({
            "schemaVersion": "0.2.0",
            "projectType": "caseInsert",
            "template": {"type": "caseInsert"},
            "caseInsert": {
                "templates": {
                    "cover": default_case_surface("case-steam-banner:cover-lockup"),
                    "tray": default_case_surface("case-steam-banner:cover-lockup")
                },
                "spine": {
                    "left": default_case_surface("case-steam-banner:spine-icon"),
                    "right": default_case_surface("case-steam-banner:spine-icon")
                }
            }
        }))
        .unwrap()
    }

    fn raw_body(response: Response) -> Vec<u8> {
        match response.body().unwrap() {
            InvokeResponseBody::Raw(bytes) => bytes,
            InvokeResponseBody::Json(_) => panic!("package decode returned JSON transport"),
        }
    }

    fn failure_json(failure: DecodeProjectPackageFileFailure) -> serde_json::Value {
        serde_json::to_value(failure).unwrap()
    }

    fn unwrap_failure(
        result: Result<Response, DecodeProjectPackageFileFailure>,
    ) -> DecodeProjectPackageFileFailure {
        match result {
            Ok(_) => panic!("expected package decode to fail"),
            Err(failure) => failure,
        }
    }

    #[test]
    fn valid_minimal_disc_and_case_packages_return_exact_hydrated_json() {
        for (project, captures) in [
            (minimal_disc_project(), disc_captures()),
            (minimal_case_project(), case_captures()),
        ] {
            let input = package(&project, captures);
            let expected = decode_project_package(&input).unwrap().into_parts().0;
            let response = decode_request_with(
                &headers_for("C:\\Projects\\package.sbls"),
                &InvokeBody::Raw(Vec::new()),
                |_| Ok(input),
                |bytes| {
                    let decoded = decode_project_package(bytes)?;
                    Ok(decoded.into_parts().0)
                },
            )
            .unwrap();
            let actual = raw_body(response);
            let actual_text = String::from_utf8(actual.clone()).unwrap();

            assert_eq!(actual, expected);
            assert!(!actual_text.contains("packageVersion"));
            assert!(!actual_text.contains("manifest.json"));
            assert!(!actual_text.contains("bindings"));
        }
    }

    #[test]
    fn real_codec_failures_preserve_recognition_and_archive_taxonomy() {
        for (bytes, expected_code, expected_stage) in [
            (
                Vec::new(),
                FailureCode::FormatUnsupported,
                FailureStage::RawInput,
            ),
            (
                b"not a package".to_vec(),
                FailureCode::FormatUnsupported,
                FailureStage::RawInput,
            ),
            (
                b"PK\x03\x04malformed".to_vec(),
                FailureCode::ArchiveInvalid,
                FailureStage::ArchiveEnvelope,
            ),
        ] {
            let failure = unwrap_failure(decode_request_with(
                &headers_for("project.sbls"),
                &InvokeBody::Raw(Vec::new()),
                |_| Ok(bytes),
                |input| {
                    let decoded = decode_project_package(input)?;
                    Ok(decoded.into_parts().0)
                },
            ));
            let actual = failure_json(failure);

            assert_eq!(actual["code"], expected_code.as_str());
            assert_eq!(actual["cause"]["stage"], expected_stage.as_str());
        }
    }

    #[test]
    fn composition_borrows_reader_bytes_and_moves_decoder_output_to_raw_response() {
        let input = vec![1, 2, 3, 4];
        let input_pointer = input.as_ptr() as usize;
        let mut output_pointer = 0usize;
        let response = decode_request_with(
            &headers_for("package.sbls"),
            &InvokeBody::Raw(Vec::new()),
            |_| Ok(input),
            |bytes| {
                assert_eq!(bytes.as_ptr() as usize, input_pointer);
                let output = vec![9, 8, 7, 6];
                output_pointer = output.as_ptr() as usize;
                Ok(output)
            },
        )
        .unwrap();
        let actual = raw_body(response);

        assert_eq!(actual, [9, 8, 7, 6]);
        assert_eq!(actual.as_ptr() as usize, output_pointer);
    }

    #[test]
    fn every_package_failure_code_maps_to_exact_safe_flat_dto() {
        for code in FailureCode::ALL {
            let failure = unwrap_failure(decode_request_with(
                &headers_for("C:\\private\\secret.sbls"),
                &InvokeBody::Raw(Vec::new()),
                |_| Ok(vec![1]),
                |_| {
                    Err(ProjectPackageFailure::new(
                        code,
                        FailureStage::AssetValidation,
                    ))
                },
            ));
            let actual = failure_json(failure);

            assert_eq!(actual["status"], "failure");
            assert_eq!(actual["code"], code.as_str());
            assert_eq!(actual["recoverable"], code.recoverable());
            assert_eq!(actual["message"], code.safe_message());
            assert_eq!(actual["cause"], json!({"stage": "asset-validation"}));
            assert!(!actual.to_string().contains("secret.sbls"));
        }
    }

    #[test]
    fn path_body_read_and_size_failures_keep_existing_file_dto_and_precede_decode() {
        let missing_path = unwrap_failure(decode_request_with(
            &HeaderMap::new(),
            &InvokeBody::Raw(Vec::new()),
            |_| panic!("reader must not run"),
            |_| panic!("decoder must not run"),
        ));
        assert_eq!(failure_json(missing_path)["code"], "project.read-failed");

        let invalid_body = unwrap_failure(decode_request_with(
            &headers_for("project.sbls"),
            &InvokeBody::Raw(vec![1]),
            |_| panic!("reader must not run"),
            |_| panic!("decoder must not run"),
        ));
        assert_eq!(
            failure_json(invalid_body)["cause"]["category"],
            "read-body-not-empty"
        );

        let read_failure = unwrap_failure(decode_request_with(
            &headers_for("project.sbls"),
            &InvokeBody::Raw(Vec::new()),
            |_| {
                Err(BinaryProjectReadError::Io {
                    operation: "open-source",
                    source: io::Error::new(io::ErrorKind::PermissionDenied, "private detail"),
                })
            },
            |_| panic!("decoder must not run"),
        ));
        let read_failure = failure_json(read_failure);
        assert_eq!(read_failure["code"], "project.read-failed");
        assert_eq!(read_failure["cause"]["category"], "permission-denied");
        assert!(!read_failure.to_string().contains("private detail"));

        let too_large = unwrap_failure(decode_request_with(
            &headers_for("project.sbls"),
            &InvokeBody::Raw(Vec::new()),
            |_| Err(BinaryProjectReadError::TooLarge),
            |_| panic!("decoder must not run"),
        ));
        assert_eq!(failure_json(too_large)["code"], "project.file-too-large");
    }

    #[test]
    fn independent_concurrent_requests_have_no_cross_request_state() {
        let barrier = Arc::new(Barrier::new(8));
        let handles = (0u8..8)
            .map(|value| {
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    barrier.wait();
                    let response = decode_request_with(
                        &headers_for(&format!("project-{value}.sbls")),
                        &InvokeBody::Raw(Vec::new()),
                        |path| {
                            assert_eq!(path, Path::new(&format!("project-{value}.sbls")));
                            Ok(vec![value])
                        },
                        |bytes| Ok(vec![bytes[0], value.wrapping_add(1)]),
                    )
                    .unwrap();
                    assert_eq!(raw_body(response), [value, value.wrapping_add(1)]);
                })
            })
            .collect::<Vec<_>>();

        for handle in handles {
            handle.join().unwrap();
        }
    }

    #[test]
    fn write_request_framing_rejects_malformed_oversized_and_trailing_input() {
        for (bytes, expected) in [
            (Vec::new(), "framing-invalid"),
            (WRITE_REQUEST_MAGIC.to_vec(), "framing-invalid"),
            (
                {
                    let mut bytes = vec![0_u8; WRITE_REQUEST_HEADER_BYTES];
                    bytes[..8].copy_from_slice(WRITE_REQUEST_MAGIC);
                    bytes[8..12].copy_from_slice(
                        &(u32::try_from(MAX_CAPTURE_PLAN_BYTES).unwrap() + 1).to_be_bytes(),
                    );
                    bytes
                },
                "size-limit-exceeded",
            ),
            (
                {
                    let project = minimal_disc_project();
                    let mut bytes = write_request(&project, &disc_captures());
                    bytes.push(0);
                    bytes
                },
                "framing-invalid",
            ),
        ] {
            assert_eq!(parse_write_request(&bytes).unwrap_err(), expected);
        }

        let project = minimal_disc_project();
        let mut request = write_request(&project, &disc_captures());
        request[16] = b'!';
        assert_eq!(
            parse_write_request(&request).unwrap_err(),
            "capture-plan-invalid"
        );
    }

    #[test]
    fn native_write_command_round_trips_minimal_disc_and_case_packages() {
        let directory = TestDirectory::new();
        for (name, project, captures) in [
            ("disc.sbls", minimal_disc_project(), disc_captures()),
            ("case.SBLS", minimal_case_project(), case_captures()),
        ] {
            let destination = directory.join(name);
            let request = write_request(&project, &captures);
            let result = encode_and_write_request(
                &write_headers(&destination, None),
                &InvokeBody::Raw(request),
            )
            .unwrap();

            assert_eq!(result.status, "success");
            let package_bytes = fs::read(&destination).unwrap();
            assert!(package_bytes.starts_with(b"PK\x03\x04"));
            let (hydrated, metadata) = decode_project_package(&package_bytes).unwrap().into_parts();
            assert_eq!(hydrated, project);
            assert_eq!(metadata.asset_count(), 1, "duplicate bytes deduplicate");
            assert_eq!(
                metadata.binding_count(),
                captures.len(),
                "every registered custom owner remains bound"
            );
        }
    }

    #[test]
    fn native_write_command_preserves_default_built_ins_without_asset_entries() {
        let directory = TestDirectory::new();
        for (name, project, captures) in [
            (
                "default-disc.sbls",
                default_disc_project(),
                default_disc_captures(),
            ),
            (
                "default-case.sbls",
                default_case_project(),
                default_case_captures(),
            ),
        ] {
            let destination = directory.join(name);
            encode_and_write_request(
                &write_headers(&destination, None),
                &InvokeBody::Raw(write_request(&project, &captures)),
            )
            .unwrap();

            let (hydrated, metadata) = decode_project_package(&fs::read(destination).unwrap())
                .unwrap()
                .into_parts();
            assert_eq!(
                serde_json::from_slice::<serde_json::Value>(&hydrated).unwrap(),
                serde_json::from_slice::<serde_json::Value>(&project).unwrap(),
            );
            assert_eq!(metadata.asset_count(), 0);
            assert_eq!(metadata.binding_count(), 0);
        }
    }

    #[test]
    fn destination_validation_and_legacy_alias_checks_precede_writing() {
        let directory = TestDirectory::new();
        let source = directory.join("legacy.sbls");
        fs::write(&source, b"legacy source bytes").unwrap();
        let request = write_request(&minimal_disc_project(), &disc_captures());

        let wrong_extension = directory.join("new.json");
        let wrong = encode_and_write_request(
            &write_headers(&wrong_extension, None),
            &InvokeBody::Raw(request.clone()),
        )
        .unwrap_err();
        assert!(matches!(
            wrong,
            EncodeAndWriteProjectPackageFileFailure::Destination(
                ProjectPackageDestinationFailure {
                    code: "project.package.destination-extension-invalid",
                    ..
                }
            )
        ));
        assert!(!wrong_extension.exists());

        let conflict = encode_and_write_request(
            &write_headers(&source, Some(&source)),
            &InvokeBody::Raw(request),
        )
        .unwrap_err();
        assert!(matches!(
            conflict,
            EncodeAndWriteProjectPackageFileFailure::Destination(
                ProjectPackageDestinationFailure {
                    code: "project.legacy-conversion.destination-conflicts-source",
                    ..
                }
            )
        ));
        assert_eq!(fs::read(&source).unwrap(), b"legacy source bytes");
    }

    #[test]
    fn distinct_legacy_conversion_preserves_source_and_commits_package() {
        let directory = TestDirectory::new();
        let source = directory.join("legacy.json");
        let destination = directory.join("converted.sbls");
        fs::write(&source, b"legacy source bytes").unwrap();
        let project = minimal_disc_project();
        let request = write_request(&project, &disc_captures());

        encode_and_write_request(
            &write_headers(&destination, Some(&source)),
            &InvokeBody::Raw(request),
        )
        .unwrap();

        assert_eq!(fs::read(&source).unwrap(), b"legacy source bytes");
        let package_bytes = fs::read(destination).unwrap();
        assert_eq!(
            decode_project_package(&package_bytes)
                .unwrap()
                .into_parts()
                .0,
            project
        );
    }

    #[test]
    fn commit_boundary_recheck_catches_destination_alias_race() {
        let directory = TestDirectory::new();
        let source = directory.join("legacy.json");
        let destination = directory.join("converted.sbls");
        fs::write(&source, b"legacy source bytes").unwrap();
        fs::write(&destination, b"prior destination bytes").unwrap();
        let request = write_request(&minimal_disc_project(), &disc_captures());

        let result = encode_and_write_request_with(
            &write_headers(&destination, Some(&source)),
            &InvokeBody::Raw(request),
            || {
                fs::remove_file(&destination).unwrap();
                fs::hard_link(&source, &destination).unwrap();
            },
        )
        .unwrap_err();

        assert!(matches!(
            result,
            EncodeAndWriteProjectPackageFileFailure::Destination(
                ProjectPackageDestinationFailure {
                    code: "project.legacy-conversion.destination-conflicts-source",
                    ..
                }
            )
        ));
        assert_eq!(fs::read(&source).unwrap(), b"legacy source bytes");
        assert_eq!(fs::read(&destination).unwrap(), b"legacy source bytes");
        let leftovers = fs::read_dir(&directory.0)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().contains(".tmp"))
            .count();
        assert_eq!(leftovers, 0);
    }
}
