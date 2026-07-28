#ifndef SBLS_ALLOCATION_LEDGER_H_
#define SBLS_ALLOCATION_LEDGER_H_

#include "sbls_codec_shim.h"

SblsNativeCodecStatus sbls_operation_begin(SblsCodecOperation* operation);
SblsNativeCodecStatus sbls_operation_finish(SblsCodecOperation* operation,
                                            SblsNativeCodecStatus status);

void* sbls_operation_alloc(size_t bytes);
void* sbls_operation_alloc_array(uint64_t count, size_t bytes);
void* sbls_operation_calloc(uint64_t count, size_t bytes);
void* sbls_operation_realloc(void* allocation, size_t bytes);
void sbls_operation_free(void* allocation);
size_t sbls_operation_remaining(void);
int sbls_operation_allocation_was_denied(void);

#endif  /* SBLS_ALLOCATION_LEDGER_H_ */
