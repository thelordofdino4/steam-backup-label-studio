//! Pure, deterministic `.sbls` package codec.
//!
//! This crate intentionally has no dependency on Tauri, application lifecycle
//! state, filesystem paths, dialogs, React, or network services. Callers provide
//! one immutable normalized project snapshot and a complete typed asset-capture
//! plan; successful decode returns an owned hydrated JSON candidate.

mod archive;
mod assets;
mod asset_validation;
mod decode;
mod encode;
mod error;
mod json;
mod limits;
mod manifest;
mod model;
mod native;
mod raster;
mod registry;

#[cfg(test)]
mod conformance_tests;

pub use decode::decode_project_package;
pub use encode::{
    encode_project_package, encode_project_package_from_borrowed, encode_project_package_from_parts,
};
pub use error::{FailureCode, FailureStage, ProjectPackageFailure};
pub use model::{
    AssetCapture, AssetCaptureDecision, DecodedPackageMetadata, DecodedProjectPackage,
    PackageCreator, ProjectPackageEncodeInput,
};
pub use raster::RasterMime;
pub use asset_validation::{validate_imported_image, ValidatedImageAsset};
pub use registry::{AssetOwner, CaseSurface, LogoRole, PlatformKind, TechnicalKind};
