//! Read-only raw image validation; no paths, network, or editor state.
use super::project_packages::ProjectPackageCommandFailure;
use sbls_package_codec::{
    validate_imported_image, FailureCode, FailureStage, ProjectPackageFailure,
};
use serde::Serialize;
use tauri::ipc::{InvokeBody, Request};

// 64 MiB encoded asset as canonical padded base64 plus longest MIME header.
const MAX_IMAGE_DATA_URL_BYTES: usize = 89_478_511;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImageImportValidation {
    status: &'static str,
    mime_type: &'static str,
    width: u32,
    height: u32,
}

fn validate_body(
    body: &InvokeBody,
    max_bytes: usize,
) -> Result<ImageImportValidation, ProjectPackageFailure> {
    let bytes = match body {
        InvokeBody::Raw(bytes) => bytes,
        InvokeBody::Json(_) => {
            return Err(ProjectPackageFailure::new(
                FailureCode::AssetTypeInvalid,
                FailureStage::AssetCapture,
            ))
        }
    };
    if bytes.len() > max_bytes {
        return Err(ProjectPackageFailure::resource_limit(
            FailureStage::AssetCapture,
        ));
    }
    let value = std::str::from_utf8(bytes).map_err(|_| {
        ProjectPackageFailure::new(FailureCode::AssetTypeInvalid, FailureStage::AssetCapture)
    })?;
    let image = validate_imported_image(value)?;
    Ok(ImageImportValidation {
        status: "success",
        mime_type: image.mime.as_str(),
        width: image.width,
        height: image.height,
    })
}

#[tauri::command]
pub(crate) fn validate_imported_image_asset(
    request: Request<'_>,
) -> Result<ImageImportValidation, ProjectPackageCommandFailure> {
    validate_body(request.body(), MAX_IMAGE_DATA_URL_BYTES).map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn raw_validation_reports_real_raster_dimensions_and_bounds_before_decode() {
        // Independent 1x1 24-bit BI_RGB BMP, including the padded pixel row.
        let url = "data:image/bmp;base64,Qk06AAAAAAAAADYAAAAoAAAAAQAAAAEAAAABABgAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==".to_string();
        let length = url.len();
        let body = InvokeBody::Raw(url.into_bytes());
        let accepted = validate_body(&body, length).unwrap();
        assert_eq!(accepted.status, "success");
        assert_eq!(accepted.mime_type, "image/bmp");
        assert_eq!((accepted.width, accepted.height), (1, 1));
        assert_eq!(
            validate_body(&body, length - 1).unwrap_err().code,
            FailureCode::ResourceLimitExceeded
        );
    }

    #[test]
    fn rejects_json_invalid_utf8_and_vector_payloads() {
        for body in [
            InvokeBody::Json(serde_json::json!({"image": "unused"})),
            InvokeBody::Raw(vec![255]),
            InvokeBody::Raw(b"data:image/svg+xml;base64,PHN2Zy8+".to_vec()),
        ] {
            assert!(validate_body(&body, MAX_IMAGE_DATA_URL_BYTES).is_err());
        }
    }
}
