use crate::limits::{OperationAllocationLedger, PackageLimits};
use std::cmp::Ordering;

pub(crate) type JsonResult<T> = Result<T, JsonErrorKind>;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum JsonErrorKind {
    Invalid(&'static str),
    ResourceLimit(&'static str),
}

impl JsonErrorKind {
    #[cfg(test)]
    pub(crate) fn diagnostic(self) -> &'static str {
        match self {
            Self::Invalid(diagnostic) | Self::ResourceLimit(diagnostic) => diagnostic,
        }
    }

    pub(crate) fn is_resource_limit(self) -> bool {
        matches!(self, Self::ResourceLimit(_))
    }
}

#[derive(Debug, PartialEq)]
pub(crate) enum JsonValue {
    Null,
    Bool(bool),
    Number(JsonNumber),
    String(String),
    Array(Vec<JsonValue>),
    Object(Vec<(String, JsonValue)>),
}

#[derive(Debug, PartialEq)]
pub(crate) struct JsonNumber {
    value: f64,
    raw: String,
}

impl JsonNumber {
    pub(crate) fn as_f64(&self) -> f64 {
        self.value
    }

    pub(crate) fn raw(&self) -> &str {
        &self.raw
    }

    pub(crate) fn as_plain_nonnegative_u64(&self) -> Option<u64> {
        let bytes = self.raw.as_bytes();
        match bytes {
            [b'0'] => return Some(0),
            [b'1'..=b'9', rest @ ..] if rest.iter().all(u8::is_ascii_digit) => {}
            _ => return None,
        }
        let mut value = 0_u64;
        for digit in bytes {
            value = value
                .checked_mul(10)?
                .checked_add(u64::from(*digit - b'0'))?;
        }
        Some(value)
    }

    #[cfg(test)]
    fn parsed(value: f64, raw: &str) -> JsonResult<Self> {
        if !value.is_finite() {
            return Err(JsonErrorKind::Invalid("json number is not finite"));
        }
        Self::from_owned(value, try_clone_string(raw)?)
    }

    fn from_owned(value: f64, raw: String) -> JsonResult<Self> {
        if !value.is_finite() {
            return Err(JsonErrorKind::Invalid("json number is not finite"));
        }
        Ok(Self { value, raw })
    }

    #[cfg(test)]
    fn try_deep_clone(&self) -> JsonResult<Self> {
        Ok(Self {
            value: self.value,
            raw: try_clone_string(&self.raw)?,
        })
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct JsonStringMeasure {
    pub utf8_bytes: u64,
    pub utf16_code_units: u64,
    pub number_count: u64,
}

impl JsonValue {
    #[cfg(test)]
    pub(crate) fn number(value: f64) -> JsonResult<Self> {
        if !value.is_finite() {
            return Err(JsonErrorKind::Invalid("json number is not finite"));
        }
        let mut buffer = ryu_js::Buffer::new();
        Ok(Self::Number(JsonNumber::parsed(
            value,
            buffer.format(value),
        )?))
    }

    pub(crate) fn string(value: String) -> Self {
        Self::String(value)
    }

    #[cfg(test)]
    pub(crate) fn array(values: Vec<Self>) -> JsonResult<Self> {
        ensure_count_at_most(
            values.len(),
            PackageLimits::V1.json_array_members,
            "json array member limit exceeded",
        )?;
        Ok(Self::Array(values))
    }

    #[cfg(test)]
    pub(crate) fn object(entries: Vec<(String, Self)>) -> JsonResult<Self> {
        validate_object_entries(&entries, &PackageLimits::V1)?;
        Ok(Self::Object(entries))
    }

    pub(crate) fn is_null(&self) -> bool {
        matches!(self, Self::Null)
    }

    #[cfg(test)]
    pub(crate) fn as_bool(&self) -> Option<bool> {
        match self {
            Self::Bool(value) => Some(*value),
            _ => None,
        }
    }

    #[cfg(test)]
    pub(crate) fn as_f64(&self) -> Option<f64> {
        match self {
            Self::Number(value) => Some(value.as_f64()),
            _ => None,
        }
    }

    pub(crate) fn as_plain_nonnegative_u64(&self) -> Option<u64> {
        match self {
            Self::Number(value) => value.as_plain_nonnegative_u64(),
            _ => None,
        }
    }

    #[cfg(test)]
    pub(crate) fn as_u64(&self) -> Option<u64> {
        self.as_plain_nonnegative_u64()
    }

    pub(crate) fn as_str(&self) -> Option<&str> {
        match self {
            Self::String(value) => Some(value),
            _ => None,
        }
    }

    pub(crate) fn as_array(&self) -> Option<&[Self]> {
        match self {
            Self::Array(values) => Some(values),
            _ => None,
        }
    }

    pub(crate) fn as_array_mut(&mut self) -> Option<&mut [Self]> {
        match self {
            Self::Array(values) => Some(values),
            _ => None,
        }
    }

    pub(crate) fn as_object_entries(&self) -> Option<&[(String, Self)]> {
        match self {
            Self::Object(entries) => Some(entries),
            _ => None,
        }
    }

    pub(crate) fn get(&self, key: &str) -> Option<&Self> {
        let Self::Object(entries) = self else {
            return None;
        };
        entries
            .iter()
            .find_map(|(candidate, value)| (candidate == key).then_some(value))
    }

    pub(crate) fn get_mut(&mut self, key: &str) -> Option<&mut Self> {
        let Self::Object(entries) = self else {
            return None;
        };
        entries
            .iter_mut()
            .find_map(|(candidate, value)| (candidate == key).then_some(value))
    }

    pub(crate) fn get_index(&self, index: usize) -> Option<&Self> {
        self.as_array()?.get(index)
    }

    pub(crate) fn get_index_mut(&mut self, index: usize) -> Option<&mut Self> {
        self.as_array_mut()?.get_mut(index)
    }

    #[cfg(test)]
    pub(crate) fn insert_unique(&mut self, key: String, value: Self) -> JsonResult<()> {
        validate_object_key(&key, &PackageLimits::V1)?;
        let Self::Object(entries) = self else {
            return Err(JsonErrorKind::Invalid("json value is not an object"));
        };
        ensure_count_below(
            entries.len(),
            PackageLimits::V1.json_object_properties,
            "json object property limit exceeded",
        )?;
        if entries.iter().any(|(candidate, _)| candidate == &key) {
            return Err(JsonErrorKind::Invalid(
                "json object contains a duplicate key",
            ));
        }
        reserve_one(entries)?;
        entries.push((key, value));
        Ok(())
    }

    #[cfg(test)]
    pub(crate) fn replace_existing(&mut self, key: &str, value: Self) -> JsonResult<Self> {
        let Some(existing) = self.get_mut(key) else {
            return Err(JsonErrorKind::Invalid(
                "json object property does not exist",
            ));
        };
        Ok(std::mem::replace(existing, value))
    }

    #[cfg(test)]
    pub(crate) fn remove(&mut self, key: &str) -> Option<Self> {
        let Self::Object(entries) = self else {
            return None;
        };
        let index = entries.iter().position(|(candidate, _)| candidate == key)?;
        Some(entries.remove(index).1)
    }

    #[cfg(test)]
    pub(crate) fn push(&mut self, value: Self) -> JsonResult<()> {
        let Self::Array(values) = self else {
            return Err(JsonErrorKind::Invalid("json value is not an array"));
        };
        ensure_count_below(
            values.len(),
            PackageLimits::V1.json_array_members,
            "json array member limit exceeded",
        )?;
        reserve_one(values)?;
        values.push(value);
        Ok(())
    }

    #[cfg(test)]
    pub(crate) fn try_deep_clone(&self) -> JsonResult<Self> {
        self.try_deep_clone_with_limits(&PackageLimits::V1)
    }

    #[cfg(test)]
    pub(crate) fn try_deep_clone_with_limits(&self, limits: &PackageLimits) -> JsonResult<Self> {
        clone_value(self, 0, limits)
    }

    #[cfg(test)]
    pub(crate) fn measure_strings(&self) -> JsonResult<JsonStringMeasure> {
        self.measure_strings_with_limits(&PackageLimits::V1)
    }

    pub(crate) fn measure_strings_with_limits(
        &self,
        limits: &PackageLimits,
    ) -> JsonResult<JsonStringMeasure> {
        let mut measure = JsonStringMeasure::default();
        measure_value_strings(self, 0, limits, &mut measure)?;
        Ok(measure)
    }

    #[cfg(test)]
    pub(crate) fn to_canonical_bytes(&self) -> JsonResult<Vec<u8>> {
        self.to_canonical_bytes_with_limits(&PackageLimits::V1)
    }

    #[cfg(test)]
    pub(crate) fn to_canonical_bytes_with_limits(
        &self,
        limits: &PackageLimits,
    ) -> JsonResult<Vec<u8>> {
        self.to_canonical_bytes_bounded_with_limits(limits, u64::MAX)
    }

    pub(crate) fn to_canonical_bytes_bounded_with_limits(
        &self,
        limits: &PackageLimits,
        maximum_output_bytes: u64,
    ) -> JsonResult<Vec<u8>> {
        let mut output = Vec::new();
        write_canonical_value(self, 0, limits, maximum_output_bytes, &mut output)?;
        Ok(output)
    }

    pub(crate) fn to_canonical_bytes_precharged_with_limits(
        &self,
        limits: &PackageLimits,
        maximum_output_bytes: u64,
    ) -> JsonResult<Vec<u8>> {
        let exact_length = canonical_value_length(self, 0, limits)?;
        if exact_length > maximum_output_bytes {
            return Err(JsonErrorKind::ResourceLimit(
                "json canonical output limit exceeded",
            ));
        }
        let exact_length = usize::try_from(exact_length).map_err(|_| {
            JsonErrorKind::ResourceLimit("json canonical output length cannot be represented")
        })?;
        let mut output = Vec::new();
        output
            .try_reserve_exact(exact_length)
            .map_err(|_| allocation_error("json canonical output allocation failed"))?;
        write_canonical_value(self, 0, limits, maximum_output_bytes, &mut output)?;
        if output.len() != exact_length {
            return Err(JsonErrorKind::Invalid(
                "json canonical output measurement disagrees with emission",
            ));
        }
        Ok(output)
    }
}

#[cfg(test)]
pub(crate) fn parse_json(input: &[u8]) -> JsonResult<JsonValue> {
    parse_json_with_limits(input, &PackageLimits::V1)
}

#[cfg(test)]
pub(crate) fn parse_json_with_limits(
    input: &[u8],
    limits: &PackageLimits,
) -> JsonResult<JsonValue> {
    let mut allocations = OperationAllocationLedger::new(limits.decoder_working_bytes);
    parse_json_accounted_with_limits(input, limits, &mut allocations).map(|(value, _)| value)
}

/// Parse one JSON value while charging every retained allocation to the
/// caller's live operation ledger. The returned receipt belongs to the
/// returned tree and must be released only after that tree is dropped or its
/// storage is transferred to another precharged owner.
///
/// Any failure, including allocator denial after a successful precharge,
/// restores the ledger to its entry value before returning.
pub(crate) fn parse_json_accounted_with_limits(
    input: &[u8],
    limits: &PackageLimits,
    allocations: &mut OperationAllocationLedger,
) -> JsonResult<(JsonValue, u64)> {
    if input.starts_with(&[0xef, 0xbb, 0xbf]) {
        return Err(JsonErrorKind::Invalid("json input contains a UTF-8 BOM"));
    }
    let text = std::str::from_utf8(input)
        .map_err(|_| JsonErrorKind::Invalid("json input is not valid UTF-8"))?;
    Parser::new(text, limits, allocations).parse()
}

/// Whole-value grammar for local filesystem locations forbidden in package
/// project content. HTTP(S) provenance and ordinary prose remain inert values.
pub(crate) fn is_forbidden_filesystem_value(value: &str) -> bool {
    let value = trim_ascii_whitespace(value);
    if starts_with_ascii_case_insensitive(value, "file:")
        || value.starts_with("\\\\")
        || value.starts_with("//")
        || value.starts_with('/')
        || value.starts_with('\\')
    {
        return true;
    }

    let bytes = value.as_bytes();
    bytes.len() >= 3
        && bytes[0].is_ascii_alphabetic()
        && bytes[1] == b':'
        && matches!(bytes[2], b'/' | b'\\')
}

/// Rust-1.77-compatible whole-value ASCII whitespace trimming.
///
/// Package token recognition deliberately ignores only ASCII whitespace;
/// non-ASCII spacing remains ordinary string content.
pub(crate) fn trim_ascii_whitespace(value: &str) -> &str {
    value.trim_matches(|character: char| character.is_ascii_whitespace())
}

fn starts_with_ascii_case_insensitive(value: &str, prefix: &str) -> bool {
    value
        .as_bytes()
        .get(..prefix.len())
        .is_some_and(|candidate| candidate.eq_ignore_ascii_case(prefix.as_bytes()))
}

/// Parse an owned encoder source snapshot without applying the projection's
/// 1 MiB string ceiling to the closed asset leaves that can contain hydrated
/// data URLs. All other strings retain the ordinary parsed-string ceiling.
///
/// The caller already owns `input`; its bytes are therefore not charged as a
/// second allocation. The existing 512 MiB operation working ceiling still
/// bounds its envelope before parsing, and every retained string, number token,
/// JSON node, and collection element is precharged before allocation.
pub(crate) fn parse_project_source_json_with_limits(
    input: &[u8],
    limits: &PackageLimits,
    project_kind: ProjectSourceKind,
) -> JsonResult<JsonValue> {
    let text = validate_project_source_envelope(input, limits)?;
    let mut allocations = OperationAllocationLedger::new(limits.decoder_working_bytes);
    Parser::new_project_source(text, limits, project_kind, &mut allocations)
        .parse()
        .map(|(value, _)| value)
}

/// First pass for resolving the source project kind without retaining any
/// value string larger than the ordinary projection-string ceiling.
pub(crate) fn parse_project_source_probe_with_limits(
    input: &[u8],
    limits: &PackageLimits,
) -> JsonResult<JsonValue> {
    let text = validate_project_source_envelope(input, limits)?;
    let mut allocations = OperationAllocationLedger::new(limits.decoder_working_bytes);
    Parser::new_project_source_probe(text, limits, &mut allocations)
        .parse()
        .map(|(value, _)| value)
}

fn validate_project_source_envelope<'a>(
    input: &'a [u8],
    limits: &PackageLimits,
) -> JsonResult<&'a str> {
    let input_length = u64::try_from(input.len()).map_err(|_| {
        JsonErrorKind::ResourceLimit("project source byte length cannot be represented")
    })?;
    if input_length > limits.decoder_working_bytes {
        return Err(JsonErrorKind::ResourceLimit(
            "project source exceeds the operation working limit",
        ));
    }
    if input.starts_with(&[0xef, 0xbb, 0xbf]) {
        return Err(JsonErrorKind::Invalid("json input contains a UTF-8 BOM"));
    }
    std::str::from_utf8(input).map_err(|_| JsonErrorKind::Invalid("json input is not valid UTF-8"))
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum ProjectSourceKind {
    Disc,
    CaseInsert,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SourcePathState {
    Root,
    ProbeEditor,
    ProbeTemplate,
    ProbeControlString,
    DiscRoot,
    CaseRoot,
    DiscBackground,
    DiscSteamBanner,
    DiscLogoAssets,
    DiscAdditionalLogoArray,
    DiscAdditionalLogo,
    DiscTitleArtwork,
    DiscDefaultSteamLogo,
    DiscAdditionalArtwork,
    DiscAdditionalArtworkArray,
    DiscAdditionalArtworkItem,
    DiscRatingBadge,
    DiscMediaMark,
    DiscPlatformMarks,
    DiscPlatformAssets,
    DiscPlatformAsset,
    DiscTechnicalMarks,
    DiscTechnicalAssets,
    DiscTechnicalAsset,
    DiscTechnicalAdditionalAssets,
    DiscTechnicalAdditionalArray,
    DiscTechnicalAdditionalItem,
    CaseInsert,
    CaseTemplates,
    CaseSpine,
    CaseSurface,
    CaseSteamBanner,
    CaseBackground,
    CaseTitleArtwork,
    CaseDefaultSteamLogo,
    CaseSlotArray,
    CaseSlot,
    RegisteredAssetLeaf,
    Other,
}

impl SourcePathState {
    fn object_child(self, key: &str) -> Self {
        use SourcePathState::*;
        match (self, key) {
            (Root, "schemaVersion" | "projectType")
            | (ProbeEditor, "projectType" | "workspace")
            | (ProbeTemplate, "type") => ProbeControlString,
            (Root, "editor") => ProbeEditor,
            (Root, "template") => ProbeTemplate,
            (DiscRoot, "background") => DiscBackground,
            (DiscRoot, "steamBackupLogo") => DiscSteamBanner,
            (DiscRoot, "logoAssets") => DiscLogoAssets,
            (DiscRoot, "titleArtwork") => DiscTitleArtwork,
            (DiscRoot, "additionalArtwork") => DiscAdditionalArtwork,
            (DiscRoot, "ratingBadge") => DiscRatingBadge,
            (DiscRoot, "mediaMark") => DiscMediaMark,
            (DiscRoot, "platformMarks") => DiscPlatformMarks,
            (DiscRoot, "technicalMarks") => DiscTechnicalMarks,
            (CaseRoot, "caseInsert") => CaseInsert,

            (DiscBackground, "imageDataUrl")
            | (DiscSteamBanner, "lockupImageDataUrl")
            | (DiscLogoAssets, "developerLogoDataUrl")
            | (DiscLogoAssets, "publisherLogoDataUrl")
            | (DiscAdditionalLogo, "imageDataUrl")
            | (DiscTitleArtwork, "imageDataUrl")
            | (DiscDefaultSteamLogo, "imageDataUrl")
            | (DiscAdditionalArtworkItem, "imageDataUrl")
            | (DiscRatingBadge, "customImageDataUrl")
            | (DiscMediaMark, "customImageDataUrl")
            | (DiscPlatformAsset, "customImageDataUrl")
            | (DiscTechnicalAsset, "customImageDataUrl")
            | (DiscTechnicalAdditionalItem, "customImageDataUrl")
            | (CaseSteamBanner, "lockupImageDataUrl")
            | (CaseBackground, "imageDataUrl")
            | (CaseTitleArtwork, "imageDataUrl")
            | (CaseDefaultSteamLogo, "imageDataUrl")
            | (CaseSlot, "imageDataUrl") => RegisteredAssetLeaf,

            (DiscLogoAssets, "additionalDeveloperLogos")
            | (DiscLogoAssets, "additionalPublisherLogos") => DiscAdditionalLogoArray,
            (DiscTitleArtwork, "defaultSteamLogo") => DiscDefaultSteamLogo,
            (DiscAdditionalArtwork, "elements") => DiscAdditionalArtworkArray,
            (DiscPlatformMarks, "assets") => DiscPlatformAssets,
            (DiscPlatformAssets, platform) if is_platform_key(platform) => DiscPlatformAsset,
            (DiscTechnicalMarks, "assets") => DiscTechnicalAssets,
            (DiscTechnicalAssets, technical) if is_technical_key(technical) => DiscTechnicalAsset,
            (DiscTechnicalMarks, "additionalAssets") => DiscTechnicalAdditionalAssets,
            (DiscTechnicalAdditionalAssets, technical) if is_technical_key(technical) => {
                DiscTechnicalAdditionalArray
            }

            (CaseInsert, "templates") => CaseTemplates,
            (CaseInsert, "spine") => CaseSpine,
            (CaseTemplates, "cover" | "tray") | (CaseSpine, "left" | "right") => CaseSurface,
            (CaseSurface, "steamBanner") => CaseSteamBanner,
            (CaseSurface, "background") => CaseBackground,
            (CaseSurface, "titleArtwork") => CaseTitleArtwork,
            (CaseTitleArtwork, "defaultSteamLogo") => CaseDefaultSteamLogo,
            (CaseSurface, "artworkSlots" | "logoSlots" | "markSlots") => CaseSlotArray,
            _ => Other,
        }
    }

    fn array_child(self) -> Self {
        use SourcePathState::*;
        match self {
            DiscAdditionalLogoArray => DiscAdditionalLogo,
            DiscAdditionalArtworkArray => DiscAdditionalArtworkItem,
            DiscTechnicalAdditionalArray => DiscTechnicalAdditionalItem,
            CaseSlotArray => CaseSlot,
            _ => Other,
        }
    }

    const fn permits_hydrated_asset_string(self) -> bool {
        matches!(self, Self::RegisteredAssetLeaf)
    }

    const fn is_probe_control_string(self) -> bool {
        matches!(self, Self::ProbeControlString)
    }
}

fn is_platform_key(value: &str) -> bool {
    matches!(value, "pc" | "windows" | "linux" | "steamDeck" | "macos")
}

fn is_technical_key(value: &str) -> bool {
    matches!(
        value,
        "audio" | "surround" | "codec" | "middleware" | "technology"
    )
}

struct ParseAllocationBudget<'a> {
    allocations: &'a mut OperationAllocationLedger,
    retained_bytes: u64,
    string_utf8_bytes: u64,
    string_utf16_code_units: u64,
}

impl<'a> ParseAllocationBudget<'a> {
    fn new(allocations: &'a mut OperationAllocationLedger) -> Self {
        Self {
            allocations,
            retained_bytes: 0,
            string_utf8_bytes: 0,
            string_utf16_code_units: 0,
        }
    }

    fn charge_retained(&mut self, amount: u64, limits: &PackageLimits) -> JsonResult<()> {
        let next = self
            .retained_bytes
            .checked_add(amount)
            .ok_or(JsonErrorKind::ResourceLimit(
                "json retained allocation overflowed",
            ))?;
        if next > limits.decoder_working_bytes {
            return Err(JsonErrorKind::ResourceLimit(
                "json retained allocation limit exceeded",
            ));
        }
        self.allocations.try_charge(amount).map_err(|_| {
            JsonErrorKind::ResourceLimit("json operation allocation limit exceeded")
        })?;
        self.retained_bytes = next;
        Ok(())
    }

    fn release_retained(&mut self, amount: u64) -> JsonResult<()> {
        let next = self
            .retained_bytes
            .checked_sub(amount)
            .ok_or(JsonErrorKind::ResourceLimit(
                "json retained allocation receipt underflowed",
            ))?;
        self.allocations.release(amount).map_err(|_| {
            JsonErrorKind::ResourceLimit("json operation allocation receipt underflowed")
        })?;
        self.retained_bytes = next;
        Ok(())
    }

    fn rollback(&mut self) -> JsonResult<()> {
        let retained = self.retained_bytes;
        self.allocations.release(retained).map_err(|_| {
            JsonErrorKind::ResourceLimit("json operation allocation rollback failed")
        })?;
        self.retained_bytes = 0;
        Ok(())
    }

    fn charge_string(
        &mut self,
        utf8_bytes: u64,
        utf16_code_units: u64,
        limits: &PackageLimits,
    ) -> JsonResult<()> {
        let next_retained =
            self.retained_bytes
                .checked_add(utf8_bytes)
                .ok_or(JsonErrorKind::ResourceLimit(
                    "json retained allocation overflowed",
                ))?;
        let next_utf8 =
            self.string_utf8_bytes
                .checked_add(utf8_bytes)
                .ok_or(JsonErrorKind::ResourceLimit(
                    "json aggregate UTF-8 string length overflowed",
                ))?;
        let next_utf16 = self
            .string_utf16_code_units
            .checked_add(utf16_code_units)
            .ok_or(JsonErrorKind::ResourceLimit(
                "json aggregate UTF-16 string length overflowed",
            ))?;
        if next_retained > limits.decoder_working_bytes {
            return Err(JsonErrorKind::ResourceLimit(
                "json retained allocation limit exceeded",
            ));
        }
        if next_utf8 > limits.hydrated_project_string_utf8_bytes {
            return Err(JsonErrorKind::ResourceLimit(
                "json aggregate UTF-8 string limit exceeded",
            ));
        }
        if next_utf16 > limits.hydrated_project_string_utf16_code_units {
            return Err(JsonErrorKind::ResourceLimit(
                "json aggregate UTF-16 string limit exceeded",
            ));
        }
        self.allocations.try_charge(utf8_bytes).map_err(|_| {
            JsonErrorKind::ResourceLimit("json operation allocation limit exceeded")
        })?;
        self.retained_bytes = next_retained;
        self.string_utf8_bytes = next_utf8;
        self.string_utf16_code_units = next_utf16;
        Ok(())
    }
}

struct Parser<'a> {
    text: &'a str,
    bytes: &'a [u8],
    position: usize,
    limits: &'a PackageLimits,
    allocation_budget: ParseAllocationBudget<'a>,
    project_source: bool,
    root_source_path: SourcePathState,
    probe_oversized_value_strings: bool,
}

impl<'a> Parser<'a> {
    fn new(
        text: &'a str,
        limits: &'a PackageLimits,
        allocations: &'a mut OperationAllocationLedger,
    ) -> Self {
        Self {
            text,
            bytes: text.as_bytes(),
            position: 0,
            limits,
            allocation_budget: ParseAllocationBudget::new(allocations),
            project_source: false,
            root_source_path: SourcePathState::Root,
            probe_oversized_value_strings: false,
        }
    }

    fn new_project_source(
        text: &'a str,
        limits: &'a PackageLimits,
        project_kind: ProjectSourceKind,
        allocations: &'a mut OperationAllocationLedger,
    ) -> Self {
        Self {
            text,
            bytes: text.as_bytes(),
            position: 0,
            limits,
            allocation_budget: ParseAllocationBudget::new(allocations),
            project_source: true,
            root_source_path: match project_kind {
                ProjectSourceKind::Disc => SourcePathState::DiscRoot,
                ProjectSourceKind::CaseInsert => SourcePathState::CaseRoot,
            },
            probe_oversized_value_strings: false,
        }
    }

    fn new_project_source_probe(
        text: &'a str,
        limits: &'a PackageLimits,
        allocations: &'a mut OperationAllocationLedger,
    ) -> Self {
        Self {
            text,
            bytes: text.as_bytes(),
            position: 0,
            limits,
            allocation_budget: ParseAllocationBudget::new(allocations),
            project_source: true,
            root_source_path: SourcePathState::Root,
            probe_oversized_value_strings: true,
        }
    }

    fn parse(mut self) -> JsonResult<(JsonValue, u64)> {
        let result = self.parse_inner();
        match result {
            Ok(value) => Ok((value, self.allocation_budget.retained_bytes)),
            Err(error) => {
                self.allocation_budget.rollback()?;
                Err(error)
            }
        }
    }

    fn parse_inner(&mut self) -> JsonResult<JsonValue> {
        self.skip_whitespace();
        if self.position == self.bytes.len() {
            return Err(JsonErrorKind::Invalid("json input is empty"));
        }
        let value = self.parse_value(0, self.root_source_path, false)?;
        self.skip_whitespace();
        if self.position != self.bytes.len() {
            return Err(JsonErrorKind::Invalid("json input has trailing data"));
        }
        Ok(value)
    }

    fn parse_value(
        &mut self,
        depth: u64,
        source_path: SourcePathState,
        storage_precharged: bool,
    ) -> JsonResult<JsonValue> {
        if !storage_precharged {
            self.charge_root_node()?;
        }
        match self.peek() {
            Some(b'n') => {
                self.consume_literal(b"null")?;
                Ok(JsonValue::Null)
            }
            Some(b't') => {
                self.consume_literal(b"true")?;
                Ok(JsonValue::Bool(true))
            }
            Some(b'f') => {
                self.consume_literal(b"false")?;
                Ok(JsonValue::Bool(false))
            }
            Some(b'"') => match self.parse_value_string(source_path)? {
                Some(value) => Ok(JsonValue::String(value)),
                None => Ok(JsonValue::Null),
            },
            Some(b'[') => {
                let next_depth = enter_container(depth, self.limits)?;
                self.parse_array(next_depth, source_path)
            }
            Some(b'{') => {
                let next_depth = enter_container(depth, self.limits)?;
                self.parse_object(next_depth, source_path)
            }
            Some(b'-' | b'0'..=b'9') => self.parse_number(),
            Some(_) => Err(JsonErrorKind::Invalid("json value has invalid syntax")),
            None => Err(JsonErrorKind::Invalid("json value is incomplete")),
        }
    }

    fn parse_array(&mut self, depth: u64, source_path: SourcePathState) -> JsonResult<JsonValue> {
        self.position += 1;
        self.skip_whitespace();
        let mut values = Vec::new();
        if self.consume_if(b']') {
            return Ok(JsonValue::Array(values));
        }

        loop {
            ensure_count_below(
                values.len(),
                self.limits.json_array_members,
                "json array member limit exceeded",
            )?;
            self.reserve_collection_one(&mut values, self.limits.json_array_members)?;
            values.push(self.parse_value(depth, source_path.array_child(), true)?);
            self.skip_whitespace();
            if self.consume_if(b']') {
                break;
            }
            if !self.consume_if(b',') {
                return Err(JsonErrorKind::Invalid(
                    "json array is missing a comma or closing bracket",
                ));
            }
            self.skip_whitespace();
            if self.peek() == Some(b']') {
                return Err(JsonErrorKind::Invalid("json array has a trailing comma"));
            }
        }
        Ok(JsonValue::Array(values))
    }

    fn parse_object(&mut self, depth: u64, source_path: SourcePathState) -> JsonResult<JsonValue> {
        self.position += 1;
        self.skip_whitespace();
        let mut entries = Vec::new();
        if self.consume_if(b'}') {
            return Ok(JsonValue::Object(entries));
        }

        loop {
            ensure_count_below(
                entries.len(),
                self.limits.json_object_properties,
                "json object property limit exceeded",
            )?;
            self.reserve_collection_one(&mut entries, self.limits.json_object_properties)?;
            if self.peek() != Some(b'"') {
                return Err(JsonErrorKind::Invalid("json object key is not a string"));
            }
            let key = self.parse_required_string()?;
            validate_object_key(&key, self.limits)?;
            if entries
                .iter()
                .any(|(candidate, _): &(String, JsonValue)| candidate == &key)
            {
                return Err(JsonErrorKind::Invalid(
                    "json object contains a duplicate key",
                ));
            }
            self.skip_whitespace();
            if !self.consume_if(b':') {
                return Err(JsonErrorKind::Invalid("json object key is missing a colon"));
            }
            self.skip_whitespace();
            let child_source_path = source_path.object_child(&key);
            let value = self.parse_value(depth, child_source_path, true)?;
            entries.push((key, value));
            self.skip_whitespace();
            if self.consume_if(b'}') {
                break;
            }
            if !self.consume_if(b',') {
                return Err(JsonErrorKind::Invalid(
                    "json object is missing a comma or closing brace",
                ));
            }
            self.skip_whitespace();
            if self.peek() == Some(b'}') {
                return Err(JsonErrorKind::Invalid("json object has a trailing comma"));
            }
        }
        Ok(JsonValue::Object(entries))
    }

    fn parse_required_string(&mut self) -> JsonResult<String> {
        let scan = self.scan_string(self.position, self.limits.parsed_json_string_bytes)?;
        self.materialize_string(scan)
    }

    fn parse_value_string(&mut self, source_path: SourcePathState) -> JsonResult<Option<String>> {
        let permits_hydrated_asset_string = source_path.permits_hydrated_asset_string();
        let maximum = if self.probe_oversized_value_strings {
            self.limits.decoder_working_bytes
        } else if self.project_source && permits_hydrated_asset_string {
            self.limits.hydrated_data_url_bytes
        } else {
            self.limits.parsed_json_string_bytes
        };
        let scan = self.scan_string(self.position, maximum)?;
        if self.probe_oversized_value_strings
            && scan.decoded_bytes > self.limits.parsed_json_string_bytes
        {
            if source_path.is_probe_control_string() {
                return Err(JsonErrorKind::ResourceLimit(
                    "project source selector exceeds the parsed string limit",
                ));
            }
            self.position = scan.after_quote;
            return Ok(None);
        }
        if self.project_source
            && scan.decoded_bytes > self.limits.parsed_json_string_bytes
            && (!permits_hydrated_asset_string || !self.is_canonical_data_url_lexeme(scan))
        {
            return Err(JsonErrorKind::ResourceLimit(
                "project source oversized string is not a canonical registered asset data URL",
            ));
        }
        self.materialize_string(scan).map(Some)
    }

    fn materialize_string(&mut self, scan: StringScan) -> JsonResult<String> {
        self.allocation_budget.charge_string(
            scan.decoded_bytes,
            scan.decoded_utf16_code_units,
            self.limits,
        )?;
        let capacity = usize::try_from(scan.decoded_bytes)
            .map_err(|_| allocation_error("json decoded string is too large to allocate"))?;
        let mut output =
            self.allocate_precharged_string(capacity, "json decoded string allocation failed")?;

        let mut cursor = scan.content_start;
        while cursor < scan.content_end {
            if self.bytes[cursor] != b'\\' {
                let character = self.text[cursor..]
                    .chars()
                    .next()
                    .ok_or(JsonErrorKind::Invalid("json string is incomplete"))?;
                output.push(character);
                cursor += character.len_utf8();
                continue;
            }

            match self.bytes[cursor + 1] {
                b'"' => output.push('"'),
                b'\\' => output.push('\\'),
                b'/' => output.push('/'),
                b'b' => output.push('\u{0008}'),
                b'f' => output.push('\u{000c}'),
                b'n' => output.push('\n'),
                b'r' => output.push('\r'),
                b't' => output.push('\t'),
                b'u' => {
                    let first = self.hex_quad(cursor + 2)?;
                    cursor += 6;
                    let scalar = if (0xd800..=0xdbff).contains(&first) {
                        let second = self.hex_quad(cursor + 2)?;
                        cursor += 6;
                        0x1_0000
                            + (((u32::from(first) - 0xd800) << 10) | (u32::from(second) - 0xdc00))
                    } else {
                        u32::from(first)
                    };
                    output.push(char::from_u32(scalar).ok_or(JsonErrorKind::Invalid(
                        "json string contains an invalid Unicode scalar",
                    ))?);
                    continue;
                }
                _ => unreachable!("string scan validated every escape"),
            }
            cursor += 2;
        }
        debug_assert_eq!(output.len(), capacity);
        self.position = scan.after_quote;
        Ok(output)
    }

    /// Allocates one String whose requested byte capacity has already been
    /// charged. `try_reserve_exact` may expose a larger usable capacity than
    /// requested, so reconcile that surplus before any infallible push can use
    /// it. A rejected surplus charge returns through `Parser::parse`, whose
    /// rollback releases every receipt from this parse after `output` drops.
    fn allocate_precharged_string(
        &mut self,
        requested_capacity: usize,
        diagnostic: &'static str,
    ) -> JsonResult<String> {
        let mut output = String::new();
        output
            .try_reserve_exact(requested_capacity)
            .map_err(|_| allocation_error(diagnostic))?;
        let requested_bytes = u64::try_from(requested_capacity).map_err(|_| {
            JsonErrorKind::ResourceLimit("json string capacity cannot be represented")
        })?;
        let actual_bytes = u64::try_from(output.capacity()).map_err(|_| {
            JsonErrorKind::ResourceLimit("json string capacity cannot be represented")
        })?;
        if actual_bytes > requested_bytes {
            self.allocation_budget
                .charge_retained(actual_bytes - requested_bytes, self.limits)?;
        }
        Ok(output)
    }

    fn is_canonical_data_url_lexeme(&self, scan: StringScan) -> bool {
        let lexeme = &self.bytes[scan.content_start..scan.content_end];
        let Some(payload) = canonical_data_url_payload(lexeme) else {
            return false;
        };
        if payload.is_empty() || payload.len() % 4 != 0 {
            return false;
        }
        let padding = payload
            .iter()
            .rev()
            .take_while(|byte| **byte == b'=')
            .count();
        if padding > 2 {
            return false;
        }
        let body_length = payload.len() - padding;
        let alphabet_is_valid = payload[..body_length]
            .iter()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'+' | b'/'))
            && payload[body_length..].iter().all(|byte| *byte == b'=');
        if !alphabet_is_valid {
            return false;
        }
        match padding {
            0 => true,
            1 => base64_value(payload[body_length - 1]).is_some_and(|value| value & 0b11 == 0),
            2 => base64_value(payload[body_length - 1]).is_some_and(|value| value & 0b1111 == 0),
            _ => false,
        }
    }

    fn scan_string(&self, quote: usize, maximum_decoded_bytes: u64) -> JsonResult<StringScan> {
        if self.bytes.get(quote) != Some(&b'"') {
            return Err(JsonErrorKind::Invalid(
                "json string is missing an opening quote",
            ));
        }
        let mut cursor = quote + 1;
        let mut decoded_bytes = 0_u64;
        let mut decoded_utf16_code_units = 0_u64;
        while cursor < self.bytes.len() {
            match self.bytes[cursor] {
                b'"' => {
                    return Ok(StringScan {
                        content_start: quote + 1,
                        content_end: cursor,
                        after_quote: cursor + 1,
                        decoded_bytes,
                        decoded_utf16_code_units,
                    });
                }
                b'\\' => {
                    let escape = *self
                        .bytes
                        .get(cursor + 1)
                        .ok_or(JsonErrorKind::Invalid("json string ends inside an escape"))?;
                    match escape {
                        b'"' | b'\\' | b'/' | b'b' | b'f' | b'n' | b'r' | b't' => {
                            decoded_bytes = charge_decoded_string_bytes(
                                decoded_bytes,
                                1,
                                maximum_decoded_bytes,
                            )?;
                            decoded_utf16_code_units =
                                charge_decoded_utf16_units(decoded_utf16_code_units, 1)?;
                            cursor += 2;
                        }
                        b'u' => {
                            let first = self.hex_quad(cursor + 2)?;
                            cursor += 6;
                            let scalar = if (0xd800..=0xdbff).contains(&first) {
                                if self.bytes.get(cursor) != Some(&b'\\')
                                    || self.bytes.get(cursor + 1) != Some(&b'u')
                                {
                                    return Err(JsonErrorKind::Invalid(
                                        "json string has an unpaired high surrogate",
                                    ));
                                }
                                let second = self.hex_quad(cursor + 2)?;
                                if !(0xdc00..=0xdfff).contains(&second) {
                                    return Err(JsonErrorKind::Invalid(
                                        "json string has an invalid surrogate pair",
                                    ));
                                }
                                cursor += 6;
                                0x1_0000
                                    + (((u32::from(first) - 0xd800) << 10)
                                        | (u32::from(second) - 0xdc00))
                            } else if (0xdc00..=0xdfff).contains(&first) {
                                return Err(JsonErrorKind::Invalid(
                                    "json string has an unpaired low surrogate",
                                ));
                            } else {
                                u32::from(first)
                            };
                            let character =
                                char::from_u32(scalar).ok_or(JsonErrorKind::Invalid(
                                    "json string contains an invalid Unicode scalar",
                                ))?;
                            decoded_bytes = charge_decoded_string_bytes(
                                decoded_bytes,
                                u64::from(character.len_utf8() as u32),
                                maximum_decoded_bytes,
                            )?;
                            decoded_utf16_code_units = charge_decoded_utf16_units(
                                decoded_utf16_code_units,
                                u64::from(character.len_utf16() as u32),
                            )?;
                        }
                        _ => {
                            return Err(JsonErrorKind::Invalid(
                                "json string contains an invalid escape",
                            ));
                        }
                    }
                }
                byte if byte < 0x20 => {
                    return Err(JsonErrorKind::Invalid(
                        "json string contains an unescaped control character",
                    ));
                }
                _ => {
                    let character = self.text[cursor..]
                        .chars()
                        .next()
                        .ok_or(JsonErrorKind::Invalid("json string is incomplete"))?;
                    decoded_bytes = charge_decoded_string_bytes(
                        decoded_bytes,
                        u64::from(character.len_utf8() as u32),
                        maximum_decoded_bytes,
                    )?;
                    decoded_utf16_code_units = charge_decoded_utf16_units(
                        decoded_utf16_code_units,
                        u64::from(character.len_utf16() as u32),
                    )?;
                    cursor += character.len_utf8();
                }
            }
        }
        Err(JsonErrorKind::Invalid("json string is unterminated"))
    }

    fn hex_quad(&self, start: usize) -> JsonResult<u16> {
        let end = start
            .checked_add(4)
            .ok_or(JsonErrorKind::Invalid("json Unicode escape is incomplete"))?;
        let digits = self
            .bytes
            .get(start..end)
            .ok_or(JsonErrorKind::Invalid("json Unicode escape is incomplete"))?;
        let mut value = 0_u16;
        for digit in digits {
            value = value
                .checked_mul(16)
                .and_then(|current| current.checked_add(hex_value(*digit)?))
                .ok_or(JsonErrorKind::Invalid("json Unicode escape is invalid"))?;
        }
        Ok(value)
    }

    fn parse_number(&mut self) -> JsonResult<JsonValue> {
        let start = self.position;
        if self.consume_if(b'-') && self.peek().is_none() {
            return Err(JsonErrorKind::Invalid("json number is incomplete"));
        }

        match self.peek() {
            Some(b'0') => {
                self.position += 1;
                if matches!(self.peek(), Some(b'0'..=b'9')) {
                    return Err(JsonErrorKind::Invalid("json number has a leading zero"));
                }
            }
            Some(b'1'..=b'9') => {
                self.consume_digits();
            }
            _ => return Err(JsonErrorKind::Invalid("json number has no integer part")),
        }

        if self.consume_if(b'.') {
            if !matches!(self.peek(), Some(b'0'..=b'9')) {
                return Err(JsonErrorKind::Invalid(
                    "json number has no fractional digits",
                ));
            }
            self.consume_digits();
        }

        if matches!(self.peek(), Some(b'e' | b'E')) {
            self.position += 1;
            if matches!(self.peek(), Some(b'+' | b'-')) {
                self.position += 1;
            }
            if !matches!(self.peek(), Some(b'0'..=b'9')) {
                return Err(JsonErrorKind::Invalid("json number has no exponent digits"));
            }
            self.consume_digits();
        }

        let token = &self.text[start..self.position];
        let value = token
            .parse::<f64>()
            .map_err(|_| JsonErrorKind::Invalid("json number is invalid"))?;
        self.allocation_budget.charge_retained(
            u64::try_from(token.len()).map_err(|_| {
                JsonErrorKind::ResourceLimit("json number length cannot be represented")
            })?,
            self.limits,
        )?;
        let mut raw =
            self.allocate_precharged_string(token.len(), "json number token allocation failed")?;
        raw.push_str(token);
        Ok(JsonValue::Number(JsonNumber::from_owned(value, raw)?))
    }

    fn charge_root_node(&mut self) -> JsonResult<()> {
        self.allocation_budget.charge_retained(
            u64::try_from(std::mem::size_of::<JsonValue>()).map_err(|_| {
                JsonErrorKind::ResourceLimit("json root node size cannot be represented")
            })?,
            self.limits,
        )
    }

    fn reserve_collection_one<T>(
        &mut self,
        values: &mut Vec<T>,
        maximum_elements: u64,
    ) -> JsonResult<()> {
        let required = values
            .len()
            .checked_add(1)
            .ok_or(JsonErrorKind::ResourceLimit(
                "json collection length overflowed",
            ))?;
        if required <= values.capacity() {
            return Ok(());
        }

        let maximum = usize::try_from(maximum_elements).unwrap_or(usize::MAX);
        let target = if values.capacity() == 0 {
            required.max(4).min(maximum)
        } else {
            values
                .capacity()
                .checked_mul(2)
                .unwrap_or(maximum)
                .max(required)
                .min(maximum)
        };
        if target < required {
            return Err(JsonErrorKind::ResourceLimit(
                "json collection member limit exceeded",
            ));
        }

        let old_bytes = allocation_size::<T>(values.capacity())?;
        let requested_bytes = allocation_size::<T>(target)?;
        // A grow may allocate the replacement before freeing the old buffer,
        // so charge the complete requested replacement while the old receipt
        // is still live. Release the old receipt only after reserve succeeds.
        self.allocation_budget
            .charge_retained(requested_bytes, self.limits)?;
        values
            .try_reserve_exact(target - values.len())
            .map_err(|_| allocation_error("json collection allocation failed"))?;
        let actual_bytes = allocation_size::<T>(values.capacity())?;
        if actual_bytes > requested_bytes {
            // `try_reserve_exact` requests `target`; an allocator-granted
            // surplus is reconciled immediately so future spare capacity is
            // still represented by the live receipt.
            self.allocation_budget
                .charge_retained(actual_bytes - requested_bytes, self.limits)?;
        }
        self.allocation_budget.release_retained(old_bytes)
    }

    fn consume_digits(&mut self) {
        while matches!(self.peek(), Some(b'0'..=b'9')) {
            self.position += 1;
        }
    }

    fn consume_literal(&mut self, literal: &[u8]) -> JsonResult<()> {
        let end = self
            .position
            .checked_add(literal.len())
            .ok_or(JsonErrorKind::Invalid("json literal is incomplete"))?;
        if self.bytes.get(self.position..end) != Some(literal) {
            return Err(JsonErrorKind::Invalid("json literal is invalid"));
        }
        self.position = end;
        Ok(())
    }

    fn skip_whitespace(&mut self) {
        while matches!(self.peek(), Some(b' ' | b'\t' | b'\r' | b'\n')) {
            self.position += 1;
        }
    }

    fn consume_if(&mut self, expected: u8) -> bool {
        if self.peek() == Some(expected) {
            self.position += 1;
            true
        } else {
            false
        }
    }

    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.position).copied()
    }
}

#[derive(Clone, Copy)]
struct StringScan {
    content_start: usize,
    content_end: usize,
    after_quote: usize,
    decoded_bytes: u64,
    decoded_utf16_code_units: u64,
}

fn canonical_data_url_payload(value: &[u8]) -> Option<&[u8]> {
    const PREFIXES: [&[u8]; 5] = [
        b"data:image/png;base64,",
        b"data:image/jpeg;base64,",
        b"data:image/webp;base64,",
        b"data:image/gif;base64,",
        b"data:image/bmp;base64,",
    ];
    PREFIXES
        .iter()
        .find_map(|prefix| value.strip_prefix(*prefix))
}

fn base64_value(value: u8) -> Option<u8> {
    match value {
        b'A'..=b'Z' => Some(value - b'A'),
        b'a'..=b'z' => Some(value - b'a' + 26),
        b'0'..=b'9' => Some(value - b'0' + 52),
        b'+' => Some(62),
        b'/' => Some(63),
        _ => None,
    }
}

fn hex_value(byte: u8) -> Option<u16> {
    match byte {
        b'0'..=b'9' => Some(u16::from(byte - b'0')),
        b'a'..=b'f' => Some(u16::from(byte - b'a') + 10),
        b'A'..=b'F' => Some(u16::from(byte - b'A') + 10),
        _ => None,
    }
}

fn charge_decoded_string_bytes(current: u64, additional: u64, maximum: u64) -> JsonResult<u64> {
    let next = current
        .checked_add(additional)
        .ok_or(JsonErrorKind::ResourceLimit(
            "json decoded string length overflowed",
        ))?;
    if next > maximum {
        return Err(JsonErrorKind::ResourceLimit(
            "json parsed string limit exceeded",
        ));
    }
    Ok(next)
}

fn charge_decoded_utf16_units(current: u64, additional: u64) -> JsonResult<u64> {
    current
        .checked_add(additional)
        .ok_or(JsonErrorKind::ResourceLimit(
            "json decoded UTF-16 string length overflowed",
        ))
}

fn enter_container(depth: u64, limits: &PackageLimits) -> JsonResult<u64> {
    if depth >= limits.json_depth {
        return Err(JsonErrorKind::ResourceLimit(
            "json nesting depth limit exceeded",
        ));
    }
    depth.checked_add(1).ok_or(JsonErrorKind::ResourceLimit(
        "json nesting depth overflowed",
    ))
}

fn validate_object_entries(
    entries: &[(String, JsonValue)],
    limits: &PackageLimits,
) -> JsonResult<()> {
    ensure_count_at_most(
        entries.len(),
        limits.json_object_properties,
        "json object property limit exceeded",
    )?;
    for (index, (key, _)) in entries.iter().enumerate() {
        validate_object_key(key, limits)?;
        if entries[..index]
            .iter()
            .any(|(candidate, _)| candidate == key)
        {
            return Err(JsonErrorKind::Invalid(
                "json object contains a duplicate key",
            ));
        }
    }
    Ok(())
}

fn validate_object_key(key: &str, limits: &PackageLimits) -> JsonResult<()> {
    let key_bytes = u64::try_from(key.len()).map_err(|_| {
        JsonErrorKind::ResourceLimit("json object key length cannot be represented")
    })?;
    if key_bytes > limits.parsed_json_string_bytes {
        return Err(JsonErrorKind::ResourceLimit(
            "json parsed string limit exceeded",
        ));
    }
    if is_prototype_pollution_key(key) {
        return Err(JsonErrorKind::Invalid(
            "json object contains a forbidden prototype key",
        ));
    }
    Ok(())
}

fn is_prototype_pollution_key(key: &str) -> bool {
    matches!(key, "__proto__" | "prototype" | "constructor")
}

fn ensure_count_below(current: usize, maximum: u64, diagnostic: &'static str) -> JsonResult<()> {
    let current = u64::try_from(current).map_err(|_| JsonErrorKind::ResourceLimit(diagnostic))?;
    if current >= maximum {
        Err(JsonErrorKind::ResourceLimit(diagnostic))
    } else {
        Ok(())
    }
}

fn ensure_count_at_most(current: usize, maximum: u64, diagnostic: &'static str) -> JsonResult<()> {
    let current = u64::try_from(current).map_err(|_| JsonErrorKind::ResourceLimit(diagnostic))?;
    if current > maximum {
        Err(JsonErrorKind::ResourceLimit(diagnostic))
    } else {
        Ok(())
    }
}

fn allocation_size<T>(capacity: usize) -> JsonResult<u64> {
    let bytes =
        capacity
            .checked_mul(std::mem::size_of::<T>())
            .ok_or(JsonErrorKind::ResourceLimit(
                "json collection allocation size overflowed",
            ))?;
    u64::try_from(bytes).map_err(|_| {
        JsonErrorKind::ResourceLimit("json collection allocation size cannot be represented")
    })
}

#[cfg(test)]
fn reserve_one<T>(values: &mut Vec<T>) -> JsonResult<()> {
    values
        .try_reserve(1)
        .map_err(|_| allocation_error("json collection allocation failed"))
}

fn allocation_error(diagnostic: &'static str) -> JsonErrorKind {
    JsonErrorKind::ResourceLimit(diagnostic)
}

#[cfg(test)]
fn clone_value(value: &JsonValue, depth: u64, limits: &PackageLimits) -> JsonResult<JsonValue> {
    match value {
        JsonValue::Null => Ok(JsonValue::Null),
        JsonValue::Bool(value) => Ok(JsonValue::Bool(*value)),
        JsonValue::Number(value) => Ok(JsonValue::Number(value.try_deep_clone()?)),
        JsonValue::String(value) => Ok(JsonValue::String(try_clone_string(value)?)),
        JsonValue::Array(values) => {
            let next_depth = enter_container(depth, limits)?;
            ensure_count_at_most(
                values.len(),
                limits.json_array_members,
                "json array member limit exceeded",
            )?;
            let mut cloned = Vec::new();
            cloned
                .try_reserve_exact(values.len())
                .map_err(|_| allocation_error("json clone allocation failed"))?;
            for child in values {
                cloned.push(clone_value(child, next_depth, limits)?);
            }
            Ok(JsonValue::Array(cloned))
        }
        JsonValue::Object(entries) => {
            let next_depth = enter_container(depth, limits)?;
            validate_object_entries(entries, limits)?;
            let mut cloned = Vec::new();
            cloned
                .try_reserve_exact(entries.len())
                .map_err(|_| allocation_error("json clone allocation failed"))?;
            for (key, child) in entries {
                cloned.push((
                    try_clone_string(key)?,
                    clone_value(child, next_depth, limits)?,
                ));
            }
            Ok(JsonValue::Object(cloned))
        }
    }
}

#[cfg(test)]
fn try_clone_string(value: &str) -> JsonResult<String> {
    let mut cloned = String::new();
    cloned
        .try_reserve_exact(value.len())
        .map_err(|_| allocation_error("json string clone allocation failed"))?;
    cloned.push_str(value);
    Ok(cloned)
}

fn measure_value_strings(
    value: &JsonValue,
    depth: u64,
    limits: &PackageLimits,
    measure: &mut JsonStringMeasure,
) -> JsonResult<()> {
    match value {
        JsonValue::String(value) => charge_string_measure(measure, value, limits),
        JsonValue::Array(values) => {
            let next_depth = enter_container(depth, limits)?;
            ensure_count_at_most(
                values.len(),
                limits.json_array_members,
                "json array member limit exceeded",
            )?;
            for child in values {
                measure_value_strings(child, next_depth, limits, measure)?;
            }
            Ok(())
        }
        JsonValue::Object(entries) => {
            let next_depth = enter_container(depth, limits)?;
            validate_object_entries(entries, limits)?;
            for (key, child) in entries {
                charge_string_measure(measure, key, limits)?;
                measure_value_strings(child, next_depth, limits, measure)?;
            }
            Ok(())
        }
        JsonValue::Number(_) => {
            measure.number_count = measure
                .number_count
                .checked_add(1)
                .ok_or(JsonErrorKind::ResourceLimit("json number count overflowed"))?;
            Ok(())
        }
        JsonValue::Null | JsonValue::Bool(_) => Ok(()),
    }
}

fn canonical_value_length(
    value: &JsonValue,
    depth: u64,
    limits: &PackageLimits,
) -> JsonResult<u64> {
    match value {
        JsonValue::Null | JsonValue::Bool(true) => Ok(4),
        JsonValue::Bool(false) => Ok(5),
        JsonValue::Number(value) => {
            if !value.as_f64().is_finite() {
                return Err(JsonErrorKind::Invalid("json number is not finite"));
            }
            let mut buffer = ryu_js::Buffer::new();
            u64::try_from(buffer.format(value.as_f64()).len()).map_err(|_| {
                JsonErrorKind::ResourceLimit("json canonical number length cannot be represented")
            })
        }
        JsonValue::String(value) => u64::try_from(canonical_string_length(value)?).map_err(|_| {
            JsonErrorKind::ResourceLimit("json canonical string length cannot be represented")
        }),
        JsonValue::Array(values) => {
            let next_depth = enter_container(depth, limits)?;
            ensure_count_at_most(
                values.len(),
                limits.json_array_members,
                "json array member limit exceeded",
            )?;
            let mut length = 2_u64;
            if !values.is_empty() {
                let separators = u64::try_from(values.len() - 1).map_err(|_| {
                    JsonErrorKind::ResourceLimit(
                        "json canonical array length cannot be represented",
                    )
                })?;
                length = length
                    .checked_add(separators)
                    .ok_or(JsonErrorKind::ResourceLimit(
                        "json canonical output length overflowed",
                    ))?;
            }
            for child in values {
                length = length
                    .checked_add(canonical_value_length(child, next_depth, limits)?)
                    .ok_or(JsonErrorKind::ResourceLimit(
                        "json canonical output length overflowed",
                    ))?;
            }
            Ok(length)
        }
        JsonValue::Object(entries) => {
            let next_depth = enter_container(depth, limits)?;
            validate_object_entries(entries, limits)?;
            let mut length = 2_u64;
            if !entries.is_empty() {
                let entry_count = u64::try_from(entries.len()).map_err(|_| {
                    JsonErrorKind::ResourceLimit(
                        "json canonical object length cannot be represented",
                    )
                })?;
                length = length
                    .checked_add(entry_count - 1)
                    .and_then(|value| value.checked_add(entry_count))
                    .ok_or(JsonErrorKind::ResourceLimit(
                        "json canonical output length overflowed",
                    ))?;
            }
            for (key, child) in entries {
                let key_length = u64::try_from(canonical_string_length(key)?).map_err(|_| {
                    JsonErrorKind::ResourceLimit(
                        "json canonical string length cannot be represented",
                    )
                })?;
                let child_length = canonical_value_length(child, next_depth, limits)?;
                length = length
                    .checked_add(key_length)
                    .and_then(|value| value.checked_add(child_length))
                    .ok_or(JsonErrorKind::ResourceLimit(
                        "json canonical output length overflowed",
                    ))?;
            }
            Ok(length)
        }
    }
}

fn charge_string_measure(
    measure: &mut JsonStringMeasure,
    value: &str,
    limits: &PackageLimits,
) -> JsonResult<()> {
    let utf8_bytes = u64::try_from(value.len()).map_err(|_| {
        JsonErrorKind::ResourceLimit("json aggregate UTF-8 string length cannot be represented")
    })?;
    let utf16_code_units = u64::try_from(value.encode_utf16().count()).map_err(|_| {
        JsonErrorKind::ResourceLimit("json aggregate UTF-16 string length cannot be represented")
    })?;
    let next_utf8 =
        measure
            .utf8_bytes
            .checked_add(utf8_bytes)
            .ok_or(JsonErrorKind::ResourceLimit(
                "json aggregate UTF-8 string length overflowed",
            ))?;
    if next_utf8 > limits.hydrated_project_string_utf8_bytes {
        return Err(JsonErrorKind::ResourceLimit(
            "json aggregate UTF-8 string limit exceeded",
        ));
    }
    let next_utf16 = measure
        .utf16_code_units
        .checked_add(utf16_code_units)
        .ok_or(JsonErrorKind::ResourceLimit(
            "json aggregate UTF-16 string length overflowed",
        ))?;
    if next_utf16 > limits.hydrated_project_string_utf16_code_units {
        return Err(JsonErrorKind::ResourceLimit(
            "json aggregate UTF-16 string limit exceeded",
        ));
    }
    measure.utf8_bytes = next_utf8;
    measure.utf16_code_units = next_utf16;
    Ok(())
}

fn write_canonical_value(
    value: &JsonValue,
    depth: u64,
    limits: &PackageLimits,
    maximum_output_bytes: u64,
    output: &mut Vec<u8>,
) -> JsonResult<()> {
    match value {
        JsonValue::Null => append_bytes(output, b"null", maximum_output_bytes),
        JsonValue::Bool(true) => append_bytes(output, b"true", maximum_output_bytes),
        JsonValue::Bool(false) => append_bytes(output, b"false", maximum_output_bytes),
        JsonValue::Number(value) => {
            if !value.as_f64().is_finite() {
                return Err(JsonErrorKind::Invalid("json number is not finite"));
            }
            let mut buffer = ryu_js::Buffer::new();
            append_bytes(
                output,
                buffer.format(value.as_f64()).as_bytes(),
                maximum_output_bytes,
            )
        }
        JsonValue::String(value) => write_canonical_string(value, output, maximum_output_bytes),
        JsonValue::Array(values) => {
            let next_depth = enter_container(depth, limits)?;
            ensure_count_at_most(
                values.len(),
                limits.json_array_members,
                "json array member limit exceeded",
            )?;
            append_byte(output, b'[', maximum_output_bytes)?;
            for (index, child) in values.iter().enumerate() {
                if index != 0 {
                    append_byte(output, b',', maximum_output_bytes)?;
                }
                write_canonical_value(child, next_depth, limits, maximum_output_bytes, output)?;
            }
            append_byte(output, b']', maximum_output_bytes)
        }
        JsonValue::Object(entries) => {
            let next_depth = enter_container(depth, limits)?;
            validate_object_entries(entries, limits)?;
            let mut order = Vec::new();
            order
                .try_reserve_exact(entries.len())
                .map_err(|_| allocation_error("json canonical key-order allocation failed"))?;
            order.extend(0..entries.len());
            order.sort_unstable_by(|left, right| {
                compare_utf16(&entries[*left].0, &entries[*right].0)
            });

            append_byte(output, b'{', maximum_output_bytes)?;
            for (position, index) in order.into_iter().enumerate() {
                if position != 0 {
                    append_byte(output, b',', maximum_output_bytes)?;
                }
                write_canonical_string(&entries[index].0, output, maximum_output_bytes)?;
                append_byte(output, b':', maximum_output_bytes)?;
                write_canonical_value(
                    &entries[index].1,
                    next_depth,
                    limits,
                    maximum_output_bytes,
                    output,
                )?;
            }
            append_byte(output, b'}', maximum_output_bytes)
        }
    }
}

fn compare_utf16(left: &str, right: &str) -> Ordering {
    let mut left_units = left.encode_utf16();
    let mut right_units = right.encode_utf16();
    loop {
        match (left_units.next(), right_units.next()) {
            (Some(left), Some(right)) => match left.cmp(&right) {
                Ordering::Equal => {}
                ordering => return ordering,
            },
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (None, None) => return Ordering::Equal,
        }
    }
}

fn write_canonical_string(
    value: &str,
    output: &mut Vec<u8>,
    maximum_output_bytes: u64,
) -> JsonResult<()> {
    let required = canonical_string_length(value)?;
    ensure_canonical_output_capacity(output, required, maximum_output_bytes)?;
    output
        .try_reserve(required)
        .map_err(|_| allocation_error("json canonical string allocation failed"))?;
    output.push(b'"');
    for character in value.chars() {
        match character {
            '"' => output.extend_from_slice(b"\\\""),
            '\\' => output.extend_from_slice(b"\\\\"),
            '\u{0008}' => output.extend_from_slice(b"\\b"),
            '\t' => output.extend_from_slice(b"\\t"),
            '\n' => output.extend_from_slice(b"\\n"),
            '\u{000c}' => output.extend_from_slice(b"\\f"),
            '\r' => output.extend_from_slice(b"\\r"),
            control if control <= '\u{001f}' => {
                let value = control as u32;
                output.extend_from_slice(b"\\u00");
                output.push(lower_hex(((value >> 4) & 0x0f) as u8));
                output.push(lower_hex((value & 0x0f) as u8));
            }
            _ => {
                let mut encoded = [0_u8; 4];
                output.extend_from_slice(character.encode_utf8(&mut encoded).as_bytes());
            }
        }
    }
    output.push(b'"');
    Ok(())
}

fn canonical_string_length(value: &str) -> JsonResult<usize> {
    let mut length = 2_usize;
    for character in value.chars() {
        let additional = match character {
            '"' | '\\' | '\u{0008}' | '\t' | '\n' | '\u{000c}' | '\r' => 2,
            control if control <= '\u{001f}' => 6,
            _ => character.len_utf8(),
        };
        length = length
            .checked_add(additional)
            .ok_or(JsonErrorKind::ResourceLimit(
                "json canonical string length overflowed",
            ))?;
    }
    Ok(length)
}

fn lower_hex(value: u8) -> u8 {
    match value {
        0..=9 => b'0' + value,
        10..=15 => b'a' + (value - 10),
        _ => unreachable!("hex nibble is always in range"),
    }
}

fn append_byte(output: &mut Vec<u8>, value: u8, maximum_output_bytes: u64) -> JsonResult<()> {
    ensure_canonical_output_capacity(output, 1, maximum_output_bytes)?;
    output
        .try_reserve(1)
        .map_err(|_| allocation_error("json canonical output allocation failed"))?;
    output.push(value);
    Ok(())
}

fn append_bytes(output: &mut Vec<u8>, value: &[u8], maximum_output_bytes: u64) -> JsonResult<()> {
    ensure_canonical_output_capacity(output, value.len(), maximum_output_bytes)?;
    output
        .try_reserve(value.len())
        .map_err(|_| allocation_error("json canonical output allocation failed"))?;
    output.extend_from_slice(value);
    Ok(())
}

fn ensure_canonical_output_capacity(
    output: &[u8],
    additional: usize,
    maximum_output_bytes: u64,
) -> JsonResult<()> {
    let current = u64::try_from(output.len()).map_err(|_| {
        JsonErrorKind::ResourceLimit("json canonical output length cannot be represented")
    })?;
    let additional = u64::try_from(additional).map_err(|_| {
        JsonErrorKind::ResourceLimit("json canonical append length cannot be represented")
    })?;
    let next = current
        .checked_add(additional)
        .ok_or(JsonErrorKind::ResourceLimit(
            "json canonical output length overflowed",
        ))?;
    if next > maximum_output_bytes {
        return Err(JsonErrorKind::ResourceLimit(
            "json canonical output limit exceeded",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn compact_limits() -> PackageLimits {
        let mut limits = PackageLimits::V1;
        limits.json_depth = 3;
        limits.parsed_json_string_bytes = 4;
        limits.json_array_members = 3;
        limits.json_object_properties = 3;
        limits
    }

    fn canonical(input: &[u8]) -> String {
        String::from_utf8(parse_json(input).unwrap().to_canonical_bytes().unwrap()).unwrap()
    }

    fn assert_invalid(input: &[u8]) {
        assert!(matches!(parse_json(input), Err(JsonErrorKind::Invalid(_))));
    }

    fn assert_resource_limited(input: &[u8], limits: &PackageLimits) {
        assert!(matches!(
            parse_json_with_limits(input, limits),
            Err(JsonErrorKind::ResourceLimit(_))
        ));
    }

    fn assert_source_resource_limited(
        input: &[u8],
        limits: &PackageLimits,
        project_kind: ProjectSourceKind,
    ) {
        assert!(matches!(
            parse_project_source_json_with_limits(input, limits, project_kind),
            Err(JsonErrorKind::ResourceLimit(_))
        ));
    }

    fn retained_bytes_for<T>(capacity: usize) -> u64 {
        u64::try_from(std::mem::size_of::<T>() * capacity).unwrap()
    }

    #[test]
    fn accounted_parser_charges_owned_tree_storage_and_releases_by_receipt() {
        let root = retained_bytes_for::<JsonValue>(1);
        let mut allocations =
            OperationAllocationLedger::new(PackageLimits::V1.decoder_working_bytes);

        let (value, receipt) =
            parse_json_accounted_with_limits(br#"{"k":1}"#, &PackageLimits::V1, &mut allocations)
                .unwrap();
        let JsonValue::Object(entries) = &value else {
            panic!("expected object");
        };
        let JsonValue::Number(number) = &entries[0].1 else {
            panic!("expected number");
        };
        let expected = root
            + retained_bytes_for::<(String, JsonValue)>(entries.capacity())
            + u64::try_from(entries[0].0.capacity()).unwrap()
            + u64::try_from(number.raw.capacity()).unwrap();
        assert_eq!(receipt, expected);
        assert_eq!(allocations.retained(), expected);
        assert_eq!(value.get("k").and_then(JsonValue::as_u64), Some(1));

        drop(value);
        allocations.release(receipt).unwrap();
        assert_eq!(allocations.retained(), 0);
    }

    #[test]
    fn string_and_number_capacity_boundaries_recover_on_the_same_ledger() {
        for input in [br#""decoded""#.as_slice(), b"123456789".as_slice()] {
            let mut probe = OperationAllocationLedger::new(PackageLimits::V1.decoder_working_bytes);
            let (value, receipt) =
                parse_json_accounted_with_limits(input, &PackageLimits::V1, &mut probe).unwrap();
            let retained_capacity = match &value {
                JsonValue::String(value) => u64::try_from(value.capacity()).unwrap(),
                JsonValue::Number(value) => u64::try_from(value.raw.capacity()).unwrap(),
                _ => panic!("fixture must retain one string allocation"),
            };
            assert_eq!(
                receipt,
                retained_bytes_for::<JsonValue>(1) + retained_capacity
            );
            let exact_peak = probe.peak();
            drop(value);
            probe.release(receipt).unwrap();
            assert_eq!(probe.retained(), 0);

            let mut exact = OperationAllocationLedger::new(exact_peak);
            let (value, receipt) =
                parse_json_accounted_with_limits(input, &PackageLimits::V1, &mut exact).unwrap();
            drop(value);
            exact.release(receipt).unwrap();
            assert_eq!(exact.retained(), 0);

            let mut one_under = OperationAllocationLedger::new(exact_peak - 1);
            assert!(matches!(
                parse_json_accounted_with_limits(input, &PackageLimits::V1, &mut one_under),
                Err(JsonErrorKind::ResourceLimit(_))
            ));
            assert_eq!(one_under.retained(), 0);

            let (recovered, recovered_receipt) =
                parse_json_accounted_with_limits(b"null", &PackageLimits::V1, &mut one_under)
                    .unwrap();
            drop(recovered);
            one_under.release(recovered_receipt).unwrap();
            assert_eq!(one_under.retained(), 0);
        }
    }

    #[test]
    fn collection_growth_precharges_replacement_and_failure_restores_shared_ledger() {
        let node = retained_bytes_for::<JsonValue>(1);
        let four_nodes = retained_bytes_for::<JsonValue>(4);
        let eight_nodes = retained_bytes_for::<JsonValue>(8);
        let growth_peak = node + four_nodes + eight_nodes;
        let final_receipt = node + eight_nodes;

        let mut exact = OperationAllocationLedger::new(growth_peak);
        let (value, receipt) = parse_json_accounted_with_limits(
            b"[null,null,null,null,null]",
            &PackageLimits::V1,
            &mut exact,
        )
        .unwrap();
        assert_eq!(receipt, final_receipt);
        assert_eq!(exact.retained(), final_receipt);
        drop(value);
        exact.release(receipt).unwrap();
        assert_eq!(exact.retained(), 0);

        let baseline = 7;
        let mut one_under = OperationAllocationLedger::new(baseline + growth_peak - 1);
        one_under.try_charge(baseline).unwrap();
        assert!(matches!(
            parse_json_accounted_with_limits(
                b"[null,null,null,null,null]",
                &PackageLimits::V1,
                &mut one_under,
            ),
            Err(JsonErrorKind::ResourceLimit(_))
        ));
        assert_eq!(one_under.retained(), baseline);

        one_under.release(baseline).unwrap();
        let (recovered, recovered_receipt) =
            parse_json_accounted_with_limits(b"[null]", &PackageLimits::V1, &mut one_under)
                .unwrap();
        drop(recovered);
        one_under.release(recovered_receipt).unwrap();
        assert_eq!(one_under.retained(), 0);
    }

    #[test]
    fn parses_all_json_value_kinds_and_insignificant_whitespace() {
        let value = parse_json(br#" { "n": null, "b": true, "f": false, "a": [0,-1.25e+2,"x"] } "#)
            .unwrap();
        assert!(value.get("n").unwrap().is_null());
        assert_eq!(value.get("b").unwrap().as_bool(), Some(true));
        assert_eq!(value.get("f").unwrap().as_bool(), Some(false));
        let array = value.get("a").unwrap().as_array().unwrap();
        assert_eq!(array[0].as_u64(), Some(0));
        assert_eq!(array[1].as_f64(), Some(-125.0));
        assert_eq!(array[2].as_str(), Some("x"));
    }

    #[test]
    fn rejects_bom_invalid_utf8_empty_and_trailing_data() {
        assert_invalid(&[0xef, 0xbb, 0xbf, b'n', b'u', b'l', b'l']);
        assert_invalid(&[b'"', 0xff, b'"']);
        assert_invalid(b"");
        assert_invalid(b"null true");
        assert_invalid("\u{feff}null".as_bytes());
    }

    #[test]
    fn filesystem_value_grammar_is_exact_and_shared() {
        for forbidden in [
            r"C:\Users\Example\asset.png",
            "c:/Users/Example/asset.png",
            r"\\server\share\asset.png",
            r"\rooted\asset.png",
            "//server/share/asset.png",
            "/home/example/asset.png",
            "file:/home/example/asset.png",
            "file:C:/Users/Example/asset.png",
            " FILE:///home/example/asset.png ",
        ] {
            assert!(is_forbidden_filesystem_value(forbidden), "{forbidden}");
        }
        for allowed in [
            "https://example.invalid/assets/asset.png",
            "http://example.invalid/C:/asset.png",
            "assets are user-provided",
            "folder/asset.png",
            "version: 1",
            "C: The Game",
            "D:relative-on-drive.png",
            "",
        ] {
            assert!(!is_forbidden_filesystem_value(allowed), "{allowed}");
        }
    }

    #[test]
    fn rejects_duplicate_keys_after_escape_decoding() {
        assert_invalid(br#"{"same":1,"same":2}"#);
        assert_invalid(br#"{"same":1,"\u0073ame":2}"#);
    }

    #[test]
    fn rejects_prototype_pollution_keys_even_when_escaped() {
        for input in [
            br#"{"__proto__":null}"#.as_slice(),
            br#"{"prototype":null}"#.as_slice(),
            br#"{"constructor":null}"#.as_slice(),
            br#"{"\u005f_proto__":null}"#.as_slice(),
        ] {
            assert_invalid(input);
        }
    }

    #[test]
    fn enforces_strict_number_grammar_and_finite_ieee_754() {
        for accepted in ["0", "-0", "1", "-1", "1.5", "1e3", "1E+3", "1e-3", "1e-400"] {
            assert!(parse_json(accepted.as_bytes()).is_ok(), "{accepted}");
        }
        for rejected in [
            "+1", "00", "01", "-01", ".1", "-.1", "1.", "1e", "1e+", "NaN", "Infinity", "1e400",
        ] {
            assert_invalid(rejected.as_bytes());
        }
    }

    #[test]
    fn preserves_number_tokens_for_plain_integer_validation() {
        let cases = [
            ("1", Some(1)),
            ("0", Some(0)),
            ("1.0", None),
            ("1e0", None),
            ("-0", None),
            ("-1", None),
            ("18446744073709551615", Some(u64::MAX)),
            ("18446744073709551616", None),
        ];
        for (input, expected) in cases {
            let value = parse_json(input.as_bytes()).unwrap();
            assert_eq!(value.as_plain_nonnegative_u64(), expected, "{input}");
            let JsonValue::Number(number) = value else {
                panic!("expected number");
            };
            assert_eq!(number.raw(), input);
        }
        assert_eq!(canonical(b"1.0"), "1");
        assert_eq!(canonical(b"1e0"), "1");
        assert_eq!(canonical(b"-0"), "0");
    }

    #[test]
    fn decodes_every_escape_and_valid_surrogate_pairs() {
        let value = parse_json(br#""\"\\\/\b\f\n\r\t\u0041\uD83D\uDE00""#).unwrap();
        assert_eq!(value.as_str(), Some("\"\\/\u{0008}\u{000c}\n\r\tA😀"));
    }

    #[test]
    fn rejects_malformed_escapes_controls_and_surrogates() {
        for input in [
            br#""\x""#.as_slice(),
            br#""\u12xz""#.as_slice(),
            br#""\uD800""#.as_slice(),
            br#""\uD800\u0041""#.as_slice(),
            br#""\uDC00""#.as_slice(),
            b"\"line\nfeed\"".as_slice(),
            b"\"unterminated".as_slice(),
        ] {
            assert_invalid(input);
        }
    }

    #[test]
    fn preflights_decoded_string_byte_limit_before_materialization() {
        let limits = compact_limits();
        assert!(parse_json_with_limits(br#""abcd""#, &limits).is_ok());
        assert_resource_limited(br#""abcde""#, &limits);
        assert!(parse_json_with_limits(br#""\u0061\u0062\u0063\u0064""#, &limits).is_ok());
        assert_resource_limited(br#""\u0061\u0062\u0063\u0064\u0065""#, &limits);
        assert!(parse_json_with_limits("\"éé\"".as_bytes(), &limits).is_ok());
        assert_resource_limited("\"ééa\"".as_bytes(), &limits);
    }

    #[test]
    fn project_source_grants_large_strings_only_to_closed_asset_leaves() {
        let mut limits = PackageLimits::V1;
        limits.parsed_json_string_bytes = 32;
        limits.hydrated_data_url_bytes = 62;
        let large = "data:image/bmp;base64,QUFBQUFBQUFB";

        let disc_asset = format!(r#"{{"background":{{"imageDataUrl":"{large}"}}}}"#);
        assert!(parse_project_source_json_with_limits(
            disc_asset.as_bytes(),
            &limits,
            ProjectSourceKind::Disc,
        )
        .is_ok());
        let at_asset_limit = format!("data:image/bmp;base64,{}", "A".repeat(40));
        let at_asset_limit = format!(r#"{{"background":{{"imageDataUrl":"{at_asset_limit}"}}}}"#);
        assert!(parse_project_source_json_with_limits(
            at_asset_limit.as_bytes(),
            &limits,
            ProjectSourceKind::Disc,
        )
        .is_ok());
        let over_asset_limit = format!("data:image/bmp;base64,{}", "A".repeat(44));
        let over_asset_limit =
            format!(r#"{{"background":{{"imageDataUrl":"{over_asset_limit}"}}}}"#);
        assert_source_resource_limited(
            over_asset_limit.as_bytes(),
            &limits,
            ProjectSourceKind::Disc,
        );

        let case_asset = format!(
            r#"{{"caseInsert":{{"templates":{{"cover":{{"artworkSlots":[{{"imageDataUrl":"{large}"}}]}}}}}}}}"#
        );
        assert!(parse_project_source_json_with_limits(
            case_asset.as_bytes(),
            &limits,
            ProjectSourceKind::CaseInsert,
        )
        .is_ok());

        for rejected in [
            format!(r#"{{"futureOwner":{{"imageDataUrl":"{large}"}}}}"#),
            format!(r#"{{"background":{{"sourceUrl":"{large}"}}}}"#),
            format!(
                r#"{{"platformMarks":{{"assets":{{"android":{{"customImageDataUrl":"{large}"}}}}}}}}"#
            ),
            format!(
                r#"{{"background":{{"imageDataUrl":"{}"}}}}"#,
                "x".repeat(33)
            ),
            r#"{"background":{"imageDataUrl":"data:image/bmp;base64,QUFBQUFBQUF="}}"#.to_owned(),
        ] {
            assert_source_resource_limited(rejected.as_bytes(), &limits, ProjectSourceKind::Disc);
        }

        assert_source_resource_limited(
            disc_asset.as_bytes(),
            &limits,
            ProjectSourceKind::CaseInsert,
        );
        assert_source_resource_limited(case_asset.as_bytes(), &limits, ProjectSourceKind::Disc);
    }

    #[test]
    fn project_source_probe_does_not_hide_oversized_kind_selectors() {
        let mut limits = PackageLimits::V1;
        limits.parsed_json_string_bytes = 14;
        for input in [
            r#"{"schemaVersion":"0.2.0-oversized","template":{"type":"disc"}}"#,
            r#"{"projectType":"discdiscdiscdisc","template":{"type":"disc"}}"#,
            r#"{"editor":{"projectType":"discdiscdiscdisc"},"template":{"type":"disc"}}"#,
            r#"{"editor":{"workspace":"discdiscdiscdisc"},"template":{"type":"disc"}}"#,
            r#"{"template":{"type":"discdiscdiscdisc"}}"#,
        ] {
            assert!(matches!(
                parse_project_source_probe_with_limits(input.as_bytes(), &limits),
                Err(JsonErrorKind::ResourceLimit(_))
            ));
        }
    }

    #[test]
    fn project_source_precharges_aggregate_utf8_and_utf16_before_retention() {
        let input = br#"["\uD83D\uDE00","\u00E9"]"#;
        let mut limits = PackageLimits::V1;
        limits.hydrated_project_string_utf8_bytes = 6;
        limits.hydrated_project_string_utf16_code_units = 3;
        assert!(
            parse_project_source_json_with_limits(input, &limits, ProjectSourceKind::Disc).is_ok()
        );

        let mut utf8_one_under = limits;
        utf8_one_under.hydrated_project_string_utf8_bytes = 5;
        assert_source_resource_limited(input, &utf8_one_under, ProjectSourceKind::Disc);

        let mut utf16_one_under = limits;
        utf16_one_under.hydrated_project_string_utf16_code_units = 2;
        assert_source_resource_limited(input, &utf16_one_under, ProjectSourceKind::Disc);
    }

    #[test]
    fn project_source_envelope_and_node_storage_use_the_operation_ceiling() {
        let input = b"[null,null]";
        let node_and_collection_bytes = u64::try_from(
            std::mem::size_of::<JsonValue>() * 3 + std::mem::size_of::<JsonValue>() * 2,
        )
        .unwrap();
        assert!(node_and_collection_bytes >= u64::try_from(input.len()).unwrap());

        let mut exact = PackageLimits::V1;
        exact.decoder_working_bytes = node_and_collection_bytes;
        assert!(
            parse_project_source_json_with_limits(input, &exact, ProjectSourceKind::Disc).is_ok()
        );

        let mut one_under = exact;
        one_under.decoder_working_bytes = node_and_collection_bytes - 1;
        assert_source_resource_limited(input, &one_under, ProjectSourceKind::Disc);

        let mut input_envelope = PackageLimits::V1;
        input_envelope.decoder_working_bytes = 3;
        assert_source_resource_limited(b"null", &input_envelope, ProjectSourceKind::Disc);
    }

    #[test]
    fn enforces_array_object_and_depth_limits_at_the_boundary() {
        let limits = compact_limits();
        assert!(parse_json_with_limits(b"[0,1,2]", &limits).is_ok());
        assert_resource_limited(b"[0,1,2,3]", &limits);
        assert!(parse_json_with_limits(br#"{"a":0,"b":1,"c":2}"#, &limits).is_ok());
        assert_resource_limited(br#"{"a":0,"b":1,"c":2,"d":3}"#, &limits);
        assert!(parse_json_with_limits(b"[[[0]]]", &limits).is_ok());
        assert_resource_limited(b"[[[[0]]]]", &limits);
    }

    #[test]
    fn rejects_structural_json_errors() {
        for input in [
            b"[1,]".as_slice(),
            b"[1 2]".as_slice(),
            br#"{"a":1,}"#.as_slice(),
            br#"{"a" 1}"#.as_slice(),
            br#"{a:1}"#.as_slice(),
            b"tru".as_slice(),
            b"\x0bnull".as_slice(),
        ] {
            assert_invalid(input);
        }
    }

    #[test]
    fn emits_the_rfc_8785_canonicalization_example() {
        let input = br#"{
          "numbers": [333333333.33333329, 1E30, 4.50, 2e-3, 0.000000000000000000000000001],
          "string": "\u20ac$\u000f\nA'B\"\\\\\"/",
          "literals": [null, true, false]
        }"#;
        assert_eq!(
            canonical(input),
            "{\"literals\":[null,true,false],\"numbers\":[333333333.3333333,1e+30,4.5,0.002,1e-27],\"string\":\"€$\\u000f\\nA'B\\\"\\\\\\\\\\\"/\"}"
        );
    }

    #[test]
    fn orders_object_keys_by_utf16_code_units() {
        let input =
            br#"{"\ufb33":1,"\ud83d\ude00":2,"\u20ac":3,"\r":4,"1":5,"\u0080":6,"\u00f6":7}"#;
        assert_eq!(
            canonical(input),
            "{\"\\r\":4,\"1\":5,\"\u{0080}\":6,\"ö\":7,\"€\":3,\"😀\":2,\"דּ\":1}"
        );
    }

    #[test]
    fn emits_ecmascript_number_boundaries_with_ryu_js() {
        let cases = [
            (0.0, "0"),
            (-0.0, "0"),
            (f64::from_bits(1), "5e-324"),
            (f64::MAX, "1.7976931348623157e+308"),
            (1e-6, "0.000001"),
            (1e-7, "1e-7"),
            (1e20, "100000000000000000000"),
            (1e21, "1e+21"),
        ];
        for (value, expected) in cases {
            assert_eq!(
                String::from_utf8(
                    JsonValue::number(value)
                        .unwrap()
                        .to_canonical_bytes()
                        .unwrap()
                )
                .unwrap(),
                expected
            );
        }
        assert!(JsonValue::number(f64::NAN).is_err());
        assert!(JsonValue::number(f64::INFINITY).is_err());
    }

    #[test]
    fn canonical_string_escaping_is_minimal_and_lowercase() {
        let value =
            JsonValue::String("\u{0000}\u{0008}\t\n\u{000c}\r\"\\/\u{001f}\u{2028}".to_owned());
        assert_eq!(
            String::from_utf8(value.to_canonical_bytes().unwrap()).unwrap(),
            "\"\\u0000\\b\\t\\n\\f\\r\\\"\\\\/\\u001f\u{2028}\""
        );
    }

    #[test]
    fn getters_and_checked_mutators_preserve_object_invariants() {
        let mut value = JsonValue::object(vec![("a".to_owned(), JsonValue::Null)]).unwrap();
        value
            .insert_unique("b".to_owned(), JsonValue::Bool(true))
            .unwrap();
        assert_eq!(value.get("b").and_then(JsonValue::as_bool), Some(true));
        assert!(value
            .insert_unique("b".to_owned(), JsonValue::Null)
            .is_err());
        assert!(value
            .insert_unique("__proto__".to_owned(), JsonValue::Null)
            .is_err());
        let old = value
            .replace_existing("a", JsonValue::String("changed".to_owned()))
            .unwrap();
        assert!(old.is_null());
        assert_eq!(
            value.remove("b").and_then(|child| child.as_bool()),
            Some(true)
        );

        let mut array = JsonValue::array(vec![JsonValue::Null]).unwrap();
        array.push(JsonValue::Bool(false)).unwrap();
        *array.get_index_mut(0).unwrap() = JsonValue::Bool(true);
        assert_eq!(array.get_index(0).and_then(JsonValue::as_bool), Some(true));
    }

    #[test]
    fn deep_clone_is_owned_and_mutation_isolated() {
        let original = parse_json(br#"{"nested":["value"]}"#).unwrap();
        let mut cloned = original.try_deep_clone().unwrap();
        *cloned.get_mut("nested").unwrap().get_index_mut(0).unwrap() =
            JsonValue::String("changed".to_owned());
        assert_eq!(
            original
                .get("nested")
                .unwrap()
                .get_index(0)
                .unwrap()
                .as_str(),
            Some("value")
        );
        assert_eq!(
            cloned.get("nested").unwrap().get_index(0).unwrap().as_str(),
            Some("changed")
        );
    }

    #[test]
    fn aggregate_string_measure_counts_keys_values_and_utf16_units() {
        let value = parse_json("{\"😀\":\"é\",\"x\":\"😀\"}".as_bytes()).unwrap();
        assert_eq!(
            value.measure_strings().unwrap(),
            JsonStringMeasure {
                utf8_bytes: 11,
                utf16_code_units: 6,
                number_count: 0,
            }
        );
    }

    #[test]
    fn aggregate_string_measure_enforces_both_hydration_budgets() {
        let value = parse_json("{\"k\":\"😀\"}".as_bytes()).unwrap();
        let mut utf8_limits = PackageLimits::V1;
        utf8_limits.hydrated_project_string_utf8_bytes = 4;
        assert!(matches!(
            value.measure_strings_with_limits(&utf8_limits),
            Err(JsonErrorKind::ResourceLimit(_))
        ));

        let mut utf16_limits = PackageLimits::V1;
        utf16_limits.hydrated_project_string_utf16_code_units = 2;
        assert!(matches!(
            value.measure_strings_with_limits(&utf16_limits),
            Err(JsonErrorKind::ResourceLimit(_))
        ));
    }

    #[test]
    fn canonicalization_does_not_change_stored_object_order() {
        let value = parse_json(br#"{"z":0,"a":1}"#).unwrap();
        assert_eq!(canonical(br#"{"z":0,"a":1}"#), "{\"a\":1,\"z\":0}");
        let keys: Vec<&str> = value
            .as_object_entries()
            .unwrap()
            .iter()
            .map(|(key, _)| key.as_str())
            .collect();
        assert_eq!(keys, vec!["z", "a"]);
    }

    #[test]
    fn canonical_output_limit_accepts_exact_boundary_and_rejects_before_one_over_append() {
        let value = parse_json(br#"{"escaped":"line\nvalue","number":42}"#).unwrap();
        let canonical = value.to_canonical_bytes().unwrap();
        let exact = u64::try_from(canonical.len()).unwrap();
        assert_eq!(
            value
                .to_canonical_bytes_bounded_with_limits(&PackageLimits::V1, exact)
                .unwrap(),
            canonical
        );
        assert!(matches!(
            value.to_canonical_bytes_bounded_with_limits(&PackageLimits::V1, exact - 1),
            Err(JsonErrorKind::ResourceLimit(_))
        ));
        assert_eq!(
            value
                .to_canonical_bytes_precharged_with_limits(&PackageLimits::V1, exact)
                .unwrap(),
            canonical
        );
        assert!(matches!(
            value.to_canonical_bytes_precharged_with_limits(&PackageLimits::V1, exact - 1),
            Err(JsonErrorKind::ResourceLimit(_))
        ));
    }

    #[test]
    fn production_json_budget_constants_match_the_v1_contract() {
        assert_eq!(PackageLimits::V1.json_depth, 64);
        assert_eq!(PackageLimits::V1.parsed_json_string_bytes, 1_048_576);
        assert_eq!(PackageLimits::V1.json_array_members, 4_096);
        assert_eq!(PackageLimits::V1.json_object_properties, 4_096);
    }

    #[test]
    fn json_error_exposes_only_static_classification_and_diagnostic() {
        let error = parse_json(br#"{"a":1,"a":2}"#).unwrap_err();
        assert!(!error.is_resource_limit());
        assert_eq!(error.diagnostic(), "json object contains a duplicate key");
    }
}
