#[tauri::command]
fn write_project_file(path: String, contents: String) -> Result<(), String> {
  std::fs::write(path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn read_project_file(path: String) -> Result<String, String> {
  std::fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_binary_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
  std::fs::write(path, bytes).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      write_project_file,
      read_project_file,
      write_binary_file
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
