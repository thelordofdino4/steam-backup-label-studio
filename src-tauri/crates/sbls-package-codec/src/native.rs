//! Minimal FFI boundary to the pinned, patched native raster validators.
//!
//! The C shims receive borrowed encoded bytes and return numeric metadata only.
//! They never retain input pointers, allocate an output for Rust, read a path,
//! or expose native error text.

#[cfg(test)]
use std::cell::Cell;
#[cfg(test)]
use std::ffi::c_void;
use std::ffi::{c_uchar, c_uint, c_ulonglong};
#[cfg(test)]
use std::mem::align_of;
use std::mem::size_of;
use std::sync::{Mutex, MutexGuard, TryLockError};

use crate::limits::MAX_DECODER_WORK_BYTES;

const NATIVE_CODEC_ABI_VERSION: u32 = 1;
static NATIVE_CALL_LOCK: Mutex<()> = Mutex::new(());
#[cfg(test)]
static NATIVE_TEST_SCHEDULE_LOCK: Mutex<()> = Mutex::new(());
#[cfg(test)]
thread_local! {
    static NATIVE_FAIL_ALLOCATION_AT: Cell<u64> = const { Cell::new(0) };
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
struct NativeCodecResult {
    status: c_uint,
    width: c_uint,
    height: c_uint,
    frames: c_uint,
    peak_allocation_bytes: c_ulonglong,
    live_allocation_bytes: c_ulonglong,
    allocation_attempts: c_ulonglong,
    successful_allocations: c_ulonglong,
    successful_frees: c_ulonglong,
}

#[cfg(test)]
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
struct NativeCodecOptions {
    allocation_limit: c_ulonglong,
    external_live_bytes: c_ulonglong,
    fail_allocation_at: c_ulonglong,
}

#[cfg(test)]
#[repr(C)]
#[derive(Debug)]
struct NativeCodecOperation {
    limit_bytes: c_ulonglong,
    external_live_bytes: c_ulonglong,
    current_native_bytes: c_ulonglong,
    peak_total_bytes: c_ulonglong,
    allocation_attempts: c_ulonglong,
    successful_allocations: c_ulonglong,
    successful_frees: c_ulonglong,
    fail_allocation_at: c_ulonglong,
    allocation_head: *mut c_void,
    active: c_uint,
    allocation_denied: c_uint,
    internal_invariant_failed: c_uint,
    reserved: c_uint,
}

#[cfg(test)]
impl Default for NativeCodecOperation {
    fn default() -> Self {
        Self {
            limit_bytes: 0,
            external_live_bytes: 0,
            current_native_bytes: 0,
            peak_total_bytes: 0,
            allocation_attempts: 0,
            successful_allocations: 0,
            successful_frees: 0,
            fail_allocation_at: 0,
            allocation_head: std::ptr::null_mut(),
            active: 0,
            allocation_denied: 0,
            internal_invariant_failed: 0,
            reserved: 0,
        }
    }
}

extern "C" {
    fn sbls_codec_abi_version() -> c_uint;
    fn sbls_codec_result_size() -> usize;

    fn sbls_jpeg_validate(
        bytes: *const c_uchar,
        length: usize,
        allocation_limit: c_ulonglong,
        result: *mut NativeCodecResult,
    ) -> c_uint;

    fn sbls_webp_validate(
        bytes: *const c_uchar,
        length: usize,
        allocation_limit: c_ulonglong,
        result: *mut NativeCodecResult,
    ) -> c_uint;

    #[cfg(test)]
    fn sbls_jpeg_validate_with_options(
        bytes: *const c_uchar,
        length: usize,
        options: *const NativeCodecOptions,
        result: *mut NativeCodecResult,
    ) -> c_uint;

    #[cfg(test)]
    fn sbls_webp_validate_with_options(
        bytes: *const c_uchar,
        length: usize,
        options: *const NativeCodecOptions,
        result: *mut NativeCodecResult,
    ) -> c_uint;

    #[cfg(test)]
    fn sbls_codec_operation_size() -> usize;
    #[cfg(test)]
    fn sbls_codec_operation_alignment() -> usize;
    #[cfg(test)]
    fn sbls_codec_allocation_header_size() -> usize;
    #[cfg(test)]
    fn sbls_codec_operation_init(
        operation: *mut NativeCodecOperation,
        requested_limit_bytes: c_ulonglong,
        external_live_bytes: c_ulonglong,
    );
    #[cfg(test)]
    fn sbls_codec_test_begin(operation: *mut NativeCodecOperation) -> c_uint;
    #[cfg(test)]
    fn sbls_codec_test_end(operation: *mut NativeCodecOperation) -> c_uint;
    #[cfg(test)]
    fn sbls_codec_test_alloc(bytes: c_ulonglong) -> *mut c_void;
    #[cfg(test)]
    fn sbls_codec_test_realloc(allocation: *mut c_void, bytes: c_ulonglong) -> *mut c_void;
    #[cfg(test)]
    fn sbls_codec_test_free(allocation: *mut c_void);
    #[cfg(test)]
    fn sbls_codec_ledger_probe(
        scenario: c_uint,
        allocation_limit: c_ulonglong,
        first: c_ulonglong,
        second: c_ulonglong,
        fail_allocation_at: c_ulonglong,
        result: *mut NativeCodecResult,
    ) -> c_uint;
}

const STATUS_OK: u32 = 0;
const STATUS_INVALID: u32 = 1;
const STATUS_PROFILE_UNSUPPORTED: u32 = 2;
const STATUS_DIMENSIONS_INVALID: u32 = 3;
const STATUS_RESOURCE_LIMIT: u32 = 4;
const STATUS_CONCURRENCY_LIMIT: u32 = 5;
const STATUS_INTERNAL: u32 = 6;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum NativeCodecFailure {
    Invalid,
    ProfileUnsupported,
    DimensionsInvalid,
    ResourceLimit,
    Internal,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct NativeValidation {
    pub width: u32,
    pub height: u32,
    pub frames: u32,
    pub peak_allocation_bytes: u64,
    pub live_allocation_bytes: u64,
    pub allocation_attempts: u64,
    pub successful_allocations: u64,
    pub successful_frees: u64,
}

#[cfg(test)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct NativeValidationOptions {
    pub allocation_limit: u64,
    pub external_live_bytes: u64,
    /// One-based allocation attempt to deny; zero disables injection.
    pub fail_allocation_at: u64,
}

#[cfg(test)]
impl NativeValidationOptions {
    pub(crate) const fn production(allocation_limit: u64) -> Self {
        Self {
            allocation_limit,
            external_live_bytes: 0,
            fail_allocation_at: 0,
        }
    }
}

type BasicValidator =
    unsafe extern "C" fn(*const c_uchar, usize, c_ulonglong, *mut NativeCodecResult) -> c_uint;

#[cfg(test)]
type OptionsValidator = unsafe extern "C" fn(
    *const c_uchar,
    usize,
    *const NativeCodecOptions,
    *mut NativeCodecResult,
) -> c_uint;

#[cfg(test)]
fn native_test_lock() -> MutexGuard<'static, ()> {
    match NATIVE_CALL_LOCK.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    }
}

#[cfg(test)]
pub(crate) fn native_test_schedule_lock() -> MutexGuard<'static, ()> {
    match NATIVE_TEST_SCHEDULE_LOCK.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    }
}

/// Runs a crate unit-test operation with one native allocation attempt denied.
///
/// The injection is thread-local and is restored even if `operation` unwinds,
/// so parallel package tests cannot inherit the fault. A zero attempt is not a
/// valid injection because native allocation attempts are one-based.
#[cfg(test)]
pub(crate) fn with_native_allocation_failure_for_test<R>(
    fail_allocation_at: u64,
    operation: impl FnOnce() -> R,
) -> R {
    struct RestoreAllocationFailure(u64);

    impl Drop for RestoreAllocationFailure {
        fn drop(&mut self) {
            NATIVE_FAIL_ALLOCATION_AT.with(|slot| slot.set(self.0));
        }
    }

    assert!(fail_allocation_at > 0);
    let previous = NATIVE_FAIL_ALLOCATION_AT.with(|slot| slot.replace(fail_allocation_at));
    let _restore = RestoreAllocationFailure(previous);
    operation()
}

#[cfg(test)]
fn injected_validation_options(allocation_limit: u64) -> Option<NativeValidationOptions> {
    NATIVE_FAIL_ALLOCATION_AT.with(|slot| {
        let fail_allocation_at = slot.get();
        if fail_allocation_at == 0 {
            None
        } else {
            Some(NativeValidationOptions {
                allocation_limit,
                external_live_bytes: 0,
                fail_allocation_at,
            })
        }
    })
}

fn try_native_call_lock() -> Result<MutexGuard<'static, ()>, NativeCodecFailure> {
    match NATIVE_CALL_LOCK.try_lock() {
        Ok(guard) => Ok(guard),
        Err(TryLockError::Poisoned(poisoned)) => Ok(poisoned.into_inner()),
        Err(TryLockError::WouldBlock) => Err(NativeCodecFailure::ResourceLimit),
    }
}

fn abi_is_compatible() -> bool {
    // SAFETY: these functions return compile-time constants and access no caller memory.
    unsafe {
        sbls_codec_abi_version() == NATIVE_CODEC_ABI_VERSION
            && sbls_codec_result_size() == size_of::<NativeCodecResult>()
    }
}

fn map_result(
    returned_status: u32,
    result: NativeCodecResult,
) -> Result<NativeValidation, NativeCodecFailure> {
    if returned_status != result.status {
        return Err(NativeCodecFailure::Internal);
    }
    if returned_status != STATUS_INTERNAL
        && (result.live_allocation_bytes != 0
            || result.successful_allocations != result.successful_frees)
    {
        return Err(NativeCodecFailure::Internal);
    }

    match returned_status {
        STATUS_OK => {
            if result.width == 0
                || result.height == 0
                || result.frames == 0
                || result.peak_allocation_bytes > MAX_DECODER_WORK_BYTES
            {
                return Err(NativeCodecFailure::Internal);
            }
            Ok(NativeValidation {
                width: result.width,
                height: result.height,
                frames: result.frames,
                peak_allocation_bytes: result.peak_allocation_bytes,
                live_allocation_bytes: result.live_allocation_bytes,
                allocation_attempts: result.allocation_attempts,
                successful_allocations: result.successful_allocations,
                successful_frees: result.successful_frees,
            })
        }
        STATUS_INVALID => Err(NativeCodecFailure::Invalid),
        STATUS_PROFILE_UNSUPPORTED => Err(NativeCodecFailure::ProfileUnsupported),
        STATUS_DIMENSIONS_INVALID => Err(NativeCodecFailure::DimensionsInvalid),
        STATUS_RESOURCE_LIMIT | STATUS_CONCURRENCY_LIMIT => Err(NativeCodecFailure::ResourceLimit),
        STATUS_INTERNAL => Err(NativeCodecFailure::Internal),
        _ => Err(NativeCodecFailure::Internal),
    }
}

fn validate_basic(
    validator: BasicValidator,
    bytes: &[u8],
    allocation_limit: u64,
) -> Result<NativeValidation, NativeCodecFailure> {
    if !abi_is_compatible() {
        return Err(NativeCodecFailure::Internal);
    }
    let _guard = try_native_call_lock()?;
    let mut result = NativeCodecResult::default();
    // SAFETY: the shim borrows the input only for this call, accepts zero length,
    // and receives a valid writable result pointer. It returns no owned pointer.
    let status = unsafe { validator(bytes.as_ptr(), bytes.len(), allocation_limit, &mut result) };
    let mapped = map_result(status, result)?;
    let effective_limit = if allocation_limit == 0 || allocation_limit > MAX_DECODER_WORK_BYTES {
        MAX_DECODER_WORK_BYTES
    } else {
        allocation_limit
    };
    if mapped.peak_allocation_bytes > effective_limit {
        return Err(NativeCodecFailure::Internal);
    }
    Ok(mapped)
}

#[cfg(test)]
fn validate_with_options(
    validator: OptionsValidator,
    bytes: &[u8],
    options: NativeValidationOptions,
) -> Result<NativeValidation, NativeCodecFailure> {
    if !abi_is_compatible() {
        return Err(NativeCodecFailure::Internal);
    }
    let (status, result) = call_with_options_raw(validator, bytes, options);
    let mapped = map_result(status, result)?;
    let effective_limit =
        if options.allocation_limit == 0 || options.allocation_limit > MAX_DECODER_WORK_BYTES {
            MAX_DECODER_WORK_BYTES
        } else {
            options.allocation_limit
        };
    if mapped.peak_allocation_bytes > effective_limit {
        return Err(NativeCodecFailure::Internal);
    }
    Ok(mapped)
}

#[cfg(test)]
fn call_with_options_raw(
    validator: OptionsValidator,
    bytes: &[u8],
    options: NativeValidationOptions,
) -> (u32, NativeCodecResult) {
    let _guard = native_test_lock();
    call_with_options_unlocked(validator, bytes, options)
}

#[cfg(test)]
fn call_with_options_unlocked(
    validator: OptionsValidator,
    bytes: &[u8],
    options: NativeValidationOptions,
) -> (u32, NativeCodecResult) {
    let native_options = NativeCodecOptions {
        allocation_limit: options.allocation_limit,
        external_live_bytes: options.external_live_bytes,
        fail_allocation_at: options.fail_allocation_at,
    };
    let mut result = NativeCodecResult::default();
    // SAFETY: both borrowed inputs and the writable result outlive the call; the
    // C boundary is synchronous and retains no pointer.
    let status = unsafe { validator(bytes.as_ptr(), bytes.len(), &native_options, &mut result) };
    (status, result)
}

#[cfg(test)]
fn validate_with_injected_options(
    validator: OptionsValidator,
    bytes: &[u8],
    options: NativeValidationOptions,
) -> Result<NativeValidation, NativeCodecFailure> {
    if !abi_is_compatible() {
        return Err(NativeCodecFailure::Internal);
    }
    let _guard = try_native_call_lock()?;
    let (status, result) = call_with_options_unlocked(validator, bytes, options);
    let mapped = map_result(status, result)?;
    let effective_limit =
        if options.allocation_limit == 0 || options.allocation_limit > MAX_DECODER_WORK_BYTES {
            MAX_DECODER_WORK_BYTES
        } else {
            options.allocation_limit
        };
    if mapped.peak_allocation_bytes > effective_limit {
        return Err(NativeCodecFailure::Internal);
    }
    Ok(mapped)
}

pub(crate) fn validate_jpeg(
    bytes: &[u8],
    allocation_limit: u64,
) -> Result<NativeValidation, NativeCodecFailure> {
    #[cfg(test)]
    if let Some(options) = injected_validation_options(allocation_limit) {
        return validate_with_injected_options(sbls_jpeg_validate_with_options, bytes, options);
    }
    validate_basic(sbls_jpeg_validate, bytes, allocation_limit)
}

pub(crate) fn validate_webp(
    bytes: &[u8],
    allocation_limit: u64,
) -> Result<NativeValidation, NativeCodecFailure> {
    #[cfg(test)]
    if let Some(options) = injected_validation_options(allocation_limit) {
        return validate_with_injected_options(sbls_webp_validate_with_options, bytes, options);
    }
    validate_basic(sbls_webp_validate, bytes, allocation_limit)
}

#[cfg(test)]
pub(crate) fn validate_jpeg_for_test(
    bytes: &[u8],
    options: NativeValidationOptions,
) -> Result<NativeValidation, NativeCodecFailure> {
    validate_with_options(sbls_jpeg_validate_with_options, bytes, options)
}

#[cfg(test)]
pub(crate) fn validate_webp_for_test(
    bytes: &[u8],
    options: NativeValidationOptions,
) -> Result<NativeValidation, NativeCodecFailure> {
    validate_with_options(sbls_webp_validate_with_options, bytes, options)
}

#[cfg(test)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct NativeProbeResult {
    status: Result<(), NativeCodecFailure>,
    peak_allocation_bytes: u64,
    live_allocation_bytes: u64,
    allocation_attempts: u64,
    successful_allocations: u64,
    successful_frees: u64,
}

#[cfg(test)]
fn ledger_probe(
    scenario: u32,
    allocation_limit: u64,
    first: u64,
    second: u64,
    fail_allocation_at: u64,
) -> NativeProbeResult {
    let _guard = native_test_lock();
    let mut result = NativeCodecResult::default();
    // SAFETY: the probe receives scalar values and a valid result out-pointer;
    // it never retains caller memory and drains its operation before returning.
    let returned = unsafe {
        sbls_codec_ledger_probe(
            scenario,
            allocation_limit,
            first,
            second,
            fail_allocation_at,
            &mut result,
        )
    };
    let status = if returned != result.status
        || (returned != STATUS_INTERNAL
            && (result.live_allocation_bytes != 0
                || result.successful_allocations != result.successful_frees))
    {
        Err(NativeCodecFailure::Internal)
    } else {
        match returned {
            STATUS_OK => Ok(()),
            STATUS_INVALID => Err(NativeCodecFailure::Invalid),
            STATUS_PROFILE_UNSUPPORTED => Err(NativeCodecFailure::ProfileUnsupported),
            STATUS_DIMENSIONS_INVALID => Err(NativeCodecFailure::DimensionsInvalid),
            STATUS_RESOURCE_LIMIT | STATUS_CONCURRENCY_LIMIT => {
                Err(NativeCodecFailure::ResourceLimit)
            }
            _ => Err(NativeCodecFailure::Internal),
        }
    };
    NativeProbeResult {
        status,
        peak_allocation_bytes: result.peak_allocation_bytes,
        live_allocation_bytes: result.live_allocation_bytes,
        allocation_attempts: result.allocation_attempts,
        successful_allocations: result.successful_allocations,
        successful_frees: result.successful_frees,
    }
}

#[cfg(test)]
mod tests {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine as _;

    use super::*;

    fn append_segment(target: &mut Vec<u8>, marker: u8, payload: &[u8]) {
        target.extend_from_slice(&[0xff, marker]);
        let length = u16::try_from(payload.len() + 2).unwrap();
        target.extend_from_slice(&length.to_be_bytes());
        target.extend_from_slice(payload);
    }

    fn jpeg_fixture(progressive: bool, components: u8) -> Vec<u8> {
        let mut bytes = vec![0xff, 0xd8];
        let mut quantization = vec![0u8];
        quantization.extend_from_slice(&[1u8; 64]);
        append_segment(&mut bytes, 0xdb, &quantization);

        let mut frame = vec![8, 0, 1, 0, 1, components];
        for component in 1..=components {
            frame.extend_from_slice(&[component, 0x11, 0]);
        }
        append_segment(&mut bytes, if progressive { 0xc2 } else { 0xc0 }, &frame);

        let mut huffman = Vec::new();
        huffman.push(0x00);
        huffman.extend_from_slice(&[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        huffman.push(0x00);
        huffman.push(0x10);
        huffman.extend_from_slice(&[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        huffman.push(0x00);
        append_segment(&mut bytes, 0xc4, &huffman);

        if progressive {
            let mut dc_scan = vec![components];
            for component in 1..=components {
                dc_scan.extend_from_slice(&[component, 0x00]);
            }
            dc_scan.extend_from_slice(&[0, 0, 0]);
            append_segment(&mut bytes, 0xda, &dc_scan);
            bytes.push(if components == 1 { 0x7f } else { 0x1f });
            for component in 1..=components {
                append_segment(&mut bytes, 0xda, &[1, component, 0x00, 1, 63, 0]);
                bytes.push(0x7f);
            }
        } else {
            let mut scan = vec![components];
            for component in 1..=components {
                scan.extend_from_slice(&[component, 0x00]);
            }
            scan.extend_from_slice(&[0, 63, 0]);
            append_segment(&mut bytes, 0xda, &scan);
            bytes.push(match components {
                1 => 0x3f,
                2 => 0x0f,
                3 => 0x03,
                4 => 0x00,
                _ => 0x3f,
            });
        }
        bytes.extend_from_slice(&[0xff, 0xd9]);
        bytes
    }

    fn webp_fixture() -> Vec<u8> {
        STANDARD
            .decode("UklGRh4AAABXRUJQVlA4TBEAAAAvAUAAAAdQkTYUp/+BiOh/AAA=")
            .unwrap()
    }

    fn assert_clean(result: NativeCodecResult) {
        assert_eq!(result.live_allocation_bytes, 0);
        assert_eq!(
            result.successful_allocations, result.successful_frees,
            "every operation-owned allocation must be released"
        );
    }

    #[test]
    fn native_abi_layout_matches_rust_mirrors() {
        // SAFETY: ABI queries return constants and access no caller memory.
        unsafe {
            assert_eq!(sbls_codec_abi_version(), NATIVE_CODEC_ABI_VERSION);
            assert_eq!(sbls_codec_result_size(), size_of::<NativeCodecResult>());
            assert_eq!(
                sbls_codec_operation_size(),
                size_of::<NativeCodecOperation>()
            );
            assert_eq!(
                sbls_codec_operation_alignment(),
                align_of::<NativeCodecOperation>()
            );
            assert!(sbls_codec_allocation_header_size() >= size_of::<usize>() * 4);
        }
    }

    #[test]
    fn ledger_accepts_exact_boundary_and_rejects_one_byte_over() {
        let _schedule = native_test_schedule_lock();
        // SAFETY: the query returns a compile-time size.
        let header = unsafe { sbls_codec_allocation_header_size() as u64 };
        let payload = 64u64;
        let exact = ledger_probe(0, header + payload, payload, 0, 0);
        assert_eq!(exact.status, Ok(()));
        assert_eq!(exact.peak_allocation_bytes, header + payload);
        assert_eq!(exact.live_allocation_bytes, 0);
        assert_eq!(exact.successful_allocations, 1);
        assert_eq!(exact.successful_frees, 1);

        let denied = ledger_probe(0, header + payload - 1, payload, 0, 0);
        assert_eq!(denied.status, Err(NativeCodecFailure::ResourceLimit));
        assert_eq!(denied.live_allocation_bytes, 0);
        assert_eq!(denied.successful_allocations, 0);
        assert_eq!(denied.successful_frees, 0);
    }

    #[test]
    fn ledger_checks_calloc_realloc_and_fault_cleanup() {
        let _schedule = native_test_schedule_lock();
        // SAFETY: the query returns a compile-time size.
        let header = unsafe { sbls_codec_allocation_header_size() as u64 };
        let transient_realloc_peak = (header + 8) + (header + 64);
        let realloc = ledger_probe(1, transient_realloc_peak, 8, 64, 0);
        assert_eq!(realloc.status, Ok(()));
        assert_eq!(realloc.peak_allocation_bytes, transient_realloc_peak);
        assert_eq!(realloc.successful_allocations, 1);
        assert_eq!(realloc.successful_frees, 1);

        let denied_realloc = ledger_probe(1, transient_realloc_peak - 1, 8, 64, 0);
        assert_eq!(
            denied_realloc.status,
            Err(NativeCodecFailure::ResourceLimit)
        );
        assert_eq!(denied_realloc.peak_allocation_bytes, header + 8);
        assert_eq!(denied_realloc.live_allocation_bytes, 0);
        assert_eq!(denied_realloc.successful_allocations, 1);
        assert_eq!(denied_realloc.successful_frees, 1);

        {
            let _native = native_test_lock();
            let mut exact_ceiling = NativeCodecOperation::default();
            // SAFETY: the mirrored operation layout is ABI-checked, each
            // pointer remains operation-owned, and all allocations are freed
            // before ending the operation.
            unsafe {
                sbls_codec_operation_init(
                    &mut exact_ceiling,
                    MAX_DECODER_WORK_BYTES,
                    MAX_DECODER_WORK_BYTES - transient_realloc_peak,
                );
                assert_eq!(sbls_codec_test_begin(&mut exact_ceiling), STATUS_OK);
                let allocation = sbls_codec_test_alloc(8);
                assert!(!allocation.is_null());
                let replacement = sbls_codec_test_realloc(allocation, 64);
                assert!(!replacement.is_null());
                sbls_codec_test_free(replacement);
                assert_eq!(sbls_codec_test_end(&mut exact_ceiling), STATUS_OK);
            }
            assert_eq!(exact_ceiling.peak_total_bytes, MAX_DECODER_WORK_BYTES);
            assert_eq!(exact_ceiling.current_native_bytes, 0);
            assert_eq!(exact_ceiling.successful_allocations, 1);
            assert_eq!(exact_ceiling.successful_frees, 1);

            let mut one_over_ceiling = NativeCodecOperation::default();
            // SAFETY: as above; failed realloc retains the original pointer,
            // which is explicitly freed before deterministic finalization.
            unsafe {
                sbls_codec_operation_init(
                    &mut one_over_ceiling,
                    MAX_DECODER_WORK_BYTES,
                    MAX_DECODER_WORK_BYTES - transient_realloc_peak + 1,
                );
                assert_eq!(sbls_codec_test_begin(&mut one_over_ceiling), STATUS_OK);
                let allocation = sbls_codec_test_alloc(8);
                assert!(!allocation.is_null());
                assert!(sbls_codec_test_realloc(allocation, 64).is_null());
                sbls_codec_test_free(allocation);
                assert_eq!(
                    sbls_codec_test_end(&mut one_over_ceiling),
                    STATUS_RESOURCE_LIMIT
                );
            }
            assert!(one_over_ceiling.peak_total_bytes < MAX_DECODER_WORK_BYTES);
            assert_eq!(one_over_ceiling.current_native_bytes, 0);
            assert_eq!(one_over_ceiling.successful_allocations, 1);
            assert_eq!(one_over_ceiling.successful_frees, 1);
        }

        let overflow = ledger_probe(2, 0, u64::MAX, 2, 0);
        assert_eq!(overflow.status, Err(NativeCodecFailure::ResourceLimit));
        assert_eq!(overflow.live_allocation_bytes, 0);

        let injected = ledger_probe(1, transient_realloc_peak, 8, 64, 2);
        assert_eq!(injected.status, Err(NativeCodecFailure::ResourceLimit));
        assert_eq!(injected.allocation_attempts, 2);
        assert_eq!(injected.live_allocation_bytes, 0);
        assert_eq!(injected.successful_allocations, injected.successful_frees);

        let later = ledger_probe(0, header + 1, 1, 0, 0);
        assert_eq!(later.status, Ok(()));
        assert_eq!(later.live_allocation_bytes, 0);
    }

    #[test]
    fn global_validator_lease_rejects_second_thread_then_recovers() {
        let _schedule = native_test_schedule_lock();
        let nested_probe = ledger_probe(3, MAX_DECODER_WORK_BYTES, 0, 0, 0);
        assert_eq!(nested_probe.status, Ok(()));
        assert_eq!(nested_probe.live_allocation_bytes, 0);

        let _guard = native_test_lock();
        let mut first = NativeCodecOperation::default();
        // SAFETY: the mirrored operation layout is asserted in a separate test,
        // and every pointer remains valid for the duration of each call.
        unsafe {
            sbls_codec_operation_init(&mut first, 0, 0);
            assert_eq!(sbls_codec_test_begin(&mut first), STATUS_OK);
        }

        let second_status = std::thread::scope(|scope| {
            scope
                .spawn(|| {
                    let mut second = NativeCodecOperation::default();
                    // SAFETY: the operation is thread-local and outlives this call.
                    unsafe {
                        sbls_codec_operation_init(&mut second, 0, 0);
                        sbls_codec_test_begin(&mut second)
                    }
                })
                .join()
                .unwrap()
        });
        assert_eq!(second_status, STATUS_CONCURRENCY_LIMIT);
        // SAFETY: `first` owns the active lease on this thread.
        unsafe {
            assert_eq!(sbls_codec_test_end(&mut first), STATUS_OK);
        }
        assert_eq!(first.current_native_bytes, 0);
        assert_eq!(first.active, 0);

        let mut later = NativeCodecOperation::default();
        // SAFETY: the prior lease was released and this operation remains valid.
        unsafe {
            sbls_codec_operation_init(&mut later, 0, 0);
            assert_eq!(sbls_codec_test_begin(&mut later), STATUS_OK);
            assert_eq!(sbls_codec_test_end(&mut later), STATUS_OK);
        }
    }

    #[test]
    fn rust_boundary_rejects_busy_without_blocking_then_recovers() {
        let _schedule = native_test_schedule_lock();
        let webp = webp_fixture();
        let guard = native_test_lock();
        assert_eq!(
            validate_webp(&webp, MAX_DECODER_WORK_BYTES),
            Err(NativeCodecFailure::ResourceLimit)
        );
        drop(guard);
        assert!(validate_webp(&webp, MAX_DECODER_WORK_BYTES).is_ok());
    }

    fn assert_every_allocation_failure_is_clean(
        validator: OptionsValidator,
        bytes: &[u8],
    ) -> NativeCodecResult {
        let options = NativeValidationOptions::production(MAX_DECODER_WORK_BYTES);
        let (status, success) = call_with_options_raw(validator, bytes, options);
        assert_eq!(status, STATUS_OK);
        assert_clean(success);
        assert!(success.allocation_attempts > 0);

        for attempt in 1..=success.allocation_attempts {
            let (status, failed) = call_with_options_raw(
                validator,
                bytes,
                NativeValidationOptions {
                    allocation_limit: MAX_DECODER_WORK_BYTES,
                    external_live_bytes: 0,
                    fail_allocation_at: attempt,
                },
            );
            assert_eq!(
                status, STATUS_RESOURCE_LIMIT,
                "allocation attempt {attempt} must produce the typed resource limit"
            );
            assert_clean(failed);
        }
        success
    }

    #[test]
    fn jpeg_decoder_allocation_failures_are_typed_and_clean() {
        let _schedule = native_test_schedule_lock();
        let baseline = jpeg_fixture(false, 3);
        let success =
            assert_every_allocation_failure_is_clean(sbls_jpeg_validate_with_options, &baseline);
        assert_eq!((success.width, success.height, success.frames), (1, 1, 1));

        let progressive = jpeg_fixture(true, 1);
        let decoded = validate_jpeg_for_test(
            &progressive,
            NativeValidationOptions::production(MAX_DECODER_WORK_BYTES),
        )
        .unwrap();
        assert_eq!((decoded.width, decoded.height, decoded.frames), (1, 1, 1));

        assert_eq!(
            validate_jpeg_for_test(
                b"not a jpeg",
                NativeValidationOptions::production(MAX_DECODER_WORK_BYTES)
            ),
            Err(NativeCodecFailure::Invalid)
        );
        assert!(validate_jpeg(&baseline, MAX_DECODER_WORK_BYTES).is_ok());

        let unsupported_components = jpeg_fixture(false, 4);
        let (unsupported_status, unsupported_result) = call_with_options_raw(
            sbls_jpeg_validate_with_options,
            &unsupported_components,
            NativeValidationOptions::production(MAX_DECODER_WORK_BYTES),
        );
        assert_eq!(unsupported_status, STATUS_PROFILE_UNSUPPORTED);
        assert!(unsupported_result.allocation_attempts > 0);
        assert_clean(unsupported_result);
        for attempt in 1..=unsupported_result.allocation_attempts {
            let (status, failed) = call_with_options_raw(
                sbls_jpeg_validate_with_options,
                &unsupported_components,
                NativeValidationOptions {
                    allocation_limit: MAX_DECODER_WORK_BYTES,
                    external_live_bytes: 0,
                    fail_allocation_at: attempt,
                },
            );
            assert_eq!(status, STATUS_RESOURCE_LIMIT);
            assert_clean(failed);
        }

        let mut corrupt_unsupported = unsupported_components;
        corrupt_unsupported.remove(corrupt_unsupported.len() - 3);
        let (corrupt_status, corrupt_result) = call_with_options_raw(
            sbls_jpeg_validate_with_options,
            &corrupt_unsupported,
            NativeValidationOptions::production(MAX_DECODER_WORK_BYTES),
        );
        assert_eq!(corrupt_status, STATUS_INVALID);
        assert!(corrupt_result.allocation_attempts > 0);
        assert_clean(corrupt_result);
        assert!(validate_jpeg(&baseline, MAX_DECODER_WORK_BYTES).is_ok());
    }

    #[test]
    fn webp_decoder_allocation_failures_are_typed_and_clean() {
        let _schedule = native_test_schedule_lock();
        let webp = webp_fixture();
        let success =
            assert_every_allocation_failure_is_clean(sbls_webp_validate_with_options, &webp);
        assert_eq!((success.width, success.height, success.frames), (2, 2, 1));

        let exact = validate_webp_for_test(
            &webp,
            NativeValidationOptions {
                allocation_limit: success.peak_allocation_bytes,
                external_live_bytes: 0,
                fail_allocation_at: 0,
            },
        );
        assert!(exact.is_ok());
        if success.peak_allocation_bytes > 0 {
            assert_eq!(
                validate_webp_for_test(
                    &webp,
                    NativeValidationOptions {
                        allocation_limit: success.peak_allocation_bytes - 1,
                        external_live_bytes: 0,
                        fail_allocation_at: 0,
                    }
                ),
                Err(NativeCodecFailure::ResourceLimit)
            );
        }

        let exact_external = MAX_DECODER_WORK_BYTES - success.peak_allocation_bytes;
        let (exact_status, exact_ceiling) = call_with_options_raw(
            sbls_webp_validate_with_options,
            &webp,
            NativeValidationOptions {
                // A value above the production ceiling must clamp, never widen it.
                allocation_limit: u64::MAX,
                external_live_bytes: exact_external,
                fail_allocation_at: 0,
            },
        );
        assert_eq!(exact_status, STATUS_OK);
        assert_eq!(exact_ceiling.peak_allocation_bytes, MAX_DECODER_WORK_BYTES);
        assert_clean(exact_ceiling);

        let (over_status, one_over_ceiling) = call_with_options_raw(
            sbls_webp_validate_with_options,
            &webp,
            NativeValidationOptions {
                allocation_limit: u64::MAX,
                external_live_bytes: exact_external + 1,
                fail_allocation_at: 0,
            },
        );
        assert_eq!(over_status, STATUS_RESOURCE_LIMIT);
        assert!(one_over_ceiling.peak_allocation_bytes <= MAX_DECODER_WORK_BYTES);
        assert_clean(one_over_ceiling);
        assert!(validate_webp(&webp, MAX_DECODER_WORK_BYTES).is_ok());
    }
}
