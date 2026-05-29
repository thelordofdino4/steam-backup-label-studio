use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;
use std::time::UNIX_EPOCH;

#[derive(serde::Serialize)]
struct DownloadedArtwork {
  content_type: String,
  bytes: Vec<u8>,
}

#[derive(serde::Serialize)]
struct LocalSteamScreenshotAsset {
  id: String,
  label: String,
  path: String,
  folder_path: String,
  modified_unix_seconds: Option<u64>,
}

fn image_content_type_for_path(path: &Path) -> Option<&'static str> {
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

fn add_existing_path(paths: &mut Vec<PathBuf>, path: PathBuf) {
  if path.exists() && !paths.contains(&path) {
    paths.push(path);
  }
}

fn steam_userdata_roots() -> Vec<PathBuf> {
  let mut roots = Vec::new();

  #[cfg(target_os = "windows")]
  {
    if let Ok(program_files_x86) = std::env::var("ProgramFiles(x86)") {
      add_existing_path(&mut roots, PathBuf::from(program_files_x86).join("Steam").join("userdata"));
    }

    if let Ok(program_files) = std::env::var("ProgramFiles") {
      add_existing_path(&mut roots, PathBuf::from(program_files).join("Steam").join("userdata"));
    }
  }

  #[cfg(target_os = "linux")]
  {
    if let Ok(home) = std::env::var("HOME") {
      let home = PathBuf::from(home);
      add_existing_path(&mut roots, home.join(".local/share/Steam/userdata"));
      add_existing_path(&mut roots, home.join(".steam/steam/userdata"));
      add_existing_path(
        &mut roots,
        home.join(".var/app/com.valvesoftware.Steam/.local/share/Steam/userdata"),
      );
    }
  }

  #[cfg(target_os = "macos")]
  {
    if let Ok(home) = std::env::var("HOME") {
      add_existing_path(
        &mut roots,
        PathBuf::from(home).join("Library/Application Support/Steam/userdata"),
      );
    }
  }

  roots
}

fn is_allowed_steam_artwork_host(host: &str) -> bool {
  host == "steamstatic.com"
    || host.ends_with(".steamstatic.com")
    || host == "steampowered.com"
    || host.ends_with(".steampowered.com")
}

fn is_allowed_steam_page_host(host: &str) -> bool {
  host == "steamcommunity.com"
    || host.ends_with(".steamcommunity.com")
    || host == "steampowered.com"
    || host.ends_with(".steampowered.com")
}

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

#[tauri::command]
async fn fetch_steam_page_html(url: String) -> Result<String, String> {
  const MAX_STEAM_PAGE_BYTES: usize = 1_500_000;
  const MAX_STEAM_PAGE_REDIRECTS: usize = 4;

  let mut parsed_url = reqwest::Url::parse(url.trim()).map_err(|error| error.to_string())?;

  if parsed_url.scheme() != "https" {
    return Err("Only HTTPS Steam page URLs are allowed.".to_string());
  }

  let host = parsed_url
    .host_str()
    .ok_or_else(|| "Steam page URL is missing a host.".to_string())?;

  if !is_allowed_steam_page_host(host) {
    return Err("Only Steam-hosted page URLs are allowed.".to_string());
  }

  let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(10))
    .redirect(reqwest::redirect::Policy::none())
    .build()
    .map_err(|error| error.to_string())?;

  for _ in 0..MAX_STEAM_PAGE_REDIRECTS {
    let response = client
      .get(parsed_url.clone())
      .header(
        reqwest::header::USER_AGENT,
        "Steam Backup Label Studio pre-alpha",
      )
      .send()
      .await
      .map_err(|error| error.to_string())?;

    let status = response.status();

    if status.is_redirection() {
      let location = response
        .headers()
        .get(reqwest::header::LOCATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| "Steam page redirect was missing a location.".to_string())?;
      let redirect_url = parsed_url.join(location).map_err(|error| error.to_string())?;

      if redirect_url.scheme() != "https" {
        return Err("Steam page redirected to a non-HTTPS URL.".to_string());
      }

      let redirect_host = redirect_url
        .host_str()
        .ok_or_else(|| "Steam page redirect URL is missing a host.".to_string())?;

      if !is_allowed_steam_page_host(redirect_host) {
        return Err("Steam page redirected outside Steam.".to_string());
      }

      parsed_url = redirect_url;
      continue;
    }

    if !status.is_success() {
      return Err(format!("Steam page request failed with status {status}"));
    }

    let content_type = response
      .headers()
      .get(reqwest::header::CONTENT_TYPE)
      .and_then(|value| value.to_str().ok())
      .unwrap_or("");

    if !content_type.starts_with("text/html") && !content_type.starts_with("application/xhtml") {
      return Err("Steam page response was not HTML.".to_string());
    }

    let bytes = response
      .bytes()
      .await
      .map_err(|error| error.to_string())?;

    if bytes.len() > MAX_STEAM_PAGE_BYTES {
      return Err("Steam page response was too large for logo discovery.".to_string());
    }

    return String::from_utf8(bytes.to_vec()).map_err(|error| error.to_string());
  }

  Err("Steam page redirected too many times.".to_string())
}

#[tauri::command]
fn find_steam_screenshots(appid: u32) -> Result<Vec<LocalSteamScreenshotAsset>, String> {
  let appid_string = appid.to_string();
  let mut screenshots = Vec::new();

  for userdata_root in steam_userdata_roots() {
    let user_dirs = match std::fs::read_dir(userdata_root) {
      Ok(entries) => entries,
      Err(_) => continue,
    };

    for user_dir in user_dirs.flatten() {
      let screenshot_dir = user_dir
        .path()
        .join("760")
        .join("remote")
        .join(&appid_string)
        .join("screenshots");

      if !screenshot_dir.is_dir() {
        continue;
      }

      let entries = match std::fs::read_dir(&screenshot_dir) {
        Ok(entries) => entries,
        Err(_) => continue,
      };

      for entry in entries.flatten() {
        let path = entry.path();

        if !path.is_file() || image_content_type_for_path(&path).is_none() {
          continue;
        }

        let label = path
          .file_name()
          .and_then(|name| name.to_str())
          .unwrap_or("Steam screenshot")
          .to_string();

        let modified_unix_seconds = entry
          .metadata()
          .ok()
          .and_then(|metadata| metadata.modified().ok())
          .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
          .map(|duration| duration.as_secs());

        screenshots.push(LocalSteamScreenshotAsset {
          id: format!("local-steam-screenshot-{}-{}", appid, screenshots.len()),
          label,
          path: path.to_string_lossy().to_string(),
          folder_path: screenshot_dir.to_string_lossy().to_string(),
          modified_unix_seconds,
        });
      }
    }
  }

  screenshots.sort_by(|left, right| {
    right
      .modified_unix_seconds
      .cmp(&left.modified_unix_seconds)
      .then_with(|| left.label.cmp(&right.label))
  });

  Ok(screenshots)
}

#[tauri::command]
fn read_local_image_file(path: String) -> Result<DownloadedArtwork, String> {
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

#[tauri::command]
fn open_local_folder(path: String) -> Result<(), String> {
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

#[tauri::command]
async fn download_steam_artwork(url: String) -> Result<DownloadedArtwork, String> {
  let parsed_url = reqwest::Url::parse(url.trim()).map_err(|error| error.to_string())?;

  if parsed_url.scheme() != "https" {
    return Err("Only HTTPS artwork URLs are allowed.".to_string());
  }

  let host = parsed_url
    .host_str()
    .ok_or_else(|| "Artwork URL is missing a host.".to_string())?;

  if !is_allowed_steam_artwork_host(host) {
    return Err("Only Steam-hosted artwork URLs are allowed.".to_string());
  }

  let client = reqwest::Client::new();
  let response = client
    .get(parsed_url)
    .header(
      reqwest::header::USER_AGENT,
      "Steam Backup Label Studio pre-alpha",
    )
    .send()
    .await
    .map_err(|error| error.to_string())?;

  let status = response.status();

  if !status.is_success() {
    return Err(format!("Steam artwork request failed with status {status}"));
  }

  let content_type = response
    .headers()
    .get(reqwest::header::CONTENT_TYPE)
    .and_then(|value| value.to_str().ok())
    .unwrap_or("image/jpeg")
    .to_string();

  if !content_type.starts_with("image/") {
    return Err("Steam artwork response was not an image.".to_string());
  }

  let bytes = response
    .bytes()
    .await
    .map_err(|error| error.to_string())?
    .to_vec();

  Ok(DownloadedArtwork {
    content_type,
    bytes,
  })
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
      fetch_steam_app_details,
      fetch_steam_page_html,
      find_steam_screenshots,
      read_local_image_file,
      open_local_folder,
      download_steam_artwork
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
