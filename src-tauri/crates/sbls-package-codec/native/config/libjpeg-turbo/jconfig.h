#ifndef SBLS_LIBJPEG_TURBO_JCONFIG_H_
#define SBLS_LIBJPEG_TURBO_JCONFIG_H_

#define JPEG_LIB_VERSION 62
#define LIBJPEG_TURBO_VERSION 3.1.4.1
#define LIBJPEG_TURBO_VERSION_NUMBER 3001004
#define BITS_IN_JSAMPLE 8

/* Package decoding never consults process-global environment configuration. */
#define NO_GETENV 1

/* Arithmetic and SIMD implementations are deliberately not in this build. */
#undef C_ARITH_CODING_SUPPORTED
#undef D_ARITH_CODING_SUPPORTED
#undef WITH_SIMD

#ifdef _WIN32
#undef RIGHT_SHIFT_IS_UNSIGNED
#ifndef __RPCNDR_H__
typedef unsigned char boolean;
#endif
#define HAVE_BOOLEAN
#if !(defined(_BASETSD_H_) || defined(_BASETSD_H))
typedef short INT16;
typedef signed int INT32;
#endif
#define XMD_H
#else
#undef RIGHT_SHIFT_IS_UNSIGNED
#endif

#endif  /* SBLS_LIBJPEG_TURBO_JCONFIG_H_ */
