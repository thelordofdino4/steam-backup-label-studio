use std::path::{Path, PathBuf};

use super::types::DownloadedArtwork;

pub(crate) fn image_content_type_for_path(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_str()?.to_lowercase();

    match extension.as_str() {
        "jpg" | "jpeg" => Some("image/jpeg"),
        "png" => Some("image/png"),
        "webp" => Some("image/webp"),
        "gif" => Some("image/gif"),
        "bmp" => Some("image/bmp"),
        _ => None,
    }
}

#[tauri::command]
pub(crate) fn read_local_image_file(path: String) -> Result<DownloadedArtwork, String> {
    let path = PathBuf::from(path);

    if !path.is_file() {
        return Err("Local image path does not point to a file.".to_string());
    }

    let content_type = image_content_type_for_path(&path)
        .ok_or_else(|| "Local file is not a supported image type.".to_string())?
        .to_string();

    let bytes = std::fs::read(path).map_err(|error| error.to_string())?;

    Ok(DownloadedArtwork {
        content_type,
        bytes,
    })
}
