//! Closed, schema-aware registry of persisted project image owners.
//!
//! This module intentionally does not discover assets by recursively looking for
//! property names such as `imageDataUrl`.  Every admitted pointer is produced by
//! one typed [`AssetOwner`] variant and every incoming pointer is matched against
//! the same closed vocabulary.

use crate::json::JsonValue;
use std::fmt;

/// Maximum UTF-8 byte length of a manifest binding pointer.
pub(crate) const MAX_BINDING_POINTER_BYTES: usize = 1_024;

const SUPPORTED_SCHEMA_0_1: &str = "0.1.0";
const SUPPORTED_SCHEMA_0_2: &str = "0.2.0";

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub(crate) enum ProjectSchemaVersion {
    V0_1_0,
    V0_2_0,
}

impl ProjectSchemaVersion {
    #[cfg(test)]
    pub(crate) const ALL: [Self; 2] = [Self::V0_1_0, Self::V0_2_0];

    pub(crate) fn parse(value: &str) -> Result<Self, RegistryError> {
        match value {
            SUPPORTED_SCHEMA_0_1 => Ok(Self::V0_1_0),
            SUPPORTED_SCHEMA_0_2 => Ok(Self::V0_2_0),
            _ => Err(RegistryError::UnsupportedSchemaVersion),
        }
    }

    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::V0_1_0 => SUPPORTED_SCHEMA_0_1,
            Self::V0_2_0 => SUPPORTED_SCHEMA_0_2,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub(crate) enum ProjectKind {
    Disc,
    CaseInsert,
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum LogoRole {
    Developer,
    Publisher,
}

impl LogoRole {
    pub const ALL: [Self; 2] = [Self::Developer, Self::Publisher];

    const fn primary_field(self) -> &'static str {
        match self {
            Self::Developer => "developerLogoDataUrl",
            Self::Publisher => "publisherLogoDataUrl",
        }
    }

    const fn additional_field(self) -> &'static str {
        match self {
            Self::Developer => "additionalDeveloperLogos",
            Self::Publisher => "additionalPublisherLogos",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum PlatformKind {
    Pc,
    Windows,
    Linux,
    SteamDeck,
    Macos,
}

impl PlatformKind {
    /// Contract order. Do not derive this from JSON object/member order.
    pub const ALL: [Self; 5] = [
        Self::Pc,
        Self::Windows,
        Self::Linux,
        Self::SteamDeck,
        Self::Macos,
    ];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pc => "pc",
            Self::Windows => "windows",
            Self::Linux => "linux",
            Self::SteamDeck => "steamDeck",
            Self::Macos => "macos",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "pc" => Some(Self::Pc),
            "windows" => Some(Self::Windows),
            "linux" => Some(Self::Linux),
            "steamDeck" => Some(Self::SteamDeck),
            "macos" => Some(Self::Macos),
            _ => None,
        }
    }

    #[cfg(test)]
    const fn ordinal(self) -> usize {
        match self {
            Self::Pc => 0,
            Self::Windows => 1,
            Self::Linux => 2,
            Self::SteamDeck => 3,
            Self::Macos => 4,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum TechnicalKind {
    Audio,
    Surround,
    Codec,
    Middleware,
    Technology,
}

impl TechnicalKind {
    /// Contract order. Do not derive this from JSON object/member order.
    pub const ALL: [Self; 5] = [
        Self::Audio,
        Self::Surround,
        Self::Codec,
        Self::Middleware,
        Self::Technology,
    ];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Audio => "audio",
            Self::Surround => "surround",
            Self::Codec => "codec",
            Self::Middleware => "middleware",
            Self::Technology => "technology",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "audio" => Some(Self::Audio),
            "surround" => Some(Self::Surround),
            "codec" => Some(Self::Codec),
            "middleware" => Some(Self::Middleware),
            "technology" => Some(Self::Technology),
            _ => None,
        }
    }

    const fn ordinal(self) -> usize {
        match self {
            Self::Audio => 0,
            Self::Surround => 1,
            Self::Codec => 2,
            Self::Middleware => 3,
            Self::Technology => 4,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum CaseSurface {
    Cover,
    Tray,
    SpineLeft,
    SpineRight,
}

impl CaseSurface {
    /// Canonical owner order from the package contract.
    pub const ALL: [Self; 4] = [Self::Cover, Self::Tray, Self::SpineLeft, Self::SpineRight];

    #[cfg(test)]
    const fn ordinal(self) -> usize {
        match self {
            Self::Cover => 0,
            Self::Tray => 1,
            Self::SpineLeft => 2,
            Self::SpineRight => 3,
        }
    }

    const fn pointer_prefix(self) -> &'static str {
        match self {
            Self::Cover => "/caseInsert/templates/cover",
            Self::Tray => "/caseInsert/templates/tray",
            Self::SpineLeft => "/caseInsert/spine/left",
            Self::SpineRight => "/caseInsert/spine/right",
        }
    }
}

/// One concrete persisted image owner admitted by package v1.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum AssetOwner {
    DiscBackground,
    DiscSteamBanner,
    DiscPrimaryLogo {
        role: LogoRole,
    },
    DiscAdditionalLogo {
        role: LogoRole,
        index: usize,
    },
    DiscTitleCurrent,
    DiscTitleDefault,
    DiscAdditionalArtwork {
        index: usize,
    },
    DiscRatingCustom,
    DiscMediaCustom,
    DiscPlatformCustom {
        platform: PlatformKind,
    },
    DiscTechnicalPrimary {
        technical: TechnicalKind,
    },
    DiscTechnicalAdditional {
        technical: TechnicalKind,
        index: usize,
    },
    CaseBanner {
        surface: CaseSurface,
    },
    CaseBackground {
        surface: CaseSurface,
    },
    CaseTitleCurrent {
        surface: CaseSurface,
    },
    CaseTitleDefault {
        surface: CaseSurface,
    },
    CaseArtwork {
        surface: CaseSurface,
        index: usize,
    },
    CaseLogo {
        surface: CaseSurface,
        index: usize,
    },
    CaseMark {
        surface: CaseSurface,
        index: usize,
    },
}

impl AssetOwner {
    pub(crate) const fn project_kind(self) -> ProjectKind {
        match self {
            Self::DiscBackground
            | Self::DiscSteamBanner
            | Self::DiscPrimaryLogo { .. }
            | Self::DiscAdditionalLogo { .. }
            | Self::DiscTitleCurrent
            | Self::DiscTitleDefault
            | Self::DiscAdditionalArtwork { .. }
            | Self::DiscRatingCustom
            | Self::DiscMediaCustom
            | Self::DiscPlatformCustom { .. }
            | Self::DiscTechnicalPrimary { .. }
            | Self::DiscTechnicalAdditional { .. } => ProjectKind::Disc,
            Self::CaseBanner { .. }
            | Self::CaseBackground { .. }
            | Self::CaseTitleCurrent { .. }
            | Self::CaseTitleDefault { .. }
            | Self::CaseArtwork { .. }
            | Self::CaseLogo { .. }
            | Self::CaseMark { .. } => ProjectKind::CaseInsert,
        }
    }

    /// Contract pointer pattern for diagnostics and compatibility keys.
    #[cfg(test)]
    pub(crate) const fn pointer_pattern(self) -> &'static str {
        match self {
            Self::DiscBackground => "/background/imageDataUrl",
            Self::DiscSteamBanner => "/steamBackupLogo/lockupImageDataUrl",
            Self::DiscPrimaryLogo {
                role: LogoRole::Developer,
            } => "/logoAssets/developerLogoDataUrl",
            Self::DiscPrimaryLogo {
                role: LogoRole::Publisher,
            } => "/logoAssets/publisherLogoDataUrl",
            Self::DiscAdditionalLogo {
                role: LogoRole::Developer,
                ..
            } => "/logoAssets/additionalDeveloperLogos/{i}/imageDataUrl",
            Self::DiscAdditionalLogo {
                role: LogoRole::Publisher,
                ..
            } => "/logoAssets/additionalPublisherLogos/{i}/imageDataUrl",
            Self::DiscTitleCurrent => "/titleArtwork/imageDataUrl",
            Self::DiscTitleDefault => "/titleArtwork/defaultSteamLogo/imageDataUrl",
            Self::DiscAdditionalArtwork { .. } => "/additionalArtwork/elements/{i}/imageDataUrl",
            Self::DiscRatingCustom => "/ratingBadge/customImageDataUrl",
            Self::DiscMediaCustom => "/mediaMark/customImageDataUrl",
            Self::DiscPlatformCustom { .. } => {
                "/platformMarks/assets/{platform}/customImageDataUrl"
            }
            Self::DiscTechnicalPrimary { .. } => {
                "/technicalMarks/assets/{technical}/customImageDataUrl"
            }
            Self::DiscTechnicalAdditional { .. } => {
                "/technicalMarks/additionalAssets/{technical}/{i}/customImageDataUrl"
            }
            Self::CaseBanner { .. } => "/caseInsert/{surface}/steamBanner/lockupImageDataUrl",
            Self::CaseBackground { .. } => "/caseInsert/{surface}/background/imageDataUrl",
            Self::CaseTitleCurrent { .. } => "/caseInsert/{surface}/titleArtwork/imageDataUrl",
            Self::CaseTitleDefault { .. } => {
                "/caseInsert/{surface}/titleArtwork/defaultSteamLogo/imageDataUrl"
            }
            Self::CaseArtwork { .. } => "/caseInsert/{surface}/artworkSlots/{i}/imageDataUrl",
            Self::CaseLogo { .. } => "/caseInsert/{surface}/logoSlots/{i}/imageDataUrl",
            Self::CaseMark { .. } => "/caseInsert/{surface}/markSlots/{i}/imageDataUrl",
        }
    }

    /// Construct the one canonical RFC 6901 pointer for this owner.
    #[cfg(test)]
    pub(crate) fn pointer(self) -> String {
        self.try_pointer()
            .expect("a package owner pointer must fit the fixed registry bound")
    }

    /// Construct the canonical pointer through a fallible allocation path.
    /// Package encode/decode code must use this form so allocator denial is
    /// converted into the stage-appropriate typed package failure.
    pub(crate) fn try_pointer(self) -> Result<String, RegistryError> {
        let mut pointer = PointerBuffer::new();
        match self {
            Self::DiscBackground => pointer.append("/background/imageDataUrl")?,
            Self::DiscSteamBanner => pointer.append("/steamBackupLogo/lockupImageDataUrl")?,
            Self::DiscPrimaryLogo { role } => {
                pointer.append("/logoAssets/")?;
                pointer.append(role.primary_field())?;
            }
            Self::DiscAdditionalLogo { role, index } => {
                pointer.append("/logoAssets/")?;
                pointer.append(role.additional_field())?;
                pointer.append("/")?;
                pointer.append_usize(index)?;
                pointer.append("/imageDataUrl")?;
            }
            Self::DiscTitleCurrent => pointer.append("/titleArtwork/imageDataUrl")?,
            Self::DiscTitleDefault => {
                pointer.append("/titleArtwork/defaultSteamLogo/imageDataUrl")?;
            }
            Self::DiscAdditionalArtwork { index } => {
                pointer.append("/additionalArtwork/elements/")?;
                pointer.append_usize(index)?;
                pointer.append("/imageDataUrl")?;
            }
            Self::DiscRatingCustom => pointer.append("/ratingBadge/customImageDataUrl")?,
            Self::DiscMediaCustom => pointer.append("/mediaMark/customImageDataUrl")?,
            Self::DiscPlatformCustom { platform } => {
                pointer.append("/platformMarks/assets/")?;
                pointer.append(platform.as_str())?;
                pointer.append("/customImageDataUrl")?;
            }
            Self::DiscTechnicalPrimary { technical } => {
                pointer.append("/technicalMarks/assets/")?;
                pointer.append(technical.as_str())?;
                pointer.append("/customImageDataUrl")?;
            }
            Self::DiscTechnicalAdditional { technical, index } => {
                pointer.append("/technicalMarks/additionalAssets/")?;
                pointer.append(technical.as_str())?;
                pointer.append("/")?;
                pointer.append_usize(index)?;
                pointer.append("/customImageDataUrl")?;
            }
            Self::CaseBanner { surface } => {
                pointer.append(surface.pointer_prefix())?;
                pointer.append("/steamBanner/lockupImageDataUrl")?;
            }
            Self::CaseBackground { surface } => {
                pointer.append(surface.pointer_prefix())?;
                pointer.append("/background/imageDataUrl")?;
            }
            Self::CaseTitleCurrent { surface } => {
                pointer.append(surface.pointer_prefix())?;
                pointer.append("/titleArtwork/imageDataUrl")?;
            }
            Self::CaseTitleDefault { surface } => {
                pointer.append(surface.pointer_prefix())?;
                pointer.append("/titleArtwork/defaultSteamLogo/imageDataUrl")?;
            }
            Self::CaseArtwork { surface, index } => {
                pointer.append(surface.pointer_prefix())?;
                pointer.append("/artworkSlots/")?;
                pointer.append_usize(index)?;
                pointer.append("/imageDataUrl")?;
            }
            Self::CaseLogo { surface, index } => {
                pointer.append(surface.pointer_prefix())?;
                pointer.append("/logoSlots/")?;
                pointer.append_usize(index)?;
                pointer.append("/imageDataUrl")?;
            }
            Self::CaseMark { surface, index } => {
                pointer.append(surface.pointer_prefix())?;
                pointer.append("/markSlots/")?;
                pointer.append_usize(index)?;
                pointer.append("/imageDataUrl")?;
            }
        }

        pointer.finish()
    }
}

struct PointerBuffer {
    bytes: [u8; MAX_BINDING_POINTER_BYTES],
    len: usize,
}

impl PointerBuffer {
    const fn new() -> Self {
        Self {
            bytes: [0; MAX_BINDING_POINTER_BYTES],
            len: 0,
        }
    }

    fn append(&mut self, value: &str) -> Result<(), RegistryError> {
        let end = self
            .len
            .checked_add(value.len())
            .filter(|end| *end <= self.bytes.len())
            .ok_or(RegistryError::CapacityOverflow)?;
        self.bytes[self.len..end].copy_from_slice(value.as_bytes());
        self.len = end;
        Ok(())
    }

    fn append_usize(&mut self, mut value: usize) -> Result<(), RegistryError> {
        let digits = if value == 0 {
            1
        } else {
            value.ilog10() as usize + 1
        };
        let end = self
            .len
            .checked_add(digits)
            .filter(|end| *end <= self.bytes.len())
            .ok_or(RegistryError::CapacityOverflow)?;
        for position in (self.len..end).rev() {
            self.bytes[position] = b'0' + (value % 10) as u8;
            value /= 10;
        }
        self.len = end;
        Ok(())
    }

    fn finish(self) -> Result<String, RegistryError> {
        let value = std::str::from_utf8(&self.bytes[..self.len])
            .map_err(|_| RegistryError::PointerOutsideRegistry)?;
        let mut pointer = String::new();
        pointer
            .try_reserve_exact(value.len())
            .map_err(|_| RegistryError::CapacityOverflow)?;
        pointer.push_str(value);
        Ok(pointer)
    }
}

/// Semantic meaning of an unbound/null registered image owner.
///
/// This classification is shared by package encoding and decoding so neither
/// facade can silently disagree about whether a persisted owner represents no
/// bytes, application-owned fallback bytes, or missing project-owned bytes.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum UnboundOwnerDisposition {
    NoAcceptedAsset,
    BuiltInWithoutCompatibility,
    AcceptedAssetMissingBinding,
}

/// Renderer-visible semantic built-ins that do not own a data-URL leaf and
/// therefore cannot truthfully participate in the manifest binding registry.
/// Known v1 identities are supplied by the frozen application compatibility
/// registry; only unknown selectors reach this explicit gate.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum UnavailableSemanticBuiltIn {
    DiscSupplementalUsk,
    DiscNumberBadge,
    DiscArtworkFrame { index: usize },
    CaseArtworkFrame { surface: CaseSurface, index: usize },
}

pub(crate) fn first_unavailable_semantic_builtin(
    project: &JsonValue,
    project_kind: ProjectKind,
) -> Option<UnavailableSemanticBuiltIn> {
    match project_kind {
        ProjectKind::Disc => {
            let unsupported_supplemental_usk_retained = project
                .get("ratingBadge")
                .and_then(|rating| rating.get("uskBadge"))
                .and_then(|usk| usk.get("ratingValue"))
                .and_then(JsonValue::as_str)
                .is_some_and(|value| {
                    !value.is_empty() && !matches!(value, "0" | "6" | "12" | "16" | "18")
                });
            if unsupported_supplemental_usk_retained {
                return Some(UnavailableSemanticBuiltIn::DiscSupplementalUsk);
            }

            let unsupported_number_badge_set_retained = project
                .get("discNumberArtwork")
                .and_then(|value| value.get("badgeSet"))
                .and_then(JsonValue::as_str)
                .is_some_and(|value| !value.is_empty() && value != "starterRing");
            if unsupported_number_badge_set_retained {
                return Some(UnavailableSemanticBuiltIn::DiscNumberBadge);
            }

            let elements = project
                .get("additionalArtwork")
                .and_then(|value| value.get("elements"))
                .and_then(JsonValue::as_array)
                .unwrap_or(&[]);
            elements.iter().enumerate().find_map(|(index, element)| {
                frame_is_unknown_builtin(element)
                    .then_some(UnavailableSemanticBuiltIn::DiscArtworkFrame { index })
            })
        }
        ProjectKind::CaseInsert => {
            for surface in CaseSurface::ALL {
                let slots = case_surface_container(project, surface)
                    .and_then(|value| value.get("artworkSlots"))
                    .and_then(JsonValue::as_array)
                    .unwrap_or(&[]);
                if let Some(index) = slots.iter().position(frame_is_unknown_builtin) {
                    return Some(UnavailableSemanticBuiltIn::CaseArtworkFrame { surface, index });
                }
            }
            None
        }
    }
}

fn frame_is_unknown_builtin(owner: &JsonValue) -> bool {
    owner
        .get("frame")
        .and_then(|frame| frame.get("style"))
        .and_then(JsonValue::as_str)
        .is_some_and(|style| !matches!(style, "solid" | "rough" | "rocky"))
}

/// Classify one concrete registry owner whose package binding is absent.
///
/// Package v1 freezes only the explicit built-in compatibility mappings in the
/// normative registry. An unbound owner may therefore omit bytes only when its
/// exact semantic state resolves to one of those mappings. Disc logo fallbacks
/// and recognized Case logo roles are selected by the same owner/discriminator
/// rules as the current renderers, rather than by generic property-name
/// discovery.
pub(crate) fn classify_unbound_owner(
    project: &JsonValue,
    owner: AssetOwner,
) -> UnboundOwnerDisposition {
    let container = owner_container(project, owner);
    if owner_leaf(container, owner).is_some_and(|value| !value.is_null()) {
        return UnboundOwnerDisposition::AcceptedAssetMissingBinding;
    }

    match owner {
        AssetOwner::DiscBackground => {
            classify_provenance_owner(container, "imageSource", "imageSize", false)
        }
        AssetOwner::DiscSteamBanner => {
            classify_provenance_owner(container, "lockupImageSource", "lockupImageSize", true)
        }
        AssetOwner::DiscPrimaryLogo { role } => classify_logo_fallback_owner(
            container,
            match role {
                LogoRole::Developer => "developerLogoSource",
                LogoRole::Publisher => "publisherLogoSource",
            },
            match role {
                LogoRole::Developer => "developerLogoSize",
                LogoRole::Publisher => "publisherLogoSize",
            },
            true,
        ),
        AssetOwner::DiscAdditionalLogo { .. } => {
            classify_logo_fallback_owner(container, "imageSource", "imageSize", false)
        }
        AssetOwner::DiscTitleCurrent => {
            classify_evidenced_owner(container, &["imageSize", "steamArtworkAssetId"])
        }
        AssetOwner::DiscTitleDefault | AssetOwner::CaseTitleDefault { .. } => {
            classify_evidenced_owner(container, &["imageSize", "steamArtworkAssetId"])
        }
        AssetOwner::DiscAdditionalArtwork { .. } => {
            classify_evidenced_owner(container, &["imageSize", "sourceId"])
        }
        AssetOwner::DiscPlatformCustom { platform } => {
            if container.is_none()
                && (selected_owner_value(project, "platformMarks", platform.as_str())
                    || legacy_platform_owner_selected(project, platform))
            {
                UnboundOwnerDisposition::BuiltInWithoutCompatibility
            } else {
                classify_direct_source_owner(container, "customImageSize", false)
            }
        }
        AssetOwner::DiscTechnicalPrimary { technical } => {
            if container.is_none()
                && selected_owner_value(project, "technicalMarks", technical.as_str())
            {
                UnboundOwnerDisposition::BuiltInWithoutCompatibility
            } else {
                classify_direct_source_owner(container, "customImageSize", false)
            }
        }
        AssetOwner::DiscRatingCustom => {
            let custom = classify_direct_source_owner(container, "customImageSize", false);
            if custom == UnboundOwnerDisposition::AcceptedAssetMissingBinding {
                custom
            } else if disc_rating_compatibility(project, container).is_some() {
                UnboundOwnerDisposition::BuiltInWithoutCompatibility
            } else {
                UnboundOwnerDisposition::NoAcceptedAsset
            }
        }
        AssetOwner::DiscMediaCustom => {
            let custom = classify_direct_source_owner(container, "customImageSize", false);
            if custom == UnboundOwnerDisposition::AcceptedAssetMissingBinding {
                custom
            } else if disc_media_compatibility(container).is_some() {
                UnboundOwnerDisposition::BuiltInWithoutCompatibility
            } else {
                UnboundOwnerDisposition::NoAcceptedAsset
            }
        }
        AssetOwner::DiscTechnicalAdditional { .. } => {
            classify_direct_source_owner(container, "customImageSize", false)
        }
        AssetOwner::CaseBanner { .. } => {
            classify_provenance_owner(container, "lockupImageSource", "lockupImageSize", true)
        }
        AssetOwner::CaseLogo { .. } => classify_case_logo_owner(container),
        AssetOwner::CaseBackground { .. }
        | AssetOwner::CaseTitleCurrent { .. }
        | AssetOwner::CaseArtwork { .. }
        | AssetOwner::CaseMark { .. } => {
            classify_provenance_owner(container, "imageSource", "imageSize", false)
        }
    }
}

/// Validate one application-declared omission against the frozen package-v1
/// compatibility tuples. Incidental labels, URLs, and file names never qualify.
pub(crate) fn qualified_builtin_matches(
    project: &JsonValue,
    owner: AssetOwner,
    compatibility_id: &str,
) -> bool {
    let container = owner_container(project, owner);
    if owner_leaf(container, owner)
        .and_then(JsonValue::as_str)
        .is_some_and(|value| value.starts_with("data:"))
    {
        return false;
    }

    match owner {
        AssetOwner::DiscSteamBanner => {
            compatibility_id == "steam-banner:banner-lockup"
                && match provenance_source(container, "lockupImageSource") {
                    None => true,
                    Some("built-in") => provenance_source_id(container, "lockupImageSource")
                        .map_or(true, |id| id == "steam-banner:banner-lockup"),
                    Some(_) => false,
                }
        }
        AssetOwner::CaseBanner { surface } => {
            let (compatibility, source_id) = match surface {
                CaseSurface::Cover | CaseSurface::Tray => (
                    "steam-banner:banner-lockup",
                    "case-steam-banner:cover-lockup",
                ),
                CaseSurface::SpineLeft | CaseSurface::SpineRight => {
                    ("steam-banner:spine-icon", "case-steam-banner:spine-icon")
                }
            };
            compatibility_id == compatibility
                && provenance_source_id(container, "lockupImageSource") == Some(source_id)
        }
        AssetOwner::DiscPrimaryLogo { role } => {
            compatibility_id == logo_compatibility_id(role)
                && classify_unbound_owner(project, owner)
                    == UnboundOwnerDisposition::BuiltInWithoutCompatibility
        }
        AssetOwner::DiscAdditionalLogo { role, .. } => {
            compatibility_id == logo_compatibility_id(role)
                && provenance_source(container, "imageSource")
                    .is_some_and(|source| matches!(source, "built-in" | "placeholder"))
        }
        AssetOwner::CaseLogo { .. } => {
            let Some(source_id) = provenance_source_id(container, "imageSource") else {
                return false;
            };
            if !provenance_source(container, "imageSource")
                .is_some_and(|source| matches!(source, "built-in" | "placeholder"))
            {
                return false;
            }
            match compatibility_id {
                "logo:developer" => {
                    source_id == "case-logo:developer"
                        || source_id.starts_with("case-logo:developer:additional:")
                }
                "logo:publisher" => {
                    source_id == "case-logo:publisher"
                        || source_id.starts_with("case-logo:publisher:additional:")
                }
                _ => false,
            }
        }
        AssetOwner::DiscRatingCustom => disc_rating_compatibility(project, container)
            .is_some_and(|expected| expected == compatibility_id),
        AssetOwner::DiscMediaCustom => {
            disc_media_compatibility(container).is_some_and(|expected| expected == compatibility_id)
        }
        AssetOwner::DiscPlatformCustom { platform } => {
            disc_platform_compatibility(project, container, platform)
                .is_some_and(|expected| expected == compatibility_id)
        }
        AssetOwner::DiscTechnicalPrimary { technical }
        | AssetOwner::DiscTechnicalAdditional { technical, .. } => {
            technical_compatibility(container, technical)
                .is_some_and(|expected| expected == compatibility_id)
        }
        AssetOwner::CaseMark { .. } => provenance_source_id(container, "imageSource")
            .and_then(|source_id| source_id.strip_prefix("case-"))
            .is_some_and(|expected| expected == compatibility_id),
        AssetOwner::DiscBackground
        | AssetOwner::DiscTitleCurrent
        | AssetOwner::DiscTitleDefault
        | AssetOwner::DiscAdditionalArtwork { .. }
        | AssetOwner::CaseBackground { .. }
        | AssetOwner::CaseTitleCurrent { .. }
        | AssetOwner::CaseTitleDefault { .. }
        | AssetOwner::CaseArtwork { .. } => false,
    }
}

pub(crate) fn has_qualified_builtin_mapping(project: &JsonValue, owner: AssetOwner) -> bool {
    match owner {
        AssetOwner::DiscSteamBanner => {
            qualified_builtin_matches(project, owner, "steam-banner:banner-lockup")
        }
        AssetOwner::CaseBanner { surface } => qualified_builtin_matches(
            project,
            owner,
            match surface {
                CaseSurface::Cover | CaseSurface::Tray => "steam-banner:banner-lockup",
                CaseSurface::SpineLeft | CaseSurface::SpineRight => "steam-banner:spine-icon",
            },
        ),
        AssetOwner::DiscPrimaryLogo { role } | AssetOwner::DiscAdditionalLogo { role, .. } => {
            qualified_builtin_matches(project, owner, logo_compatibility_id(role))
        }
        AssetOwner::CaseLogo { .. } => ["logo:developer", "logo:publisher"]
            .into_iter()
            .any(|id| qualified_builtin_matches(project, owner, id)),
        AssetOwner::DiscRatingCustom => {
            disc_rating_compatibility(project, owner_container(project, owner)).is_some()
        }
        AssetOwner::DiscMediaCustom => {
            disc_media_compatibility(owner_container(project, owner)).is_some()
        }
        AssetOwner::DiscPlatformCustom { platform } => {
            disc_platform_compatibility(project, owner_container(project, owner), platform)
                .is_some()
        }
        AssetOwner::DiscTechnicalPrimary { technical }
        | AssetOwner::DiscTechnicalAdditional { technical, .. } => {
            technical_compatibility(owner_container(project, owner), technical).is_some()
        }
        AssetOwner::CaseMark { .. } => {
            provenance_source_id(owner_container(project, owner), "imageSource")
                .and_then(|source_id| source_id.strip_prefix("case-"))
                .is_some_and(is_known_mark_compatibility)
        }
        _ => false,
    }
}

fn is_known_mark_compatibility(id: &str) -> bool {
    matches!(
        id,
        "rating:ESRB:E"
            | "rating:ESRB:E10+"
            | "rating:ESRB:T"
            | "rating:ESRB:M"
            | "rating:ESRB:AO"
            | "rating:ESRB:RP"
            | "rating:ESRB:RP17+"
            | "rating:PEGI:3"
            | "rating:PEGI:7"
            | "rating:PEGI:12"
            | "rating:PEGI:16"
            | "rating:PEGI:18"
            | "rating:USK:0"
            | "rating:USK:6"
            | "rating:USK:12"
            | "rating:USK:16"
            | "rating:USK:18"
            | "media:bluRay"
            | "media:cdRom:light"
            | "media:cdRom:dark"
            | "media:dataDisc:light"
            | "media:dataDisc:dark"
            | "media:dvd:light"
            | "media:dvd:dark"
            | "media:dvdRom:light"
            | "media:dvdRom:dark"
            | "media:installDisc:light"
            | "media:installDisc:dark"
            | "platform:linux:color"
            | "platform:linux:light"
            | "platform:linux:dark"
            | "platform:macos:macos1988"
            | "platform:macos:macos1995"
            | "platform:macos:macos2001"
            | "platform:macos:macos2003"
            | "platform:macos:macos2012"
            | "platform:macos:macos2016"
            | "platform:macos:macos2017"
            | "platform:pc:pcPlatform"
            | "platform:pc:pcSimplified"
            | "platform:pc:pcSimplifiedDark"
            | "platform:steamDeck:color"
            | "platform:steamDeck:light"
            | "platform:steamDeck:dark"
            | "platform:windows:retro"
            | "platform:windows:xp"
            | "platform:windows:vista"
            | "platform:windows:windows7"
            | "platform:windows:windows10"
            | "platform:windows:windows11"
            | "technical:audio"
            | "technical:surround"
            | "technical:codec"
            | "technical:middleware"
            | "technical:technology"
    )
}

pub(crate) fn clear_qualified_builtin_leaf(
    project: &mut JsonValue,
    owner: AssetOwner,
) -> Result<(), RegistryError> {
    let Some(container) = owner_container_mut(project, owner) else {
        return Ok(());
    };
    let member = owner_leaf_member(owner);
    if let Some(leaf) = container.get_mut(member) {
        *leaf = JsonValue::Null;
    }
    Ok(())
}

fn logo_compatibility_id(role: LogoRole) -> &'static str {
    match role {
        LogoRole::Developer => "logo:developer",
        LogoRole::Publisher => "logo:publisher",
    }
}

fn provenance_source<'a>(container: Option<&'a JsonValue>, member: &str) -> Option<&'a str> {
    container?.get(member)?.get("source")?.as_str()
}

fn provenance_source_id<'a>(container: Option<&'a JsonValue>, member: &str) -> Option<&'a str> {
    container?.get(member)?.get("sourceId")?.as_str()
}

fn disc_rating_compatibility<'a>(
    project: &'a JsonValue,
    container: Option<&JsonValue>,
) -> Option<&'a str> {
    if container
        .and_then(|value| value.get("source"))
        .and_then(JsonValue::as_str)
        == Some("custom")
    {
        return None;
    }
    let system = project.get("metadata")?.get("ratingSystem")?.as_str()?;
    let value = project.get("metadata")?.get("ratingValue")?.as_str()?;
    match (system, value) {
        ("ESRB", "E") => Some("rating:ESRB:E"),
        ("ESRB", "E10+") => Some("rating:ESRB:E10+"),
        ("ESRB", "T") => Some("rating:ESRB:T"),
        ("ESRB", "M") => Some("rating:ESRB:M"),
        ("ESRB", "AO") => Some("rating:ESRB:AO"),
        ("ESRB", "RP") => Some("rating:ESRB:RP"),
        ("ESRB", "RP17+") => Some("rating:ESRB:RP17+"),
        ("PEGI", "3") => Some("rating:PEGI:3"),
        ("PEGI", "7") => Some("rating:PEGI:7"),
        ("PEGI", "12") => Some("rating:PEGI:12"),
        ("PEGI", "16") => Some("rating:PEGI:16"),
        ("PEGI", "18") => Some("rating:PEGI:18"),
        ("USK", "0") => Some("rating:USK:0"),
        ("USK", "6") => Some("rating:USK:6"),
        ("USK", "12") => Some("rating:USK:12"),
        ("USK", "16") => Some("rating:USK:16"),
        ("USK", "18") => Some("rating:USK:18"),
        _ => None,
    }
}

fn disc_media_compatibility(container: Option<&JsonValue>) -> Option<&'static str> {
    if container
        .and_then(|value| value.get("source"))
        .and_then(JsonValue::as_str)
        == Some("custom")
    {
        return None;
    }
    let value = container.and_then(|value| value.get("value"))?.as_str()?;
    let theme = container
        .and_then(|value| value.get("theme"))
        .and_then(JsonValue::as_str)
        .unwrap_or("light");
    match (value, theme) {
        ("bluRay", _) => Some("media:bluRay"),
        ("dvd", "light") => Some("media:dvd:light"),
        ("dvd", "dark") => Some("media:dvd:dark"),
        ("dvdRom", "light") => Some("media:dvdRom:light"),
        ("dvdRom", "dark") => Some("media:dvdRom:dark"),
        ("cdRom", "light") => Some("media:cdRom:light"),
        ("cdRom", "dark") => Some("media:cdRom:dark"),
        ("dataDisc", "light") => Some("media:dataDisc:light"),
        ("dataDisc", "dark") => Some("media:dataDisc:dark"),
        ("installDisc", "light") => Some("media:installDisc:light"),
        ("installDisc", "dark") => Some("media:installDisc:dark"),
        _ => None,
    }
}

fn disc_platform_compatibility(
    project: &JsonValue,
    container: Option<&JsonValue>,
    platform: PlatformKind,
) -> Option<&'static str> {
    if container
        .and_then(|value| value.get("source"))
        .and_then(JsonValue::as_str)
        == Some("custom")
    {
        return None;
    }
    if container.is_none() && !selected_owner_value(project, "platformMarks", platform.as_str()) {
        return None;
    }
    let theme = container
        .and_then(|value| value.get("theme"))
        .and_then(JsonValue::as_str);
    match (platform, theme) {
        (PlatformKind::Pc, None | Some("pcPlatform")) => Some("platform:pc:pcPlatform"),
        (PlatformKind::Pc, Some("pcSimplified")) => Some("platform:pc:pcSimplified"),
        (PlatformKind::Pc, Some("pcSimplifiedDark")) => Some("platform:pc:pcSimplifiedDark"),
        (PlatformKind::Windows, None | Some("windows11")) => Some("platform:windows:windows11"),
        (PlatformKind::Windows, Some("retro")) => Some("platform:windows:retro"),
        (PlatformKind::Windows, Some("xp")) => Some("platform:windows:xp"),
        (PlatformKind::Windows, Some("vista")) => Some("platform:windows:vista"),
        (PlatformKind::Windows, Some("windows7")) => Some("platform:windows:windows7"),
        (PlatformKind::Windows, Some("windows10")) => Some("platform:windows:windows10"),
        (PlatformKind::Linux, None | Some("color")) => Some("platform:linux:color"),
        (PlatformKind::Linux, Some("light")) => Some("platform:linux:light"),
        (PlatformKind::Linux, Some("dark")) => Some("platform:linux:dark"),
        (PlatformKind::SteamDeck, None | Some("color")) => Some("platform:steamDeck:color"),
        (PlatformKind::SteamDeck, Some("light")) => Some("platform:steamDeck:light"),
        (PlatformKind::SteamDeck, Some("dark")) => Some("platform:steamDeck:dark"),
        (PlatformKind::Macos, None | Some("macos1988")) => Some("platform:macos:macos1988"),
        (PlatformKind::Macos, Some("macos1995")) => Some("platform:macos:macos1995"),
        (PlatformKind::Macos, Some("macos2001")) => Some("platform:macos:macos2001"),
        (PlatformKind::Macos, Some("macos2003")) => Some("platform:macos:macos2003"),
        (PlatformKind::Macos, Some("macos2012")) => Some("platform:macos:macos2012"),
        (PlatformKind::Macos, Some("macos2016")) => Some("platform:macos:macos2016"),
        (PlatformKind::Macos, Some("macos2017")) => Some("platform:macos:macos2017"),
        _ => None,
    }
}

fn technical_compatibility(
    container: Option<&JsonValue>,
    technical: TechnicalKind,
) -> Option<&'static str> {
    if container
        .and_then(|value| value.get("source"))
        .and_then(JsonValue::as_str)
        == Some("custom")
    {
        return None;
    }
    Some(match technical {
        TechnicalKind::Audio => "technical:audio",
        TechnicalKind::Surround => "technical:surround",
        TechnicalKind::Codec => "technical:codec",
        TechnicalKind::Middleware => "technical:middleware",
        TechnicalKind::Technology => "technical:technology",
    })
}

fn owner_container(project: &JsonValue, owner: AssetOwner) -> Option<&JsonValue> {
    match owner {
        AssetOwner::DiscBackground => project.get("background"),
        AssetOwner::DiscSteamBanner => project.get("steamBackupLogo"),
        AssetOwner::DiscPrimaryLogo { .. } => project.get("logoAssets"),
        AssetOwner::DiscAdditionalLogo { role, index } => project
            .get("logoAssets")?
            .get(role.additional_field())?
            .get_index(index),
        AssetOwner::DiscTitleCurrent => project.get("titleArtwork"),
        AssetOwner::DiscTitleDefault => project.get("titleArtwork")?.get("defaultSteamLogo"),
        AssetOwner::DiscAdditionalArtwork { index } => project
            .get("additionalArtwork")?
            .get("elements")?
            .get_index(index),
        AssetOwner::DiscRatingCustom => project.get("ratingBadge"),
        AssetOwner::DiscMediaCustom => project.get("mediaMark"),
        AssetOwner::DiscPlatformCustom { platform } => project
            .get("platformMarks")?
            .get("assets")?
            .get(platform.as_str()),
        AssetOwner::DiscTechnicalPrimary { technical } => project
            .get("technicalMarks")?
            .get("assets")?
            .get(technical.as_str()),
        AssetOwner::DiscTechnicalAdditional { technical, index } => project
            .get("technicalMarks")?
            .get("additionalAssets")?
            .get(technical.as_str())?
            .get_index(index),
        AssetOwner::CaseBanner { surface } => {
            case_surface_container(project, surface)?.get("steamBanner")
        }
        AssetOwner::CaseBackground { surface } => {
            case_surface_container(project, surface)?.get("background")
        }
        AssetOwner::CaseTitleCurrent { surface } => {
            case_surface_container(project, surface)?.get("titleArtwork")
        }
        AssetOwner::CaseTitleDefault { surface } => case_surface_container(project, surface)?
            .get("titleArtwork")?
            .get("defaultSteamLogo"),
        AssetOwner::CaseArtwork { surface, index } => case_surface_container(project, surface)?
            .get("artworkSlots")?
            .get_index(index),
        AssetOwner::CaseLogo { surface, index } => case_surface_container(project, surface)?
            .get("logoSlots")?
            .get_index(index),
        AssetOwner::CaseMark { surface, index } => case_surface_container(project, surface)?
            .get("markSlots")?
            .get_index(index),
    }
}

fn owner_container_mut(project: &mut JsonValue, owner: AssetOwner) -> Option<&mut JsonValue> {
    match owner {
        AssetOwner::DiscBackground => project.get_mut("background"),
        AssetOwner::DiscSteamBanner => project.get_mut("steamBackupLogo"),
        AssetOwner::DiscPrimaryLogo { .. } => project.get_mut("logoAssets"),
        AssetOwner::DiscAdditionalLogo { role, index } => project
            .get_mut("logoAssets")?
            .get_mut(role.additional_field())?
            .get_index_mut(index),
        AssetOwner::DiscTitleCurrent => project.get_mut("titleArtwork"),
        AssetOwner::DiscTitleDefault => {
            project.get_mut("titleArtwork")?.get_mut("defaultSteamLogo")
        }
        AssetOwner::DiscAdditionalArtwork { index } => project
            .get_mut("additionalArtwork")?
            .get_mut("elements")?
            .get_index_mut(index),
        AssetOwner::DiscRatingCustom => project.get_mut("ratingBadge"),
        AssetOwner::DiscMediaCustom => project.get_mut("mediaMark"),
        AssetOwner::DiscPlatformCustom { platform } => project
            .get_mut("platformMarks")?
            .get_mut("assets")?
            .get_mut(platform.as_str()),
        AssetOwner::DiscTechnicalPrimary { technical } => project
            .get_mut("technicalMarks")?
            .get_mut("assets")?
            .get_mut(technical.as_str()),
        AssetOwner::DiscTechnicalAdditional { technical, index } => project
            .get_mut("technicalMarks")?
            .get_mut("additionalAssets")?
            .get_mut(technical.as_str())?
            .get_index_mut(index),
        AssetOwner::CaseBanner { surface } => {
            case_surface_container_mut(project, surface)?.get_mut("steamBanner")
        }
        AssetOwner::CaseBackground { surface } => {
            case_surface_container_mut(project, surface)?.get_mut("background")
        }
        AssetOwner::CaseTitleCurrent { surface } => {
            case_surface_container_mut(project, surface)?.get_mut("titleArtwork")
        }
        AssetOwner::CaseTitleDefault { surface } => case_surface_container_mut(project, surface)?
            .get_mut("titleArtwork")?
            .get_mut("defaultSteamLogo"),
        AssetOwner::CaseArtwork { surface, index } => case_surface_container_mut(project, surface)?
            .get_mut("artworkSlots")?
            .get_index_mut(index),
        AssetOwner::CaseLogo { surface, index } => case_surface_container_mut(project, surface)?
            .get_mut("logoSlots")?
            .get_index_mut(index),
        AssetOwner::CaseMark { surface, index } => case_surface_container_mut(project, surface)?
            .get_mut("markSlots")?
            .get_index_mut(index),
    }
}

fn case_surface_container(project: &JsonValue, surface: CaseSurface) -> Option<&JsonValue> {
    let case_insert = project.get("caseInsert")?;
    match surface {
        CaseSurface::Cover => case_insert.get("templates")?.get("cover"),
        CaseSurface::Tray => case_insert.get("templates")?.get("tray"),
        CaseSurface::SpineLeft => case_insert.get("spine")?.get("left"),
        CaseSurface::SpineRight => case_insert.get("spine")?.get("right"),
    }
}

fn case_surface_container_mut(
    project: &mut JsonValue,
    surface: CaseSurface,
) -> Option<&mut JsonValue> {
    let case_insert = project.get_mut("caseInsert")?;
    match surface {
        CaseSurface::Cover => case_insert.get_mut("templates")?.get_mut("cover"),
        CaseSurface::Tray => case_insert.get_mut("templates")?.get_mut("tray"),
        CaseSurface::SpineLeft => case_insert.get_mut("spine")?.get_mut("left"),
        CaseSurface::SpineRight => case_insert.get_mut("spine")?.get_mut("right"),
    }
}

fn owner_leaf(container: Option<&JsonValue>, owner: AssetOwner) -> Option<&JsonValue> {
    let container = container?;
    container.get(owner_leaf_member(owner))
}

fn owner_leaf_member(owner: AssetOwner) -> &'static str {
    match owner {
        AssetOwner::DiscSteamBanner | AssetOwner::CaseBanner { .. } => "lockupImageDataUrl",
        AssetOwner::DiscPrimaryLogo { role } => role.primary_field(),
        AssetOwner::DiscRatingCustom
        | AssetOwner::DiscMediaCustom
        | AssetOwner::DiscPlatformCustom { .. }
        | AssetOwner::DiscTechnicalPrimary { .. }
        | AssetOwner::DiscTechnicalAdditional { .. } => "customImageDataUrl",
        _ => "imageDataUrl",
    }
}

fn classify_provenance_owner(
    container: Option<&JsonValue>,
    source_member: &str,
    size_member: &str,
    implicit_built_in: bool,
) -> UnboundOwnerDisposition {
    let Some(container) = container else {
        return if implicit_built_in {
            UnboundOwnerDisposition::BuiltInWithoutCompatibility
        } else {
            UnboundOwnerDisposition::NoAcceptedAsset
        };
    };
    let source_value = container.get(source_member);
    let source = source_value
        .and_then(|value| value.get("source"))
        .and_then(JsonValue::as_str);

    if matches!(source, Some("built-in" | "placeholder")) {
        return UnboundOwnerDisposition::BuiltInWithoutCompatibility;
    }
    if source_value.is_some_and(|value| !value.is_null())
        || member_is_non_null(container, size_member)
    {
        return UnboundOwnerDisposition::AcceptedAssetMissingBinding;
    }
    if implicit_built_in {
        UnboundOwnerDisposition::BuiltInWithoutCompatibility
    } else {
        UnboundOwnerDisposition::NoAcceptedAsset
    }
}

fn classify_direct_source_owner(
    container: Option<&JsonValue>,
    size_member: &str,
    implicit_built_in: bool,
) -> UnboundOwnerDisposition {
    let Some(container) = container else {
        return if implicit_built_in {
            UnboundOwnerDisposition::BuiltInWithoutCompatibility
        } else {
            UnboundOwnerDisposition::NoAcceptedAsset
        };
    };

    // Current mark normalizers select a bundled placeholder for every value
    // other than exact `custom`.
    match container.get("source").and_then(JsonValue::as_str) {
        Some("custom") => {
            if member_is_non_null(container, size_member) {
                UnboundOwnerDisposition::AcceptedAssetMissingBinding
            } else {
                // Current direct-mark renderers fall back to bundled art when
                // custom is selected but no accepted custom bytes/size remain.
                UnboundOwnerDisposition::BuiltInWithoutCompatibility
            }
        }
        _ => UnboundOwnerDisposition::BuiltInWithoutCompatibility,
    }
}

fn classify_evidenced_owner(
    container: Option<&JsonValue>,
    evidence_members: &[&str],
) -> UnboundOwnerDisposition {
    let Some(container) = container else {
        return UnboundOwnerDisposition::NoAcceptedAsset;
    };
    if evidence_members
        .iter()
        .any(|member| member_is_non_null(container, member))
    {
        UnboundOwnerDisposition::AcceptedAssetMissingBinding
    } else {
        UnboundOwnerDisposition::NoAcceptedAsset
    }
}

fn classify_case_logo_owner(container: Option<&JsonValue>) -> UnboundOwnerDisposition {
    let Some(container) = container else {
        return UnboundOwnerDisposition::NoAcceptedAsset;
    };
    let source_value = container.get("imageSource");
    let source = source_value
        .and_then(|value| value.get("source"))
        .and_then(JsonValue::as_str);
    if member_is_non_null(container, "imageSize") {
        return UnboundOwnerDisposition::AcceptedAssetMissingBinding;
    }
    if case_logo_role_is_recognized(container) {
        return UnboundOwnerDisposition::BuiltInWithoutCompatibility;
    }
    if source_value.is_some_and(|value| !value.is_null())
        && !matches!(source, Some("built-in" | "placeholder"))
    {
        return UnboundOwnerDisposition::AcceptedAssetMissingBinding;
    }
    UnboundOwnerDisposition::NoAcceptedAsset
}

fn classify_logo_fallback_owner(
    container: Option<&JsonValue>,
    source_member: &str,
    size_member: &str,
    implicit_built_in: bool,
) -> UnboundOwnerDisposition {
    let Some(container) = container else {
        return if implicit_built_in {
            UnboundOwnerDisposition::BuiltInWithoutCompatibility
        } else {
            UnboundOwnerDisposition::NoAcceptedAsset
        };
    };
    let source_value = container.get(source_member);
    let source = source_value
        .and_then(|value| value.get("source"))
        .and_then(JsonValue::as_str);
    if source_value.is_some_and(|value| !value.is_null())
        && !matches!(source, Some("built-in" | "placeholder"))
        || member_is_non_null(container, size_member)
    {
        UnboundOwnerDisposition::AcceptedAssetMissingBinding
    } else {
        UnboundOwnerDisposition::BuiltInWithoutCompatibility
    }
}

fn case_logo_role_is_recognized(container: &JsonValue) -> bool {
    let source_id = container
        .get("imageSource")
        .and_then(|value| value.get("sourceId"))
        .and_then(JsonValue::as_str);
    if matches!(
        source_id,
        Some("case-logo:developer" | "case-logo:publisher")
    ) || source_id.is_some_and(|value| {
        value.starts_with("case-logo:developer:") || value.starts_with("case-logo:publisher:")
    }) {
        return true;
    }

    let Some(label) = container.get("label").and_then(JsonValue::as_str) else {
        return false;
    };
    let normalized = label.trim();
    normalized.eq_ignore_ascii_case("developer logo")
        || normalized.eq_ignore_ascii_case("publisher logo")
        || ascii_starts_with_ignore_case(normalized, "additional developer")
        || ascii_starts_with_ignore_case(normalized, "additional publisher")
}

fn ascii_starts_with_ignore_case(value: &str, prefix: &str) -> bool {
    value
        .get(..prefix.len())
        .is_some_and(|candidate| candidate.eq_ignore_ascii_case(prefix))
}

fn member_is_non_null(container: &JsonValue, member: &str) -> bool {
    container.get(member).is_some_and(|value| !value.is_null())
}

fn selected_owner_value(project: &JsonValue, group: &str, expected: &str) -> bool {
    project
        .get(group)
        .and_then(|value| value.get("values"))
        .and_then(JsonValue::as_array)
        .is_some_and(|values| values.iter().any(|value| value.as_str() == Some(expected)))
}

fn legacy_platform_owner_selected(project: &JsonValue, platform: PlatformKind) -> bool {
    if project
        .get("platformMarks")
        .is_some_and(|value| !value.is_null())
    {
        return false;
    }
    let legacy_value = project
        .get("mediaMark")
        .and_then(|value| value.get("value"))
        .and_then(JsonValue::as_str);
    match legacy_value {
        Some("steamBackup") => platform == PlatformKind::Pc,
        Some(value) => PlatformKind::parse(value) == Some(platform),
        None => false,
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct DiscRegistryShape {
    pub(crate) additional_developer_logos: usize,
    pub(crate) additional_publisher_logos: usize,
    pub(crate) additional_artwork: usize,
    pub(crate) additional_technical_assets: [usize; 5],
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct CaseSurfaceRegistryShape {
    pub(crate) artwork_slots: usize,
    pub(crate) logo_slots: usize,
    pub(crate) mark_slots: usize,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct CaseRegistryShape {
    pub(crate) cover: CaseSurfaceRegistryShape,
    pub(crate) tray: CaseSurfaceRegistryShape,
    pub(crate) spine_left: CaseSurfaceRegistryShape,
    pub(crate) spine_right: CaseSurfaceRegistryShape,
}

impl CaseRegistryShape {
    const fn get(self, surface: CaseSurface) -> CaseSurfaceRegistryShape {
        match surface {
            CaseSurface::Cover => self.cover,
            CaseSurface::Tray => self.tray,
            CaseSurface::SpineLeft => self.spine_left,
            CaseSurface::SpineRight => self.spine_right,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum RegistryShape {
    Disc(DiscRegistryShape),
    CaseInsert(CaseRegistryShape),
}

impl RegistryShape {
    pub(crate) const fn project_kind(self) -> ProjectKind {
        match self {
            Self::Disc(_) => ProjectKind::Disc,
            Self::CaseInsert(_) => ProjectKind::CaseInsert,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum RegistryError {
    UnsupportedSchemaVersion,
    PointerEmpty,
    PointerTooLong,
    PointerMustStartWithSlash,
    PointerContainsEmptySegment,
    InvalidPointerEscape,
    ForbiddenPointerSegment,
    InvalidArrayIndex,
    InvalidPlatform,
    InvalidTechnicalKind,
    InvalidCaseSurface,
    PointerOutsideRegistry,
    ProjectKindMismatch,
    #[cfg(test)]
    OwnerPointerMismatch,
    CapacityOverflow,
}

impl fmt::Display for RegistryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::UnsupportedSchemaVersion => "unsupported project schema version",
            Self::PointerEmpty => "binding pointer is empty",
            Self::PointerTooLong => "binding pointer exceeds its byte limit",
            Self::PointerMustStartWithSlash => "binding pointer must start with '/'",
            Self::PointerContainsEmptySegment => "binding pointer contains an empty segment",
            Self::InvalidPointerEscape => "binding pointer contains an invalid RFC 6901 escape",
            Self::ForbiddenPointerSegment => "binding pointer contains a forbidden segment",
            Self::InvalidArrayIndex => "binding pointer contains a noncanonical array index",
            Self::InvalidPlatform => "binding pointer contains an unsupported platform key",
            Self::InvalidTechnicalKind => {
                "binding pointer contains an unsupported technical-mark key"
            }
            Self::InvalidCaseSurface => "binding pointer contains an unsupported Case surface",
            Self::PointerOutsideRegistry => "binding pointer is outside the closed asset registry",
            Self::ProjectKindMismatch => "binding pointer belongs to a different project kind",
            #[cfg(test)]
            Self::OwnerPointerMismatch => "binding pointer does not identify the declared owner",
            Self::CapacityOverflow => "asset registry expansion exceeds addressable capacity",
        };

        formatter.write_str(message)
    }
}

impl std::error::Error for RegistryError {}

/// Expand every declared owner location in stable owner/array/map order.
///
/// Fixed and nullable owner leaves are always present in the returned typed
/// registry.  The caller must still classify their concrete JSON state as
/// absent, null, built-in, or project-owned.  Arrays are expanded strictly from
/// their already-bounded lengths; no IDs or other record values affect order.
pub(crate) fn expand_registered_owners(
    schema_version: &str,
    shape: RegistryShape,
) -> Result<Vec<AssetOwner>, RegistryError> {
    ProjectSchemaVersion::parse(schema_version)?;

    match shape {
        RegistryShape::Disc(shape) => expand_disc_owners(shape),
        RegistryShape::CaseInsert(shape) => expand_case_owners(shape),
    }
}

fn expand_disc_owners(shape: DiscRegistryShape) -> Result<Vec<AssetOwner>, RegistryError> {
    let additional_technical = checked_sum(shape.additional_technical_assets)?;
    let variable = shape
        .additional_developer_logos
        .checked_add(shape.additional_publisher_logos)
        .and_then(|value| value.checked_add(shape.additional_artwork))
        .and_then(|value| value.checked_add(additional_technical))
        .ok_or(RegistryError::CapacityOverflow)?;
    let capacity = 18usize
        .checked_add(variable)
        .ok_or(RegistryError::CapacityOverflow)?;
    let mut owners = Vec::new();
    owners
        .try_reserve_exact(capacity)
        .map_err(|_| RegistryError::CapacityOverflow)?;

    owners.push(AssetOwner::DiscBackground);
    owners.push(AssetOwner::DiscSteamBanner);
    owners.push(AssetOwner::DiscPrimaryLogo {
        role: LogoRole::Developer,
    });
    owners.push(AssetOwner::DiscPrimaryLogo {
        role: LogoRole::Publisher,
    });
    extend_indices(&mut owners, shape.additional_developer_logos, |index| {
        AssetOwner::DiscAdditionalLogo {
            role: LogoRole::Developer,
            index,
        }
    });
    extend_indices(&mut owners, shape.additional_publisher_logos, |index| {
        AssetOwner::DiscAdditionalLogo {
            role: LogoRole::Publisher,
            index,
        }
    });
    owners.push(AssetOwner::DiscTitleCurrent);
    owners.push(AssetOwner::DiscTitleDefault);
    extend_indices(&mut owners, shape.additional_artwork, |index| {
        AssetOwner::DiscAdditionalArtwork { index }
    });
    owners.push(AssetOwner::DiscRatingCustom);
    owners.push(AssetOwner::DiscMediaCustom);

    for platform in PlatformKind::ALL {
        owners.push(AssetOwner::DiscPlatformCustom { platform });
    }
    for technical in TechnicalKind::ALL {
        owners.push(AssetOwner::DiscTechnicalPrimary { technical });
    }
    for technical in TechnicalKind::ALL {
        extend_indices(
            &mut owners,
            shape.additional_technical_assets[technical.ordinal()],
            |index| AssetOwner::DiscTechnicalAdditional { technical, index },
        );
    }

    debug_assert_eq!(owners.len(), capacity);
    Ok(owners)
}

fn expand_case_owners(shape: CaseRegistryShape) -> Result<Vec<AssetOwner>, RegistryError> {
    let mut variable = 0usize;
    for surface in CaseSurface::ALL {
        let surface_shape = shape.get(surface);
        variable = variable
            .checked_add(surface_shape.artwork_slots)
            .and_then(|value| value.checked_add(surface_shape.logo_slots))
            .and_then(|value| value.checked_add(surface_shape.mark_slots))
            .ok_or(RegistryError::CapacityOverflow)?;
    }
    let capacity = 16usize
        .checked_add(variable)
        .ok_or(RegistryError::CapacityOverflow)?;
    let mut owners = Vec::new();
    owners
        .try_reserve_exact(capacity)
        .map_err(|_| RegistryError::CapacityOverflow)?;

    for surface in CaseSurface::ALL {
        let surface_shape = shape.get(surface);
        owners.push(AssetOwner::CaseBanner { surface });
        owners.push(AssetOwner::CaseBackground { surface });
        owners.push(AssetOwner::CaseTitleCurrent { surface });
        owners.push(AssetOwner::CaseTitleDefault { surface });
        extend_indices(&mut owners, surface_shape.artwork_slots, |index| {
            AssetOwner::CaseArtwork { surface, index }
        });
        extend_indices(&mut owners, surface_shape.logo_slots, |index| {
            AssetOwner::CaseLogo { surface, index }
        });
        extend_indices(&mut owners, surface_shape.mark_slots, |index| {
            AssetOwner::CaseMark { surface, index }
        });
    }

    debug_assert_eq!(owners.len(), capacity);
    Ok(owners)
}

fn checked_sum(values: [usize; 5]) -> Result<usize, RegistryError> {
    values.into_iter().try_fold(0usize, |sum, value| {
        sum.checked_add(value)
            .ok_or(RegistryError::CapacityOverflow)
    })
}

fn extend_indices(
    owners: &mut Vec<AssetOwner>,
    count: usize,
    create: impl Fn(usize) -> AssetOwner,
) {
    for index in 0..count {
        owners.push(create(index));
    }
}

/// Resolve an incoming canonical pointer to its one typed owner.
pub(crate) fn resolve_registered_owner(
    schema_version: &str,
    project_kind: ProjectKind,
    pointer: &str,
) -> Result<AssetOwner, RegistryError> {
    ProjectSchemaVersion::parse(schema_version)?;
    let segments = parse_pointer_segments(pointer)?;
    let owner = parse_owner_segments(&segments)?.ok_or(RegistryError::PointerOutsideRegistry)?;

    if owner.project_kind() != project_kind {
        return Err(RegistryError::ProjectKindMismatch);
    }

    // This also guards against accidentally accepting a second spelling for a
    // pointer if parsing rules are changed later.
    if owner.try_pointer()? != pointer {
        return Err(RegistryError::PointerOutsideRegistry);
    }

    Ok(owner)
}

#[cfg(test)]
pub(crate) fn validate_owner_pointer(
    schema_version: &str,
    project_kind: ProjectKind,
    owner: AssetOwner,
    pointer: &str,
) -> Result<(), RegistryError> {
    if owner.project_kind() != project_kind {
        return Err(RegistryError::ProjectKindMismatch);
    }

    let resolved = resolve_registered_owner(schema_version, project_kind, pointer)?;
    if resolved != owner {
        return Err(RegistryError::OwnerPointerMismatch);
    }

    Ok(())
}

#[cfg(test)]
pub(crate) fn is_registered_pointer(
    schema_version: &str,
    project_kind: ProjectKind,
    pointer: &str,
) -> bool {
    resolve_registered_owner(schema_version, project_kind, pointer).is_ok()
}

fn parse_owner_segments(segments: &[&str]) -> Result<Option<AssetOwner>, RegistryError> {
    if segments.first().copied() == Some("caseInsert") {
        return parse_case_owner_segments(segments);
    }

    parse_disc_owner_segments(segments)
}

fn parse_disc_owner_segments(segments: &[&str]) -> Result<Option<AssetOwner>, RegistryError> {
    let owner = match segments {
        ["background", "imageDataUrl"] => Some(AssetOwner::DiscBackground),
        ["steamBackupLogo", "lockupImageDataUrl"] => Some(AssetOwner::DiscSteamBanner),
        ["logoAssets", "developerLogoDataUrl"] => Some(AssetOwner::DiscPrimaryLogo {
            role: LogoRole::Developer,
        }),
        ["logoAssets", "publisherLogoDataUrl"] => Some(AssetOwner::DiscPrimaryLogo {
            role: LogoRole::Publisher,
        }),
        ["logoAssets", "additionalDeveloperLogos", index, "imageDataUrl"] => {
            Some(AssetOwner::DiscAdditionalLogo {
                role: LogoRole::Developer,
                index: parse_array_index(index)?,
            })
        }
        ["logoAssets", "additionalPublisherLogos", index, "imageDataUrl"] => {
            Some(AssetOwner::DiscAdditionalLogo {
                role: LogoRole::Publisher,
                index: parse_array_index(index)?,
            })
        }
        ["titleArtwork", "imageDataUrl"] => Some(AssetOwner::DiscTitleCurrent),
        ["titleArtwork", "defaultSteamLogo", "imageDataUrl"] => Some(AssetOwner::DiscTitleDefault),
        ["additionalArtwork", "elements", index, "imageDataUrl"] => {
            Some(AssetOwner::DiscAdditionalArtwork {
                index: parse_array_index(index)?,
            })
        }
        ["ratingBadge", "customImageDataUrl"] => Some(AssetOwner::DiscRatingCustom),
        ["mediaMark", "customImageDataUrl"] => Some(AssetOwner::DiscMediaCustom),
        ["platformMarks", "assets", platform, "customImageDataUrl"] => {
            Some(AssetOwner::DiscPlatformCustom {
                platform: PlatformKind::parse(platform).ok_or(RegistryError::InvalidPlatform)?,
            })
        }
        ["technicalMarks", "assets", technical, "customImageDataUrl"] => {
            Some(AssetOwner::DiscTechnicalPrimary {
                technical: TechnicalKind::parse(technical)
                    .ok_or(RegistryError::InvalidTechnicalKind)?,
            })
        }
        ["technicalMarks", "additionalAssets", technical, index, "customImageDataUrl"] => {
            Some(AssetOwner::DiscTechnicalAdditional {
                technical: TechnicalKind::parse(technical)
                    .ok_or(RegistryError::InvalidTechnicalKind)?,
                index: parse_array_index(index)?,
            })
        }
        _ => None,
    };

    Ok(owner)
}

fn parse_case_owner_segments(segments: &[&str]) -> Result<Option<AssetOwner>, RegistryError> {
    let (surface, tail) = parse_case_surface(segments)?;
    let owner = match tail {
        ["steamBanner", "lockupImageDataUrl"] => Some(AssetOwner::CaseBanner { surface }),
        ["background", "imageDataUrl"] => Some(AssetOwner::CaseBackground { surface }),
        ["titleArtwork", "imageDataUrl"] => Some(AssetOwner::CaseTitleCurrent { surface }),
        ["titleArtwork", "defaultSteamLogo", "imageDataUrl"] => {
            Some(AssetOwner::CaseTitleDefault { surface })
        }
        ["artworkSlots", index, "imageDataUrl"] => Some(AssetOwner::CaseArtwork {
            surface,
            index: parse_array_index(index)?,
        }),
        ["logoSlots", index, "imageDataUrl"] => Some(AssetOwner::CaseLogo {
            surface,
            index: parse_array_index(index)?,
        }),
        ["markSlots", index, "imageDataUrl"] => Some(AssetOwner::CaseMark {
            surface,
            index: parse_array_index(index)?,
        }),
        _ => None,
    };

    Ok(owner)
}

fn parse_case_surface<'a>(
    segments: &'a [&'a str],
) -> Result<(CaseSurface, &'a [&'a str]), RegistryError> {
    let first = segments.get(1).copied();
    let second = segments.get(2).copied();
    let surface = match (first, second) {
        (Some("templates"), Some("cover")) => CaseSurface::Cover,
        (Some("templates"), Some("tray")) => CaseSurface::Tray,
        (Some("templates"), Some(_)) | (Some("templates"), None) => {
            return Err(RegistryError::InvalidCaseSurface)
        }
        (Some("spine"), Some("left")) => CaseSurface::SpineLeft,
        (Some("spine"), Some("right")) => CaseSurface::SpineRight,
        (Some("spine"), Some(_)) | (Some("spine"), None) => {
            return Err(RegistryError::InvalidCaseSurface)
        }
        _ => return Ok((CaseSurface::Cover, &[])),
    };

    Ok((surface, &segments[3..]))
}

fn parse_array_index(value: &str) -> Result<usize, RegistryError> {
    if value == "0" {
        return Ok(0);
    }

    if value.is_empty()
        || value.starts_with('0')
        || !value.as_bytes().iter().all(u8::is_ascii_digit)
    {
        return Err(RegistryError::InvalidArrayIndex);
    }

    value
        .parse::<usize>()
        .map_err(|_| RegistryError::InvalidArrayIndex)
}

fn parse_pointer_segments(pointer: &str) -> Result<Vec<&str>, RegistryError> {
    if pointer.is_empty() {
        return Err(RegistryError::PointerEmpty);
    }
    if pointer.len() > MAX_BINDING_POINTER_BYTES {
        return Err(RegistryError::PointerTooLong);
    }
    if !pointer.starts_with('/') {
        return Err(RegistryError::PointerMustStartWithSlash);
    }

    let count = pointer[1..].split('/').count();
    let mut segments = Vec::new();
    segments
        .try_reserve_exact(count)
        .map_err(|_| RegistryError::CapacityOverflow)?;
    for raw_segment in pointer[1..].split('/') {
        if raw_segment.is_empty() {
            return Err(RegistryError::PointerContainsEmptySegment);
        }
        validate_pointer_segment(raw_segment)?;
        if matches!(raw_segment, "__proto__" | "prototype" | "constructor") {
            return Err(RegistryError::ForbiddenPointerSegment);
        }
        segments.push(raw_segment);
    }
    Ok(segments)
}

fn validate_pointer_segment(value: &str) -> Result<(), RegistryError> {
    let bytes = value.as_bytes();
    let mut index = 0usize;
    while index < bytes.len() {
        if bytes[index] == b'~' {
            let escape = bytes
                .get(index + 1)
                .copied()
                .ok_or(RegistryError::InvalidPointerEscape)?;
            if escape != b'0' && escape != b'1' {
                return Err(RegistryError::InvalidPointerEscape);
            }
            index += 2;
        } else {
            index += 1;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{json::parse_json_with_limits, limits::PackageLimits};

    const SCHEMAS: [&str; 2] = ["0.1.0", "0.2.0"];

    fn resolve(kind: ProjectKind, pointer: &str) -> Result<AssetOwner, RegistryError> {
        resolve_registered_owner("0.2.0", kind, pointer)
    }

    fn parse_project(json: &str) -> JsonValue {
        parse_json_with_limits(json.as_bytes(), &PackageLimits::V1).unwrap()
    }

    #[test]
    fn disc_logo_fallback_classification_matches_role_rendering() {
        use UnboundOwnerDisposition::{
            AcceptedAssetMissingBinding as Missing, BuiltInWithoutCompatibility as BuiltIn,
            NoAcceptedAsset as Absent,
        };

        let absent_container = parse_project(r#"{}"#);
        for role in LogoRole::ALL {
            let owner = AssetOwner::DiscPrimaryLogo { role };
            assert_eq!(classify_unbound_owner(&absent_container, owner), BuiltIn);
        }

        let logos = parse_project(
            r#"{"logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":{"source":"uploaded"},"additionalPublisherLogos":[{"imageDataUrl":null,"imageSource":{"source":"embedded"},"imageSize":{"width":8,"height":4}}]}}"#,
        );
        assert_eq!(
            classify_unbound_owner(
                &logos,
                AssetOwner::DiscPrimaryLogo {
                    role: LogoRole::Developer,
                },
            ),
            Missing
        );
        assert_eq!(
            classify_unbound_owner(
                &logos,
                AssetOwner::DiscAdditionalLogo {
                    role: LogoRole::Publisher,
                    index: 0,
                },
            ),
            Missing
        );
        assert_eq!(
            classify_unbound_owner(
                &logos,
                AssetOwner::DiscAdditionalLogo {
                    role: LogoRole::Publisher,
                    index: 1,
                },
            ),
            Absent
        );

        let project_owned = parse_project(
            r#"{"logoAssets":{"developerLogoDataUrl":"data:image/png;base64,AA=="}}"#,
        );
        assert_eq!(
            classify_unbound_owner(
                &project_owned,
                AssetOwner::DiscPrimaryLogo {
                    role: LogoRole::Developer,
                },
            ),
            Missing
        );
    }

    #[test]
    fn case_logo_fallback_uses_exact_current_role_selectors() {
        use UnboundOwnerDisposition::{
            AcceptedAssetMissingBinding as Missing, BuiltInWithoutCompatibility as BuiltIn,
            NoAcceptedAsset as Absent,
        };

        let project = parse_project(
            r#"{"caseInsert":{"templates":{"cover":{"logoSlots":[
                {"label":"Unrelated slot","imageDataUrl":null,"imageSource":{"source":"placeholder"}},
                {"label":"ignored","imageDataUrl":null,"imageSource":{"source":"embedded","sourceId":"case-logo:developer"}},
                {"label":" Publisher Logo ","imageDataUrl":null,"imageSource":null},
                {"label":"ignored","imageDataUrl":null,"imageSource":{"source":"embedded","sourceId":"case-logo:publisher:additional:slot-4"}},
                {"label":" ADDITIONAL DEVELOPER 9 ","imageDataUrl":null,"imageSource":{"source":"embedded"}},
                {"label":"Unrelated custom slot","imageDataUrl":null,"imageSource":{"source":"uploaded"},"imageSize":{"width":10,"height":10}}
            ]}}}}"#,
        );

        assert_eq!(
            classify_unbound_owner(
                &project,
                AssetOwner::CaseLogo {
                    surface: CaseSurface::Cover,
                    index: 0,
                },
            ),
            Absent
        );
        for index in 1..=4 {
            let owner = AssetOwner::CaseLogo {
                surface: CaseSurface::Cover,
                index,
            };
            assert_eq!(classify_unbound_owner(&project, owner), BuiltIn, "{index}");
        }
        assert_eq!(
            classify_unbound_owner(
                &project,
                AssetOwner::CaseLogo {
                    surface: CaseSurface::Cover,
                    index: 5,
                },
            ),
            Missing
        );
        assert_eq!(
            classify_unbound_owner(
                &project,
                AssetOwner::CaseLogo {
                    surface: CaseSurface::Cover,
                    index: 6,
                },
            ),
            Absent
        );
    }

    #[test]
    fn explicit_application_owned_sources_share_one_classifier() {
        use UnboundOwnerDisposition::BuiltInWithoutCompatibility as BuiltIn;

        let project = parse_project(
            r#"{"background":{"imageDataUrl":null,"imageSource":{"source":"built-in"}},"caseInsert":{"spine":{"right":{"markSlots":[{"imageDataUrl":null,"imageSource":{"source":"placeholder"}}]}}}}"#,
        );
        assert_eq!(
            classify_unbound_owner(&project, AssetOwner::DiscBackground),
            BuiltIn
        );
        assert_eq!(
            classify_unbound_owner(
                &project,
                AssetOwner::CaseMark {
                    surface: CaseSurface::SpineRight,
                    index: 0,
                },
            ),
            BuiltIn
        );
    }

    #[test]
    fn implicit_banners_and_selected_missing_mark_records_are_built_ins() {
        use UnboundOwnerDisposition::{
            BuiltInWithoutCompatibility as BuiltIn, NoAcceptedAsset as Absent,
        };

        let empty = parse_project(r#"{}"#);
        assert_eq!(
            classify_unbound_owner(&empty, AssetOwner::DiscSteamBanner),
            BuiltIn
        );
        for surface in CaseSurface::ALL {
            assert_eq!(
                classify_unbound_owner(&empty, AssetOwner::CaseBanner { surface }),
                BuiltIn,
                "{surface:?}"
            );
        }

        let selected = parse_project(
            r#"{"platformMarks":{"values":["windows"],"assets":{}},"technicalMarks":{"values":["audio"],"assets":{}}}"#,
        );
        assert_eq!(
            classify_unbound_owner(
                &selected,
                AssetOwner::DiscPlatformCustom {
                    platform: PlatformKind::Windows,
                },
            ),
            BuiltIn
        );
        assert_eq!(
            classify_unbound_owner(
                &selected,
                AssetOwner::DiscTechnicalPrimary {
                    technical: TechnicalKind::Audio,
                },
            ),
            BuiltIn
        );
        assert_eq!(
            classify_unbound_owner(
                &selected,
                AssetOwner::DiscPlatformCustom {
                    platform: PlatformKind::Linux,
                },
            ),
            Absent
        );
        assert_eq!(
            classify_unbound_owner(
                &selected,
                AssetOwner::DiscTechnicalPrimary {
                    technical: TechnicalKind::Codec,
                },
            ),
            Absent
        );
    }

    #[test]
    fn direct_mark_fallbacks_and_retained_custom_evidence_are_distinct() {
        use UnboundOwnerDisposition::{
            AcceptedAssetMissingBinding as Missing, NoAcceptedAsset as Absent,
        };

        let absent = parse_project(r#"{}"#);
        assert_eq!(
            classify_unbound_owner(&absent, AssetOwner::DiscRatingCustom),
            Absent
        );
        assert_eq!(
            classify_unbound_owner(&absent, AssetOwner::DiscMediaCustom),
            Absent
        );

        let fallback = parse_project(
            r#"{"ratingBadge":{"source":"custom","customImageDataUrl":null,"customImageSize":null},"mediaMark":{"source":"custom","customImageDataUrl":null,"customImageSize":null}}"#,
        );
        assert_eq!(
            classify_unbound_owner(&fallback, AssetOwner::DiscRatingCustom),
            Absent
        );
        assert_eq!(
            classify_unbound_owner(&fallback, AssetOwner::DiscMediaCustom),
            Absent
        );

        let retained = parse_project(
            r#"{"ratingBadge":{"source":"custom","customImageDataUrl":null,"customImageSize":{"width":10,"height":10}}}"#,
        );
        assert_eq!(
            classify_unbound_owner(&retained, AssetOwner::DiscRatingCustom),
            Missing
        );
    }

    #[test]
    fn legacy_media_mark_platform_selection_remains_a_built_in_owner() {
        use UnboundOwnerDisposition::{
            BuiltInWithoutCompatibility as BuiltIn, NoAcceptedAsset as Absent,
        };
        let legacy = parse_project(r#"{"mediaMark":{"value":"steamBackup"}}"#);
        assert_eq!(
            classify_unbound_owner(
                &legacy,
                AssetOwner::DiscPlatformCustom {
                    platform: PlatformKind::Pc,
                },
            ),
            BuiltIn
        );
        assert_eq!(
            classify_unbound_owner(
                &legacy,
                AssetOwner::DiscPlatformCustom {
                    platform: PlatformKind::Windows,
                },
            ),
            Absent
        );
    }

    #[test]
    fn semantic_built_ins_accept_published_ids_and_reject_unknown_selectors() {
        let usk = parse_project(
            r#"{"ratingBadge":{"uskBadge":{"ratingValue":"12","layout":{"enabled":false}}}}"#,
        );
        assert_eq!(
            first_unavailable_semantic_builtin(&usk, ProjectKind::Disc),
            None
        );

        let disc_number =
            parse_project(r#"{"discNumberArtwork":{"mode":"text","badgeSet":"starterRing"}}"#);
        assert_eq!(
            first_unavailable_semantic_builtin(&disc_number, ProjectKind::Disc),
            None
        );

        let disc_frame = parse_project(
            r#"{"additionalArtwork":{"elements":[{"frame":{"enabled":false,"style":"rocky"}}]}}"#,
        );
        assert_eq!(
            first_unavailable_semantic_builtin(&disc_frame, ProjectKind::Disc),
            None
        );

        let case_frame = parse_project(
            r#"{"caseInsert":{"templates":{"cover":{"artworkSlots":[{"frame":{"enabled":false,"style":"rocky"}}]}}}}"#,
        );
        assert_eq!(
            first_unavailable_semantic_builtin(&case_frame, ProjectKind::CaseInsert),
            None
        );

        assert_eq!(
            first_unavailable_semantic_builtin(
                &parse_project(r#"{"ratingBadge":{"uskBadge":{"ratingValue":"21"}}}"#),
                ProjectKind::Disc,
            ),
            Some(UnavailableSemanticBuiltIn::DiscSupplementalUsk)
        );
        assert_eq!(
            first_unavailable_semantic_builtin(
                &parse_project(r#"{"discNumberArtwork":{"badgeSet":"unknown"}}"#),
                ProjectKind::Disc,
            ),
            Some(UnavailableSemanticBuiltIn::DiscNumberBadge)
        );
        assert_eq!(
            first_unavailable_semantic_builtin(
                &parse_project(
                    r#"{"additionalArtwork":{"elements":[{"frame":{"style":"unknown"}}]}}"#
                ),
                ProjectKind::Disc,
            ),
            Some(UnavailableSemanticBuiltIn::DiscArtworkFrame { index: 0 })
        );

        assert_eq!(
            first_unavailable_semantic_builtin(&parse_project(r#"{}"#), ProjectKind::Disc),
            None
        );
    }

    #[test]
    fn schema_registry_support_is_exact_and_version_independent() {
        assert_eq!(ProjectSchemaVersion::ALL.len(), 2);
        assert_eq!(ProjectSchemaVersion::V0_1_0.as_str(), "0.1.0");
        assert_eq!(ProjectSchemaVersion::V0_2_0.as_str(), "0.2.0");

        for schema in SCHEMAS {
            assert_eq!(
                resolve_registered_owner(schema, ProjectKind::Disc, "/background/imageDataUrl"),
                Ok(AssetOwner::DiscBackground)
            );
        }

        for unsupported in ["", "0.0.0", "0.1", "0.3.0", "1.0.0"] {
            assert_eq!(
                resolve_registered_owner(
                    unsupported,
                    ProjectKind::Disc,
                    "/background/imageDataUrl"
                ),
                Err(RegistryError::UnsupportedSchemaVersion)
            );
        }
    }

    #[test]
    fn disc_expansion_covers_every_family_in_contract_order() {
        let owners = expand_registered_owners(
            "0.2.0",
            RegistryShape::Disc(DiscRegistryShape {
                additional_developer_logos: 2,
                additional_publisher_logos: 1,
                additional_artwork: 2,
                additional_technical_assets: [1, 2, 0, 1, 0],
            }),
        )
        .unwrap();

        let expected = vec![
            AssetOwner::DiscBackground,
            AssetOwner::DiscSteamBanner,
            AssetOwner::DiscPrimaryLogo {
                role: LogoRole::Developer,
            },
            AssetOwner::DiscPrimaryLogo {
                role: LogoRole::Publisher,
            },
            AssetOwner::DiscAdditionalLogo {
                role: LogoRole::Developer,
                index: 0,
            },
            AssetOwner::DiscAdditionalLogo {
                role: LogoRole::Developer,
                index: 1,
            },
            AssetOwner::DiscAdditionalLogo {
                role: LogoRole::Publisher,
                index: 0,
            },
            AssetOwner::DiscTitleCurrent,
            AssetOwner::DiscTitleDefault,
            AssetOwner::DiscAdditionalArtwork { index: 0 },
            AssetOwner::DiscAdditionalArtwork { index: 1 },
            AssetOwner::DiscRatingCustom,
            AssetOwner::DiscMediaCustom,
            AssetOwner::DiscPlatformCustom {
                platform: PlatformKind::Pc,
            },
            AssetOwner::DiscPlatformCustom {
                platform: PlatformKind::Windows,
            },
            AssetOwner::DiscPlatformCustom {
                platform: PlatformKind::Linux,
            },
            AssetOwner::DiscPlatformCustom {
                platform: PlatformKind::SteamDeck,
            },
            AssetOwner::DiscPlatformCustom {
                platform: PlatformKind::Macos,
            },
            AssetOwner::DiscTechnicalPrimary {
                technical: TechnicalKind::Audio,
            },
            AssetOwner::DiscTechnicalPrimary {
                technical: TechnicalKind::Surround,
            },
            AssetOwner::DiscTechnicalPrimary {
                technical: TechnicalKind::Codec,
            },
            AssetOwner::DiscTechnicalPrimary {
                technical: TechnicalKind::Middleware,
            },
            AssetOwner::DiscTechnicalPrimary {
                technical: TechnicalKind::Technology,
            },
            AssetOwner::DiscTechnicalAdditional {
                technical: TechnicalKind::Audio,
                index: 0,
            },
            AssetOwner::DiscTechnicalAdditional {
                technical: TechnicalKind::Surround,
                index: 0,
            },
            AssetOwner::DiscTechnicalAdditional {
                technical: TechnicalKind::Surround,
                index: 1,
            },
            AssetOwner::DiscTechnicalAdditional {
                technical: TechnicalKind::Middleware,
                index: 0,
            },
        ];

        assert_eq!(owners, expected);
        for owner in owners {
            let pointer = owner.pointer();
            assert_eq!(resolve(ProjectKind::Disc, &pointer), Ok(owner));
            assert!(owner.pointer_pattern().starts_with('/'));
        }
    }

    #[test]
    fn empty_disc_shape_still_expands_every_fixed_nullable_and_map_owner() {
        let owners =
            expand_registered_owners("0.1.0", RegistryShape::Disc(DiscRegistryShape::default()))
                .unwrap();

        assert_eq!(owners.len(), 18);
        assert_eq!(
            owners
                .iter()
                .filter(|owner| matches!(owner, AssetOwner::DiscPlatformCustom { .. }))
                .count(),
            5
        );
        assert_eq!(
            owners
                .iter()
                .filter(|owner| matches!(owner, AssetOwner::DiscTechnicalPrimary { .. }))
                .count(),
            5
        );
    }

    #[test]
    fn case_expansion_covers_every_surface_and_family_in_contract_order() {
        let owners = expand_registered_owners(
            "0.2.0",
            RegistryShape::CaseInsert(CaseRegistryShape {
                cover: CaseSurfaceRegistryShape {
                    artwork_slots: 2,
                    logo_slots: 1,
                    mark_slots: 0,
                },
                tray: CaseSurfaceRegistryShape {
                    artwork_slots: 0,
                    logo_slots: 1,
                    mark_slots: 2,
                },
                spine_left: CaseSurfaceRegistryShape {
                    artwork_slots: 1,
                    logo_slots: 0,
                    mark_slots: 1,
                },
                spine_right: CaseSurfaceRegistryShape {
                    artwork_slots: 0,
                    logo_slots: 0,
                    mark_slots: 0,
                },
            }),
        )
        .unwrap();

        let expected = vec![
            AssetOwner::CaseBanner {
                surface: CaseSurface::Cover,
            },
            AssetOwner::CaseBackground {
                surface: CaseSurface::Cover,
            },
            AssetOwner::CaseTitleCurrent {
                surface: CaseSurface::Cover,
            },
            AssetOwner::CaseTitleDefault {
                surface: CaseSurface::Cover,
            },
            AssetOwner::CaseArtwork {
                surface: CaseSurface::Cover,
                index: 0,
            },
            AssetOwner::CaseArtwork {
                surface: CaseSurface::Cover,
                index: 1,
            },
            AssetOwner::CaseLogo {
                surface: CaseSurface::Cover,
                index: 0,
            },
            AssetOwner::CaseBanner {
                surface: CaseSurface::Tray,
            },
            AssetOwner::CaseBackground {
                surface: CaseSurface::Tray,
            },
            AssetOwner::CaseTitleCurrent {
                surface: CaseSurface::Tray,
            },
            AssetOwner::CaseTitleDefault {
                surface: CaseSurface::Tray,
            },
            AssetOwner::CaseLogo {
                surface: CaseSurface::Tray,
                index: 0,
            },
            AssetOwner::CaseMark {
                surface: CaseSurface::Tray,
                index: 0,
            },
            AssetOwner::CaseMark {
                surface: CaseSurface::Tray,
                index: 1,
            },
            AssetOwner::CaseBanner {
                surface: CaseSurface::SpineLeft,
            },
            AssetOwner::CaseBackground {
                surface: CaseSurface::SpineLeft,
            },
            AssetOwner::CaseTitleCurrent {
                surface: CaseSurface::SpineLeft,
            },
            AssetOwner::CaseTitleDefault {
                surface: CaseSurface::SpineLeft,
            },
            AssetOwner::CaseArtwork {
                surface: CaseSurface::SpineLeft,
                index: 0,
            },
            AssetOwner::CaseMark {
                surface: CaseSurface::SpineLeft,
                index: 0,
            },
            AssetOwner::CaseBanner {
                surface: CaseSurface::SpineRight,
            },
            AssetOwner::CaseBackground {
                surface: CaseSurface::SpineRight,
            },
            AssetOwner::CaseTitleCurrent {
                surface: CaseSurface::SpineRight,
            },
            AssetOwner::CaseTitleDefault {
                surface: CaseSurface::SpineRight,
            },
        ];

        assert_eq!(owners, expected);
        for owner in owners {
            let pointer = owner.pointer();
            assert_eq!(resolve(ProjectKind::CaseInsert, &pointer), Ok(owner));
        }
    }

    #[test]
    fn every_disc_pointer_family_resolves_exactly() {
        let cases = [
            ("/background/imageDataUrl", AssetOwner::DiscBackground),
            (
                "/steamBackupLogo/lockupImageDataUrl",
                AssetOwner::DiscSteamBanner,
            ),
            (
                "/logoAssets/developerLogoDataUrl",
                AssetOwner::DiscPrimaryLogo {
                    role: LogoRole::Developer,
                },
            ),
            (
                "/logoAssets/publisherLogoDataUrl",
                AssetOwner::DiscPrimaryLogo {
                    role: LogoRole::Publisher,
                },
            ),
            (
                "/logoAssets/additionalDeveloperLogos/27/imageDataUrl",
                AssetOwner::DiscAdditionalLogo {
                    role: LogoRole::Developer,
                    index: 27,
                },
            ),
            (
                "/logoAssets/additionalPublisherLogos/0/imageDataUrl",
                AssetOwner::DiscAdditionalLogo {
                    role: LogoRole::Publisher,
                    index: 0,
                },
            ),
            ("/titleArtwork/imageDataUrl", AssetOwner::DiscTitleCurrent),
            (
                "/titleArtwork/defaultSteamLogo/imageDataUrl",
                AssetOwner::DiscTitleDefault,
            ),
            (
                "/additionalArtwork/elements/3/imageDataUrl",
                AssetOwner::DiscAdditionalArtwork { index: 3 },
            ),
            (
                "/ratingBadge/customImageDataUrl",
                AssetOwner::DiscRatingCustom,
            ),
            ("/mediaMark/customImageDataUrl", AssetOwner::DiscMediaCustom),
            (
                "/platformMarks/assets/steamDeck/customImageDataUrl",
                AssetOwner::DiscPlatformCustom {
                    platform: PlatformKind::SteamDeck,
                },
            ),
            (
                "/technicalMarks/assets/middleware/customImageDataUrl",
                AssetOwner::DiscTechnicalPrimary {
                    technical: TechnicalKind::Middleware,
                },
            ),
            (
                "/technicalMarks/additionalAssets/technology/11/customImageDataUrl",
                AssetOwner::DiscTechnicalAdditional {
                    technical: TechnicalKind::Technology,
                    index: 11,
                },
            ),
        ];

        for (pointer, owner) in cases {
            assert_eq!(resolve(ProjectKind::Disc, pointer), Ok(owner));
            assert_eq!(owner.pointer(), pointer);
        }
    }

    #[test]
    fn every_case_pointer_family_resolves_on_every_surface() {
        for surface in CaseSurface::ALL {
            let owners = [
                AssetOwner::CaseBanner { surface },
                AssetOwner::CaseBackground { surface },
                AssetOwner::CaseTitleCurrent { surface },
                AssetOwner::CaseTitleDefault { surface },
                AssetOwner::CaseArtwork { surface, index: 7 },
                AssetOwner::CaseLogo { surface, index: 8 },
                AssetOwner::CaseMark { surface, index: 9 },
            ];

            for owner in owners {
                let pointer = owner.pointer();
                assert_eq!(resolve(ProjectKind::CaseInsert, &pointer), Ok(owner));
            }
        }
    }

    #[test]
    fn map_vocabularies_and_order_are_closed() {
        assert_eq!(
            PlatformKind::ALL.map(PlatformKind::as_str),
            ["pc", "windows", "linux", "steamDeck", "macos"]
        );
        assert_eq!(
            TechnicalKind::ALL.map(TechnicalKind::as_str),
            ["audio", "surround", "codec", "middleware", "technology"]
        );

        for platform in ["android", "steamdeck", "Macos", "0", ""] {
            let pointer = format!("/platformMarks/assets/{platform}/customImageDataUrl");
            assert_eq!(
                resolve(ProjectKind::Disc, &pointer),
                Err(if platform.is_empty() {
                    RegistryError::PointerContainsEmptySegment
                } else {
                    RegistryError::InvalidPlatform
                })
            );
        }

        for technical in ["video", "Audio", "technology-2", "0", ""] {
            let pointer = format!("/technicalMarks/assets/{technical}/customImageDataUrl");
            let expected = if technical.is_empty() {
                RegistryError::PointerContainsEmptySegment
            } else {
                RegistryError::InvalidTechnicalKind
            };
            assert_eq!(resolve(ProjectKind::Disc, &pointer), Err(expected));
        }
    }

    #[test]
    fn array_indices_are_canonical_decimal_and_checked() {
        assert_eq!(parse_array_index("0"), Ok(0));
        assert_eq!(parse_array_index("1"), Ok(1));
        assert_eq!(parse_array_index("42"), Ok(42));

        for invalid in ["", "00", "01", "+1", "-1", " 1", "1 ", "1.0", "1e0", "a"] {
            assert_eq!(
                parse_array_index(invalid),
                Err(RegistryError::InvalidArrayIndex)
            );
        }

        let overflow = format!("{}0", usize::MAX);
        assert_eq!(
            parse_array_index(&overflow),
            Err(RegistryError::InvalidArrayIndex)
        );

        for invalid in ["00", "01", "+1", "-1", "1.0", "1e0"] {
            let pointer = format!("/additionalArtwork/elements/{invalid}/imageDataUrl");
            assert_eq!(
                resolve(ProjectKind::Disc, &pointer),
                Err(RegistryError::InvalidArrayIndex)
            );
        }
    }

    #[test]
    fn only_the_four_canonical_case_surfaces_are_accepted() {
        for pointer in [
            "/caseInsert/templates/front/background/imageDataUrl",
            "/caseInsert/templates/back/background/imageDataUrl",
            "/caseInsert/templates/Cover/background/imageDataUrl",
            "/caseInsert/spine/center/background/imageDataUrl",
            "/caseInsert/spine/0/background/imageDataUrl",
        ] {
            assert_eq!(
                resolve(ProjectKind::CaseInsert, pointer),
                Err(RegistryError::InvalidCaseSurface)
            );
        }

        // These are accepted by legacy normalization in application code, but
        // they are deliberately not package binding aliases.
        for legacy in [
            "/caseInsert/front/background/imageDataUrl",
            "/caseInsert/back/screenshots/0/imageDataUrl",
            "/jewelCase/front/background/imageDataUrl",
            "/caseInsert/spine/left/marks/0/imageDataUrl",
        ] {
            assert_eq!(
                resolve(ProjectKind::CaseInsert, legacy),
                Err(RegistryError::PointerOutsideRegistry)
            );
        }
    }

    #[test]
    fn project_kind_is_part_of_registry_validation() {
        assert_eq!(
            resolve_registered_owner("0.2.0", ProjectKind::CaseInsert, "/background/imageDataUrl"),
            Err(RegistryError::ProjectKindMismatch)
        );
        assert_eq!(
            resolve_registered_owner(
                "0.2.0",
                ProjectKind::Disc,
                "/caseInsert/templates/cover/background/imageDataUrl"
            ),
            Err(RegistryError::ProjectKindMismatch)
        );
    }

    #[test]
    fn owner_and_pointer_must_resolve_to_the_same_typed_location() {
        assert_eq!(
            validate_owner_pointer(
                "0.2.0",
                ProjectKind::Disc,
                AssetOwner::DiscBackground,
                "/background/imageDataUrl"
            ),
            Ok(())
        );
        assert_eq!(
            validate_owner_pointer(
                "0.2.0",
                ProjectKind::Disc,
                AssetOwner::DiscBackground,
                "/titleArtwork/imageDataUrl"
            ),
            Err(RegistryError::OwnerPointerMismatch)
        );
        assert_eq!(
            validate_owner_pointer(
                "0.2.0",
                ProjectKind::Disc,
                AssetOwner::CaseBackground {
                    surface: CaseSurface::Cover,
                },
                "/caseInsert/templates/cover/background/imageDataUrl"
            ),
            Err(RegistryError::ProjectKindMismatch)
        );
    }

    #[test]
    fn pointer_parser_enforces_canonical_rfc_6901_escaping() {
        assert_eq!(
            parse_pointer_segments("/a~0b/c~1d/~01"),
            Ok(vec!["a~0b", "c~1d", "~01"])
        );
        for invalid in ["/a~", "/a~2", "/a~x", "/a/~"] {
            assert_eq!(
                parse_pointer_segments(invalid),
                Err(RegistryError::InvalidPointerEscape)
            );
        }
    }

    #[test]
    fn prototype_related_segments_are_rejected_before_matching() {
        for forbidden in ["__proto__", "prototype", "constructor"] {
            for pointer in [
                format!("/{forbidden}/imageDataUrl"),
                format!("/logoAssets/{forbidden}/0/imageDataUrl"),
                format!("/caseInsert/templates/cover/{forbidden}/imageDataUrl"),
            ] {
                assert_eq!(
                    resolve(ProjectKind::Disc, &pointer),
                    Err(RegistryError::ForbiddenPointerSegment)
                );
            }
        }
    }

    #[test]
    fn malformed_pointer_envelopes_are_rejected() {
        assert_eq!(
            resolve(ProjectKind::Disc, ""),
            Err(RegistryError::PointerEmpty)
        );
        assert_eq!(
            resolve(ProjectKind::Disc, "background/imageDataUrl"),
            Err(RegistryError::PointerMustStartWithSlash)
        );
        for pointer in [
            "/",
            "//background/imageDataUrl",
            "/background/",
            "/background//imageDataUrl",
        ] {
            assert_eq!(
                resolve(ProjectKind::Disc, pointer),
                Err(RegistryError::PointerContainsEmptySegment)
            );
        }

        let too_long = format!("/{}", "a".repeat(MAX_BINDING_POINTER_BYTES));
        assert!(too_long.len() > MAX_BINDING_POINTER_BYTES);
        assert_eq!(
            resolve(ProjectKind::Disc, &too_long),
            Err(RegistryError::PointerTooLong)
        );
    }

    #[test]
    fn near_misses_and_unknown_image_fields_never_enter_the_registry() {
        for pointer in [
            "/background/imageUrl",
            "/background/customImageDataUrl",
            "/selectedSteamGame/artwork/0/imageDataUrl",
            "/game/selectedSteamGame/artwork/0/url",
            "/logoAssets/developerLogoDataUrl/extra",
            "/titleArtwork/defaultSteamLogo/0/imageDataUrl",
            "/additionalArtwork/elements/imageDataUrl",
            "/platformMarks/assets/pc/0/customImageDataUrl",
            "/technicalMarks/additionalAssets/audio/customImageDataUrl",
            "/caseInsert/templates/cover/artworkSlots/imageDataUrl",
            "/caseInsert/templates/cover/titleArtwork/defaultSteamLogo/sourceUrl",
        ] {
            assert_eq!(
                resolve(ProjectKind::Disc, pointer),
                Err(RegistryError::PointerOutsideRegistry)
            );
        }
    }

    #[test]
    fn convenience_membership_check_does_not_weaken_validation() {
        assert!(is_registered_pointer(
            "0.1.0",
            ProjectKind::CaseInsert,
            "/caseInsert/spine/right/markSlots/0/imageDataUrl"
        ));
        assert!(!is_registered_pointer(
            "0.1.0",
            ProjectKind::CaseInsert,
            "/caseInsert/spine/right/marks/0/imageDataUrl"
        ));
        assert!(!is_registered_pointer(
            "9.9.9",
            ProjectKind::Disc,
            "/background/imageDataUrl"
        ));
    }

    #[test]
    fn expansion_rejects_checked_capacity_overflow_before_allocation() {
        let result = expand_registered_owners(
            "0.2.0",
            RegistryShape::Disc(DiscRegistryShape {
                additional_developer_logos: usize::MAX,
                ..DiscRegistryShape::default()
            }),
        );
        assert_eq!(result, Err(RegistryError::CapacityOverflow));

        let result = expand_registered_owners(
            "0.2.0",
            RegistryShape::CaseInsert(CaseRegistryShape {
                cover: CaseSurfaceRegistryShape {
                    artwork_slots: usize::MAX,
                    logo_slots: 1,
                    mark_slots: 0,
                },
                ..CaseRegistryShape::default()
            }),
        );
        assert_eq!(result, Err(RegistryError::CapacityOverflow));
    }

    #[test]
    fn ordinal_helpers_match_contract_order() {
        for (index, platform) in PlatformKind::ALL.into_iter().enumerate() {
            assert_eq!(platform.ordinal(), index);
        }
        for (index, technical) in TechnicalKind::ALL.into_iter().enumerate() {
            assert_eq!(technical.ordinal(), index);
        }
        for (index, surface) in CaseSurface::ALL.into_iter().enumerate() {
            assert_eq!(surface.ordinal(), index);
        }
        assert_eq!(LogoRole::ALL, [LogoRole::Developer, LogoRole::Publisher]);
    }

    #[test]
    fn registry_shape_reports_the_same_project_kind_as_its_owners() {
        let disc = RegistryShape::Disc(DiscRegistryShape::default());
        let case_insert = RegistryShape::CaseInsert(CaseRegistryShape::default());
        assert_eq!(disc.project_kind(), ProjectKind::Disc);
        assert_eq!(case_insert.project_kind(), ProjectKind::CaseInsert);
    }
}
