async fn fetch_url_text(url: reqwest::Url) -> Result<String, String> {
  let client = reqwest::Client::new();
  let response = client
    .get(url)
    .header(
      reqwest::header::USER_AGENT,
      "Steam Backup Label Studio pre-alpha",
    )
    .send()
    .await
    .map_err(|error| error.to_string())?;

  let status = response.status();

  if !status.is_success() {
    return Err(format!("Steam request failed with status {status}"));
  }

  response.text().await.map_err(|error| error.to_string())
}

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

#[tauri::command]
async fn search_steam_store(term: String) -> Result<String, String> {
  let trimmed_term = term.trim();

  if trimmed_term.is_empty() {
    return Err("Search term cannot be empty.".to_string());
  }

  let url = reqwest::Url::parse_with_params(
    "https://store.steampowered.com/api/storesearch/",
    &[
      ("term", trimmed_term),
      ("l", "english"),
      ("cc", "us"),
    ],
  )
  .map_err(|error| error.to_string())?;

  fetch_url_text(url).await
}

#[tauri::command]
async fn fetch_steam_app_details(appid: u32) -> Result<String, String> {
  let appid_string = appid.to_string();
  let url = reqwest::Url::parse_with_params(
    "https://store.steampowered.com/api/appdetails/",
    &[
      ("appids", appid_string.as_str()),
      ("l", "english"),
      ("cc", "us"),
    ],
  )
  .map_err(|error| error.to_string())?;

  fetch_url_text(url).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      write_project_file,
      read_project_file,
      write_binary_file,
      search_steam_store,
      fetch_steam_app_details
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
