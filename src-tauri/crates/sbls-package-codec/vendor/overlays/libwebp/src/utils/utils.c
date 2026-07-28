// Copyright 2012 Google Inc. All Rights Reserved.
//
// Use of this source code is governed by a BSD-style license in COPYING.
// An additional intellectual property rights grant is in PATENTS.
//
// SBLS decoder-only overlay: allocation and copy utilities only.  Every
// allocation is charged to the active package-codec operation.

#include "src/utils/utils.h"

#include <stdlib.h>
#include <string.h>

#include "sbls_allocation_ledger.h"

void* WebPSafeMalloc(uint64_t nmemb, size_t size) {
  return sbls_operation_alloc_array(nmemb, size);
}

void* WebPSafeCalloc(uint64_t nmemb, size_t size) {
  return sbls_operation_calloc(nmemb, size);
}

void WebPSafeFree(void* const ptr) {
  sbls_operation_free(ptr);
}

void* WebPMalloc(size_t size) {
  return sbls_operation_alloc(size);
}

void WebPFree(void* ptr) {
  sbls_operation_free(ptr);
}

void WebPCopyPlane(const uint8_t* src, int src_stride, uint8_t* dst,
                   int dst_stride, int width, int height) {
  while (height-- > 0) {
    memcpy(dst, src, (size_t)width);
    src += src_stride;
    dst += dst_stride;
  }
}

#if defined(WEBP_NEED_LOG_TABLE_8BIT)
const uint8_t WebPLogTable8bit[256] = {
  0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3,
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7
};
#endif
