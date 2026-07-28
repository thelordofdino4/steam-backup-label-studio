#include "sbls_codec_shim.h"

#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include "src/webp/decode.h"

#include "sbls_allocation_ledger.h"

#define SBLS_IMAGE_MAX_DIMENSION 16384u
#define SBLS_IMAGE_MAX_PIXELS UINT64_C(67108864)
#define SBLS_IMAGE_MAX_FRAMES 256u
#define SBLS_IMAGE_MAX_STRUCTURAL_RECORDS 16384u

typedef struct SblsWebPLayout {
  uint32_t canvas_width;
  uint32_t canvas_height;
  uint32_t frame_count;
  int animated;
} SblsWebPLayout;

static uint32_t sbls_read_u24_le(const uint8_t* bytes) {
  return (uint32_t)bytes[0] | ((uint32_t)bytes[1] << 8) |
         ((uint32_t)bytes[2] << 16);
}

static uint32_t sbls_read_u32_le(const uint8_t* bytes) {
  return (uint32_t)bytes[0] | ((uint32_t)bytes[1] << 8) |
         ((uint32_t)bytes[2] << 16) | ((uint32_t)bytes[3] << 24);
}

static int sbls_tag_is(const uint8_t* bytes, const char tag[4]) {
  return memcmp(bytes, tag, 4) == 0;
}

static SblsNativeCodecStatus sbls_check_dimensions(uint32_t width,
                                                   uint32_t height) {
  if (width == 0 || height == 0 || width > SBLS_IMAGE_MAX_DIMENSION ||
      height > SBLS_IMAGE_MAX_DIMENSION ||
      (uint64_t)width * height > SBLS_IMAGE_MAX_PIXELS) {
    return SBLS_NATIVE_DIMENSIONS_INVALID;
  }
  return SBLS_NATIVE_OK;
}

static SblsNativeCodecStatus sbls_scan_chunk_sequence(
    const uint8_t* bytes, size_t start, size_t end, uint32_t* record_count,
    int* saw_image_chunk) {
  size_t offset = start;
  while (offset < end) {
    uint32_t payload_size;
    uint64_t disk_size;
    if (end - offset < 8) return SBLS_NATIVE_INVALID;
    payload_size = sbls_read_u32_le(bytes + offset + 4);
    disk_size = UINT64_C(8) + payload_size + (payload_size & 1u);
    if (disk_size > (uint64_t)(end - offset)) return SBLS_NATIVE_INVALID;
    if (++*record_count > SBLS_IMAGE_MAX_STRUCTURAL_RECORDS) {
      return SBLS_NATIVE_RESOURCE_LIMIT;
    }
    if (sbls_tag_is(bytes + offset, "VP8 ") ||
        sbls_tag_is(bytes + offset, "VP8L")) {
      *saw_image_chunk = 1;
    }
    offset += (size_t)disk_size;
  }
  return offset == end ? SBLS_NATIVE_OK : SBLS_NATIVE_INVALID;
}

static SblsNativeCodecStatus sbls_scan_webp(
    const uint8_t* bytes, size_t length, SblsWebPLayout* layout) {
  uint32_t records = 0;
  int saw_image = 0;
  if (bytes == NULL || layout == NULL || length < 8) {
    return SBLS_NATIVE_INVALID;
  }
  memset(layout, 0, sizeof(*layout));

  if (length >= 12 && sbls_tag_is(bytes, "RIFF")) {
    size_t offset = 12;
    uint64_t declared_size = (uint64_t)sbls_read_u32_le(bytes + 4) + 8;
    int saw_vp8x = 0;
    int saw_anim = 0;
    if (!sbls_tag_is(bytes + 8, "WEBP") || declared_size != length) {
      return SBLS_NATIVE_INVALID;
    }
    while (offset < length) {
      uint32_t payload_size;
      uint64_t disk_size;
      size_t payload_offset;
      if (length - offset < 8) return SBLS_NATIVE_INVALID;
      payload_size = sbls_read_u32_le(bytes + offset + 4);
      disk_size = UINT64_C(8) + payload_size + (payload_size & 1u);
      if (disk_size > (uint64_t)(length - offset)) {
        return SBLS_NATIVE_INVALID;
      }
      if (++records > SBLS_IMAGE_MAX_STRUCTURAL_RECORDS) {
        return SBLS_NATIVE_RESOURCE_LIMIT;
      }
      payload_offset = offset + 8;
      if (sbls_tag_is(bytes + offset, "VP8X")) {
        if (saw_vp8x || payload_size != 10) return SBLS_NATIVE_INVALID;
        saw_vp8x = 1;
        layout->animated = (bytes[payload_offset] & 0x02u) != 0;
        layout->canvas_width =
            sbls_read_u24_le(bytes + payload_offset + 4) + 1;
        layout->canvas_height =
            sbls_read_u24_le(bytes + payload_offset + 7) + 1;
      } else if (sbls_tag_is(bytes + offset, "ANIM")) {
        if (saw_anim || payload_size != 6) return SBLS_NATIVE_INVALID;
        saw_anim = 1;
      } else if (sbls_tag_is(bytes + offset, "ANMF")) {
        uint32_t frame_width;
        uint32_t frame_height;
        uint32_t frame_x;
        uint32_t frame_y;
        int frame_saw_image = 0;
        SblsNativeCodecStatus status;
        if (!layout->animated || payload_size < 24) {
          return SBLS_NATIVE_INVALID;
        }
        frame_x = 2u * sbls_read_u24_le(bytes + payload_offset);
        frame_y = 2u * sbls_read_u24_le(bytes + payload_offset + 3);
        frame_width = sbls_read_u24_le(bytes + payload_offset + 6) + 1;
        frame_height = sbls_read_u24_le(bytes + payload_offset + 9) + 1;
        status = sbls_check_dimensions(frame_width, frame_height);
        if (status != SBLS_NATIVE_OK) return status;
        if (frame_x > layout->canvas_width ||
            frame_y > layout->canvas_height ||
            frame_width > layout->canvas_width - frame_x ||
            frame_height > layout->canvas_height - frame_y) {
          return SBLS_NATIVE_INVALID;
        }
        status = sbls_scan_chunk_sequence(bytes, payload_offset + 16,
                                          payload_offset + payload_size,
                                          &records, &frame_saw_image);
        if (status != SBLS_NATIVE_OK || !frame_saw_image) {
          return status == SBLS_NATIVE_OK ? SBLS_NATIVE_INVALID : status;
        }
        if (++layout->frame_count > SBLS_IMAGE_MAX_FRAMES) {
          return SBLS_NATIVE_RESOURCE_LIMIT;
        }
      } else if (sbls_tag_is(bytes + offset, "VP8 ") ||
                 sbls_tag_is(bytes + offset, "VP8L")) {
        saw_image = 1;
      }
      offset += (size_t)disk_size;
    }
    if (offset != length) return SBLS_NATIVE_INVALID;
    if (layout->animated) {
      if (!saw_vp8x || !saw_anim || layout->frame_count == 0 || saw_image) {
        return SBLS_NATIVE_INVALID;
      }
      return sbls_check_dimensions(layout->canvas_width,
                                   layout->canvas_height);
    }
    if (!saw_image) return SBLS_NATIVE_INVALID;
    layout->frame_count = 1;
    return SBLS_NATIVE_OK;
  }

  {
    SblsNativeCodecStatus status = sbls_scan_chunk_sequence(
        bytes, 0, length, &records, &saw_image);
    if (status != SBLS_NATIVE_OK || !saw_image) {
      return status == SBLS_NATIVE_OK ? SBLS_NATIVE_INVALID : status;
    }
    layout->frame_count = 1;
    return SBLS_NATIVE_OK;
  }
}

static SblsNativeCodecStatus sbls_decode_webp_image(
    const uint8_t* bytes, size_t length, uint32_t expected_width,
    uint32_t expected_height, SblsRasterInfo* raster) {
  WebPDecoderConfig config;
  VP8StatusCode decode_status;
  uint64_t output_bytes;
  uint8_t* output = NULL;

  if (!WebPInitDecoderConfig(&config)) return SBLS_NATIVE_INTERNAL;
  decode_status = WebPGetFeatures(bytes, length, &config.input);
  if (decode_status == VP8_STATUS_OUT_OF_MEMORY) {
    return SBLS_NATIVE_RESOURCE_LIMIT;
  }
  if (decode_status != VP8_STATUS_OK || config.input.has_animation) {
    return SBLS_NATIVE_INVALID;
  }
  if ((uint32_t)config.input.width != expected_width ||
      (uint32_t)config.input.height != expected_height) {
    return SBLS_NATIVE_INVALID;
  }
  if (sbls_check_dimensions(expected_width, expected_height) !=
      SBLS_NATIVE_OK) {
    return SBLS_NATIVE_DIMENSIONS_INVALID;
  }
  output_bytes = (uint64_t)expected_width * expected_height * 4u;
  if (output_bytes == 0 || output_bytes > (uint64_t)SIZE_MAX) {
    return SBLS_NATIVE_RESOURCE_LIMIT;
  }
  output = (uint8_t*)sbls_operation_alloc((size_t)output_bytes);
  if (output == NULL) return SBLS_NATIVE_RESOURCE_LIMIT;

  config.output.colorspace = MODE_RGBA;
  config.output.is_external_memory = 1;
  config.output.u.RGBA.rgba = output;
  config.output.u.RGBA.stride = (int)(expected_width * 4u);
  config.output.u.RGBA.size = (size_t)output_bytes;
  config.options.use_threads = 0;
  config.options.no_fancy_upsampling = 1;

  decode_status = WebPDecode(bytes, length, &config);
  WebPFreeDecBuffer(&config.output);
  sbls_operation_free(output);
  if (decode_status == VP8_STATUS_OUT_OF_MEMORY ||
      sbls_operation_allocation_was_denied()) {
    return SBLS_NATIVE_RESOURCE_LIMIT;
  }
  if (decode_status != VP8_STATUS_OK) return SBLS_NATIVE_INVALID;
  if (raster != NULL) {
    raster->width = expected_width;
    raster->height = expected_height;
    raster->component_count = 4;
    raster->bit_depth = 8;
  }
  return SBLS_NATIVE_OK;
}

static SblsNativeCodecStatus sbls_decode_webp_container(
    const uint8_t* bytes, size_t length, const SblsWebPLayout* layout,
    SblsRasterInfo* raster) {
  if (!layout->animated) {
    WebPBitstreamFeatures features;
    VP8StatusCode feature_status = WebPGetFeatures(bytes, length, &features);
    if (feature_status == VP8_STATUS_OUT_OF_MEMORY) {
      return SBLS_NATIVE_RESOURCE_LIMIT;
    }
    if (feature_status != VP8_STATUS_OK) return SBLS_NATIVE_INVALID;
    return sbls_decode_webp_image(bytes, length, (uint32_t)features.width,
                                  (uint32_t)features.height, raster);
  }

  {
    size_t offset = 12;
    uint32_t decoded_frames = 0;
    while (offset < length) {
      uint32_t payload_size = sbls_read_u32_le(bytes + offset + 4);
      size_t payload_offset = offset + 8;
      size_t disk_size = 8u + (size_t)payload_size + (payload_size & 1u);
      if (sbls_tag_is(bytes + offset, "ANMF")) {
        uint32_t frame_width =
            sbls_read_u24_le(bytes + payload_offset + 6) + 1;
        uint32_t frame_height =
            sbls_read_u24_le(bytes + payload_offset + 9) + 1;
        SblsNativeCodecStatus status = sbls_decode_webp_image(
            bytes + payload_offset + 16, payload_size - 16, frame_width,
            frame_height, NULL);
        if (status != SBLS_NATIVE_OK) return status;
        ++decoded_frames;
      }
      offset += disk_size;
    }
    if (decoded_frames != layout->frame_count) return SBLS_NATIVE_INVALID;
  }
  raster->width = layout->canvas_width;
  raster->height = layout->canvas_height;
  raster->component_count = 4;
  raster->bit_depth = 8;
  return SBLS_NATIVE_OK;
}

SblsNativeCodecStatus sbls_webp_validate_frame_v1(
    SblsCodecOperation* operation, const uint8_t* encoded_bytes,
    uint64_t encoded_length, uint32_t expected_width,
    uint32_t expected_height, SblsRasterInfo* result) {
  SblsNativeCodecStatus status;
  if (operation == NULL || encoded_bytes == NULL || result == NULL ||
      encoded_length == 0 || encoded_length > (uint64_t)SIZE_MAX) {
    return SBLS_NATIVE_INVALID;
  }
  memset(result, 0, sizeof(*result));
  status = sbls_operation_begin(operation);
  if (status != SBLS_NATIVE_OK) return status;
  status = sbls_decode_webp_image(encoded_bytes, (size_t)encoded_length,
                                  expected_width, expected_height, result);
  result->peak_total_bytes = operation->peak_total_bytes;
  status = sbls_operation_finish(operation, status);
  result->peak_total_bytes = operation->peak_total_bytes;
  return status;
}

static void sbls_copy_webp_result(const SblsCodecOperation* operation,
                                  const SblsRasterInfo* raster,
                                  uint32_t frames,
                                  SblsNativeCodecStatus status,
                                  sbls_codec_result* result) {
  memset(result, 0, sizeof(*result));
  result->status = (uint32_t)status;
  if (raster != NULL) {
    result->width = raster->width;
    result->height = raster->height;
    result->frames = status == SBLS_NATIVE_OK ? frames : 0;
  }
  if (operation != NULL) {
    result->peak_allocation_bytes = operation->peak_total_bytes;
    result->live_allocation_bytes = operation->current_native_bytes;
    result->allocation_attempts = operation->allocation_attempts;
    result->successful_allocations = operation->successful_allocations;
    result->successful_frees = operation->successful_frees;
  }
}

uint32_t sbls_webp_validate_with_options(
    const uint8_t* encoded_bytes, size_t encoded_length,
    const sbls_codec_options* options, sbls_codec_result* result) {
  SblsCodecOperation operation;
  SblsRasterInfo raster;
  SblsWebPLayout layout;
  SblsNativeCodecStatus status;
  if (options == NULL || result == NULL) return (uint32_t)SBLS_NATIVE_INTERNAL;
  memset(&raster, 0, sizeof(raster));
  status = sbls_scan_webp(encoded_bytes, encoded_length, &layout);
  if (status != SBLS_NATIVE_OK) {
    sbls_copy_webp_result(NULL, NULL, 0, status, result);
    return (uint32_t)status;
  }
  sbls_codec_operation_init(&operation, options->allocation_limit,
                            options->external_live_bytes);
  sbls_codec_operation_set_fail_allocation_at(&operation,
                                               options->fail_allocation_at);
  status = sbls_operation_begin(&operation);
  if (status == SBLS_NATIVE_OK) {
    status = sbls_decode_webp_container(encoded_bytes, encoded_length, &layout,
                                         &raster);
    status = sbls_operation_finish(&operation, status);
  }
  sbls_copy_webp_result(&operation, &raster, layout.frame_count, status,
                        result);
  return (uint32_t)status;
}

uint32_t sbls_webp_validate(const uint8_t* encoded_bytes,
                            size_t encoded_length,
                            uint64_t allocation_limit,
                            sbls_codec_result* result) {
  const sbls_codec_options options = { allocation_limit, 0, 0 };
  return sbls_webp_validate_with_options(encoded_bytes, encoded_length,
                                         &options, result);
}
