//! Stable, presentation-safe failures returned by the pure package codec.
//!
//! The codec never exposes parser, decoder, allocator, or native-library error
//! strings as user-facing copy. A failure code identifies the durable semantic
//! condition while [`FailureStage`] records where the first normative failure
//! was observed. The stage is deliberately carried by the failure rather than
//! inferred from the code because resource limits apply at several stages.

use core::fmt;

/// Stable package-domain failure codes.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum FailureCode {
    FileTooLarge,
    FormatUnsupported,
    PackageVersionUnsupported,
    ArchiveTooLarge,
    ResourceLimitExceeded,
    ArchiveInvalid,
    EntryPathInvalid,
    ManifestInvalid,
    ProjectMissing,
    ProjectDigestMismatch,
    AssetMissing,
    AssetDigestMismatch,
    AssetHashCollision,
    AssetTypeInvalid,
    AssetTypeUnsupported,
    AssetJpegProfileUnsupported,
    AssetBmpProfileUnsupported,
    AssetDimensionsInvalid,
    BindingInvalid,
    BindingConflict,
    BindingUnresolved,
    BuiltInUnavailable,
    BuiltInCaptureRequired,
    HydratedJsonInvalid,
    ProjectSchemaUnsupported,
    AssetCaptureFailed,
    EncodeFailed,
}

impl FailureCode {
    /// Every stable code owned by this runtime-disconnected codec slice.
    pub const ALL: [Self; 27] = [
        Self::FileTooLarge,
        Self::FormatUnsupported,
        Self::PackageVersionUnsupported,
        Self::ArchiveTooLarge,
        Self::ResourceLimitExceeded,
        Self::ArchiveInvalid,
        Self::EntryPathInvalid,
        Self::ManifestInvalid,
        Self::ProjectMissing,
        Self::ProjectDigestMismatch,
        Self::AssetMissing,
        Self::AssetDigestMismatch,
        Self::AssetHashCollision,
        Self::AssetTypeInvalid,
        Self::AssetTypeUnsupported,
        Self::AssetJpegProfileUnsupported,
        Self::AssetBmpProfileUnsupported,
        Self::AssetDimensionsInvalid,
        Self::BindingInvalid,
        Self::BindingConflict,
        Self::BindingUnresolved,
        Self::BuiltInUnavailable,
        Self::BuiltInCaptureRequired,
        Self::HydratedJsonInvalid,
        Self::ProjectSchemaUnsupported,
        Self::AssetCaptureFailed,
        Self::EncodeFailed,
    ];

    /// Exact stable string used at package-domain boundaries.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::FileTooLarge => "project.file-too-large",
            Self::FormatUnsupported => "project.format.unsupported",
            Self::PackageVersionUnsupported => "project.package.version-unsupported",
            Self::ArchiveTooLarge => "project.package.archive-too-large",
            Self::ResourceLimitExceeded => "project.package.resource-limit-exceeded",
            Self::ArchiveInvalid => "project.package.archive-invalid",
            Self::EntryPathInvalid => "project.package.entry-path-invalid",
            Self::ManifestInvalid => "project.package.manifest-invalid",
            Self::ProjectMissing => "project.package.project-missing",
            Self::ProjectDigestMismatch => "project.package.project-digest-mismatch",
            Self::AssetMissing => "project.package.asset-missing",
            Self::AssetDigestMismatch => "project.package.asset-digest-mismatch",
            Self::AssetHashCollision => "project.package.asset-hash-collision",
            Self::AssetTypeInvalid => "project.package.asset-type-invalid",
            Self::AssetTypeUnsupported => "project.package.asset-type-unsupported",
            Self::AssetJpegProfileUnsupported => "project.package.asset-jpeg-profile-unsupported",
            Self::AssetBmpProfileUnsupported => "project.package.asset-bmp-profile-unsupported",
            Self::AssetDimensionsInvalid => "project.package.asset-dimensions-invalid",
            Self::BindingInvalid => "project.package.binding-invalid",
            Self::BindingConflict => "project.package.binding-conflict",
            Self::BindingUnresolved => "project.package.binding-unresolved",
            Self::BuiltInUnavailable => "project.package.built-in-unavailable",
            Self::BuiltInCaptureRequired => "project.package.built-in-capture-required",
            Self::HydratedJsonInvalid => "project.package.hydrated-json-invalid",
            Self::ProjectSchemaUnsupported => "project.schema.unsupported",
            Self::AssetCaptureFailed => "project.package.asset-capture-failed",
            Self::EncodeFailed => "project.package.encode-failed",
        }
    }

    /// Whether correcting input or retrying the workflow can reasonably help.
    pub const fn recoverable(self) -> bool {
        !matches!(
            self,
            Self::PackageVersionUnsupported
                | Self::AssetHashCollision
                | Self::BuiltInUnavailable
                | Self::ProjectSchemaUnsupported
        )
    }

    /// Stable, parser-independent user-safe copy.
    pub const fn safe_message(self) -> &'static str {
        match self {
            Self::FileTooLarge => "The project input exceeds the supported size limit.",
            Self::FormatUnsupported => "The input is not a supported project package.",
            Self::PackageVersionUnsupported => "This project package version is not supported.",
            Self::ArchiveTooLarge => "The project package archive is too large.",
            Self::ResourceLimitExceeded => {
                "The project package exceeds a supported resource limit."
            }
            Self::ArchiveInvalid => "The project package archive is invalid.",
            Self::EntryPathInvalid => "The project package contains an invalid archive entry.",
            Self::ManifestInvalid => "The project package manifest is invalid.",
            Self::ProjectMissing => "The project package is missing its project data.",
            Self::ProjectDigestMismatch => "The packaged project data failed its integrity check.",
            Self::AssetMissing => "The project package is missing a required asset.",
            Self::AssetDigestMismatch => "A packaged asset failed its integrity check.",
            Self::AssetHashCollision => "Two different assets produced the same package identity.",
            Self::AssetTypeInvalid => "A packaged image has invalid or inconsistent data.",
            Self::AssetTypeUnsupported => {
                "A required image format is not supported by package version 1."
            }
            Self::AssetJpegProfileUnsupported => {
                "A JPEG image uses a profile not supported by package version 1."
            }
            Self::AssetBmpProfileUnsupported => {
                "A BMP image uses a profile not supported by package version 1."
            }
            Self::AssetDimensionsInvalid => {
                "A packaged image has invalid or inconsistent dimensions."
            }
            Self::BindingInvalid => "The project package contains an invalid asset binding.",
            Self::BindingConflict => "The project package contains conflicting asset bindings.",
            Self::BindingUnresolved => "The project package contains an unresolved asset binding.",
            Self::BuiltInUnavailable => {
                "A required built-in asset is unavailable in this application version."
            }
            Self::BuiltInCaptureRequired => {
                "A built-in asset must be captured before this project can be packaged."
            }
            Self::HydratedJsonInvalid => {
                "The hydrated project data is invalid or exceeds supported limits."
            }
            Self::ProjectSchemaUnsupported => "This project schema version is not supported.",
            Self::AssetCaptureFailed => "A required project asset could not be captured safely.",
            Self::EncodeFailed => "The project package could not be encoded.",
        }
    }
}

impl fmt::Display for FailureCode {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// Normative validation stage at which a failure was first observed.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum FailureStage {
    RawInput,
    ArchiveEnvelope,
    EntryInventory,
    Manifest,
    Project,
    AssetCapture,
    AssetValidation,
    BindingHydration,
    Encoding,
}

impl FailureStage {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::RawInput => "raw-input",
            Self::ArchiveEnvelope => "archive-envelope",
            Self::EntryInventory => "entry-inventory",
            Self::Manifest => "manifest",
            Self::Project => "project",
            Self::AssetCapture => "asset-capture",
            Self::AssetValidation => "asset-validation",
            Self::BindingHydration => "binding-hydration",
            Self::Encoding => "encoding",
        }
    }
}

impl fmt::Display for FailureStage {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// One structured, stable failure from the pure package codec.
///
/// The message and recoverability are derived from the code so callers cannot
/// accidentally publish inconsistent failure metadata.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ProjectPackageFailure {
    pub code: FailureCode,
    pub stage: FailureStage,
}

impl ProjectPackageFailure {
    pub const fn new(code: FailureCode, stage: FailureStage) -> Self {
        Self { code, stage }
    }

    pub const fn resource_limit(stage: FailureStage) -> Self {
        Self::new(FailureCode::ResourceLimitExceeded, stage)
    }

    pub const fn status(self) -> &'static str {
        "failure"
    }

    pub const fn recoverable(self) -> bool {
        self.code.recoverable()
    }

    pub const fn safe_message(self) -> &'static str {
        self.code.safe_message()
    }
}

impl fmt::Display for ProjectPackageFailure {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "{} at {}: {}",
            self.code,
            self.stage,
            self.safe_message()
        )
    }
}

impl std::error::Error for ProjectPackageFailure {}

#[cfg(test)]
mod tests {
    use super::{FailureCode, FailureStage, ProjectPackageFailure};
    use std::collections::BTreeSet;

    #[test]
    fn every_failure_code_has_unique_stable_copy() {
        let values = FailureCode::ALL
            .iter()
            .map(|code| code.as_str())
            .collect::<BTreeSet<_>>();

        assert_eq!(values.len(), FailureCode::ALL.len());
        assert!(FailureCode::ALL
            .iter()
            .all(|code| !code.safe_message().is_empty()));
    }

    #[test]
    fn stable_code_registry_is_exact() {
        assert_eq!(
            FailureCode::ALL.map(FailureCode::as_str),
            [
                "project.file-too-large",
                "project.format.unsupported",
                "project.package.version-unsupported",
                "project.package.archive-too-large",
                "project.package.resource-limit-exceeded",
                "project.package.archive-invalid",
                "project.package.entry-path-invalid",
                "project.package.manifest-invalid",
                "project.package.project-missing",
                "project.package.project-digest-mismatch",
                "project.package.asset-missing",
                "project.package.asset-digest-mismatch",
                "project.package.asset-hash-collision",
                "project.package.asset-type-invalid",
                "project.package.asset-type-unsupported",
                "project.package.asset-jpeg-profile-unsupported",
                "project.package.asset-bmp-profile-unsupported",
                "project.package.asset-dimensions-invalid",
                "project.package.binding-invalid",
                "project.package.binding-conflict",
                "project.package.binding-unresolved",
                "project.package.built-in-unavailable",
                "project.package.built-in-capture-required",
                "project.package.hydrated-json-invalid",
                "project.schema.unsupported",
                "project.package.asset-capture-failed",
                "project.package.encode-failed",
            ]
        );
    }

    #[test]
    fn raster_profile_codes_are_exact_and_recoverable() {
        assert_eq!(
            FailureCode::AssetJpegProfileUnsupported.as_str(),
            "project.package.asset-jpeg-profile-unsupported"
        );
        assert_eq!(
            FailureCode::AssetBmpProfileUnsupported.as_str(),
            "project.package.asset-bmp-profile-unsupported"
        );
        assert!(FailureCode::AssetJpegProfileUnsupported.recoverable());
        assert!(FailureCode::AssetBmpProfileUnsupported.recoverable());
    }

    #[test]
    fn compatibility_and_collision_failures_are_not_unchanged_retryable() {
        for code in [
            FailureCode::PackageVersionUnsupported,
            FailureCode::AssetHashCollision,
            FailureCode::BuiltInUnavailable,
            FailureCode::ProjectSchemaUnsupported,
        ] {
            assert!(!code.recoverable(), "{} must not be retryable", code);
        }
    }

    #[test]
    fn resource_failure_retains_the_observation_stage() {
        let failure = ProjectPackageFailure::resource_limit(FailureStage::AssetValidation);

        assert_eq!(failure.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(failure.stage, FailureStage::AssetValidation);
        assert_eq!(failure.status(), "failure");
        assert!(failure.recoverable());
        assert!(!failure.to_string().contains("allocator"));
    }
}
