/*
 * libjpeg-turbo 3.x exposes a single decompression controller that contains
 * link references for 12- and 16-bit implementation wrappers even in an
 * application that rejects those precisions before jpeg_start_decompress().
 *
 * The SBLS v1 scanner accepts only 8-bit SOF0/SOF2 data, and the shim repeats
 * that precision check after jpeg_read_header().  Keep the unsupported wrapper
 * implementations out of the native build while satisfying the controller's
 * unreachable references with fatal guards.  Every guard uses the shim's
 * contained libjpeg error path; none can return or mutate decoder state.
 */

#define JPEG_INTERNALS
#include "jinclude.h"
#include "jpeglib.h"
#include "jerror.h"

#define SBLS_REJECT_PRECISION(cinfo) \
  ERREXIT1((cinfo), JERR_BAD_PRECISION, (cinfo)->data_precision)

GLOBAL(void)
j12init_d_main_controller(j_decompress_ptr cinfo, boolean need_full_buffer) {
  (void)need_full_buffer;
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_d_coef_controller(j_decompress_ptr cinfo, boolean need_full_buffer) {
  (void)need_full_buffer;
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_d_post_controller(j_decompress_ptr cinfo, boolean need_full_buffer) {
  (void)need_full_buffer;
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_inverse_dct(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_upsampler(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_color_deconverter(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_1pass_quantizer(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_2pass_quantizer(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_merged_upsampler(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}

#ifdef D_LOSSLESS_SUPPORTED
GLOBAL(void)
j16init_d_main_controller(j_decompress_ptr cinfo, boolean need_full_buffer) {
  (void)need_full_buffer;
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j16init_d_post_controller(j_decompress_ptr cinfo, boolean need_full_buffer) {
  (void)need_full_buffer;
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j16init_upsampler(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j16init_color_deconverter(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_d_diff_controller(j_decompress_ptr cinfo,
                          boolean need_full_buffer) {
  (void)need_full_buffer;
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j16init_d_diff_controller(j_decompress_ptr cinfo,
                          boolean need_full_buffer) {
  (void)need_full_buffer;
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j12init_lossless_decompressor(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}

GLOBAL(void)
j16init_lossless_decompressor(j_decompress_ptr cinfo) {
  SBLS_REJECT_PRECISION(cinfo);
}
#endif
