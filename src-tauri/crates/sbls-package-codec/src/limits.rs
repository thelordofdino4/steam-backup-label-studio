//! Exact `.sbls` v1 resource limits and overflow-safe arithmetic.

use crate::error::{FailureStage, ProjectPackageFailure};

pub(crate) const MAX_RAW_ARCHIVE_BYTES: u64 = 268_435_456;
#[cfg(test)]
pub(crate) const RAW_ARCHIVE_PROBE_BYTES: u64 = 268_435_457;
pub(crate) const MAX_TOTAL_UNCOMPRESSED_BYTES: u64 = 268_435_456;
pub(crate) const MAX_ARCHIVE_ENTRIES: u64 = 514;
pub(crate) const MAX_ASSETS: u64 = 512;
pub(crate) const MAX_ASSET_BYTES: u64 = 67_108_864;
pub(crate) const MAX_MANIFEST_BYTES: u64 = 2_097_152;
pub(crate) const MIN_PROJECT_BYTES: u64 = 2;
pub(crate) const MAX_PROJECT_BYTES: u64 = 16_777_216;
pub(crate) const MAX_BINDINGS: u64 = 4_096;
pub(crate) const MAX_IMAGE_DIMENSION: u64 = 16_384;
pub(crate) const MAX_DECODED_PIXELS_PER_ASSET: u64 = 67_108_864;
pub(crate) const MAX_DECODED_PIXELS_TOTAL: u64 = 134_217_728;
pub(crate) const MAX_DECODED_SAMPLE_BYTES_PER_ASSET: u64 = 268_435_456;
pub(crate) const MAX_DECODED_SAMPLE_BYTES_TOTAL: u64 = 536_870_912;
pub(crate) const MAX_EXPANDED_METADATA_BYTES_PER_ASSET: u64 = 8_388_608;
pub(crate) const MAX_EXPANDED_METADATA_BYTES_TOTAL: u64 = 33_554_432;
pub(crate) const MAX_IMAGE_STRUCTURAL_RECORDS_PER_ASSET: u64 = 16_384;
pub(crate) const MAX_IMAGE_STRUCTURAL_RECORDS_TOTAL: u64 = 65_536;
pub(crate) const MAX_DECODER_WORKING_BYTES: u64 = 536_870_912;
pub(crate) const MAX_ACTIVE_DECODERS: u64 = 1;
pub(crate) const MAX_ANIMATION_FRAMES: u64 = 256;
pub(crate) const MAX_DEFLATE_EXPANSION_RATIO: u64 = 200;
pub(crate) const MAX_ENTRY_PATH_BYTES: u64 = 83;
pub(crate) const MAX_PATH_SEGMENT_BYTES: u64 = 69;
pub(crate) const MAX_BINDING_POINTER_BYTES: u64 = 1_024;
pub(crate) const MAX_JSON_DEPTH: u64 = 64;
pub(crate) const MAX_PARSED_JSON_STRING_BYTES: u64 = 1_048_576;
pub(crate) const MAX_HYDRATED_DATA_URL_BYTES: u64 = 89_478_511;
pub(crate) const MAX_HYDRATED_DATA_URL_FAN_OUT_BYTES: u64 = 268_435_456;
pub(crate) const MAX_HYDRATED_PROJECT_STRING_UTF8_BYTES: u64 = 536_870_912;
pub(crate) const MAX_HYDRATED_PROJECT_STRING_UTF16_CODE_UNITS: u64 = 268_435_456;
pub(crate) const MAX_JSON_ARRAY_MEMBERS: u64 = 4_096;
pub(crate) const MAX_JSON_OBJECT_PROPERTIES: u64 = 4_096;
pub(crate) const MAX_RASTER_CHANNELS: u64 = 4;
pub(crate) const MAX_RASTER_BITS_PER_CHANNEL: u64 = 16;
pub(crate) const MIN_DECODED_SAMPLE_BYTES_PER_PIXEL: u64 = 4;
pub(crate) const MAX_PROJECT_SCHEMA_VERSION_BYTES: u64 = 32;
pub(crate) const MAX_CREATED_BY_APPLICATION_BYTES: u64 = 64;
pub(crate) const MAX_CREATED_BY_VERSION_BYTES: u64 = 128;

// Short protocol names used by archive/raster adapters. The longer aliases
// above preserve the contract's “decoded/expanded” terminology.
pub(crate) const MAX_PIXELS_PER_ASSET: u64 = MAX_DECODED_PIXELS_PER_ASSET;
pub(crate) const MAX_PIXELS_PER_PACKAGE: u64 = MAX_DECODED_PIXELS_TOTAL;
pub(crate) const MAX_SAMPLE_BYTES_PER_ASSET: u64 = MAX_DECODED_SAMPLE_BYTES_PER_ASSET;
pub(crate) const MAX_SAMPLE_BYTES_PER_PACKAGE: u64 = MAX_DECODED_SAMPLE_BYTES_TOTAL;
pub(crate) const MAX_METADATA_BYTES_PER_ASSET: u64 = MAX_EXPANDED_METADATA_BYTES_PER_ASSET;
pub(crate) const MAX_METADATA_BYTES_PER_PACKAGE: u64 = MAX_EXPANDED_METADATA_BYTES_TOTAL;
pub(crate) const MAX_STRUCTURAL_RECORDS_PER_ASSET: u64 = MAX_IMAGE_STRUCTURAL_RECORDS_PER_ASSET;
pub(crate) const MAX_STRUCTURAL_RECORDS_PER_PACKAGE: u64 = MAX_IMAGE_STRUCTURAL_RECORDS_TOTAL;
pub(crate) const MAX_DECODER_WORK_BYTES: u64 = MAX_DECODER_WORKING_BYTES;

/// A complete immutable v1 limit set.
///
/// Production codec entry points always use [`Self::V1`]. Keeping the set as a
/// value lets focused tests exercise the same control flow with compact inputs.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct PackageLimits {
    pub raw_archive_bytes: u64,
    pub total_uncompressed_bytes: u64,
    pub archive_entries: u64,
    pub assets: u64,
    pub asset_bytes: u64,
    pub manifest_bytes: u64,
    pub project_bytes: u64,
    pub bindings: u64,
    pub image_dimension: u64,
    pub decoded_pixels_per_asset: u64,
    pub decoded_pixels_total: u64,
    pub decoded_sample_bytes_per_asset: u64,
    pub decoded_sample_bytes_total: u64,
    pub expanded_metadata_bytes_per_asset: u64,
    pub expanded_metadata_bytes_total: u64,
    pub image_structural_records_per_asset: u64,
    pub image_structural_records_total: u64,
    pub decoder_working_bytes: u64,
    pub active_decoders: u64,
    pub animation_frames: u64,
    pub deflate_expansion_ratio: u64,
    pub entry_path_bytes: u64,
    pub path_segment_bytes: u64,
    pub binding_pointer_bytes: u64,
    pub json_depth: u64,
    pub parsed_json_string_bytes: u64,
    pub hydrated_data_url_bytes: u64,
    pub hydrated_data_url_fan_out_bytes: u64,
    pub hydrated_project_string_utf8_bytes: u64,
    pub hydrated_project_string_utf16_code_units: u64,
    pub json_array_members: u64,
    pub json_object_properties: u64,
}

impl PackageLimits {
    pub const V1: Self = Self {
        raw_archive_bytes: MAX_RAW_ARCHIVE_BYTES,
        total_uncompressed_bytes: MAX_TOTAL_UNCOMPRESSED_BYTES,
        archive_entries: MAX_ARCHIVE_ENTRIES,
        assets: MAX_ASSETS,
        asset_bytes: MAX_ASSET_BYTES,
        manifest_bytes: MAX_MANIFEST_BYTES,
        project_bytes: MAX_PROJECT_BYTES,
        bindings: MAX_BINDINGS,
        image_dimension: MAX_IMAGE_DIMENSION,
        decoded_pixels_per_asset: MAX_DECODED_PIXELS_PER_ASSET,
        decoded_pixels_total: MAX_DECODED_PIXELS_TOTAL,
        decoded_sample_bytes_per_asset: MAX_DECODED_SAMPLE_BYTES_PER_ASSET,
        decoded_sample_bytes_total: MAX_DECODED_SAMPLE_BYTES_TOTAL,
        expanded_metadata_bytes_per_asset: MAX_EXPANDED_METADATA_BYTES_PER_ASSET,
        expanded_metadata_bytes_total: MAX_EXPANDED_METADATA_BYTES_TOTAL,
        image_structural_records_per_asset: MAX_IMAGE_STRUCTURAL_RECORDS_PER_ASSET,
        image_structural_records_total: MAX_IMAGE_STRUCTURAL_RECORDS_TOTAL,
        decoder_working_bytes: MAX_DECODER_WORKING_BYTES,
        active_decoders: MAX_ACTIVE_DECODERS,
        animation_frames: MAX_ANIMATION_FRAMES,
        deflate_expansion_ratio: MAX_DEFLATE_EXPANSION_RATIO,
        entry_path_bytes: MAX_ENTRY_PATH_BYTES,
        path_segment_bytes: MAX_PATH_SEGMENT_BYTES,
        binding_pointer_bytes: MAX_BINDING_POINTER_BYTES,
        json_depth: MAX_JSON_DEPTH,
        parsed_json_string_bytes: MAX_PARSED_JSON_STRING_BYTES,
        hydrated_data_url_bytes: MAX_HYDRATED_DATA_URL_BYTES,
        hydrated_data_url_fan_out_bytes: MAX_HYDRATED_DATA_URL_FAN_OUT_BYTES,
        hydrated_project_string_utf8_bytes: MAX_HYDRATED_PROJECT_STRING_UTF8_BYTES,
        hydrated_project_string_utf16_code_units: MAX_HYDRATED_PROJECT_STRING_UTF16_CODE_UNITS,
        json_array_members: MAX_JSON_ARRAY_MEMBERS,
        json_object_properties: MAX_JSON_OBJECT_PROPERTIES,
    };
}

impl Default for PackageLimits {
    fn default() -> Self {
        Self::V1
    }
}

fn resource_limit(stage: FailureStage) -> ProjectPackageFailure {
    ProjectPackageFailure::resource_limit(stage)
}

pub(crate) fn checked_add(
    left: u64,
    right: u64,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    left.checked_add(right).ok_or_else(|| resource_limit(stage))
}

pub(crate) fn checked_mul(
    left: u64,
    right: u64,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    left.checked_mul(right).ok_or_else(|| resource_limit(stage))
}

pub(crate) fn checked_ceil_div(
    value: u64,
    divisor: u64,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    if divisor == 0 {
        return Err(resource_limit(stage));
    }

    let adjusted = checked_add(value, divisor - 1, stage)?;
    Ok(adjusted / divisor)
}

pub(crate) fn ensure_at_most(
    value: u64,
    maximum: u64,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    if value <= maximum {
        Ok(value)
    } else {
        Err(resource_limit(stage))
    }
}

pub(crate) fn checked_add_bounded(
    left: u64,
    right: u64,
    maximum: u64,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    ensure_at_most(checked_add(left, right, stage)?, maximum, stage)
}

pub(crate) fn checked_range_end(
    offset: u64,
    length: u64,
    maximum: u64,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    checked_add_bounded(offset, length, maximum, stage)
}

pub(crate) fn checked_usize(
    value: u64,
    stage: FailureStage,
) -> Result<usize, ProjectPackageFailure> {
    usize::try_from(value).map_err(|_| resource_limit(stage))
}

pub(crate) fn checked_u64(value: usize, stage: FailureStage) -> Result<u64, ProjectPackageFailure> {
    u64::try_from(value).map_err(|_| resource_limit(stage))
}

pub(crate) fn padded_base64_len(
    byte_length: u64,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    checked_mul(checked_ceil_div(byte_length, 3, stage)?, 4, stage)
}

pub(crate) fn hydrated_data_url_len(
    byte_length: u64,
    canonical_prefix_length: u64,
    limits: &PackageLimits,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    ensure_at_most(byte_length, limits.asset_bytes, stage)?;
    let result = checked_add(
        canonical_prefix_length,
        padded_base64_len(byte_length, stage)?,
        stage,
    )?;
    ensure_at_most(result, limits.hydrated_data_url_bytes, stage)
}

pub(crate) fn decoded_pixel_count(
    width: u64,
    height: u64,
    frames: u64,
    limits: &PackageLimits,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    ensure_at_most(width, limits.image_dimension, stage)?;
    ensure_at_most(height, limits.image_dimension, stage)?;
    ensure_at_most(frames, limits.animation_frames, stage)?;
    let pixels = checked_mul(checked_mul(width, height, stage)?, frames, stage)?;
    ensure_at_most(pixels, limits.decoded_pixels_per_asset, stage)
}

pub(crate) fn decoded_sample_charge(
    pixels: u64,
    channels: u64,
    bit_depth: u64,
    limits: &PackageLimits,
    stage: FailureStage,
) -> Result<u64, ProjectPackageFailure> {
    ensure_at_most(channels, MAX_RASTER_CHANNELS, stage)?;
    ensure_at_most(bit_depth, MAX_RASTER_BITS_PER_CHANNEL, stage)?;
    let bytes_per_sample = checked_ceil_div(bit_depth, 8, stage)?;
    let native_charge = checked_mul(
        checked_mul(pixels, channels, stage)?,
        bytes_per_sample,
        stage,
    )?;
    let minimum_charge = checked_mul(pixels, MIN_DECODED_SAMPLE_BYTES_PER_PIXEL, stage)?;
    ensure_at_most(
        native_charge.max(minimum_charge),
        limits.decoded_sample_bytes_per_asset,
        stage,
    )
}

pub(crate) fn check_deflate_ratio(
    uncompressed: u64,
    compressed: u64,
    limits: &PackageLimits,
    stage: FailureStage,
) -> Result<(), ProjectPackageFailure> {
    let maximum = checked_mul(compressed.max(1), limits.deflate_expansion_ratio, stage)?;
    if uncompressed <= maximum {
        Ok(())
    } else {
        Err(resource_limit(stage))
    }
}

/// A pre-charge aggregate counter. Failed charges never change retained state.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct BoundedCounter {
    used: u64,
    maximum: u64,
    stage: FailureStage,
}

impl BoundedCounter {
    pub const fn new(maximum: u64, stage: FailureStage) -> Self {
        Self {
            used: 0,
            maximum,
            stage,
        }
    }

    #[cfg(test)]
    pub const fn used(&self) -> u64 {
        self.used
    }

    #[cfg(test)]
    pub const fn remaining(&self) -> u64 {
        self.maximum - self.used
    }

    pub fn try_charge(&mut self, amount: u64) -> Result<(), ProjectPackageFailure> {
        let next = checked_add_bounded(self.used, amount, self.maximum, self.stage)?;
        self.used = next;
        Ok(())
    }
}

/// Tracks live hostile-input-derived heap storage within one explicitly
/// selected allocation phase. The decoder uses one instance for overlapping
/// owned manifest/project entry buffers and retained manifest/project JSON
/// graphs. It is intentionally separate from the native/raster 512 MiB working
/// ledger and from the hydrated-output fan-out/UTF budgets; it is not a claim
/// that the entire process has a 512 MiB peak.
///
/// Callers must charge a complete checked allocation request before reserving
/// it and release the same receipt only after the owned storage has been
/// dropped or transferred to another precharged owner.
///
/// The ledger deliberately reports a neutral error so each package layer can
/// map exhaustion to its stage-specific stable failure without introducing a
/// dependency from the shared limits module back into JSON or archive policy.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct OperationAllocationLedger {
    maximum: u64,
    retained: u64,
    peak: u64,
}

impl OperationAllocationLedger {
    pub const fn new(maximum: u64) -> Self {
        Self {
            maximum,
            retained: 0,
            peak: 0,
        }
    }

    pub const fn retained(&self) -> u64 {
        self.retained
    }

    #[cfg(test)]
    pub const fn remaining(&self) -> u64 {
        self.maximum - self.retained
    }

    #[cfg(test)]
    pub const fn peak(&self) -> u64 {
        self.peak
    }

    /// Precharges one allocation request. A rejected charge leaves the ledger
    /// unchanged, including checked-add overflow.
    pub fn try_charge(&mut self, amount: u64) -> Result<(), ()> {
        let Some(next) = self.retained.checked_add(amount) else {
            return Err(());
        };
        if next > self.maximum {
            return Err(());
        }
        self.retained = next;
        if next > self.peak {
            self.peak = next;
        }
        Ok(())
    }

    /// Releases a previously admitted receipt. Underflow is rejected without
    /// mutating retained state so accounting bugs cannot silently wrap.
    pub fn release(&mut self, amount: u64) -> Result<(), ()> {
        let Some(next) = self.retained.checked_sub(amount) else {
            return Err(());
        };
        self.retained = next;
        Ok(())
    }
}

/// Operation-local aggregate budgets used while decoding one package.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct DecodeBudget {
    limits: PackageLimits,
    declared_compressed: BoundedCounter,
    declared_uncompressed: BoundedCounter,
    observed_uncompressed: BoundedCounter,
    pixels: BoundedCounter,
    samples: BoundedCounter,
    metadata: BoundedCounter,
    structural_records: BoundedCounter,
    hydrated_fan_out: BoundedCounter,
    hydrated_utf8: BoundedCounter,
    hydrated_utf16: BoundedCounter,
    active_decoders: u64,
    decoder_working_bytes: u64,
}

impl DecodeBudget {
    pub fn new(limits: PackageLimits) -> Self {
        Self {
            limits,
            declared_compressed: BoundedCounter::new(
                limits.raw_archive_bytes,
                FailureStage::ArchiveEnvelope,
            ),
            declared_uncompressed: BoundedCounter::new(
                limits.total_uncompressed_bytes,
                FailureStage::ArchiveEnvelope,
            ),
            observed_uncompressed: BoundedCounter::new(
                limits.total_uncompressed_bytes,
                FailureStage::ArchiveEnvelope,
            ),
            pixels: BoundedCounter::new(limits.decoded_pixels_total, FailureStage::AssetValidation),
            samples: BoundedCounter::new(
                limits.decoded_sample_bytes_total,
                FailureStage::AssetValidation,
            ),
            metadata: BoundedCounter::new(
                limits.expanded_metadata_bytes_total,
                FailureStage::AssetValidation,
            ),
            structural_records: BoundedCounter::new(
                limits.image_structural_records_total,
                FailureStage::AssetValidation,
            ),
            hydrated_fan_out: BoundedCounter::new(
                limits.hydrated_data_url_fan_out_bytes,
                FailureStage::BindingHydration,
            ),
            hydrated_utf8: BoundedCounter::new(
                limits.hydrated_project_string_utf8_bytes,
                FailureStage::BindingHydration,
            ),
            hydrated_utf16: BoundedCounter::new(
                limits.hydrated_project_string_utf16_code_units,
                FailureStage::BindingHydration,
            ),
            active_decoders: 0,
            decoder_working_bytes: 0,
        }
    }

    pub const fn limits(&self) -> &PackageLimits {
        &self.limits
    }

    /// Precharges one central-directory entry without retaining a partial
    /// aggregate if either its per-entry or aggregate ratio/size check fails.
    pub fn precharge_declared_entry(
        &mut self,
        compressed: u64,
        uncompressed: u64,
    ) -> Result<(), ProjectPackageFailure> {
        check_deflate_ratio(
            uncompressed,
            compressed,
            &self.limits,
            FailureStage::ArchiveEnvelope,
        )?;
        let next_compressed = checked_add_bounded(
            self.declared_compressed.used,
            compressed,
            self.limits.raw_archive_bytes,
            FailureStage::ArchiveEnvelope,
        )?;
        let next_uncompressed = checked_add_bounded(
            self.declared_uncompressed.used,
            uncompressed,
            self.limits.total_uncompressed_bytes,
            FailureStage::ArchiveEnvelope,
        )?;
        check_deflate_ratio(
            next_uncompressed,
            next_compressed,
            &self.limits,
            FailureStage::ArchiveEnvelope,
        )?;

        self.declared_compressed.try_charge(compressed)?;
        self.declared_uncompressed.try_charge(uncompressed)?;
        Ok(())
    }

    /// Charges bytes actually produced by Store/Deflate decoding. Declared and
    /// observed totals remain separate, as required by the v1 contract.
    pub fn charge_observed_uncompressed(
        &mut self,
        amount: u64,
    ) -> Result<(), ProjectPackageFailure> {
        let next = checked_add_bounded(
            self.observed_uncompressed.used,
            amount,
            self.limits.total_uncompressed_bytes,
            FailureStage::ArchiveEnvelope,
        )?;
        check_deflate_ratio(
            next,
            self.declared_compressed.used,
            &self.limits,
            FailureStage::ArchiveEnvelope,
        )?;
        self.observed_uncompressed.try_charge(amount)
    }

    #[cfg(test)]
    pub const fn declared_uncompressed(&self) -> u64 {
        self.declared_uncompressed.used()
    }

    #[cfg(test)]
    pub const fn observed_uncompressed(&self) -> u64 {
        self.observed_uncompressed.used()
    }

    pub fn charge_asset_validation(
        &mut self,
        pixels: u64,
        samples: u64,
        metadata: u64,
        structural_records: u64,
    ) -> Result<(), ProjectPackageFailure> {
        ensure_at_most(
            pixels,
            self.limits.decoded_pixels_per_asset,
            FailureStage::AssetValidation,
        )?;
        ensure_at_most(
            samples,
            self.limits.decoded_sample_bytes_per_asset,
            FailureStage::AssetValidation,
        )?;
        ensure_at_most(
            metadata,
            self.limits.expanded_metadata_bytes_per_asset,
            FailureStage::AssetValidation,
        )?;
        ensure_at_most(
            structural_records,
            self.limits.image_structural_records_per_asset,
            FailureStage::AssetValidation,
        )?;

        // Preflight every aggregate before mutating any counter so a failed
        // asset cannot partially consume the operation budget.
        checked_add_bounded(
            self.pixels.used,
            pixels,
            self.limits.decoded_pixels_total,
            FailureStage::AssetValidation,
        )?;
        checked_add_bounded(
            self.samples.used,
            samples,
            self.limits.decoded_sample_bytes_total,
            FailureStage::AssetValidation,
        )?;
        checked_add_bounded(
            self.metadata.used,
            metadata,
            self.limits.expanded_metadata_bytes_total,
            FailureStage::AssetValidation,
        )?;
        checked_add_bounded(
            self.structural_records.used,
            structural_records,
            self.limits.image_structural_records_total,
            FailureStage::AssetValidation,
        )?;

        self.pixels.try_charge(pixels)?;
        self.samples.try_charge(samples)?;
        self.metadata.try_charge(metadata)?;
        self.structural_records.try_charge(structural_records)?;
        Ok(())
    }

    pub fn charge_hydrated_strings(
        &mut self,
        data_url_fan_out: u64,
        utf8_bytes: u64,
        utf16_code_units: u64,
    ) -> Result<(), ProjectPackageFailure> {
        checked_add_bounded(
            self.hydrated_fan_out.used,
            data_url_fan_out,
            self.limits.hydrated_data_url_fan_out_bytes,
            FailureStage::BindingHydration,
        )?;
        checked_add_bounded(
            self.hydrated_utf8.used,
            utf8_bytes,
            self.limits.hydrated_project_string_utf8_bytes,
            FailureStage::BindingHydration,
        )?;
        checked_add_bounded(
            self.hydrated_utf16.used,
            utf16_code_units,
            self.limits.hydrated_project_string_utf16_code_units,
            FailureStage::BindingHydration,
        )?;

        self.hydrated_fan_out.try_charge(data_url_fan_out)?;
        self.hydrated_utf8.try_charge(utf8_bytes)?;
        self.hydrated_utf16.try_charge(utf16_code_units)?;
        Ok(())
    }

    pub fn begin_decoder(&mut self) -> Result<(), ProjectPackageFailure> {
        if self.active_decoders >= self.limits.active_decoders || self.decoder_working_bytes != 0 {
            return Err(resource_limit(FailureStage::AssetValidation));
        }
        self.active_decoders += 1;
        Ok(())
    }

    pub fn charge_decoder_working(&mut self, amount: u64) -> Result<(), ProjectPackageFailure> {
        if self.active_decoders != 1 {
            return Err(resource_limit(FailureStage::AssetValidation));
        }
        let next = checked_add_bounded(
            self.decoder_working_bytes,
            amount,
            self.limits.decoder_working_bytes,
            FailureStage::AssetValidation,
        )?;
        self.decoder_working_bytes = next;
        Ok(())
    }

    pub fn release_decoder_working(&mut self, amount: u64) -> Result<(), ProjectPackageFailure> {
        self.decoder_working_bytes = self
            .decoder_working_bytes
            .checked_sub(amount)
            .ok_or_else(|| resource_limit(FailureStage::AssetValidation))?;
        Ok(())
    }

    pub fn finish_decoder(&mut self) -> Result<(), ProjectPackageFailure> {
        if self.active_decoders != 1 || self.decoder_working_bytes != 0 {
            return Err(resource_limit(FailureStage::AssetValidation));
        }
        self.active_decoders = 0;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::FailureCode;

    const ASSET_PREFIX_LEN: u64 = 23; // `data:image/jpeg;base64,`

    #[test]
    fn production_limit_set_matches_every_protocol_constant() {
        let limits = PackageLimits::V1;
        assert_eq!(limits.raw_archive_bytes, 268_435_456);
        assert_eq!(RAW_ARCHIVE_PROBE_BYTES, limits.raw_archive_bytes + 1);
        assert_eq!(limits.total_uncompressed_bytes, 268_435_456);
        assert_eq!(limits.archive_entries, 514);
        assert_eq!(limits.assets, 512);
        assert_eq!(limits.asset_bytes, 67_108_864);
        assert_eq!(limits.manifest_bytes, 2_097_152);
        assert_eq!(MIN_PROJECT_BYTES, 2);
        assert_eq!(limits.project_bytes, 16_777_216);
        assert_eq!(limits.bindings, 4_096);
        assert_eq!(limits.image_dimension, 16_384);
        assert_eq!(limits.decoded_pixels_per_asset, 67_108_864);
        assert_eq!(limits.decoded_pixels_total, 134_217_728);
        assert_eq!(limits.decoded_sample_bytes_per_asset, 268_435_456);
        assert_eq!(limits.decoded_sample_bytes_total, 536_870_912);
        assert_eq!(limits.expanded_metadata_bytes_per_asset, 8_388_608);
        assert_eq!(limits.expanded_metadata_bytes_total, 33_554_432);
        assert_eq!(limits.image_structural_records_per_asset, 16_384);
        assert_eq!(limits.image_structural_records_total, 65_536);
        assert_eq!(limits.decoder_working_bytes, 536_870_912);
        assert_eq!(limits.active_decoders, 1);
        assert_eq!(limits.animation_frames, 256);
        assert_eq!(limits.deflate_expansion_ratio, 200);
        assert_eq!(limits.entry_path_bytes, 83);
        assert_eq!(limits.path_segment_bytes, 69);
        assert_eq!(limits.binding_pointer_bytes, 1_024);
        assert_eq!(limits.json_depth, 64);
        assert_eq!(limits.parsed_json_string_bytes, 1_048_576);
        assert_eq!(limits.hydrated_data_url_bytes, 89_478_511);
        assert_eq!(limits.hydrated_data_url_fan_out_bytes, 268_435_456);
        assert_eq!(limits.hydrated_project_string_utf8_bytes, 536_870_912);
        assert_eq!(limits.hydrated_project_string_utf16_code_units, 268_435_456);
        assert_eq!(limits.json_array_members, 4_096);
        assert_eq!(limits.json_object_properties, 4_096);
    }

    #[test]
    fn arithmetic_overflow_is_a_stage_specific_resource_failure() {
        let error = checked_add(u64::MAX, 1, FailureStage::ArchiveEnvelope).unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::ArchiveEnvelope);

        let error = checked_mul(u64::MAX, 2, FailureStage::AssetValidation).unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::AssetValidation);
    }

    #[test]
    fn maximum_asset_has_the_contract_data_url_length() {
        assert_eq!(
            padded_base64_len(MAX_ASSET_BYTES, FailureStage::BindingHydration).unwrap(),
            89_478_488
        );
        assert_eq!(
            hydrated_data_url_len(
                MAX_ASSET_BYTES,
                ASSET_PREFIX_LEN,
                &PackageLimits::V1,
                FailureStage::BindingHydration,
            )
            .unwrap(),
            MAX_HYDRATED_DATA_URL_BYTES
        );
    }

    #[test]
    fn sample_charge_uses_the_four_byte_per_pixel_minimum() {
        let limits = PackageLimits::V1;
        assert_eq!(
            decoded_sample_charge(10, 1, 1, &limits, FailureStage::AssetValidation).unwrap(),
            40
        );
        assert_eq!(
            decoded_sample_charge(10, 4, 16, &limits, FailureStage::AssetValidation).unwrap(),
            80
        );
    }

    #[test]
    fn deflate_ratio_accepts_boundary_and_rejects_one_over() {
        let limits = PackageLimits::V1;
        check_deflate_ratio(200, 1, &limits, FailureStage::ArchiveEnvelope).unwrap();
        assert_eq!(
            check_deflate_ratio(201, 1, &limits, FailureStage::ArchiveEnvelope)
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );
        check_deflate_ratio(200, 0, &limits, FailureStage::ArchiveEnvelope).unwrap();
    }

    #[test]
    fn failed_counter_charge_retains_the_previous_value() {
        let mut counter = BoundedCounter::new(10, FailureStage::Manifest);
        counter.try_charge(10).unwrap();
        assert_eq!(counter.used(), 10);
        assert_eq!(counter.remaining(), 0);
        assert!(counter.try_charge(1).is_err());
        assert_eq!(counter.used(), 10);
    }

    #[test]
    fn aggregate_asset_charge_is_atomic() {
        let mut limits = PackageLimits::V1;
        limits.decoded_pixels_total = 10;
        limits.decoded_pixels_per_asset = 10;
        limits.decoded_sample_bytes_total = 100;
        limits.decoded_sample_bytes_per_asset = 100;
        let mut budget = DecodeBudget::new(limits);

        budget.charge_asset_validation(6, 20, 1, 1).unwrap();
        assert!(budget.charge_asset_validation(5, 30, 1, 1).is_err());
        budget.charge_asset_validation(4, 80, 1, 1).unwrap();
    }

    #[test]
    fn declared_and_observed_archive_budgets_are_independent_and_atomic() {
        let mut limits = PackageLimits::V1;
        limits.raw_archive_bytes = 10;
        limits.total_uncompressed_bytes = 20;
        limits.deflate_expansion_ratio = 2;
        let mut budget = DecodeBudget::new(limits);

        budget.precharge_declared_entry(5, 10).unwrap();
        assert_eq!(budget.declared_uncompressed(), 10);
        assert!(budget.precharge_declared_entry(1, 3).is_err());
        assert_eq!(budget.declared_uncompressed(), 10);

        budget.charge_observed_uncompressed(10).unwrap();
        assert_eq!(budget.observed_uncompressed(), 10);
        assert!(budget.charge_observed_uncompressed(1).is_err());
        assert_eq!(budget.observed_uncompressed(), 10);
    }

    #[test]
    fn operation_allocation_ledger_rejects_boundaries_without_contamination() {
        let mut ledger = OperationAllocationLedger::new(8);
        assert_eq!(ledger.retained(), 0);
        assert_eq!(ledger.remaining(), 8);
        assert_eq!(ledger.peak(), 0);

        ledger.try_charge(3).unwrap();
        ledger.try_charge(5).unwrap();
        assert_eq!(ledger.retained(), 8);
        assert_eq!(ledger.remaining(), 0);
        assert_eq!(ledger.peak(), 8);

        assert!(ledger.try_charge(1).is_err());
        assert!(ledger.try_charge(u64::MAX).is_err());
        assert_eq!(ledger.retained(), 8);
        assert_eq!(ledger.peak(), 8);

        assert!(ledger.release(9).is_err());
        assert_eq!(ledger.retained(), 8);
        ledger.release(8).unwrap();
        assert_eq!(ledger.retained(), 0);
        ledger.try_charge(8).unwrap();
    }

    #[test]
    fn decoder_budget_rejects_overlap_and_releases_before_next() {
        let mut limits = PackageLimits::V1;
        limits.decoder_working_bytes = 8;
        let mut budget = DecodeBudget::new(limits);

        budget.begin_decoder().unwrap();
        assert_eq!(
            budget.begin_decoder().unwrap_err().code,
            FailureCode::ResourceLimitExceeded
        );
        budget.charge_decoder_working(8).unwrap();
        assert_eq!(
            budget.charge_decoder_working(1).unwrap_err().code,
            FailureCode::ResourceLimitExceeded
        );
        budget.release_decoder_working(8).unwrap();
        budget.finish_decoder().unwrap();
        budget.begin_decoder().unwrap();
    }
}
