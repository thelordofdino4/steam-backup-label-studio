use std::io;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::http::HeaderMap;
use tauri::ipc::{InvokeBody, Request, Response};

use crate::project_binary_io::{
    self, BinaryProjectReadError, BinaryProjectWriteError, MAX_BINARY_PROJECT_BYTES,
};
use crate::project_file::{AtomicProjectWriteError, AtomicProjectWritePhase};

pub(crate) const PROJECT_PATH_HEADER_NAME: &str = "x-sbls-project-path-v1";
pub(crate) const MAX_PROJECT_PATH_UTF8_BYTES: usize = 4_096;
pub(crate) const MAX_PROJECT_PATH_HEADER_BYTES: usize = 4_096;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum ProjectFileFailureCode {
    FileTooLarge,
    ReadFailed,
    WriteFailed,
    AtomicValidateDestination,
    AtomicCreateTemporary,
    AtomicCollisionExhausted,
    AtomicWriteTemporary,
    AtomicFlushTemporary,
    AtomicSyncTemporary,
    AtomicCloseTemporary,
    AtomicReplaceDestination,
}

impl ProjectFileFailureCode {
    #[cfg(test)]
    const ALL: [Self; 11] = [
        Self::FileTooLarge,
        Self::ReadFailed,
        Self::WriteFailed,
        Self::AtomicValidateDestination,
        Self::AtomicCreateTemporary,
        Self::AtomicCollisionExhausted,
        Self::AtomicWriteTemporary,
        Self::AtomicFlushTemporary,
        Self::AtomicSyncTemporary,
        Self::AtomicCloseTemporary,
        Self::AtomicReplaceDestination,
    ];

    const fn as_str(self) -> &'static str {
        match self {
            Self::FileTooLarge => "project.file-too-large",
            Self::ReadFailed => "project.read-failed",
            Self::WriteFailed => "project.write-failed",
            Self::AtomicValidateDestination => "project.atomic-write.validate-destination",
            Self::AtomicCreateTemporary => "project.atomic-write.create-temporary",
            Self::AtomicCollisionExhausted => "project.atomic-write.collision-exhausted",
            Self::AtomicWriteTemporary => "project.atomic-write.write-temporary",
            Self::AtomicFlushTemporary => "project.atomic-write.flush-temporary",
            Self::AtomicSyncTemporary => "project.atomic-write.sync-temporary",
            Self::AtomicCloseTemporary => "project.atomic-write.close-temporary",
            Self::AtomicReplaceDestination => "project.atomic-write.replace-destination",
        }
    }

    const fn safe_message(self) -> &'static str {
        match self {
            Self::FileTooLarge => "The project input exceeds the supported size limit.",
            Self::ReadFailed => "The project file could not be read.",
            Self::WriteFailed => "The project file could not be written.",
            Self::AtomicValidateDestination => "The project destination is invalid.",
            Self::AtomicCreateTemporary => "A temporary project file could not be created safely.",
            Self::AtomicCollisionExhausted => {
                "A safe temporary project file name could not be reserved."
            }
            Self::AtomicWriteTemporary => "The project bytes could not be written completely.",
            Self::AtomicFlushTemporary => "The temporary project file could not be flushed.",
            Self::AtomicSyncTemporary => "The temporary project file could not be synchronized.",
            Self::AtomicCloseTemporary => {
                "The temporary project file could not be closed before replacement."
            }
            Self::AtomicReplaceDestination => {
                "The existing project file could not be replaced safely."
            }
        }
    }

    const fn from_atomic_phase(phase: AtomicProjectWritePhase) -> Self {
        match phase {
            AtomicProjectWritePhase::ValidateDestination => Self::AtomicValidateDestination,
            AtomicProjectWritePhase::CreateTemporary => Self::AtomicCreateTemporary,
            AtomicProjectWritePhase::CollisionExhausted => Self::AtomicCollisionExhausted,
            AtomicProjectWritePhase::WriteTemporary => Self::AtomicWriteTemporary,
            AtomicProjectWritePhase::FlushTemporary => Self::AtomicFlushTemporary,
            AtomicProjectWritePhase::SyncTemporary => Self::AtomicSyncTemporary,
            AtomicProjectWritePhase::CloseTemporary => Self::AtomicCloseTemporary,
            AtomicProjectWritePhase::ReplaceDestination => Self::AtomicReplaceDestination,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectFileCommandSecondaryCause {
    category: &'static str,
    operation: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    platform_code: Option<i32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectFileCommandCause {
    category: &'static str,
    operation: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    platform_code: Option<i32>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    secondary: Vec<ProjectFileCommandSecondaryCause>,
}

#[derive(Debug, Serialize)]
pub(crate) struct ProjectFileCommandFailure {
    status: &'static str,
    code: &'static str,
    recoverable: bool,
    message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    cause: Option<ProjectFileCommandCause>,
}

impl ProjectFileCommandFailure {
    fn new(code: ProjectFileFailureCode, cause: Option<ProjectFileCommandCause>) -> Self {
        Self {
            status: "failure",
            code: code.as_str(),
            recoverable: true,
            message: code.safe_message(),
            cause,
        }
    }

    fn request_failure(
        code: ProjectFileFailureCode,
        category: &'static str,
        operation: &'static str,
    ) -> Self {
        Self::new(
            code,
            Some(ProjectFileCommandCause {
                category,
                operation,
                platform_code: None,
                secondary: Vec::new(),
            }),
        )
    }

    fn file_too_large(operation: &'static str) -> Self {
        Self::request_failure(
            ProjectFileFailureCode::FileTooLarge,
            "size-limit-exceeded",
            operation,
        )
    }

    fn from_read(error: BinaryProjectReadError) -> Self {
        match error {
            BinaryProjectReadError::TooLarge => Self::file_too_large("project-binary-read-limit"),
            BinaryProjectReadError::Allocation => Self::request_failure(
                ProjectFileFailureCode::ReadFailed,
                "allocation-denied",
                "project-binary-read-allocation",
            ),
            BinaryProjectReadError::Io { operation, source } => Self::new(
                ProjectFileFailureCode::ReadFailed,
                Some(io_cause(operation, &source, Vec::new())),
            ),
        }
    }

    fn from_write(error: BinaryProjectWriteError) -> Self {
        match error {
            BinaryProjectWriteError::TooLarge => Self::file_too_large("project-binary-write-limit"),
            BinaryProjectWriteError::Atomic(error) => Self::from_atomic(error),
        }
    }

    fn from_atomic(error: AtomicProjectWriteError) -> Self {
        let code = ProjectFileFailureCode::from_atomic_phase(error.phase());
        let secondary = error
            .secondary_failures()
            .map(|(operation, source)| ProjectFileCommandSecondaryCause {
                category: io_category(source.kind()),
                operation,
                platform_code: source.raw_os_error(),
            })
            .collect();
        Self::new(
            code,
            Some(io_cause(
                error.phase().operation_id(),
                error.io_error(),
                secondary,
            )),
        )
    }
}

#[derive(Debug, Serialize)]
pub(crate) struct ProjectFileCommandSuccess {
    status: &'static str,
}

impl ProjectFileCommandSuccess {
    const fn new() -> Self {
        Self { status: "success" }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum PathMetadataFailure {
    Missing,
    Duplicate,
    Invalid,
    TooLarge,
    Undecodable,
    Allocation,
}

impl PathMetadataFailure {
    const fn category(self) -> &'static str {
        match self {
            Self::Missing => "path-metadata-missing",
            Self::Duplicate => "path-metadata-duplicate",
            Self::Invalid => "path-metadata-invalid",
            Self::TooLarge => "path-metadata-too-large",
            Self::Undecodable => "path-metadata-undecodable",
            Self::Allocation => "path-metadata-allocation-denied",
        }
    }
}

fn io_category(kind: io::ErrorKind) -> &'static str {
    match kind {
        io::ErrorKind::NotFound => "not-found",
        io::ErrorKind::PermissionDenied => "permission-denied",
        io::ErrorKind::AlreadyExists => "already-exists",
        io::ErrorKind::InvalidInput => "invalid-input",
        io::ErrorKind::InvalidData => "invalid-data",
        io::ErrorKind::Interrupted => "interrupted",
        io::ErrorKind::WriteZero => "write-zero",
        io::ErrorKind::UnexpectedEof => "unexpected-eof",
        io::ErrorKind::WouldBlock => "would-block",
        io::ErrorKind::TimedOut => "timed-out",
        io::ErrorKind::Unsupported => "unsupported",
        _ => "io",
    }
}

fn io_cause(
    operation: &'static str,
    error: &io::Error,
    secondary: Vec<ProjectFileCommandSecondaryCause>,
) -> ProjectFileCommandCause {
    ProjectFileCommandCause {
        category: io_category(error.kind()),
        operation,
        platform_code: error.raw_os_error(),
        secondary,
    }
}

fn hex_value(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

fn is_unreserved(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~')
}

fn decode_canonical_path(encoded: &str) -> Result<PathBuf, PathMetadataFailure> {
    if encoded.is_empty() {
        return Err(PathMetadataFailure::Invalid);
    }
    if encoded.len() > MAX_PROJECT_PATH_HEADER_BYTES {
        return Err(PathMetadataFailure::TooLarge);
    }

    let source = encoded.as_bytes();
    let mut decoded = Vec::new();
    decoded
        .try_reserve_exact(source.len())
        .map_err(|_| PathMetadataFailure::Allocation)?;
    let mut index = 0;
    while index < source.len() {
        let byte = source[index];
        if is_unreserved(byte) {
            decoded.push(byte);
            index += 1;
            continue;
        }
        if byte != b'%' || index + 2 >= source.len() {
            return Err(PathMetadataFailure::Invalid);
        }
        let high = hex_value(source[index + 1]).ok_or(PathMetadataFailure::Invalid)?;
        let low = hex_value(source[index + 2]).ok_or(PathMetadataFailure::Invalid)?;
        let value = (high << 4) | low;
        if is_unreserved(value) {
            return Err(PathMetadataFailure::Invalid);
        }
        decoded.push(value);
        index += 3;
    }

    if decoded.is_empty() || decoded.len() > MAX_PROJECT_PATH_UTF8_BYTES || decoded.contains(&0) {
        return Err(PathMetadataFailure::Invalid);
    }
    let decoded = String::from_utf8(decoded).map_err(|_| PathMetadataFailure::Undecodable)?;
    Ok(PathBuf::from(decoded))
}

fn path_from_headers(headers: &HeaderMap) -> Result<PathBuf, PathMetadataFailure> {
    let mut values = headers.get_all(PROJECT_PATH_HEADER_NAME).iter();
    let value = values.next().ok_or(PathMetadataFailure::Missing)?;
    if values.next().is_some() {
        return Err(PathMetadataFailure::Duplicate);
    }
    let encoded = value
        .to_str()
        .map_err(|_| PathMetadataFailure::Undecodable)?;
    decode_canonical_path(encoded)
}

fn request_path(
    headers: &HeaderMap,
    fallback_code: ProjectFileFailureCode,
    operation: &'static str,
) -> Result<PathBuf, ProjectFileCommandFailure> {
    path_from_headers(headers).map_err(|error| {
        ProjectFileCommandFailure::request_failure(fallback_code, error.category(), operation)
    })
}

pub(crate) fn read_project_bytes_request_with<F>(
    headers: &HeaderMap,
    body: &InvokeBody,
    read_file: F,
) -> Result<Vec<u8>, ProjectFileCommandFailure>
where
    F: FnOnce(&Path) -> Result<Vec<u8>, BinaryProjectReadError>,
{
    match body {
        InvokeBody::Raw(bytes) if bytes.is_empty() => {}
        InvokeBody::Raw(_) => {
            return Err(ProjectFileCommandFailure::request_failure(
                ProjectFileFailureCode::ReadFailed,
                "read-body-not-empty",
                "project-binary-read-request",
            ));
        }
        InvokeBody::Json(_) => {
            return Err(ProjectFileCommandFailure::request_failure(
                ProjectFileFailureCode::ReadFailed,
                "raw-body-required",
                "project-binary-read-request",
            ));
        }
    }

    let path = request_path(
        headers,
        ProjectFileFailureCode::ReadFailed,
        "project-binary-read-path",
    )?;
    read_file(&path).map_err(ProjectFileCommandFailure::from_read)
}

fn read_request_with<F>(
    headers: &HeaderMap,
    body: &InvokeBody,
    read_file: F,
) -> Result<Response, ProjectFileCommandFailure>
where
    F: FnOnce(&Path) -> Result<Vec<u8>, BinaryProjectReadError>,
{
    read_project_bytes_request_with(headers, body, read_file).map(Response::new)
}

fn write_request_with<F>(
    headers: &HeaderMap,
    body: &InvokeBody,
    limit: usize,
    write_file: F,
) -> Result<ProjectFileCommandSuccess, ProjectFileCommandFailure>
where
    F: FnOnce(&Path, &[u8]) -> Result<(), BinaryProjectWriteError>,
{
    let bytes = match body {
        InvokeBody::Raw(bytes) => bytes.as_slice(),
        InvokeBody::Json(_) => {
            return Err(ProjectFileCommandFailure::request_failure(
                ProjectFileFailureCode::WriteFailed,
                "raw-body-required",
                "project-binary-write-request",
            ));
        }
    };
    if bytes.len() > limit {
        return Err(ProjectFileCommandFailure::file_too_large(
            "project-binary-write-request",
        ));
    }
    let path = request_path(
        headers,
        ProjectFileFailureCode::WriteFailed,
        "project-binary-write-path",
    )?;
    write_file(&path, bytes).map_err(ProjectFileCommandFailure::from_write)?;
    Ok(ProjectFileCommandSuccess::new())
}

#[tauri::command]
pub(crate) fn read_binary_project_file(
    request: Request<'_>,
) -> Result<Response, ProjectFileCommandFailure> {
    read_request_with(request.headers(), request.body(), |path| {
        project_binary_io::read(path)
    })
}

#[tauri::command]
pub(crate) fn write_binary_project_file(
    request: Request<'_>,
) -> Result<ProjectFileCommandSuccess, ProjectFileCommandFailure> {
    write_request_with(
        request.headers(),
        request.body(),
        MAX_BINARY_PROJECT_BYTES,
        |path, bytes| project_binary_io::write(path, bytes),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};
    use tauri::http::HeaderValue;
    use tauri::ipc::{InvokeResponseBody, IpcResponse};

    static TEST_DIRECTORY_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    struct TestDirectory {
        path: PathBuf,
    }

    impl TestDirectory {
        fn new(label: &str) -> Self {
            for _ in 0..64 {
                let sequence = TEST_DIRECTORY_SEQUENCE.fetch_add(1, Ordering::Relaxed);
                let path = std::env::temp_dir().join(format!(
                    "sbls-project-command-{label}-{}-{sequence}",
                    std::process::id()
                ));
                match fs::create_dir(&path) {
                    Ok(()) => return Self { path },
                    Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
                    Err(error) => panic!("failed to create test directory {path:?}: {error}"),
                }
            }
            panic!("exhausted test-directory candidates for {label}");
        }

        fn join(&self, name: impl AsRef<Path>) -> PathBuf {
            self.path.join(name)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn encode_path(path: &str) -> String {
        let mut encoded = String::new();
        for byte in path.as_bytes() {
            if is_unreserved(*byte) {
                encoded.push(char::from(*byte));
            } else {
                const HEX: &[u8; 16] = b"0123456789ABCDEF";
                encoded.push('%');
                encoded.push(char::from(HEX[usize::from(*byte >> 4)]));
                encoded.push(char::from(HEX[usize::from(*byte & 0x0f)]));
            }
        }
        encoded
    }

    fn headers_for(path: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            PROJECT_PATH_HEADER_NAME,
            HeaderValue::from_str(&encode_path(path)).unwrap(),
        );
        headers
    }

    fn failure_json(error: ProjectFileCommandFailure) -> serde_json::Value {
        serde_json::to_value(error).unwrap()
    }

    #[test]
    fn failure_code_registry_is_exact() {
        assert_eq!(
            ProjectFileFailureCode::ALL.map(ProjectFileFailureCode::as_str),
            [
                "project.file-too-large",
                "project.read-failed",
                "project.write-failed",
                "project.atomic-write.validate-destination",
                "project.atomic-write.create-temporary",
                "project.atomic-write.collision-exhausted",
                "project.atomic-write.write-temporary",
                "project.atomic-write.flush-temporary",
                "project.atomic-write.sync-temporary",
                "project.atomic-write.close-temporary",
                "project.atomic-write.replace-destination",
            ]
        );
        assert!(ProjectFileFailureCode::ALL
            .iter()
            .all(|code| !code.safe_message().is_empty()));
    }

    #[test]
    fn read_success_is_raw_and_preserves_exact_arbitrary_bytes() {
        let expected = vec![0, 0xff, 0xfe, 1, 0];
        let response = read_request_with(
            &headers_for("C:\\Projects\\保存 & 100%.sbls"),
            &InvokeBody::Raw(Vec::new()),
            |path| {
                assert_eq!(path, Path::new("C:\\Projects\\保存 & 100%.sbls"));
                Ok(expected.clone())
            },
        )
        .unwrap();

        match response.body().unwrap() {
            InvokeResponseBody::Raw(actual) => assert_eq!(actual, expected),
            InvokeResponseBody::Json(_) => panic!("binary read returned a JSON response"),
        }
    }

    #[test]
    fn write_request_borrows_raw_body_and_returns_structured_success() {
        let body = InvokeBody::Raw(vec![0, 0xff, 0xfe, 4]);
        let source_pointer = match &body {
            InvokeBody::Raw(bytes) => bytes.as_ptr(),
            InvokeBody::Json(_) => unreachable!(),
        };
        let result = write_request_with(
            &headers_for("folder/project.sbls"),
            &body,
            MAX_BINARY_PROJECT_BYTES,
            |path, bytes| {
                assert_eq!(path, Path::new("folder/project.sbls"));
                assert_eq!(bytes.as_ptr(), source_pointer);
                assert_eq!(bytes, [0, 0xff, 0xfe, 4]);
                Ok(())
            },
        )
        .unwrap();

        assert_eq!(
            serde_json::to_value(result).unwrap(),
            json!({"status": "success"})
        );
    }

    #[test]
    fn read_and_write_reject_json_bodies_instead_of_byte_array_fallbacks() {
        for (body, code) in [
            (
                InvokeBody::Json(json!([])),
                ProjectFileFailureCode::ReadFailed,
            ),
            (
                InvokeBody::Json(json!([0, 1, 2])),
                ProjectFileFailureCode::WriteFailed,
            ),
        ] {
            let error = if code == ProjectFileFailureCode::ReadFailed {
                read_request_with(&headers_for("project.sbls"), &body, |_| Ok(Vec::new()))
                    .err()
                    .expect("JSON read body must be rejected")
            } else {
                write_request_with(&headers_for("project.sbls"), &body, 8, |_, _| Ok(()))
                    .unwrap_err()
            };
            let serialized = failure_json(error);
            assert_eq!(serialized["code"], code.as_str());
            assert_eq!(serialized["cause"]["category"], "raw-body-required");
        }
    }

    #[test]
    fn read_requires_an_empty_raw_request_body() {
        let error = read_request_with(
            &headers_for("project.sbls"),
            &InvokeBody::Raw(vec![1]),
            |_| Ok(Vec::new()),
        )
        .err()
        .expect("non-empty read body must be rejected");
        assert_eq!(
            failure_json(error)["cause"]["category"],
            "read-body-not-empty"
        );
    }

    #[test]
    fn path_metadata_is_canonical_bounded_and_exactly_once() {
        let expected = "C:\\Users\\Zoë Smith\\保存 & 100% (final).sbls";
        assert_eq!(
            path_from_headers(&headers_for(expected)).unwrap(),
            PathBuf::from(expected)
        );

        let missing = path_from_headers(&HeaderMap::new()).unwrap_err();
        assert_eq!(missing, PathMetadataFailure::Missing);

        let mut duplicate = headers_for("first.sbls");
        duplicate.append(
            PROJECT_PATH_HEADER_NAME,
            HeaderValue::from_static("second.sbls"),
        );
        assert_eq!(
            path_from_headers(&duplicate).unwrap_err(),
            PathMetadataFailure::Duplicate
        );

        for malformed in ["", "%", "%2f", "%41", "raw/path", "%00", "%FF"] {
            let mut headers = HeaderMap::new();
            headers.insert(
                PROJECT_PATH_HEADER_NAME,
                HeaderValue::from_str(malformed).unwrap(),
            );
            assert!(
                path_from_headers(&headers).is_err(),
                "accepted {malformed:?}"
            );
        }

        let oversized = "a".repeat(MAX_PROJECT_PATH_HEADER_BYTES + 1);
        let mut headers = HeaderMap::new();
        headers.insert(
            PROJECT_PATH_HEADER_NAME,
            HeaderValue::from_str(&oversized).unwrap(),
        );
        assert_eq!(
            path_from_headers(&headers).unwrap_err(),
            PathMetadataFailure::TooLarge
        );
    }

    #[test]
    fn path_failures_are_structured_without_path_content() {
        let secret = "SECRET-CUSTOMER-PATH";
        let mut malformed = HeaderMap::new();
        malformed.insert(
            PROJECT_PATH_HEADER_NAME,
            HeaderValue::from_str(&format!("%{secret}")).unwrap(),
        );
        let error = read_request_with(&malformed, &InvokeBody::Raw(Vec::new()), |_| Ok(Vec::new()))
            .err()
            .expect("malformed path metadata must be rejected");
        let serialized = serde_json::to_string(&error).unwrap();
        assert!(!serialized.contains(secret));
        assert!(serialized.contains("path-metadata-invalid"));
    }

    #[test]
    fn raw_write_limit_is_enforced_before_path_or_writer() {
        let mut called = false;
        let error = write_request_with(
            &HeaderMap::new(),
            &InvokeBody::Raw(vec![0; 9]),
            8,
            |_, _| {
                called = true;
                Ok(())
            },
        )
        .unwrap_err();
        assert!(!called);
        assert_eq!(failure_json(error)["code"], "project.file-too-large");
    }

    #[test]
    fn native_read_errors_are_safe_and_structured() {
        let secret = "SECRET-PATH-AND-OS-DETAIL";
        let error = ProjectFileCommandFailure::from_read(BinaryProjectReadError::Io {
            operation: "project-binary-read-content",
            source: io::Error::new(io::ErrorKind::PermissionDenied, secret),
        });
        let serialized = serde_json::to_string(&error).unwrap();

        assert!(!serialized.contains(secret));
        assert_eq!(failure_json(error)["code"], "project.read-failed");
    }

    #[test]
    fn every_atomic_phase_maps_to_its_exact_stable_code() {
        let cases = [
            (
                AtomicProjectWritePhase::ValidateDestination,
                "project.atomic-write.validate-destination",
            ),
            (
                AtomicProjectWritePhase::CreateTemporary,
                "project.atomic-write.create-temporary",
            ),
            (
                AtomicProjectWritePhase::CollisionExhausted,
                "project.atomic-write.collision-exhausted",
            ),
            (
                AtomicProjectWritePhase::WriteTemporary,
                "project.atomic-write.write-temporary",
            ),
            (
                AtomicProjectWritePhase::FlushTemporary,
                "project.atomic-write.flush-temporary",
            ),
            (
                AtomicProjectWritePhase::SyncTemporary,
                "project.atomic-write.sync-temporary",
            ),
            (
                AtomicProjectWritePhase::CloseTemporary,
                "project.atomic-write.close-temporary",
            ),
            (
                AtomicProjectWritePhase::ReplaceDestination,
                "project.atomic-write.replace-destination",
            ),
        ];

        for (phase, expected) in cases {
            let error = AtomicProjectWriteError::new(
                phase,
                io::Error::new(io::ErrorKind::PermissionDenied, "SECRET PRIMARY"),
            );
            let serialized = failure_json(ProjectFileCommandFailure::from_atomic(error));
            assert_eq!(serialized["code"], expected);
            assert_eq!(serialized["recoverable"], true);
            assert_eq!(serialized["cause"]["operation"], expected);
            assert!(!serialized.to_string().contains("SECRET PRIMARY"));
        }
    }

    #[test]
    fn atomic_cleanup_failure_is_retained_as_safe_secondary_data() {
        let error = AtomicProjectWriteError::new(
            AtomicProjectWritePhase::WriteTemporary,
            io::Error::new(io::ErrorKind::WriteZero, "SECRET PRIMARY"),
        )
        .with_secondary(
            "project.atomic-write.cleanup-remove-temporary",
            "temporary-file cleanup",
            io::Error::new(io::ErrorKind::PermissionDenied, "SECRET SECONDARY"),
        );
        let serialized = failure_json(ProjectFileCommandFailure::from_atomic(error));

        assert_eq!(serialized["cause"]["category"], "write-zero");
        assert_eq!(
            serialized["cause"]["secondary"][0],
            json!({
                "category": "permission-denied",
                "operation": "project.atomic-write.cleanup-remove-temporary"
            })
        );
        let text = serialized.to_string();
        assert!(!text.contains("SECRET PRIMARY"));
        assert!(!text.contains("SECRET SECONDARY"));
    }

    #[test]
    fn legacy_json_commands_and_direct_png_writer_remain_behaviorally_distinct() {
        let directory = TestDirectory::new("legacy-regression");
        let json_path = directory.join("project.sbls.json");
        let png_path = directory.join("export.png");
        let json_contents = "{\"title\":\"保存 💿\"}";
        let png_bytes = vec![0, 0xff, 0xfe, 7];

        crate::commands::files::write_project_file(
            json_path.to_string_lossy().into_owned(),
            json_contents.to_owned(),
        )
        .unwrap();
        assert_eq!(
            crate::commands::files::read_project_file(json_path.to_string_lossy().into_owned())
                .unwrap(),
            json_contents
        );

        crate::commands::files::write_binary_file(
            png_path.to_string_lossy().into_owned(),
            png_bytes.clone(),
        )
        .unwrap();
        assert_eq!(fs::read(png_path).unwrap(), png_bytes);
    }
}
