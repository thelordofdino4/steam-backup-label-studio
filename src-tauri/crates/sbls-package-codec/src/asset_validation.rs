//! Shared package and ordinary-import image validation. No transcoding or I/O.
use crate::assets::{decode_canonical_data_url_with_limits, AssetError};
use crate::error::{FailureCode, FailureStage, ProjectPackageFailure};
use crate::limits::PackageLimits;
use crate::raster::{validate_raster, RasterBudget, RasterError, RasterErrorKind, RasterMime};

/// Encoded dimensions only; browser display orientation/content bounds remain
/// owned by the existing import adapter.
#[derive(Debug, Eq, PartialEq)]
pub struct ValidatedImageAsset {
    pub mime: RasterMime,
    pub width: u32,
    pub height: u32,
}

/// Validate one exact canonical raster data URL with the same decoders,
/// profiles and per-asset budgets used by package encoding. Aggregate project
/// limits are still checked when saving the complete project.
pub fn validate_imported_image(value: &str) -> Result<ValidatedImageAsset, ProjectPackageFailure> {
    let payload = decode_canonical_data_url_with_limits(value, &PackageLimits::V1)
        .map_err(|error| map_data_url_error(error, value))?;
    let info = validate_raster(
        payload.bytes(),
        payload.mime_type(),
        &mut RasterBudget::default(),
    )
    .map_err(map_raster_error)?;
    Ok(ValidatedImageAsset {
        mime: payload.mime_type(),
        width: info.width,
        height: info.height,
    })
}

pub(crate) fn map_asset_capture_error(error: AssetError) -> ProjectPackageFailure {
    match error {
        AssetError::InvalidDataUrl => {
            failure(FailureCode::AssetTypeInvalid, FailureStage::AssetCapture)
        }
        AssetError::UnsupportedMime => failure(
            FailureCode::AssetTypeUnsupported,
            FailureStage::AssetCapture,
        ),
        AssetError::ResourceLimitExceeded | AssetError::AllocationFailed => {
            resource_limit(FailureStage::AssetCapture)
        }
        AssetError::HashCollision => {
            failure(FailureCode::AssetHashCollision, FailureStage::AssetCapture)
        }
        AssetError::MetadataMismatch => {
            failure(FailureCode::AssetTypeInvalid, FailureStage::AssetValidation)
        }
    }
}

pub(crate) fn map_data_url_error(error: AssetError, value: &str) -> ProjectPackageFailure {
    if error == AssetError::UnsupportedMime {
        let declared_mime = value
            .split_once(',')
            .and_then(|(header, _)| header.strip_prefix("data:"))
            .map(|header| header.strip_suffix(";base64").unwrap_or(header))
            .and_then(|header| header.split(';').next());
        if declared_mime.is_some_and(is_accepted_raster_family_spelling) {
            // Aliases, casing differences, and parameterized spellings of an
            // accepted family are malformed normalized envelopes, not
            // additional package MIME types.
            return failure(FailureCode::AssetTypeInvalid, FailureStage::AssetCapture);
        }
    }
    map_asset_capture_error(error)
}

fn is_accepted_raster_family_spelling(value: &str) -> bool {
    [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/gif",
        "image/bmp",
    ]
    .iter()
    .any(|accepted| value.eq_ignore_ascii_case(accepted))
}

pub(crate) fn map_raster_error(error: RasterError) -> ProjectPackageFailure {
    let code = match error.kind {
        RasterErrorKind::Invalid => FailureCode::AssetTypeInvalid,
        RasterErrorKind::UnsupportedJpegProfile => FailureCode::AssetJpegProfileUnsupported,
        RasterErrorKind::UnsupportedBmpProfile => FailureCode::AssetBmpProfileUnsupported,
        RasterErrorKind::Dimensions => FailureCode::AssetDimensionsInvalid,
        RasterErrorKind::ResourceLimit => return resource_limit(FailureStage::AssetValidation),
    };
    failure(code, FailureStage::AssetValidation)
}

const fn failure(code: FailureCode, stage: FailureStage) -> ProjectPackageFailure {
    ProjectPackageFailure::new(code, stage)
}
const fn resource_limit(stage: FailureStage) -> ProjectPackageFailure {
    ProjectPackageFailure::resource_limit(stage)
}
