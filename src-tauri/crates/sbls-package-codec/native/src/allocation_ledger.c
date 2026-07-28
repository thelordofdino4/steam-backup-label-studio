#include "sbls_allocation_ledger.h"

#include <limits.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32)
#include <windows.h>
#endif

#define SBLS_ALLOCATION_MAGIC UINT64_C(0x53424c53414c4c4f)

typedef union SblsAllocationHeader SblsAllocationHeader;
union SblsAllocationHeader {
  struct {
    uint64_t magic;
    uint64_t charged_bytes;
    SblsCodecOperation* owner;
    SblsAllocationHeader* previous;
    SblsAllocationHeader* next;
    uint64_t reserved_alignment;
  } fields;
  unsigned char payload_alignment_block[64];
};

/*
 * malloc() is maximally aligned and the supported Windows/macOS/Linux C ABIs
 * require no more than 16-byte fundamental alignment.  Advancing by this
 * fixed 64-byte block therefore preserves the allocator's alignment on both
 * 32- and 64-bit targets.
 */
_Static_assert(sizeof(SblsAllocationHeader) == 64,
               "allocation header must preserve payload alignment");

#if defined(_MSC_VER)
__declspec(thread) static SblsCodecOperation* sbls_current_operation = NULL;
static volatile LONG sbls_validator_active = 0;
#else
static _Thread_local SblsCodecOperation* sbls_current_operation = NULL;
static uint32_t sbls_validator_active = 0;
#endif

static int sbls_checked_add_u64(uint64_t left, uint64_t right,
                                uint64_t* result) {
  if (left > UINT64_MAX - right) return 0;
  *result = left + right;
  return 1;
}

static int sbls_checked_multiply_u64(uint64_t left, uint64_t right,
                                     uint64_t* result) {
  if (left != 0 && right > UINT64_MAX / left) return 0;
  *result = left * right;
  return 1;
}

static int sbls_global_try_acquire(void) {
#if defined(_WIN32)
  return InterlockedCompareExchange(&sbls_validator_active, 1, 0) == 0;
#else
  uint32_t expected = 0;
  return __atomic_compare_exchange_n(&sbls_validator_active, &expected, 1, 0,
                                     0, __ATOMIC_ACQ_REL,
                                     __ATOMIC_ACQUIRE);
#endif
}

static void sbls_global_release(void) {
#if defined(_WIN32)
  (void)InterlockedExchange(&sbls_validator_active, 0);
#else
  __atomic_store_n(&sbls_validator_active, 0, __ATOMIC_RELEASE);
#endif
}

static void sbls_mark_denied(SblsCodecOperation* operation) {
  if (operation != NULL) operation->allocation_denied = 1;
}

static void sbls_mark_invariant(SblsCodecOperation* operation) {
  if (operation != NULL) operation->internal_invariant_failed = 1;
}

static int sbls_charge_allowed(SblsCodecOperation* operation,
                               uint64_t charged_bytes) {
  uint64_t native_after;
  uint64_t total_after;

  if (operation == NULL || operation->active == 0) return 0;
  if (!sbls_checked_add_u64(operation->current_native_bytes, charged_bytes,
                            &native_after) ||
      !sbls_checked_add_u64(operation->external_live_bytes, native_after,
                            &total_after) ||
      total_after > operation->limit_bytes) {
    sbls_mark_denied(operation);
    return 0;
  }
  return 1;
}

static int sbls_should_inject_failure(SblsCodecOperation* operation) {
  if (operation->allocation_attempts == UINT64_MAX) {
    sbls_mark_denied(operation);
    return 1;
  }
  ++operation->allocation_attempts;
  if (operation->fail_allocation_at != 0 &&
      operation->allocation_attempts == operation->fail_allocation_at) {
    sbls_mark_denied(operation);
    return 1;
  }
  return 0;
}

static void sbls_link_allocation(SblsCodecOperation* operation,
                                 SblsAllocationHeader* header,
                                 uint64_t charged_bytes) {
  header->fields.magic = SBLS_ALLOCATION_MAGIC;
  header->fields.charged_bytes = charged_bytes;
  header->fields.owner = operation;
  header->fields.previous = NULL;
  header->fields.next = (SblsAllocationHeader*)operation->allocation_head;
  if (header->fields.next != NULL) {
    header->fields.next->fields.previous = header;
  }
  operation->allocation_head = header;
  operation->current_native_bytes += charged_bytes;
  ++operation->successful_allocations;
  {
    uint64_t total = operation->external_live_bytes +
                     operation->current_native_bytes;
    if (total > operation->peak_total_bytes) operation->peak_total_bytes = total;
  }
}

static void sbls_unlink_allocation(SblsCodecOperation* operation,
                                   SblsAllocationHeader* header) {
  if (header->fields.previous != NULL) {
    header->fields.previous->fields.next = header->fields.next;
  } else {
    operation->allocation_head = header->fields.next;
  }
  if (header->fields.next != NULL) {
    header->fields.next->fields.previous = header->fields.previous;
  }
}

uint32_t sbls_codec_abi_version(void) { return SBLS_CODEC_ABI_VERSION; }

size_t sbls_codec_operation_size(void) { return sizeof(SblsCodecOperation); }

size_t sbls_codec_operation_alignment(void) {
  struct SblsOperationAlignmentProbe {
    char byte;
    SblsCodecOperation operation;
  };
  return offsetof(struct SblsOperationAlignmentProbe, operation);
}

size_t sbls_raster_info_size(void) { return sizeof(SblsRasterInfo); }

size_t sbls_codec_result_size(void) { return sizeof(sbls_codec_result); }

size_t sbls_codec_allocation_header_size(void) {
  return sizeof(SblsAllocationHeader);
}

void sbls_codec_operation_init(SblsCodecOperation* operation,
                               uint64_t requested_limit_bytes,
                               uint64_t external_live_bytes) {
  if (operation == NULL) return;
  memset(operation, 0, sizeof(*operation));
  operation->limit_bytes =
      requested_limit_bytes == 0 ||
              requested_limit_bytes > SBLS_CODEC_MAX_WORKING_BYTES
          ? SBLS_CODEC_MAX_WORKING_BYTES
          : requested_limit_bytes;
  operation->external_live_bytes = external_live_bytes;
  if (external_live_bytes > operation->limit_bytes) {
    operation->allocation_denied = 1;
  }
}

SblsNativeCodecStatus sbls_codec_operation_reset(
    SblsCodecOperation* operation, uint64_t external_live_bytes) {
  if (operation == NULL || operation->active != 0 ||
      operation->allocation_head != NULL ||
      operation->current_native_bytes != 0) {
    return SBLS_NATIVE_INTERNAL;
  }
  operation->external_live_bytes = external_live_bytes;
  operation->peak_total_bytes = external_live_bytes;
  operation->allocation_attempts = 0;
  operation->successful_allocations = 0;
  operation->successful_frees = 0;
  operation->allocation_denied = external_live_bytes > operation->limit_bytes;
  operation->internal_invariant_failed = 0;
  return operation->allocation_denied ? SBLS_NATIVE_RESOURCE_LIMIT
                                      : SBLS_NATIVE_OK;
}

void sbls_codec_operation_set_fail_allocation_at(
    SblsCodecOperation* operation, uint64_t allocation_attempt) {
  if (operation != NULL && operation->active == 0) {
    operation->fail_allocation_at = allocation_attempt;
  }
}

SblsNativeCodecStatus sbls_operation_begin(SblsCodecOperation* operation) {
  if (operation == NULL) return SBLS_NATIVE_INTERNAL;
  if (operation->external_live_bytes > operation->limit_bytes ||
      operation->allocation_denied != 0) {
    return SBLS_NATIVE_RESOURCE_LIMIT;
  }
  if (operation->active != 0 || sbls_current_operation != NULL) {
    return SBLS_NATIVE_CONCURRENCY_LIMIT;
  }
  if (!sbls_global_try_acquire()) return SBLS_NATIVE_CONCURRENCY_LIMIT;
  operation->active = 1;
  sbls_current_operation = operation;
  if (operation->peak_total_bytes < operation->external_live_bytes) {
    operation->peak_total_bytes = operation->external_live_bytes;
  }
  return SBLS_NATIVE_OK;
}

SblsNativeCodecStatus sbls_operation_finish(SblsCodecOperation* operation,
                                            SblsNativeCodecStatus status) {
  int leaked = 0;
  if (operation == NULL || sbls_current_operation != operation ||
      operation->active == 0) {
    return SBLS_NATIVE_INTERNAL;
  }

  while (operation->allocation_head != NULL) {
    SblsAllocationHeader* header =
        (SblsAllocationHeader*)operation->allocation_head;
    leaked = 1;
    operation->allocation_head = header->fields.next;
    if (header->fields.magic != SBLS_ALLOCATION_MAGIC ||
        header->fields.owner != operation ||
        header->fields.charged_bytes > operation->current_native_bytes) {
      sbls_mark_invariant(operation);
      break;
    }
    operation->current_native_bytes -= header->fields.charged_bytes;
    header->fields.magic = 0;
    free(header);
    ++operation->successful_frees;
  }

  if (operation->allocation_head != NULL ||
      operation->current_native_bytes != 0) {
    sbls_mark_invariant(operation);
  }
  operation->allocation_head = NULL;
  operation->current_native_bytes = 0;
  sbls_current_operation = NULL;
  operation->active = 0;
  sbls_global_release();

  if (operation->internal_invariant_failed != 0) {
    return SBLS_NATIVE_INTERNAL;
  }
  if (operation->allocation_denied != 0) {
    return SBLS_NATIVE_RESOURCE_LIMIT;
  }
  if (leaked) return SBLS_NATIVE_INTERNAL;
  return status;
}

void* sbls_operation_alloc(size_t bytes) {
  SblsCodecOperation* operation = sbls_current_operation;
  uint64_t charged_bytes;
  SblsAllocationHeader* header;

  if (operation == NULL || bytes == 0 ||
      !sbls_checked_add_u64((uint64_t)sizeof(SblsAllocationHeader),
                            (uint64_t)bytes, &charged_bytes)) {
    sbls_mark_denied(operation);
    return NULL;
  }
  if (sbls_should_inject_failure(operation) ||
      !sbls_charge_allowed(operation, charged_bytes) ||
      charged_bytes > (uint64_t)SIZE_MAX) {
    sbls_mark_denied(operation);
    return NULL;
  }
  header = (SblsAllocationHeader*)malloc((size_t)charged_bytes);
  if (header == NULL) {
    sbls_mark_denied(operation);
    return NULL;
  }
  sbls_link_allocation(operation, header, charged_bytes);
  return (void*)(header + 1);
}

void* sbls_operation_calloc(uint64_t count, size_t bytes) {
  uint64_t total;
  void* allocation;
  if (!sbls_checked_multiply_u64(count, (uint64_t)bytes, &total) ||
      total == 0 || total > (uint64_t)SIZE_MAX) {
    sbls_mark_denied(sbls_current_operation);
    return NULL;
  }
  allocation = sbls_operation_alloc((size_t)total);
  if (allocation != NULL) memset(allocation, 0, (size_t)total);
  return allocation;
}

void* sbls_operation_alloc_array(uint64_t count, size_t bytes) {
  uint64_t total;
  if (!sbls_checked_multiply_u64(count, (uint64_t)bytes, &total) ||
      total == 0 || total > (uint64_t)SIZE_MAX) {
    sbls_mark_denied(sbls_current_operation);
    return NULL;
  }
  return sbls_operation_alloc((size_t)total);
}

void* sbls_operation_realloc(void* allocation, size_t bytes) {
  SblsAllocationHeader* old_header;
  SblsAllocationHeader* new_header;
  SblsCodecOperation* operation = sbls_current_operation;
  uint64_t new_charge;
  uint64_t old_charge;
  uint64_t native_without_old;
  uint64_t native_after;
  uint64_t total_after;
  uint64_t transient_native;
  uint64_t transient_total;

  if (allocation == NULL) return sbls_operation_alloc(bytes);
  if (bytes == 0) {
    sbls_operation_free(allocation);
    return NULL;
  }
  old_header = ((SblsAllocationHeader*)allocation) - 1;
  if (operation == NULL || old_header->fields.magic != SBLS_ALLOCATION_MAGIC ||
      old_header->fields.owner != operation) {
    sbls_mark_invariant(operation);
    return NULL;
  }
  if (!sbls_checked_add_u64((uint64_t)sizeof(SblsAllocationHeader),
                            (uint64_t)bytes, &new_charge) ||
      new_charge > (uint64_t)SIZE_MAX ||
      sbls_should_inject_failure(operation)) {
    sbls_mark_denied(operation);
    return NULL;
  }
  old_charge = old_header->fields.charged_bytes;
  if (old_charge > operation->current_native_bytes) {
    sbls_mark_invariant(operation);
    return NULL;
  }
  native_without_old = operation->current_native_bytes - old_charge;
  if (!sbls_checked_add_u64(native_without_old, new_charge, &native_after) ||
      !sbls_checked_add_u64(operation->external_live_bytes, native_after,
                            &total_after) ||
      !sbls_checked_add_u64(operation->current_native_bytes, new_charge,
                            &transient_native) ||
      !sbls_checked_add_u64(operation->external_live_bytes, transient_native,
                            &transient_total) ||
      transient_total > operation->limit_bytes) {
    sbls_mark_denied(operation);
    return NULL;
  }

  /*
   * The C realloc contract permits an implementation to allocate the complete
   * replacement while the old allocation is still live.  Preflight and record
   * that conservative old-plus-new peak before entering the system allocator;
   * accounting only the post-replacement delta could transiently breach the
   * operation ceiling.
   */
  if (transient_total > operation->peak_total_bytes) {
    operation->peak_total_bytes = transient_total;
  }
  new_header =
      (SblsAllocationHeader*)realloc(old_header, (size_t)new_charge);
  if (new_header == NULL) {
    sbls_mark_denied(operation);
    return NULL;
  }
  if (new_header != old_header) {
    if (new_header->fields.previous != NULL) {
      new_header->fields.previous->fields.next = new_header;
    } else {
      operation->allocation_head = new_header;
    }
    if (new_header->fields.next != NULL) {
      new_header->fields.next->fields.previous = new_header;
    }
  }
  new_header->fields.charged_bytes = new_charge;
  operation->current_native_bytes = native_after;
  return (void*)(new_header + 1);
}

void sbls_operation_free(void* allocation) {
  SblsAllocationHeader* header;
  SblsCodecOperation* operation = sbls_current_operation;
  if (allocation == NULL) return;
  header = ((SblsAllocationHeader*)allocation) - 1;
  if (operation == NULL || header->fields.magic != SBLS_ALLOCATION_MAGIC ||
      header->fields.owner != operation ||
      header->fields.charged_bytes > operation->current_native_bytes) {
    sbls_mark_invariant(operation);
    return;
  }
  sbls_unlink_allocation(operation, header);
  operation->current_native_bytes -= header->fields.charged_bytes;
  header->fields.magic = 0;
  free(header);
  ++operation->successful_frees;
}

size_t sbls_operation_remaining(void) {
  SblsCodecOperation* operation = sbls_current_operation;
  uint64_t total;
  if (operation == NULL ||
      !sbls_checked_add_u64(operation->external_live_bytes,
                            operation->current_native_bytes, &total) ||
      total >= operation->limit_bytes) {
    return 0;
  }
  total = operation->limit_bytes - total;
  return total > (uint64_t)SIZE_MAX ? SIZE_MAX : (size_t)total;
}

int sbls_operation_allocation_was_denied(void) {
  return sbls_current_operation != NULL &&
         sbls_current_operation->allocation_denied != 0;
}

SblsNativeCodecStatus sbls_codec_test_begin(SblsCodecOperation* operation) {
  return sbls_operation_begin(operation);
}

SblsNativeCodecStatus sbls_codec_test_end(SblsCodecOperation* operation) {
  return sbls_operation_finish(operation, SBLS_NATIVE_OK);
}

void* sbls_codec_test_alloc(uint64_t bytes) {
  if (bytes > (uint64_t)SIZE_MAX) return NULL;
  return sbls_operation_alloc((size_t)bytes);
}

void* sbls_codec_test_calloc(uint64_t count, uint64_t bytes) {
  if (bytes > (uint64_t)SIZE_MAX) return NULL;
  return sbls_operation_calloc(count, (size_t)bytes);
}

void* sbls_codec_test_realloc(void* allocation, uint64_t bytes) {
  if (bytes > (uint64_t)SIZE_MAX) return NULL;
  return sbls_operation_realloc(allocation, (size_t)bytes);
}

void sbls_codec_test_free(void* allocation) {
  sbls_operation_free(allocation);
}

uint32_t sbls_codec_ledger_probe(uint32_t scenario,
                                 uint64_t allocation_limit,
                                 uint64_t first,
                                 uint64_t second,
                                 uint64_t fail_allocation_at,
                                 sbls_codec_result* result) {
  SblsCodecOperation operation;
  SblsNativeCodecStatus status;
  void* allocation = NULL;
  if (result == NULL) return (uint32_t)SBLS_NATIVE_INTERNAL;
  memset(result, 0, sizeof(*result));
  sbls_codec_operation_init(&operation, allocation_limit, 0);
  sbls_codec_operation_set_fail_allocation_at(&operation,
                                               fail_allocation_at);
  status = sbls_operation_begin(&operation);
  if (status == SBLS_NATIVE_OK) {
    if (scenario == 0) {
      allocation = first <= (uint64_t)SIZE_MAX
                       ? sbls_operation_alloc((size_t)first)
                       : NULL;
      status = allocation != NULL ? SBLS_NATIVE_OK
                                  : SBLS_NATIVE_RESOURCE_LIMIT;
    } else if (scenario == 1) {
      allocation = first <= (uint64_t)SIZE_MAX
                       ? sbls_operation_alloc((size_t)first)
                       : NULL;
      if (allocation != NULL && second <= (uint64_t)SIZE_MAX) {
        void* replacement =
            sbls_operation_realloc(allocation, (size_t)second);
        if (replacement != NULL) {
          allocation = replacement;
        } else {
          status = SBLS_NATIVE_RESOURCE_LIMIT;
        }
      } else {
        status = SBLS_NATIVE_RESOURCE_LIMIT;
      }
    } else if (scenario == 2) {
      allocation = second <= (uint64_t)SIZE_MAX
                       ? sbls_operation_calloc(first, (size_t)second)
                       : NULL;
      status = allocation != NULL ? SBLS_NATIVE_OK
                                  : SBLS_NATIVE_RESOURCE_LIMIT;
    } else if (scenario == 3) {
      status = sbls_operation_begin(&operation) ==
                       SBLS_NATIVE_CONCURRENCY_LIMIT
                   ? SBLS_NATIVE_OK
                   : SBLS_NATIVE_INTERNAL;
    } else {
      status = SBLS_NATIVE_INTERNAL;
    }
    if (allocation != NULL) sbls_operation_free(allocation);
    status = sbls_operation_finish(&operation, status);
  }
  result->status = (uint32_t)status;
  result->peak_allocation_bytes = operation.peak_total_bytes;
  result->live_allocation_bytes = operation.current_native_bytes;
  result->allocation_attempts = operation.allocation_attempts;
  result->successful_allocations = operation.successful_allocations;
  result->successful_frees = operation.successful_frees;
  return (uint32_t)status;
}
