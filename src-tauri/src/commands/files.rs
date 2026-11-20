use std::path::Path;
use tauri::ipc::{InvokeBody, Request};

#[tauri::command]
pub(crate) fn write_project_file(path: String, contents: String) -> Result<(), String> {
    crate::project_file::write(&path, contents.as_bytes()).map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn read_project_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|error| error.to_string())
}

const PNG_FRAME_MAGIC: &[u8; 8] = b"SBLSPEV1";
const PNG_FRAME_HEADER_BYTES: usize = 12;
const MAX_PNG_DESTINATION_UTF8_BYTES: usize = 128 * 1024;
const INVALID_FRAME: &str = "PNG write request is not a supported raw export frame.";
const INVALID_PATH: &str = "PNG destination metadata is invalid.";
const PATH_TOO_LARGE: &str = "PNG destination metadata is too large.";

fn parse_png_write(body: &InvokeBody) -> Result<(&Path, &[u8]), &'static str> {
    let InvokeBody::Raw(frame) = body else {
        return Err(INVALID_FRAME);
    };
    if frame.len() < PNG_FRAME_HEADER_BYTES || !frame.starts_with(PNG_FRAME_MAGIC) {
        return Err(INVALID_FRAME);
    }
    let path_length =
        u32::from_le_bytes(frame[8..12].try_into().map_err(|_| INVALID_FRAME)?) as usize;
    if path_length == 0 {
        return Err(INVALID_PATH);
    }
    if path_length > MAX_PNG_DESTINATION_UTF8_BYTES {
        return Err(PATH_TOO_LARGE);
    }
    let payload_offset = PNG_FRAME_HEADER_BYTES
        .checked_add(path_length)
        .ok_or(INVALID_FRAME)?;
    // A valid serializer always supplies bytes. Reject truncated path/empty tail.
    if payload_offset >= frame.len() {
        return Err(INVALID_FRAME);
    }
    let path_bytes = &frame[PNG_FRAME_HEADER_BYTES..payload_offset];
    if path_bytes.contains(&0) {
        return Err(INVALID_PATH);
    }
    let path = std::str::from_utf8(path_bytes).map_err(|_| INVALID_PATH)?;
    Ok((Path::new(path), &frame[payload_offset..]))
}

#[tauri::command]
pub(crate) fn write_export_png(request: Request<'_>) -> Result<(), String> {
    write_export_png_request(request.body())
}

pub(crate) fn write_export_png_request(body: &InvokeBody) -> Result<(), String> {
    write_export_png_request_with(body, |path, bytes| crate::project_file::write(path, bytes))
}

// The existing atomic byte writer and failure presentation own commit semantics.
pub(crate) fn write_export_png_request_with(
    body: &InvokeBody,
    write: impl FnOnce(&Path, &[u8]) -> Result<(), crate::project_file::AtomicProjectWriteError>,
) -> Result<(), String> {
    let (path, bytes) = parse_png_write(body)?;
    write(path, bytes).map_err(|error| {
        let secondary = error.secondary_failures().map(|(operation, source)| {
            format!(" Additional filesystem failure ({operation}): {source}.")
        }).collect::<String>();
        format!(
            "PNG destination commit failed during {}: {}. The destination was not replaced; retry is safe.{}",
            error.phase().description(), error.io_error(), secondary,
        )
    })
}

#[cfg(test)]
pub(crate) fn png_request_body(path: &Path, bytes: &[u8]) -> InvokeBody {
    let path = path.to_str().unwrap().as_bytes();
    let mut frame = PNG_FRAME_MAGIC.to_vec();
    frame.extend_from_slice(&(path.len() as u32).to_le_bytes());
    frame.extend_from_slice(path);
    frame.extend_from_slice(bytes);
    InvokeBody::Raw(frame)
}

#[cfg(test)]
mod tests {
    use super::*;

    // A byte-for-byte fixture shared with pngFile.test.ts, independent of the test frame builder.
    const CROSS_LANGUAGE_FRAME: &[u8] = &[
        83, 66, 76, 83, 80, 69, 86, 49, 28, 0, 0, 0, 67, 58, 92, 74, 97, 195, 169, 110, 92, 228,
        191, 157, 229, 173, 152, 32, 240, 159, 146, 191, 37, 50, 48, 33, 46, 112, 110, 103, 0, 255,
        33,
    ];

    #[test]
    fn png_frame_preserves_unicode_path_and_borrows_original_payload() {
        let body = InvokeBody::Raw(CROSS_LANGUAGE_FRAME.to_vec());
        let InvokeBody::Raw(frame) = &body else {
            unreachable!()
        };
        write_export_png_request_with(&body, |path, bytes| {
            assert_eq!(
                path.as_os_str(),
                Path::new("C:\\Ja\u{00e9}n\\\u{4fdd}\u{5b58} \u{1f4bf}%20!.png").as_os_str()
            );
            assert_eq!(bytes, &[0, 255, 33]);
            assert_eq!(bytes.as_ptr(), frame[frame.len() - bytes.len()..].as_ptr());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn png_frame_accepts_extended_and_multibyte_paths_without_percent_expansion() {
        let wide = format!("\\\\?\\C:\\{}output.png", "\u{4fdd}\u{5b58}\\".repeat(500));
        let exact = "a".repeat(MAX_PNG_DESTINATION_UTF8_BYTES);
        for destination in [wide, exact] {
            let body = png_request_body(Path::new(&destination), b"PNG");
            write_export_png_request_with(&body, |path, bytes| {
                assert_eq!(path.as_os_str(), Path::new(&destination).as_os_str());
                assert_eq!(bytes, b"PNG");
                Ok(())
            })
            .unwrap();
        }
    }

    #[test]
    fn malformed_raw_frames_and_json_fail_before_writer() {
        fn raw(path_length: u32, tail: &[u8]) -> InvokeBody {
            let mut frame = PNG_FRAME_MAGIC.to_vec();
            frame.extend_from_slice(&path_length.to_le_bytes());
            frame.extend_from_slice(tail);
            InvokeBody::Raw(frame)
        }
        let mut other_version = CROSS_LANGUAGE_FRAME.to_vec();
        other_version[7] = b'2';
        for (body, expected) in [
            (
                InvokeBody::Json(serde_json::json!({"path": "ignore.png", "bytes": [1]})),
                INVALID_FRAME,
            ),
            (InvokeBody::Raw(b"SBLSPEV1".to_vec()), INVALID_FRAME),
            (InvokeBody::Raw(other_version), INVALID_FRAME),
            (raw(0, b"x"), INVALID_PATH),
            (raw(9, b"abc"), INVALID_FRAME),
            (raw(3, b"abc"), INVALID_FRAME),
            (raw(3, b"a\0bp"), INVALID_PATH),
            (raw(2, b"\xff\x99p"), INVALID_PATH),
            (
                raw(MAX_PNG_DESTINATION_UTF8_BYTES as u32 + 1, b"x"),
                PATH_TOO_LARGE,
            ),
            (raw(u32::MAX, b"x"), PATH_TOO_LARGE),
        ] {
            let error = write_export_png_request_with(&body, |_, _| {
                panic!("malformed frame reached writer")
            })
            .unwrap_err();
            assert_eq!(error, expected);
        }
    }
}
