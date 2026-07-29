use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

use crate::project_binary_io::MAX_BINARY_PROJECT_BYTES;

const PROJECT_PACKAGE_LOCAL_FILE_SIGNATURE: [u8; 4] = [0x50, 0x4b, 0x03, 0x04];
const UTF8_BOM: [u8; 3] = [0xef, 0xbb, 0xbf];
const RECOGNITION_READ_CHUNK_BYTES: usize = 64 * 1024;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum RecognizedProjectFormat {
    LegacyJson,
    SblsPackageV1,
}

impl RecognizedProjectFormat {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::LegacyJson => "legacy-json",
            Self::SblsPackageV1 => "sbls-package-v1",
        }
    }
}

#[derive(Debug)]
pub(crate) enum ProjectFormatRecognitionError {
    TooLarge,
    Unsupported,
    Io {
        operation: &'static str,
        source: io::Error,
    },
}

impl ProjectFormatRecognitionError {
    fn io(operation: &'static str, source: io::Error) -> Self {
        Self::Io { operation, source }
    }
}

pub(crate) fn recognize(
    path: impl AsRef<Path>,
) -> Result<RecognizedProjectFormat, ProjectFormatRecognitionError> {
    let mut file = File::open(path.as_ref()).map_err(|error| {
        ProjectFormatRecognitionError::io("project-format-recognition-open", error)
    })?;
    let declared_length = file
        .metadata()
        .map_err(|error| {
            ProjectFormatRecognitionError::io("project-format-recognition-metadata", error)
        })?
        .len();

    recognize_with_limit(&mut file, Some(declared_length), MAX_BINARY_PROJECT_BYTES)
}

fn is_json_whitespace(byte: u8) -> bool {
    matches!(byte, b' ' | b'\t' | b'\r' | b'\n')
}

fn read_bounded<R: Read>(
    reader: &mut R,
    destination: &mut [u8],
    observed: &mut usize,
    limit: usize,
) -> Result<usize, ProjectFormatRecognitionError> {
    let limit_plus_one = limit
        .checked_add(1)
        .ok_or(ProjectFormatRecognitionError::TooLarge)?;
    let remaining_probe = limit_plus_one
        .checked_sub(*observed)
        .ok_or(ProjectFormatRecognitionError::TooLarge)?;
    let requested = remaining_probe.min(destination.len());
    if requested == 0 {
        return Err(ProjectFormatRecognitionError::TooLarge);
    }

    let read = loop {
        match reader.read(&mut destination[..requested]) {
            Ok(read) => break read,
            Err(error) if error.kind() == io::ErrorKind::Interrupted => continue,
            Err(error) => {
                return Err(ProjectFormatRecognitionError::io(
                    "project-format-recognition-content",
                    error,
                ));
            }
        }
    };
    *observed = observed
        .checked_add(read)
        .ok_or(ProjectFormatRecognitionError::TooLarge)?;
    if *observed > limit {
        return Err(ProjectFormatRecognitionError::TooLarge);
    }
    Ok(read)
}

fn recognize_legacy_prefix<R: Read>(
    reader: &mut R,
    initial: &[u8],
    initial_is_eof: bool,
    observed: &mut usize,
    limit: usize,
) -> Result<RecognizedProjectFormat, ProjectFormatRecognitionError> {
    let mut offset = 0;
    if initial.starts_with(&UTF8_BOM) {
        offset = UTF8_BOM.len();
    } else if initial.first() == Some(&UTF8_BOM[0]) {
        return Err(ProjectFormatRecognitionError::Unsupported);
    }

    for byte in &initial[offset..] {
        if is_json_whitespace(*byte) {
            continue;
        }
        return if *byte == b'{' {
            Ok(RecognizedProjectFormat::LegacyJson)
        } else {
            Err(ProjectFormatRecognitionError::Unsupported)
        };
    }
    if initial_is_eof {
        return Err(ProjectFormatRecognitionError::Unsupported);
    }

    let mut scratch = [0u8; RECOGNITION_READ_CHUNK_BYTES];
    loop {
        let read = read_bounded(reader, &mut scratch, observed, limit)?;
        if read == 0 {
            return Err(ProjectFormatRecognitionError::Unsupported);
        }
        for byte in &scratch[..read] {
            if is_json_whitespace(*byte) {
                continue;
            }
            return if *byte == b'{' {
                Ok(RecognizedProjectFormat::LegacyJson)
            } else {
                Err(ProjectFormatRecognitionError::Unsupported)
            };
        }
    }
}

fn recognize_with_limit<R: Read>(
    reader: &mut R,
    declared_length: Option<u64>,
    limit: usize,
) -> Result<RecognizedProjectFormat, ProjectFormatRecognitionError> {
    if declared_length.is_some_and(|length| length > limit as u64) {
        return Err(ProjectFormatRecognitionError::TooLarge);
    }

    let mut prefix = [0u8; PROJECT_PACKAGE_LOCAL_FILE_SIGNATURE.len()];
    let mut observed = 0;
    let mut prefix_length = 0;
    let mut reached_eof = false;
    while prefix_length < prefix.len() {
        let read = read_bounded(reader, &mut prefix[prefix_length..], &mut observed, limit)?;
        if read == 0 {
            reached_eof = true;
            break;
        }
        prefix_length += read;
    }

    if prefix_length == prefix.len() && prefix == PROJECT_PACKAGE_LOCAL_FILE_SIGNATURE {
        return Ok(RecognizedProjectFormat::SblsPackageV1);
    }

    recognize_legacy_prefix(
        reader,
        &prefix[..prefix_length],
        reached_eof,
        &mut observed,
        limit,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, OpenOptions};
    use std::io::{Cursor, Write};
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    struct TestFile {
        path: PathBuf,
    }

    impl TestFile {
        fn create(label: &str, suffix: &str, bytes: &[u8]) -> Self {
            for _ in 0..64 {
                let sequence = TEST_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
                let path = std::env::temp_dir().join(format!(
                    "sbls-format-recognition-{label}-{}-{sequence}.{suffix}",
                    std::process::id()
                ));
                match OpenOptions::new().write(true).create_new(true).open(&path) {
                    Ok(mut file) => {
                        file.write_all(bytes).unwrap();
                        return Self { path };
                    }
                    Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
                    Err(error) => panic!("failed to create test file {path:?}: {error}"),
                }
            }
            panic!("exhausted test-file candidates for {label}");
        }
    }

    impl Drop for TestFile {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.path);
        }
    }

    struct CountingReader {
        bytes: Cursor<Vec<u8>>,
        bytes_read: usize,
        maximum_read: usize,
        interrupted: bool,
    }

    impl CountingReader {
        fn new(bytes: &[u8], maximum_read: usize) -> Self {
            Self {
                bytes: Cursor::new(bytes.to_vec()),
                bytes_read: 0,
                maximum_read,
                interrupted: false,
            }
        }
    }

    impl Read for CountingReader {
        fn read(&mut self, destination: &mut [u8]) -> io::Result<usize> {
            if self.interrupted {
                self.interrupted = false;
                return Err(io::Error::new(io::ErrorKind::Interrupted, "injected"));
            }
            let requested = destination.len().min(self.maximum_read);
            let read = self.bytes.read(&mut destination[..requested])?;
            self.bytes_read += read;
            Ok(read)
        }
    }

    fn recognize_bytes(
        bytes: &[u8],
        declared_length: Option<u64>,
        limit: usize,
    ) -> Result<RecognizedProjectFormat, ProjectFormatRecognitionError> {
        recognize_with_limit(&mut Cursor::new(bytes), declared_length, limit)
    }

    #[test]
    fn exact_package_signature_wins_without_inspecting_the_suffix_or_payload() {
        for bytes in [
            b"PK\x03\x04".as_slice(),
            b"PK\x03\x04malformed package body".as_slice(),
        ] {
            assert_eq!(
                recognize_bytes(bytes, Some(bytes.len() as u64), 64).unwrap(),
                RecognizedProjectFormat::SblsPackageV1,
            );
        }
    }

    #[test]
    fn legacy_json_accepts_one_bom_and_only_json_whitespace_before_object() {
        for bytes in [
            b"{}".as_slice(),
            b" \t\r\n {\"schemaVersion\":\"0.2.0\"}".as_slice(),
            b"\xef\xbb\xbf{}".as_slice(),
            b"\xef\xbb\xbf \n\t{}".as_slice(),
        ] {
            assert_eq!(
                recognize_bytes(bytes, Some(bytes.len() as u64), 128).unwrap(),
                RecognizedProjectFormat::LegacyJson,
            );
        }
    }

    #[test]
    fn unsupported_and_ambiguous_prefixes_fail_without_parser_fallback() {
        for bytes in [
            b"".as_slice(),
            b" ".as_slice(),
            b"PK".as_slice(),
            b"PK\x03".as_slice(),
            b"PK\x05\x06".as_slice(),
            b"[]".as_slice(),
            b"\xff{}".as_slice(),
            b"\xef\xbb\xbf\xef\xbb\xbf{}".as_slice(),
            b" \nPK\x03\x04".as_slice(),
        ] {
            assert!(matches!(
                recognize_bytes(bytes, Some(bytes.len() as u64), 64),
                Err(ProjectFormatRecognitionError::Unsupported)
            ));
        }
    }

    #[test]
    fn declared_and_observed_limits_precede_an_unsupported_result() {
        assert!(matches!(
            recognize_bytes(b"{}", Some(9), 8),
            Err(ProjectFormatRecognitionError::TooLarge)
        ));
        assert!(matches!(
            recognize_bytes(b"        {", None, 8),
            Err(ProjectFormatRecognitionError::TooLarge)
        ));
        assert_eq!(
            recognize_bytes(b"       {", None, 8).unwrap(),
            RecognizedProjectFormat::LegacyJson,
        );
    }

    #[test]
    fn recognition_reads_only_the_bounded_prefix_needed_for_a_decision() {
        let package_tail = vec![b'x'; RECOGNITION_READ_CHUNK_BYTES * 2];
        let mut package_bytes = PROJECT_PACKAGE_LOCAL_FILE_SIGNATURE.to_vec();
        package_bytes.extend_from_slice(&package_tail);
        let mut package_reader = CountingReader::new(&package_bytes, usize::MAX);
        assert_eq!(
            recognize_with_limit(
                &mut package_reader,
                Some(package_bytes.len() as u64),
                package_bytes.len(),
            )
            .unwrap(),
            RecognizedProjectFormat::SblsPackageV1,
        );
        assert_eq!(package_reader.bytes_read, 4);

        let whitespace = vec![b' '; RECOGNITION_READ_CHUNK_BYTES + 11];
        let mut legacy_bytes = whitespace;
        legacy_bytes.push(b'{');
        legacy_bytes.extend_from_slice(&vec![b'x'; RECOGNITION_READ_CHUNK_BYTES]);
        let mut legacy_reader = CountingReader::new(&legacy_bytes, 7);
        legacy_reader.interrupted = true;
        assert_eq!(
            recognize_with_limit(
                &mut legacy_reader,
                Some(legacy_bytes.len() as u64),
                legacy_bytes.len(),
            )
            .unwrap(),
            RecognizedProjectFormat::LegacyJson,
        );
        assert!(legacy_reader.bytes_read >= RECOGNITION_READ_CHUNK_BYTES + 12);
        assert!(legacy_reader.bytes_read <= RECOGNITION_READ_CHUNK_BYTES + 18);
        assert!(legacy_reader.bytes_read < legacy_bytes.len());
    }

    #[test]
    fn failures_do_not_contaminate_later_recognition_operations() {
        let failure = recognize_bytes(b"unknown", Some(7), 16).unwrap_err();
        assert!(matches!(
            failure,
            ProjectFormatRecognitionError::Unsupported
        ));
        assert_eq!(
            recognize_bytes(b"{}", Some(2), 16).unwrap(),
            RecognizedProjectFormat::LegacyJson,
        );
    }

    #[test]
    fn production_file_recognition_ignores_suffix_and_preflights_oversize_metadata() {
        let package = TestFile::create("package-as-json", "json", b"PK\x03\x04body");
        let legacy = TestFile::create("legacy-as-package", "sbls", b"\xef\xbb\xbf \n{}");
        assert_eq!(
            recognize(&package.path).unwrap(),
            RecognizedProjectFormat::SblsPackageV1,
        );
        assert_eq!(
            recognize(&legacy.path).unwrap(),
            RecognizedProjectFormat::LegacyJson,
        );

        let oversized = TestFile::create("oversized", "sbls", b"PK\x03\x04");
        OpenOptions::new()
            .write(true)
            .open(&oversized.path)
            .unwrap()
            .set_len(MAX_BINARY_PROJECT_BYTES as u64 + 1)
            .unwrap();
        assert!(matches!(
            recognize(&oversized.path),
            Err(ProjectFormatRecognitionError::TooLarge)
        ));
    }
}
