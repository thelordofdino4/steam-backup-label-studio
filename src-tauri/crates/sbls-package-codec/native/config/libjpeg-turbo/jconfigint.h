#ifndef SBLS_LIBJPEG_TURBO_JCONFIGINT_H_
#define SBLS_LIBJPEG_TURBO_JCONFIGINT_H_

#include <stdint.h>

#define BUILD "sbls-decoder-only"
#define PACKAGE_NAME "libjpeg-turbo"
#define VERSION "3.1.4.1"

#if defined(_MSC_VER)
#define HIDDEN
#define INLINE __forceinline
#define THREAD_LOCAL __declspec(thread)
#define HAVE_INTRIN_H 1
#elif defined(__GNUC__) || defined(__clang__)
#define HIDDEN __attribute__((visibility("hidden")))
#define INLINE __inline__ __attribute__((always_inline))
#define THREAD_LOCAL __thread
#else
#define HIDDEN
#define INLINE inline
#define THREAD_LOCAL _Thread_local
#endif

#if UINTPTR_MAX == UINT64_MAX
#define SIZEOF_SIZE_T 8
#elif UINTPTR_MAX == UINT32_MAX
#define SIZEOF_SIZE_T 4
#else
#error Unsupported size_t width for the SBLS codec boundary.
#endif

#if defined(_MSC_VER) && defined(HAVE_INTRIN_H)
#if SIZEOF_SIZE_T == 8
#define HAVE_BITSCANFORWARD64
#else
#define HAVE_BITSCANFORWARD
#endif
#endif

#if defined(__has_attribute)
#if __has_attribute(fallthrough)
#define FALLTHROUGH __attribute__((fallthrough));
#else
#define FALLTHROUGH
#endif
#else
#define FALLTHROUGH
#endif

#endif  /* SBLS_LIBJPEG_TURBO_JCONFIGINT_H_ */
