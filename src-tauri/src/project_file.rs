use std::ffi::OsStr;
use std::fmt;
use std::fs::{File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_TEMP_FILE_ATTEMPTS: usize = 16;
const TEMP_FILE_MARKER: &str = ".sbls-project-write-";
static TEMP_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum WritePhase {
    ValidateDestination,
    CreateTemporary,
    CollisionExhausted,
    WriteTemporary,
    FlushTemporary,
    SyncTemporary,
    CloseTemporary,
    ReplaceDestination,
}

impl WritePhase {
    fn operation_id(self) -> &'static str {
        match self {
            Self::ValidateDestination => "project.atomic-write.validate-destination",
            Self::CreateTemporary => "project.atomic-write.create-temporary",
            Self::CollisionExhausted => "project.atomic-write.collision-exhausted",
            Self::WriteTemporary => "project.atomic-write.write-temporary",
            Self::FlushTemporary => "project.atomic-write.flush-temporary",
            Self::SyncTemporary => "project.atomic-write.sync-temporary",
            Self::CloseTemporary => "project.atomic-write.close-temporary",
            Self::ReplaceDestination => "project.atomic-write.replace-destination",
        }
    }

    fn description(self) -> &'static str {
        match self {
            Self::ValidateDestination => "destination validation",
            Self::CreateTemporary => "temporary-file creation",
            Self::CollisionExhausted => "temporary-file collision retry",
            Self::WriteTemporary => "temporary-file write",
            Self::FlushTemporary => "temporary-file flush",
            Self::SyncTemporary => "temporary-file synchronization",
            Self::CloseTemporary => "temporary-file close",
            Self::ReplaceDestination => "destination replacement",
        }
    }
}

#[derive(Debug)]
struct SecondaryFailure {
    description: &'static str,
    error: io::Error,
}

#[derive(Debug)]
pub(crate) struct AtomicProjectWriteError {
    phase: WritePhase,
    source: io::Error,
    secondary_failures: Vec<SecondaryFailure>,
}

impl AtomicProjectWriteError {
    fn new(phase: WritePhase, source: io::Error) -> Self {
        Self {
            phase,
            source,
            secondary_failures: Vec::new(),
        }
    }

    fn with_secondary(mut self, description: &'static str, error: io::Error) -> Self {
        self.secondary_failures
            .push(SecondaryFailure { description, error });
        self
    }
}

impl fmt::Display for AtomicProjectWriteError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "[{}] Project file save failed during {}: {}. The destination was not replaced; retry is safe.",
            self.phase.operation_id(),
            self.phase.description(),
            self.source
        )?;

        for failure in &self.secondary_failures {
            write!(
                formatter,
                " Additionally, {} failed: {}.",
                failure.description, failure.error
            )?;
        }

        Ok(())
    }
}

impl std::error::Error for AtomicProjectWriteError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        Some(&self.source)
    }
}

trait TemporaryPathSource {
    fn candidate(&mut self, parent: &Path, file_name: &OsStr, attempt: usize) -> PathBuf;
}

struct UniqueTemporaryPathSource {
    operation_nonce: u128,
    operation_sequence: u64,
}

impl UniqueTemporaryPathSource {
    fn new() -> Self {
        let operation_nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or_default();

        Self {
            operation_nonce,
            operation_sequence: TEMP_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed),
        }
    }
}

impl TemporaryPathSource for UniqueTemporaryPathSource {
    fn candidate(&mut self, parent: &Path, _file_name: &OsStr, attempt: usize) -> PathBuf {
        parent.join(format!(
            "{TEMP_FILE_MARKER}{}-{}-{}-{attempt}.tmp",
            std::process::id(),
            self.operation_nonce,
            self.operation_sequence
        ))
    }
}

trait AtomicFileSystem {
    type Handle;

    fn create_new(&mut self, path: &Path) -> io::Result<Self::Handle>;
    fn write_all(&mut self, handle: &mut Self::Handle, contents: &[u8]) -> io::Result<()>;
    fn flush(&mut self, handle: &mut Self::Handle) -> io::Result<()>;
    fn sync_all(&mut self, handle: &mut Self::Handle) -> io::Result<()>;
    fn close(&mut self, handle: Self::Handle) -> io::Result<()>;
    fn replace(&mut self, temporary: &Path, destination: &Path) -> io::Result<()>;
    fn remove_temporary(&mut self, temporary: &Path) -> io::Result<()>;
}

#[derive(Default)]
struct RealAtomicFileSystem;

impl AtomicFileSystem for RealAtomicFileSystem {
    type Handle = File;

    fn create_new(&mut self, path: &Path) -> io::Result<Self::Handle> {
        OpenOptions::new().write(true).create_new(true).open(path)
    }

    fn write_all(&mut self, handle: &mut Self::Handle, contents: &[u8]) -> io::Result<()> {
        handle.write_all(contents)
    }

    fn flush(&mut self, handle: &mut Self::Handle) -> io::Result<()> {
        handle.flush()
    }

    fn sync_all(&mut self, handle: &mut Self::Handle) -> io::Result<()> {
        handle.sync_all()
    }

    fn close(&mut self, handle: Self::Handle) -> io::Result<()> {
        drop(handle);
        Ok(())
    }

    fn replace(&mut self, temporary: &Path, destination: &Path) -> io::Result<()> {
        replace_file(temporary, destination)
    }

    fn remove_temporary(&mut self, temporary: &Path) -> io::Result<()> {
        std::fs::remove_file(temporary)
    }
}

pub(crate) fn write(
    path: impl AsRef<Path>,
    contents: &[u8],
) -> Result<(), AtomicProjectWriteError> {
    let destination = path.as_ref();
    let mut file_system = RealAtomicFileSystem;
    let mut temporary_paths = UniqueTemporaryPathSource::new();

    write_with(
        destination,
        contents,
        &mut file_system,
        &mut temporary_paths,
        MAX_TEMP_FILE_ATTEMPTS,
    )
}

fn write_with<F, T>(
    destination: &Path,
    contents: &[u8],
    file_system: &mut F,
    temporary_paths: &mut T,
    max_attempts: usize,
) -> Result<(), AtomicProjectWriteError>
where
    F: AtomicFileSystem,
    T: TemporaryPathSource,
{
    let (parent, file_name) = destination_parts(destination)?;
    let mut owned_temporary = None;

    for attempt in 0..max_attempts {
        let candidate = temporary_paths.candidate(parent, file_name, attempt);
        validate_temporary_candidate(destination, parent, &candidate)?;

        match file_system.create_new(&candidate) {
            Ok(handle) => {
                owned_temporary = Some((candidate, handle));
                break;
            }
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(AtomicProjectWriteError::new(
                    WritePhase::CreateTemporary,
                    error,
                ));
            }
        }
    }

    let Some((temporary, mut handle)) = owned_temporary else {
        return Err(AtomicProjectWriteError::new(
            WritePhase::CollisionExhausted,
            io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!("all {max_attempts} exclusive temporary-file candidates already existed"),
            ),
        ));
    };

    if let Err(error) = file_system.write_all(&mut handle, contents) {
        return Err(fail_with_owned_temporary(
            file_system,
            temporary.as_path(),
            Some(handle),
            WritePhase::WriteTemporary,
            error,
        ));
    }

    if let Err(error) = file_system.flush(&mut handle) {
        return Err(fail_with_owned_temporary(
            file_system,
            temporary.as_path(),
            Some(handle),
            WritePhase::FlushTemporary,
            error,
        ));
    }

    if let Err(error) = file_system.sync_all(&mut handle) {
        return Err(fail_with_owned_temporary(
            file_system,
            temporary.as_path(),
            Some(handle),
            WritePhase::SyncTemporary,
            error,
        ));
    }

    if let Err(error) = file_system.close(handle) {
        return Err(fail_with_owned_temporary(
            file_system,
            temporary.as_path(),
            None,
            WritePhase::CloseTemporary,
            error,
        ));
    }

    if let Err(error) = file_system.replace(temporary.as_path(), destination) {
        return Err(fail_with_owned_temporary(
            file_system,
            temporary.as_path(),
            None,
            WritePhase::ReplaceDestination,
            error,
        ));
    }

    Ok(())
}

fn destination_parts(destination: &Path) -> Result<(&Path, &OsStr), AtomicProjectWriteError> {
    let Some(file_name) = destination.file_name().filter(|name| !name.is_empty()) else {
        return Err(AtomicProjectWriteError::new(
            WritePhase::ValidateDestination,
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "the project path must end with a file name",
            ),
        ));
    };

    let parent = destination
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));

    Ok((parent, file_name))
}

fn validate_temporary_candidate(
    destination: &Path,
    parent: &Path,
    candidate: &Path,
) -> Result<(), AtomicProjectWriteError> {
    let candidate_parent = candidate
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));

    if candidate == destination || candidate_parent != parent || candidate.file_name().is_none() {
        return Err(AtomicProjectWriteError::new(
            WritePhase::CreateTemporary,
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "temporary-file candidate must be a distinct file in the destination directory",
            ),
        ));
    }

    Ok(())
}

fn fail_with_owned_temporary<F>(
    file_system: &mut F,
    temporary: &Path,
    handle: Option<F::Handle>,
    phase: WritePhase,
    source: io::Error,
) -> AtomicProjectWriteError
where
    F: AtomicFileSystem,
{
    let mut failure = AtomicProjectWriteError::new(phase, source);

    if let Some(handle) = handle {
        if let Err(error) = file_system.close(handle) {
            failure = failure.with_secondary("temporary-file close", error);
        }
    }

    if let Err(error) = file_system.remove_temporary(temporary) {
        failure = failure.with_secondary("temporary-file cleanup", error);
    }

    failure
}

#[cfg(windows)]
fn replace_file(temporary: &Path, destination: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };

    fn wide_path(path: &Path) -> io::Result<Vec<u16>> {
        let mut wide: Vec<u16> = path.as_os_str().encode_wide().collect();
        if wide.contains(&0) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Windows file paths cannot contain NUL characters",
            ));
        }
        wide.push(0);
        Ok(wide)
    }

    let temporary = wide_path(temporary)?;
    let destination = wide_path(destination)?;

    // The adjacent temporary file guarantees a same-volume move. Deliberately do
    // not set MOVEFILE_COPY_ALLOWED: a copy/delete fallback is not an atomic commit.
    let result = unsafe {
        MoveFileExW(
            temporary.as_ptr(),
            destination.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };

    if result == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(unix)]
fn replace_file(temporary: &Path, destination: &Path) -> io::Result<()> {
    std::fs::rename(temporary, destination)
}

#[cfg(not(any(windows, unix)))]
fn replace_file(_temporary: &Path, _destination: &Path) -> io::Result<()> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "atomic project-file replacement is not supported on this platform",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
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
                    "sbls-atomic-project-file-{label}-{}-{sequence}",
                    std::process::id()
                ));

                match fs::create_dir(&path) {
                    Ok(()) => return Self { path },
                    Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
                    Err(error) => panic!("failed to create test directory {path:?}: {error}"),
                }
            }

            panic!("exhausted unique test-directory candidates for {label}");
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

    struct SequenceTemporaryPaths {
        candidates: Vec<PathBuf>,
    }

    impl SequenceTemporaryPaths {
        fn single(path: PathBuf) -> Self {
            Self {
                candidates: vec![path],
            }
        }
    }

    impl TemporaryPathSource for SequenceTemporaryPaths {
        fn candidate(&mut self, _parent: &Path, _file_name: &OsStr, attempt: usize) -> PathBuf {
            self.candidates
                .get(attempt)
                .cloned()
                .unwrap_or_else(|| self.candidates.last().unwrap().clone())
        }
    }

    struct InjectedAtomicFileSystem {
        real: RealAtomicFileSystem,
        fail_phase: Option<WritePhase>,
        fail_cleanup: bool,
        events: Vec<&'static str>,
    }

    impl InjectedAtomicFileSystem {
        fn new(fail_phase: Option<WritePhase>) -> Self {
            Self {
                real: RealAtomicFileSystem,
                fail_phase,
                fail_cleanup: false,
                events: Vec::new(),
            }
        }

        fn injected_error(phase: WritePhase) -> io::Error {
            io::Error::new(
                io::ErrorKind::PermissionDenied,
                format!("injected {phase:?} failure"),
            )
        }
    }

    impl AtomicFileSystem for InjectedAtomicFileSystem {
        type Handle = File;

        fn create_new(&mut self, path: &Path) -> io::Result<Self::Handle> {
            self.events.push("create");
            if self.fail_phase == Some(WritePhase::CreateTemporary) {
                return Err(Self::injected_error(WritePhase::CreateTemporary));
            }
            self.real.create_new(path)
        }

        fn write_all(&mut self, handle: &mut Self::Handle, contents: &[u8]) -> io::Result<()> {
            self.events.push("write_all");
            if self.fail_phase == Some(WritePhase::WriteTemporary) {
                handle.write_all(&contents[..contents.len().min(3)])?;
                return Err(Self::injected_error(WritePhase::WriteTemporary));
            }
            self.real.write_all(handle, contents)
        }

        fn flush(&mut self, handle: &mut Self::Handle) -> io::Result<()> {
            self.events.push("flush");
            if self.fail_phase == Some(WritePhase::FlushTemporary) {
                return Err(Self::injected_error(WritePhase::FlushTemporary));
            }
            self.real.flush(handle)
        }

        fn sync_all(&mut self, handle: &mut Self::Handle) -> io::Result<()> {
            self.events.push("sync_all");
            if self.fail_phase == Some(WritePhase::SyncTemporary) {
                return Err(Self::injected_error(WritePhase::SyncTemporary));
            }
            self.real.sync_all(handle)
        }

        fn close(&mut self, handle: Self::Handle) -> io::Result<()> {
            self.events.push("close");
            self.real.close(handle)?;
            if self.fail_phase == Some(WritePhase::CloseTemporary) {
                return Err(Self::injected_error(WritePhase::CloseTemporary));
            }
            Ok(())
        }

        fn replace(&mut self, temporary: &Path, destination: &Path) -> io::Result<()> {
            self.events.push("replace");
            if self.fail_phase == Some(WritePhase::ReplaceDestination) {
                return Err(Self::injected_error(WritePhase::ReplaceDestination));
            }
            self.real.replace(temporary, destination)
        }

        fn remove_temporary(&mut self, temporary: &Path) -> io::Result<()> {
            self.events.push("cleanup");
            if self.fail_cleanup {
                return Err(io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    "injected cleanup failure",
                ));
            }
            self.real.remove_temporary(temporary)
        }
    }

    fn write_with_injection(
        destination: &Path,
        temporary: &Path,
        contents: &[u8],
        file_system: &mut InjectedAtomicFileSystem,
    ) -> Result<(), AtomicProjectWriteError> {
        let mut paths = SequenceTemporaryPaths::single(temporary.to_path_buf());
        write_with(destination, contents, file_system, &mut paths, 1)
    }

    fn assert_no_operation_temporaries(directory: &TestDirectory) {
        let leaked: Vec<PathBuf> = fs::read_dir(&directory.path)
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .filter(|path| {
                path.file_name()
                    .and_then(OsStr::to_str)
                    .is_some_and(|name| name.starts_with(TEMP_FILE_MARKER))
            })
            .collect();

        assert!(leaked.is_empty(), "temporary files leaked: {leaked:?}");
    }

    #[test]
    fn real_write_creates_a_new_file_with_exact_bytes() {
        let directory = TestDirectory::new("create");
        let destination = directory.join("new-project.sbls.json");
        let contents = b"{\r\n  \"schemaVersion\": \"0.2.0\"\r\n}\r\n";

        write(&destination, contents).unwrap();

        assert_eq!(fs::read(&destination).unwrap(), contents);
        assert_no_operation_temporaries(&directory);
    }

    #[test]
    fn real_write_replaces_existing_files_with_larger_and_smaller_contents() {
        let directory = TestDirectory::new("replace-sizes");
        let destination = directory.join("sizes.sbls.json");
        fs::write(&destination, b"old").unwrap();

        let larger = vec![b'L'; 64 * 1024 + 13];
        write(&destination, &larger).unwrap();
        assert_eq!(fs::read(&destination).unwrap(), larger);

        let smaller = b"tiny";
        write(&destination, smaller).unwrap();
        assert_eq!(fs::read(&destination).unwrap(), smaller);
        assert_no_operation_temporaries(&directory);
    }

    #[test]
    fn real_write_keeps_disc_and_case_project_json_opaque_and_load_readable() {
        let directory = TestDirectory::new("project-json");
        let payloads = [
            (
                "disc.sbls.json",
                r#"{"schemaVersion":"0.2.0","title":"Disc","savedAt":"2026-07-26T00:00:00.000Z","game":{"manualTitle":"Portal","selectedSteamGame":null},"template":{"type":"disc","variant":"standard"},"steamBackupLogo":{"placement":"top"},"background":{"scale":1,"offset":{"x":0,"y":0},"imageDataUrl":null,"note":""}}"#,
                "disc",
            ),
            (
                "case.sbls.json",
                r#"{"schemaVersion":"0.2.0","projectType":"caseInsert","title":"Case","savedAt":"2026-07-26T00:00:00.000Z","game":{"manualTitle":"Portal","selectedSteamGame":null},"template":{"type":"caseInsert","variant":"jewelCase"},"caseInsert":{"templateType":"jewelCase","front":{},"back":{},"spine":{},"export":{}}}"#,
                "caseInsert",
            ),
        ];

        for (file_name, payload, expected_type) in payloads {
            let destination = directory.join(file_name);
            write(&destination, payload.as_bytes()).unwrap();

            let loaded = crate::commands::files::read_project_file(
                destination.to_string_lossy().into_owned(),
            )
            .unwrap();
            assert_eq!(loaded.as_bytes(), payload.as_bytes());

            let parsed: serde_json::Value = serde_json::from_str(&loaded).unwrap();
            let actual_type = parsed
                .get("projectType")
                .and_then(serde_json::Value::as_str)
                .or_else(|| {
                    parsed
                        .get("template")
                        .and_then(|template| template.get("type"))
                        .and_then(serde_json::Value::as_str)
                });
            assert_eq!(actual_type, Some(expected_type));
        }

        assert_no_operation_temporaries(&directory);
    }

    #[test]
    fn real_write_supports_unicode_paths_and_contents() {
        let directory = TestDirectory::new("unicode");
        let destination = directory.join("保存-Étiquette-💿.sbls.json");
        let contents = "{\"title\":\"ポータル – Édition 💿\"}".as_bytes();

        write(&destination, contents).unwrap();

        assert_eq!(fs::read(&destination).unwrap(), contents);
        assert_no_operation_temporaries(&directory);
    }

    #[test]
    fn real_write_does_not_modify_neighboring_files() {
        let directory = TestDirectory::new("neighbors");
        let destination = directory.join("project.sbls.json");
        let neighbor = directory.join("keep-me.txt");
        fs::write(&destination, b"old project").unwrap();
        fs::write(&neighbor, b"neighbor bytes").unwrap();

        write(&destination, b"new project").unwrap();

        assert_eq!(fs::read(&destination).unwrap(), b"new project");
        assert_eq!(fs::read(&neighbor).unwrap(), b"neighbor bytes");
        assert_no_operation_temporaries(&directory);
    }

    #[test]
    fn failure_in_each_precommit_phase_preserves_existing_destination_and_cleans_temp() {
        for phase in [
            WritePhase::CreateTemporary,
            WritePhase::WriteTemporary,
            WritePhase::FlushTemporary,
            WritePhase::SyncTemporary,
            WritePhase::CloseTemporary,
            WritePhase::ReplaceDestination,
        ] {
            let directory = TestDirectory::new(phase.operation_id());
            let destination = directory.join("project.sbls.json");
            let temporary = directory.join("injected.tmp");
            fs::write(&destination, b"known good bytes").unwrap();
            let mut file_system = InjectedAtomicFileSystem::new(Some(phase));

            let error = write_with_injection(
                &destination,
                &temporary,
                b"replacement bytes",
                &mut file_system,
            )
            .unwrap_err();

            assert_eq!(error.phase, phase);
            assert_eq!(fs::read(&destination).unwrap(), b"known good bytes");
            assert!(!temporary.exists());
            assert!(error.to_string().contains(phase.operation_id()));
            assert!(error.to_string().contains("retry is safe"));
        }
    }

    #[test]
    fn failure_before_commit_keeps_an_absent_destination_absent() {
        for phase in [
            WritePhase::CreateTemporary,
            WritePhase::WriteTemporary,
            WritePhase::FlushTemporary,
            WritePhase::SyncTemporary,
            WritePhase::CloseTemporary,
            WritePhase::ReplaceDestination,
        ] {
            let directory = TestDirectory::new("absent-failure");
            let destination = directory.join("not-created.sbls.json");
            let temporary = directory.join("injected.tmp");
            let mut file_system = InjectedAtomicFileSystem::new(Some(phase));

            write_with_injection(
                &destination,
                &temporary,
                b"uncommitted bytes",
                &mut file_system,
            )
            .unwrap_err();

            assert!(!destination.exists(), "phase {phase:?} created destination");
            assert!(!temporary.exists(), "phase {phase:?} leaked temporary");
        }
    }

    #[test]
    fn cleanup_failure_is_reported_without_hiding_the_primary_failure() {
        let directory = TestDirectory::new("cleanup-failure");
        let destination = directory.join("project.sbls.json");
        let temporary = directory.join("injected.tmp");
        fs::write(&destination, b"known good bytes").unwrap();
        let mut file_system = InjectedAtomicFileSystem::new(Some(WritePhase::WriteTemporary));
        file_system.fail_cleanup = true;

        let error = write_with_injection(
            &destination,
            &temporary,
            b"replacement bytes",
            &mut file_system,
        )
        .unwrap_err();
        let message = error.to_string();

        assert_eq!(error.phase, WritePhase::WriteTemporary);
        assert!(message.contains("injected WriteTemporary failure"));
        assert!(message.contains("temporary-file cleanup failed"));
        assert!(message.contains("injected cleanup failure"));
        assert_eq!(fs::read(&destination).unwrap(), b"known good bytes");
        assert!(temporary.exists());
    }

    #[test]
    fn exclusive_collision_is_untouched_and_retry_uses_another_candidate() {
        let directory = TestDirectory::new("collision-retry");
        let destination = directory.join("project.sbls.json");
        let collision = directory.join("collision.tmp");
        let available = directory.join("available.tmp");
        fs::write(&destination, b"old project").unwrap();
        fs::write(&collision, b"other operation").unwrap();
        let mut file_system = RealAtomicFileSystem;
        let mut paths = SequenceTemporaryPaths {
            candidates: vec![collision.clone(), available.clone()],
        };

        write_with(
            &destination,
            b"new project",
            &mut file_system,
            &mut paths,
            2,
        )
        .unwrap();

        assert_eq!(fs::read(&destination).unwrap(), b"new project");
        assert_eq!(fs::read(&collision).unwrap(), b"other operation");
        assert!(!available.exists());
    }

    #[test]
    fn collision_exhaustion_preserves_destination_and_every_colliding_file() {
        let directory = TestDirectory::new("collision-exhaustion");
        let destination = directory.join("project.sbls.json");
        let first = directory.join("first.tmp");
        let second = directory.join("second.tmp");
        fs::write(&destination, b"old project").unwrap();
        fs::write(&first, b"first owner").unwrap();
        fs::write(&second, b"second owner").unwrap();
        let mut file_system = RealAtomicFileSystem;
        let mut paths = SequenceTemporaryPaths {
            candidates: vec![first.clone(), second.clone()],
        };

        let error = write_with(
            &destination,
            b"new project",
            &mut file_system,
            &mut paths,
            2,
        )
        .unwrap_err();

        assert_eq!(error.phase, WritePhase::CollisionExhausted);
        assert_eq!(fs::read(&destination).unwrap(), b"old project");
        assert_eq!(fs::read(&first).unwrap(), b"first owner");
        assert_eq!(fs::read(&second).unwrap(), b"second owner");
    }

    #[test]
    fn successful_operation_orders_sync_and_close_before_the_single_replace() {
        let directory = TestDirectory::new("operation-order");
        let destination = directory.join("project.sbls.json");
        let temporary = directory.join("injected.tmp");
        fs::write(&destination, b"old project").unwrap();
        let mut file_system = InjectedAtomicFileSystem::new(None);

        write_with_injection(&destination, &temporary, b"new project", &mut file_system).unwrap();

        assert_eq!(
            file_system.events,
            [
                "create",
                "write_all",
                "flush",
                "sync_all",
                "close",
                "replace"
            ]
        );
        assert_eq!(fs::read(&destination).unwrap(), b"new project");
    }

    #[test]
    fn replacement_failure_has_no_direct_write_copy_or_second_replace_fallback() {
        let directory = TestDirectory::new("no-fallback");
        let destination = directory.join("project.sbls.json");
        let temporary = directory.join("injected.tmp");
        fs::write(&destination, b"old project").unwrap();
        let mut file_system = InjectedAtomicFileSystem::new(Some(WritePhase::ReplaceDestination));

        write_with_injection(&destination, &temporary, b"new project", &mut file_system)
            .unwrap_err();

        assert_eq!(
            file_system.events,
            [
                "create",
                "write_all",
                "flush",
                "sync_all",
                "close",
                "replace",
                "cleanup"
            ]
        );
        assert_eq!(fs::read(&destination).unwrap(), b"old project");
        assert!(!temporary.exists());
    }

    #[test]
    fn invalid_destination_is_rejected_before_temporary_creation() {
        let directory = TestDirectory::new("invalid-destination");
        let mut file_system = InjectedAtomicFileSystem::new(None);
        let mut paths = SequenceTemporaryPaths::single(directory.join("unused.tmp"));

        let error =
            write_with(Path::new("."), b"bytes", &mut file_system, &mut paths, 1).unwrap_err();

        assert_eq!(error.phase, WritePhase::ValidateDestination);
        assert!(file_system.events.is_empty());
    }

    #[cfg(windows)]
    #[test]
    fn windows_platform_path_replaces_an_existing_destination() {
        let directory = TestDirectory::new("windows-existing");
        let destination = directory.join("existing.sbls.json");
        fs::write(&destination, b"old Windows bytes").unwrap();

        write(&destination, b"new Windows bytes").unwrap();

        assert_eq!(fs::read(&destination).unwrap(), b"new Windows bytes");
        assert_no_operation_temporaries(&directory);
    }

    #[cfg(windows)]
    #[test]
    fn windows_platform_path_creates_an_absent_destination() {
        let directory = TestDirectory::new("windows-absent");
        let destination = directory.join("absent.sbls.json");

        write(&destination, b"created on Windows").unwrap();

        assert_eq!(fs::read(&destination).unwrap(), b"created on Windows");
        assert_no_operation_temporaries(&directory);
    }

    #[cfg(windows)]
    #[test]
    fn windows_platform_path_supports_unicode_destination_names() {
        let directory = TestDirectory::new("windows-unicode");
        let destination = directory.join("プロジェクト-💿.sbls.json");

        write(&destination, "保存済み 💿".as_bytes()).unwrap();

        assert_eq!(fs::read(&destination).unwrap(), "保存済み 💿".as_bytes());
        assert_no_operation_temporaries(&directory);
    }

    #[cfg(windows)]
    #[test]
    fn windows_real_replacement_failure_preserves_old_bytes_and_cleans_temp() {
        use std::os::windows::fs::OpenOptionsExt;

        let directory = TestDirectory::new("windows-locked");
        let destination = directory.join("locked.sbls.json");
        fs::write(&destination, b"known good Windows bytes").unwrap();
        let lock = OpenOptions::new()
            .read(true)
            .share_mode(0)
            .open(&destination)
            .unwrap();

        let error = write(&destination, b"replacement must not land").unwrap_err();

        assert_eq!(error.phase, WritePhase::ReplaceDestination);
        drop(lock);
        assert_eq!(fs::read(&destination).unwrap(), b"known good Windows bytes");
        assert_no_operation_temporaries(&directory);
    }
}
