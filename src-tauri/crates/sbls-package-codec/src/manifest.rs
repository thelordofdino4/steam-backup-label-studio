//! Closed, typed `manifest.json` version 1 model.
//!
//! Parsing deliberately separates package identity/version recognition from
//! the closed v1 field validation that follows it. The archive owner has
//! already bounded and structurally located `manifest.json` before calling
//! this module.

use crate::error::{FailureCode, FailureStage, ProjectPackageFailure};
use crate::json::{parse_json_accounted_with_limits, JsonErrorKind, JsonValue};
use crate::limits::{
    OperationAllocationLedger, PackageLimits, MAX_ASSETS, MAX_ASSET_BYTES, MAX_BINDINGS,
    MAX_BINDING_POINTER_BYTES, MAX_CREATED_BY_APPLICATION_BYTES, MAX_CREATED_BY_VERSION_BYTES,
    MAX_IMAGE_DIMENSION, MAX_MANIFEST_BYTES, MAX_PROJECT_BYTES, MAX_PROJECT_SCHEMA_VERSION_BYTES,
    MIN_PROJECT_BYTES,
};
use crate::model::PackageCreator;
use crate::raster::RasterMime;
use crate::registry::ProjectSchemaVersion;

pub(crate) const PACKAGE_FORMAT: &str = "sbls/project-package";
pub(crate) const PACKAGE_VERSION: u32 = 1;
pub(crate) const PROJECT_ENTRY_PATH: &str = "project.json";
const ASSET_PATH_PREFIX: &str = "assets/sha256/";
const ASSET_ID_PREFIX: &str = "sha256:";

fn failure(code: FailureCode) -> ProjectPackageFailure {
    ProjectPackageFailure::new(code, FailureStage::Manifest)
}

fn manifest_invalid() -> ProjectPackageFailure {
    failure(FailureCode::ManifestInvalid)
}

fn project_schema_disagreement() -> ProjectPackageFailure {
    ProjectPackageFailure::new(FailureCode::ManifestInvalid, FailureStage::Project)
}

fn hydrated_json_invalid() -> ProjectPackageFailure {
    ProjectPackageFailure::new(FailureCode::HydratedJsonInvalid, FailureStage::Project)
}

fn resource_limit() -> ProjectPackageFailure {
    ProjectPackageFailure::resource_limit(FailureStage::Manifest)
}

fn asset_digest_mismatch() -> ProjectPackageFailure {
    failure(FailureCode::AssetDigestMismatch)
}

fn asset_type_invalid() -> ProjectPackageFailure {
    failure(FailureCode::AssetTypeInvalid)
}

fn asset_type_unsupported() -> ProjectPackageFailure {
    failure(FailureCode::AssetTypeUnsupported)
}

fn asset_dimensions_invalid() -> ProjectPackageFailure {
    failure(FailureCode::AssetDimensionsInvalid)
}

fn map_json_error(error: JsonErrorKind) -> ProjectPackageFailure {
    if error.is_resource_limit() {
        resource_limit()
    } else {
        manifest_invalid()
    }
}

/// Exact SHA-256 value used by project and asset manifest records.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub(crate) struct Sha256Digest([u8; 32]);

impl Sha256Digest {
    pub(crate) const fn from_bytes(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }

    pub(crate) const fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }

    pub(crate) fn parse_lower_hex(value: &str) -> Result<Self, ProjectPackageFailure> {
        let bytes = value.as_bytes();
        if bytes.len() != 64 || !bytes.iter().all(u8::is_ascii_hexdigit) {
            return Err(manifest_invalid());
        }
        if bytes.iter().any(|byte| matches!(byte, b'A'..=b'F')) {
            return Err(manifest_invalid());
        }

        let mut digest = [0_u8; 32];
        for (index, pair) in bytes.chunks_exact(2).enumerate() {
            digest[index] = (hex_nibble(pair[0])? << 4) | hex_nibble(pair[1])?;
        }
        Ok(Self(digest))
    }

    #[cfg(test)]
    pub(crate) fn try_to_lower_hex(self) -> Result<String, ProjectPackageFailure> {
        let mut result = String::new();
        result.try_reserve_exact(64).map_err(|_| resource_limit())?;
        push_digest_hex(&mut result, self);
        Ok(result)
    }

    #[cfg(test)]
    pub(crate) fn to_lower_hex(self) -> String {
        self.try_to_lower_hex().expect("test digest allocation")
    }

    pub(crate) fn try_asset_id(self) -> Result<String, ProjectPackageFailure> {
        let length = ASSET_ID_PREFIX
            .len()
            .checked_add(64)
            .ok_or_else(resource_limit)?;
        let mut result = String::new();
        result
            .try_reserve_exact(length)
            .map_err(|_| resource_limit())?;
        result.push_str(ASSET_ID_PREFIX);
        push_digest_hex(&mut result, self);
        Ok(result)
    }

    #[cfg(test)]
    pub(crate) fn asset_id(self) -> String {
        self.try_asset_id().expect("test asset ID allocation")
    }

    pub(crate) fn try_asset_path(
        self,
        mime_type: RasterMime,
    ) -> Result<String, ProjectPackageFailure> {
        let length = ASSET_PATH_PREFIX
            .len()
            .checked_add(64)
            .and_then(|length| length.checked_add(mime_type.extension().len()))
            .ok_or_else(resource_limit)?;
        let mut result = String::new();
        result
            .try_reserve_exact(length)
            .map_err(|_| resource_limit())?;
        result.push_str(ASSET_PATH_PREFIX);
        push_digest_hex(&mut result, self);
        result.push_str(mime_type.extension());
        Ok(result)
    }

    #[cfg(test)]
    pub(crate) fn asset_path(self, mime_type: RasterMime) -> String {
        self.try_asset_path(mime_type)
            .expect("test asset path allocation")
    }
}

fn push_digest_hex(output: &mut String, digest: Sha256Digest) {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    for byte in digest.0 {
        output.push(char::from(HEX[usize::from(byte >> 4)]));
        output.push(char::from(HEX[usize::from(byte & 0x0f)]));
    }
}

fn hex_nibble(byte: u8) -> Result<u8, ProjectPackageFailure> {
    match byte {
        b'0'..=b'9' => Ok(byte - b'0'),
        b'a'..=b'f' => Ok(byte - b'a' + 10),
        _ => Err(manifest_invalid()),
    }
}

/// Exact `project` record from manifest v1.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ProjectEntry {
    byte_length: u64,
    sha256: Sha256Digest,
}

impl ProjectEntry {
    pub(crate) fn new(
        byte_length: u64,
        sha256: Sha256Digest,
    ) -> Result<Self, ProjectPackageFailure> {
        if byte_length < MIN_PROJECT_BYTES {
            return Err(manifest_invalid());
        }
        if byte_length > MAX_PROJECT_BYTES {
            return Err(resource_limit());
        }
        Ok(Self {
            byte_length,
            sha256,
        })
    }

    pub(crate) const fn byte_length(&self) -> u64 {
        self.byte_length
    }

    pub(crate) const fn sha256(&self) -> Sha256Digest {
        self.sha256
    }
}

/// One exact content-addressed raster record.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct AssetRecord {
    sha256: Sha256Digest,
    mime_type: RasterMime,
    byte_length: u64,
    width: u32,
    height: u32,
}

impl AssetRecord {
    pub(crate) fn new(
        sha256: Sha256Digest,
        mime_type: RasterMime,
        byte_length: u64,
        width: u32,
        height: u32,
    ) -> Result<Self, ProjectPackageFailure> {
        if byte_length > MAX_ASSET_BYTES
            || u64::from(width) > MAX_IMAGE_DIMENSION
            || u64::from(height) > MAX_IMAGE_DIMENSION
        {
            return Err(resource_limit());
        }
        if byte_length == 0 {
            return Err(manifest_invalid());
        }
        if width == 0 || height == 0 {
            return Err(asset_dimensions_invalid());
        }
        Ok(Self {
            sha256,
            mime_type,
            byte_length,
            width,
            height,
        })
    }

    #[cfg(test)]
    pub(crate) fn try_id(&self) -> Result<String, ProjectPackageFailure> {
        self.sha256.try_asset_id()
    }

    #[cfg(test)]
    pub(crate) fn id(&self) -> String {
        self.try_id().expect("test asset ID allocation")
    }

    pub(crate) fn try_path(&self) -> Result<String, ProjectPackageFailure> {
        self.sha256.try_asset_path(self.mime_type)
    }

    #[cfg(test)]
    pub(crate) fn path(&self) -> String {
        self.try_path().expect("test asset path allocation")
    }

    pub(crate) const fn sha256(&self) -> Sha256Digest {
        self.sha256
    }

    pub(crate) const fn mime_type(&self) -> RasterMime {
        self.mime_type
    }

    pub(crate) const fn byte_length(&self) -> u64 {
        self.byte_length
    }

    pub(crate) const fn width(&self) -> u32 {
        self.width
    }

    pub(crate) const fn height(&self) -> u32 {
        self.height
    }
}

/// One exact concrete JSON Pointer to content-addressed asset binding.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct BindingRecord {
    pointer: String,
    asset_id: String,
}

impl BindingRecord {
    #[cfg(test)]
    pub(crate) fn try_new(pointer: &str, asset_id: &str) -> Result<Self, ProjectPackageFailure> {
        validate_binding_pointer(pointer)?;
        parse_asset_id(asset_id).map_err(|_| failure(FailureCode::BindingInvalid))?;
        let pointer = try_copy_manifest_string(pointer)?;
        let asset_id = try_copy_manifest_string(asset_id)?;
        Ok(Self { pointer, asset_id })
    }

    /// Capture already bounded, closed manifest fields without assigning
    /// binding-stage semantics during manifest parsing. The decoder validates
    /// reachability/conflicts before calling [`Self::validate`].
    fn from_manifest_fields(pointer: String, asset_id: String) -> Self {
        Self { pointer, asset_id }
    }

    pub(crate) fn from_digest(
        pointer: String,
        digest: Sha256Digest,
    ) -> Result<Self, ProjectPackageFailure> {
        validate_binding_pointer(&pointer)?;
        let asset_id = digest.try_asset_id()?;
        Ok(Self { pointer, asset_id })
    }

    pub(crate) fn pointer(&self) -> &str {
        &self.pointer
    }

    pub(crate) fn validate(&self) -> Result<(), ProjectPackageFailure> {
        validate_binding_pointer(&self.pointer)?;
        parse_asset_id(&self.asset_id).map_err(|_| failure(FailureCode::BindingInvalid))?;
        Ok(())
    }

    pub(crate) fn parsed_asset_digest(&self) -> Option<Sha256Digest> {
        parse_asset_id(&self.asset_id).ok()
    }

    pub(crate) fn asset_digest(&self) -> Sha256Digest {
        // Construction and parsing both validate this invariant.
        parse_asset_id(&self.asset_id).expect("validated binding asset ID")
    }
}

fn parse_asset_id(value: &str) -> Result<Sha256Digest, ProjectPackageFailure> {
    let digest = value
        .strip_prefix(ASSET_ID_PREFIX)
        .ok_or_else(manifest_invalid)?;
    Sha256Digest::parse_lower_hex(digest)
}

fn validate_binding_pointer(pointer: &str) -> Result<(), ProjectPackageFailure> {
    if u64::try_from(pointer.len()).map_err(|_| resource_limit())? > MAX_BINDING_POINTER_BYTES {
        return Err(resource_limit());
    }
    if !pointer.starts_with('/') {
        return Err(failure(FailureCode::BindingInvalid));
    }

    for segment in pointer[1..].split('/') {
        if segment.is_empty() || matches!(segment, "__proto__" | "prototype" | "constructor") {
            return Err(failure(FailureCode::BindingInvalid));
        }

        let mut bytes = segment.bytes();
        while let Some(byte) = bytes.next() {
            if byte == b'~' && !matches!(bytes.next(), Some(b'0' | b'1')) {
                return Err(failure(FailureCode::BindingInvalid));
            }
        }
    }
    Ok(())
}

/// Fully validated closed manifest v1.
#[cfg_attr(test, derive(Clone))]
#[derive(Debug, Eq, PartialEq)]
pub(crate) struct ManifestV1 {
    project_schema_version: String,
    creator: PackageCreator,
    project: ProjectEntry,
    assets: Vec<AssetRecord>,
    bindings: Vec<BindingRecord>,
}

impl ManifestV1 {
    /// Constructs canonical writer state. Record arrays are sorted here so a
    /// caller cannot accidentally make canonical bytes depend on traversal
    /// order; duplicate and reachability checks remain strict.
    pub(crate) fn new(
        project_schema_version: impl Into<String>,
        creator: PackageCreator,
        project: ProjectEntry,
        mut assets: Vec<AssetRecord>,
        mut bindings: Vec<BindingRecord>,
    ) -> Result<Self, ProjectPackageFailure> {
        let project_schema_version = project_schema_version.into();
        validate_schema_version_syntax(&project_schema_version)?;
        validate_creator(&creator, true)?;

        if u64::try_from(assets.len()).map_err(|_| resource_limit())? > MAX_ASSETS
            || u64::try_from(bindings.len()).map_err(|_| resource_limit())? > MAX_BINDINGS
        {
            return Err(resource_limit());
        }

        assets.sort_unstable_by(|left, right| {
            left.sha256
                .cmp(&right.sha256)
                .then_with(|| left.mime_type.extension().cmp(right.mime_type.extension()))
        });
        bindings.sort_unstable_by(|left, right| {
            left.pointer
                .cmp(&right.pointer)
                .then_with(|| left.asset_id.cmp(&right.asset_id))
        });
        validate_asset_and_binding_graph(&assets, &bindings)?;

        Ok(Self {
            project_schema_version,
            creator,
            project,
            assets,
            bindings,
        })
    }

    #[cfg(test)]
    pub(crate) const fn creator(&self) -> &PackageCreator {
        &self.creator
    }

    pub(crate) const fn project(&self) -> &ProjectEntry {
        &self.project
    }

    pub(crate) fn assets(&self) -> &[AssetRecord] {
        &self.assets
    }

    pub(crate) fn bindings(&self) -> &[BindingRecord] {
        &self.bindings
    }

    /// Consume transport-only state after validation while moving the small
    /// metadata values needed by the public decode result. Asset and binding
    /// records are dropped here instead of remaining live across hydrated JSON
    /// serialization.
    pub(crate) fn into_decoded_metadata_parts(self) -> (u32, String, PackageCreator, usize, usize) {
        let Self {
            project_schema_version,
            creator,
            project: _,
            assets,
            bindings,
        } = self;
        let asset_count = assets.len();
        let binding_count = bindings.len();
        drop(assets);
        drop(bindings);
        (
            PACKAGE_VERSION,
            project_schema_version,
            creator,
            asset_count,
            binding_count,
        )
    }

    /// Schema support is intentionally separate from manifest syntax and
    /// package-version recognition.
    pub(crate) fn supported_schema_version(
        &self,
    ) -> Result<ProjectSchemaVersion, ProjectPackageFailure> {
        ProjectSchemaVersion::parse(&self.project_schema_version).map_err(|_| {
            ProjectPackageFailure::new(FailureCode::ProjectSchemaUnsupported, FailureStage::Project)
        })
    }

    /// Projection-level `/schemaVersion` must agree before any binding or
    /// hydration work begins. Support is checked separately.
    pub(crate) fn require_project_schema_agreement(
        &self,
        projection_schema_version: &str,
    ) -> Result<(), ProjectPackageFailure> {
        if self.project_schema_version == projection_schema_version {
            Ok(())
        } else {
            Err(project_schema_disagreement())
        }
    }

    pub(crate) fn require_projection_schema_agreement(
        &self,
        projection: &JsonValue,
    ) -> Result<(), ProjectPackageFailure> {
        let schema_version = projection
            .get("schemaVersion")
            .and_then(JsonValue::as_str)
            .ok_or_else(hydrated_json_invalid)?;
        self.require_project_schema_agreement(schema_version)
    }

    pub(crate) fn to_canonical_bytes(&self) -> Result<Vec<u8>, ProjectPackageFailure> {
        self.to_canonical_bytes_with_limit(MAX_MANIFEST_BYTES)
    }

    fn to_canonical_bytes_with_limit(
        &self,
        maximum_output_bytes: u64,
    ) -> Result<Vec<u8>, ProjectPackageFailure> {
        let mut writer = ManifestWriter::new(maximum_output_bytes)?;
        writer.append(b"{\"assets\":[")?;
        for (index, asset) in self.assets.iter().enumerate() {
            writer.separator(index)?;
            writer.write_asset(asset)?;
        }
        writer.append(b"],\"bindings\":[")?;
        for (index, binding) in self.bindings.iter().enumerate() {
            writer.separator(index)?;
            writer.write_binding(binding)?;
        }
        writer.append(b"],\"createdBy\":{\"application\":")?;
        writer.write_json_string(self.creator.application())?;
        writer.append(b",\"version\":")?;
        writer.write_json_string(self.creator.version())?;
        writer.append(b"},\"format\":\"sbls/project-package\",\"packageVersion\":1,\"project\":{\"byteLength\":")?;
        writer.write_u64(self.project.byte_length)?;
        writer.append(b",\"path\":\"project.json\",\"sha256\":")?;
        writer.write_digest_string(self.project.sha256)?;
        writer.append(b"},\"projectSchemaVersion\":")?;
        writer.write_json_string(&self.project_schema_version)?;
        writer.append(b"}")?;
        Ok(writer.finish())
    }
}

struct ManifestWriter {
    bytes: Vec<u8>,
    maximum: usize,
}

impl ManifestWriter {
    fn new(maximum: u64) -> Result<Self, ProjectPackageFailure> {
        Ok(Self {
            bytes: Vec::new(),
            maximum: usize::try_from(maximum).map_err(|_| resource_limit())?,
        })
    }

    fn finish(self) -> Vec<u8> {
        self.bytes
    }

    fn append(&mut self, value: &[u8]) -> Result<(), ProjectPackageFailure> {
        let next_length = self
            .bytes
            .len()
            .checked_add(value.len())
            .filter(|length| *length <= self.maximum)
            .ok_or_else(resource_limit)?;
        if next_length > self.bytes.capacity() {
            // Grow geometrically but never request capacity beyond the logical
            // manifest ceiling. This keeps 4,096-binding emission linear while
            // retaining a fallible, pre-append allocation boundary.
            let doubled = self
                .bytes
                .capacity()
                .max(64)
                .saturating_mul(2)
                .min(self.maximum);
            let desired = next_length.max(doubled);
            let additional = desired - self.bytes.len();
            self.bytes
                .try_reserve_exact(additional)
                .map_err(|_| resource_limit())?;
        }
        self.bytes.extend_from_slice(value);
        Ok(())
    }

    fn separator(&mut self, index: usize) -> Result<(), ProjectPackageFailure> {
        if index != 0 {
            self.append(b",")?;
        }
        Ok(())
    }

    fn write_u64(&mut self, mut value: u64) -> Result<(), ProjectPackageFailure> {
        let mut digits = [0_u8; 20];
        let mut start = digits.len();
        loop {
            start -= 1;
            digits[start] = b'0' + (value % 10) as u8;
            value /= 10;
            if value == 0 {
                break;
            }
        }
        self.append(&digits[start..])
    }

    fn write_json_string(&mut self, value: &str) -> Result<(), ProjectPackageFailure> {
        self.append(b"\"")?;
        let bytes = value.as_bytes();
        let mut run_start = 0usize;
        for (index, byte) in bytes.iter().copied().enumerate() {
            let escape: Option<&[u8]> = match byte {
                b'\"' => Some(b"\\\""),
                b'\\' => Some(b"\\\\"),
                0x08 => Some(b"\\b"),
                0x09 => Some(b"\\t"),
                0x0a => Some(b"\\n"),
                0x0c => Some(b"\\f"),
                0x0d => Some(b"\\r"),
                0x00..=0x1f => None,
                _ => continue,
            };
            self.append(&bytes[run_start..index])?;
            if let Some(escape) = escape {
                self.append(escape)?;
            } else {
                const HEX: &[u8; 16] = b"0123456789abcdef";
                let encoded = [
                    b'\\',
                    b'u',
                    b'0',
                    b'0',
                    HEX[usize::from(byte >> 4)],
                    HEX[usize::from(byte & 0x0f)],
                ];
                self.append(&encoded)?;
            }
            run_start = index + 1;
        }
        self.append(&bytes[run_start..])?;
        self.append(b"\"")
    }

    fn write_digest_string(&mut self, digest: Sha256Digest) -> Result<(), ProjectPackageFailure> {
        self.append(b"\"")?;
        self.write_digest(digest)?;
        self.append(b"\"")
    }

    fn write_digest(&mut self, digest: Sha256Digest) -> Result<(), ProjectPackageFailure> {
        const HEX: &[u8; 16] = b"0123456789abcdef";
        let mut encoded = [0_u8; 64];
        for (index, byte) in digest.0.into_iter().enumerate() {
            encoded[index * 2] = HEX[usize::from(byte >> 4)];
            encoded[index * 2 + 1] = HEX[usize::from(byte & 0x0f)];
        }
        self.append(&encoded)
    }

    fn write_asset(&mut self, asset: &AssetRecord) -> Result<(), ProjectPackageFailure> {
        self.append(b"{\"byteLength\":")?;
        self.write_u64(asset.byte_length)?;
        self.append(b",\"height\":")?;
        self.write_u64(u64::from(asset.height))?;
        self.append(b",\"id\":\"sha256:")?;
        self.write_digest(asset.sha256)?;
        self.append(b"\",\"mimeType\":")?;
        self.write_json_string(asset.mime_type.as_str())?;
        self.append(b",\"path\":\"assets/sha256/")?;
        self.write_digest(asset.sha256)?;
        self.append(asset.mime_type.extension().as_bytes())?;
        self.append(b"\",\"sha256\":")?;
        self.write_digest_string(asset.sha256)?;
        self.append(b",\"width\":")?;
        self.write_u64(u64::from(asset.width))?;
        self.append(b"}")
    }

    fn write_binding(&mut self, binding: &BindingRecord) -> Result<(), ProjectPackageFailure> {
        self.append(b"{\"assetId\":")?;
        self.write_json_string(&binding.asset_id)?;
        self.append(b",\"pointer\":")?;
        self.write_json_string(&binding.pointer)?;
        self.append(b"}")
    }
}

/// Strictly parses raw bounded `manifest.json` bytes. Identity and version are
/// classified before the closed v1 schema so future fields cannot be reported
/// as an unknown v1 field.
#[cfg(test)]
pub(crate) fn parse_manifest(bytes: &[u8]) -> Result<ManifestV1, ProjectPackageFailure> {
    let limits = PackageLimits::V1;
    let mut allocations = OperationAllocationLedger::new(limits.decoder_working_bytes);
    parse_manifest_accounted_with_limits(bytes, &limits, &mut allocations)
        .map(|(manifest, _)| manifest)
}

/// Parses a manifest while keeping its retained heap graph charged to the
/// caller's operation ledger. The returned receipt belongs to `ManifestV1` and
/// must be released only after that graph is dropped or transferred to another
/// precharged owner.
pub(crate) fn parse_manifest_accounted_with_limits(
    bytes: &[u8],
    limits: &PackageLimits,
    allocations: &mut OperationAllocationLedger,
) -> Result<(ManifestV1, u64), ProjectPackageFailure> {
    if u64::try_from(bytes.len()).map_or(true, |length| length > limits.manifest_bytes) {
        return Err(resource_limit());
    }
    let (value, json_charge) =
        parse_json_accounted_with_limits(bytes, limits, allocations).map_err(map_json_error)?;

    let result = parse_manifest_value(&value, allocations);
    drop(value);
    allocations
        .release(json_charge)
        .map_err(|_| resource_limit())?;
    result
}

fn parse_manifest_value(
    value: &JsonValue,
    allocations: &mut OperationAllocationLedger,
) -> Result<(ManifestV1, u64), ProjectPackageFailure> {
    if value.get("format").and_then(JsonValue::as_str) != Some(PACKAGE_FORMAT) {
        return Err(failure(FailureCode::FormatUnsupported));
    }

    let package_version = value
        .get("packageVersion")
        .and_then(JsonValue::as_plain_nonnegative_u64);
    if package_version != Some(u64::from(PACKAGE_VERSION)) {
        return Err(failure(FailureCode::PackageVersionUnsupported));
    }

    let root = value.as_object_entries().ok_or_else(manifest_invalid)?;
    require_exact_fields(
        root,
        &[
            "assets",
            "bindings",
            "createdBy",
            "format",
            "packageVersion",
            "project",
            "projectSchemaVersion",
        ],
    )?;
    check_manifest_declared_budgets(value)?;

    let manifest_charge = measure_manifest_retained_allocations(value)?;
    allocations
        .try_charge(manifest_charge)
        .map_err(|_| resource_limit())?;

    let result = build_manifest_value(value);
    if result.is_err() {
        allocations
            .release(manifest_charge)
            .map_err(|_| resource_limit())?;
    }
    result.map(|manifest| (manifest, manifest_charge))
}

fn build_manifest_value(value: &JsonValue) -> Result<ManifestV1, ProjectPackageFailure> {
    let project_schema_version =
        try_copy_manifest_string(require_string(value, "projectSchemaVersion")?)?;
    validate_schema_version_syntax(&project_schema_version)?;
    let creator = parse_creator(require_field(value, "createdBy")?)?;
    let project = parse_project(require_field(value, "project")?)?;
    let assets = parse_assets(require_field(value, "assets")?)?;
    let bindings = parse_bindings(require_field(value, "bindings")?)?;
    validate_unique_assets(&assets)?;

    Ok(ManifestV1 {
        project_schema_version,
        creator,
        project,
        assets,
        bindings,
    })
}

fn measure_manifest_retained_allocations(value: &JsonValue) -> Result<u64, ProjectPackageFailure> {
    let mut total = 0_u64;

    if let Some(schema) = value
        .get("projectSchemaVersion")
        .and_then(JsonValue::as_str)
    {
        charge_manifest_string(&mut total, schema)?;
    }
    if let Some(creator) = value.get("createdBy") {
        for field in ["application", "version"] {
            if let Some(component) = creator.get(field).and_then(JsonValue::as_str) {
                charge_manifest_string(&mut total, component)?;
            }
        }
    }

    if let Some(assets) = value.get("assets").and_then(JsonValue::as_array) {
        charge_manifest_vec::<AssetRecord>(&mut total, assets.len())?;
    }
    if let Some(bindings) = value.get("bindings").and_then(JsonValue::as_array) {
        charge_manifest_vec::<BindingRecord>(&mut total, bindings.len())?;
        for binding in bindings {
            for field in ["pointer", "assetId"] {
                if let Some(component) = binding.get(field).and_then(JsonValue::as_str) {
                    charge_manifest_string(&mut total, component)?;
                }
            }
        }
    }

    Ok(total)
}

fn charge_manifest_string(total: &mut u64, value: &str) -> Result<(), ProjectPackageFailure> {
    let length = u64::try_from(value.len()).map_err(|_| resource_limit())?;
    *total = total.checked_add(length).ok_or_else(resource_limit)?;
    Ok(())
}

fn charge_manifest_vec<T>(total: &mut u64, length: usize) -> Result<(), ProjectPackageFailure> {
    let length = u64::try_from(length).map_err(|_| resource_limit())?;
    let element = u64::try_from(std::mem::size_of::<T>()).map_err(|_| resource_limit())?;
    let bytes = length.checked_mul(element).ok_or_else(resource_limit)?;
    *total = total.checked_add(bytes).ok_or_else(resource_limit)?;
    Ok(())
}

fn check_manifest_declared_budgets(value: &JsonValue) -> Result<(), ProjectPackageFailure> {
    check_string_budget(
        value
            .get("projectSchemaVersion")
            .and_then(JsonValue::as_str),
        MAX_PROJECT_SCHEMA_VERSION_BYTES,
    )?;

    if let Some(creator) = value.get("createdBy") {
        check_string_budget(
            creator.get("application").and_then(JsonValue::as_str),
            MAX_CREATED_BY_APPLICATION_BYTES,
        )?;
        check_string_budget(
            creator.get("version").and_then(JsonValue::as_str),
            MAX_CREATED_BY_VERSION_BYTES,
        )?;
    }

    if value
        .get("project")
        .and_then(|project| project.get("byteLength"))
        .is_some_and(|number| plain_integer_exceeds(number, MAX_PROJECT_BYTES))
    {
        return Err(resource_limit());
    }

    if let Some(assets) = value.get("assets").and_then(JsonValue::as_array) {
        if u64::try_from(assets.len()).map_or(true, |length| length > MAX_ASSETS) {
            return Err(resource_limit());
        }
        for asset in assets {
            check_asset_numeric_budgets(asset)?;
        }
    }

    if let Some(bindings) = value.get("bindings").and_then(JsonValue::as_array) {
        if u64::try_from(bindings.len()).map_or(true, |length| length > MAX_BINDINGS) {
            return Err(resource_limit());
        }
        for binding in bindings {
            check_string_budget(
                binding.get("pointer").and_then(JsonValue::as_str),
                MAX_BINDING_POINTER_BYTES,
            )?;
        }
    }

    Ok(())
}

fn check_string_budget(value: Option<&str>, maximum: u64) -> Result<(), ProjectPackageFailure> {
    if value.is_some_and(|value| u64::try_from(value.len()).map_or(true, |length| length > maximum))
    {
        return Err(resource_limit());
    }
    Ok(())
}

fn parse_creator(value: &JsonValue) -> Result<PackageCreator, ProjectPackageFailure> {
    let entries = value.as_object_entries().ok_or_else(manifest_invalid)?;
    require_exact_fields(entries, &["application", "version"])?;
    let creator = PackageCreator::new(
        require_string(value, "application")?,
        require_string(value, "version")?,
    )?;
    validate_creator(&creator, false)?;
    Ok(creator)
}

fn parse_project(value: &JsonValue) -> Result<ProjectEntry, ProjectPackageFailure> {
    let entries = value.as_object_entries().ok_or_else(manifest_invalid)?;
    require_exact_fields(entries, &["byteLength", "path", "sha256"])?;
    if require_string(value, "path")? != PROJECT_ENTRY_PATH {
        return Err(manifest_invalid());
    }
    let byte_length =
        require_bounded_plain_u64(value, "byteLength", MAX_PROJECT_BYTES, manifest_invalid)?;
    let sha256 = Sha256Digest::parse_lower_hex(require_string(value, "sha256")?)?;
    ProjectEntry::new(byte_length, sha256)
}

fn parse_assets(value: &JsonValue) -> Result<Vec<AssetRecord>, ProjectPackageFailure> {
    let values = value.as_array().ok_or_else(manifest_invalid)?;
    if u64::try_from(values.len()).map_err(|_| resource_limit())? > MAX_ASSETS {
        return Err(resource_limit());
    }
    for value in values {
        check_asset_numeric_budgets(value)?;
    }

    let mut previous_path: Option<&str> = None;
    for value in values {
        let entries = value.as_object_entries().ok_or_else(manifest_invalid)?;
        require_exact_fields(
            entries,
            &[
                "byteLength",
                "height",
                "id",
                "mimeType",
                "path",
                "sha256",
                "width",
            ],
        )?;
        let path = require_string(value, "path")?;
        if previous_path.is_some_and(|previous| previous >= path) {
            return Err(manifest_invalid());
        }
        previous_path = Some(path);
    }

    let mut assets = Vec::new();
    assets
        .try_reserve_exact(values.len())
        .map_err(|_| resource_limit())?;
    for value in values {
        let byte_length =
            require_bounded_plain_u64(value, "byteLength", MAX_ASSET_BYTES, manifest_invalid)?;
        if byte_length == 0 {
            return Err(manifest_invalid());
        }

        // Record-local precedence is normative: resource envelope, MIME
        // support/canonical spelling and extension, dimensions, then identity.
        // Do not let a bad digest mask a more specific earlier field failure.
        let declared_mime = require_string(value, "mimeType")?;
        let mime_type = match RasterMime::from_canonical(declared_mime) {
            Some(mime_type) => mime_type,
            None if is_noncanonical_supported_mime(declared_mime) => {
                return Err(asset_type_invalid());
            }
            None if is_well_formed_mime(declared_mime) => {
                return Err(asset_type_unsupported());
            }
            None => return Err(asset_type_invalid()),
        };
        let path = require_string(value, "path")?;
        if provisional_asset_path_extension(path)
            .is_some_and(|extension| extension != mime_type.extension().as_bytes())
        {
            return Err(asset_type_invalid());
        }

        let width = require_asset_dimension(value, "width")?;
        let height = require_asset_dimension(value, "height")?;

        let digest = Sha256Digest::parse_lower_hex(require_string(value, "sha256")?)
            .map_err(|_| asset_digest_mismatch())?;
        let id = require_string(value, "id")?;
        if parse_asset_id(id).ok() != Some(digest) {
            return Err(asset_digest_mismatch());
        }
        let extension = validate_asset_path_digest(path, digest)?;
        if extension != mime_type.extension().as_bytes() {
            return Err(asset_type_invalid());
        }
        assets.push(AssetRecord::new(
            digest,
            mime_type,
            byte_length,
            width,
            height,
        )?);
    }
    Ok(assets)
}

fn provisional_asset_path_extension(path: &str) -> Option<&[u8]> {
    let extension_start = path.rfind('.')?;
    Some(&path.as_bytes()[extension_start..])
}

fn check_asset_numeric_budgets(value: &JsonValue) -> Result<(), ProjectPackageFailure> {
    for (field, maximum) in [
        ("byteLength", MAX_ASSET_BYTES),
        ("width", MAX_IMAGE_DIMENSION),
        ("height", MAX_IMAGE_DIMENSION),
    ] {
        if value
            .get(field)
            .is_some_and(|number| plain_integer_exceeds(number, maximum))
        {
            return Err(resource_limit());
        }
    }
    Ok(())
}

fn require_asset_dimension(value: &JsonValue, field: &str) -> Result<u32, ProjectPackageFailure> {
    let dimension =
        require_bounded_plain_u64(value, field, MAX_IMAGE_DIMENSION, asset_dimensions_invalid)?;
    if dimension == 0 {
        return Err(asset_dimensions_invalid());
    }
    u32::try_from(dimension).map_err(|_| resource_limit())
}

fn validate_asset_path_digest(
    path: &str,
    digest: Sha256Digest,
) -> Result<&[u8], ProjectPackageFailure> {
    let remainder = path
        .strip_prefix(ASSET_PATH_PREFIX)
        .ok_or_else(asset_digest_mismatch)?;
    if remainder.len() < 64 {
        return Err(asset_digest_mismatch());
    }
    let (path_digest, extension) = remainder.as_bytes().split_at(64);
    let path_digest = std::str::from_utf8(path_digest)
        .ok()
        .and_then(|value| Sha256Digest::parse_lower_hex(value).ok())
        .ok_or_else(asset_digest_mismatch)?;
    if path_digest != digest {
        return Err(asset_digest_mismatch());
    }
    Ok(extension)
}

fn is_well_formed_mime(value: &str) -> bool {
    let mut parts = value.split('/');
    let Some(top_level) = parts.next() else {
        return false;
    };
    let Some(subtype) = parts.next() else {
        return false;
    };
    if parts.next().is_some() || top_level.is_empty() || subtype.is_empty() {
        return false;
    }
    top_level.bytes().all(is_mime_token_byte) && subtype.bytes().all(is_mime_token_byte)
}

fn is_noncanonical_supported_mime(value: &str) -> bool {
    RasterMime::canonicalize_declared(value).is_some()
        || RasterMime::ALL
            .iter()
            .any(|mime_type| mime_type.as_str().eq_ignore_ascii_case(value))
}

fn is_mime_token_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric()
        || matches!(
            byte,
            b'!' | b'#' | b'$' | b'&' | b'^' | b'_' | b'.' | b'+' | b'-'
        )
}

fn parse_bindings(value: &JsonValue) -> Result<Vec<BindingRecord>, ProjectPackageFailure> {
    let values = value.as_array().ok_or_else(manifest_invalid)?;
    if u64::try_from(values.len()).map_err(|_| resource_limit())? > MAX_BINDINGS {
        return Err(resource_limit());
    }
    for value in values {
        if value
            .get("pointer")
            .and_then(JsonValue::as_str)
            .is_some_and(|pointer| {
                u64::try_from(pointer.len())
                    .map_or(true, |length| length > MAX_BINDING_POINTER_BYTES)
            })
        {
            return Err(resource_limit());
        }
    }

    let mut previous: Option<(&str, &str)> = None;
    for value in values {
        let entries = value.as_object_entries().ok_or_else(manifest_invalid)?;
        require_exact_fields(entries, &["assetId", "pointer"])?;
        let pointer = require_string(value, "pointer")?;
        let asset_id = require_string(value, "assetId")?;
        let key = (pointer, asset_id);
        if previous.as_ref().is_some_and(|previous| previous.0 > key.0) {
            return Err(manifest_invalid());
        }
        previous = Some(key);
    }

    let mut bindings = Vec::new();
    bindings
        .try_reserve_exact(values.len())
        .map_err(|_| resource_limit())?;
    for value in values {
        let pointer = require_string(value, "pointer")?;
        let asset_id = require_string(value, "assetId")?;
        bindings.push(BindingRecord::from_manifest_fields(
            try_copy_manifest_string(pointer)?,
            try_copy_manifest_string(asset_id)?,
        ));
    }
    Ok(bindings)
}

fn try_copy_manifest_string(value: &str) -> Result<String, ProjectPackageFailure> {
    let mut output = String::new();
    output
        .try_reserve_exact(value.len())
        .map_err(|_| resource_limit())?;
    output.push_str(value);
    Ok(output)
}

fn require_exact_fields(
    entries: &[(String, JsonValue)],
    expected: &[&str],
) -> Result<(), ProjectPackageFailure> {
    if entries.len() != expected.len()
        || entries
            .iter()
            .any(|(key, _)| !expected.contains(&key.as_str()))
    {
        return Err(manifest_invalid());
    }
    Ok(())
}

fn require_field<'a>(
    object: &'a JsonValue,
    key: &str,
) -> Result<&'a JsonValue, ProjectPackageFailure> {
    object.get(key).ok_or_else(manifest_invalid)
}

fn require_string<'a>(object: &'a JsonValue, key: &str) -> Result<&'a str, ProjectPackageFailure> {
    require_field(object, key)?
        .as_str()
        .ok_or_else(manifest_invalid)
}

fn require_bounded_plain_u64(
    object: &JsonValue,
    key: &str,
    maximum: u64,
    invalid: fn() -> ProjectPackageFailure,
) -> Result<u64, ProjectPackageFailure> {
    let value = require_field(object, key)?;
    if plain_integer_exceeds(value, maximum) {
        return Err(resource_limit());
    }
    value.as_plain_nonnegative_u64().ok_or_else(invalid)
}

fn plain_integer_exceeds(value: &JsonValue, maximum: u64) -> bool {
    let JsonValue::Number(number) = value else {
        return false;
    };
    let raw = number.raw().as_bytes();
    let plain = raw == b"0"
        || raw
            .first()
            .is_some_and(|first| matches!(first, b'1'..=b'9'))
            && raw[1..].iter().all(u8::is_ascii_digit);
    plain
        && number
            .raw()
            .parse::<u64>()
            .map_or(true, |number| number > maximum)
}

#[cfg(test)]
fn json_string(value: &str) -> JsonValue {
    JsonValue::string(value.to_owned())
}

#[cfg(test)]
fn json_object(fields: Vec<(&str, JsonValue)>) -> Result<JsonValue, ProjectPackageFailure> {
    JsonValue::object(
        fields
            .into_iter()
            .map(|(key, value)| (key.to_owned(), value))
            .collect(),
    )
    .map_err(map_json_error)
}

fn validate_creator(
    creator: &PackageCreator,
    application_writer_identity_required: bool,
) -> Result<(), ProjectPackageFailure> {
    let application = creator.application();
    let version = creator.version();
    if application_writer_identity_required && application != "steam-backup-label-studio" {
        return Err(manifest_invalid());
    }
    validate_printable_ascii(
        application,
        MAX_CREATED_BY_APPLICATION_BYTES,
        manifest_invalid,
    )?;
    validate_printable_ascii(version, MAX_CREATED_BY_VERSION_BYTES, manifest_invalid)
}

fn validate_printable_ascii(
    value: &str,
    maximum_bytes: u64,
    invalid: fn() -> ProjectPackageFailure,
) -> Result<(), ProjectPackageFailure> {
    if value.is_empty() {
        return Err(invalid());
    }
    if u64::try_from(value.len()).map_err(|_| resource_limit())? > maximum_bytes {
        return Err(resource_limit());
    }
    if !value.bytes().all(|byte| matches!(byte, 0x20..=0x7e)) {
        return Err(invalid());
    }
    Ok(())
}

fn validate_schema_version_syntax(value: &str) -> Result<(), ProjectPackageFailure> {
    let bytes = value.as_bytes();
    if bytes.is_empty() {
        return Err(manifest_invalid());
    }
    if u64::try_from(bytes.len()).map_err(|_| resource_limit())? > MAX_PROJECT_SCHEMA_VERSION_BYTES
    {
        return Err(resource_limit());
    }
    if !bytes[0].is_ascii_alphanumeric()
        || !bytes[1..]
            .iter()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'+' | b'-'))
    {
        return Err(manifest_invalid());
    }
    Ok(())
}

fn validate_asset_and_binding_graph(
    assets: &[AssetRecord],
    bindings: &[BindingRecord],
) -> Result<(), ProjectPackageFailure> {
    validate_unique_assets(assets)?;

    for binding in bindings {
        let digest = binding.asset_digest();
        if !assets.iter().any(|asset| asset.sha256 == digest) {
            return Err(failure(FailureCode::AssetMissing));
        }
    }

    if assets.iter().any(|asset| {
        !bindings
            .iter()
            .any(|binding| binding.asset_digest() == asset.sha256)
    }) {
        return Err(failure(FailureCode::AssetMissing));
    }

    if bindings
        .windows(2)
        .any(|pair| pair[0].pointer == pair[1].pointer)
    {
        return Err(failure(FailureCode::BindingConflict));
    }
    Ok(())
}

fn validate_unique_assets(assets: &[AssetRecord]) -> Result<(), ProjectPackageFailure> {
    if assets
        .windows(2)
        .any(|pair| pair[0].sha256 == pair[1].sha256)
    {
        Err(manifest_invalid())
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const A: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const B: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    fn digest(value: &str) -> Sha256Digest {
        Sha256Digest::parse_lower_hex(value).unwrap()
    }

    fn project() -> ProjectEntry {
        ProjectEntry::new(982, digest(B)).unwrap()
    }

    fn asset(value: &str, mime: RasterMime) -> AssetRecord {
        AssetRecord::new(digest(value), mime, 100, 10, 10).unwrap()
    }

    fn creator() -> PackageCreator {
        PackageCreator::steam_backup_label_studio("0.1.0").unwrap()
    }

    fn one_asset_manifest() -> ManifestV1 {
        let raster = asset(A, RasterMime::Png);
        ManifestV1::new(
            "0.2.0",
            creator(),
            project(),
            vec![raster.clone()],
            vec![BindingRecord::from_digest(
                "/background/imageDataUrl".to_owned(),
                raster.sha256(),
            )
            .unwrap()],
        )
        .unwrap()
    }

    fn asset_json(digest: &str, mime_type: &str, extension: &str) -> String {
        format!(
            r#"{{"byteLength":100,"height":10,"id":"sha256:{digest}","mimeType":"{mime_type}","path":"assets/sha256/{digest}{extension}","sha256":"{digest}","width":10}}"#
        )
    }

    fn binding_json(pointer: &str, digest: &str) -> String {
        format!(r#"{{"assetId":"sha256:{digest}","pointer":"{pointer}"}}"#)
    }

    fn raw_manifest(assets: &str, bindings: &str) -> String {
        format!(
            r#"{{"assets":[{assets}],"bindings":[{bindings}],"createdBy":{{"application":"steam-backup-label-studio","version":"0.1.0"}},"format":"sbls/project-package","packageVersion":1,"project":{{"byteLength":982,"path":"project.json","sha256":"{B}"}},"projectSchemaVersion":"0.2.0"}}"#
        )
    }

    #[test]
    fn digest_requires_exact_lowercase_hex_and_round_trips() {
        assert_eq!(digest(A).to_lower_hex(), A);
        assert!(Sha256Digest::parse_lower_hex(&A.to_uppercase()).is_err());
        assert!(Sha256Digest::parse_lower_hex(&A[..63]).is_err());
        assert!(Sha256Digest::parse_lower_hex(&format!("{}g", &A[..63])).is_err());
    }

    #[test]
    fn asset_identity_and_path_are_derived_from_exact_bytes_identity() {
        let asset = asset(A, RasterMime::Jpeg);
        assert_eq!(asset.id(), format!("sha256:{A}"));
        assert_eq!(asset.path(), format!("assets/sha256/{A}.jpg"));
    }

    #[test]
    fn writer_construction_sorts_records_canonically() {
        let first = asset(A, RasterMime::Png);
        let second = asset(B, RasterMime::Webp);
        let manifest = ManifestV1::new(
            "0.2.0",
            creator(),
            project(),
            vec![second.clone(), first.clone()],
            vec![
                BindingRecord::from_digest(
                    "/titleArtwork/imageDataUrl".to_owned(),
                    second.sha256(),
                )
                .unwrap(),
                BindingRecord::from_digest("/background/imageDataUrl".to_owned(), first.sha256())
                    .unwrap(),
            ],
        )
        .unwrap();

        assert_eq!(manifest.assets(), &[first, second]);
        assert_eq!(manifest.bindings()[0].pointer(), "/background/imageDataUrl");
        assert_eq!(
            manifest.bindings()[1].pointer(),
            "/titleArtwork/imageDataUrl"
        );
    }

    #[test]
    fn canonical_bytes_round_trip_through_the_strict_reader() {
        let manifest = one_asset_manifest();
        let bytes = manifest.to_canonical_bytes().unwrap();
        assert_eq!(parse_manifest(&bytes).unwrap(), manifest);
        assert!(!bytes.starts_with(&[0xef, 0xbb, 0xbf]));
        assert_ne!(bytes.last(), Some(&b'\n'));
        let text = std::str::from_utf8(&bytes).unwrap();
        assert!(text.starts_with(r#"{"assets":["#));
        assert!(text.contains(r#""format":"sbls/project-package""#));
    }

    #[test]
    fn manifest_writer_precharges_exact_output_boundary() {
        let manifest = one_asset_manifest();
        let canonical = manifest.to_canonical_bytes().unwrap();
        let exact = u64::try_from(canonical.len()).unwrap();
        assert_eq!(
            manifest.to_canonical_bytes_with_limit(exact).unwrap(),
            canonical
        );
        let error = manifest
            .to_canonical_bytes_with_limit(exact - 1)
            .unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::Manifest);
    }

    #[test]
    fn manifest_writer_handles_the_maximum_binding_count_with_bounded_growth() {
        let raster = asset(A, RasterMime::Png);
        let binding_count = usize::try_from(MAX_BINDINGS).unwrap();
        let mut bindings = Vec::new();
        bindings.try_reserve_exact(binding_count).unwrap();
        for index in 0..binding_count {
            bindings.push(
                BindingRecord::from_digest(format!("/owners/{index}"), raster.sha256()).unwrap(),
            );
        }
        let manifest =
            ManifestV1::new("0.2.0", creator(), project(), vec![raster], bindings).unwrap();
        let bytes = manifest.to_canonical_bytes().unwrap();
        assert!(u64::try_from(bytes.len()).unwrap() <= MAX_MANIFEST_BYTES);
        let parsed = parse_manifest(&bytes).unwrap();
        assert_eq!(parsed.bindings().len(), binding_count);
    }

    #[test]
    fn accounted_manifest_parse_enforces_exact_peak_and_recovers_after_failure() {
        let bytes = one_asset_manifest().to_canonical_bytes().unwrap();
        let limits = PackageLimits::V1;
        let mut probe = OperationAllocationLedger::new(limits.decoder_working_bytes);
        let (manifest, receipt) =
            parse_manifest_accounted_with_limits(&bytes, &limits, &mut probe).unwrap();
        let exact_peak = probe.peak();
        assert!(exact_peak > receipt);
        drop(manifest);
        probe.release(receipt).unwrap();
        assert_eq!(probe.retained(), 0);

        let mut exact = OperationAllocationLedger::new(exact_peak);
        let (manifest, receipt) =
            parse_manifest_accounted_with_limits(&bytes, &limits, &mut exact).unwrap();
        drop(manifest);
        exact.release(receipt).unwrap();
        assert_eq!(exact.retained(), 0);

        let mut one_under = OperationAllocationLedger::new(exact_peak - 1);
        let error =
            parse_manifest_accounted_with_limits(&bytes, &limits, &mut one_under).unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::Manifest);
        assert_eq!(one_under.retained(), 0);

        let smaller = ManifestV1::new("0.2.0", creator(), project(), vec![], vec![])
            .unwrap()
            .to_canonical_bytes()
            .unwrap();
        let (manifest, receipt) =
            parse_manifest_accounted_with_limits(&smaller, &limits, &mut one_under).unwrap();
        drop(manifest);
        one_under.release(receipt).unwrap();
        assert_eq!(one_under.retained(), 0);
    }

    #[test]
    fn identity_and_version_precede_the_closed_v1_shape() {
        let oversized = vec![b' '; MAX_MANIFEST_BYTES as usize + 1];
        assert_eq!(
            parse_manifest(&oversized).unwrap_err().code,
            FailureCode::ResourceLimitExceeded
        );

        let canonical =
            String::from_utf8(one_asset_manifest().to_canonical_bytes().unwrap()).unwrap();
        let wrong_identity = canonical.replace(PACKAGE_FORMAT, "other/project").replace(
            r#""projectSchemaVersion":"0.2.0""#,
            r#""projectSchemaVersion":"0.2.0","futureField":true"#,
        );
        assert_eq!(
            parse_manifest(wrong_identity.as_bytes()).unwrap_err().code,
            FailureCode::FormatUnsupported
        );

        let wrong_version = canonical
            .replace(r#""packageVersion":1"#, r#""packageVersion":2"#)
            .replace(
                r#""projectSchemaVersion":"0.2.0""#,
                r#""projectSchemaVersion":"0.2.0","futureField":true"#,
            );
        assert_eq!(
            parse_manifest(wrong_version.as_bytes()).unwrap_err().code,
            FailureCode::PackageVersionUnsupported
        );

        let fractional_version =
            canonical.replace(r#""packageVersion":1"#, r#""packageVersion":1.0"#);
        assert_eq!(
            parse_manifest(fractional_version.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::PackageVersionUnsupported
        );

        let unknown_v1 = canonical.replace(
            r#""projectSchemaVersion":"0.2.0""#,
            r#""projectSchemaVersion":"0.2.0","futureField":true"#,
        );
        assert_eq!(
            parse_manifest(unknown_v1.as_bytes()).unwrap_err().code,
            FailureCode::ManifestInvalid
        );
    }

    #[test]
    fn reader_accepts_other_bounded_printable_writer_identities() {
        let bytes = one_asset_manifest().to_canonical_bytes().unwrap();
        let other = String::from_utf8(bytes)
            .unwrap()
            .replace("steam-backup-label-studio", "another-writer");
        let parsed = parse_manifest(other.as_bytes()).unwrap();
        assert_eq!(parsed.creator().application(), "another-writer");
        assert_eq!(parsed.creator().version(), "0.1.0");
    }

    #[test]
    fn every_manifest_integer_requires_plain_nonnegative_decimal_spelling() {
        let canonical =
            String::from_utf8(one_asset_manifest().to_canonical_bytes().unwrap()).unwrap();
        for replacement in ["982.0", "9.82e2", "+982", "-0"] {
            let invalid = canonical.replace(
                r#""byteLength":982,"path":"project.json""#,
                &format!(r#""byteLength":{replacement},"path":"project.json""#),
            );
            assert_eq!(
                parse_manifest(invalid.as_bytes()).unwrap_err().code,
                FailureCode::ManifestInvalid,
                "{replacement} must not be a manifest integer"
            );
        }
    }

    #[test]
    fn parsed_asset_and_binding_arrays_must_already_be_canonical() {
        let a_asset = asset_json(A, "image/png", ".png");
        let b_asset = asset_json(B, "image/webp", ".webp");
        let a_binding = binding_json("/background/imageDataUrl", A);
        let b_binding = binding_json("/titleArtwork/imageDataUrl", B);

        let unsorted_assets = raw_manifest(
            &format!("{b_asset},{a_asset}"),
            &format!("{a_binding},{b_binding}"),
        );
        assert_eq!(
            parse_manifest(unsorted_assets.as_bytes()).unwrap_err().code,
            FailureCode::ManifestInvalid
        );

        let unsorted_bindings = raw_manifest(
            &format!("{a_asset},{b_asset}"),
            &format!("{b_binding},{a_binding}"),
        );
        assert_eq!(
            parse_manifest(unsorted_bindings.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::ManifestInvalid
        );
    }

    #[test]
    fn parsed_records_reject_unknown_fields_and_inconsistent_identity() {
        let asset = asset_json(A, "image/png", ".png");
        let binding = binding_json("/background/imageDataUrl", A);
        let unknown_asset_field = raw_manifest(
            &asset.replace(r#""width":10"#, r#""width":10,"source":"local""#),
            &binding,
        );
        assert_eq!(
            parse_manifest(unknown_asset_field.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::ManifestInvalid
        );

        let wrong_extension = raw_manifest(&asset_json(A, "image/png", ".jpg"), &binding);
        assert_eq!(
            parse_manifest(wrong_extension.as_bytes()).unwrap_err().code,
            FailureCode::AssetTypeInvalid
        );

        let unsupported_mime = raw_manifest(&asset_json(A, "image/svg+xml", ".svg"), &binding);
        assert_eq!(
            parse_manifest(unsupported_mime.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::AssetTypeUnsupported
        );

        let malformed_mime = raw_manifest(&asset_json(A, "image/ png", ".png"), &binding);
        assert_eq!(
            parse_manifest(malformed_mime.as_bytes()).unwrap_err().code,
            FailureCode::AssetTypeInvalid
        );

        let noncanonical_mime = raw_manifest(&asset_json(A, "image/jpg", ".jpg"), &binding);
        assert_eq!(
            parse_manifest(noncanonical_mime.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::AssetTypeInvalid
        );

        let wrong_id = raw_manifest(
            &asset.replace(
                &format!(r#""id":"sha256:{A}""#),
                &format!(r#""id":"sha256:{B}""#),
            ),
            &binding,
        );
        assert_eq!(
            parse_manifest(wrong_id.as_bytes()).unwrap_err().code,
            FailureCode::AssetDigestMismatch
        );

        let wrong_path_digest = raw_manifest(
            &asset.replace(
                &format!("assets/sha256/{A}.png"),
                &format!("assets/sha256/{B}.png"),
            ),
            &binding,
        );
        assert_eq!(
            parse_manifest(wrong_path_digest.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::AssetDigestMismatch
        );
    }

    #[test]
    fn asset_dimension_errors_and_numeric_budget_precedence_are_exact() {
        let asset = asset_json(A, "image/png", ".png");
        let binding = binding_json("/background/imageDataUrl", A);
        for width in ["0", "1.0", "1e0", "-1"] {
            let invalid = raw_manifest(
                &asset.replace(r#""width":10"#, &format!(r#""width":{width}"#)),
                &binding,
            );
            assert_eq!(
                parse_manifest(invalid.as_bytes()).unwrap_err().code,
                FailureCode::AssetDimensionsInvalid,
                "{width} must not be an asset dimension"
            );
        }

        let over_budget_and_unsupported = raw_manifest(
            &asset_json(A, "image/svg+xml", ".svg").replace(
                r#""width":10"#,
                &format!(r#""width":{}"#, MAX_IMAGE_DIMENSION + 1),
            ),
            &binding,
        );
        assert_eq!(
            parse_manifest(over_budget_and_unsupported.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );

        let wider_than_u64 = raw_manifest(
            &asset.replace(r#""width":10"#, r#""width":184467440737095516160"#),
            &binding,
        );
        assert_eq!(
            parse_manifest(wider_than_u64.as_bytes()).unwrap_err().code,
            FailureCode::ResourceLimitExceeded
        );
    }

    #[test]
    fn reader_keeps_manifest_local_uniqueness_but_defers_binding_graph_semantics() {
        let asset = asset_json(A, "image/png", ".png");
        let binding = binding_json("/background/imageDataUrl", A);
        let duplicate_asset = raw_manifest(&format!("{asset},{asset}"), &binding);
        assert_eq!(
            parse_manifest(duplicate_asset.as_bytes()).unwrap_err().code,
            FailureCode::ManifestInvalid
        );

        let missing_asset = raw_manifest(&asset, &binding_json("/background/imageDataUrl", B));
        assert!(parse_manifest(missing_asset.as_bytes()).is_ok());

        let unreferenced_asset = raw_manifest(&asset, "");
        assert!(parse_manifest(unreferenced_asset.as_bytes()).is_ok());

        let duplicate_pointer = raw_manifest(&asset, &format!("{binding},{binding}"));
        assert!(parse_manifest(duplicate_pointer.as_bytes()).is_ok());
    }

    #[test]
    fn asset_record_local_failure_order_is_mime_then_dimensions_then_digest() {
        let canonical = asset_json(A, "image/png", ".png");
        let binding = binding_json("/background/imageDataUrl", A);
        let wrong_digest =
            canonical.replace(&format!(r#""sha256":"{A}""#), &format!(r#""sha256":"{B}""#));

        let unsupported = wrong_digest
            .replace(r#""mimeType":"image/png""#, r#""mimeType":"image/svg+xml""#)
            .replace(
                &format!("assets/sha256/{A}.png"),
                &format!("assets/sha256/{A}.svg"),
            );
        assert_eq!(
            parse_manifest(raw_manifest(&unsupported, &binding).as_bytes())
                .unwrap_err()
                .code,
            FailureCode::AssetTypeUnsupported
        );

        let wrong_extension = wrong_digest.replace(
            &format!("assets/sha256/{A}.png"),
            &format!("assets/sha256/{A}.jpg"),
        );
        assert_eq!(
            parse_manifest(raw_manifest(&wrong_extension, &binding).as_bytes())
                .unwrap_err()
                .code,
            FailureCode::AssetTypeInvalid
        );

        let invalid_dimensions = wrong_digest.replace(r#""width":10"#, r#""width":0"#);
        assert_eq!(
            parse_manifest(raw_manifest(&invalid_dimensions, &binding).as_bytes())
                .unwrap_err()
                .code,
            FailureCode::AssetDimensionsInvalid
        );

        let missing_prefix = canonical.replace("assets/sha256/", "wrong-prefix/");
        assert_eq!(
            parse_manifest(raw_manifest(&missing_prefix, &binding).as_bytes())
                .unwrap_err()
                .code,
            FailureCode::AssetDigestMismatch
        );

        let missing_prefix_wrong_extension = missing_prefix.replace(".png", ".jpg");
        assert_eq!(
            parse_manifest(raw_manifest(&missing_prefix_wrong_extension, &binding).as_bytes())
                .unwrap_err()
                .code,
            FailureCode::AssetTypeInvalid
        );
    }

    #[test]
    fn binding_pointer_envelope_is_canonical_rfc_6901() {
        let asset_id = digest(A).asset_id();
        assert!(BindingRecord::try_new("/a~0b/c~1d/~01", &asset_id).is_ok());

        for pointer in [
            "",
            "background/imageDataUrl",
            "/",
            "//background/imageDataUrl",
            "/background/",
            "/a~",
            "/a~2",
            "/__proto__/imageDataUrl",
            "/constructor/imageDataUrl",
        ] {
            assert_eq!(
                BindingRecord::try_new(pointer, &asset_id).unwrap_err().code,
                FailureCode::BindingInvalid,
                "{pointer} must not be admitted as a binding pointer"
            );
        }
    }

    #[test]
    fn duplicate_assets_bindings_and_unreferenced_assets_are_rejected() {
        let first = asset(A, RasterMime::Png);
        let binding =
            BindingRecord::from_digest("/background/imageDataUrl".to_owned(), first.sha256())
                .unwrap();
        assert_eq!(
            ManifestV1::new(
                "0.2.0",
                creator(),
                project(),
                vec![first.clone(), first.clone()],
                vec![binding.clone()],
            )
            .unwrap_err()
            .code,
            FailureCode::ManifestInvalid
        );
        assert_eq!(
            ManifestV1::new(
                "0.2.0",
                creator(),
                project(),
                vec![first.clone()],
                vec![binding.clone(), binding],
            )
            .unwrap_err()
            .code,
            FailureCode::BindingConflict
        );
        assert_eq!(
            ManifestV1::new("0.2.0", creator(), project(), vec![first], vec![])
                .unwrap_err()
                .code,
            FailureCode::AssetMissing
        );
    }

    #[test]
    fn writer_identity_and_schema_syntax_are_closed() {
        assert!(ManifestV1::new(
            "0.2.0",
            PackageCreator::new("another-writer", "1").unwrap(),
            project(),
            vec![],
            vec![],
        )
        .is_err());
        for invalid in ["", ".2.0", "0/2/0", "é", "a b"] {
            assert!(ManifestV1::new(invalid, creator(), project(), vec![], vec![]).is_err());
        }
    }

    #[test]
    fn schema_support_and_agreement_are_separate() {
        let current = ManifestV1::new("0.2.0", creator(), project(), vec![], vec![]).unwrap();
        assert_eq!(
            current.supported_schema_version().unwrap(),
            ProjectSchemaVersion::V0_2_0
        );
        current.require_project_schema_agreement("0.2.0").unwrap();
        let disagreement = current
            .require_project_schema_agreement("0.1.0")
            .unwrap_err();
        assert_eq!(disagreement.code, FailureCode::ManifestInvalid);
        assert_eq!(disagreement.stage, FailureStage::Project);

        let projection = json_object(vec![("schemaVersion", json_string("0.2.0"))]).unwrap();
        current
            .require_projection_schema_agreement(&projection)
            .unwrap();
        let malformed_projection = json_object(vec![("schemaVersion", JsonValue::Null)]).unwrap();
        let malformed = current
            .require_projection_schema_agreement(&malformed_projection)
            .unwrap_err();
        assert_eq!(malformed.code, FailureCode::HydratedJsonInvalid);
        assert_eq!(malformed.stage, FailureStage::Project);

        let future = ManifestV1::new("9.0.0", creator(), project(), vec![], vec![]).unwrap();
        assert_eq!(
            future.supported_schema_version().unwrap_err().code,
            FailureCode::ProjectSchemaUnsupported
        );
    }

    #[test]
    fn integer_bounds_are_exact() {
        assert!(ProjectEntry::new(MIN_PROJECT_BYTES, digest(A)).is_ok());
        assert!(ProjectEntry::new(MAX_PROJECT_BYTES, digest(A)).is_ok());
        assert_eq!(
            ProjectEntry::new(MIN_PROJECT_BYTES - 1, digest(A))
                .unwrap_err()
                .code,
            FailureCode::ManifestInvalid
        );
        assert_eq!(
            ProjectEntry::new(MAX_PROJECT_BYTES + 1, digest(A))
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );

        assert!(AssetRecord::new(
            digest(A),
            RasterMime::Bmp,
            MAX_ASSET_BYTES,
            MAX_IMAGE_DIMENSION as u32,
            MAX_IMAGE_DIMENSION as u32,
        )
        .is_ok());
        assert_eq!(
            AssetRecord::new(digest(A), RasterMime::Bmp, 0, 1, 1)
                .unwrap_err()
                .code,
            FailureCode::ManifestInvalid
        );
        assert_eq!(
            AssetRecord::new(digest(A), RasterMime::Bmp, 1, 0, 1)
                .unwrap_err()
                .code,
            FailureCode::AssetDimensionsInvalid
        );
        assert_eq!(
            AssetRecord::new(digest(A), RasterMime::Bmp, MAX_ASSET_BYTES + 1, 1, 1)
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );
        assert_eq!(
            AssetRecord::new(digest(A), RasterMime::Bmp, MAX_ASSET_BYTES + 1, 0, 1,)
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );
    }

    #[test]
    fn string_bounds_are_exact_and_reader_writer_rules_remain_separate() {
        let canonical =
            String::from_utf8(one_asset_manifest().to_canonical_bytes().unwrap()).unwrap();

        let application_at_limit = canonical.replace(
            "steam-backup-label-studio",
            &"a".repeat(MAX_CREATED_BY_APPLICATION_BYTES as usize),
        );
        parse_manifest(application_at_limit.as_bytes()).unwrap();
        let application_over_limit = canonical.replace(
            "steam-backup-label-studio",
            &"a".repeat(MAX_CREATED_BY_APPLICATION_BYTES as usize + 1),
        );
        assert_eq!(
            parse_manifest(application_over_limit.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );

        let schema_at_limit = canonical.replace(
            r#""projectSchemaVersion":"0.2.0""#,
            &format!(
                r#""projectSchemaVersion":"{}""#,
                "s".repeat(MAX_PROJECT_SCHEMA_VERSION_BYTES as usize)
            ),
        );
        parse_manifest(schema_at_limit.as_bytes()).unwrap();
        let schema_over_limit = canonical.replace(
            r#""projectSchemaVersion":"0.2.0""#,
            &format!(
                r#""projectSchemaVersion":"{}""#,
                "s".repeat(MAX_PROJECT_SCHEMA_VERSION_BYTES as usize + 1)
            ),
        );
        assert_eq!(
            parse_manifest(schema_over_limit.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );

        let pointer_at_limit = canonical.replace(
            "/background/imageDataUrl",
            &format!("/{}", "p".repeat(MAX_BINDING_POINTER_BYTES as usize - 1)),
        );
        parse_manifest(pointer_at_limit.as_bytes()).unwrap();
        let pointer_over_limit = canonical.replace(
            "/background/imageDataUrl",
            &format!("/{}", "p".repeat(MAX_BINDING_POINTER_BYTES as usize)),
        );
        assert_eq!(
            parse_manifest(pointer_over_limit.as_bytes())
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );
    }
}
