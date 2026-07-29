use std::path::Path;

use sbls_package_codec::{decode_project_package, ProjectPackageFailure};
use serde::Serialize;
use tauri::http::HeaderMap;
use tauri::ipc::{InvokeBody, Request, Response};

use crate::commands::project_files::{read_project_bytes_request_with, ProjectFileCommandFailure};
use crate::project_binary_io::{self, BinaryProjectReadError};

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
    use std::io;
    use std::sync::{Arc, Barrier};
    use tauri::http::HeaderValue;
    use tauri::ipc::{InvokeResponseBody, IpcResponse};

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

    fn package(project: &[u8], captures: Vec<AssetCapture>) -> Vec<u8> {
        encode_project_package(&ProjectPackageEncodeInput::new(
            project.to_vec(),
            PackageCreator::steam_backup_label_studio("0.1.0").unwrap(),
            captures,
        ))
        .unwrap()
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
}
