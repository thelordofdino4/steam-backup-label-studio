use std::fmt;

use miniz_oxide::inflate::core::{
    decompress as miniz_decompress, inflate_flags, DecompressorOxide,
};
use miniz_oxide::inflate::TINFLStatus;

use crate::limits::{
    MAX_ANIMATION_FRAMES, MAX_DECODER_WORK_BYTES, MAX_IMAGE_DIMENSION,
    MAX_METADATA_BYTES_PER_ASSET, MAX_METADATA_BYTES_PER_PACKAGE, MAX_PIXELS_PER_ASSET,
    MAX_PIXELS_PER_PACKAGE, MAX_SAMPLE_BYTES_PER_ASSET, MAX_SAMPLE_BYTES_PER_PACKAGE,
    MAX_STRUCTURAL_RECORDS_PER_ASSET, MAX_STRUCTURAL_RECORDS_PER_PACKAGE,
};
use crate::native::{self, NativeCodecFailure};

/// Closed `.sbls` v1 raster allowlist.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum RasterMime {
    Png,
    Jpeg,
    Webp,
    Gif,
    Bmp,
}

impl RasterMime {
    pub const ALL: [Self; 5] = [Self::Png, Self::Jpeg, Self::Webp, Self::Gif, Self::Bmp];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Png => "image/png",
            Self::Jpeg => "image/jpeg",
            Self::Webp => "image/webp",
            Self::Gif => "image/gif",
            Self::Bmp => "image/bmp",
        }
    }

    pub const fn extension(self) -> &'static str {
        match self {
            Self::Png => ".png",
            Self::Jpeg => ".jpg",
            Self::Webp => ".webp",
            Self::Gif => ".gif",
            Self::Bmp => ".bmp",
        }
    }

    pub fn from_canonical(value: &str) -> Option<Self> {
        match value {
            "image/png" => Some(Self::Png),
            "image/jpeg" => Some(Self::Jpeg),
            "image/webp" => Some(Self::Webp),
            "image/gif" => Some(Self::Gif),
            "image/bmp" => Some(Self::Bmp),
            _ => None,
        }
    }

    pub fn canonicalize_declared(value: &str) -> Option<Self> {
        match value {
            "image/jpg" => Some(Self::Jpeg),
            _ => Self::from_canonical(value),
        }
    }
}

impl fmt::Display for RasterMime {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct RasterInfo {
    pub width: u32,
    pub height: u32,
    pub frames: u32,
    pub channels: u8,
    pub bit_depth: u8,
    pub metadata_bytes: u64,
    pub structural_records: u64,
    pub decoder_peak_bytes: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum RasterErrorKind {
    Invalid,
    UnsupportedJpegProfile,
    UnsupportedBmpProfile,
    Dimensions,
    ResourceLimit,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct RasterError {
    pub kind: RasterErrorKind,
    pub diagnostic: &'static str,
    /// Dimensions established by complete structural validation before a
    /// profile rejection. Decode uses these only to preserve the package
    /// contract's manifest-dimension precedence over profile-specific codes.
    pub validated_dimensions: Option<(u32, u32)>,
}

impl RasterError {
    pub(crate) const fn new(kind: RasterErrorKind, diagnostic: &'static str) -> Self {
        Self {
            kind,
            diagnostic,
            validated_dimensions: None,
        }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct RasterBudget {
    total_pixels: u64,
    total_sample_bytes: u64,
    total_metadata_bytes: u64,
    total_structural_records: u64,
    max_total_pixels: u64,
    max_total_sample_bytes: u64,
    max_total_metadata_bytes: u64,
    max_total_structural_records: u64,
    decoder_active: bool,
    decoder_limit: u64,
    peak_decoder_bytes: u64,
}

impl Default for RasterBudget {
    fn default() -> Self {
        Self {
            total_pixels: 0,
            total_sample_bytes: 0,
            total_metadata_bytes: 0,
            total_structural_records: 0,
            max_total_pixels: MAX_PIXELS_PER_PACKAGE,
            max_total_sample_bytes: MAX_SAMPLE_BYTES_PER_PACKAGE,
            max_total_metadata_bytes: MAX_METADATA_BYTES_PER_PACKAGE,
            max_total_structural_records: MAX_STRUCTURAL_RECORDS_PER_PACKAGE,
            decoder_active: false,
            decoder_limit: MAX_DECODER_WORK_BYTES,
            peak_decoder_bytes: 0,
        }
    }
}

impl RasterBudget {
    #[cfg(test)]
    pub(crate) fn with_decoder_limit(decoder_limit: u64) -> Self {
        Self {
            decoder_limit: decoder_limit.min(MAX_DECODER_WORK_BYTES),
            ..Self::default()
        }
    }

    #[cfg(test)]
    pub(crate) fn with_aggregate_limits_for_test(
        max_pixels: u64,
        max_sample_bytes: u64,
        max_metadata_bytes: u64,
        max_structural_records: u64,
    ) -> Self {
        Self {
            max_total_pixels: max_pixels.min(MAX_PIXELS_PER_PACKAGE),
            max_total_sample_bytes: max_sample_bytes.min(MAX_SAMPLE_BYTES_PER_PACKAGE),
            max_total_metadata_bytes: max_metadata_bytes.min(MAX_METADATA_BYTES_PER_PACKAGE),
            max_total_structural_records: max_structural_records
                .min(MAX_STRUCTURAL_RECORDS_PER_PACKAGE),
            ..Self::default()
        }
    }

    #[cfg(test)]
    pub(crate) const fn totals_for_test(&self) -> (u64, u64, u64, u64) {
        (
            self.total_pixels,
            self.total_sample_bytes,
            self.total_metadata_bytes,
            self.total_structural_records,
        )
    }

    #[cfg(test)]
    pub(crate) const fn peak_decoder_bytes(&self) -> u64 {
        self.peak_decoder_bytes
    }

    fn effective_decoder_limit(&self) -> u64 {
        self.decoder_limit.min(MAX_DECODER_WORK_BYTES)
    }

    fn ensure_counts(
        &self,
        width: u32,
        height: u32,
        frames: u32,
        channels: u8,
        bit_depth: u8,
    ) -> Result<(u64, u64), RasterError> {
        let pixels = checked_mul(
            checked_mul(u64::from(width), u64::from(height))?,
            u64::from(frames),
        )?;
        if pixels > MAX_PIXELS_PER_ASSET {
            return Err(resource("decoded pixel budget exceeded"));
        }
        let bytes_per_channel = u64::from(bit_depth).div_ceil(8);
        let represented_samples =
            checked_mul(checked_mul(pixels, u64::from(channels))?, bytes_per_channel)?;
        let sample_bytes = represented_samples.max(checked_mul(pixels, 4)?);
        if sample_bytes > MAX_SAMPLE_BYTES_PER_ASSET {
            return Err(resource("decoded sample budget exceeded"));
        }
        if checked_add(self.total_pixels, pixels)? > self.max_total_pixels
            || checked_add(self.total_sample_bytes, sample_bytes)? > self.max_total_sample_bytes
        {
            return Err(resource("aggregate decoded image budget exceeded"));
        }
        Ok((pixels, sample_bytes))
    }

    fn ensure_metadata_records(
        &self,
        metadata_bytes: u64,
        structural_records: u64,
    ) -> Result<(), RasterError> {
        if metadata_bytes > MAX_METADATA_BYTES_PER_ASSET {
            return Err(resource("expanded metadata budget exceeded"));
        }
        if structural_records > MAX_STRUCTURAL_RECORDS_PER_ASSET {
            return Err(resource("image structural-record budget exceeded"));
        }
        if checked_add(self.total_metadata_bytes, metadata_bytes)? > self.max_total_metadata_bytes
            || checked_add(self.total_structural_records, structural_records)?
                > self.max_total_structural_records
        {
            return Err(resource("aggregate image metadata budget exceeded"));
        }
        Ok(())
    }

    fn metadata_remaining(&self, current_asset_bytes: u64) -> Result<u64, RasterError> {
        self.ensure_metadata_records(current_asset_bytes, 0)?;
        let asset_remaining = MAX_METADATA_BYTES_PER_ASSET - current_asset_bytes;
        let package_used = checked_add(self.total_metadata_bytes, current_asset_bytes)?;
        let package_remaining = self.max_total_metadata_bytes - package_used;
        Ok(asset_remaining.min(package_remaining))
    }

    fn structural_records_remaining(&self, current_asset_records: u64) -> Result<u64, RasterError> {
        self.ensure_metadata_records(0, current_asset_records)?;
        let asset_remaining = MAX_STRUCTURAL_RECORDS_PER_ASSET - current_asset_records;
        let package_used = checked_add(self.total_structural_records, current_asset_records)?;
        let package_remaining = self.max_total_structural_records - package_used;
        Ok(asset_remaining.min(package_remaining))
    }

    fn ensure_decoder_peak(&self, decoder_peak_bytes: u64) -> Result<(), RasterError> {
        if decoder_peak_bytes > self.effective_decoder_limit() {
            return Err(resource("decoder working-allocation budget exceeded"));
        }
        Ok(())
    }

    fn commit(&mut self, info: RasterInfo) -> Result<(), RasterError> {
        let (pixels, sample_bytes) = self.ensure_counts(
            info.width,
            info.height,
            info.frames,
            info.channels,
            info.bit_depth,
        )?;
        self.ensure_metadata_records(info.metadata_bytes, info.structural_records)?;
        self.ensure_decoder_peak(info.decoder_peak_bytes)?;
        let total_pixels = checked_add(self.total_pixels, pixels)?;
        let total_sample_bytes = checked_add(self.total_sample_bytes, sample_bytes)?;
        let total_metadata_bytes = checked_add(self.total_metadata_bytes, info.metadata_bytes)?;
        let total_structural_records =
            checked_add(self.total_structural_records, info.structural_records)?;
        self.total_pixels = total_pixels;
        self.total_sample_bytes = total_sample_bytes;
        self.total_metadata_bytes = total_metadata_bytes;
        self.total_structural_records = total_structural_records;
        self.peak_decoder_bytes = self.peak_decoder_bytes.max(info.decoder_peak_bytes);
        Ok(())
    }
}

pub(crate) fn validate_raster(
    bytes: &[u8],
    mime: RasterMime,
    budget: &mut RasterBudget,
) -> Result<RasterInfo, RasterError> {
    if budget.decoder_active {
        return Err(resource("only one image validator may be active"));
    }
    if budget.effective_decoder_limit() == 0 {
        return Err(resource("no decoder working-memory budget remains"));
    }
    budget.decoder_active = true;
    let result = match mime {
        RasterMime::Png => validate_png(bytes, budget),
        RasterMime::Jpeg => validate_jpeg(bytes, budget),
        RasterMime::Webp => validate_webp(bytes, budget),
        RasterMime::Gif => validate_gif(bytes, budget),
        RasterMime::Bmp => validate_bmp(bytes, budget),
    };
    budget.decoder_active = false;
    let info = result?;
    budget.commit(info)?;
    Ok(info)
}

fn checked_add(left: u64, right: u64) -> Result<u64, RasterError> {
    left.checked_add(right)
        .ok_or_else(|| resource("image arithmetic overflow"))
}

fn checked_mul(left: u64, right: u64) -> Result<u64, RasterError> {
    left.checked_mul(right)
        .ok_or_else(|| resource("image arithmetic overflow"))
}

fn resource(diagnostic: &'static str) -> RasterError {
    RasterError::new(RasterErrorKind::ResourceLimit, diagnostic)
}

fn invalid(diagnostic: &'static str) -> RasterError {
    RasterError::new(RasterErrorKind::Invalid, diagnostic)
}

fn dimensions(diagnostic: &'static str) -> RasterError {
    RasterError::new(RasterErrorKind::Dimensions, diagnostic)
}

fn profile(
    kind: RasterErrorKind,
    diagnostic: &'static str,
    width: u32,
    height: u32,
) -> RasterError {
    RasterError {
        kind,
        diagnostic,
        validated_dimensions: Some((width, height)),
    }
}

fn read_u16_be(bytes: &[u8], offset: usize) -> Result<u16, RasterError> {
    let end = offset
        .checked_add(2)
        .ok_or_else(|| invalid("truncated image integer"))?;
    let value = bytes
        .get(offset..end)
        .ok_or_else(|| invalid("truncated image integer"))?;
    Ok(u16::from_be_bytes([value[0], value[1]]))
}

fn read_u16_le(bytes: &[u8], offset: usize) -> Result<u16, RasterError> {
    let end = offset
        .checked_add(2)
        .ok_or_else(|| invalid("truncated image integer"))?;
    let value = bytes
        .get(offset..end)
        .ok_or_else(|| invalid("truncated image integer"))?;
    Ok(u16::from_le_bytes([value[0], value[1]]))
}

fn read_u32_le(bytes: &[u8], offset: usize) -> Result<u32, RasterError> {
    let end = offset
        .checked_add(4)
        .ok_or_else(|| invalid("truncated image integer"))?;
    let value = bytes
        .get(offset..end)
        .ok_or_else(|| invalid("truncated image integer"))?;
    Ok(u32::from_le_bytes([value[0], value[1], value[2], value[3]]))
}

fn validate_dimensions(width: u32, height: u32) -> Result<(), RasterError> {
    validate_dimension_ceiling(width, height)?;
    if width == 0 || height == 0 {
        return Err(dimensions("zero image dimension"));
    }
    Ok(())
}

fn validate_dimension_ceiling(width: u32, height: u32) -> Result<(), RasterError> {
    if u64::from(width) > MAX_IMAGE_DIMENSION || u64::from(height) > MAX_IMAGE_DIMENSION {
        return Err(resource("image dimension budget exceeded"));
    }
    Ok(())
}

const BMP_PROFILE_LINKED: u32 = 0x4c49_4e4b;
const BMP_PROFILE_EMBEDDED: u32 = 0x4d42_4544;

#[derive(Clone, Copy)]
struct BmpV5ProfileSpan {
    start: u64,
    end: u64,
    color_space_type: u32,
}

fn validate_bmp(bytes: &[u8], budget: &RasterBudget) -> Result<RasterInfo, RasterError> {
    if bytes.len() < 14 || bytes.get(0..2) != Some(b"BM") {
        return Err(invalid("invalid BMP signature"));
    }
    let declared_file_size = read_u32_le(bytes, 2)? as usize;
    let reserved_one = read_u16_le(bytes, 6)?;
    let reserved_two = read_u16_le(bytes, 8)?;
    let pixel_offset = read_u32_le(bytes, 10)? as usize;
    let dib_size = read_u32_le(bytes, 14)? as usize;
    if dib_size < 12 {
        return Err(invalid("invalid BMP DIB header size"));
    }
    let dib_end = 14usize
        .checked_add(dib_size)
        .ok_or_else(|| resource("BMP header arithmetic overflow"))?;
    if dib_end > bytes.len() || pixel_offset < dib_end || pixel_offset > bytes.len() {
        return Err(invalid("invalid BMP pixel offset"));
    }
    if declared_file_size != bytes.len() {
        return Err(invalid("BMP declared size disagrees with input"));
    }
    if reserved_one != 0 || reserved_two != 0 {
        return Err(invalid("BMP reserved fields must be zero"));
    }
    if dib_size == 12 {
        let width = u32::from(read_u16_le(bytes, 18)?);
        let height = u32::from(read_u16_le(bytes, 20)?);
        validate_dimension_ceiling(width, height)?;
        if read_u16_le(bytes, 22)? != 1 {
            return Err(invalid("OS/2 BMP planes value must be one"));
        }
        let bit_count = read_u16_le(bytes, 24)?;
        if !matches!(bit_count, 1 | 4 | 8 | 24) {
            return Err(invalid("invalid OS/2 BMP bit depth"));
        }
        let palette_entries = if bit_count <= 8 { 1u64 << bit_count } else { 0 };
        let minimum_offset = checked_add(dib_end as u64, checked_mul(palette_entries, 3)?)?;
        if (pixel_offset as u64) < minimum_offset {
            return Err(invalid("OS/2 BMP palette overlaps pixel data"));
        }
        let pixel_bytes = bmp_uncompressed_pixel_bytes(width, height, bit_count)?;
        if validate_bmp_pixel_span(bytes, pixel_offset, pixel_bytes)? != bytes.len() as u64 {
            return Err(invalid(
                "BMP pixel span is truncated or has trailing payload",
            ));
        }
        validate_dimensions(width, height)?;
        return Err(profile(
            RasterErrorKind::UnsupportedBmpProfile,
            "OS/2 BMP is outside package v1",
            width,
            height,
        ));
    }
    if dib_size < 40 {
        return Err(invalid("unknown BMP DIB header cannot be validated"));
    }
    if !matches!(dib_size, 40 | 52 | 56 | 64 | 108 | 124) {
        return Err(invalid("unknown BMP DIB header cannot be validated"));
    }

    let width_signed = read_u32_le(bytes, 18)? as i32;
    let height_signed = read_u32_le(bytes, 22)? as i32;
    if width_signed < 0 {
        return Err(invalid("negative BMP width"));
    }
    let width = width_signed as u32;
    let height = height_signed.unsigned_abs();
    validate_dimension_ceiling(width, height)?;

    let planes = read_u16_le(bytes, 26)?;
    let bit_count = read_u16_le(bytes, 28)?;
    let compression = read_u32_le(bytes, 30)?;
    let declared_image_size = read_u32_le(bytes, 34)? as u64;
    let x_pixels_per_meter = read_u32_le(bytes, 38)?;
    let y_pixels_per_meter = read_u32_le(bytes, 42)?;
    let colors_used = read_u32_le(bytes, 46)?;
    let colors_important = read_u32_le(bytes, 50)?;

    if planes != 1 {
        return Err(invalid("BMP planes value must be one"));
    }
    if colors_important != 0 && (colors_used == 0 || colors_important > colors_used) {
        return Err(invalid("BMP important-color count is inconsistent"));
    }

    let maximum_palette_entries = if bit_count != 0 && bit_count <= 8 {
        1u64 << bit_count
    } else {
        0
    };
    if maximum_palette_entries != 0 && u64::from(colors_used) > maximum_palette_entries {
        return Err(invalid("BMP color-table count exceeds bit depth"));
    }
    let palette_entries = if maximum_palette_entries == 0 {
        u64::from(colors_used)
    } else if colors_used == 0 {
        maximum_palette_entries
    } else {
        u64::from(colors_used)
    };
    let mask_bytes = if dib_size == 40 && matches!(compression, 3 | 6) {
        if compression == 6 {
            16
        } else {
            12
        }
    } else {
        0
    };
    let minimum_offset = checked_add(
        dib_end as u64,
        checked_add(mask_bytes, checked_mul(palette_entries, 4)?)?,
    )?;
    let v5_profile = if dib_size == 124 {
        let color_space_type = read_u32_le(bytes, 70)?;
        let profile_offset = read_u32_le(bytes, 126)? as u64;
        let profile_size = read_u32_le(bytes, 130)? as u64;
        let reserved = read_u32_le(bytes, 134)?;
        if reserved != 0 {
            return Err(invalid("invalid BMP v5 profile fields"));
        }
        let profile_color_space =
            matches!(color_space_type, BMP_PROFILE_LINKED | BMP_PROFILE_EMBEDDED);
        if (profile_offset == 0) != (profile_size == 0) {
            return Err(invalid("invalid BMP v5 profile fields"));
        }
        if profile_offset == 0 {
            if profile_color_space {
                return Err(invalid("BMP v5 color profile payload is missing"));
            }
            None
        } else {
            if !profile_color_space || profile_offset & 3 != 0 {
                return Err(invalid("invalid BMP v5 color profile declaration"));
            }
            let profile_start = checked_add(14, profile_offset)?;
            let profile_end = checked_add(profile_start, profile_size)?;
            Some(BmpV5ProfileSpan {
                start: profile_start,
                end: profile_end,
                color_space_type,
            })
        }
    } else {
        None
    };
    if (pixel_offset as u64) < minimum_offset {
        return Err(invalid("BMP header or color data overlaps pixel data"));
    }

    let pixel_bytes = match compression {
        0 if matches!(bit_count, 1 | 4 | 8 | 16 | 24 | 32) => {
            let expected = bmp_uncompressed_pixel_bytes(width, height, bit_count)?;
            if declared_image_size != 0 && declared_image_size != expected {
                return Err(invalid("BMP declared pixel size disagrees with dimensions"));
            }
            expected
        }
        1 if bit_count == 8 && height_signed > 0 => {
            validate_bmp_rle(
                bytes,
                pixel_offset,
                declared_image_size,
                width,
                height,
                false,
            )?;
            declared_image_size
        }
        2 if bit_count == 4 && height_signed > 0 => {
            validate_bmp_rle(
                bytes,
                pixel_offset,
                declared_image_size,
                width,
                height,
                true,
            )?;
            declared_image_size
        }
        3 | 6 if matches!(bit_count, 16 | 32) => {
            validate_bmp_bit_masks(bytes, dib_size, compression, bit_count)?;
            let expected = bmp_uncompressed_pixel_bytes(width, height, bit_count)?;
            if declared_image_size != 0 && declared_image_size != expected {
                return Err(invalid(
                    "BMP declared bitfield size disagrees with dimensions",
                ));
            }
            expected
        }
        4 | 5 if bit_count == 0 && height_signed > 0 && declared_image_size != 0 => {
            let pixel_end = validate_bmp_pixel_span(bytes, pixel_offset, declared_image_size)?;
            let pixel_end = usize::try_from(pixel_end)
                .map_err(|_| resource("BMP pixel span exceeds addressable memory"))?;
            validate_embedded_bmp_payload(
                &bytes[pixel_offset..pixel_end],
                compression,
                width,
                height,
                budget,
            )?;
            declared_image_size
        }
        _ => return Err(invalid("invalid BMP compression and bit-depth combination")),
    };
    let pixel_end = validate_bmp_pixel_span(bytes, pixel_offset, pixel_bytes)?;
    if let Some(profile_span) = v5_profile {
        if profile_span.start < pixel_end {
            return Err(invalid("BMP v5 color profile overlaps pixel data"));
        }
        if profile_span.start != pixel_end {
            return Err(invalid(
                "BMP v5 color profile does not immediately follow pixel data",
            ));
        }
        if profile_span.end != bytes.len() as u64 {
            return Err(invalid(
                "BMP v5 color profile is truncated or has trailing payload",
            ));
        }
        let profile_start = usize::try_from(profile_span.start)
            .map_err(|_| resource("BMP v5 profile span exceeds addressable memory"))?;
        let profile_end = usize::try_from(profile_span.end)
            .map_err(|_| resource("BMP v5 profile span exceeds addressable memory"))?;
        let profile = &bytes[profile_start..profile_end];
        if profile_span.color_space_type == BMP_PROFILE_LINKED
            && (profile.len() < 2
                || profile.last() != Some(&0)
                || profile[..profile.len() - 1].contains(&0))
        {
            return Err(invalid("invalid BMP v5 linked-profile name"));
        }
    } else if pixel_end != bytes.len() as u64 {
        return Err(invalid(
            "BMP pixel span is truncated or has trailing payload",
        ));
    }
    validate_dimensions(width, height)?;

    if dib_size != 40 {
        return Err(profile(
            RasterErrorKind::UnsupportedBmpProfile,
            "extended BMP DIB profile is outside package v1",
            width,
            height,
        ));
    }
    if height_signed < 0 {
        return Err(profile(
            RasterErrorKind::UnsupportedBmpProfile,
            "top-down BMP is outside package v1",
            width,
            height,
        ));
    }
    if bit_count != 24 || compression != 0 {
        return Err(profile(
            RasterErrorKind::UnsupportedBmpProfile,
            "BMP pixel encoding is outside package v1",
            width,
            height,
        ));
    }
    if declared_image_size != pixel_bytes {
        return Err(profile(
            RasterErrorKind::UnsupportedBmpProfile,
            "BMP omits the canonical package-v1 pixel size",
            width,
            height,
        ));
    }
    if pixel_offset != 54
        || x_pixels_per_meter != 0
        || y_pixels_per_meter != 0
        || colors_used != 0
        || colors_important != 0
    {
        return Err(profile(
            RasterErrorKind::UnsupportedBmpProfile,
            "well-formed BMP is not in the canonical package-v1 subprofile",
            width,
            height,
        ));
    }

    Ok(RasterInfo {
        width,
        height,
        frames: 1,
        channels: 3,
        bit_depth: 8,
        metadata_bytes: 0,
        structural_records: 2,
        decoder_peak_bytes: 0,
    })
}

fn bmp_uncompressed_pixel_bytes(
    width: u32,
    height: u32,
    bit_count: u16,
) -> Result<u64, RasterError> {
    let row_bits = checked_mul(u64::from(width), u64::from(bit_count))?;
    let row_stride = checked_mul(checked_add(row_bits, 31)? / 32, 4)?;
    checked_mul(row_stride, u64::from(height))
}

fn validate_bmp_pixel_span(
    bytes: &[u8],
    pixel_offset: usize,
    pixel_bytes: u64,
) -> Result<u64, RasterError> {
    let pixel_end = checked_add(pixel_offset as u64, pixel_bytes)?;
    if pixel_end > bytes.len() as u64 {
        return Err(invalid("BMP pixel span is truncated"));
    }
    Ok(pixel_end)
}

fn validate_bmp_bit_masks(
    bytes: &[u8],
    dib_size: usize,
    compression: u32,
    bit_count: u16,
) -> Result<(), RasterError> {
    let mask_count = if compression == 6 { 4 } else { 3 };
    if dib_size != 40 && dib_size < 40 + mask_count * 4 {
        return Err(invalid("BMP DIB header omits required bit masks"));
    }
    let mut masks = [0u32; 4];
    for index in 0..mask_count {
        let mask = read_u32_le(bytes, 54 + index * 4)?;
        if mask == 0 || (u64::from(mask) >> bit_count) != 0 {
            return Err(invalid("BMP bit mask is invalid for bit depth"));
        }
        if masks[..index].iter().any(|prior| *prior & mask != 0) {
            return Err(invalid("BMP bit masks overlap"));
        }
        masks[index] = mask;
    }
    Ok(())
}

fn validate_embedded_bmp_payload(
    payload: &[u8],
    compression: u32,
    expected_width: u32,
    expected_height: u32,
    budget: &RasterBudget,
) -> Result<(), RasterError> {
    let decoded = if compression == 4 {
        match validate_jpeg(payload, budget) {
            Ok(info) => Some(info),
            Err(error) if error.kind == RasterErrorKind::UnsupportedJpegProfile => {
                if error.validated_dimensions != Some((expected_width, expected_height)) {
                    return Err(dimensions(
                        "embedded BMP dimensions disagree with the DIB header",
                    ));
                }
                None
            }
            Err(error) => return Err(error),
        }
    } else {
        Some(validate_png(payload, budget)?)
    };
    if let Some(info) = decoded {
        if info.width != expected_width || info.height != expected_height {
            return Err(dimensions(
                "embedded BMP dimensions disagree with the DIB header",
            ));
        }
    }
    Ok(())
}

fn validate_bmp_rle(
    bytes: &[u8],
    pixel_offset: usize,
    declared_size: u64,
    width: u32,
    height: u32,
    four_bit: bool,
) -> Result<(), RasterError> {
    if declared_size == 0 {
        return Err(invalid("compressed BMP pixel span disagrees with input"));
    }
    let pixel_end = validate_bmp_pixel_span(bytes, pixel_offset, declared_size)?;
    let pixel_end = usize::try_from(pixel_end)
        .map_err(|_| resource("BMP RLE span exceeds addressable memory"))?;
    let data = &bytes[pixel_offset..pixel_end];
    let mut position = 0usize;
    let mut x = 0u32;
    let mut y = 0u32;
    let mut saw_end = false;
    while position < data.len() {
        let command = data
            .get(position..position.saturating_add(2))
            .ok_or_else(|| invalid("truncated BMP RLE command"))?;
        position += 2;
        let count = command[0];
        let value = command[1];
        if count != 0 {
            x = x
                .checked_add(u32::from(count))
                .ok_or_else(|| resource("BMP RLE coordinate overflow"))?;
            if x > width || y >= height {
                return Err(invalid("BMP RLE run exceeds dimensions"));
            }
            continue;
        }
        match value {
            0 => {
                x = 0;
                y = y
                    .checked_add(1)
                    .ok_or_else(|| resource("BMP RLE coordinate overflow"))?;
                if y > height {
                    return Err(invalid("BMP RLE rows exceed dimensions"));
                }
            }
            1 => {
                saw_end = true;
                break;
            }
            2 => {
                let delta = data
                    .get(position..position.saturating_add(2))
                    .ok_or_else(|| invalid("truncated BMP RLE delta"))?;
                position += 2;
                x = x
                    .checked_add(u32::from(delta[0]))
                    .ok_or_else(|| resource("BMP RLE coordinate overflow"))?;
                y = y
                    .checked_add(u32::from(delta[1]))
                    .ok_or_else(|| resource("BMP RLE coordinate overflow"))?;
                if x > width || y >= height {
                    return Err(invalid("BMP RLE delta exceeds dimensions"));
                }
            }
            literal => {
                x = x
                    .checked_add(u32::from(literal))
                    .ok_or_else(|| resource("BMP RLE coordinate overflow"))?;
                if x > width || y >= height {
                    return Err(invalid("BMP RLE literal exceeds dimensions"));
                }
                let packed = if four_bit {
                    usize::from(literal).div_ceil(2)
                } else {
                    usize::from(literal)
                };
                let padded = packed
                    .checked_add(packed & 1)
                    .ok_or_else(|| resource("BMP RLE length overflow"))?;
                position = position
                    .checked_add(padded)
                    .ok_or_else(|| resource("BMP RLE offset overflow"))?;
                if position > data.len() {
                    return Err(invalid("truncated BMP RLE literal"));
                }
            }
        }
    }
    if !saw_end || position != data.len() {
        return Err(invalid(
            "BMP RLE stream is incomplete or has trailing payload",
        ));
    }
    Ok(())
}

#[derive(Clone, Copy, Debug)]
struct JpegFrame {
    width: u32,
    height: u32,
    components: u8,
    bit_depth: u8,
    marker: u8,
    identifiers: [u8; 255],
    quantization_mask: u8,
    profile_supported: bool,
}

#[derive(Clone, Copy, Debug)]
struct JpegScanParameters {
    component_indices: [u8; 4],
    component_count: u8,
    spectral_start: u8,
    spectral_end: u8,
    approximation_high: u8,
    approximation_low: u8,
}

struct JpegScanState {
    component_seen: [bool; 255],
    coefficient_approximation: [[u8; 64]; 255],
}

impl JpegScanState {
    const UNSEEN: u8 = u8::MAX;

    fn new() -> Self {
        Self {
            component_seen: [false; 255],
            coefficient_approximation: [[Self::UNSEEN; 64]; 255],
        }
    }

    fn register(&mut self, frame: &JpegFrame, scan: JpegScanParameters) -> Result<(), RasterError> {
        if matches!(frame.marker, 0xc2 | 0xc6 | 0xca | 0xce) {
            for selected in &scan.component_indices[..usize::from(scan.component_count)] {
                let component = usize::from(*selected);
                for coefficient in scan.spectral_start..=scan.spectral_end {
                    let approximation =
                        &mut self.coefficient_approximation[component][usize::from(coefficient)];
                    if *approximation == Self::UNSEEN {
                        if scan.approximation_high != 0 {
                            return Err(invalid(
                                "progressive JPEG refinement precedes an initial scan",
                            ));
                        }
                    } else if scan.approximation_high == 0
                        || *approximation != scan.approximation_high
                    {
                        return Err(invalid(
                            "progressive JPEG scan overlaps or refines out of order",
                        ));
                    }
                    *approximation = scan.approximation_low;
                }
            }
        } else {
            for selected in &scan.component_indices[..usize::from(scan.component_count)] {
                let component = usize::from(*selected);
                if self.component_seen[component] {
                    return Err(invalid("JPEG component occurs in multiple complete scans"));
                }
                self.component_seen[component] = true;
            }
        }
        Ok(())
    }

    fn finish(&self, frame: &JpegFrame) -> Result<(), RasterError> {
        let components = usize::from(frame.components);
        let complete = if matches!(frame.marker, 0xc2 | 0xc6 | 0xca | 0xce) {
            self.coefficient_approximation[..components]
                .iter()
                .all(|coefficients| coefficients[0] != Self::UNSEEN)
        } else {
            self.component_seen[..components].iter().all(|seen| *seen)
        };
        if !complete {
            return Err(invalid("JPEG frame does not scan every component"));
        }
        Ok(())
    }
}

fn validate_jpeg(bytes: &[u8], budget: &RasterBudget) -> Result<RasterInfo, RasterError> {
    if bytes.len() < 4 || bytes.get(0..2) != Some(&[0xff, 0xd8]) {
        return Err(invalid("invalid JPEG SOI"));
    }

    let mut position = 2usize;
    let mut frame: Option<JpegFrame> = None;
    let mut scans = 0u64;
    let mut records = 1u64;
    let mut metadata_bytes = 0u64;
    let mut profile_supported = true;
    let mut native_decode_blocked = false;
    let mut saw_eoi = false;
    let mut adobe_transform: Option<u8> = None;
    let mut hierarchy: Option<JpegFrame> = None;
    let mut current_frame_scans = 0u64;
    let mut saw_nondifferential_frame = false;
    let mut quantization_tables = 0u8;
    let mut dc_huffman_tables = 0u8;
    let mut ac_huffman_tables = 0u8;
    let mut scan_state = JpegScanState::new();
    budget.ensure_metadata_records(0, records)?;

    while position < bytes.len() {
        if bytes[position] != 0xff {
            return Err(invalid("JPEG marker prefix is missing"));
        }
        while position < bytes.len() && bytes[position] == 0xff {
            position += 1;
        }
        let marker = *bytes
            .get(position)
            .ok_or_else(|| invalid("truncated JPEG marker"))?;
        position += 1;
        if marker == 0x00 || marker == 0xd8 || (0xd0..=0xd7).contains(&marker) {
            return Err(invalid("JPEG marker is invalid in this position"));
        }
        records = checked_add(records, 1)?;
        budget.ensure_metadata_records(metadata_bytes, records)?;
        if marker == 0xd9 {
            saw_eoi = true;
            break;
        }
        if marker == 0x01 {
            profile_supported = false;
            native_decode_blocked = true;
            continue;
        }

        let segment_length = read_u16_be(bytes, position)? as usize;
        if segment_length < 2 {
            return Err(invalid("invalid JPEG segment length"));
        }
        let payload_start = position
            .checked_add(2)
            .ok_or_else(|| resource("JPEG offset overflow"))?;
        let segment_end = position
            .checked_add(segment_length)
            .ok_or_else(|| resource("JPEG offset overflow"))?;
        let payload = bytes
            .get(payload_start..segment_end)
            .ok_or_else(|| invalid("truncated JPEG segment"))?;
        position = segment_end;

        match marker {
            0xe0..=0xef | 0xfe => {
                metadata_bytes = checked_add(metadata_bytes, payload.len() as u64)?;
                budget.ensure_metadata_records(metadata_bytes, records)?;
                if marker == 0xee && payload.len() >= 12 && payload.get(0..5) == Some(b"Adobe") {
                    if adobe_transform.is_some() {
                        return Err(invalid("JPEG has duplicate Adobe color metadata"));
                    }
                    adobe_transform = payload.get(11).copied();
                }
            }
            0xdb => quantization_tables |= validate_jpeg_quantization_tables(payload)?,
            0xc4 => {
                let (dc, ac) = validate_jpeg_huffman_tables(payload)?;
                dc_huffman_tables |= dc;
                ac_huffman_tables |= ac;
            }
            0xdd => {
                if payload.len() != 2 {
                    return Err(invalid("invalid JPEG restart interval"));
                }
            }
            0xcc => {
                validate_jpeg_arithmetic_tables(payload)?;
                profile_supported = false;
                native_decode_blocked = true;
            }
            0xc0..=0xcf if !matches!(marker, 0xc4 | 0xc8 | 0xcc) => {
                let differential = matches!(marker, 0xc5 | 0xc6 | 0xc7 | 0xcd | 0xce | 0xcf);
                if differential && hierarchy.is_none() {
                    return Err(invalid("differential JPEG frame has no hierarchy"));
                }
                if frame.is_some() && (hierarchy.is_none() || current_frame_scans == 0) {
                    return Err(invalid("JPEG contains an invalid additional frame"));
                }
                if let Some(previous) = frame.as_ref() {
                    scan_state.finish(previous)?;
                    scan_state = JpegScanState::new();
                }
                if !differential {
                    if saw_nondifferential_frame {
                        return Err(invalid("JPEG hierarchy has multiple base frames"));
                    }
                    saw_nondifferential_frame = true;
                }
                let parsed = parse_jpeg_frame(marker, payload)?;
                validate_dimension_ceiling(parsed.width, parsed.height)?;
                profile_supported &= parsed.profile_supported;
                native_decode_blocked |=
                    !matches!(parsed.marker, 0xc0..=0xc2) || parsed.bit_depth != 8;
                frame = Some(parsed);
                current_frame_scans = 0;
            }
            0xda => {
                let current = frame.ok_or_else(|| invalid("JPEG scan precedes frame"))?;
                if !matches!(current.marker, 0xc3 | 0xc7 | 0xcb | 0xcf)
                    && current.quantization_mask & !quantization_tables != 0
                {
                    return Err(invalid("JPEG scan references a missing quantization table"));
                }
                let scan = validate_jpeg_scan_header(
                    payload,
                    current,
                    dc_huffman_tables,
                    ac_huffman_tables,
                )?;
                scan_state.register(&current, scan)?;
                scans = checked_add(scans, 1)?;
                current_frame_scans = checked_add(current_frame_scans, 1)?;
                let (next_position, entropy_records) = scan_jpeg_entropy(bytes, position)?;
                records = checked_add(records, entropy_records)?;
                budget.ensure_metadata_records(metadata_bytes, records)?;
                position = next_position;
            }
            0xdc => {
                if payload.len() != 2 || current_frame_scans == 0 {
                    return Err(invalid("invalid JPEG define-number-of-lines marker"));
                }
                let lines = u16::from_be_bytes([payload[0], payload[1]]) as u32;
                let current = frame
                    .as_mut()
                    .ok_or_else(|| invalid("JPEG line definition precedes frame"))?;
                if lines == 0 || current.height != 0 {
                    return Err(invalid("invalid JPEG define-number-of-lines value"));
                }
                current.height = lines;
                profile_supported = false;
                native_decode_blocked = true;
            }
            0xde => {
                if hierarchy.is_some() || frame.is_some() {
                    return Err(invalid("invalid JPEG hierarchy definition placement"));
                }
                let parsed = parse_jpeg_frame(0xde, payload)?;
                validate_dimension_ceiling(parsed.width, parsed.height)?;
                hierarchy = Some(parsed);
                profile_supported = false;
                native_decode_blocked = true;
            }
            0xdf => {
                if hierarchy.is_none()
                    || payload.len() != 1
                    || payload[0] >> 4 > 1
                    || payload[0] & 0x0f > 1
                {
                    return Err(invalid("invalid JPEG expansion marker"));
                }
                profile_supported = false;
                native_decode_blocked = true;
            }
            0xc8 => return Err(invalid("reserved JPEG coding marker")),
            _ => return Err(invalid("unknown JPEG marker")),
        }
    }

    if !saw_eoi || position != bytes.len() {
        return Err(invalid("JPEG does not terminate exactly at EOI"));
    }
    let frame = frame.ok_or_else(|| invalid("JPEG frame is missing"))?;
    if scans == 0 {
        return Err(invalid("JPEG scan is missing"));
    }
    if current_frame_scans == 0 {
        return Err(invalid("JPEG final frame has no scan"));
    }
    scan_state.finish(&frame)?;
    let reported = hierarchy.unwrap_or(frame);
    validate_dimensions(reported.width, reported.height)?;
    budget.ensure_counts(
        reported.width,
        reported.height,
        1,
        reported.components,
        reported.bit_depth,
    )?;
    budget.ensure_metadata_records(metadata_bytes, records)?;
    if reported.components == 3 && matches!(adobe_transform, Some(value) if value != 1) {
        profile_supported = false;
    }
    let native = if native_decode_blocked {
        None
    } else {
        match native::validate_jpeg(bytes, budget.effective_decoder_limit()) {
            Ok(native) => Some(native),
            Err(NativeCodecFailure::Invalid | NativeCodecFailure::Internal) => {
                return Err(invalid("native JPEG validation failed"));
            }
            Err(NativeCodecFailure::ProfileUnsupported) => {
                return Err(profile(
                    RasterErrorKind::UnsupportedJpegProfile,
                    "native JPEG profile is outside package v1",
                    reported.width,
                    reported.height,
                ));
            }
            Err(NativeCodecFailure::DimensionsInvalid) => {
                return Err(dimensions("native JPEG dimensions are invalid"));
            }
            Err(NativeCodecFailure::ResourceLimit) => {
                return Err(resource("native JPEG allocation was denied"));
            }
        }
    };
    if !profile_supported {
        return Err(profile(
            RasterErrorKind::UnsupportedJpegProfile,
            "well-formed JPEG is outside the package-v1 subprofile",
            reported.width,
            reported.height,
        ));
    }
    let native = native.ok_or_else(|| invalid("native JPEG validation was not available"))?;
    budget.ensure_decoder_peak(native.peak_allocation_bytes)?;
    if native.width != reported.width || native.height != reported.height || native.frames != 1 {
        return Err(dimensions(
            "JPEG decoder dimensions disagree with structure",
        ));
    }

    Ok(RasterInfo {
        width: reported.width,
        height: reported.height,
        frames: 1,
        channels: reported.components,
        bit_depth: 8,
        metadata_bytes,
        structural_records: records,
        decoder_peak_bytes: native.peak_allocation_bytes,
    })
}

fn validate_jpeg_quantization_tables(mut payload: &[u8]) -> Result<u8, RasterError> {
    if payload.is_empty() {
        return Err(invalid("empty JPEG quantization-table segment"));
    }
    let mut tables = 0u8;
    while !payload.is_empty() {
        let descriptor = payload[0];
        let precision = descriptor >> 4;
        if precision > 1 || descriptor & 0x0f > 3 {
            return Err(invalid("invalid JPEG quantization table descriptor"));
        }
        tables |= 1 << (descriptor & 0x0f);
        let table_bytes = if precision == 0 { 64 } else { 128 };
        let consumed = 1usize
            .checked_add(table_bytes)
            .ok_or_else(|| resource("JPEG table arithmetic overflow"))?;
        let values = payload
            .get(1..consumed)
            .ok_or_else(|| invalid("truncated JPEG quantization table"))?;
        let contains_zero = if precision == 0 {
            values.contains(&0)
        } else {
            values.chunks_exact(2).any(|value| value == [0, 0])
        };
        if contains_zero {
            return Err(invalid("JPEG quantization table contains zero"));
        }
        payload = payload
            .get(consumed..)
            .ok_or_else(|| invalid("truncated JPEG quantization table"))?;
    }
    Ok(tables)
}

fn validate_jpeg_huffman_tables(mut payload: &[u8]) -> Result<(u8, u8), RasterError> {
    if payload.is_empty() {
        return Err(invalid("empty JPEG Huffman-table segment"));
    }
    let mut dc_tables = 0u8;
    let mut ac_tables = 0u8;
    while !payload.is_empty() {
        if payload.len() < 17 {
            return Err(invalid("truncated JPEG Huffman table"));
        }
        let descriptor = payload[0];
        if descriptor >> 4 > 1 || descriptor & 0x0f > 3 {
            return Err(invalid("invalid JPEG Huffman table descriptor"));
        }
        if descriptor >> 4 == 0 {
            dc_tables |= 1 << (descriptor & 0x0f);
        } else {
            ac_tables |= 1 << (descriptor & 0x0f);
        }
        let mut available_codes = 1u32;
        for count in &payload[1..17] {
            available_codes = available_codes
                .checked_mul(2)
                .ok_or_else(|| resource("JPEG Huffman code-space overflow"))?;
            if u32::from(*count) > available_codes {
                return Err(invalid("oversubscribed JPEG Huffman table"));
            }
            available_codes -= u32::from(*count);
        }
        if available_codes == 0 {
            return Err(invalid(
                "JPEG Huffman table uses the forbidden all-ones code",
            ));
        }
        let symbol_count: usize = payload[1..17].iter().map(|value| *value as usize).sum();
        if symbol_count == 0 || symbol_count > 256 {
            return Err(invalid("invalid JPEG Huffman symbol count"));
        }
        let consumed = 17usize
            .checked_add(symbol_count)
            .ok_or_else(|| resource("JPEG table arithmetic overflow"))?;
        let symbols = payload
            .get(17..consumed)
            .ok_or_else(|| invalid("truncated JPEG Huffman symbols"))?;
        if descriptor >> 4 == 0 && symbols.iter().any(|symbol| *symbol > 16) {
            return Err(invalid("invalid JPEG DC Huffman symbol"));
        }
        payload = payload
            .get(consumed..)
            .ok_or_else(|| invalid("truncated JPEG Huffman symbols"))?;
    }
    Ok((dc_tables, ac_tables))
}

fn validate_jpeg_arithmetic_tables(payload: &[u8]) -> Result<(), RasterError> {
    if payload.is_empty() || payload.len() % 2 != 0 {
        return Err(invalid("invalid JPEG arithmetic table"));
    }
    for pair in payload.chunks_exact(2) {
        if pair[0] >> 4 > 1 || pair[0] & 0x0f > 3 {
            return Err(invalid("invalid JPEG arithmetic table selector"));
        }
        let conditioning = pair[1];
        if (pair[0] >> 4 == 0 && conditioning & 0x0f > conditioning >> 4)
            || (pair[0] >> 4 == 1 && conditioning > 63)
        {
            return Err(invalid("invalid JPEG arithmetic conditioning value"));
        }
    }
    Ok(())
}

fn parse_jpeg_frame(marker: u8, payload: &[u8]) -> Result<JpegFrame, RasterError> {
    if payload.len() < 6 {
        return Err(invalid("truncated JPEG frame header"));
    }
    let precision = payload[0];
    let height = u16::from_be_bytes([payload[1], payload[2]]) as u32;
    let width = u16::from_be_bytes([payload[3], payload[4]]) as u32;
    let components = payload[5];
    let expected = 6usize
        .checked_add(usize::from(components) * 3)
        .ok_or_else(|| resource("JPEG component arithmetic overflow"))?;
    let precision_is_valid = match marker {
        0xc0 => precision == 8,
        0xc1 | 0xc2 | 0xc5 | 0xc6 | 0xc9 | 0xca | 0xcd | 0xce => {
            matches!(precision, 8 | 12)
        }
        0xc3 | 0xc7 | 0xcb | 0xcf | 0xde => (2..=16).contains(&precision),
        _ => false,
    };
    if components == 0 || !precision_is_valid || payload.len() != expected {
        return Err(invalid("invalid JPEG frame component list"));
    }

    let mut profile_supported =
        matches!(marker, 0xc0 | 0xc2) && precision == 8 && matches!(components, 1 | 3);
    let component_bytes = &payload[6..];
    let mut identifiers = [0u8; 255];
    let mut quantization_mask = 0u8;
    for (index, component) in component_bytes.chunks_exact(3).enumerate() {
        if identifiers[..index].contains(&component[0]) {
            return Err(invalid("duplicate JPEG component identifier"));
        }
        identifiers[index] = component[0];
        let horizontal = component[1] >> 4;
        let vertical = component[1] & 0x0f;
        if horizontal == 0 || vertical == 0 || horizontal > 4 || vertical > 4 || component[2] > 3 {
            return Err(invalid("invalid JPEG component sampling/table selector"));
        }
        quantization_mask |= 1 << component[2];
    }
    if components == 1 {
        profile_supported &=
            component_bytes[0] == 1 && component_bytes[1] == 0x11 && component_bytes[2] == 0;
    } else if components == 3 {
        let first = &component_bytes[0..3];
        let second = &component_bytes[3..6];
        let third = &component_bytes[6..9];
        profile_supported &= first[0] == 1
            && second[0] == 2
            && third[0] == 3
            && matches!(first[1], 0x11 | 0x21 | 0x22)
            && second[1] == 0x11
            && third[1] == 0x11;
    }
    Ok(JpegFrame {
        width,
        height,
        components,
        bit_depth: precision,
        marker,
        identifiers,
        quantization_mask,
        profile_supported,
    })
}

fn validate_jpeg_scan_header(
    payload: &[u8],
    frame: JpegFrame,
    dc_huffman_tables: u8,
    ac_huffman_tables: u8,
) -> Result<JpegScanParameters, RasterError> {
    let scan_components = *payload
        .first()
        .ok_or_else(|| invalid("truncated JPEG scan header"))?;
    if scan_components == 0 || scan_components > 4 || scan_components > frame.components {
        return Err(invalid("invalid JPEG scan component count"));
    }
    let expected = 4usize
        .checked_add(usize::from(scan_components) * 2)
        .ok_or_else(|| resource("JPEG scan arithmetic overflow"))?;
    if payload.len() != expected {
        return Err(invalid("invalid JPEG scan header length"));
    }
    let mut seen = [0u8; 4];
    let mut component_indices = [0u8; 4];
    let mut required_dc = 0u8;
    let mut required_ac = 0u8;
    for index in 0..usize::from(scan_components) {
        let selector = payload[1 + index * 2];
        if seen[..index].contains(&selector) {
            return Err(invalid("duplicate JPEG scan component"));
        }
        let component_index = frame.identifiers[..usize::from(frame.components)]
            .iter()
            .position(|identifier| *identifier == selector)
            .ok_or_else(|| invalid("JPEG scan references an unknown component"))?;
        seen[index] = selector;
        component_indices[index] = component_index as u8;
        let tables = payload[2 + index * 2];
        if tables >> 4 > 3 || tables & 0x0f > 3 {
            return Err(invalid("invalid JPEG scan table selector"));
        }
        required_dc |= 1 << (tables >> 4);
        required_ac |= 1 << (tables & 0x0f);
    }
    let spectral_start = payload[1 + usize::from(scan_components) * 2];
    let spectral_end = payload[2 + usize::from(scan_components) * 2];
    let approximation = payload[3 + usize::from(scan_components) * 2];
    let huffman_coded = matches!(frame.marker, 0xc0..=0xc7);
    if huffman_coded {
        let needs_dc = matches!(frame.marker, 0xc0 | 0xc1 | 0xc3 | 0xc5 | 0xc7)
            || (matches!(frame.marker, 0xc2 | 0xc6) && spectral_start == 0);
        let needs_ac = matches!(frame.marker, 0xc0 | 0xc1 | 0xc5)
            || (matches!(frame.marker, 0xc2 | 0xc6) && spectral_start != 0);
        if (needs_dc && required_dc & !dc_huffman_tables != 0)
            || (needs_ac && required_ac & !ac_huffman_tables != 0)
        {
            return Err(invalid("JPEG scan references a missing Huffman table"));
        }
    }
    match frame.marker {
        // Sequential DCT, including differential and arithmetic variants that
        // are structurally valid but outside the closed package-v1 profile.
        0xc0 | 0xc1 | 0xc5 | 0xc9 | 0xcd => {
            if spectral_start != 0 || spectral_end != 63 || approximation != 0 {
                return Err(invalid("invalid sequential JPEG scan parameters"));
            }
        }
        // Progressive DCT, including differential and arithmetic variants.
        0xc2 | 0xc6 | 0xca | 0xce => {
            let high = approximation >> 4;
            let low = approximation & 0x0f;
            if spectral_start > spectral_end
                || spectral_end > 63
                || (spectral_start == 0 && spectral_end != 0)
                || (spectral_start != 0 && scan_components != 1)
                || high > 13
                || low > 13
                || (high != 0 && high != low.saturating_add(1))
            {
                return Err(invalid("invalid progressive JPEG scan parameters"));
            }
        }
        // Lossless processes encode the predictor in Ss and point transform
        // in Al; accepting the syntax here does not accept the profile.
        0xc3 | 0xc7 | 0xcb | 0xcf => {
            if !(1..=7).contains(&spectral_start)
                || spectral_end != 0
                || approximation >> 4 != 0
                || approximation & 0x0f >= frame.bit_depth
            {
                return Err(invalid("invalid lossless JPEG scan parameters"));
            }
        }
        _ => return Err(invalid("invalid JPEG frame coding mode")),
    }
    Ok(JpegScanParameters {
        component_indices,
        component_count: scan_components,
        spectral_start,
        spectral_end,
        approximation_high: approximation >> 4,
        approximation_low: approximation & 0x0f,
    })
}

fn scan_jpeg_entropy(bytes: &[u8], mut position: usize) -> Result<(usize, u64), RasterError> {
    let mut records = 0u64;
    while position < bytes.len() {
        if bytes[position] != 0xff {
            position += 1;
            continue;
        }
        let marker_start = position;
        position += 1;
        while position < bytes.len() && bytes[position] == 0xff {
            position += 1;
        }
        let marker = *bytes
            .get(position)
            .ok_or_else(|| invalid("truncated JPEG entropy marker"))?;
        if marker == 0x00 {
            position += 1;
            continue;
        }
        if (0xd0..=0xd7).contains(&marker) {
            records = checked_add(records, 1)?;
            if records > MAX_STRUCTURAL_RECORDS_PER_ASSET {
                return Err(resource("JPEG restart-marker budget exceeded"));
            }
            position += 1;
            continue;
        }
        return Ok((marker_start, records));
    }
    Err(invalid("JPEG entropy data has no terminating marker"))
}

fn read_u24_le(bytes: &[u8], offset: usize) -> Result<u32, RasterError> {
    let end = offset
        .checked_add(3)
        .ok_or_else(|| invalid("truncated image integer"))?;
    let value = bytes
        .get(offset..end)
        .ok_or_else(|| invalid("truncated image integer"))?;
    Ok(u32::from(value[0]) | (u32::from(value[1]) << 8) | (u32::from(value[2]) << 16))
}

fn validate_webp(bytes: &[u8], budget: &RasterBudget) -> Result<RasterInfo, RasterError> {
    if bytes.len() < 20 || bytes.get(0..4) != Some(b"RIFF") || bytes.get(8..12) != Some(b"WEBP") {
        return Err(invalid("invalid WebP RIFF signature"));
    }
    let riff_size = read_u32_le(bytes, 4)? as u64;
    if checked_add(riff_size, 8)? != bytes.len() as u64 {
        return Err(invalid("WebP RIFF size disagrees with input"));
    }

    let mut position = 12usize;
    let mut records = 0u64;
    let mut metadata_bytes = 0u64;
    let mut canvas: Option<(u32, u32)> = None;
    let mut simple_image: Option<(u32, u32)> = None;
    let mut saw_vp8x = false;
    let mut vp8x_flags = 0u8;
    let mut animation_flag = false;
    let mut saw_anim = false;
    let mut frames = 0u32;
    let mut saw_image_payload = false;
    let mut saw_alpha = false;
    let mut saw_iccp = false;
    let mut saw_exif = false;
    let mut saw_xmp = false;
    let mut saw_unknown = false;

    while position < bytes.len() {
        let header_end = position
            .checked_add(8)
            .ok_or_else(|| resource("WebP chunk offset overflow"))?;
        let header = bytes
            .get(position..header_end)
            .ok_or_else(|| invalid("truncated WebP chunk header"))?;
        let fourcc = &header[0..4];
        let chunk_size = u32::from_le_bytes([header[4], header[5], header[6], header[7]]) as usize;
        let data_start = header_end;
        let data_end = data_start
            .checked_add(chunk_size)
            .ok_or_else(|| resource("WebP chunk offset overflow"))?;
        let padded_end = data_end
            .checked_add(chunk_size & 1)
            .ok_or_else(|| resource("WebP chunk offset overflow"))?;
        let data = bytes
            .get(data_start..data_end)
            .ok_or_else(|| invalid("truncated WebP chunk"))?;
        if padded_end > bytes.len() {
            return Err(invalid("truncated WebP chunk padding"));
        }
        if chunk_size & 1 == 1 && bytes[data_end] != 0 {
            return Err(invalid("nonzero WebP chunk padding"));
        }
        position = padded_end;
        records = checked_add(records, 1)?;
        budget.ensure_metadata_records(metadata_bytes, records)?;

        match fourcc {
            b"VP8X" => {
                if saw_vp8x || records != 1 || data.len() != 10 {
                    return Err(invalid("invalid WebP VP8X chunk"));
                }
                let flags = data[0];
                if flags & 0xc1 != 0 || data[1..4] != [0, 0, 0] {
                    return Err(invalid("invalid WebP VP8X reserved bits"));
                }
                let width = read_u24_le(data, 4)?
                    .checked_add(1)
                    .ok_or_else(|| resource("WebP width overflow"))?;
                let height = read_u24_le(data, 7)?
                    .checked_add(1)
                    .ok_or_else(|| resource("WebP height overflow"))?;
                validate_dimension_ceiling(width, height)?;
                canvas = Some((width, height));
                animation_flag = flags & 0x02 != 0;
                vp8x_flags = flags;
                saw_vp8x = true;
            }
            b"VP8 " => {
                if saw_image_payload
                    || animation_flag
                    || saw_anim
                    || saw_unknown
                    || saw_exif
                    || saw_xmp
                    || (!saw_vp8x && records != 1)
                {
                    return Err(invalid("conflicting WebP image chunks"));
                }
                let dimensions = parse_vp8_dimensions(data)?;
                simple_image = Some(dimensions);
                saw_image_payload = true;
            }
            b"VP8L" => {
                if saw_image_payload
                    || animation_flag
                    || saw_anim
                    || saw_alpha
                    || saw_unknown
                    || saw_exif
                    || saw_xmp
                    || (!saw_vp8x && records != 1)
                {
                    return Err(invalid("conflicting WebP image chunks"));
                }
                let (dimensions, has_alpha) = parse_vp8l_dimensions(data)?;
                simple_image = Some(dimensions);
                saw_alpha = has_alpha;
                saw_image_payload = true;
            }
            b"ALPH" => {
                if !saw_vp8x
                    || animation_flag
                    || saw_image_payload
                    || saw_alpha
                    || saw_unknown
                    || saw_exif
                    || saw_xmp
                    || data.is_empty()
                {
                    return Err(invalid("invalid WebP alpha chunk placement"));
                }
                saw_alpha = true;
            }
            b"ANIM" => {
                if !saw_vp8x
                    || !animation_flag
                    || saw_anim
                    || saw_image_payload
                    || saw_unknown
                    || saw_exif
                    || saw_xmp
                    || data.len() != 6
                {
                    return Err(invalid("invalid WebP animation header"));
                }
                saw_anim = true;
            }
            b"ANMF" => {
                if !saw_anim || saw_unknown || saw_exif || saw_xmp || data.len() < 16 {
                    return Err(invalid("invalid WebP animation frame"));
                }
                let (canvas_width, canvas_height) =
                    canvas.ok_or_else(|| invalid("WebP animation has no canvas"))?;
                let x = read_u24_le(data, 0)?
                    .checked_mul(2)
                    .ok_or_else(|| resource("WebP frame offset overflow"))?;
                let y = read_u24_le(data, 3)?
                    .checked_mul(2)
                    .ok_or_else(|| resource("WebP frame offset overflow"))?;
                let width = read_u24_le(data, 6)?
                    .checked_add(1)
                    .ok_or_else(|| resource("WebP frame width overflow"))?;
                let height = read_u24_le(data, 9)?
                    .checked_add(1)
                    .ok_or_else(|| resource("WebP frame height overflow"))?;
                if x.checked_add(width)
                    .map_or(true, |value| value > canvas_width)
                    || y.checked_add(height)
                        .map_or(true, |value| value > canvas_height)
                {
                    return Err(dimensions("WebP animation frame exceeds canvas"));
                }
                if data[15] & 0xfc != 0 {
                    return Err(invalid("WebP animation frame has reserved flags"));
                }
                let payload = validate_webp_frame_payload(&data[16..])?;
                if payload.width != width || payload.height != height {
                    return Err(dimensions(
                        "WebP animation frame dimensions disagree with payload",
                    ));
                }
                records = checked_add(records, payload.records)?;
                metadata_bytes = checked_add(metadata_bytes, payload.metadata_bytes)?;
                budget.ensure_metadata_records(metadata_bytes, records)?;
                saw_alpha |= payload.has_alpha;
                frames = frames
                    .checked_add(1)
                    .ok_or_else(|| resource("WebP frame count overflow"))?;
                if u64::from(frames) > MAX_ANIMATION_FRAMES {
                    return Err(resource("WebP frame budget exceeded"));
                }
            }
            b"ICCP" => {
                if !saw_vp8x
                    || vp8x_flags & 0x20 == 0
                    || saw_iccp
                    || saw_unknown
                    || saw_anim
                    || saw_image_payload
                    || data.is_empty()
                {
                    return Err(invalid("invalid WebP ICC profile placement"));
                }
                saw_iccp = true;
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
                budget.ensure_metadata_records(metadata_bytes, records)?;
            }
            b"EXIF" => {
                if !saw_vp8x
                    || vp8x_flags & 0x08 == 0
                    || saw_exif
                    || data.is_empty()
                    || (!saw_image_payload && frames == 0)
                {
                    return Err(invalid("invalid WebP EXIF placement"));
                }
                saw_exif = true;
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
                budget.ensure_metadata_records(metadata_bytes, records)?;
            }
            b"XMP " => {
                if !saw_vp8x
                    || vp8x_flags & 0x04 == 0
                    || saw_xmp
                    || data.is_empty()
                    || (!saw_image_payload && frames == 0)
                {
                    return Err(invalid("invalid WebP XMP placement"));
                }
                saw_xmp = true;
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
                budget.ensure_metadata_records(metadata_bytes, records)?;
            }
            _ => {
                // Unknown top-level chunks are a terminal reconstruction
                // phase: only more unknown chunks or EXIF/XMP metadata may
                // follow them. They remain metadata for package budget
                // purposes, and the complete pinned decoder still has to
                // accept the container before these bytes are admitted.
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
                budget.ensure_metadata_records(metadata_bytes, records)?;
                saw_unknown = true;
            }
        }
    }
    if position != bytes.len() {
        return Err(invalid("WebP has trailing payload"));
    }
    if saw_vp8x
        && ((vp8x_flags & 0x20 != 0) != saw_iccp
            || (vp8x_flags & 0x10 != 0) != saw_alpha
            || (vp8x_flags & 0x08 != 0) != saw_exif
            || (vp8x_flags & 0x04 != 0) != saw_xmp)
    {
        return Err(invalid("WebP feature flags disagree with chunks"));
    }

    let (width, height, frame_count) = if animation_flag {
        if !saw_anim || frames == 0 || saw_image_payload {
            return Err(invalid("incomplete WebP animation"));
        }
        let (width, height) = canvas.ok_or_else(|| invalid("WebP canvas is missing"))?;
        (width, height, frames)
    } else {
        if saw_anim || frames != 0 || !saw_image_payload {
            return Err(invalid("invalid static WebP structure"));
        }
        let image_dimensions =
            simple_image.ok_or_else(|| invalid("WebP image payload is missing"))?;
        if let Some(canvas_dimensions) = canvas {
            if canvas_dimensions != image_dimensions {
                return Err(dimensions("WebP canvas and bitstream dimensions disagree"));
            }
        }
        (image_dimensions.0, image_dimensions.1, 1)
    };
    validate_dimensions(width, height)?;
    budget.ensure_counts(width, height, frame_count, 4, 8)?;
    budget.ensure_metadata_records(metadata_bytes, records)?;

    let native =
        native::validate_webp(bytes, budget.effective_decoder_limit()).map_err(|failure| {
            match failure {
                NativeCodecFailure::Invalid | NativeCodecFailure::ProfileUnsupported => {
                    invalid("native WebP validation failed")
                }
                NativeCodecFailure::DimensionsInvalid => {
                    dimensions("native WebP dimensions are invalid")
                }
                NativeCodecFailure::ResourceLimit => resource("native WebP allocation was denied"),
                NativeCodecFailure::Internal => invalid("native WebP validator failed safely"),
            }
        })?;
    budget.ensure_decoder_peak(native.peak_allocation_bytes)?;
    if native.width != width || native.height != height || native.frames != frame_count {
        return Err(dimensions("WebP decoder metadata disagrees with structure"));
    }
    Ok(RasterInfo {
        width,
        height,
        frames: frame_count,
        channels: 4,
        bit_depth: 8,
        metadata_bytes,
        structural_records: records,
        decoder_peak_bytes: native.peak_allocation_bytes,
    })
}

fn parse_vp8_dimensions(data: &[u8]) -> Result<(u32, u32), RasterError> {
    if data.len() < 10 || data[0] & 1 != 0 || data.get(3..6) != Some(&[0x9d, 0x01, 0x2a]) {
        return Err(invalid("invalid WebP VP8 key frame"));
    }
    let width = u16::from_le_bytes([data[6], data[7]]) & 0x3fff;
    let height = u16::from_le_bytes([data[8], data[9]]) & 0x3fff;
    validate_dimension_ceiling(u32::from(width), u32::from(height))?;
    Ok((u32::from(width), u32::from(height)))
}

fn parse_vp8l_dimensions(data: &[u8]) -> Result<((u32, u32), bool), RasterError> {
    if data.len() < 5 || data[0] != 0x2f {
        return Err(invalid("invalid WebP VP8L signature"));
    }
    let bits = u32::from_le_bytes([data[1], data[2], data[3], data[4]]);
    if bits >> 29 != 0 {
        return Err(invalid("invalid WebP VP8L version"));
    }
    let width = (bits & 0x3fff) + 1;
    let height = ((bits >> 14) & 0x3fff) + 1;
    validate_dimension_ceiling(width, height)?;
    Ok(((width, height), bits & (1 << 28) != 0))
}

struct WebpFramePayload {
    width: u32,
    height: u32,
    has_alpha: bool,
    records: u64,
    metadata_bytes: u64,
}

fn validate_webp_frame_payload(mut data: &[u8]) -> Result<WebpFramePayload, RasterError> {
    let mut saw_image = false;
    let mut saw_alpha = false;
    let mut dimensions = None;
    let mut records = 0u64;
    let mut metadata_bytes = 0u64;
    while !data.is_empty() {
        if data.len() < 8 {
            return Err(invalid("truncated WebP frame subchunk"));
        }
        let fourcc = &data[0..4];
        let length = u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize;
        let end = 8usize
            .checked_add(length)
            .ok_or_else(|| resource("WebP frame chunk overflow"))?;
        let padded = end
            .checked_add(length & 1)
            .ok_or_else(|| resource("WebP frame chunk overflow"))?;
        let payload = data
            .get(8..end)
            .ok_or_else(|| invalid("truncated WebP frame payload"))?;
        if padded > data.len() || (length & 1 == 1 && data[end] != 0) {
            return Err(invalid("invalid WebP frame padding"));
        }
        records = checked_add(records, 1)?;
        if records > MAX_STRUCTURAL_RECORDS_PER_ASSET {
            return Err(resource("WebP frame-chunk budget exceeded"));
        }
        match fourcc {
            b"ALPH" if !saw_image && !saw_alpha && !payload.is_empty() => {
                saw_alpha = true;
            }
            b"VP8 " if !saw_image => {
                dimensions = Some(parse_vp8_dimensions(payload)?);
                saw_image = true;
            }
            b"VP8L" if !saw_image && !saw_alpha => {
                let (parsed, has_alpha) = parse_vp8l_dimensions(payload)?;
                dimensions = Some(parsed);
                saw_alpha = has_alpha;
                saw_image = true;
            }
            b"ALPH" | b"VP8 " | b"VP8L" => {
                return Err(invalid("invalid WebP animation-frame chunk"));
            }
            _ if saw_image => {
                // The WebP container permits readers to skip unknown ANMF
                // subchunks after the required image payload. Keep them
                // bounded as metadata and let the pinned decoder make the
                // final decision about the complete container.
                metadata_bytes = checked_add(metadata_bytes, payload.len() as u64)?;
            }
            _ => return Err(invalid("invalid WebP animation-frame chunk")),
        }
        data = &data[padded..];
    }
    if !saw_image {
        return Err(invalid("WebP animation frame has no image"));
    }
    let (width, height) = dimensions.ok_or_else(|| invalid("WebP frame dimensions are missing"))?;
    Ok(WebpFramePayload {
        width,
        height,
        has_alpha: saw_alpha,
        records,
        metadata_bytes,
    })
}

struct GifDataReader<'a> {
    bytes: &'a [u8],
    position: usize,
    remaining: usize,
    done: bool,
    records: u64,
    record_limit: u64,
}

impl<'a> GifDataReader<'a> {
    fn new(bytes: &'a [u8], position: usize, record_limit: u64) -> Self {
        Self {
            bytes,
            position,
            remaining: 0,
            done: false,
            records: 0,
            record_limit,
        }
    }

    fn next_byte(&mut self) -> Result<Option<u8>, RasterError> {
        if self.done {
            return Ok(None);
        }
        if self.remaining == 0 {
            if self.records >= self.record_limit {
                return Err(resource("GIF sub-block budget exceeded"));
            }
            let length = *self
                .bytes
                .get(self.position)
                .ok_or_else(|| invalid("truncated GIF sub-block length"))?
                as usize;
            self.position += 1;
            self.records = checked_add(self.records, 1)?;
            if length == 0 {
                self.done = true;
                return Ok(None);
            }
            let end = self
                .position
                .checked_add(length)
                .ok_or_else(|| resource("GIF sub-block offset overflow"))?;
            if end > self.bytes.len() {
                return Err(invalid("truncated GIF sub-block"));
            }
            self.remaining = length;
        }
        let value = self.bytes[self.position];
        self.position += 1;
        self.remaining -= 1;
        Ok(Some(value))
    }

    fn drain(&mut self) -> Result<(), RasterError> {
        while self.next_byte()?.is_some() {}
        Ok(())
    }
}

struct GifBitReader<'reader, 'data> {
    source: &'reader mut GifDataReader<'data>,
    bits: u64,
    bit_count: u8,
}

impl<'reader, 'data> GifBitReader<'reader, 'data> {
    fn read_code(&mut self, width: u8) -> Result<Option<u16>, RasterError> {
        while self.bit_count < width {
            let Some(byte) = self.source.next_byte()? else {
                return Ok(None);
            };
            self.bits |= u64::from(byte) << self.bit_count;
            self.bit_count += 8;
        }
        let mask = (1u64 << width) - 1;
        let code = (self.bits & mask) as u16;
        self.bits >>= width;
        self.bit_count -= width;
        Ok(Some(code))
    }
}

fn validate_gif(bytes: &[u8], budget: &RasterBudget) -> Result<RasterInfo, RasterError> {
    if bytes.len() < 14 || !matches!(bytes.get(0..6), Some(b"GIF87a") | Some(b"GIF89a")) {
        return Err(invalid("invalid GIF signature"));
    }
    let width = u32::from(read_u16_le(bytes, 6)?);
    let height = u32::from(read_u16_le(bytes, 8)?);
    validate_dimension_ceiling(width, height)?;
    let packed = bytes[10];
    let global_table_entries = if packed & 0x80 != 0 {
        1usize << (usize::from(packed & 0x07) + 1)
    } else {
        0
    };
    if global_table_entries != 0 && usize::from(bytes[11]) >= global_table_entries {
        return Err(invalid(
            "GIF background index exceeds the global color table",
        ));
    }
    let mut position = 13usize;
    if global_table_entries != 0 {
        position = position
            .checked_add(global_table_entries * 3)
            .ok_or_else(|| resource("GIF color table offset overflow"))?;
        if position > bytes.len() {
            return Err(invalid("truncated GIF global color table"));
        }
    }

    let mut frames = 0u32;
    let mut records = 1u64;
    let mut metadata_bytes = 0u64;
    let mut saw_trailer = false;
    let mut pending_graphics_control: Option<Option<u8>> = None;
    let mut deferred_frame_dimensions = false;
    let decoder_peak_bytes =
        (std::mem::size_of::<[u16; 4096]>() + std::mem::size_of::<[u8; 4096]>() * 2) as u64;
    budget.ensure_counts(width, height, 1, 4, 8)?;
    budget.ensure_metadata_records(metadata_bytes, records)?;
    budget.ensure_decoder_peak(decoder_peak_bytes)?;
    while position < bytes.len() {
        let marker = bytes[position];
        position += 1;
        records = checked_add(records, 1)?;
        budget.ensure_metadata_records(metadata_bytes, records)?;
        match marker {
            0x2c => {
                let descriptor_end = position
                    .checked_add(9)
                    .ok_or_else(|| resource("GIF descriptor offset overflow"))?;
                let descriptor = bytes
                    .get(position..descriptor_end)
                    .ok_or_else(|| invalid("truncated GIF image descriptor"))?;
                position = descriptor_end;
                let left = u32::from(u16::from_le_bytes([descriptor[0], descriptor[1]]));
                let top = u32::from(u16::from_le_bytes([descriptor[2], descriptor[3]]));
                let frame_width = u32::from(u16::from_le_bytes([descriptor[4], descriptor[5]]));
                let frame_height = u32::from(u16::from_le_bytes([descriptor[6], descriptor[7]]));
                deferred_frame_dimensions |= frame_width == 0
                    || frame_height == 0
                    || (width != 0
                        && left
                            .checked_add(frame_width)
                            .map_or(true, |value| value > width))
                    || (height != 0
                        && top
                            .checked_add(frame_height)
                            .map_or(true, |value| value > height));
                if descriptor[8] & 0x18 != 0 {
                    return Err(invalid("GIF image descriptor has reserved bits"));
                }
                let local_entries = if descriptor[8] & 0x80 != 0 {
                    1usize << (usize::from(descriptor[8] & 0x07) + 1)
                } else {
                    0
                };
                if local_entries != 0 {
                    position = position
                        .checked_add(local_entries * 3)
                        .ok_or_else(|| resource("GIF color table offset overflow"))?;
                    if position > bytes.len() {
                        return Err(invalid("truncated GIF local color table"));
                    }
                }
                let palette_entries = if local_entries != 0 {
                    local_entries
                } else {
                    global_table_entries
                };
                if palette_entries == 0 {
                    return Err(invalid("GIF frame has no color table"));
                }
                if let Some(Some(transparent_index)) = pending_graphics_control {
                    if usize::from(transparent_index) >= palette_entries {
                        return Err(invalid("GIF transparent index exceeds color table"));
                    }
                }
                let minimum_code_size = *bytes
                    .get(position)
                    .ok_or_else(|| invalid("GIF LZW code size is missing"))?;
                position += 1;
                if !(2..=8).contains(&minimum_code_size) {
                    return Err(invalid("invalid GIF LZW code size"));
                }
                let next_frames = frames
                    .checked_add(1)
                    .ok_or_else(|| resource("GIF frame count overflow"))?;
                if u64::from(next_frames) > MAX_ANIMATION_FRAMES {
                    return Err(resource("GIF frame budget exceeded"));
                }
                budget.ensure_counts(width, height, next_frames, 4, 8)?;
                budget.ensure_decoder_peak(decoder_peak_bytes)?;
                let remaining_records = budget.structural_records_remaining(records)?;
                let mut reader = GifDataReader::new(bytes, position, remaining_records);
                decode_gif_lzw(
                    &mut reader,
                    minimum_code_size,
                    checked_mul(u64::from(frame_width), u64::from(frame_height))?,
                    palette_entries,
                )?;
                reader.drain()?;
                records = checked_add(records, reader.records)?;
                budget.ensure_metadata_records(metadata_bytes, records)?;
                position = reader.position;
                frames = next_frames;
                pending_graphics_control = None;
            }
            0x21 => {
                let label = *bytes
                    .get(position)
                    .ok_or_else(|| invalid("truncated GIF extension"))?;
                position += 1;
                match label {
                    0xf9 => {
                        if bytes.get(position) != Some(&4) || position + 6 > bytes.len() {
                            return Err(invalid("invalid GIF graphics-control extension"));
                        }
                        if bytes[position + 5] != 0 {
                            return Err(invalid("GIF extension terminator is missing"));
                        }
                        if pending_graphics_control.is_some() {
                            return Err(invalid("GIF has consecutive graphics-control extensions"));
                        }
                        let control = bytes[position + 1];
                        let disposal = (control >> 2) & 0x07;
                        if control & 0xe0 != 0 || disposal > 3 {
                            return Err(invalid("GIF graphics-control fields are invalid"));
                        }
                        let transparent_index = if control & 1 != 0 {
                            Some(bytes[position + 4])
                        } else {
                            None
                        };
                        pending_graphics_control = Some(transparent_index);
                        position += 6;
                        records = checked_add(records, 1)?;
                        budget.ensure_metadata_records(metadata_bytes, records)?;
                    }
                    0x01 | 0xff => {
                        let required = if label == 0x01 { 12 } else { 11 };
                        if bytes.get(position).copied() != Some(required) {
                            return Err(invalid("invalid GIF fixed extension header"));
                        }
                        position += 1;
                        let end = position
                            .checked_add(usize::from(required))
                            .ok_or_else(|| resource("GIF extension offset overflow"))?;
                        if end > bytes.len() {
                            return Err(invalid("truncated GIF extension header"));
                        }
                        if label == 0x01 {
                            let header = &bytes[position..end];
                            let left = u32::from(u16::from_le_bytes([header[0], header[1]]));
                            let top = u32::from(u16::from_le_bytes([header[2], header[3]]));
                            let grid_width = u32::from(u16::from_le_bytes([header[4], header[5]]));
                            let grid_height = u32::from(u16::from_le_bytes([header[6], header[7]]));
                            if global_table_entries == 0
                                || grid_width == 0
                                || grid_height == 0
                                || header[8] == 0
                                || header[9] == 0
                                || usize::from(header[10]) >= global_table_entries
                                || usize::from(header[11]) >= global_table_entries
                                || (width != 0
                                    && left
                                        .checked_add(grid_width)
                                        .map_or(true, |value| value > width))
                                || (height != 0
                                    && top
                                        .checked_add(grid_height)
                                        .map_or(true, |value| value > height))
                            {
                                return Err(invalid("invalid GIF plain-text grid"));
                            }
                            // A graphics-control extension applies to this rendering block.
                            pending_graphics_control = None;
                        }
                        let remaining_metadata = budget.metadata_remaining(metadata_bytes)?;
                        if u64::from(required) > remaining_metadata {
                            return Err(resource("GIF metadata budget exceeded"));
                        }
                        metadata_bytes = checked_add(metadata_bytes, u64::from(required))?;
                        position = end;
                        let (end, payload, sub_records) = scan_gif_subblocks(
                            bytes,
                            position,
                            budget.structural_records_remaining(records)?,
                            budget.metadata_remaining(metadata_bytes)?,
                        )?;
                        position = end;
                        metadata_bytes = checked_add(metadata_bytes, payload)?;
                        records = checked_add(records, sub_records)?;
                    }
                    0xfe => {
                        let (end, payload, sub_records) = scan_gif_subblocks(
                            bytes,
                            position,
                            budget.structural_records_remaining(records)?,
                            budget.metadata_remaining(metadata_bytes)?,
                        )?;
                        position = end;
                        metadata_bytes = checked_add(metadata_bytes, payload)?;
                        records = checked_add(records, sub_records)?;
                    }
                    _ => return Err(invalid("unknown GIF extension")),
                }
                budget.ensure_metadata_records(metadata_bytes, records)?;
            }
            0x3b => {
                saw_trailer = true;
                break;
            }
            _ => return Err(invalid("unknown GIF block")),
        }
    }
    if !saw_trailer || position != bytes.len() || frames == 0 || pending_graphics_control.is_some()
    {
        return Err(invalid("GIF is incomplete or has trailing payload"));
    }
    validate_dimensions(width, height)?;
    if deferred_frame_dimensions {
        return Err(dimensions("GIF frame rectangle is invalid"));
    }
    budget.ensure_counts(width, height, frames, 4, 8)?;
    budget.ensure_metadata_records(metadata_bytes, records)?;
    budget.ensure_decoder_peak(decoder_peak_bytes)?;
    Ok(RasterInfo {
        width,
        height,
        frames,
        channels: 4,
        bit_depth: 8,
        metadata_bytes,
        structural_records: records,
        decoder_peak_bytes,
    })
}

fn scan_gif_subblocks(
    bytes: &[u8],
    mut position: usize,
    record_limit: u64,
    payload_limit: u64,
) -> Result<(usize, u64, u64), RasterError> {
    let mut payload = 0u64;
    let mut records = 0u64;
    loop {
        if records >= record_limit {
            return Err(resource("GIF sub-block budget exceeded"));
        }
        let length = *bytes
            .get(position)
            .ok_or_else(|| invalid("truncated GIF sub-block length"))?
            as usize;
        position += 1;
        records = checked_add(records, 1)?;
        if length == 0 {
            return Ok((position, payload, records));
        }
        position = position
            .checked_add(length)
            .ok_or_else(|| resource("GIF sub-block offset overflow"))?;
        if position > bytes.len() {
            return Err(invalid("truncated GIF sub-block"));
        }
        payload = checked_add(payload, length as u64)?;
        if payload > payload_limit {
            return Err(resource("GIF metadata budget exceeded"));
        }
    }
}

fn decode_gif_lzw(
    source: &mut GifDataReader<'_>,
    minimum_code_size: u8,
    expected_pixels: u64,
    palette_entries: usize,
) -> Result<(), RasterError> {
    let clear_code = 1u16 << minimum_code_size;
    let end_code = clear_code + 1;
    let mut prefix = [0u16; 4096];
    let mut suffix = [0u8; 4096];
    let mut stack = [0u8; 4096];
    for value in 0..clear_code {
        suffix[value as usize] = value as u8;
    }
    let mut code_width = minimum_code_size + 1;
    let mut next_code = end_code + 1;
    let mut previous: Option<u16> = None;
    let mut first_byte = 0u8;
    let mut emitted = 0u64;
    let mut saw_end = false;
    let mut bits = GifBitReader {
        source,
        bits: 0,
        bit_count: 0,
    };

    while let Some(code) = bits.read_code(code_width)? {
        if code == clear_code {
            code_width = minimum_code_size + 1;
            next_code = end_code + 1;
            previous = None;
            continue;
        }
        if code == end_code {
            saw_end = true;
            break;
        }
        if code > next_code || code >= 4096 {
            return Err(invalid("invalid GIF LZW code"));
        }

        let mut stack_length = 0usize;
        let mut current = if code == next_code {
            let previous_code = previous.ok_or_else(|| invalid("invalid GIF LZW special code"))?;
            stack[stack_length] = first_byte;
            stack_length += 1;
            previous_code
        } else {
            code
        };
        while current >= clear_code {
            if current >= next_code || stack_length >= stack.len() {
                return Err(invalid("invalid GIF LZW dictionary chain"));
            }
            stack[stack_length] = suffix[current as usize];
            stack_length += 1;
            current = prefix[current as usize];
        }
        first_byte = current as u8;
        if stack_length >= stack.len() {
            return Err(invalid("GIF LZW output stack overflow"));
        }
        stack[stack_length] = first_byte;
        stack_length += 1;

        for value in stack[..stack_length].iter().rev() {
            if usize::from(*value) >= palette_entries {
                return Err(invalid("GIF pixel index exceeds color table"));
            }
            emitted = checked_add(emitted, 1)?;
            if emitted > expected_pixels {
                return Err(invalid("GIF LZW output exceeds frame dimensions"));
            }
        }
        if let Some(previous_code) = previous {
            if next_code < 4096 {
                prefix[next_code as usize] = previous_code;
                suffix[next_code as usize] = first_byte;
                next_code += 1;
                if next_code == (1u16 << code_width) && code_width < 12 {
                    code_width += 1;
                }
            }
        }
        previous = Some(code);
    }
    if !saw_end || emitted != expected_pixels {
        return Err(invalid(
            "GIF LZW stream is truncated or has wrong pixel count",
        ));
    }
    Ok(())
}

#[derive(Debug)]
struct PngFrameData {
    width: u32,
    height: u32,
    compressed: Vec<u8>,
}

fn validate_png(bytes: &[u8], budget: &RasterBudget) -> Result<RasterInfo, RasterError> {
    const SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";
    if bytes.get(0..8) != Some(SIGNATURE) {
        return Err(invalid("invalid PNG signature"));
    }
    let mut position = 8usize;
    let mut width = 0u32;
    let mut height = 0u32;
    let mut bit_depth = 0u8;
    let mut color_type = 0u8;
    let mut interlace = 0u8;
    let mut channels = 0u8;
    let mut palette_entries = 0usize;
    let mut saw_ihdr = false;
    let mut saw_plte = false;
    let mut saw_idat = false;
    let mut idat_finished = false;
    let mut saw_iend = false;
    let mut saw_trns = false;
    let mut saw_iccp = false;
    let mut saw_srgb = false;
    let mut saw_gama = false;
    let mut standard_ancillary = 0u8;
    let mut records = 0u64;
    let mut metadata_bytes = 0u64;
    let mut metadata_decoder_peak = 0u64;
    let decoder_limit = budget.effective_decoder_limit();
    let mut default_compressed = Vec::new();
    let mut declared_animation_frames: Option<u32> = None;
    let mut animation_controls = 0u32;
    let mut expected_sequence = 0u32;
    let mut first_frame_uses_idat = false;
    let mut animation_frames: Vec<PngFrameData> = Vec::new();
    let mut active_frame: Option<usize> = None;

    while position < bytes.len() {
        let header_end = position
            .checked_add(8)
            .ok_or_else(|| resource("PNG chunk offset overflow"))?;
        let header = bytes
            .get(position..header_end)
            .ok_or_else(|| invalid("truncated PNG chunk header"))?;
        let length = u32::from_be_bytes([header[0], header[1], header[2], header[3]]) as usize;
        let chunk_type = &header[4..8];
        if !chunk_type.iter().all(|byte| byte.is_ascii_alphabetic()) || chunk_type[2] & 0x20 != 0 {
            return Err(invalid("invalid PNG chunk type"));
        }
        let data_start = header_end;
        let data_end = data_start
            .checked_add(length)
            .ok_or_else(|| resource("PNG chunk offset overflow"))?;
        let crc_end = data_end
            .checked_add(4)
            .ok_or_else(|| resource("PNG chunk offset overflow"))?;
        let data = bytes
            .get(data_start..data_end)
            .ok_or_else(|| invalid("truncated PNG chunk"))?;
        let stored_crc = bytes
            .get(data_end..crc_end)
            .ok_or_else(|| invalid("truncated PNG chunk CRC"))?;
        let mut crc = crc32fast::Hasher::new();
        crc.update(chunk_type);
        crc.update(data);
        if crc.finalize()
            != u32::from_be_bytes([stored_crc[0], stored_crc[1], stored_crc[2], stored_crc[3]])
        {
            return Err(invalid("PNG chunk CRC mismatch"));
        }
        position = crc_end;
        records = checked_add(records, 1)?;
        budget.ensure_metadata_records(metadata_bytes, records)?;

        if !saw_ihdr && chunk_type != b"IHDR" {
            return Err(invalid("PNG IHDR is not first"));
        }
        if saw_iend {
            return Err(invalid("PNG has data after IEND"));
        }
        if saw_idat && chunk_type != b"IDAT" {
            idat_finished = true;
        }

        match chunk_type {
            b"IHDR" => {
                if saw_ihdr || records != 1 || data.len() != 13 {
                    return Err(invalid("invalid PNG IHDR"));
                }
                width = u32::from_be_bytes([data[0], data[1], data[2], data[3]]);
                height = u32::from_be_bytes([data[4], data[5], data[6], data[7]]);
                bit_depth = data[8];
                color_type = data[9];
                if data[10] != 0 || data[11] != 0 || !matches!(data[12], 0 | 1) {
                    return Err(invalid("unsupported PNG core method"));
                }
                interlace = data[12];
                channels = png_channels(color_type, bit_depth)?;
                validate_dimension_ceiling(width, height)?;
                budget.ensure_counts(width, height, 1, channels, bit_depth)?;
                saw_ihdr = true;
            }
            b"PLTE" => {
                if saw_plte
                    || saw_idat
                    || matches!(color_type, 0 | 4)
                    || data.is_empty()
                    || data.len() % 3 != 0
                    || data.len() > 768
                {
                    return Err(invalid("invalid PNG palette"));
                }
                palette_entries = data.len() / 3;
                if color_type == 3 && palette_entries > (1usize << bit_depth) {
                    return Err(invalid("PNG palette exceeds indexed bit depth"));
                }
                saw_plte = true;
            }
            b"IDAT" => {
                if idat_finished {
                    return Err(invalid("PNG IDAT chunks are not consecutive"));
                }
                if color_type == 3 && !saw_plte {
                    return Err(invalid("indexed PNG has no palette"));
                }
                saw_idat = true;
                let persistent = png_persistent_bytes(&default_compressed, &animation_frames)?;
                let other = persistent
                    .checked_sub(default_compressed.capacity() as u64)
                    .ok_or_else(|| resource("PNG allocation accounting underflow"))?;
                try_extend_bounded(
                    &mut default_compressed,
                    data,
                    other,
                    decoder_limit,
                    "PNG compressed data allocation failed",
                )?;
            }
            b"IEND" => {
                if !data.is_empty() || !saw_idat {
                    return Err(invalid("invalid PNG IEND"));
                }
                saw_iend = true;
                break;
            }
            b"acTL" => {
                if saw_idat || declared_animation_frames.is_some() || data.len() != 8 {
                    return Err(invalid("invalid PNG animation control"));
                }
                let count = u32::from_be_bytes([data[0], data[1], data[2], data[3]]);
                if count == 0 {
                    return Err(invalid("PNG animation has zero frames"));
                }
                if u64::from(count) > MAX_ANIMATION_FRAMES {
                    return Err(resource("PNG animation frame budget exceeded"));
                }
                budget.ensure_counts(width, height, count, channels, bit_depth)?;
                declared_animation_frames = Some(count);
            }
            b"fcTL" => {
                if declared_animation_frames.is_none() || data.len() != 26 {
                    return Err(invalid("invalid PNG frame control"));
                }
                let sequence = u32::from_be_bytes([data[0], data[1], data[2], data[3]]);
                if sequence != expected_sequence {
                    return Err(invalid("PNG animation sequence is not contiguous"));
                }
                expected_sequence = expected_sequence
                    .checked_add(1)
                    .ok_or_else(|| resource("PNG sequence overflow"))?;
                let frame_width = u32::from_be_bytes([data[4], data[5], data[6], data[7]]);
                let frame_height = u32::from_be_bytes([data[8], data[9], data[10], data[11]]);
                let x = u32::from_be_bytes([data[12], data[13], data[14], data[15]]);
                let y = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
                if frame_width == 0
                    || frame_height == 0
                    || x.checked_add(frame_width)
                        .map_or(true, |value| value > width)
                    || y.checked_add(frame_height)
                        .map_or(true, |value| value > height)
                    || data[24] > 2
                    || data[25] > 1
                {
                    return Err(dimensions("invalid PNG animation frame rectangle"));
                }
                animation_controls = animation_controls
                    .checked_add(1)
                    .ok_or_else(|| resource("PNG frame count overflow"))?;
                if !saw_idat {
                    if animation_controls != 1
                        || x != 0
                        || y != 0
                        || frame_width != width
                        || frame_height != height
                    {
                        return Err(invalid("PNG default animation frame must fill canvas"));
                    }
                    first_frame_uses_idat = true;
                    active_frame = None;
                } else {
                    if active_frame
                        .and_then(|index| animation_frames.get(index))
                        .is_some_and(|frame| frame.compressed.is_empty())
                    {
                        return Err(invalid("PNG animation frame has no frame data"));
                    }
                    reserve_png_frame_slot(
                        &default_compressed,
                        &mut animation_frames,
                        decoder_limit,
                    )?;
                    let compressed = Vec::new();
                    animation_frames.push(PngFrameData {
                        width: frame_width,
                        height: frame_height,
                        compressed,
                    });
                    active_frame = Some(animation_frames.len() - 1);
                }
            }
            b"fdAT" => {
                if data.len() < 5 || !saw_idat {
                    return Err(invalid("invalid PNG frame data"));
                }
                let sequence = u32::from_be_bytes([data[0], data[1], data[2], data[3]]);
                if sequence != expected_sequence {
                    return Err(invalid("PNG animation sequence is not contiguous"));
                }
                expected_sequence = expected_sequence
                    .checked_add(1)
                    .ok_or_else(|| resource("PNG sequence overflow"))?;
                let index =
                    active_frame.ok_or_else(|| invalid("PNG frame data has no frame control"))?;
                let persistent = png_persistent_bytes(&default_compressed, &animation_frames)?;
                let target_capacity = animation_frames[index].compressed.capacity() as u64;
                let other = persistent
                    .checked_sub(target_capacity)
                    .ok_or_else(|| resource("PNG allocation accounting underflow"))?;
                try_extend_bounded(
                    &mut animation_frames[index].compressed,
                    &data[4..],
                    other,
                    decoder_limit,
                    "PNG frame data allocation failed",
                )?;
            }
            b"tRNS" => {
                let valid_length = match color_type {
                    0 => data.len() == 2,
                    2 => data.len() == 6,
                    3 => saw_plte && !data.is_empty() && data.len() <= palette_entries,
                    4 | 6 => false,
                    _ => false,
                };
                if saw_trns || saw_idat || !valid_length {
                    return Err(invalid("invalid PNG transparency chunk"));
                }
                saw_trns = true;
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
            }
            b"zTXt" | b"iCCP" => {
                if chunk_type == b"iCCP" {
                    if saw_iccp || saw_srgb || saw_plte || saw_idat {
                        return Err(invalid("invalid PNG ICC profile placement"));
                    }
                    saw_iccp = true;
                }
                let separator = data
                    .iter()
                    .position(|byte| *byte == 0)
                    .ok_or_else(|| invalid("invalid compressed PNG metadata"))?;
                validate_png_keyword(&data[..separator])?;
                if data.get(separator + 1) != Some(&0) {
                    return Err(invalid("invalid compressed PNG metadata header"));
                }
                let header_bytes = u64::try_from(separator + 2)
                    .map_err(|_| resource("PNG metadata length cannot be represented"))?;
                let remaining = budget.metadata_remaining(metadata_bytes)?;
                if header_bytes > remaining {
                    return Err(resource("PNG metadata budget exceeded"));
                }
                let persistent = png_persistent_bytes(&default_compressed, &animation_frames)?;
                let inflated = inflate_zlib_metadata(
                    data.get(separator + 2..)
                        .ok_or_else(|| invalid("truncated compressed PNG metadata"))?,
                    remaining - header_bytes,
                    decoder_limit,
                    persistent,
                    false,
                )?;
                metadata_decoder_peak = metadata_decoder_peak.max(inflated.peak_bytes);
                metadata_bytes = checked_add(metadata_bytes, header_bytes)?;
                metadata_bytes = checked_add(metadata_bytes, inflated.expanded_bytes)?;
            }
            b"iTXt" => {
                let persistent = png_persistent_bytes(&default_compressed, &animation_frames)?;
                let remaining = budget.metadata_remaining(metadata_bytes)?;
                let validated =
                    validate_png_international_text(data, remaining, decoder_limit, persistent)?;
                metadata_decoder_peak = metadata_decoder_peak.max(validated.peak_bytes);
                metadata_bytes = checked_add(metadata_bytes, validated.expanded_bytes)?;
            }
            b"tEXt" => {
                let separator = data
                    .iter()
                    .position(|byte| *byte == 0)
                    .ok_or_else(|| invalid("invalid PNG text keyword"))?;
                validate_png_keyword(&data[..separator])?;
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
            }
            b"cHRM" => {
                if standard_ancillary & 1 != 0 || saw_plte || saw_idat || data.len() != 32 {
                    return Err(invalid("invalid PNG chromaticity chunk"));
                }
                standard_ancillary |= 1;
                metadata_bytes = checked_add(metadata_bytes, 32)?;
            }
            b"sBIT" => {
                let expected = match color_type {
                    0 => 1,
                    2 | 3 => 3,
                    4 => 2,
                    6 => 4,
                    _ => 0,
                };
                let maximum = if color_type == 3 { 8 } else { bit_depth };
                if standard_ancillary & 2 != 0
                    || saw_plte
                    || saw_idat
                    || data.len() != expected
                    || data.iter().any(|value| *value == 0 || *value > maximum)
                {
                    return Err(invalid("invalid PNG significant-bits chunk"));
                }
                standard_ancillary |= 2;
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
            }
            b"bKGD" => {
                let valid = match color_type {
                    0 | 4 => data.len() == 2,
                    2 | 6 => data.len() == 6,
                    3 => saw_plte && data.len() == 1 && usize::from(data[0]) < palette_entries,
                    _ => false,
                };
                if standard_ancillary & 4 != 0 || saw_idat || !valid {
                    return Err(invalid("invalid PNG background-color chunk"));
                }
                standard_ancillary |= 4;
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
            }
            b"hIST" => {
                if standard_ancillary & 8 != 0
                    || !saw_plte
                    || saw_idat
                    || data.len() != palette_entries.saturating_mul(2)
                {
                    return Err(invalid("invalid PNG palette-histogram chunk"));
                }
                standard_ancillary |= 8;
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
            }
            b"pHYs" => {
                if standard_ancillary & 16 != 0 || saw_idat || data.len() != 9 || data[8] > 1 {
                    return Err(invalid("invalid PNG physical-dimensions chunk"));
                }
                standard_ancillary |= 16;
                metadata_bytes = checked_add(metadata_bytes, 9)?;
            }
            b"tIME" => {
                let valid = data.len() == 7
                    && (1..=12).contains(&data[2])
                    && (1..=31).contains(&data[3])
                    && data[4] <= 23
                    && data[5] <= 59
                    && data[6] <= 60;
                if standard_ancillary & 32 != 0 || !valid {
                    return Err(invalid("invalid PNG modification-time chunk"));
                }
                standard_ancillary |= 32;
                metadata_bytes = checked_add(metadata_bytes, 7)?;
            }
            b"sPLT" => {
                if saw_idat {
                    return Err(invalid("PNG suggested palette follows image data"));
                }
                let separator = data
                    .iter()
                    .position(|byte| *byte == 0)
                    .ok_or_else(|| invalid("invalid PNG suggested-palette name"))?;
                validate_png_keyword(&data[..separator])?;
                let depth = *data
                    .get(separator + 1)
                    .ok_or_else(|| invalid("truncated PNG suggested palette"))?;
                let entry_bytes = if depth == 8 {
                    6
                } else if depth == 16 {
                    10
                } else {
                    return Err(invalid("invalid PNG suggested-palette depth"));
                };
                let entries = data.len().saturating_sub(separator + 2);
                if entries == 0 || entries % entry_bytes != 0 {
                    return Err(invalid("invalid PNG suggested-palette entries"));
                }
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
            }
            b"sRGB" => {
                if saw_srgb || saw_iccp || saw_plte || saw_idat || data.len() != 1 || data[0] > 3 {
                    return Err(invalid("invalid PNG standard color-space chunk"));
                }
                saw_srgb = true;
                metadata_bytes = checked_add(metadata_bytes, 1)?;
            }
            b"gAMA" => {
                if saw_gama || saw_plte || saw_idat || data.len() != 4 || data == [0, 0, 0, 0] {
                    return Err(invalid("invalid PNG gamma chunk"));
                }
                saw_gama = true;
                metadata_bytes = checked_add(metadata_bytes, 4)?;
            }
            b"eXIf" => {
                if saw_idat || data.is_empty() {
                    return Err(invalid("invalid PNG Exif chunk"));
                }
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
            }
            b"pCAL" | b"sCAL" | b"oFFs" | b"sTER" | b"dSIG" => {
                return Err(invalid("unsupported standardized PNG ancillary chunk"));
            }
            _ => {
                let ancillary = chunk_type[0] & 0x20 != 0;
                if !ancillary {
                    return Err(invalid("unknown critical PNG chunk"));
                }
                metadata_bytes = checked_add(metadata_bytes, data.len() as u64)?;
            }
        }
        budget.ensure_metadata_records(metadata_bytes, records)?;
    }
    if !saw_iend || position != bytes.len() {
        return Err(invalid("PNG is incomplete or has trailing payload"));
    }
    let frame_count = declared_animation_frames.unwrap_or(1);
    if let Some(declared) = declared_animation_frames {
        if animation_controls != declared
            || animation_frames
                .iter()
                .any(|frame| frame.compressed.is_empty())
            || (first_frame_uses_idat && declared != animation_frames.len() as u32 + 1)
            || (!first_frame_uses_idat && declared != animation_frames.len() as u32)
        {
            return Err(invalid("PNG animation frame inventory disagrees"));
        }
    } else if animation_controls != 0 || !animation_frames.is_empty() {
        return Err(invalid("PNG frame chunks require animation control"));
    }
    validate_dimensions(width, height)?;
    budget.ensure_counts(width, height, frame_count, channels, bit_depth)?;
    budget.ensure_metadata_records(metadata_bytes, records)?;

    let persistent = png_persistent_bytes(&default_compressed, &animation_frames)?;
    budget.ensure_decoder_peak(persistent)?;
    let mut decoder_peak_bytes = metadata_decoder_peak.max(decode_png_image(
        &default_compressed,
        PngDecodeParameters {
            width,
            height,
            bit_depth,
            color_type,
            interlace,
            palette_entries,
            allocation_limit: decoder_limit,
            persistent_bytes: persistent,
        },
    )?);
    for frame in &animation_frames {
        decoder_peak_bytes = decoder_peak_bytes.max(decode_png_image(
            &frame.compressed,
            PngDecodeParameters {
                width: frame.width,
                height: frame.height,
                bit_depth,
                color_type,
                interlace,
                palette_entries,
                allocation_limit: decoder_limit,
                persistent_bytes: persistent,
            },
        )?);
    }
    budget.ensure_decoder_peak(decoder_peak_bytes)?;
    Ok(RasterInfo {
        width,
        height,
        frames: frame_count,
        channels,
        bit_depth,
        metadata_bytes,
        structural_records: records,
        decoder_peak_bytes,
    })
}

fn png_channels(color_type: u8, bit_depth: u8) -> Result<u8, RasterError> {
    let valid = match color_type {
        0 => matches!(bit_depth, 1 | 2 | 4 | 8 | 16),
        2 => matches!(bit_depth, 8 | 16),
        3 => matches!(bit_depth, 1 | 2 | 4 | 8),
        4 => matches!(bit_depth, 8 | 16),
        6 => matches!(bit_depth, 8 | 16),
        _ => false,
    };
    if !valid {
        return Err(invalid("invalid PNG color type or bit depth"));
    }
    match color_type {
        0 | 3 => Ok(1),
        2 => Ok(3),
        4 => Ok(2),
        6 => Ok(4),
        _ => Err(invalid("invalid PNG color type")),
    }
}

fn png_persistent_bytes(
    default_compressed: &Vec<u8>,
    animation_frames: &Vec<PngFrameData>,
) -> Result<u64, RasterError> {
    let frame_slots = checked_mul(
        animation_frames.capacity() as u64,
        std::mem::size_of::<PngFrameData>() as u64,
    )?;
    let mut total = checked_add(default_compressed.capacity() as u64, frame_slots)?;
    for frame in animation_frames {
        total = checked_add(total, frame.compressed.capacity() as u64)?;
    }
    Ok(total)
}

fn reserve_png_frame_slot(
    default_compressed: &Vec<u8>,
    animation_frames: &mut Vec<PngFrameData>,
    allocation_limit: u64,
) -> Result<(), RasterError> {
    let current = png_persistent_bytes(default_compressed, animation_frames)?;
    let current_slots = checked_mul(
        animation_frames.capacity() as u64,
        std::mem::size_of::<PngFrameData>() as u64,
    )?;
    let required_slots = animation_frames
        .len()
        .checked_add(1)
        .ok_or_else(|| resource("PNG frame allocation overflow"))?;
    let planned_slots = checked_mul(
        animation_frames.capacity().max(required_slots) as u64,
        std::mem::size_of::<PngFrameData>() as u64,
    )?;
    let other = current
        .checked_sub(current_slots)
        .ok_or_else(|| resource("PNG allocation accounting underflow"))?;
    if checked_add(other, planned_slots)? > allocation_limit {
        return Err(resource("PNG frame allocation budget exceeded"));
    }
    animation_frames
        .try_reserve_exact(1)
        .map_err(|_| resource("PNG frame allocation failed"))?;
    if png_persistent_bytes(default_compressed, animation_frames)? > allocation_limit {
        return Err(resource("PNG frame allocation budget exceeded"));
    }
    Ok(())
}

fn try_extend_bounded(
    target: &mut Vec<u8>,
    bytes: &[u8],
    other_persistent: u64,
    allocation_limit: u64,
    message: &'static str,
) -> Result<(), RasterError> {
    let required = target
        .len()
        .checked_add(bytes.len())
        .ok_or_else(|| resource("PNG compressed-data length overflow"))?;
    let planned_capacity = target.capacity().max(required) as u64;
    if checked_add(other_persistent, planned_capacity)? > allocation_limit {
        return Err(resource("PNG compressed-data allocation budget exceeded"));
    }
    target
        .try_reserve_exact(bytes.len())
        .map_err(|_| resource(message))?;
    if checked_add(other_persistent, target.capacity() as u64)? > allocation_limit {
        return Err(resource("PNG compressed-data allocation budget exceeded"));
    }
    target.extend_from_slice(bytes);
    Ok(())
}

struct PngInflateResult {
    expanded_bytes: u64,
    peak_bytes: u64,
}

fn inflate_zlib_metadata(
    input: &[u8],
    maximum: u64,
    allocation_limit: u64,
    persistent_bytes: u64,
    require_utf8: bool,
) -> Result<PngInflateResult, RasterError> {
    let maximum = usize::try_from(maximum)
        .map_err(|_| resource("expanded PNG metadata cannot be represented"))?;
    let state_bytes = std::mem::size_of::<DecompressorOxide>() as u64;
    let planned_peak = checked_add(checked_add(persistent_bytes, state_bytes)?, maximum as u64)?;
    if planned_peak > allocation_limit {
        return Err(resource("expanded PNG metadata allocation budget exceeded"));
    }
    let mut output = Vec::new();
    output
        .try_reserve_exact(maximum)
        .map_err(|_| resource("expanded PNG metadata allocation failed"))?;
    output.resize(maximum, 0);
    let actual_peak = checked_add(
        checked_add(persistent_bytes, state_bytes)?,
        output.capacity() as u64,
    )?;
    if actual_peak > allocation_limit {
        return Err(resource("expanded PNG metadata allocation budget exceeded"));
    }
    let mut decoder = DecompressorOxide::new();
    let flags = inflate_flags::TINFL_FLAG_PARSE_ZLIB_HEADER
        | inflate_flags::TINFL_FLAG_USING_NON_WRAPPING_OUTPUT_BUF;
    let (status, consumed, produced) = miniz_decompress(&mut decoder, input, &mut output, 0, flags);
    match status {
        TINFLStatus::Done if consumed == input.len() => {
            if require_utf8 {
                std::str::from_utf8(&output[..produced])
                    .map_err(|_| invalid("invalid compressed PNG iTXt UTF-8"))?;
            }
            Ok(PngInflateResult {
                expanded_bytes: produced as u64,
                peak_bytes: actual_peak,
            })
        }
        TINFLStatus::Done => Err(invalid("PNG zlib stream has trailing bytes")),
        TINFLStatus::HasMoreOutput => Err(resource("expanded PNG metadata budget exceeded")),
        _ => Err(invalid("invalid or truncated PNG zlib stream")),
    }
}

fn validate_png_keyword(keyword: &[u8]) -> Result<(), RasterError> {
    if keyword.is_empty() || keyword.len() > 79 {
        return Err(invalid("invalid PNG metadata keyword length"));
    }
    let mut previous_space = false;
    for (index, byte) in keyword.iter().copied().enumerate() {
        if !(matches!(byte, 32..=126 | 161..=255))
            || (byte == b' ' && (index == 0 || index + 1 == keyword.len() || previous_space))
        {
            return Err(invalid("invalid PNG metadata keyword"));
        }
        previous_space = byte == b' ';
    }
    Ok(())
}

fn validate_png_international_text(
    data: &[u8],
    maximum: u64,
    allocation_limit: u64,
    persistent_bytes: u64,
) -> Result<PngInflateResult, RasterError> {
    let keyword_end = data
        .iter()
        .position(|byte| *byte == 0)
        .ok_or_else(|| invalid("invalid PNG iTXt keyword"))?;
    validate_png_keyword(&data[..keyword_end])?;
    if data.len() < keyword_end + 5 {
        return Err(invalid("invalid PNG iTXt header"));
    }
    let compressed = data[keyword_end + 1];
    let method = data[keyword_end + 2];
    if compressed > 1 || method != 0 {
        return Err(invalid("invalid PNG iTXt compression fields"));
    }
    let language_start = keyword_end + 3;
    let language_end = data[language_start..]
        .iter()
        .position(|byte| *byte == 0)
        .map(|offset| language_start + offset)
        .ok_or_else(|| invalid("invalid PNG iTXt language tag"))?;
    if !data[language_start..language_end]
        .iter()
        .all(|byte| byte.is_ascii_alphanumeric() || *byte == b'-')
    {
        return Err(invalid("invalid PNG iTXt language tag"));
    }
    let translated_start = language_end + 1;
    let translated_end = data[translated_start..]
        .iter()
        .position(|byte| *byte == 0)
        .map(|offset| translated_start + offset)
        .ok_or_else(|| invalid("invalid PNG iTXt translated keyword"))?;
    std::str::from_utf8(&data[translated_start..translated_end])
        .map_err(|_| invalid("invalid PNG iTXt translated keyword UTF-8"))?;
    let text = &data[translated_end + 1..];
    let header_bytes = u64::try_from(translated_end + 1)
        .map_err(|_| resource("PNG iTXt header length cannot be represented"))?;
    if header_bytes > maximum {
        return Err(resource("PNG iTXt metadata budget exceeded"));
    }
    if compressed == 1 {
        let mut inflated = inflate_zlib_metadata(
            text,
            maximum - header_bytes,
            allocation_limit,
            persistent_bytes,
            true,
        )?;
        inflated.expanded_bytes = checked_add(header_bytes, inflated.expanded_bytes)?;
        Ok(inflated)
    } else {
        std::str::from_utf8(text).map_err(|_| invalid("invalid PNG iTXt UTF-8"))?;
        let expanded_bytes = checked_add(header_bytes, text.len() as u64)?;
        if expanded_bytes > maximum {
            return Err(resource("PNG iTXt metadata budget exceeded"));
        }
        Ok(PngInflateResult {
            expanded_bytes,
            peak_bytes: persistent_bytes,
        })
    }
}

#[derive(Clone, Copy)]
struct PngDecodeParameters {
    width: u32,
    height: u32,
    bit_depth: u8,
    color_type: u8,
    interlace: u8,
    palette_entries: usize,
    allocation_limit: u64,
    persistent_bytes: u64,
}

fn decode_png_image(
    compressed: &[u8],
    parameters: PngDecodeParameters,
) -> Result<u64, RasterError> {
    let PngDecodeParameters {
        width,
        height,
        bit_depth,
        color_type,
        interlace,
        palette_entries,
        allocation_limit,
        persistent_bytes,
    } = parameters;
    let channels = u64::from(png_channels(color_type, bit_depth)?);
    let bits_per_pixel = checked_mul(channels, u64::from(bit_depth))?;
    let passes: &[(u32, u32, u32, u32)] = if interlace == 0 {
        &[(0, 0, 1, 1)]
    } else {
        &[
            (0, 0, 8, 8),
            (4, 0, 8, 8),
            (0, 4, 4, 8),
            (2, 0, 4, 4),
            (0, 2, 2, 4),
            (1, 0, 2, 2),
            (0, 1, 1, 2),
        ]
    };
    let mut expected = 0u64;
    let mut max_row = 0u64;
    for &(start_x, start_y, step_x, step_y) in passes {
        let pass_width = pass_extent(width, start_x, step_x);
        let pass_height = pass_extent(height, start_y, step_y);
        if pass_width == 0 || pass_height == 0 {
            continue;
        }
        let row_bits = checked_mul(u64::from(pass_width), bits_per_pixel)?;
        let row_bytes = checked_add(row_bits, 7)? / 8;
        max_row = max_row.max(row_bytes);
        expected = checked_add(
            expected,
            checked_mul(checked_add(row_bytes, 1)?, u64::from(pass_height))?,
        )?;
    }
    let expected_usize = usize::try_from(expected)
        .map_err(|_| resource("PNG decoded size cannot be represented"))?;
    let (decoded, inflate_peak) = inflate_zlib_exact(
        compressed,
        expected_usize,
        allocation_limit,
        persistent_bytes,
    )?;
    let mut cursor = 0usize;
    let filter_bytes_per_pixel = usize::try_from(checked_add(bits_per_pixel, 7)? / 8)
        .map_err(|_| resource("PNG filter width cannot be represented"))?
        .max(1);
    let max_row_usize =
        usize::try_from(max_row).map_err(|_| resource("PNG row width cannot be represented"))?;
    let planned_rows_peak = checked_add(
        checked_add(persistent_bytes, decoded.capacity() as u64)?,
        checked_mul(max_row, 2)?,
    )?;
    if planned_rows_peak > allocation_limit {
        return Err(resource("PNG row allocation budget exceeded"));
    }
    let mut previous = Vec::new();
    previous
        .try_reserve_exact(max_row_usize)
        .map_err(|_| resource("PNG row allocation failed"))?;
    previous.resize(max_row_usize, 0);
    let mut current = Vec::new();
    current
        .try_reserve_exact(max_row_usize)
        .map_err(|_| resource("PNG row allocation failed"))?;
    current.resize(max_row_usize, 0);
    let rows_peak = checked_add(
        checked_add(persistent_bytes, decoded.capacity() as u64)?,
        checked_add(previous.capacity() as u64, current.capacity() as u64)?,
    )?;
    if rows_peak > allocation_limit {
        return Err(resource("PNG row allocation budget exceeded"));
    }

    for &(start_x, start_y, step_x, step_y) in passes {
        let pass_width = pass_extent(width, start_x, step_x);
        let pass_height = pass_extent(height, start_y, step_y);
        if pass_width == 0 || pass_height == 0 {
            continue;
        }
        let row_bytes = usize::try_from(
            checked_add(checked_mul(u64::from(pass_width), bits_per_pixel)?, 7)? / 8,
        )
        .map_err(|_| resource("PNG row width cannot be represented"))?;
        previous[..row_bytes].fill(0);
        for _ in 0..pass_height {
            let filter = *decoded
                .get(cursor)
                .ok_or_else(|| invalid("truncated PNG scanline"))?;
            cursor += 1;
            let end = cursor
                .checked_add(row_bytes)
                .ok_or_else(|| resource("PNG scanline offset overflow"))?;
            current[..row_bytes].copy_from_slice(
                decoded
                    .get(cursor..end)
                    .ok_or_else(|| invalid("truncated PNG scanline"))?,
            );
            cursor = end;
            unfilter_png_row(
                filter,
                &mut current[..row_bytes],
                &previous[..row_bytes],
                filter_bytes_per_pixel,
            )?;
            if color_type == 3 {
                validate_png_palette_indices(
                    &current[..row_bytes],
                    pass_width,
                    bit_depth,
                    palette_entries,
                )?;
            }
            std::mem::swap(&mut current, &mut previous);
        }
    }
    if cursor != decoded.len() {
        return Err(invalid("PNG decoded stream has excess scanline data"));
    }
    Ok(inflate_peak.max(rows_peak))
}

fn pass_extent(total: u32, start: u32, step: u32) -> u32 {
    if total <= start {
        0
    } else {
        (total - start).div_ceil(step)
    }
}

fn inflate_zlib_exact(
    input: &[u8],
    expected: usize,
    allocation_limit: u64,
    persistent_bytes: u64,
) -> Result<(Vec<u8>, u64), RasterError> {
    let state_bytes = std::mem::size_of::<DecompressorOxide>() as u64;
    let planned_peak = checked_add(checked_add(persistent_bytes, state_bytes)?, expected as u64)?;
    if planned_peak > allocation_limit {
        return Err(resource("PNG decoded allocation budget exceeded"));
    }
    let mut output = Vec::new();
    output
        .try_reserve_exact(expected)
        .map_err(|_| resource("PNG decoded allocation failed"))?;
    output.resize(expected, 0);
    let actual_peak = checked_add(
        checked_add(persistent_bytes, state_bytes)?,
        output.capacity() as u64,
    )?;
    if actual_peak > allocation_limit {
        return Err(resource("PNG decoded allocation budget exceeded"));
    }
    let mut decoder = DecompressorOxide::new();
    let flags = inflate_flags::TINFL_FLAG_PARSE_ZLIB_HEADER
        | inflate_flags::TINFL_FLAG_USING_NON_WRAPPING_OUTPUT_BUF;
    let (status, consumed, produced) = miniz_decompress(&mut decoder, input, &mut output, 0, flags);
    match status {
        TINFLStatus::Done if consumed == input.len() && produced == expected => {
            Ok((output, actual_peak))
        }
        TINFLStatus::HasMoreOutput => Err(invalid("PNG decoded stream exceeds expected scanlines")),
        _ => Err(invalid(
            "PNG compressed stream length disagrees with scanlines",
        )),
    }
}

fn unfilter_png_row(
    filter: u8,
    row: &mut [u8],
    previous: &[u8],
    bytes_per_pixel: usize,
) -> Result<(), RasterError> {
    match filter {
        0 => {}
        1 => {
            for index in bytes_per_pixel..row.len() {
                row[index] = row[index].wrapping_add(row[index - bytes_per_pixel]);
            }
        }
        2 => {
            for (value, above) in row.iter_mut().zip(previous) {
                *value = value.wrapping_add(*above);
            }
        }
        3 => {
            for index in 0..row.len() {
                let left = if index >= bytes_per_pixel {
                    row[index - bytes_per_pixel]
                } else {
                    0
                };
                let above = previous[index];
                row[index] =
                    row[index].wrapping_add(((u16::from(left) + u16::from(above)) / 2) as u8);
            }
        }
        4 => {
            for index in 0..row.len() {
                let left = if index >= bytes_per_pixel {
                    row[index - bytes_per_pixel]
                } else {
                    0
                };
                let above = previous[index];
                let upper_left = if index >= bytes_per_pixel {
                    previous[index - bytes_per_pixel]
                } else {
                    0
                };
                row[index] = row[index].wrapping_add(paeth(left, above, upper_left));
            }
        }
        _ => return Err(invalid("invalid PNG scanline filter")),
    }
    Ok(())
}

fn paeth(left: u8, above: u8, upper_left: u8) -> u8 {
    let left = i32::from(left);
    let above = i32::from(above);
    let upper_left = i32::from(upper_left);
    let prediction = left + above - upper_left;
    let left_distance = (prediction - left).abs();
    let above_distance = (prediction - above).abs();
    let upper_left_distance = (prediction - upper_left).abs();
    if left_distance <= above_distance && left_distance <= upper_left_distance {
        left as u8
    } else if above_distance <= upper_left_distance {
        above as u8
    } else {
        upper_left as u8
    }
}

fn validate_png_palette_indices(
    row: &[u8],
    pixel_count: u32,
    bit_depth: u8,
    palette_entries: usize,
) -> Result<(), RasterError> {
    for pixel in 0..pixel_count as usize {
        let bit_offset = pixel * usize::from(bit_depth);
        let byte = row[bit_offset / 8];
        let shift = 8usize - usize::from(bit_depth) - (bit_offset % 8);
        let mask = (1u16 << bit_depth) - 1;
        let index = usize::from((u16::from(byte) >> shift) & mask);
        if index >= palette_entries {
            return Err(invalid("PNG palette index exceeds PLTE"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine as _;

    use super::*;

    fn validate(bytes: &[u8], mime: RasterMime) -> Result<RasterInfo, RasterError> {
        validate_raster(bytes, mime, &mut RasterBudget::default())
    }

    fn error_kind(bytes: &[u8], mime: RasterMime) -> RasterErrorKind {
        validate(bytes, mime).unwrap_err().kind
    }

    fn append_jpeg_segment(target: &mut Vec<u8>, marker: u8, payload: &[u8]) {
        target.extend_from_slice(&[0xff, marker]);
        let length = u16::try_from(payload.len() + 2).unwrap();
        target.extend_from_slice(&length.to_be_bytes());
        target.extend_from_slice(payload);
    }

    fn jpeg_fixture(progressive: bool, components: u8) -> Vec<u8> {
        let mut bytes = vec![0xff, 0xd8];
        let mut quantization = vec![0u8];
        quantization.extend_from_slice(&[1u8; 64]);
        append_jpeg_segment(&mut bytes, 0xdb, &quantization);

        let mut frame = vec![8, 0, 1, 0, 1, components];
        for component in 1..=components {
            frame.extend_from_slice(&[component, 0x11, 0]);
        }
        append_jpeg_segment(&mut bytes, if progressive { 0xc2 } else { 0xc0 }, &frame);

        let mut huffman = vec![0x00];
        huffman.extend_from_slice(&[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        huffman.push(0);
        huffman.push(0x10);
        huffman.extend_from_slice(&[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        huffman.push(0);
        append_jpeg_segment(&mut bytes, 0xc4, &huffman);

        if progressive {
            let mut dc_scan = vec![components];
            for component in 1..=components {
                dc_scan.extend_from_slice(&[component, 0]);
            }
            dc_scan.extend_from_slice(&[0, 0, 0]);
            append_jpeg_segment(&mut bytes, 0xda, &dc_scan);
            bytes.push(if components == 1 { 0x7f } else { 0x1f });
            for component in 1..=components {
                append_jpeg_segment(&mut bytes, 0xda, &[1, component, 0, 1, 63, 0]);
                bytes.push(0x7f);
            }
        } else {
            let mut scan = vec![components];
            for component in 1..=components {
                scan.extend_from_slice(&[component, 0]);
            }
            scan.extend_from_slice(&[0, 63, 0]);
            append_jpeg_segment(&mut bytes, 0xda, &scan);
            bytes.push(match components {
                1 => 0x3f,
                2 => 0x0f,
                3 => 0x03,
                4 => 0x00,
                _ => 0x3f,
            });
        }
        bytes.extend_from_slice(&[0xff, 0xd9]);
        bytes
    }

    fn marker_position(bytes: &[u8], marker: u8) -> usize {
        bytes
            .windows(2)
            .position(|pair| pair == [0xff, marker])
            .unwrap()
    }

    fn insert_jpeg_segment(bytes: &mut Vec<u8>, position: usize, marker: u8, payload: &[u8]) {
        let mut segment = Vec::new();
        append_jpeg_segment(&mut segment, marker, payload);
        bytes.splice(position..position, segment);
    }

    fn jpeg_with_adobe(transform: u8) -> Vec<u8> {
        jpeg_with_adobe_components(3, transform)
    }

    fn jpeg_with_adobe_components(components: u8, transform: u8) -> Vec<u8> {
        let mut jpeg = jpeg_fixture(false, components);
        let payload = [b'A', b'd', b'o', b'b', b'e', 0, 100, 0, 0, 0, 0, transform];
        insert_jpeg_segment(&mut jpeg, 2, 0xee, &payload);
        jpeg
    }

    fn unsupported_jpeg_dimensions(width: u16, height: u16, components: u8) -> Vec<u8> {
        let mut jpeg = jpeg_fixture(false, components);
        let frame = marker_position(&jpeg, 0xc0);
        jpeg[frame + 5..frame + 7].copy_from_slice(&height.to_be_bytes());
        jpeg[frame + 7..frame + 9].copy_from_slice(&width.to_be_bytes());
        // Lossless syntax is structurally validated but its deliberately
        // excluded native decoder path is never entered. This keeps numeric
        // boundary tests independent of synthetic entropy size while retaining
        // the 8-bit sample accounting used by the exact pixel ceiling.
        jpeg[frame + 1] = 0xc3;
        let scan = marker_position(&jpeg, 0xda);
        let scan_length = u16::from_be_bytes([jpeg[scan + 2], jpeg[scan + 3]]) as usize;
        let entropy_start = scan + 2 + scan_length;
        jpeg[entropy_start - 3..entropy_start].copy_from_slice(&[1, 0, 0]);
        jpeg
    }

    fn hierarchical_jpeg_fixture() -> Vec<u8> {
        let mut jpeg = jpeg_fixture(false, 1);
        let sof = marker_position(&jpeg, 0xc0);
        let frame_length = u16::from_be_bytes([jpeg[sof + 2], jpeg[sof + 3]]) as usize;
        let frame_payload = jpeg[sof + 4..sof + 2 + frame_length].to_vec();
        insert_jpeg_segment(&mut jpeg, sof, 0xde, &frame_payload);

        let eoi = jpeg.len() - 2;
        let mut differential = Vec::new();
        append_jpeg_segment(&mut differential, 0xc5, &frame_payload);
        append_jpeg_segment(&mut differential, 0xda, &[1, 1, 0, 0, 63, 0]);
        differential.push(0x3f);
        jpeg.splice(eoi..eoi, differential);
        jpeg
    }

    fn adler32(bytes: &[u8]) -> u32 {
        let mut first = 1u32;
        let mut second = 0u32;
        for byte in bytes {
            first = (first + u32::from(*byte)) % 65_521;
            second = (second + first) % 65_521;
        }
        (second << 16) | first
    }

    fn zlib_stored(bytes: &[u8]) -> Vec<u8> {
        assert!(bytes.len() <= u16::MAX as usize);
        let length = bytes.len() as u16;
        let mut output = vec![0x78, 0x01, 0x01];
        output.extend_from_slice(&length.to_le_bytes());
        output.extend_from_slice(&(!length).to_le_bytes());
        output.extend_from_slice(bytes);
        output.extend_from_slice(&adler32(bytes).to_be_bytes());
        output
    }

    fn append_png_chunk(target: &mut Vec<u8>, kind: &[u8; 4], data: &[u8]) {
        target.extend_from_slice(&(data.len() as u32).to_be_bytes());
        target.extend_from_slice(kind);
        target.extend_from_slice(data);
        let mut crc = crc32fast::Hasher::new();
        crc.update(kind);
        crc.update(data);
        target.extend_from_slice(&crc.finalize().to_be_bytes());
    }

    fn png_rgba_with_chunks(width: u32, height: u32, before_idat: &[(&[u8; 4], &[u8])]) -> Vec<u8> {
        let mut png = b"\x89PNG\r\n\x1a\n".to_vec();
        let mut ihdr = Vec::new();
        ihdr.extend_from_slice(&width.to_be_bytes());
        ihdr.extend_from_slice(&height.to_be_bytes());
        ihdr.extend_from_slice(&[8, 6, 0, 0, 0]);
        append_png_chunk(&mut png, b"IHDR", &ihdr);
        for (kind, data) in before_idat {
            append_png_chunk(&mut png, kind, data);
        }
        let mut raw = Vec::new();
        for _ in 0..height {
            raw.resize(raw.len() + 1, 0);
            for _ in 0..width {
                raw.extend_from_slice(&[10, 20, 30, 255]);
            }
        }
        append_png_chunk(&mut png, b"IDAT", &zlib_stored(&raw));
        append_png_chunk(&mut png, b"IEND", &[]);
        png
    }

    fn png_grayscale_one_bit(width: u32, height: u32) -> Vec<u8> {
        let mut png = b"\x89PNG\r\n\x1a\n".to_vec();
        let mut ihdr = Vec::new();
        ihdr.extend_from_slice(&width.to_be_bytes());
        ihdr.extend_from_slice(&height.to_be_bytes());
        ihdr.extend_from_slice(&[1, 0, 0, 0, 0]);
        append_png_chunk(&mut png, b"IHDR", &ihdr);
        let row_bytes = (width as usize).div_ceil(8);
        let mut raw = Vec::new();
        for _ in 0..height {
            raw.push(0);
            raw.resize(raw.len() + row_bytes, 0);
        }
        append_png_chunk(&mut png, b"IDAT", &zlib_stored(&raw));
        append_png_chunk(&mut png, b"IEND", &[]);
        png
    }

    fn apng_frames(frame_count: u32) -> Vec<u8> {
        assert!(frame_count > 0);
        let mut png = b"\x89PNG\r\n\x1a\n".to_vec();
        let mut ihdr = Vec::new();
        ihdr.extend_from_slice(&1u32.to_be_bytes());
        ihdr.extend_from_slice(&1u32.to_be_bytes());
        ihdr.extend_from_slice(&[8, 6, 0, 0, 0]);
        append_png_chunk(&mut png, b"IHDR", &ihdr);
        let mut actl = Vec::new();
        actl.extend_from_slice(&frame_count.to_be_bytes());
        actl.extend_from_slice(&0u32.to_be_bytes());
        append_png_chunk(&mut png, b"acTL", &actl);
        let frame_control = |sequence: u32| {
            let mut data = Vec::new();
            data.extend_from_slice(&sequence.to_be_bytes());
            data.extend_from_slice(&1u32.to_be_bytes());
            data.extend_from_slice(&1u32.to_be_bytes());
            data.extend_from_slice(&0u32.to_be_bytes());
            data.extend_from_slice(&0u32.to_be_bytes());
            data.extend_from_slice(&1u16.to_be_bytes());
            data.extend_from_slice(&10u16.to_be_bytes());
            data.extend_from_slice(&[0, 0]);
            data
        };
        append_png_chunk(&mut png, b"fcTL", &frame_control(0));
        append_png_chunk(&mut png, b"IDAT", &zlib_stored(&[0, 1, 2, 3, 255]));
        let mut sequence = 1u32;
        for frame in 1..frame_count {
            append_png_chunk(&mut png, b"fcTL", &frame_control(sequence));
            sequence += 1;
            let mut fdat = sequence.to_be_bytes().to_vec();
            fdat.extend_from_slice(&zlib_stored(&[
                0,
                frame as u8,
                frame.wrapping_add(1) as u8,
                frame.wrapping_add(2) as u8,
                255,
            ]));
            append_png_chunk(&mut png, b"fdAT", &fdat);
            sequence += 1;
        }
        append_png_chunk(&mut png, b"IEND", &[]);
        png
    }

    fn apng_fixture() -> Vec<u8> {
        apng_frames(2)
    }

    fn gif_fixture(frames: usize) -> Vec<u8> {
        let mut gif = b"GIF89a".to_vec();
        gif.extend_from_slice(&[1, 0, 1, 0, 0x80, 0, 0]);
        gif.extend_from_slice(&[0, 0, 0, 255, 255, 255]);
        for _ in 0..frames {
            gif.push(0x2c);
            gif.extend_from_slice(&[0, 0, 0, 0, 1, 0, 1, 0, 0]);
            gif.extend_from_slice(&[2, 2, 0x44, 0x01, 0]);
        }
        gif.push(0x3b);
        gif
    }

    fn gif_with_canvas_width(width: u16) -> Vec<u8> {
        let mut gif = gif_fixture(1);
        gif[6..8].copy_from_slice(&width.to_le_bytes());
        gif
    }

    fn put_u16_le(bytes: &mut [u8], offset: usize, value: u16) {
        bytes[offset..offset + 2].copy_from_slice(&value.to_le_bytes());
    }

    fn put_u32_le(bytes: &mut [u8], offset: usize, value: u32) {
        bytes[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
    }

    fn bmp_windows(dib_size: usize, width: i32, height: i32, bit_count: u16) -> Vec<u8> {
        let absolute_height = height.unsigned_abs();
        let pixel_bytes = bmp_uncompressed_pixel_bytes(width as u32, absolute_height, bit_count)
            .unwrap() as usize;
        let pixel_offset = 14 + dib_size;
        let mut bmp = vec![0u8; pixel_offset + pixel_bytes];
        bmp[0..2].copy_from_slice(b"BM");
        let bmp_len = bmp.len() as u32;
        put_u32_le(&mut bmp, 2, bmp_len);
        put_u32_le(&mut bmp, 10, pixel_offset as u32);
        put_u32_le(&mut bmp, 14, dib_size as u32);
        put_u32_le(&mut bmp, 18, width as u32);
        put_u32_le(&mut bmp, 22, height as u32);
        put_u16_le(&mut bmp, 26, 1);
        put_u16_le(&mut bmp, 28, bit_count);
        put_u32_le(&mut bmp, 30, 0);
        put_u32_le(&mut bmp, 34, pixel_bytes as u32);
        bmp
    }

    fn bmp_v5_with_profile(color_space_type: u32, profile: &[u8]) -> Vec<u8> {
        let mut bmp = bmp_windows(124, 1, 1, 24);
        let profile_start = bmp.len();
        bmp.extend_from_slice(profile);
        let bmp_len = bmp.len() as u32;
        put_u32_le(&mut bmp, 2, bmp_len);
        put_u32_le(&mut bmp, 70, color_space_type);
        put_u32_le(&mut bmp, 126, (profile_start - 14) as u32);
        put_u32_le(&mut bmp, 130, profile.len() as u32);
        bmp
    }

    fn bmp_os2() -> Vec<u8> {
        let mut bmp = vec![0u8; 30];
        bmp[0..2].copy_from_slice(b"BM");
        put_u32_le(&mut bmp, 2, 30);
        put_u32_le(&mut bmp, 10, 26);
        put_u32_le(&mut bmp, 14, 12);
        put_u16_le(&mut bmp, 18, 1);
        put_u16_le(&mut bmp, 20, 1);
        put_u16_le(&mut bmp, 22, 1);
        put_u16_le(&mut bmp, 24, 24);
        bmp
    }

    fn bmp_indexed() -> Vec<u8> {
        let mut bmp = vec![0u8; 62];
        bmp[0..2].copy_from_slice(b"BM");
        put_u32_le(&mut bmp, 2, 62);
        put_u32_le(&mut bmp, 10, 58);
        put_u32_le(&mut bmp, 14, 40);
        put_u32_le(&mut bmp, 18, 1);
        put_u32_le(&mut bmp, 22, 1);
        put_u16_le(&mut bmp, 26, 1);
        put_u16_le(&mut bmp, 28, 8);
        put_u32_le(&mut bmp, 34, 4);
        put_u32_le(&mut bmp, 46, 1);
        bmp
    }

    fn bmp_rle8() -> Vec<u8> {
        let mut bmp = vec![0u8; 64];
        bmp[0..2].copy_from_slice(b"BM");
        put_u32_le(&mut bmp, 2, 64);
        put_u32_le(&mut bmp, 10, 58);
        put_u32_le(&mut bmp, 14, 40);
        put_u32_le(&mut bmp, 18, 1);
        put_u32_le(&mut bmp, 22, 1);
        put_u16_le(&mut bmp, 26, 1);
        put_u16_le(&mut bmp, 28, 8);
        put_u32_le(&mut bmp, 30, 1);
        put_u32_le(&mut bmp, 34, 6);
        put_u32_le(&mut bmp, 46, 1);
        bmp[58..].copy_from_slice(&[1, 0, 0, 0, 0, 1]);
        bmp
    }

    fn bmp_bitfields16() -> Vec<u8> {
        let mut bmp = vec![0u8; 70];
        bmp[0..2].copy_from_slice(b"BM");
        put_u32_le(&mut bmp, 2, 70);
        put_u32_le(&mut bmp, 10, 66);
        put_u32_le(&mut bmp, 14, 40);
        put_u32_le(&mut bmp, 18, 1);
        put_u32_le(&mut bmp, 22, 1);
        put_u16_le(&mut bmp, 26, 1);
        put_u16_le(&mut bmp, 28, 16);
        put_u32_le(&mut bmp, 30, 3);
        put_u32_le(&mut bmp, 34, 4);
        put_u32_le(&mut bmp, 54, 0x7c00);
        put_u32_le(&mut bmp, 58, 0x03e0);
        put_u32_le(&mut bmp, 62, 0x001f);
        bmp
    }

    fn bmp_embedded(compression: u32, payload: &[u8]) -> Vec<u8> {
        let mut bmp = vec![0u8; 54 + payload.len()];
        bmp[0..2].copy_from_slice(b"BM");
        let length = bmp.len() as u32;
        put_u32_le(&mut bmp, 2, length);
        put_u32_le(&mut bmp, 10, 54);
        put_u32_le(&mut bmp, 14, 40);
        put_u32_le(&mut bmp, 18, 1);
        put_u32_le(&mut bmp, 22, 1);
        put_u16_le(&mut bmp, 26, 1);
        put_u16_le(&mut bmp, 28, 0);
        put_u32_le(&mut bmp, 30, compression);
        put_u32_le(&mut bmp, 34, payload.len() as u32);
        bmp[54..].copy_from_slice(payload);
        bmp
    }

    fn webp_fixture() -> Vec<u8> {
        STANDARD
            .decode("UklGRh4AAABXRUJQVlA4TBEAAAAvAUAAAAdQkTYUp/+BiOh/AAA=")
            .unwrap()
    }

    fn zero_width_webp() -> Vec<u8> {
        let payload = [0, 0, 0, 0x9d, 0x01, 0x2a, 0, 0, 1, 0];
        let mut webp = b"RIFF".to_vec();
        webp.extend_from_slice(&22u32.to_le_bytes());
        webp.extend_from_slice(b"WEBPVP8 ");
        webp.extend_from_slice(&10u32.to_le_bytes());
        webp.extend_from_slice(&payload);
        webp
    }

    fn animated_webp_fixture() -> Vec<u8> {
        STANDARD.decode("UklGRoQAAABXRUJQVlA4WAoAAAACAAAAAQAAAQAAQU5JTQYAAAD/////AABBTk1GKAAAAAAAAAAAAAEAAAEAAPQBAAJWUDhMDwAAAC8BQAAABxD9j/4HIqL/AQBBTk1GKAAAAAAAAAAAAAEAAAEAAPQBAABWUDhMDwAAAC8BQAAAB9D/iP4HIqL/AQA=").unwrap()
    }

    fn animated_webp_frames(count: usize) -> Vec<u8> {
        let source = animated_webp_fixture();
        let first_frame = source[44..92].to_vec();
        let mut output = source[..44].to_vec();
        for _ in 0..count {
            output.extend_from_slice(&first_frame);
        }
        let riff_size = (output.len() - 8) as u32;
        put_u32_le(&mut output, 4, riff_size);
        output
    }

    fn animated_webp_with_unknown_chunk(payload: &[u8]) -> Vec<u8> {
        let mut webp = animated_webp_fixture();
        let chunk = webp_chunk(b"JUNK", payload);
        webp.extend_from_slice(&chunk);
        let riff_size = (webp.len() - 8) as u32;
        put_u32_le(&mut webp, 4, riff_size);
        webp
    }

    fn webp_with_unknown_before_image(payload: &[u8]) -> Vec<u8> {
        let mut webp = webp_fixture();
        let chunk = webp_chunk(b"JUNK", payload);
        webp.splice(12..12, chunk);
        let riff_size = (webp.len() - 8) as u32;
        put_u32_le(&mut webp, 4, riff_size);
        webp
    }

    fn animated_webp_with_unknown_between_frames(payload: &[u8]) -> Vec<u8> {
        let mut webp = animated_webp_fixture();
        let first_frame = 44usize;
        let frame_payload_bytes = read_u32_le(&webp, first_frame + 4).unwrap() as usize;
        let frame_end = first_frame + 8 + frame_payload_bytes;
        let chunk = webp_chunk(b"JUNK", payload);
        webp.splice(frame_end..frame_end, chunk);
        let riff_size = (webp.len() - 8) as u32;
        put_u32_le(&mut webp, 4, riff_size);
        webp
    }

    fn animated_webp_with_unknown_before_frame_image(payload: &[u8]) -> Vec<u8> {
        let mut webp = animated_webp_fixture();
        let first_frame = 44usize;
        let frame_payload_bytes = read_u32_le(&webp, first_frame + 4).unwrap() as usize;
        let frame_image = first_frame + 8 + 16;
        let chunk = webp_chunk(b"JUNK", payload);
        let new_frame_payload_bytes = frame_payload_bytes + chunk.len();
        webp.splice(frame_image..frame_image, chunk);
        put_u32_le(&mut webp, first_frame + 4, new_frame_payload_bytes as u32);
        let riff_size = (webp.len() - 8) as u32;
        put_u32_le(&mut webp, 4, riff_size);
        webp
    }

    fn animated_webp_with_unknown_frame_chunk(payload: &[u8]) -> Vec<u8> {
        let mut webp = animated_webp_fixture();
        let first_frame = 44usize;
        let frame_payload_bytes = read_u32_le(&webp, first_frame + 4).unwrap() as usize;
        let frame_end = first_frame + 8 + frame_payload_bytes;
        let chunk = webp_chunk(b"JUNK", payload);
        let new_frame_payload_bytes = frame_payload_bytes + chunk.len();
        webp.splice(frame_end..frame_end, chunk);
        put_u32_le(&mut webp, first_frame + 4, new_frame_payload_bytes as u32);
        let riff_size = (webp.len() - 8) as u32;
        put_u32_le(&mut webp, 4, riff_size);
        webp
    }

    fn webp_with_exif_and_xmp(exif_first: bool) -> Vec<u8> {
        let simple = webp_fixture();
        let mut chunks = webp_chunk(b"VP8X", &[0x0c, 0, 0, 0, 1, 0, 0, 1, 0, 0]);
        chunks.extend_from_slice(&simple[12..]);
        let exif = webp_chunk(b"EXIF", b"e");
        let xmp = webp_chunk(b"XMP ", b"x");
        if exif_first {
            chunks.extend_from_slice(&exif);
            chunks.extend_from_slice(&xmp);
        } else {
            chunks.extend_from_slice(&xmp);
            chunks.extend_from_slice(&exif);
        }
        let mut webp = b"RIFF".to_vec();
        webp.extend_from_slice(&((chunks.len() + 4) as u32).to_le_bytes());
        webp.extend_from_slice(b"WEBP");
        webp.extend_from_slice(&chunks);
        webp
    }

    fn webp_chunk(fourcc: &[u8; 4], payload: &[u8]) -> Vec<u8> {
        let mut chunk = fourcc.to_vec();
        chunk.extend_from_slice(&(payload.len() as u32).to_le_bytes());
        chunk.extend_from_slice(payload);
        if payload.len() & 1 != 0 {
            chunk.push(0);
        }
        chunk
    }

    #[test]
    fn mime_registry_is_closed_and_canonical() {
        assert_eq!(RasterMime::ALL.len(), 5);
        assert_eq!(
            RasterMime::canonicalize_declared("image/jpg"),
            Some(RasterMime::Jpeg)
        );
        assert_eq!(RasterMime::from_canonical("image/jpg"), None);
        assert_eq!(RasterMime::Png.extension(), ".png");
        assert_eq!(RasterMime::Jpeg.as_str(), "image/jpeg");
        assert_eq!(RasterMime::canonicalize_declared("image/svg+xml"), None);
    }

    #[test]
    fn all_five_raster_families_validate_without_changing_encoded_bytes() {
        let _schedule = native::native_test_schedule_lock();
        let fixtures = [
            (png_rgba_with_chunks(1, 1, &[]), RasterMime::Png, (1, 1, 1)),
            (jpeg_fixture(false, 3), RasterMime::Jpeg, (1, 1, 1)),
            (webp_fixture(), RasterMime::Webp, (2, 2, 1)),
            (gif_fixture(1), RasterMime::Gif, (1, 1, 1)),
            (bmp_windows(40, 1, 1, 24), RasterMime::Bmp, (1, 1, 1)),
        ];
        for (bytes, mime, expected) in fixtures {
            let preserved = bytes.clone();
            let info = validate(&bytes, mime).unwrap();
            assert_eq!((info.width, info.height, info.frames), expected);
            assert_eq!(bytes, preserved);
        }
    }

    #[test]
    fn accepted_progressive_and_animated_fixtures_report_frames() {
        let _schedule = native::native_test_schedule_lock();
        assert_eq!(
            validate(&jpeg_fixture(true, 1), RasterMime::Jpeg)
                .unwrap()
                .frames,
            1
        );
        assert_eq!(
            validate(&apng_fixture(), RasterMime::Png).unwrap().frames,
            2
        );
        assert_eq!(
            validate(&gif_fixture(2), RasterMime::Gif).unwrap().frames,
            2
        );
        assert_eq!(
            validate(&animated_webp_fixture(), RasterMime::Webp)
                .unwrap()
                .frames,
            2
        );
    }

    #[test]
    fn exact_termination_and_malformed_payloads_are_invalid_for_every_family() {
        let _schedule = native::native_test_schedule_lock();
        for (mut bytes, mime) in [
            (png_rgba_with_chunks(1, 1, &[]), RasterMime::Png),
            (jpeg_fixture(false, 1), RasterMime::Jpeg),
            (webp_fixture(), RasterMime::Webp),
            (gif_fixture(1), RasterMime::Gif),
            (bmp_windows(40, 1, 1, 24), RasterMime::Bmp),
        ] {
            bytes.push(0);
            if mime == RasterMime::Bmp {
                let length = bytes.len() as u32;
                put_u32_le(&mut bytes, 2, length);
            }
            assert_eq!(error_kind(&bytes, mime), RasterErrorKind::Invalid);
            bytes.truncate(bytes.len() / 2);
            assert_eq!(error_kind(&bytes, mime), RasterErrorKind::Invalid);
        }
    }

    #[test]
    fn jpeg_closed_profile_and_error_precedence_are_stable() {
        let _schedule = native::native_test_schedule_lock();
        let mut qtable_one = jpeg_fixture(false, 1);
        qtable_one[6] = 1;
        let frame = marker_position(&qtable_one, 0xc0);
        qtable_one[frame + 12] = 1;
        assert_eq!(
            error_kind(&qtable_one, RasterMime::Jpeg),
            RasterErrorKind::UnsupportedJpegProfile
        );

        let four_components = jpeg_fixture(false, 4);
        let four_component_error = validate(&four_components, RasterMime::Jpeg).unwrap_err();
        assert_eq!(
            four_component_error.kind,
            RasterErrorKind::UnsupportedJpegProfile
        );
        assert_eq!(four_component_error.validated_dimensions, Some((1, 1)));

        let allocation_denied = native::with_native_allocation_failure_for_test(1, || {
            validate(&four_components, RasterMime::Jpeg).unwrap_err()
        });
        assert_eq!(allocation_denied.kind, RasterErrorKind::ResourceLimit);
        assert_eq!(
            validate(&four_components, RasterMime::Jpeg)
                .unwrap_err()
                .kind,
            RasterErrorKind::UnsupportedJpegProfile
        );

        let mut corrupt_four_components = four_components;
        corrupt_four_components.remove(corrupt_four_components.len() - 3);
        assert_eq!(
            error_kind(&corrupt_four_components, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );

        let mut lossless = jpeg_fixture(false, 1);
        let sof = marker_position(&lossless, 0xc0);
        lossless[sof + 1] = 0xc3;
        let sos = marker_position(&lossless, 0xda);
        lossless[sos + 7..sos + 10].copy_from_slice(&[1, 0, 0]);
        assert_eq!(
            error_kind(&lossless, RasterMime::Jpeg),
            RasterErrorKind::UnsupportedJpegProfile
        );

        let mut malformed_lossless = lossless.clone();
        malformed_lossless.pop();
        assert_eq!(
            error_kind(&malformed_lossless, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );

        let mut oversized = qtable_one.clone();
        let frame = marker_position(&oversized, 0xc0);
        oversized[frame + 7..frame + 9].copy_from_slice(&20_000u16.to_be_bytes());
        assert_eq!(
            error_kind(&oversized, RasterMime::Jpeg),
            RasterErrorKind::ResourceLimit
        );
    }

    #[test]
    fn jpeg_acceptance_and_rejected_profile_matrix_is_explicit() {
        let _schedule = native::native_test_schedule_lock();
        for progressive in [false, true] {
            for components in [1, 3] {
                assert!(validate(&jpeg_fixture(progressive, components), RasterMime::Jpeg).is_ok());
            }
        }
        for sampling in [0x11, 0x21, 0x22] {
            let mut jpeg = jpeg_fixture(false, 3);
            let frame = marker_position(&jpeg, 0xc0);
            jpeg[frame + 11] = sampling;
            let scan = marker_position(&jpeg, 0xda);
            let scan_length = u16::from_be_bytes([jpeg[scan + 2], jpeg[scan + 3]]) as usize;
            let entropy_start = scan + 2 + scan_length;
            let eoi = jpeg.len() - 2;
            let entropy: &[u8] = match sampling {
                0x11 => &[0x03],
                0x21 => &[0x00],
                0x22 => &[0x00, 0x0f],
                _ => &[],
            };
            jpeg.splice(entropy_start..eoi, entropy.iter().copied());
            assert!(validate(&jpeg, RasterMime::Jpeg).is_ok());
        }
        assert!(validate(&jpeg_with_adobe(1), RasterMime::Jpeg).is_ok());

        let mut rejected = Vec::new();
        let mut component_id = jpeg_fixture(false, 3);
        let frame = marker_position(&component_id, 0xc0);
        component_id[frame + 10] = 7;
        let scan = marker_position(&component_id, 0xda);
        component_id[scan + 5] = 7;
        rejected.push(("component identifiers", component_id));
        rejected.push(("two-component layout", jpeg_fixture(false, 2)));

        let mut sampling = jpeg_fixture(false, 3);
        let frame = marker_position(&sampling, 0xc0);
        sampling[frame + 11] = 0x31;
        let scan = marker_position(&sampling, 0xda);
        let scan_length = u16::from_be_bytes([sampling[scan + 2], sampling[scan + 3]]) as usize;
        let entropy_start = scan + 2 + scan_length;
        let eoi = sampling.len() - 2;
        sampling.splice(entropy_start..eoi, [0x00, 0x3f]);
        rejected.push(("sampling layout", sampling));

        let mut precision = jpeg_fixture(false, 1);
        let frame = marker_position(&precision, 0xc0);
        precision[frame + 1] = 0xc1;
        precision[frame + 4] = 12;
        rejected.push(("12-bit precision", precision));

        rejected.push(("Adobe RGB transform", jpeg_with_adobe(0)));
        rejected.push(("four-component CMYK", jpeg_with_adobe_components(4, 0)));
        rejected.push(("four-component YCCK", jpeg_with_adobe_components(4, 2)));

        let mut arithmetic = jpeg_fixture(false, 1);
        let frame = marker_position(&arithmetic, 0xc0);
        arithmetic[frame + 1] = 0xc9;
        let scan = marker_position(&arithmetic, 0xda);
        insert_jpeg_segment(&mut arithmetic, scan, 0xcc, &[0, 0]);
        rejected.push(("arithmetic coding", arithmetic));

        for (case, jpeg) in rejected {
            assert_eq!(
                error_kind(&jpeg, RasterMime::Jpeg),
                RasterErrorKind::UnsupportedJpegProfile,
                "{case}"
            );
        }

        // Adobe transform 2 denotes YCCK and is inconsistent with this
        // three-component frame, so native semantic validation treats it as
        // malformed rather than as a valid four-component profile rejection.
        assert_eq!(
            error_kind(&jpeg_with_adobe(2), RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );

        assert_eq!(
            error_kind(&hierarchical_jpeg_fixture(), RasterMime::Jpeg),
            RasterErrorKind::UnsupportedJpegProfile
        );
        let mut differential_without_hierarchy = jpeg_fixture(false, 1);
        let frame = marker_position(&differential_without_hierarchy, 0xc0);
        differential_without_hierarchy[frame + 1] = 0xc5;
        assert_eq!(
            error_kind(&differential_without_hierarchy, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
        let mut malformed_sampling = jpeg_fixture(false, 1);
        let frame = marker_position(&malformed_sampling, 0xc0);
        malformed_sampling[frame + 11] = 0;
        assert_eq!(
            error_kind(&malformed_sampling, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
        let mut invalid_baseline_precision = jpeg_fixture(false, 1);
        let frame = marker_position(&invalid_baseline_precision, 0xc0);
        invalid_baseline_precision[frame + 4] = 12;
        assert_eq!(
            error_kind(&invalid_baseline_precision, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
        let mut zero_quantizer = jpeg_fixture(false, 1);
        let table = marker_position(&zero_quantizer, 0xdb);
        zero_quantizer[table + 5] = 0;
        assert_eq!(
            error_kind(&zero_quantizer, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
        let mut oversubscribed_huffman = jpeg_fixture(false, 1);
        let table = marker_position(&oversubscribed_huffman, 0xc4);
        oversubscribed_huffman[table + 5] = 3;
        assert_eq!(
            error_kind(&oversubscribed_huffman, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
        let mut malformed_arithmetic = jpeg_fixture(false, 1);
        let frame = marker_position(&malformed_arithmetic, 0xc0);
        malformed_arithmetic[frame + 1] = 0xc9;
        let scan = marker_position(&malformed_arithmetic, 0xda);
        insert_jpeg_segment(&mut malformed_arithmetic, scan, 0xcc, &[0, 0x0f]);
        assert_eq!(
            error_kind(&malformed_arithmetic, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
        let mut refinement_before_initial = jpeg_fixture(true, 1);
        let frame = marker_position(&refinement_before_initial, 0xc2);
        refinement_before_initial[frame + 4] = 12;
        let scan = marker_position(&refinement_before_initial, 0xda);
        refinement_before_initial[scan + 9] = 0x10;
        assert_eq!(
            error_kind(&refinement_before_initial, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
        let mut missing_component_scan = jpeg_fixture(false, 4);
        let scan = marker_position(&missing_component_scan, 0xda);
        let scan_length = u16::from_be_bytes([
            missing_component_scan[scan + 2],
            missing_component_scan[scan + 3],
        ]);
        missing_component_scan[scan + 2..scan + 4]
            .copy_from_slice(&(scan_length - 2).to_be_bytes());
        missing_component_scan[scan + 4] = 3;
        missing_component_scan.drain(scan + 11..scan + 13);
        assert_eq!(
            error_kind(&missing_component_scan, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
        let mut duplicate_adobe = jpeg_with_adobe(1);
        insert_jpeg_segment(
            &mut duplicate_adobe,
            2,
            0xee,
            &[b'A', b'd', b'o', b'b', b'e', 0, 100, 0, 0, 0, 0, 1],
        );
        assert_eq!(
            error_kind(&duplicate_adobe, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
        let mut unknown_marker = jpeg_fixture(false, 1);
        insert_jpeg_segment(&mut unknown_marker, 2, 0xf0, &[]);
        assert_eq!(
            error_kind(&unknown_marker, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );
    }

    #[test]
    fn bmp_profile_is_reported_only_after_a_complete_structural_pass() {
        assert!(validate(&bmp_windows(40, 1, 1, 24), RasterMime::Bmp).is_ok());
        let top_down = validate(&bmp_windows(40, 1, -1, 24), RasterMime::Bmp).unwrap_err();
        assert_eq!(top_down.kind, RasterErrorKind::UnsupportedBmpProfile);
        assert_eq!(top_down.validated_dimensions, Some((1, 1)));
        assert_eq!(
            error_kind(&bmp_windows(40, 1, 1, 32), RasterMime::Bmp),
            RasterErrorKind::UnsupportedBmpProfile
        );
        assert_eq!(
            error_kind(&bmp_windows(52, 1, 1, 24), RasterMime::Bmp),
            RasterErrorKind::UnsupportedBmpProfile
        );
        assert_eq!(
            error_kind(&bmp_os2(), RasterMime::Bmp),
            RasterErrorKind::UnsupportedBmpProfile
        );

        let mut truncated_top_down = bmp_windows(40, 1, -1, 24);
        truncated_top_down.pop();
        let length = truncated_top_down.len() as u32;
        put_u32_le(&mut truncated_top_down, 2, length);
        assert_eq!(
            error_kind(&truncated_top_down, RasterMime::Bmp),
            RasterErrorKind::Invalid
        );

        let mut invalid_planes = bmp_windows(40, 1, 1, 24);
        put_u16_le(&mut invalid_planes, 26, 0);
        assert_eq!(
            error_kind(&invalid_planes, RasterMime::Bmp),
            RasterErrorKind::Invalid
        );

        let oversized = bmp_windows(52, 20_000, 1, 24);
        assert_eq!(
            error_kind(&oversized, RasterMime::Bmp),
            RasterErrorKind::ResourceLimit
        );
    }

    #[test]
    fn bmp_rejected_profile_and_malformed_envelope_matrix_is_explicit() {
        let _schedule = native::native_test_schedule_lock();
        let jpeg_payload = jpeg_fixture(false, 1);
        let png_payload = png_rgba_with_chunks(1, 1, &[]);
        let v5_color_profile = bmp_v5_with_profile(BMP_PROFILE_EMBEDDED, &[1, 2, 3, 4]);
        for bmp in [
            bmp_indexed(),
            bmp_rle8(),
            bmp_bitfields16(),
            bmp_windows(40, 1, 1, 16),
            bmp_windows(124, 1, 1, 24),
            v5_color_profile,
            bmp_embedded(4, &jpeg_payload),
            bmp_embedded(5, &png_payload),
        ] {
            assert_eq!(
                error_kind(&bmp, RasterMime::Bmp),
                RasterErrorKind::UnsupportedBmpProfile
            );
        }

        let mut reserved = bmp_windows(40, 1, 1, 24);
        put_u16_le(&mut reserved, 6, 1);
        let mut overlap = bmp_windows(40, 1, 1, 24);
        put_u32_le(&mut overlap, 10, 53);
        let mut file_size = bmp_windows(40, 1, 1, 24);
        let wrong_file_size = file_size.len() as u32 + 1;
        put_u32_le(&mut file_size, 2, wrong_file_size);
        let mut image_size = bmp_windows(40, 1, 1, 24);
        put_u32_le(&mut image_size, 34, 3);
        for bmp in [reserved, overlap, file_size, image_size] {
            assert_eq!(error_kind(&bmp, RasterMime::Bmp), RasterErrorKind::Invalid);
        }

        let mut ppm = bmp_windows(40, 1, 1, 24);
        put_u32_le(&mut ppm, 38, 2835);
        assert_eq!(
            error_kind(&ppm, RasterMime::Bmp),
            RasterErrorKind::UnsupportedBmpProfile
        );
        let mut omitted_image_size = bmp_windows(40, 1, 1, 24);
        put_u32_le(&mut omitted_image_size, 34, 0);
        assert_eq!(
            error_kind(&omitted_image_size, RasterMime::Bmp),
            RasterErrorKind::UnsupportedBmpProfile
        );

        let mut bad_rle = bmp_rle8();
        *bad_rle.last_mut().unwrap() = 2;
        let mut overlapping_masks = bmp_bitfields16();
        put_u32_le(&mut overlapping_masks, 58, 0x7c00);
        let bad_embedded = bmp_embedded(4, b"nope");
        let incomplete_embedded = bmp_embedded(4, &[0xff, 0xd8, 0xff, 0xd9]);
        for bmp in [
            bad_rle,
            overlapping_masks,
            bad_embedded,
            incomplete_embedded,
        ] {
            assert_eq!(error_kind(&bmp, RasterMime::Bmp), RasterErrorKind::Invalid);
        }
    }

    #[test]
    fn bmp_v5_profiles_follow_pixels_and_are_exactly_bounded() {
        let embedded = bmp_v5_with_profile(BMP_PROFILE_EMBEDDED, &[1, 2, 3, 4]);
        assert_eq!(read_u32_le(&embedded, 10).unwrap(), 138);
        assert_eq!(read_u32_le(&embedded, 126).unwrap(), 128);
        let embedded_error = validate(&embedded, RasterMime::Bmp).unwrap_err();
        assert_eq!(embedded_error.kind, RasterErrorKind::UnsupportedBmpProfile);
        assert_eq!(embedded_error.validated_dimensions, Some((1, 1)));

        let linked = bmp_v5_with_profile(BMP_PROFILE_LINKED, b"profile.icc\0");
        assert_eq!(
            error_kind(&linked, RasterMime::Bmp),
            RasterErrorKind::UnsupportedBmpProfile
        );

        let mut overlap = embedded.clone();
        put_u32_le(&mut overlap, 126, 124);

        let mut truncated = embedded.clone();
        truncated.pop();
        let truncated_len = truncated.len() as u32;
        put_u32_le(&mut truncated, 2, truncated_len);

        let mut invalid_offset = embedded.clone();
        put_u32_le(&mut invalid_offset, 126, 129);

        let mut invalid_size = embedded.clone();
        put_u32_le(&mut invalid_size, 130, 3);

        let mut invalid_type = embedded.clone();
        put_u32_le(&mut invalid_type, 70, 0x7352_4742);

        let mut trailing = embedded;
        trailing.push(0);
        let trailing_len = trailing.len() as u32;
        put_u32_le(&mut trailing, 2, trailing_len);

        let unterminated_link = bmp_v5_with_profile(BMP_PROFILE_LINKED, b"profile.icc");

        for bmp in [
            overlap,
            truncated,
            invalid_offset,
            invalid_size,
            invalid_type,
            trailing,
            unterminated_link,
        ] {
            assert_eq!(error_kind(&bmp, RasterMime::Bmp), RasterErrorKind::Invalid);
        }

        assert!(validate(&bmp_windows(40, 1, 1, 24), RasterMime::Bmp).is_ok());
    }

    #[test]
    fn png_rejects_palette_transparency_reserved_bit_and_standard_chunk_errors() {
        let gray_plte = {
            let mut png = b"\x89PNG\r\n\x1a\n".to_vec();
            let mut ihdr = Vec::new();
            ihdr.extend_from_slice(&1u32.to_be_bytes());
            ihdr.extend_from_slice(&1u32.to_be_bytes());
            ihdr.extend_from_slice(&[8, 0, 0, 0, 0]);
            append_png_chunk(&mut png, b"IHDR", &ihdr);
            append_png_chunk(&mut png, b"PLTE", &[0, 0, 0]);
            append_png_chunk(&mut png, b"IDAT", &zlib_stored(&[0, 0]));
            append_png_chunk(&mut png, b"IEND", &[]);
            png
        };
        assert_eq!(
            error_kind(&gray_plte, RasterMime::Png),
            RasterErrorKind::Invalid
        );
        assert_eq!(
            error_kind(
                &png_rgba_with_chunks(1, 1, &[(b"tRNS", &[0, 0])]),
                RasterMime::Png
            ),
            RasterErrorKind::Invalid
        );
        assert_eq!(
            error_kind(
                &png_rgba_with_chunks(1, 1, &[(b"aaab", &[])]),
                RasterMime::Png
            ),
            RasterErrorKind::Invalid
        );
        assert_eq!(
            error_kind(
                &png_rgba_with_chunks(1, 1, &[(b"gAMA", &[])]),
                RasterMime::Png
            ),
            RasterErrorKind::Invalid
        );
    }

    #[test]
    fn png_allocation_boundaries_are_typed_and_failure_does_not_poison_later_work() {
        let png = png_rgba_with_chunks(1, 1, &[]);
        let measured = validate_png(&png, &RasterBudget::default())
            .unwrap()
            .decoder_peak_bytes;
        assert!(validate_png(&png, &RasterBudget::with_decoder_limit(measured)).is_ok());
        assert_eq!(
            validate_png(&png, &RasterBudget::with_decoder_limit(measured - 1))
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );

        let mut exhausted = RasterBudget::with_decoder_limit(0);
        assert_eq!(
            validate_raster(&png, RasterMime::Png, &mut exhausted)
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );
        assert!(!exhausted.decoder_active);

        let mut budget = RasterBudget::with_decoder_limit(1);
        assert_eq!(
            validate_raster(&png, RasterMime::Png, &mut budget)
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );
        assert!(!budget.decoder_active);
        budget.decoder_limit = MAX_DECODER_WORK_BYTES;
        assert!(validate_raster(&png, RasterMime::Png, &mut budget).is_ok());
        assert_eq!(budget.peak_decoder_bytes(), measured);
    }

    #[test]
    fn animation_and_aggregate_budgets_reject_before_decode() {
        assert_eq!(
            validate(&gif_fixture(256), RasterMime::Gif).unwrap().frames,
            256
        );
        assert_eq!(
            error_kind(&gif_fixture(257), RasterMime::Gif),
            RasterErrorKind::ResourceLimit
        );
        assert_eq!(
            validate(&apng_frames(256), RasterMime::Png).unwrap().frames,
            256
        );
        assert_eq!(
            error_kind(&apng_frames(257), RasterMime::Png),
            RasterErrorKind::ResourceLimit
        );

        let _schedule = native::native_test_schedule_lock();
        assert_eq!(
            validate(&animated_webp_frames(256), RasterMime::Webp)
                .unwrap()
                .frames,
            256
        );
        assert_eq!(
            error_kind(&animated_webp_frames(257), RasterMime::Webp),
            RasterErrorKind::ResourceLimit
        );

        let mut budget = RasterBudget {
            total_pixels: MAX_PIXELS_PER_PACKAGE - 1,
            ..RasterBudget::default()
        };
        assert!(validate_raster(
            &png_rgba_with_chunks(1, 1, &[]),
            RasterMime::Png,
            &mut budget
        )
        .is_ok());
        assert_eq!(
            validate_raster(
                &png_rgba_with_chunks(1, 1, &[]),
                RasterMime::Png,
                &mut budget
            )
            .unwrap_err()
            .kind,
            RasterErrorKind::ResourceLimit
        );

        let mut records = RasterBudget {
            total_structural_records: MAX_STRUCTURAL_RECORDS_PER_PACKAGE,
            ..RasterBudget::default()
        };
        assert_eq!(
            validate_raster(&gif_fixture(1), RasterMime::Gif, &mut records)
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );
    }

    #[test]
    fn numeric_budget_boundaries_are_checked_without_large_allocations() {
        let _schedule = native::native_test_schedule_lock();
        let exact = unsupported_jpeg_dimensions(8_192, 8_192, 3);
        assert_eq!(
            error_kind(&exact, RasterMime::Jpeg),
            RasterErrorKind::UnsupportedJpegProfile
        );
        let over_pixels = unsupported_jpeg_dimensions(8_193, 8_192, 3);
        assert_eq!(
            error_kind(&over_pixels, RasterMime::Jpeg),
            RasterErrorKind::ResourceLimit
        );
        let max_dimension = unsupported_jpeg_dimensions(16_384, 1, 1);
        assert_eq!(
            error_kind(&max_dimension, RasterMime::Jpeg),
            RasterErrorKind::UnsupportedJpegProfile
        );
        let over_dimension = unsupported_jpeg_dimensions(16_385, 1, 1);
        assert_eq!(
            error_kind(&over_dimension, RasterMime::Jpeg),
            RasterErrorKind::ResourceLimit
        );

        let budget = RasterBudget::default();
        assert!(budget
            .ensure_metadata_records(
                MAX_METADATA_BYTES_PER_ASSET,
                MAX_STRUCTURAL_RECORDS_PER_ASSET
            )
            .is_ok());
        assert_eq!(
            budget
                .ensure_metadata_records(MAX_METADATA_BYTES_PER_ASSET + 1, 0)
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );
        assert_eq!(
            budget
                .ensure_metadata_records(0, MAX_STRUCTURAL_RECORDS_PER_ASSET + 1)
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );
        let mut aggregate_limits = RasterBudget {
            total_metadata_bytes: MAX_METADATA_BYTES_PER_PACKAGE - 1,
            total_structural_records: MAX_STRUCTURAL_RECORDS_PER_PACKAGE - 1,
            ..RasterBudget::default()
        };
        assert!(aggregate_limits.ensure_metadata_records(1, 1).is_ok());
        aggregate_limits.total_metadata_bytes = MAX_METADATA_BYTES_PER_PACKAGE;
        assert_eq!(
            aggregate_limits
                .ensure_metadata_records(1, 0)
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );
        aggregate_limits.total_metadata_bytes = 0;
        aggregate_limits.total_structural_records = MAX_STRUCTURAL_RECORDS_PER_PACKAGE;
        assert_eq!(
            aggregate_limits
                .ensure_metadata_records(0, 1)
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );

        let mut aggregate = RasterBudget {
            total_sample_bytes: MAX_SAMPLE_BYTES_PER_PACKAGE - 4,
            ..RasterBudget::default()
        };
        assert!(validate_raster(
            &png_rgba_with_chunks(1, 1, &[]),
            RasterMime::Png,
            &mut aggregate
        )
        .is_ok());
        assert_eq!(
            validate_raster(
                &png_rgba_with_chunks(1, 1, &[]),
                RasterMime::Png,
                &mut aggregate
            )
            .unwrap_err()
            .kind,
            RasterErrorKind::ResourceLimit
        );
    }

    #[test]
    fn zero_maximum_and_one_over_dimensions_have_stable_precedence() {
        let _schedule = native::native_test_schedule_lock();
        assert_eq!(
            error_kind(&png_grayscale_one_bit(0, 1), RasterMime::Png),
            RasterErrorKind::Dimensions
        );
        let mut zero_jpeg = jpeg_fixture(false, 1);
        let frame = marker_position(&zero_jpeg, 0xc0);
        zero_jpeg[frame + 7..frame + 9].copy_from_slice(&0u16.to_be_bytes());
        assert_eq!(
            error_kind(&zero_jpeg, RasterMime::Jpeg),
            RasterErrorKind::Dimensions
        );
        assert_eq!(
            error_kind(&zero_width_webp(), RasterMime::Webp),
            RasterErrorKind::Dimensions
        );

        let mut zero_gif = gif_fixture(1);
        zero_gif[6..8].copy_from_slice(&0u16.to_le_bytes());
        assert_eq!(
            error_kind(&zero_gif, RasterMime::Gif),
            RasterErrorKind::Dimensions
        );
        assert_eq!(
            error_kind(&bmp_windows(40, 0, 1, 24), RasterMime::Bmp),
            RasterErrorKind::Dimensions
        );

        assert!(validate(&png_grayscale_one_bit(16_384, 1), RasterMime::Png).is_ok());
        assert!(validate(&gif_with_canvas_width(16_384), RasterMime::Gif).is_ok());
        assert!(validate(&bmp_windows(40, 16_384, 1, 24), RasterMime::Bmp).is_ok());
        assert_eq!(
            error_kind(&png_grayscale_one_bit(16_385, 1), RasterMime::Png),
            RasterErrorKind::ResourceLimit
        );
        assert_eq!(
            error_kind(&gif_with_canvas_width(16_385), RasterMime::Gif),
            RasterErrorKind::ResourceLimit
        );
        assert_eq!(
            error_kind(&bmp_windows(40, 16_385, 1, 24), RasterMime::Bmp),
            RasterErrorKind::ResourceLimit
        );
    }

    #[test]
    fn signatures_mime_mismatches_and_active_content_are_rejected() {
        let png = png_rgba_with_chunks(1, 1, &[]);
        for mime in [
            RasterMime::Jpeg,
            RasterMime::Webp,
            RasterMime::Gif,
            RasterMime::Bmp,
        ] {
            assert_eq!(error_kind(&png, mime), RasterErrorKind::Invalid);
        }
        for active in [
            b"<html><script>alert(1)</script></html>".as_slice(),
            b"<?xml version='1.0'?><root/>".as_slice(),
            b"<svg xmlns='http://www.w3.org/2000/svg'/>".as_slice(),
        ] {
            for mime in RasterMime::ALL {
                assert_eq!(error_kind(active, mime), RasterErrorKind::Invalid);
            }
        }
        let mut polyglot = png;
        polyglot.extend_from_slice(b"<script/>");
        assert_eq!(
            error_kind(&polyglot, RasterMime::Png),
            RasterErrorKind::Invalid
        );
    }

    #[test]
    fn webp_and_gif_decoder_failures_are_invalid_and_recover() {
        let _schedule = native::native_test_schedule_lock();
        let mut webp = webp_fixture();
        let corrupt = webp.len() - 3;
        webp[corrupt] ^= 0x7f;
        assert_eq!(
            error_kind(&webp, RasterMime::Webp),
            RasterErrorKind::Invalid
        );
        assert!(validate(&webp_fixture(), RasterMime::Webp).is_ok());

        let mut flag_mismatch = animated_webp_fixture();
        flag_mismatch[20] = 0;
        assert_eq!(
            error_kind(&flag_mismatch, RasterMime::Webp),
            RasterErrorKind::Invalid
        );
        let mut frame_mismatch = animated_webp_fixture();
        frame_mismatch[58..61].copy_from_slice(&[0, 0, 0]);
        assert_eq!(
            error_kind(&frame_mismatch, RasterMime::Webp),
            RasterErrorKind::Dimensions
        );

        let mut gif = gif_fixture(1);
        let data = gif.iter().position(|byte| *byte == 0x44).unwrap();
        gif[data] = 0xff;
        assert_eq!(error_kind(&gif, RasterMime::Gif), RasterErrorKind::Invalid);
        assert!(validate(&gif_fixture(1), RasterMime::Gif).is_ok());
        let mut bad_control = gif_fixture(1);
        let image = bad_control.iter().position(|byte| *byte == 0x2c).unwrap();
        bad_control.splice(image..image, [0x21, 0xf9, 4, 0xe0, 0, 0, 0, 0]);
        assert_eq!(
            error_kind(&bad_control, RasterMime::Gif),
            RasterErrorKind::Invalid
        );
    }

    #[test]
    fn unknown_webp_chunks_are_skipped_but_remain_bounded_metadata() {
        let _schedule = native::native_test_schedule_lock();
        let base_records = validate(&animated_webp_fixture(), RasterMime::Webp)
            .unwrap()
            .structural_records;
        let webp = animated_webp_with_unknown_chunk(b"abc");
        let info = validate(&webp, RasterMime::Webp).unwrap();
        assert_eq!(info.frames, 2);
        assert_eq!(info.metadata_bytes, 3);
        assert_eq!(info.structural_records, base_records + 1);

        let frame_webp = animated_webp_with_unknown_frame_chunk(b"abc");
        let frame_info = validate(&frame_webp, RasterMime::Webp).unwrap();
        assert_eq!(frame_info.frames, 2);
        assert_eq!(frame_info.metadata_bytes, 3);
        assert_eq!(frame_info.structural_records, base_records + 1);

        let mut limited = RasterBudget::with_aggregate_limits_for_test(
            MAX_PIXELS_PER_PACKAGE,
            MAX_SAMPLE_BYTES_PER_PACKAGE,
            2,
            MAX_STRUCTURAL_RECORDS_PER_PACKAGE,
        );
        assert_eq!(
            validate_raster(&webp, RasterMime::Webp, &mut limited)
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );
        let mut frame_limited = RasterBudget::with_aggregate_limits_for_test(
            MAX_PIXELS_PER_PACKAGE,
            MAX_SAMPLE_BYTES_PER_PACKAGE,
            2,
            MAX_STRUCTURAL_RECORDS_PER_PACKAGE,
        );
        assert_eq!(
            validate_raster(&frame_webp, RasterMime::Webp, &mut frame_limited)
                .unwrap_err()
                .kind,
            RasterErrorKind::ResourceLimit
        );

        let mut bad_padding = animated_webp_with_unknown_chunk(b"abc");
        let padding = bad_padding.len() - 1;
        bad_padding[padding] = 1;
        assert_eq!(
            error_kind(&bad_padding, RasterMime::Webp),
            RasterErrorKind::Invalid
        );
    }

    #[test]
    fn unknown_webp_chunks_cannot_precede_images_or_split_animation_frames() {
        for webp in [
            webp_with_unknown_before_image(b"abc"),
            animated_webp_with_unknown_between_frames(b"abc"),
            animated_webp_with_unknown_before_frame_image(b"abc"),
        ] {
            assert_eq!(
                error_kind(&webp, RasterMime::Webp),
                RasterErrorKind::Invalid
            );
        }
    }

    #[test]
    fn webp_exif_and_xmp_metadata_orders_are_both_valid() {
        let _schedule = native::native_test_schedule_lock();
        for exif_first in [true, false] {
            let webp = webp_with_exif_and_xmp(exif_first);
            let info = validate(&webp, RasterMime::Webp).unwrap();
            assert_eq!((info.width, info.height, info.frames), (2, 2, 1));
            assert_eq!(info.metadata_bytes, 2);
        }
    }

    #[test]
    fn gif_plain_text_and_png_standard_ancillary_fields_are_validated() {
        let mut gif = gif_fixture(1);
        let insertion = gif.len() - 1;
        let mut plain_text = vec![0x21, 0x01, 12];
        plain_text.extend_from_slice(&[0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1]);
        plain_text.push(0);
        gif.splice(insertion..insertion, plain_text);
        assert_eq!(error_kind(&gif, RasterMime::Gif), RasterErrorKind::Invalid);

        let valid_gamma = png_rgba_with_chunks(1, 1, &[(b"gAMA", &[0, 0, 177, 143])]);
        assert!(validate(&valid_gamma, RasterMime::Png).is_ok());
        let bad_physical = png_rgba_with_chunks(1, 1, &[(b"pHYs", &[0; 8])]);
        assert_eq!(
            error_kind(&bad_physical, RasterMime::Png),
            RasterErrorKind::Invalid
        );
        let bad_time = png_rgba_with_chunks(1, 1, &[(b"tIME", &[0, 1, 13, 1, 0, 0, 0])]);
        assert_eq!(
            error_kind(&bad_time, RasterMime::Png),
            RasterErrorKind::Invalid
        );
    }

    #[test]
    fn compressed_png_metadata_is_bounded_and_must_terminate_exactly() {
        let mut metadata = b"keyword\0\0".to_vec();
        metadata.extend_from_slice(&zlib_stored(b"metadata"));
        let png = png_rgba_with_chunks(1, 1, &[(b"zTXt", &metadata)]);
        assert!(validate(&png, RasterMime::Png).is_ok());

        metadata.push(0);
        let trailing = png_rgba_with_chunks(1, 1, &[(b"zTXt", &metadata)]);
        assert_eq!(
            error_kind(&trailing, RasterMime::Png),
            RasterErrorKind::Invalid
        );
    }

    #[test]
    fn malformed_zero_dimension_inputs_do_not_beat_invalid_structure() {
        let mut png = png_rgba_with_chunks(0, 1, &[]);
        png.push(0);
        assert_eq!(error_kind(&png, RasterMime::Png), RasterErrorKind::Invalid);

        let mut jpeg = jpeg_fixture(false, 1);
        let frame = marker_position(&jpeg, 0xc0);
        jpeg[frame + 7..frame + 9].copy_from_slice(&0u16.to_be_bytes());
        jpeg.push(0);
        assert_eq!(
            error_kind(&jpeg, RasterMime::Jpeg),
            RasterErrorKind::Invalid
        );

        let mut bmp = bmp_windows(40, 0, 1, 24);
        bmp.push(0);
        let length = bmp.len() as u32;
        put_u32_le(&mut bmp, 2, length);
        assert_eq!(error_kind(&bmp, RasterMime::Bmp), RasterErrorKind::Invalid);

        let mut gif = gif_with_canvas_width(0);
        gif.push(0);
        assert_eq!(error_kind(&gif, RasterMime::Gif), RasterErrorKind::Invalid);

        let mut webp = zero_width_webp();
        webp.push(0);
        assert_eq!(
            error_kind(&webp, RasterMime::Webp),
            RasterErrorKind::Invalid
        );
    }

    #[test]
    fn hostile_short_inputs_never_panic_and_later_validation_recovers() {
        for mime in RasterMime::ALL {
            for length in 0..32 {
                let input = vec![0xff; length];
                assert!(std::panic::catch_unwind(|| validate(&input, mime)).is_ok());
            }
        }
        assert!(validate(&gif_fixture(1), RasterMime::Gif).is_ok());
    }
}
