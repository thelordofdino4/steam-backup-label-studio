#[tauri::command]
pub(crate) fn write_project_file(path: String, contents: String) -> Result<(), String> {
    crate::project_file::write(&path, contents.as_bytes()).map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn read_project_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn write_binary_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    write_binary_file_with(&path, &bytes, |path, bytes| {
        crate::project_file::write(path, bytes)
    })
}

// PNG export shares the proven byte writer, without adopting project session
// or persistence-format semantics. The injected port exercises real failure
// phases through the same command-result boundary in native tests.
pub(crate) fn write_binary_file_with(
    path: &str,
    bytes: &[u8],
    write: impl FnOnce(&str, &[u8]) -> Result<(), crate::project_file::AtomicProjectWriteError>,
) -> Result<(), String> {
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
