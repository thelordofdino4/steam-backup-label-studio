//! Windows Disc-background picker. Renderer requests a selection, never a path.
use tauri::{ipc::Response, Window};

#[cfg(any(windows, test))]
mod selected_file {
    use super::super::local_images::image_content_type_for_path;
    use std::{fs::File, io::Read, path::Path};

    pub(super) const MAX_BYTES: u64 = 64 * 1024 * 1024;
    const MAX_NAME_BYTES: usize = 1024;
    const MAGIC: &[u8; 8] = b"SBLSBGI1";

    pub(super) const UNREADABLE: &str = "disc.background-picker.read-failed";
    const TOO_LARGE: &str = "disc.background-picker.too-large";
    const BAD_FORMAT: &str = "disc.background-picker.unsupported";

    fn mime_id(path: &Path) -> Result<u8, &'static str> {
        match image_content_type_for_path(path) {
            Some("image/png") => Ok(1),
            Some("image/jpeg") => Ok(2),
            Some("image/webp") => Ok(3),
            Some("image/gif") => Ok(4),
            Some("image/bmp") => Ok(5),
            _ => Err(BAD_FORMAT),
        }
    }

    fn frame_selected(
        mut file: impl Read,
        name: &str,
        mime: u8,
        declared_size: u64,
        limit: u64,
    ) -> Result<Vec<u8>, &'static str> {
        if declared_size > limit {
            return Err(TOO_LARGE);
        }
        if declared_size == 0
            || name.is_empty()
            || name.len() > MAX_NAME_BYTES
            || name.chars().any(|c| c.is_control() || matches!(c, '/' | '\\' | ':'))
        {
            return Err(UNREADABLE);
        }
        let payload = usize::try_from(declared_size).map_err(|_| TOO_LARGE)?;
        let header = 11 + name.len();
        let total = header.checked_add(payload).ok_or(TOO_LARGE)?;
        let mut bytes = Vec::new();
        bytes.try_reserve_exact(total).map_err(|_| UNREADABLE)?;
        bytes.extend_from_slice(MAGIC);
        bytes.push(mime);
        bytes.extend_from_slice(&(name.len() as u16).to_le_bytes());
        bytes.extend_from_slice(name.as_bytes());
        bytes.resize(total, 0);
        file.read_exact(&mut bytes[header..]).map_err(|_| UNREADABLE)?;
        // No second file read or unchecked growth. At most one extra byte is
        // consumed from the same open handle to detect races and over-limit files.
        let mut extra = [0u8; 1];
        if file.read(&mut extra).map_err(|_| UNREADABLE)? != 0 {
            return Err(if declared_size == limit { TOO_LARGE } else { UNREADABLE });
        }
        Ok(bytes)
    }

    pub(super) fn read_selected(path: &Path) -> Result<Vec<u8>, &'static str> {
        let mime = mime_id(path)?;
        let name = path.file_name().and_then(|s| s.to_str()).ok_or(UNREADABLE)?;
        // Check before opening and again on the actual open handle. No URL,
        // directory, or readable-by-path IPC is exposed to the renderer.
        if !path.metadata().map_err(|_| UNREADABLE)?.is_file() {
            return Err(UNREADABLE);
        }
        let file = File::open(path).map_err(|_| UNREADABLE)?;
        let meta = file.metadata().map_err(|_| UNREADABLE)?;
        if !meta.is_file() {
            return Err(UNREADABLE);
        }
        frame_selected(file, name, mime, meta.len(), MAX_BYTES)
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::io::{self, Cursor};

        #[test]
        fn frame_preserves_exact_bytes_and_utf8_basename() {
            let input = [9, 0, 5, 255];
            let bytes = frame_selected(Cursor::new(input), "色.png", 1, 4, 4).unwrap();
            assert_eq!(&bytes[..8], MAGIC);
            assert_eq!(bytes[8], 1);
            assert_eq!(u16::from_le_bytes([bytes[9], bytes[10]]), 7);
            assert_eq!(&bytes[11..18], "色.png".as_bytes());
            assert_eq!(&bytes[18..], &input);
        }

        #[test]
        fn oversize_never_reads_and_resized_inputs_fail_closed() {
            struct NeverRead;
            impl Read for NeverRead {
                fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
                    panic!("validation must reject before reading")
                }
            }
            assert_eq!(frame_selected(NeverRead, "a.png", 1, 5, 4), Err(TOO_LARGE));
            assert_eq!(frame_selected(NeverRead, "dir/a.png", 1, 1, 4), Err(UNREADABLE));
            assert_eq!(frame_selected(Cursor::new([0; 2]), "a.png", 1, 3, 4), Err(UNREADABLE));
            assert_eq!(frame_selected(Cursor::new([0; 4]), "a.png", 1, 3, 4), Err(UNREADABLE));
            assert_eq!(frame_selected(Cursor::new([0; 5]), "a.png", 1, 4, 4), Err(TOO_LARGE));
        }

        #[test]
        fn selected_path_keeps_the_existing_raster_allowlist_and_requires_a_file() {
            for (name, kind) in [("a.PNG",1),("a.jpg",2),("a.jpeg",2),("a.webp",3),("a.gif",4),("a.bmp",5)] {
                assert_eq!(mime_id(Path::new(name)), Ok(kind));
            }
            assert_eq!(mime_id(Path::new("a.svg")), Err(BAD_FORMAT));
            assert_eq!(read_selected(Path::new("missing-raster-for-picker-test.png")), Err(UNREADABLE));
        }
    }
}

#[tauri::command]
pub(crate) async fn pick_disc_background_image(window: Window) -> Result<Response, &'static str> {
    if window.label() != "main" {
        return Err("disc.background-picker.unavailable");
    }
    #[cfg(windows)]
    {
        use std::sync::atomic::{AtomicBool, Ordering};
        use tauri_plugin_dialog::{DialogExt, FilePath};

        static ACTIVE: AtomicBool = AtomicBool::new(false);
        struct ReleasePicker;
        impl Drop for ReleasePicker {
            fn drop(&mut self) {
                ACTIVE.store(false, Ordering::Release);
            }
        }

        // Tauri's blocking dialog may not run on the main thread. The guard
        // lives inside the blocking job, so renderer teardown cannot release
        // it while the dialog is still active.
        tauri::async_runtime::spawn_blocking(move || {
            if ACTIVE.swap(true, Ordering::AcqRel) {
                return Err("disc.background-picker.busy");
            }
            let _release = ReleasePicker;
            let selected = window
                .dialog()
                .file()
                .set_parent(&window)
                .set_title("Choose Disc background image")
                .add_filter("Supported images", &["png", "jpg", "jpeg", "webp", "gif", "bmp"])
                .blocking_pick_file();
            let bytes = match selected {
                None => Vec::new(),
                Some(FilePath::Path(path)) => selected_file::read_selected(&path)?,
                Some(_) => return Err(selected_file::UNREADABLE),
            };
            Ok(Response::new(bytes))
        })
        .await
        .map_err(|_| "disc.background-picker.unavailable")?
    }
    #[cfg(not(windows))]
    {
        Err("disc.background-picker.unavailable")
    }
}
