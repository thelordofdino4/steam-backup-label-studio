#ifndef SBLS_CODEC_SHIM_H_
#define SBLS_CODEC_SHIM_H_

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define SBLS_CODEC_ABI_VERSION 1u
#define SBLS_CODEC_MAX_WORKING_BYTES UINT64_C(536870912)

typedef enum SblsNativeCodecStatus {
  SBLS_NATIVE_OK = 0,
  SBLS_NATIVE_INVALID = 1,
  SBLS_NATIVE_PROFILE_UNSUPPORTED = 2,
  SBLS_NATIVE_DIMENSIONS_INVALID = 3,
  SBLS_NATIVE_RESOURCE_LIMIT = 4,
  SBLS_NATIVE_CONCURRENCY_LIMIT = 5,
  SBLS_NATIVE_INTERNAL = 6
} SblsNativeCodecStatus;

/*
 * Rust owns this object.  Native allocations are operation-scoped and linked
 * through allocation_head so every failure path can be drained deterministically.
 * The layout is part of ABI version 1 and is mirrored by native.rs.
 */
typedef struct SblsCodecOperation {
  uint64_t limit_bytes;
  uint64_t external_live_bytes;
  uint64_t current_native_bytes;
  uint64_t peak_total_bytes;
  uint64_t allocation_attempts;
  uint64_t successful_allocations;
  uint64_t successful_frees;
  uint64_t fail_allocation_at;
  void* allocation_head;
  uint32_t active;
  uint32_t allocation_denied;
  uint32_t internal_invariant_failed;
  uint32_t reserved;
} SblsCodecOperation;

typedef struct SblsRasterInfo {
  uint32_t width;
  uint32_t height;
  uint32_t component_count;
  uint32_t bit_depth;
  uint64_t peak_total_bytes;
} SblsRasterInfo;

typedef struct sbls_codec_result {
  uint32_t status;
  uint32_t width;
  uint32_t height;
  uint32_t frames;
  uint64_t peak_allocation_bytes;
  uint64_t live_allocation_bytes;
  uint64_t allocation_attempts;
  uint64_t successful_allocations;
  uint64_t successful_frees;
} sbls_codec_result;

typedef struct sbls_codec_options {
  uint64_t allocation_limit;
  uint64_t external_live_bytes;
  uint64_t fail_allocation_at;
} sbls_codec_options;

uint32_t sbls_codec_abi_version(void);
size_t sbls_codec_operation_size(void);
size_t sbls_codec_operation_alignment(void);
size_t sbls_raster_info_size(void);
size_t sbls_codec_result_size(void);
size_t sbls_codec_allocation_header_size(void);

void sbls_codec_operation_init(SblsCodecOperation* operation,
                               uint64_t requested_limit_bytes,
                               uint64_t external_live_bytes);

SblsNativeCodecStatus sbls_codec_operation_reset(
    SblsCodecOperation* operation, uint64_t external_live_bytes);

void sbls_codec_operation_set_fail_allocation_at(
    SblsCodecOperation* operation, uint64_t allocation_attempt);

/*
 * Fully decodes package-v1 JPEGs. Native-decodable 8-bit Huffman DCT streams
 * outside the v1 component/sampling profile are also entropy-decoded before
 * returning SBLS_NATIVE_PROFILE_UNSUPPORTED. Encoded bytes remain borrowed.
 */
SblsNativeCodecStatus sbls_jpeg_validate_v1(
    SblsCodecOperation* operation, const uint8_t* encoded_bytes,
    uint64_t encoded_length, SblsRasterInfo* result);

/*
 * Decodes exactly one static WebP image or one owner-preflighted animation
 * frame fragment.  expected_width/height must be the dimensions established by
 * the strict Rust container parser.  Encoded bytes are never modified or
 * transcoded and no decoded buffer crosses this ABI.
 */
SblsNativeCodecStatus sbls_webp_validate_frame_v1(
    SblsCodecOperation* operation, const uint8_t* encoded_bytes,
    uint64_t encoded_length, uint32_t expected_width,
    uint32_t expected_height, SblsRasterInfo* result);

uint32_t sbls_jpeg_validate(const uint8_t* encoded_bytes,
                            size_t encoded_length,
                            uint64_t allocation_limit,
                            sbls_codec_result* result);

uint32_t sbls_webp_validate(const uint8_t* encoded_bytes,
                            size_t encoded_length,
                            uint64_t allocation_limit,
                            sbls_codec_result* result);

uint32_t sbls_jpeg_validate_with_options(
    const uint8_t* encoded_bytes, size_t encoded_length,
    const sbls_codec_options* options, sbls_codec_result* result);

uint32_t sbls_webp_validate_with_options(
    const uint8_t* encoded_bytes, size_t encoded_length,
    const sbls_codec_options* options, sbls_codec_result* result);

/* Test-only fault/ledger probes.  They remain package-crate-private in Rust. */
SblsNativeCodecStatus sbls_codec_test_begin(SblsCodecOperation* operation);
SblsNativeCodecStatus sbls_codec_test_end(SblsCodecOperation* operation);
void* sbls_codec_test_alloc(uint64_t bytes);
void* sbls_codec_test_calloc(uint64_t count, uint64_t bytes);
void* sbls_codec_test_realloc(void* allocation, uint64_t bytes);
void sbls_codec_test_free(void* allocation);

/*
 * Deterministic ledger probe for Rust tests:
 *   0 = allocate(first), free
 *   1 = allocate(first), realloc(second), free
 *   2 = calloc(first, second), free
 *   3 = verify a nested validator lease is rejected
 */
uint32_t sbls_codec_ledger_probe(uint32_t scenario,
                                 uint64_t allocation_limit,
                                 uint64_t first,
                                 uint64_t second,
                                 uint64_t fail_allocation_at,
                                 sbls_codec_result* result);

#ifdef __cplusplus
}  /* extern "C" */
#endif

#endif  /* SBLS_CODEC_SHIM_H_ */
