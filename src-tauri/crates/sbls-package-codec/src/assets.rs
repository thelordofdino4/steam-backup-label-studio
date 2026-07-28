//! Canonical project-owned asset capture and deterministic staging.
//!
//! This module is intentionally pure. It decodes caller-supplied canonical
//! data URLs or copies caller-owned bytes, preserves those exact bytes, and
//! derives content-addressed identities. It never reads a URL or filesystem
//! path and never performs network or native I/O.

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use sha2::{Digest as _, Sha256};
use std::fmt;

use crate::limits::PackageLimits;
use crate::raster::RasterMime;

const DATA_URL_SCHEME: &str = "data:";
const DATA_URL_ENCODING: &str = ";base64";
const ASSET_ID_PREFIX: &str = "sha256:";
const ASSET_PATH_PREFIX: &str = "assets/sha256/";
const SHA256_BYTES: usize = 32;
#[cfg(test)]
const SHA256_HEX_LENGTH: usize = SHA256_BYTES * 2;

pub(crate) type AssetDigest = [u8; SHA256_BYTES];
pub(crate) type AssetDigestFunction = fn(&[u8]) -> AssetDigest;

/// Stable internal failures from capture and content-addressed staging.
///
/// These variants deliberately contain no parser or allocator text. The codec
/// boundary maps them to presentation-safe package failure codes later.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub(crate) enum AssetError {
    InvalidDataUrl,
    UnsupportedMime,
    ResourceLimitExceeded,
    AllocationFailed,
    HashCollision,
    MetadataMismatch,
}

impl AssetError {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::InvalidDataUrl => "asset.data-url-invalid",
            Self::UnsupportedMime => "asset.mime-unsupported",
            Self::ResourceLimitExceeded => "asset.resource-limit-exceeded",
            Self::AllocationFailed => "asset.allocation-failed",
            Self::HashCollision => "asset.hash-collision",
            Self::MetadataMismatch => "asset.metadata-mismatch",
        }
    }
}

impl fmt::Display for AssetError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl std::error::Error for AssetError {}

/// One exact, owned encoded asset payload.
#[derive(Debug, Eq, PartialEq)]
pub(crate) struct OwnedAssetPayload {
    mime_type: RasterMime,
    bytes: Vec<u8>,
}

impl OwnedAssetPayload {
    /// Fallibly copies exact caller-owned bytes into the package operation.
    pub(crate) fn copy_from_slice(
        mime_type: RasterMime,
        bytes: &[u8],
        limits: &PackageLimits,
    ) -> Result<Self, AssetError> {
        validate_asset_byte_length(bytes.len(), limits)?;

        let mut owned = Vec::new();
        owned
            .try_reserve_exact(bytes.len())
            .map_err(|_| AssetError::AllocationFailed)?;
        owned.extend_from_slice(bytes);

        Ok(Self {
            mime_type,
            bytes: owned,
        })
    }

    pub(crate) const fn mime_type(&self) -> RasterMime {
        self.mime_type
    }

    pub(crate) fn bytes(&self) -> &[u8] {
        &self.bytes
    }

    pub(crate) fn into_parts(self) -> (RasterMime, Vec<u8>) {
        (self.mime_type, self.bytes)
    }
}

/// Decode the exact package-v1 canonical data-URL spelling.
#[cfg(test)]
pub(crate) fn decode_canonical_data_url(value: &str) -> Result<OwnedAssetPayload, AssetError> {
    decode_canonical_data_url_with_limits(value, &PackageLimits::V1)
}

pub(crate) fn decode_canonical_data_url_with_limits(
    value: &str,
    limits: &PackageLimits,
) -> Result<OwnedAssetPayload, AssetError> {
    let (header, payload) = value.split_once(',').ok_or(AssetError::InvalidDataUrl)?;
    let declared_mime = header
        .strip_prefix(DATA_URL_SCHEME)
        .and_then(|header| header.strip_suffix(DATA_URL_ENCODING))
        .ok_or(AssetError::InvalidDataUrl)?;

    // Parameters are not part of the v1 grammar. Check them separately so an
    // unsupported MIME remains distinguishable from an ambiguous envelope.
    if declared_mime.is_empty() || declared_mime.contains(';') {
        return Err(AssetError::InvalidDataUrl);
    }

    let mime_type = RasterMime::from_canonical(declared_mime).ok_or(AssetError::UnsupportedMime)?;
    let decoded_length = preflight_canonical_base64(payload.as_bytes(), limits)?;

    let mut decoded = Vec::new();
    decoded
        .try_reserve_exact(decoded_length)
        .map_err(|_| AssetError::AllocationFailed)?;
    decoded.resize(decoded_length, 0);

    let written = STANDARD
        .decode_slice(payload.as_bytes(), &mut decoded)
        .map_err(|_| AssetError::InvalidDataUrl)?;
    if written != decoded_length {
        return Err(AssetError::InvalidDataUrl);
    }

    Ok(OwnedAssetPayload {
        mime_type,
        bytes: decoded,
    })
}

/// Validate canonical padded RFC 4648 spelling and return the exact decoded
/// byte count before allocating a decode buffer.
fn preflight_canonical_base64(payload: &[u8], limits: &PackageLimits) -> Result<usize, AssetError> {
    if payload.is_empty() || payload.len() % 4 != 0 {
        return Err(AssetError::InvalidDataUrl);
    }

    let padding = payload
        .iter()
        .rev()
        .take_while(|byte| **byte == b'=')
        .count();
    if padding > 2 {
        return Err(AssetError::InvalidDataUrl);
    }

    let data_length = payload
        .len()
        .checked_sub(padding)
        .ok_or(AssetError::InvalidDataUrl)?;
    if payload[..data_length]
        .iter()
        .any(|byte| base64_value(*byte).is_none())
        || payload[data_length..].iter().any(|byte| *byte != b'=')
    {
        return Err(AssetError::InvalidDataUrl);
    }

    match padding {
        0 if data_length % 4 != 0 => return Err(AssetError::InvalidDataUrl),
        1 if data_length % 4 != 3 => return Err(AssetError::InvalidDataUrl),
        2 if data_length % 4 != 2 => return Err(AssetError::InvalidDataUrl),
        _ => {}
    }

    // RFC 4648 requires unused bits in the final quantum to be zero. Without
    // this check multiple lexical inputs could decode to the same bytes.
    if padding == 2 {
        let final_value =
            base64_value(payload[data_length - 1]).ok_or(AssetError::InvalidDataUrl)?;
        if final_value & 0x0f != 0 {
            return Err(AssetError::InvalidDataUrl);
        }
    } else if padding == 1 {
        let final_value =
            base64_value(payload[data_length - 1]).ok_or(AssetError::InvalidDataUrl)?;
        if final_value & 0x03 != 0 {
            return Err(AssetError::InvalidDataUrl);
        }
    }

    let encoded_length =
        u64::try_from(payload.len()).map_err(|_| AssetError::ResourceLimitExceeded)?;
    let decoded_length = encoded_length
        .checked_div(4)
        .and_then(|quartets| quartets.checked_mul(3))
        .and_then(|maximum| maximum.checked_sub(padding as u64))
        .ok_or(AssetError::ResourceLimitExceeded)?;
    if decoded_length == 0 || decoded_length > limits.asset_bytes {
        return Err(AssetError::ResourceLimitExceeded);
    }

    usize::try_from(decoded_length).map_err(|_| AssetError::ResourceLimitExceeded)
}

const fn base64_value(byte: u8) -> Option<u8> {
    match byte {
        b'A'..=b'Z' => Some(byte - b'A'),
        b'a'..=b'z' => Some(byte - b'a' + 26),
        b'0'..=b'9' => Some(byte - b'0' + 52),
        b'+' => Some(62),
        b'/' => Some(63),
        _ => None,
    }
}

fn validate_asset_byte_length(
    byte_length: usize,
    limits: &PackageLimits,
) -> Result<u64, AssetError> {
    let byte_length = u64::try_from(byte_length).map_err(|_| AssetError::ResourceLimitExceeded)?;
    if byte_length == 0 || byte_length > limits.asset_bytes {
        return Err(AssetError::ResourceLimitExceeded);
    }
    Ok(byte_length)
}

pub(crate) fn sha256_digest(bytes: &[u8]) -> AssetDigest {
    let calculated = Sha256::digest(bytes);
    let mut digest = [0_u8; SHA256_BYTES];
    digest.copy_from_slice(&calculated);
    digest
}

/// Exact content-addressed identity derived from uncompressed bytes.
#[derive(Debug, Eq, PartialEq)]
pub(crate) struct AssetIdentity {
    digest: AssetDigest,
    sha256: String,
    id: String,
    path: String,
}

impl AssetIdentity {
    fn from_digest(mime_type: RasterMime, digest: AssetDigest) -> Result<Self, AssetError> {
        let sha256 = lowercase_hex(&digest)?;
        let id = concatenate(&[ASSET_ID_PREFIX, &sha256])?;
        let path = concatenate(&[ASSET_PATH_PREFIX, &sha256, mime_type.extension()])?;

        Ok(Self {
            digest,
            sha256,
            id,
            path,
        })
    }

    pub(crate) const fn digest(&self) -> &AssetDigest {
        &self.digest
    }

    #[cfg(test)]
    pub(crate) fn sha256(&self) -> &str {
        &self.sha256
    }

    #[cfg(test)]
    pub(crate) fn id(&self) -> &str {
        &self.id
    }

    pub(crate) fn path(&self) -> &str {
        &self.path
    }
}

fn lowercase_hex(bytes: &[u8]) -> Result<String, AssetError> {
    const LOWER_HEX: &[u8; 16] = b"0123456789abcdef";

    let output_length = bytes
        .len()
        .checked_mul(2)
        .ok_or(AssetError::ResourceLimitExceeded)?;
    let mut output = String::new();
    output
        .try_reserve_exact(output_length)
        .map_err(|_| AssetError::AllocationFailed)?;
    for byte in bytes {
        output.push(LOWER_HEX[(byte >> 4) as usize] as char);
        output.push(LOWER_HEX[(byte & 0x0f) as usize] as char);
    }
    Ok(output)
}

fn concatenate(parts: &[&str]) -> Result<String, AssetError> {
    let output_length = parts.iter().try_fold(0_usize, |total, part| {
        total
            .checked_add(part.len())
            .ok_or(AssetError::ResourceLimitExceeded)
    })?;
    let mut output = String::new();
    output
        .try_reserve_exact(output_length)
        .map_err(|_| AssetError::AllocationFailed)?;
    for part in parts {
        output.push_str(part);
    }
    Ok(output)
}

/// Manifest-ready metadata plus the exact immutable encoded raster bytes.
#[derive(Debug, Eq, PartialEq)]
pub(crate) struct StagedAssetRecord {
    identity: AssetIdentity,
    mime_type: RasterMime,
    byte_length: u64,
    width: u32,
    height: u32,
    bytes: Vec<u8>,
}

impl StagedAssetRecord {
    pub(crate) const fn identity(&self) -> &AssetIdentity {
        &self.identity
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

    pub(crate) fn bytes(&self) -> &[u8] {
        &self.bytes
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub(crate) struct StagedAssetKey(AssetDigest);

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct StageAssetResult {
    pub(crate) key: StagedAssetKey,
    pub(crate) inserted: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum AssetStagePreflight {
    ExistingExact(StagedAssetKey),
    NeedsValidation,
}

/// Operation-local, collision-safe, deterministic asset collection.
///
/// Records are maintained in digest order. Because every path begins with the
/// same prefix and embeds the 64-character digest before the extension, this is
/// also the required ascending path order.
pub(crate) struct AssetStager {
    limits: PackageLimits,
    digest_function: AssetDigestFunction,
    records: Vec<StagedAssetRecord>,
    total_asset_bytes: u64,
}

impl AssetStager {
    #[cfg(test)]
    pub(crate) fn new(limits: PackageLimits) -> Self {
        Self::with_digest_function(limits, sha256_digest)
    }

    /// Injectable digest seam used to prove unequal-byte collision handling.
    pub(crate) fn with_digest_function(
        limits: PackageLimits,
        digest_function: AssetDigestFunction,
    ) -> Self {
        Self {
            limits,
            digest_function,
            records: Vec::new(),
            total_asset_bytes: 0,
        }
    }

    pub(crate) fn stage(
        &mut self,
        payload: OwnedAssetPayload,
        width: u32,
        height: u32,
    ) -> Result<StageAssetResult, AssetError> {
        let (mime_type, bytes) = payload.into_parts();
        let byte_length = validate_asset_byte_length(bytes.len(), &self.limits)?;
        self.validate_dimensions(width, height)?;
        let digest = (self.digest_function)(&bytes);

        match self
            .records
            .binary_search_by(|record| record.identity.digest.cmp(&digest))
        {
            Ok(index) => {
                let existing = &self.records[index];
                if existing.byte_length != byte_length || existing.bytes != bytes {
                    return Err(AssetError::HashCollision);
                }
                if existing.mime_type != mime_type
                    || existing.width != width
                    || existing.height != height
                {
                    return Err(AssetError::MetadataMismatch);
                }

                Ok(StageAssetResult {
                    key: StagedAssetKey(digest),
                    inserted: false,
                })
            }
            Err(insertion_index) => {
                let current_count = u64::try_from(self.records.len())
                    .map_err(|_| AssetError::ResourceLimitExceeded)?;
                if current_count >= self.limits.assets {
                    return Err(AssetError::ResourceLimitExceeded);
                }
                let next_total_asset_bytes = self
                    .total_asset_bytes
                    .checked_add(byte_length)
                    .filter(|total| *total <= self.limits.total_uncompressed_bytes)
                    .ok_or(AssetError::ResourceLimitExceeded)?;

                // Prebuild and reserve before changing retained staging state.
                let identity = AssetIdentity::from_digest(mime_type, digest)?;
                self.records
                    .try_reserve(1)
                    .map_err(|_| AssetError::AllocationFailed)?;
                self.records.insert(
                    insertion_index,
                    StagedAssetRecord {
                        identity,
                        mime_type,
                        byte_length,
                        width,
                        height,
                        bytes,
                    },
                );
                self.total_asset_bytes = next_total_asset_bytes;

                Ok(StageAssetResult {
                    key: StagedAssetKey(digest),
                    inserted: true,
                })
            }
        }
    }

    /// Reject a definitely-new asset before invoking a decoder when its
    /// insertion would exceed a package ceiling. A previously validated exact
    /// duplicate can bypass decoding and aggregate raster accounting. Digest
    /// collisions and cross-MIME inputs deliberately continue to ordinary
    /// validation/staging so their established typed failure precedence is
    /// preserved.
    pub(crate) fn preflight_stage(
        &self,
        payload: &OwnedAssetPayload,
    ) -> Result<AssetStagePreflight, AssetError> {
        let byte_length = validate_asset_byte_length(payload.bytes().len(), &self.limits)?;
        let digest = (self.digest_function)(payload.bytes());
        match self
            .records
            .binary_search_by(|record| record.identity.digest.cmp(&digest))
        {
            Ok(index) => {
                let existing = &self.records[index];
                if existing.mime_type == payload.mime_type() && existing.bytes == payload.bytes() {
                    Ok(AssetStagePreflight::ExistingExact(StagedAssetKey(digest)))
                } else {
                    Ok(AssetStagePreflight::NeedsValidation)
                }
            }
            Err(_) => {
                let current_count = u64::try_from(self.records.len())
                    .map_err(|_| AssetError::ResourceLimitExceeded)?;
                if current_count >= self.limits.assets {
                    return Err(AssetError::ResourceLimitExceeded);
                }
                self.total_asset_bytes
                    .checked_add(byte_length)
                    .filter(|total| *total <= self.limits.total_uncompressed_bytes)
                    .ok_or(AssetError::ResourceLimitExceeded)?;
                Ok(AssetStagePreflight::NeedsValidation)
            }
        }
    }

    fn validate_dimensions(&self, width: u32, height: u32) -> Result<(), AssetError> {
        if width == 0 || height == 0 {
            return Err(AssetError::MetadataMismatch);
        }
        if u64::from(width) > self.limits.image_dimension
            || u64::from(height) > self.limits.image_dimension
        {
            return Err(AssetError::ResourceLimitExceeded);
        }
        Ok(())
    }

    pub(crate) fn records(&self) -> &[StagedAssetRecord] {
        &self.records
    }

    #[cfg(test)]
    pub(crate) const fn total_asset_bytes(&self) -> u64 {
        self.total_asset_bytes
    }

    pub(crate) fn get(&self, key: StagedAssetKey) -> Option<&StagedAssetRecord> {
        self.records
            .binary_search_by(|record| record.identity.digest.cmp(&key.0))
            .ok()
            .map(|index| &self.records[index])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn canonical(mime_type: RasterMime, payload: &str) -> String {
        format!("data:{};base64,{payload}", mime_type.as_str())
    }

    fn compact_limits(asset_bytes: u64, assets: u64) -> PackageLimits {
        let mut limits = PackageLimits::V1;
        limits.asset_bytes = asset_bytes;
        limits.assets = assets;
        limits
    }

    fn owned(mime_type: RasterMime, bytes: &[u8]) -> OwnedAssetPayload {
        OwnedAssetPayload::copy_from_slice(mime_type, bytes, &PackageLimits::V1).unwrap()
    }

    #[test]
    fn all_five_canonical_mime_values_decode_exact_bytes() {
        for mime_type in RasterMime::ALL {
            let decoded = decode_canonical_data_url(&canonical(mime_type, "AAEC/w==")).unwrap();
            assert_eq!(decoded.mime_type(), mime_type);
            assert_eq!(decoded.bytes(), &[0, 1, 2, 255]);
        }
    }

    #[test]
    fn aliases_parameters_and_noncanonical_headers_are_rejected() {
        assert_eq!(
            decode_canonical_data_url("data:image/jpg;base64,AA==").unwrap_err(),
            AssetError::UnsupportedMime
        );
        assert_eq!(
            decode_canonical_data_url("data:image/svg+xml;base64,AA==").unwrap_err(),
            AssetError::UnsupportedMime
        );
        assert_eq!(
            decode_canonical_data_url("data:IMAGE/PNG;base64,AA==").unwrap_err(),
            AssetError::UnsupportedMime
        );

        for value in [
            "image/png;base64,AA==",
            "DATA:image/png;base64,AA==",
            "data:image/png;BASE64,AA==",
            "data:image/png;charset=utf-8;base64,AA==",
            "data:image/png;base64;charset=utf-8,AA==",
            "data:image/png;base64AA==",
            "data:image/png;base64,",
        ] {
            assert_eq!(
                decode_canonical_data_url(value).unwrap_err(),
                AssetError::InvalidDataUrl,
                "{value}"
            );
        }
    }

    #[test]
    fn payload_must_be_canonical_padded_standard_base64() {
        for payload in [
            "Zg", "Zg=", "Zg===", "Zg==\n", "Z g==", "Zg%3D%3D", "_w==", "-w==", "Zg==,", "ZE==",
            "Zm9=",
        ] {
            let value = canonical(RasterMime::Png, payload);
            assert_eq!(
                decode_canonical_data_url(&value).unwrap_err(),
                AssetError::InvalidDataUrl,
                "{value}"
            );
        }

        assert_eq!(
            decode_canonical_data_url(&canonical(RasterMime::Png, "Zg=="))
                .unwrap()
                .bytes(),
            b"f"
        );
        assert_eq!(
            decode_canonical_data_url(&canonical(RasterMime::Png, "Zm8="))
                .unwrap()
                .bytes(),
            b"fo"
        );
        assert_eq!(
            decode_canonical_data_url(&canonical(RasterMime::Png, "Zm9v"))
                .unwrap()
                .bytes(),
            b"foo"
        );
    }

    #[test]
    fn decoded_length_is_capped_before_decode_allocation() {
        let limits = compact_limits(2, 1);
        assert_eq!(
            decode_canonical_data_url_with_limits(&canonical(RasterMime::Png, "AQID"), &limits,)
                .unwrap_err(),
            AssetError::ResourceLimitExceeded
        );
        assert_eq!(preflight_canonical_base64(b"AQI=", &limits).unwrap(), 2);
    }

    #[test]
    fn decoded_payload_owns_bytes_independently_of_source_string() {
        let mut source = canonical(RasterMime::Gif, "cG9ydGFibGU=");
        let decoded = decode_canonical_data_url(&source).unwrap();
        source.clear();
        source.push_str("replaced");

        assert_eq!(decoded.mime_type(), RasterMime::Gif);
        assert_eq!(decoded.bytes(), b"portable");
    }

    #[test]
    fn copied_payload_owns_exact_caller_bytes() {
        let mut caller = vec![0, 255, 1, 254];
        let payload =
            OwnedAssetPayload::copy_from_slice(RasterMime::Bmp, &caller, &PackageLimits::V1)
                .unwrap();
        caller.fill(7);

        assert_eq!(payload.bytes(), &[0, 255, 1, 254]);
    }

    #[test]
    fn sha256_identity_uses_lowercase_digest_id_and_canonical_path() {
        let digest = sha256_digest(b"abc");
        let identity = AssetIdentity::from_digest(RasterMime::Jpeg, digest).unwrap();
        let expected = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

        assert_eq!(identity.sha256(), expected);
        assert_eq!(identity.id(), format!("sha256:{expected}"));
        assert_eq!(identity.path(), format!("assets/sha256/{expected}.jpg"));
        assert_eq!(identity.sha256().len(), SHA256_HEX_LENGTH);
        assert!(identity
            .sha256()
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte)));
    }

    #[test]
    fn identity_paths_use_each_canonical_extension() {
        for mime_type in RasterMime::ALL {
            let identity = AssetIdentity::from_digest(mime_type, [0; SHA256_BYTES]).unwrap();
            assert!(identity.path().ends_with(mime_type.extension()));
            assert_eq!(
                identity.id().len(),
                ASSET_ID_PREFIX.len() + SHA256_HEX_LENGTH
            );
        }
    }

    #[test]
    fn identical_exact_bytes_are_deduplicated_after_digest_match() {
        let mut stager = AssetStager::new(PackageLimits::V1);
        let first = stager
            .stage(owned(RasterMime::Png, b"same"), 10, 20)
            .unwrap();
        let second = stager
            .stage(owned(RasterMime::Png, b"same"), 10, 20)
            .unwrap();

        assert!(first.inserted);
        assert!(!second.inserted);
        assert_eq!(first.key, second.key);
        assert_eq!(stager.records().len(), 1);
        assert_eq!(stager.get(first.key).unwrap().bytes(), b"same");
    }

    #[test]
    fn preflight_enforces_unique_limits_without_charging_exact_duplicates() {
        let mut limits = compact_limits(8, 1);
        limits.total_uncompressed_bytes = 4;
        let mut stager = AssetStager::new(limits);
        let staged = stager.stage(owned(RasterMime::Png, b"same"), 1, 1).unwrap();

        assert_eq!(
            stager
                .preflight_stage(&owned(RasterMime::Png, b"same"))
                .unwrap(),
            AssetStagePreflight::ExistingExact(staged.key)
        );
        assert_eq!(
            stager
                .preflight_stage(&owned(RasterMime::Png, b"next"))
                .unwrap_err(),
            AssetError::ResourceLimitExceeded
        );
    }

    fn forced_digest(_: &[u8]) -> AssetDigest {
        [0x5a; SHA256_BYTES]
    }

    #[test]
    fn forced_digest_collision_compares_length_and_exact_bytes() {
        let mut stager = AssetStager::with_digest_function(PackageLimits::V1, forced_digest);
        stager
            .stage(owned(RasterMime::Webp, b"first"), 1, 1)
            .unwrap();

        assert_eq!(
            stager
                .stage(owned(RasterMime::Webp, b"other"), 1, 1)
                .unwrap_err(),
            AssetError::HashCollision
        );
        assert_eq!(
            stager
                .stage(owned(RasterMime::Webp, b"different-length"), 1, 1)
                .unwrap_err(),
            AssetError::HashCollision
        );
        assert_eq!(stager.records().len(), 1);
        assert_eq!(stager.records()[0].bytes(), b"first");
    }

    #[test]
    fn preflight_preserves_collision_precedence_at_the_unique_asset_limit() {
        let limits = compact_limits(32, 1);
        let mut stager = AssetStager::with_digest_function(limits, forced_digest);
        stager
            .stage(owned(RasterMime::Webp, b"first"), 1, 1)
            .unwrap();
        let collision = owned(RasterMime::Webp, b"other");

        assert_eq!(
            stager.preflight_stage(&collision).unwrap(),
            AssetStagePreflight::NeedsValidation
        );
        assert_eq!(
            stager.stage(collision, 1, 1).unwrap_err(),
            AssetError::HashCollision
        );
    }

    #[test]
    fn same_bytes_with_inconsistent_validated_metadata_are_not_merged() {
        let mut stager = AssetStager::with_digest_function(PackageLimits::V1, forced_digest);
        stager.stage(owned(RasterMime::Png, b"same"), 3, 4).unwrap();

        assert_eq!(
            stager
                .stage(owned(RasterMime::Gif, b"same"), 3, 4)
                .unwrap_err(),
            AssetError::MetadataMismatch
        );
        assert_eq!(
            stager
                .stage(owned(RasterMime::Png, b"same"), 4, 3)
                .unwrap_err(),
            AssetError::MetadataMismatch
        );
        assert_eq!(stager.records().len(), 1);
    }

    #[test]
    fn staged_records_are_deterministic_and_sorted_by_path() {
        let inputs = [
            (RasterMime::Gif, b"charlie".as_slice()),
            (RasterMime::Png, b"alpha".as_slice()),
            (RasterMime::Jpeg, b"bravo".as_slice()),
        ];
        let mut forward = AssetStager::new(PackageLimits::V1);
        let mut reverse = AssetStager::new(PackageLimits::V1);

        for (mime_type, bytes) in inputs {
            forward.stage(owned(mime_type, bytes), 8, 9).unwrap();
        }
        for (mime_type, bytes) in inputs.into_iter().rev() {
            reverse.stage(owned(mime_type, bytes), 8, 9).unwrap();
        }

        let forward_paths = forward
            .records()
            .iter()
            .map(|record| record.identity().path())
            .collect::<Vec<_>>();
        let reverse_paths = reverse
            .records()
            .iter()
            .map(|record| record.identity().path())
            .collect::<Vec<_>>();
        assert_eq!(forward_paths, reverse_paths);
        assert!(forward_paths.windows(2).all(|pair| pair[0] < pair[1]));
        assert_eq!(forward.records(), reverse.records());
    }

    #[test]
    fn stager_enforces_unique_asset_count_without_partial_mutation() {
        let limits = compact_limits(64, 1);
        let mut stager = AssetStager::new(limits);
        stager
            .stage(owned(RasterMime::Png, b"first"), 1, 1)
            .unwrap();

        assert_eq!(
            stager
                .stage(owned(RasterMime::Png, b"second"), 1, 1)
                .unwrap_err(),
            AssetError::ResourceLimitExceeded
        );
        assert_eq!(stager.records().len(), 1);
        assert_eq!(stager.records()[0].bytes(), b"first");
    }

    #[test]
    fn stager_checks_aggregate_bytes_before_retaining_a_new_record() {
        let mut limits = compact_limits(8, 4);
        limits.total_uncompressed_bytes = 5;
        let mut stager = AssetStager::new(limits);
        stager.stage(owned(RasterMime::Png, b"123"), 1, 1).unwrap();

        assert_eq!(
            stager
                .stage(owned(RasterMime::Png, b"456"), 1, 1)
                .unwrap_err(),
            AssetError::ResourceLimitExceeded
        );
        assert_eq!(stager.records().len(), 1);
        assert_eq!(stager.total_asset_bytes(), 3);

        // A duplicate references the retained record and consumes no new byte
        // budget.
        assert!(
            !stager
                .stage(owned(RasterMime::Png, b"123"), 1, 1)
                .unwrap()
                .inserted
        );
        assert_eq!(stager.total_asset_bytes(), 3);
    }

    #[test]
    fn zero_or_over_limit_dimensions_are_rejected_before_insertion() {
        let mut limits = PackageLimits::V1;
        limits.image_dimension = 4;
        let mut stager = AssetStager::new(limits);

        assert_eq!(
            stager
                .stage(owned(RasterMime::Png, b"one"), 0, 1)
                .unwrap_err(),
            AssetError::MetadataMismatch
        );
        assert_eq!(
            stager
                .stage(owned(RasterMime::Png, b"two"), 5, 1)
                .unwrap_err(),
            AssetError::ResourceLimitExceeded
        );
        assert!(stager.records().is_empty());
    }

    #[test]
    fn asset_errors_have_stable_allocator_independent_identifiers() {
        let values = [
            (AssetError::InvalidDataUrl, "asset.data-url-invalid"),
            (AssetError::UnsupportedMime, "asset.mime-unsupported"),
            (
                AssetError::ResourceLimitExceeded,
                "asset.resource-limit-exceeded",
            ),
            (AssetError::AllocationFailed, "asset.allocation-failed"),
            (AssetError::HashCollision, "asset.hash-collision"),
            (AssetError::MetadataMismatch, "asset.metadata-mismatch"),
        ];

        for (error, expected) in values {
            assert_eq!(error.as_str(), expected);
            assert_eq!(error.to_string(), expected);
        }
    }
}
