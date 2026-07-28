use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

use crate::project_file::AtomicProjectWriteError;

pub(crate) const MAX_BINARY_PROJECT_BYTES: usize = 268_435_456;
const READ_CHUNK_BYTES: usize = 64 * 1024;

#[derive(Debug)]
pub(crate) enum BinaryProjectReadError {
    TooLarge,
    Allocation,
    Io {
        operation: &'static str,
        source: io::Error,
    },
}

impl BinaryProjectReadError {
    fn io(operation: &'static str, source: io::Error) -> Self {
        Self::Io { operation, source }
    }

    #[cfg(test)]
    pub(crate) const fn io_error(&self) -> Option<&io::Error> {
        match self {
            Self::Io { source, .. } => Some(source),
            Self::TooLarge | Self::Allocation => None,
        }
    }
}

#[derive(Debug)]
pub(crate) enum BinaryProjectWriteError {
    TooLarge,
    Atomic(AtomicProjectWriteError),
}

trait BufferCapacity {
    fn ensure_capacity(&mut self, buffer: &mut Vec<u8>, required_capacity: usize)
        -> Result<(), ()>;
}

#[derive(Default)]
struct FallibleBufferCapacity;

impl BufferCapacity for FallibleBufferCapacity {
    fn ensure_capacity(
        &mut self,
        buffer: &mut Vec<u8>,
        required_capacity: usize,
    ) -> Result<(), ()> {
        if required_capacity <= buffer.capacity() {
            return Ok(());
        }

        let additional = required_capacity.checked_sub(buffer.len()).ok_or(())?;
        buffer.try_reserve_exact(additional).map_err(|_| ())
    }
}

trait AtomicByteWriter {
    fn write(&mut self, path: &Path, bytes: &[u8]) -> Result<(), AtomicProjectWriteError>;
}

#[derive(Default)]
struct ProjectAtomicByteWriter;

impl AtomicByteWriter for ProjectAtomicByteWriter {
    fn write(&mut self, path: &Path, bytes: &[u8]) -> Result<(), AtomicProjectWriteError> {
        crate::project_file::write(path, bytes)
    }
}

pub(crate) fn read(path: impl AsRef<Path>) -> Result<Vec<u8>, BinaryProjectReadError> {
    let mut file = File::open(path.as_ref())
        .map_err(|error| BinaryProjectReadError::io("project-binary-read-open", error))?;
    let declared_length = file
        .metadata()
        .map_err(|error| BinaryProjectReadError::io("project-binary-read-metadata", error))?
        .len();
    let mut capacity = FallibleBufferCapacity;

    read_with_limit(
        &mut file,
        Some(declared_length),
        MAX_BINARY_PROJECT_BYTES,
        &mut capacity,
    )
}

pub(crate) fn write(path: impl AsRef<Path>, bytes: &[u8]) -> Result<(), BinaryProjectWriteError> {
    let mut writer = ProjectAtomicByteWriter;
    write_with_limit(path.as_ref(), bytes, MAX_BINARY_PROJECT_BYTES, &mut writer)
}

fn validate_payload_length(length: usize, limit: usize) -> Result<(), BinaryProjectWriteError> {
    if length <= limit {
        Ok(())
    } else {
        Err(BinaryProjectWriteError::TooLarge)
    }
}

fn write_with_limit<W: AtomicByteWriter>(
    path: &Path,
    bytes: &[u8],
    limit: usize,
    writer: &mut W,
) -> Result<(), BinaryProjectWriteError> {
    validate_payload_length(bytes.len(), limit)?;
    writer
        .write(path, bytes)
        .map_err(BinaryProjectWriteError::Atomic)
}

fn read_with_limit<R: Read, C: BufferCapacity>(
    reader: &mut R,
    declared_length: Option<u64>,
    limit: usize,
    capacity: &mut C,
) -> Result<Vec<u8>, BinaryProjectReadError> {
    let limit_plus_one = limit
        .checked_add(1)
        .ok_or(BinaryProjectReadError::TooLarge)?;
    let declared_capacity = match declared_length {
        Some(length) => {
            if length > limit as u64 {
                return Err(BinaryProjectReadError::TooLarge);
            }
            usize::try_from(length).map_err(|_| BinaryProjectReadError::TooLarge)?
        }
        None => 0,
    };

    let mut bytes = Vec::new();
    capacity
        .ensure_capacity(&mut bytes, declared_capacity)
        .map_err(|_| BinaryProjectReadError::Allocation)?;

    let mut scratch = [0u8; READ_CHUNK_BYTES];
    loop {
        let remaining_probe = limit_plus_one
            .checked_sub(bytes.len())
            .ok_or(BinaryProjectReadError::TooLarge)?;
        let requested = remaining_probe.min(scratch.len());
        let read = match reader.read(&mut scratch[..requested]) {
            Ok(read) => read,
            Err(error) if error.kind() == io::ErrorKind::Interrupted => continue,
            Err(error) => {
                return Err(BinaryProjectReadError::io(
                    "project-binary-read-content",
                    error,
                ));
            }
        };

        if read == 0 {
            return Ok(bytes);
        }

        let observed = bytes
            .len()
            .checked_add(read)
            .ok_or(BinaryProjectReadError::TooLarge)?;
        if observed > limit {
            return Err(BinaryProjectReadError::TooLarge);
        }

        capacity
            .ensure_capacity(&mut bytes, observed)
            .map_err(|_| BinaryProjectReadError::Allocation)?;
        bytes.extend_from_slice(&scratch[..read]);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Cursor;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_DIRECTORY_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    struct TestDirectory {
        path: PathBuf,
    }

    impl TestDirectory {
        fn new(label: &str) -> Self {
            for _ in 0..64 {
                let sequence = TEST_DIRECTORY_SEQUENCE.fetch_add(1, Ordering::Relaxed);
                let path = std::env::temp_dir().join(format!(
                    "sbls-binary-project-io-{label}-{}-{sequence}",
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

    #[derive(Default)]
    struct TestCapacity {
        calls: usize,
        fail_on_call: Option<usize>,
    }

    impl BufferCapacity for TestCapacity {
        fn ensure_capacity(
            &mut self,
            buffer: &mut Vec<u8>,
            required_capacity: usize,
        ) -> Result<(), ()> {
            if required_capacity <= buffer.capacity() {
                return Ok(());
            }
            self.calls += 1;
            if self.fail_on_call == Some(self.calls) {
                return Err(());
            }
            buffer.reserve_exact(required_capacity - buffer.len());
            Ok(())
        }
    }

    fn read_fake(
        bytes: &[u8],
        declared_length: Option<u64>,
        limit: usize,
    ) -> Result<Vec<u8>, BinaryProjectReadError> {
        read_with_limit(
            &mut Cursor::new(bytes),
            declared_length,
            limit,
            &mut TestCapacity::default(),
        )
    }

    struct PartialReader {
        bytes: Vec<u8>,
        position: usize,
        maximum_read: usize,
    }

    impl Read for PartialReader {
        fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
            if self.position == self.bytes.len() {
                return Ok(0);
            }
            let count = self
                .maximum_read
                .min(buffer.len())
                .min(self.bytes.len() - self.position);
            buffer[..count].copy_from_slice(&self.bytes[self.position..self.position + count]);
            self.position += count;
            Ok(count)
        }
    }

    struct InterruptedOnceReader {
        bytes: Cursor<Vec<u8>>,
        interrupted: bool,
    }

    impl Read for InterruptedOnceReader {
        fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
            if !self.interrupted {
                self.interrupted = true;
                return Err(io::Error::new(io::ErrorKind::Interrupted, "injected"));
            }
            self.bytes.read(buffer)
        }
    }

    #[derive(Default)]
    struct RecordingWriter {
        calls: usize,
        path: Option<PathBuf>,
        bytes: Vec<u8>,
    }

    impl AtomicByteWriter for RecordingWriter {
        fn write(&mut self, path: &Path, bytes: &[u8]) -> Result<(), AtomicProjectWriteError> {
            self.calls += 1;
            self.path = Some(path.to_path_buf());
            self.bytes.extend_from_slice(bytes);
            Ok(())
        }
    }

    #[test]
    fn production_limit_is_exact() {
        assert_eq!(MAX_BINARY_PROJECT_BYTES, 268_435_456);
        validate_payload_length(MAX_BINARY_PROJECT_BYTES, MAX_BINARY_PROJECT_BYTES).unwrap();
        assert!(matches!(
            validate_payload_length(MAX_BINARY_PROJECT_BYTES + 1, MAX_BINARY_PROJECT_BYTES),
            Err(BinaryProjectWriteError::TooLarge)
        ));
    }

    #[test]
    fn reader_preserves_empty_and_arbitrary_non_utf8_bytes() {
        assert_eq!(read_fake(&[], Some(0), 8).unwrap(), Vec::<u8>::new());
        let bytes = [0, 0xff, 0xfe, b'Z', 0];
        assert_eq!(read_fake(&bytes, Some(2), 8).unwrap(), bytes);
    }

    #[test]
    fn reader_admits_the_exact_limit_and_rejects_limit_plus_one() {
        assert_eq!(read_fake(b"12345678", Some(8), 8).unwrap(), b"12345678");
        assert!(matches!(
            read_fake(b"123456789", Some(8), 8),
            Err(BinaryProjectReadError::TooLarge)
        ));
    }

    #[test]
    fn reader_rejects_over_limit_metadata_before_allocating_or_reading() {
        let mut capacity = TestCapacity::default();
        let error =
            read_with_limit(&mut Cursor::new(b"small"), Some(9), 8, &mut capacity).unwrap_err();
        assert!(matches!(error, BinaryProjectReadError::TooLarge));
        assert_eq!(capacity.calls, 0);
    }

    #[test]
    fn reader_caps_files_that_grow_or_have_stale_smaller_metadata() {
        assert!(matches!(
            read_fake(b"123456789", Some(1), 8),
            Err(BinaryProjectReadError::TooLarge)
        ));
        assert_eq!(read_fake(b"12345678", Some(2), 8).unwrap(), b"12345678");
    }

    #[test]
    fn reader_handles_partial_reads_and_retries_interrupted_reads() {
        let bytes = vec![0, 1, 2, 0xff, 4, 5, 6];
        let mut partial = PartialReader {
            bytes: bytes.clone(),
            position: 0,
            maximum_read: 2,
        };
        assert_eq!(
            read_with_limit(&mut partial, Some(1), 8, &mut TestCapacity::default()).unwrap(),
            bytes
        );

        let mut interrupted = InterruptedOnceReader {
            bytes: Cursor::new(bytes.clone()),
            interrupted: false,
        };
        assert_eq!(
            read_with_limit(&mut interrupted, None, 8, &mut TestCapacity::default()).unwrap(),
            bytes
        );
    }

    #[test]
    fn allocation_failure_returns_no_partial_bytes_and_does_not_contaminate_later_reads() {
        let mut failing_capacity = TestCapacity {
            calls: 0,
            fail_on_call: Some(2),
        };
        let failure = read_with_limit(
            &mut PartialReader {
                bytes: b"12345678".to_vec(),
                position: 0,
                maximum_read: 4,
            },
            Some(1),
            8,
            &mut failing_capacity,
        )
        .unwrap_err();
        assert!(matches!(failure, BinaryProjectReadError::Allocation));

        assert_eq!(read_fake(b"later", None, 8).unwrap(), b"later");
    }

    #[test]
    fn real_reader_reports_not_found_and_invalid_path_without_text_decoding() {
        let directory = TestDirectory::new("read-errors");
        let missing = read(directory.join("missing.sbls")).unwrap_err();
        assert!(matches!(
            missing,
            BinaryProjectReadError::Io {
                operation: "project-binary-read-open",
                ..
            }
        ));

        let invalid = read(Path::new("invalid\0project.sbls")).unwrap_err();
        assert!(matches!(invalid, BinaryProjectReadError::Io { .. }));
        assert_eq!(
            invalid.io_error().map(io::Error::kind),
            Some(io::ErrorKind::InvalidInput)
        );
    }

    #[test]
    fn concurrent_and_repeated_reads_have_independent_owned_buffers() {
        let expected = vec![0, 1, 0xff, 0, 4];
        let first_expected = expected.clone();
        let second_expected = expected.clone();
        let first = std::thread::spawn(move || read_fake(&first_expected, None, 8).unwrap());
        let second = std::thread::spawn(move || read_fake(&second_expected, None, 8).unwrap());
        let mut first = first.join().unwrap();
        let second = second.join().unwrap();

        first[0] = 9;
        assert_eq!(second, expected);
        assert_eq!(read_fake(&expected, None, 8).unwrap(), expected);
    }

    #[test]
    fn binary_writer_commits_empty_and_arbitrary_bytes_exactly() {
        let directory = TestDirectory::new("write-bytes");
        let destination = directory.join("project.sbls");
        let bytes = [0, 0xff, 0xfe, 1, 0];

        write(&destination, &bytes).unwrap();
        assert_eq!(fs::read(&destination).unwrap(), bytes);

        write(&destination, &[]).unwrap();
        assert_eq!(fs::read(&destination).unwrap(), Vec::<u8>::new());
        assert!(!fs::read_dir(&directory.path).unwrap().any(|entry| {
            entry
                .unwrap()
                .file_name()
                .to_string_lossy()
                .starts_with(".sbls-project-write-")
        }));
    }

    #[test]
    fn over_limit_write_does_not_invoke_atomic_writer_or_touch_destination() {
        let directory = TestDirectory::new("write-limit");
        let destination = directory.join("project.sbls");
        fs::write(&destination, b"known good").unwrap();
        let mut writer = RecordingWriter::default();

        let result = write_with_limit(&destination, b"123456789", 8, &mut writer);

        assert!(matches!(result, Err(BinaryProjectWriteError::TooLarge)));
        assert_eq!(writer.calls, 0);
        assert_eq!(fs::read(&destination).unwrap(), b"known good");
        assert_eq!(
            fs::read_dir(&directory.path).unwrap().count(),
            1,
            "no temporary file may be created before limit rejection"
        );
    }

    #[test]
    fn admitted_write_passes_the_original_slice_to_the_atomic_owner() {
        let mut writer = RecordingWriter::default();
        let bytes = [0, 0xff, 2, 3];
        write_with_limit(Path::new("project.sbls"), &bytes, 4, &mut writer).unwrap();

        assert_eq!(writer.calls, 1);
        assert_eq!(writer.path.as_deref(), Some(Path::new("project.sbls")));
        assert_eq!(writer.bytes, bytes);
    }
}
