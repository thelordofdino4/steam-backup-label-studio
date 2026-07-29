use std::fs;
use std::path::Path;
#[cfg(test)]
use std::path::PathBuf;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum LegacyDestinationIdentity {
    Distinct,
    Conflict,
    Indeterminate,
}

pub(crate) fn compare_legacy_source_destination(
    source: &Path,
    destination: &Path,
) -> LegacyDestinationIdentity {
    let Ok(source_canonical) = fs::canonicalize(source) else {
        return LegacyDestinationIdentity::Indeterminate;
    };
    let Ok(source_metadata) = fs::metadata(&source_canonical) else {
        return LegacyDestinationIdentity::Indeterminate;
    };

    match fs::symlink_metadata(destination) {
        Ok(_) => {
            let Ok(destination_canonical) = fs::canonicalize(destination) else {
                return LegacyDestinationIdentity::Indeterminate;
            };
            let Ok(destination_metadata) = fs::metadata(&destination_canonical) else {
                return LegacyDestinationIdentity::Indeterminate;
            };
            if normalized_path_eq(&source_canonical, &destination_canonical) {
                LegacyDestinationIdentity::Conflict
            } else {
                match same_native_file(
                    &source_canonical,
                    &destination_canonical,
                    &source_metadata,
                    &destination_metadata,
                ) {
                    Some(true) => LegacyDestinationIdentity::Conflict,
                    Some(false) => LegacyDestinationIdentity::Distinct,
                    None => LegacyDestinationIdentity::Indeterminate,
                }
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            let Some(file_name) = destination.file_name().filter(|name| !name.is_empty()) else {
                return LegacyDestinationIdentity::Indeterminate;
            };
            let parent = destination
                .parent()
                .filter(|path| !path.as_os_str().is_empty())
                .unwrap_or_else(|| Path::new("."));
            let Ok(parent) = fs::canonicalize(parent) else {
                return LegacyDestinationIdentity::Indeterminate;
            };
            let candidate = parent.join(file_name);
            if normalized_path_eq(&source_canonical, &candidate) {
                LegacyDestinationIdentity::Conflict
            } else {
                LegacyDestinationIdentity::Distinct
            }
        }
        Err(_) => LegacyDestinationIdentity::Indeterminate,
    }
}

#[cfg(windows)]
fn normalized_path_eq(left: &Path, right: &Path) -> bool {
    left.to_string_lossy()
        .eq_ignore_ascii_case(&right.to_string_lossy())
}

#[cfg(not(windows))]
fn normalized_path_eq(left: &Path, right: &Path) -> bool {
    left == right
}

#[cfg(windows)]
fn same_native_file(
    left_path: &Path,
    right_path: &Path,
    _left: &fs::Metadata,
    _right: &fs::Metadata,
) -> Option<bool> {
    use std::mem::MaybeUninit;
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{
        GetFileInformationByHandle, BY_HANDLE_FILE_INFORMATION,
    };

    fn information(path: &Path) -> Option<BY_HANDLE_FILE_INFORMATION> {
        let file = fs::File::open(path).ok()?;
        let mut information = MaybeUninit::<BY_HANDLE_FILE_INFORMATION>::zeroed();
        let result = unsafe {
            GetFileInformationByHandle(
                file.as_raw_handle() as windows_sys::Win32::Foundation::HANDLE,
                information.as_mut_ptr(),
            )
        };
        (result != 0).then(|| unsafe { information.assume_init() })
    }

    let (Some(left), Some(right)) = (information(left_path), information(right_path)) else {
        return None;
    };
    Some(
        left.dwVolumeSerialNumber == right.dwVolumeSerialNumber
            && left.nFileIndexHigh == right.nFileIndexHigh
            && left.nFileIndexLow == right.nFileIndexLow,
    )
}

#[cfg(unix)]
fn same_native_file(
    _left_path: &Path,
    _right_path: &Path,
    left: &fs::Metadata,
    right: &fs::Metadata,
) -> Option<bool> {
    use std::os::unix::fs::MetadataExt;
    Some(left.dev() == right.dev() && left.ino() == right.ino())
}

#[cfg(not(any(windows, unix)))]
fn same_native_file(
    _left_path: &Path,
    _right_path: &Path,
    _left: &fs::Metadata,
    _right: &fs::Metadata,
) -> Option<bool> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let sequence = TEST_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "sbls-legacy-identity-{}-{sequence}",
                std::process::id()
            ));
            fs::create_dir(&path).unwrap();
            Self(path)
        }

        fn join(&self, name: &str) -> PathBuf {
            self.0.join(name)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn exact_and_hard_link_aliases_conflict_while_distinct_absent_path_succeeds() {
        let directory = TestDirectory::new();
        let source = directory.join("legacy.json");
        let hard_link = directory.join("alias.sbls");
        fs::write(&source, b"legacy").unwrap();
        fs::hard_link(&source, &hard_link).unwrap();

        assert_eq!(
            compare_legacy_source_destination(&source, &source),
            LegacyDestinationIdentity::Conflict
        );
        assert_eq!(
            compare_legacy_source_destination(&source, &hard_link),
            LegacyDestinationIdentity::Conflict
        );
        assert_eq!(
            compare_legacy_source_destination(&source, &directory.join("new.sbls")),
            LegacyDestinationIdentity::Distinct
        );
    }

    #[test]
    fn missing_source_or_unresolvable_parent_fails_indeterminate() {
        let directory = TestDirectory::new();
        assert_eq!(
            compare_legacy_source_destination(
                &directory.join("missing.json"),
                &directory.join("new.sbls"),
            ),
            LegacyDestinationIdentity::Indeterminate
        );
        let source = directory.join("legacy.json");
        fs::write(&source, b"legacy").unwrap();
        assert_eq!(
            compare_legacy_source_destination(
                &source,
                &directory.join("missing-parent").join("new.sbls"),
            ),
            LegacyDestinationIdentity::Indeterminate
        );
    }

    #[test]
    fn normalized_dot_segment_and_symlink_aliases_conflict() {
        let directory = TestDirectory::new();
        let source = directory.join("legacy.json");
        fs::write(&source, b"legacy").unwrap();
        assert_eq!(
            compare_legacy_source_destination(&source, &directory.join(".").join("legacy.json"),),
            LegacyDestinationIdentity::Conflict
        );

        let symlink = directory.join("symlink.sbls");
        #[cfg(windows)]
        let link_result = std::os::windows::fs::symlink_file(&source, &symlink);
        #[cfg(unix)]
        let link_result = std::os::unix::fs::symlink(&source, &symlink);
        #[cfg(not(any(windows, unix)))]
        let link_result: std::io::Result<()> = Err(std::io::Error::new(
            std::io::ErrorKind::Unsupported,
            "symbolic links are unavailable",
        ));

        match link_result {
            Ok(()) => assert_eq!(
                compare_legacy_source_destination(&source, &symlink),
                LegacyDestinationIdentity::Conflict
            ),
            Err(error)
                if matches!(
                    error.kind(),
                    std::io::ErrorKind::PermissionDenied | std::io::ErrorKind::Unsupported
                ) || cfg!(windows) && error.raw_os_error() == Some(1314) => {}
            Err(error) => panic!("unexpected symbolic-link failure: {error}"),
        }
    }

    #[cfg(windows)]
    #[test]
    fn windows_case_alias_conflicts() {
        let directory = TestDirectory::new();
        let source = directory.join("LegacyCase.sbls");
        fs::write(&source, b"legacy").unwrap();
        let alias = directory.join("legacycase.SBLS");
        assert_eq!(
            compare_legacy_source_destination(&source, &alias),
            LegacyDestinationIdentity::Conflict
        );
    }
}
