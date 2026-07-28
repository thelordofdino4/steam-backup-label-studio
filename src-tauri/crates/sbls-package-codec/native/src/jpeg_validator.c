#include "sbls_codec_shim.h"

#include <setjmp.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "jpeglib.h"
#include "jerror.h"

#include "sbls_allocation_ledger.h"

#define SBLS_IMAGE_MAX_DIMENSION 16384u
#define SBLS_IMAGE_MAX_PIXELS UINT64_C(67108864)
#define SBLS_IMAGE_MAX_STRUCTURAL_RECORDS 16384u

typedef struct SblsJpegProfile {
  uint32_t width;
  uint32_t height;
  uint8_t components;
  uint8_t precision;
  uint8_t frame_marker;
  uint8_t component_id[3];
  uint8_t sampling[3];
  uint8_t quant_table[3];
  uint8_t profile_supported;
} SblsJpegProfile;

/* MSVC warns about the intentional alignment padding required by jmp_buf. */
#ifdef _MSC_VER
#pragma warning(push)
#pragma warning(disable : 4324)
#endif
typedef struct SblsJpegError {
  struct jpeg_error_mgr public_error;
  jmp_buf jump_buffer;
  int message_code;
} SblsJpegError;
#ifdef _MSC_VER
#pragma warning(pop)
#endif

typedef struct SblsJpegMemorySource {
  struct jpeg_source_mgr public_source;
} SblsJpegMemorySource;

typedef struct SblsJpegDecodeContext {
  struct jpeg_decompress_struct decompressor;
  SblsJpegError error;
  SblsNativeCodecStatus status;
} SblsJpegDecodeContext;

static uint16_t sbls_read_u16_be(const uint8_t* bytes) {
  return (uint16_t)(((uint16_t)bytes[0] << 8) | bytes[1]);
}

static int sbls_is_sof_marker(uint8_t marker) {
  return marker >= 0xc0 && marker <= 0xcf && marker != 0xc4 &&
         marker != 0xc8 && marker != 0xcc;
}

static int sbls_marker_has_no_length(uint8_t marker) {
  return marker == 0xd8 || marker == 0xd9 || marker == 0x01 ||
         (marker >= 0xd0 && marker <= 0xd7);
}

static SblsNativeCodecStatus sbls_scan_jpeg(
    const uint8_t* bytes, size_t length, SblsJpegProfile* profile) {
  size_t offset = 2;
  uint32_t records = 1;
  int in_entropy = 0;
  int saw_frame = 0;
  int saw_scan = 0;
  int unsupported_profile = 0;

  if (bytes == NULL || profile == NULL || length < 4 || bytes[0] != 0xff ||
      bytes[1] != 0xd8) {
    return SBLS_NATIVE_INVALID;
  }
  memset(profile, 0, sizeof(*profile));

  while (offset < length) {
    uint8_t marker;
    size_t segment_start;
    uint16_t segment_length;

    if (!in_entropy) {
      if (bytes[offset] != 0xff) return SBLS_NATIVE_INVALID;
    } else {
      while (offset < length && bytes[offset] != 0xff) ++offset;
      if (offset == length) return SBLS_NATIVE_INVALID;
    }

    while (offset < length && bytes[offset] == 0xff) ++offset;
    if (offset == length) return SBLS_NATIVE_INVALID;
    marker = bytes[offset++];

    if (in_entropy && marker == 0x00) continue;
    if (in_entropy && marker >= 0xd0 && marker <= 0xd7) {
      if (++records > SBLS_IMAGE_MAX_STRUCTURAL_RECORDS) {
        return SBLS_NATIVE_RESOURCE_LIMIT;
      }
      continue;
    }
    in_entropy = 0;

    if (++records > SBLS_IMAGE_MAX_STRUCTURAL_RECORDS) {
      return SBLS_NATIVE_RESOURCE_LIMIT;
    }
    if (marker == 0xd9) {
      if (!saw_frame || !saw_scan || offset != length) {
        return SBLS_NATIVE_INVALID;
      }
      if (profile->width == 0 || profile->height == 0 ||
          profile->width > SBLS_IMAGE_MAX_DIMENSION ||
          profile->height > SBLS_IMAGE_MAX_DIMENSION ||
          (uint64_t)profile->width * profile->height >
              SBLS_IMAGE_MAX_PIXELS) {
        return SBLS_NATIVE_DIMENSIONS_INVALID;
      }
      profile->profile_supported = unsupported_profile == 0;
      /*
       * Rust has already completed the full marker/scan graph validation.
       * Let the pinned decoder consume native-decodable 8-bit Huffman DCT
       * streams even when their component or sampling layout is outside the
       * package profile, so corrupted entropy remains INVALID rather than
       * being hidden by PROFILE_UNSUPPORTED.
       */
      if (profile->precision == 8 &&
          (profile->frame_marker == 0xc0 ||
           profile->frame_marker == 0xc1 ||
           profile->frame_marker == 0xc2) &&
          profile->components >= 1 &&
          profile->components <= MAX_COMPONENTS) {
        return SBLS_NATIVE_OK;
      }
      return SBLS_NATIVE_PROFILE_UNSUPPORTED;
    }
    if (marker == 0xd8 || marker == 0x00 ||
        sbls_marker_has_no_length(marker)) {
      return SBLS_NATIVE_INVALID;
    }
    if (offset > length - 2) return SBLS_NATIVE_INVALID;
    segment_length = sbls_read_u16_be(bytes + offset);
    if (segment_length < 2 || (size_t)segment_length > length - offset) {
      return SBLS_NATIVE_INVALID;
    }
    segment_start = offset + 2;

    if (sbls_is_sof_marker(marker)) {
      uint8_t components;
      size_t expected_length;
      size_t component_offset;
      size_t component_index;
      uint8_t component_ids[256] = { 0 };
      if (saw_frame || segment_length < 8) return SBLS_NATIVE_INVALID;
      components = bytes[segment_start + 5];
      expected_length = 8u + 3u * (size_t)components;
      if ((size_t)segment_length != expected_length) {
        return SBLS_NATIVE_INVALID;
      }
      saw_frame = 1;
      profile->frame_marker = marker;
      profile->precision = bytes[segment_start];
      profile->height = sbls_read_u16_be(bytes + segment_start + 1);
      profile->width = sbls_read_u16_be(bytes + segment_start + 3);
      profile->components = components;
      component_offset = segment_start + 6;
      if (components == 0 || profile->precision == 0) {
        return SBLS_NATIVE_INVALID;
      }
      for (component_index = 0; component_index < components;
           ++component_index) {
        uint8_t component_id = bytes[component_offset + component_index * 3];
        uint8_t sampling = bytes[component_offset + component_index * 3 + 1];
        uint8_t table = bytes[component_offset + component_index * 3 + 2];
        uint8_t horizontal = sampling >> 4;
        uint8_t vertical = sampling & 0x0f;
        if (component_ids[component_id] || horizontal == 0 || vertical == 0 ||
            horizontal > 4 || vertical > 4 || table > 3) {
          return SBLS_NATIVE_INVALID;
        }
        component_ids[component_id] = 1;
        if (component_index < 3) {
          profile->component_id[component_index] = component_id;
          profile->sampling[component_index] = sampling;
          profile->quant_table[component_index] = table;
        }
      }

      if (marker != 0xc0 && marker != 0xc2) unsupported_profile = 1;
      if (profile->precision != 8 ||
          (components != 1 && components != 3)) {
        unsupported_profile = 1;
      } else if (components == 1) {
        if (profile->component_id[0] != 1 ||
            profile->sampling[0] != 0x11 ||
            profile->quant_table[0] != 0) {
          unsupported_profile = 1;
        }
      } else if (profile->component_id[0] != 1 ||
                 profile->component_id[1] != 2 ||
                 profile->component_id[2] != 3 ||
                 (profile->sampling[0] != 0x11 &&
                  profile->sampling[0] != 0x21 &&
                  profile->sampling[0] != 0x22) ||
                 profile->sampling[1] != 0x11 ||
                 profile->sampling[2] != 0x11) {
        unsupported_profile = 1;
      }
    } else if (marker == 0xda) {
      if (!saw_frame || segment_length < 6) return SBLS_NATIVE_INVALID;
      saw_scan = 1;
      in_entropy = 1;
    }

    offset += segment_length;
  }
  return SBLS_NATIVE_INVALID;
}

static void sbls_jpeg_error_exit(j_common_ptr common) {
  SblsJpegError* error = (SblsJpegError*)common->err;
  error->message_code = common->err->msg_code;
  longjmp(error->jump_buffer, 1);
}

static void sbls_jpeg_emit_message(j_common_ptr common, int message_level) {
  if (message_level < 0) sbls_jpeg_error_exit(common);
}

static void sbls_jpeg_output_message(j_common_ptr common) {
  (void)common;
}

static void sbls_jpeg_format_message(j_common_ptr common, char* buffer) {
  (void)common;
  if (buffer != NULL) buffer[0] = '\0';
}

static void sbls_jpeg_reset_error(j_common_ptr common) {
  common->err->num_warnings = 0;
  common->err->msg_code = 0;
}

static void sbls_jpeg_initialize_error(SblsJpegError* error) {
  memset(error, 0, sizeof(*error));
  error->public_error.error_exit = sbls_jpeg_error_exit;
  error->public_error.emit_message = sbls_jpeg_emit_message;
  error->public_error.output_message = sbls_jpeg_output_message;
  error->public_error.format_message = sbls_jpeg_format_message;
  error->public_error.reset_error_mgr = sbls_jpeg_reset_error;
}

static void sbls_jpeg_source_init(j_decompress_ptr decompressor) {
  (void)decompressor;
}

static boolean sbls_jpeg_source_refill(j_decompress_ptr decompressor) {
  ERREXIT(decompressor, JERR_INPUT_EOF);
  return FALSE;
}

static void sbls_jpeg_source_skip(j_decompress_ptr decompressor,
                                  long byte_count) {
  if (byte_count <= 0) return;
  if ((uint64_t)byte_count >
      (uint64_t)decompressor->src->bytes_in_buffer) {
    ERREXIT(decompressor, JERR_INPUT_EOF);
    return;
  }
  decompressor->src->next_input_byte += (size_t)byte_count;
  decompressor->src->bytes_in_buffer -= (size_t)byte_count;
}

static void sbls_jpeg_source_term(j_decompress_ptr decompressor) {
  (void)decompressor;
}

static void sbls_jpeg_set_memory_source(j_decompress_ptr decompressor,
                                        const uint8_t* bytes,
                                        size_t length) {
  SblsJpegMemorySource* source;
  if (decompressor->src == NULL) {
    decompressor->src = (struct jpeg_source_mgr*)(*decompressor->mem->alloc_small)(
        (j_common_ptr)decompressor, JPOOL_PERMANENT,
        sizeof(SblsJpegMemorySource));
  }
  source = (SblsJpegMemorySource*)decompressor->src;
  source->public_source.init_source = sbls_jpeg_source_init;
  source->public_source.fill_input_buffer = sbls_jpeg_source_refill;
  source->public_source.skip_input_data = sbls_jpeg_source_skip;
  source->public_source.resync_to_restart = jpeg_resync_to_restart;
  source->public_source.term_source = sbls_jpeg_source_term;
  source->public_source.bytes_in_buffer = length;
  source->public_source.next_input_byte = bytes;
}

static SblsNativeCodecStatus sbls_jpeg_decode(
    const uint8_t* bytes, size_t length, const SblsJpegProfile* profile,
    SblsRasterInfo* result) {
  SblsJpegDecodeContext* const context =
      (SblsJpegDecodeContext*)sbls_operation_calloc(
          1, sizeof(SblsJpegDecodeContext));
  j_decompress_ptr const decompressor =
      context != NULL ? &context->decompressor : NULL;

  if (context == NULL) return SBLS_NATIVE_RESOURCE_LIMIT;
  context->status = SBLS_NATIVE_INVALID;
  sbls_jpeg_initialize_error(&context->error);
  decompressor->err = &context->error.public_error;

  if (setjmp(context->error.jump_buffer) != 0) {
    SblsNativeCodecStatus failure_status =
        sbls_operation_allocation_was_denied() ||
                context->error.message_code == JERR_OUT_OF_MEMORY ||
                context->error.message_code == JERR_NO_BACKING_STORE
            ? SBLS_NATIVE_RESOURCE_LIMIT
            : SBLS_NATIVE_INVALID;
    /*
     * jpeg_CreateDecompress() installs the memory manager before allocating
     * the remaining permanent pools.  A later allocation can therefore fail
     * before that function returns.  Key cleanup off the installed manager,
     * not a post-return flag, so fail-Nth injection never leaves a pool for
     * operation finalization to classify as an invariant leak.
     */
    if (decompressor->mem != NULL) jpeg_destroy_decompress(decompressor);
    sbls_operation_free(context);
    return failure_status;
  }

  jpeg_create_decompress(decompressor);
  sbls_jpeg_set_memory_source(decompressor, bytes, length);
  if (jpeg_read_header(decompressor, TRUE) != JPEG_HEADER_OK) goto Cleanup;

  if (decompressor->image_width != profile->width ||
      decompressor->image_height != profile->height ||
      decompressor->data_precision != 8 ||
      decompressor->num_components != profile->components ||
      decompressor->arith_code ||
      (!!decompressor->progressive_mode != (profile->frame_marker == 0xc2))) {
    context->status = SBLS_NATIVE_INVALID;
    goto Cleanup;
  }
  switch (decompressor->jpeg_color_space) {
    case JCS_GRAYSCALE:
      decompressor->out_color_space = JCS_GRAYSCALE;
      break;
    case JCS_RGB:
    case JCS_YCbCr:
      decompressor->out_color_space = JCS_RGB;
      break;
    case JCS_CMYK:
    case JCS_YCCK:
      decompressor->out_color_space = JCS_CMYK;
      break;
    default:
      decompressor->out_color_space = JCS_UNKNOWN;
      break;
  }
  decompressor->do_fancy_upsampling = FALSE;
  decompressor->dct_method = JDCT_ISLOW;
  if (!jpeg_start_decompress(decompressor)) goto Cleanup;
  if (decompressor->output_width != profile->width ||
      decompressor->output_height != profile->height ||
      decompressor->output_components != profile->components) {
    context->status = SBLS_NATIVE_INVALID;
    goto Cleanup;
  }
  {
    uint64_t row_bytes =
        (uint64_t)decompressor->output_width * decompressor->output_components;
    JSAMPARRAY row;
    if (row_bytes == 0 || row_bytes > (uint64_t)SIZE_MAX) {
      context->status = SBLS_NATIVE_RESOURCE_LIMIT;
      goto Cleanup;
    }
    row = (*decompressor->mem->alloc_sarray)((j_common_ptr)decompressor,
                                             JPOOL_IMAGE,
                                             (JDIMENSION)row_bytes, 1);
    if (row == NULL) {
      context->status = SBLS_NATIVE_RESOURCE_LIMIT;
      goto Cleanup;
    }
    while (decompressor->output_scanline < decompressor->output_height) {
      if (jpeg_read_scanlines(decompressor, row, 1) != 1) goto Cleanup;
    }
  }
  if (!jpeg_finish_decompress(decompressor)) goto Cleanup;
  context->status = profile->profile_supported
                        ? SBLS_NATIVE_OK
                        : SBLS_NATIVE_PROFILE_UNSUPPORTED;

Cleanup:
  jpeg_destroy_decompress(decompressor);
  if ((context->status == SBLS_NATIVE_OK ||
       context->status == SBLS_NATIVE_PROFILE_UNSUPPORTED) &&
      result != NULL) {
    result->width = profile->width;
    result->height = profile->height;
    result->component_count = profile->components;
    result->bit_depth = 8;
  }
  {
    SblsNativeCodecStatus final_status = context->status;
    int allocation_denied = sbls_operation_allocation_was_denied();
    sbls_operation_free(context);
    return allocation_denied && final_status != SBLS_NATIVE_OK
               ? SBLS_NATIVE_RESOURCE_LIMIT
               : final_status;
  }
}

SblsNativeCodecStatus sbls_jpeg_validate_v1(
    SblsCodecOperation* operation, const uint8_t* encoded_bytes,
    uint64_t encoded_length, SblsRasterInfo* result) {
  SblsNativeCodecStatus status;
  SblsJpegProfile profile;
  if (operation == NULL || result == NULL || encoded_bytes == NULL ||
      encoded_length == 0 || encoded_length > (uint64_t)SIZE_MAX) {
    return SBLS_NATIVE_INVALID;
  }
  memset(result, 0, sizeof(*result));
  status = sbls_scan_jpeg(encoded_bytes, (size_t)encoded_length, &profile);
  if (status != SBLS_NATIVE_OK) return status;
  status = sbls_operation_begin(operation);
  if (status != SBLS_NATIVE_OK) return status;
  status = sbls_jpeg_decode(encoded_bytes, (size_t)encoded_length, &profile,
                            result);
  result->peak_total_bytes = operation->peak_total_bytes;
  status = sbls_operation_finish(operation, status);
  result->peak_total_bytes = operation->peak_total_bytes;
  return status;
}

static void sbls_copy_codec_result(const SblsCodecOperation* operation,
                                   const SblsRasterInfo* raster,
                                   SblsNativeCodecStatus status,
                                   sbls_codec_result* result) {
  memset(result, 0, sizeof(*result));
  result->status = (uint32_t)status;
  if (raster != NULL) {
    result->width = raster->width;
    result->height = raster->height;
    result->frames = status == SBLS_NATIVE_OK ? 1u : 0u;
  }
  if (operation != NULL) {
    result->peak_allocation_bytes = operation->peak_total_bytes;
    result->live_allocation_bytes = operation->current_native_bytes;
    result->allocation_attempts = operation->allocation_attempts;
    result->successful_allocations = operation->successful_allocations;
    result->successful_frees = operation->successful_frees;
  }
}

uint32_t sbls_jpeg_validate_with_options(
    const uint8_t* encoded_bytes, size_t encoded_length,
    const sbls_codec_options* options, sbls_codec_result* result) {
  SblsCodecOperation operation;
  SblsRasterInfo raster;
  SblsNativeCodecStatus status;
  if (options == NULL || result == NULL) return (uint32_t)SBLS_NATIVE_INTERNAL;
  sbls_codec_operation_init(&operation, options->allocation_limit,
                            options->external_live_bytes);
  sbls_codec_operation_set_fail_allocation_at(&operation,
                                               options->fail_allocation_at);
  status = sbls_jpeg_validate_v1(&operation, encoded_bytes,
                                 (uint64_t)encoded_length, &raster);
  sbls_copy_codec_result(&operation, &raster, status, result);
  return (uint32_t)status;
}

uint32_t sbls_jpeg_validate(const uint8_t* encoded_bytes,
                            size_t encoded_length,
                            uint64_t allocation_limit,
                            sbls_codec_result* result) {
  const sbls_codec_options options = { allocation_limit, 0, 0 };
  return sbls_jpeg_validate_with_options(encoded_bytes, encoded_length,
                                         &options, result);
}
