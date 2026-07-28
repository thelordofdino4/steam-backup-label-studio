/*
 * Package-owned libwebp worker adapter.
 *
 * The package validator is deliberately single-threaded.  Supplying only the
 * immutable generic worker interface avoids compiling libwebp's thread
 * creation branches and mutable WebPSetWorkerInterface process-global hook.
 */

#include <string.h>

#include "src/utils/thread_utils.h"

static void sbls_worker_init(WebPWorker* const worker) {
  memset(worker, 0, sizeof(*worker));
  worker->status = NOT_OK;
}

static int sbls_worker_sync(WebPWorker* const worker) {
  return !worker->had_error;
}

static int sbls_worker_reset(WebPWorker* const worker) {
  worker->impl = NULL;
  worker->status = OK;
  worker->had_error = 0;
  return 1;
}

static void sbls_worker_execute(WebPWorker* const worker) {
  if (worker->hook != NULL) {
    worker->had_error |= !worker->hook(worker->data1, worker->data2);
  }
}

static void sbls_worker_launch(WebPWorker* const worker) {
  sbls_worker_execute(worker);
}

static void sbls_worker_end(WebPWorker* const worker) {
  worker->impl = NULL;
  worker->status = NOT_OK;
}

static const WebPWorkerInterface SBLS_SINGLE_THREAD_WORKER = {
  sbls_worker_init,
  sbls_worker_reset,
  sbls_worker_sync,
  sbls_worker_launch,
  sbls_worker_execute,
  sbls_worker_end
};

const WebPWorkerInterface* WebPGetWorkerInterface(void) {
  return &SBLS_SINGLE_THREAD_WORKER;
}
