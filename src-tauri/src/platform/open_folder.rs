use std::path::PathBuf;
use std::process::Command;

#[tauri::command]
pub(crate) fn open_local_folder(path: String) -> Result<(), String> {
    let path = PathBuf::from(path);

    if !path.is_dir() {
        return Err("Local path does not point to a folder.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}
