/*
 * jmemnobs.c
 *
 * This file was part of the Independent JPEG Group's software:
 * Copyright (C) 1992-1996, Thomas G. Lane.
 * libjpeg-turbo Modifications:
 * Copyright (C) 2017-2018, 2024, D. R. Commander.
 * For conditions of distribution and use, see the accompanying README.ijg
 * file.
 *
 * Steam Backup Label Studio modifications:
 * Copyright (C) 2026 Steam Backup Label Studio contributors.
 * This decoder-only overlay replaces process-global malloc/free availability
 * with the active bounded package-codec operation.
 */

#define JPEG_INTERNALS
#include "jinclude.h"
#include "jpeglib.h"
#include "jmemsys.h"

#include "sbls_allocation_ledger.h"

GLOBAL(void*)
jpeg_get_small(j_common_ptr cinfo, size_t sizeofobject) {
  (void)cinfo;
  return sbls_operation_alloc(sizeofobject);
}

GLOBAL(void)
jpeg_free_small(j_common_ptr cinfo, void* object, size_t sizeofobject) {
  (void)cinfo;
  (void)sizeofobject;
  sbls_operation_free(object);
}

GLOBAL(void*)
jpeg_get_large(j_common_ptr cinfo, size_t sizeofobject) {
  (void)cinfo;
  return sbls_operation_alloc(sizeofobject);
}

GLOBAL(void)
jpeg_free_large(j_common_ptr cinfo, void* object, size_t sizeofobject) {
  (void)cinfo;
  (void)sizeofobject;
  sbls_operation_free(object);
}

GLOBAL(size_t)
jpeg_mem_available(j_common_ptr cinfo, size_t min_bytes_needed,
                   size_t max_bytes_needed, size_t already_allocated) {
  size_t remaining = sbls_operation_remaining();
  (void)cinfo;
  (void)min_bytes_needed;
  (void)already_allocated;
  return remaining < max_bytes_needed ? remaining : max_bytes_needed;
}

GLOBAL(void)
jpeg_open_backing_store(j_common_ptr cinfo, backing_store_ptr info,
                        long total_bytes_needed) {
  (void)info;
  (void)total_bytes_needed;
  ERREXIT(cinfo, JERR_NO_BACKING_STORE);
}

GLOBAL(long)
jpeg_mem_init(j_common_ptr cinfo) {
  (void)cinfo;
  return 0;
}

GLOBAL(void)
jpeg_mem_term(j_common_ptr cinfo) {
  (void)cinfo;
}
