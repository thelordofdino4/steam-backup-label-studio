#ifndef SBLS_LIBWEBP_CONFIG_H_
#define SBLS_LIBWEBP_CONFIG_H_

/*
 * Fixed decoder-only configuration for the pinned libwebp 1.6.0 build.
 * Deliberately leave every WEBP_HAVE_* SIMD selector and WEBP_USE_THREAD
 * undefined.  This prevents cpu.h from auto-enabling objects that are not in
 * the audited generic source list and keeps allocation accounting on one
 * operation-owned thread.
 */
#define PACKAGE "libwebp"
#define PACKAGE_NAME "libwebp"
#define PACKAGE_VERSION "1.6.0"
#define VERSION "1.6.0"

#endif  /* SBLS_LIBWEBP_CONFIG_H_ */
