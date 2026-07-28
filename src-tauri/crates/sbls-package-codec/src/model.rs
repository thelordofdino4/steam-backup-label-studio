//! Small, owned public boundary types for the runtime-disconnected codec.

use crate::error::{FailureCode, FailureStage, ProjectPackageFailure};
use crate::limits::{
    MAX_ASSET_BYTES, MAX_CREATED_BY_APPLICATION_BYTES, MAX_CREATED_BY_VERSION_BYTES,
};
use crate::raster::RasterMime;
use crate::registry::AssetOwner;

/// Diagnostic writer identity stored in `manifest.json`.
///
/// It never selects package or project-schema compatibility.
#[cfg_attr(test, derive(Clone))]
#[derive(Debug, Eq, PartialEq)]
pub struct PackageCreator {
    application: String,
    version: String,
}

impl PackageCreator {
    /// Fallibly copies externally supplied creator metadata.
    pub fn new(application: &str, version: &str) -> Result<Self, ProjectPackageFailure> {
        validate_creator_component(application, MAX_CREATED_BY_APPLICATION_BYTES)?;
        validate_creator_component(version, MAX_CREATED_BY_VERSION_BYTES)?;
        Ok(Self {
            application: try_copy_string(application, FailureStage::Manifest)?,
            version: try_copy_string(version, FailureStage::Manifest)?,
        })
    }

    pub fn steam_backup_label_studio(version: &str) -> Result<Self, ProjectPackageFailure> {
        Self::new("steam-backup-label-studio", version)
    }

    pub(crate) fn try_clone_for_writer(&self) -> Result<Self, ProjectPackageFailure> {
        if self.application != "steam-backup-label-studio" {
            return Err(ProjectPackageFailure::new(
                FailureCode::ManifestInvalid,
                FailureStage::Manifest,
            ));
        }
        Self::new(&self.application, &self.version)
    }

    pub fn application(&self) -> &str {
        &self.application
    }

    pub fn version(&self) -> &str {
        &self.version
    }
}

/// The schema/feature owner's complete decision for one concrete registry
/// location. The encoder verifies that the decision agrees with the normalized
/// JSON leaf; the enum itself performs no I/O or implicit lookup.
#[cfg_attr(test, derive(Clone))]
#[derive(Debug, Eq, PartialEq)]
pub enum AssetCaptureDecision {
    /// The owner confirms that this concrete location has no accepted asset.
    /// Its normalized leaf must be null or owner-approved absent.
    NoAcceptedAsset,
    /// The owner confirms that the normalized leaf contains the authoritative
    /// canonical raster data URL to decode and validate.
    ProjectOwnedDataUrl,
    /// Exact caller-owned bytes supplied through the pure capture boundary.
    /// This is the only way this slice can package an app-owned built-in whose
    /// owner can truthfully hydrate from a bound data URL.
    CapturedBytes {
        mime_type: RasterMime,
        bytes: Vec<u8>,
    },
    /// The owner is a semantic built-in but cannot truthfully accept a bound
    /// byte copy and no frozen compatibility-registry omission is available.
    /// Encoding must fail before producing archive output.
    BuiltInCaptureRequired,
}

impl AssetCaptureDecision {
    pub fn captured_bytes(
        mime_type: RasterMime,
        bytes: &[u8],
    ) -> Result<AssetCaptureDecision, ProjectPackageFailure> {
        validate_captured_byte_length(bytes.len())?;
        let mut copy = Vec::new();
        copy.try_reserve_exact(bytes.len())
            .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::AssetCapture))?;
        copy.extend_from_slice(bytes);
        Ok(Self::CapturedBytes {
            mime_type,
            bytes: copy,
        })
    }

    pub fn captured_payload(&self) -> Option<(RasterMime, &[u8])> {
        match self {
            Self::CapturedBytes { mime_type, bytes } => Some((*mime_type, bytes)),
            _ => None,
        }
    }
}

fn validate_captured_byte_length(length: usize) -> Result<(), ProjectPackageFailure> {
    let length = u64::try_from(length)
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::AssetCapture))?;
    if length > MAX_ASSET_BYTES {
        return Err(ProjectPackageFailure::resource_limit(
            FailureStage::AssetCapture,
        ));
    }
    if length == 0 {
        return Err(ProjectPackageFailure::new(
            FailureCode::AssetCaptureFailed,
            FailureStage::AssetCapture,
        ));
    }
    Ok(())
}

/// One typed owner classification in the complete capture plan.
#[cfg_attr(test, derive(Clone))]
#[derive(Debug, Eq, PartialEq)]
pub struct AssetCapture {
    owner: AssetOwner,
    decision: AssetCaptureDecision,
}

impl AssetCapture {
    pub const fn new(owner: AssetOwner, decision: AssetCaptureDecision) -> Self {
        Self { owner, decision }
    }

    pub const fn owner(&self) -> AssetOwner {
        self.owner
    }

    pub const fn decision(&self) -> &AssetCaptureDecision {
        &self.decision
    }
}

/// Immutable input to package encoding.
///
/// `normalized_project_json` is the one canonical persistable snapshot in JSON
/// byte form before projection. `captures` must contain exactly one owner
/// decision for every concrete location expanded by the closed registry.
#[cfg_attr(test, derive(Clone))]
#[derive(Debug, Eq, PartialEq)]
pub struct ProjectPackageEncodeInput {
    normalized_project_json: Vec<u8>,
    creator: PackageCreator,
    captures: Vec<AssetCapture>,
}

impl ProjectPackageEncodeInput {
    /// Takes ownership without copying or allocating. Callers that start from
    /// borrowed bytes must use a fallible copy before constructing this input.
    pub fn new(
        normalized_project_json: Vec<u8>,
        creator: PackageCreator,
        captures: Vec<AssetCapture>,
    ) -> Self {
        Self {
            normalized_project_json,
            creator,
            captures,
        }
    }

    pub fn normalized_project_json(&self) -> &[u8] {
        &self.normalized_project_json
    }

    pub const fn creator(&self) -> &PackageCreator {
        &self.creator
    }

    pub fn captures(&self) -> &[AssetCapture] {
        &self.captures
    }
}

/// Validated non-project metadata returned separately from hydrated JSON.
#[cfg_attr(test, derive(Clone))]
#[derive(Debug, Eq, PartialEq)]
pub struct DecodedPackageMetadata {
    package_version: u32,
    project_schema_version: String,
    creator: PackageCreator,
    asset_count: usize,
    binding_count: usize,
}

impl DecodedPackageMetadata {
    pub(crate) fn new(
        package_version: u32,
        project_schema_version: String,
        creator: PackageCreator,
        asset_count: usize,
        binding_count: usize,
    ) -> Self {
        Self {
            package_version,
            project_schema_version,
            creator,
            asset_count,
            binding_count,
        }
    }

    pub const fn package_version(&self) -> u32 {
        self.package_version
    }

    pub fn project_schema_version(&self) -> &str {
        &self.project_schema_version
    }

    pub const fn creator(&self) -> &PackageCreator {
        &self.creator
    }

    pub const fn asset_count(&self) -> usize {
        self.asset_count
    }

    pub const fn binding_count(&self) -> usize {
        self.binding_count
    }
}

/// Fully owned, isolated output from successful package decoding.
///
/// The byte buffer contains hydrated JSON only. Manifest, binding, ZIP, and
/// session metadata never enter the project object.
#[cfg_attr(test, derive(Clone))]
#[derive(Debug, Eq, PartialEq)]
pub struct DecodedProjectPackage {
    hydrated_project_json: Vec<u8>,
    metadata: DecodedPackageMetadata,
}

impl DecodedProjectPackage {
    pub(crate) fn new(hydrated_project_json: Vec<u8>, metadata: DecodedPackageMetadata) -> Self {
        Self {
            hydrated_project_json,
            metadata,
        }
    }

    pub fn hydrated_project_json(&self) -> &[u8] {
        &self.hydrated_project_json
    }

    pub const fn metadata(&self) -> &DecodedPackageMetadata {
        &self.metadata
    }

    pub fn into_parts(self) -> (Vec<u8>, DecodedPackageMetadata) {
        (self.hydrated_project_json, self.metadata)
    }
}

fn try_copy_string(value: &str, stage: FailureStage) -> Result<String, ProjectPackageFailure> {
    let mut copy = String::new();
    copy.try_reserve_exact(value.len())
        .map_err(|_| ProjectPackageFailure::resource_limit(stage))?;
    copy.push_str(value);
    Ok(copy)
}

fn validate_creator_component(value: &str, maximum: u64) -> Result<(), ProjectPackageFailure> {
    let length = u64::try_from(value.len())
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Manifest))?;
    if length > maximum {
        return Err(ProjectPackageFailure::resource_limit(
            FailureStage::Manifest,
        ));
    }
    if value.is_empty() || !value.bytes().all(|byte| matches!(byte, 0x20..=0x7e)) {
        return Err(ProjectPackageFailure::new(
            FailureCode::ManifestInvalid,
            FailureStage::Manifest,
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        validate_captured_byte_length, AssetCapture, AssetCaptureDecision, DecodedPackageMetadata,
        DecodedProjectPackage, PackageCreator, ProjectPackageEncodeInput,
    };
    use crate::error::{FailureCode, FailureStage};
    use crate::limits::{MAX_ASSET_BYTES, MAX_CREATED_BY_APPLICATION_BYTES};
    use crate::registry::AssetOwner;

    #[test]
    fn encode_input_owns_an_immutable_snapshot_and_typed_plan() {
        let mut caller_bytes = br#"{"schemaVersion":"0.2.0"}"#.to_vec();
        let input = ProjectPackageEncodeInput::new(
            caller_bytes.clone(),
            PackageCreator::steam_backup_label_studio("0.1.0").unwrap(),
            vec![AssetCapture::new(
                AssetOwner::DiscBackground,
                AssetCaptureDecision::NoAcceptedAsset,
            )],
        );
        caller_bytes[0] = b'[';

        assert_eq!(
            input.normalized_project_json(),
            br#"{"schemaVersion":"0.2.0"}"#
        );
        assert_eq!(input.creator().application(), "steam-backup-label-studio");
        assert_eq!(input.captures()[0].owner(), AssetOwner::DiscBackground);
    }

    #[test]
    fn decode_output_keeps_transport_metadata_outside_project_json() {
        let metadata = DecodedPackageMetadata::new(
            1,
            "0.2.0".to_owned(),
            PackageCreator::new("another-writer", "2.4.0").unwrap(),
            3,
            7,
        );
        let decoded =
            DecodedProjectPackage::new(br#"{"schemaVersion":"0.2.0"}"#.to_vec(), metadata);

        assert!(
            !String::from_utf8_lossy(decoded.hydrated_project_json()).contains("packageVersion")
        );
        assert_eq!(decoded.metadata().package_version(), 1);
        assert_eq!(decoded.metadata().project_schema_version(), "0.2.0");
        assert_eq!(decoded.metadata().asset_count(), 3);
        assert_eq!(decoded.metadata().binding_count(), 7);

        let (json, metadata) = decoded.into_parts();
        assert_eq!(json, br#"{"schemaVersion":"0.2.0"}"#);
        assert_eq!(metadata.creator().application(), "another-writer");
    }

    #[test]
    fn capture_required_is_distinct_from_owner_confirmed_absence() {
        assert_ne!(
            AssetCaptureDecision::NoAcceptedAsset,
            AssetCaptureDecision::BuiltInCaptureRequired
        );
    }

    #[test]
    fn public_copying_constructors_preflight_before_allocation() {
        let overlong_application =
            "a".repeat(usize::try_from(MAX_CREATED_BY_APPLICATION_BYTES).unwrap() + 1);
        let failure = PackageCreator::new(&overlong_application, "1").unwrap_err();
        assert_eq!(failure.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(failure.stage, FailureStage::Manifest);

        let failure = PackageCreator::new("", "1").unwrap_err();
        assert_eq!(failure.code, FailureCode::ManifestInvalid);
        assert_eq!(failure.stage, FailureStage::Manifest);

        assert_eq!(
            validate_captured_byte_length(0).unwrap_err().code,
            FailureCode::AssetCaptureFailed
        );
        assert_eq!(
            validate_captured_byte_length(usize::try_from(MAX_ASSET_BYTES).unwrap() + 1,)
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );
    }
}
