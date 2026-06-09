use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::net::{IpAddr, ToSocketAddrs};
use std::time::Duration;
use std::time::UNIX_EPOCH;

#[derive(serde::Serialize)]
struct DownloadedArtwork {
  content_type: String,
  bytes: Vec<u8>,
}

#[derive(serde::Serialize)]
struct FetchedTextDocument {
  final_url: String,
  contents: String,
}

#[derive(serde::Serialize)]
struct LocalSteamScreenshotAsset {
  id: String,
  label: String,
  path: String,
  folder_path: String,
  modified_unix_seconds: Option<u64>,
}

#[derive(serde::Serialize)]
struct LocalSteamLibraryCacheAsset {
  id: String,
  label: String,
  relative_path: String,
  path: String,
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

fn steam_install_roots() -> Vec<PathBuf> {
  let mut roots = Vec::new();

  if let Ok(steam_dir) = std::env::var("STEAM_DIR") {
    add_existing_path(&mut roots, PathBuf::from(steam_dir));
  }

  #[cfg(target_os = "windows")]
  {
    if let Ok(program_files_x86) = std::env::var("ProgramFiles(x86)") {
      add_existing_path(&mut roots, PathBuf::from(program_files_x86).join("Steam"));
    }

    if let Ok(program_files) = std::env::var("ProgramFiles") {
      add_existing_path(&mut roots, PathBuf::from(program_files).join("Steam"));
    }
  }

  #[cfg(target_os = "linux")]
  {
    if let Ok(home) = std::env::var("HOME") {
      let home = PathBuf::from(home);
      add_existing_path(&mut roots, home.join(".local/share/Steam"));
      add_existing_path(&mut roots, home.join(".steam/steam"));
      add_existing_path(
        &mut roots,
        home.join(".var/app/com.valvesoftware.Steam/.local/share/Steam"),
      );
    }
  }

  #[cfg(target_os = "macos")]
  {
    if let Ok(home) = std::env::var("HOME") {
      add_existing_path(
        &mut roots,
        PathBuf::from(home).join("Library/Application Support/Steam"),
      );
    }
  }

  roots
}

fn is_steam_asset_hash(value: &str) -> bool {
  value.len() == 40 && value.chars().all(|character| character.is_ascii_hexdigit())
}

fn is_steam_asset_hash_file_name(file_name: &str) -> bool {
  let lower_file_name = file_name.to_ascii_lowercase();

  for extension in [".jpg", ".jpeg", ".png", ".webp"] {
    if let Some(stem) = lower_file_name.strip_suffix(extension) {
      return is_steam_asset_hash(stem);
    }
  }

  false
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

fn is_blocked_ip_address(ip: IpAddr) -> bool {
  match ip {
    IpAddr::V4(ipv4) => {
      ipv4.is_private()
        || ipv4.is_loopback()
        || ipv4.is_link_local()
        || ipv4.is_unspecified()
        || ipv4.is_broadcast()
        || ipv4.is_multicast()
    }
    IpAddr::V6(ipv6) => {
      ipv6.is_loopback()
        || ipv6.is_unspecified()
        || ipv6.is_multicast()
        || ipv6.is_unique_local()
        || ipv6.is_unicast_link_local()
    }
  }
}

fn is_blocked_host_name(host: &str) -> bool {
  let normalized_host = host.trim().trim_end_matches('.').to_lowercase();

  normalized_host == "localhost"
    || normalized_host.ends_with(".localhost")
    || normalized_host.ends_with(".local")
    || normalized_host.ends_with(".internal")
}

fn validate_public_https_url(url: &reqwest::Url) -> Result<(), String> {
  if url.scheme() != "https" {
    return Err("Only HTTPS official-site URLs are allowed.".to_string());
  }

  let host = url
    .host_str()
    .ok_or_else(|| "Official-site URL is missing a host.".to_string())?;

  if is_blocked_host_name(host) {
    return Err("Official-site URL points to a blocked local host.".to_string());
  }

  if let Ok(ip) = host.parse::<IpAddr>() {
    if is_blocked_ip_address(ip) {
      return Err("Official-site URL points to a blocked internal network address.".to_string());
    }

    return Ok(());
  }

  let port = url.port_or_known_default().unwrap_or(443);
  let mut resolved_addresses = (host, port)
    .to_socket_addrs()
    .map_err(|error| format!("Official-site host could not be resolved: {error}"))?;
  let mut saw_address = false;

  for address in &mut resolved_addresses {
    saw_address = true;
    if is_blocked_ip_address(address.ip()) {
      return Err("Official-site URL resolved to a blocked internal network address.".to_string());
    }
  }

  if !saw_address {
    return Err("Official-site host did not resolve to any addresses.".to_string());
  }

  Ok(())
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
async fn fetch_steam_store_items(appid: u32) -> Result<String, String> {
  let input_json = serde_json::json!({
    "ids": [{ "appid": appid }],
    "context": {
      "country_code": "US",
      "language": "english"
    },
    "data_request": {
      "include_assets": true,
      "include_assets_without_overrides": true
    }
  })
  .to_string();

  let url = reqwest::Url::parse_with_params(
    "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/",
    &[("input_json", input_json.as_str())],
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

async fn fetch_guarded_official_bytes(
  url: String,
  accepted_content_type_prefixes: &[&str],
  max_bytes: usize,
  response_label: &str,
) -> Result<(reqwest::Url, String, Vec<u8>), String> {
  const MAX_OFFICIAL_REDIRECTS: usize = 5;

  let mut parsed_url = reqwest::Url::parse(url.trim()).map_err(|error| error.to_string())?;
  validate_public_https_url(&parsed_url)?;

  let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(10))
    .redirect(reqwest::redirect::Policy::none())
    .build()
    .map_err(|error| error.to_string())?;

  for _ in 0..MAX_OFFICIAL_REDIRECTS {
    let response = client
      .get(parsed_url.clone())
      .header(
        reqwest::header::USER_AGENT,
        "Steam Backup Label Studio pre-alpha logo candidate discovery",
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
        .ok_or_else(|| "Official-site redirect was missing a location.".to_string())?;
      let redirect_url = parsed_url.join(location).map_err(|error| error.to_string())?;

      validate_public_https_url(&redirect_url)?;
      parsed_url = redirect_url;
      continue;
    }

    if !status.is_success() {
      return Err(format!("Official-site {response_label} request failed with status {status}"));
    }

    let content_type = response
      .headers()
      .get(reqwest::header::CONTENT_TYPE)
      .and_then(|value| value.to_str().ok())
      .unwrap_or("")
      .to_string();

    if !accepted_content_type_prefixes
      .iter()
      .any(|prefix| content_type.starts_with(prefix))
    {
      return Err(format!(
        "Official-site {response_label} response had unsupported content type."
      ));
    }

    if response.content_length().is_some_and(|length| length > max_bytes as u64) {
      return Err(format!("Official-site {response_label} response was too large."));
    }

    let bytes = response
      .bytes()
      .await
      .map_err(|error| error.to_string())?;

    if bytes.len() > max_bytes {
      return Err(format!("Official-site {response_label} response was too large."));
    }

    return Ok((parsed_url, content_type, bytes.to_vec()));
  }

  Err("Official-site URL redirected too many times.".to_string())
}

#[tauri::command]
async fn fetch_official_logo_discovery_html(url: String) -> Result<FetchedTextDocument, String> {
  const MAX_OFFICIAL_HTML_BYTES: usize = 1_500_000;

  let (final_url, _, bytes) = fetch_guarded_official_bytes(
    url,
    &["text/html", "application/xhtml"],
    MAX_OFFICIAL_HTML_BYTES,
    "HTML",
  )
  .await?;

  Ok(FetchedTextDocument {
    final_url: final_url.to_string(),
    contents: String::from_utf8(bytes).map_err(|error| error.to_string())?,
  })
}

async fn fetch_official_logo_discovery_css_document(
  url: String,
) -> Result<FetchedTextDocument, String> {
  const MAX_OFFICIAL_CSS_BYTES: usize = 750_000;

  let (final_url, _, bytes) = fetch_guarded_official_bytes(
    url,
    &["text/css"],
    MAX_OFFICIAL_CSS_BYTES,
    "CSS",
  )
  .await?;

  Ok(FetchedTextDocument {
    final_url: final_url.to_string(),
    contents: String::from_utf8(bytes).map_err(|error| error.to_string())?,
  })
}

#[tauri::command]
async fn fetch_official_logo_discovery_css_files(
  urls: Vec<String>,
) -> Result<Vec<FetchedTextDocument>, String> {
  const MAX_OFFICIAL_CSS_FILES: usize = 6;

  if urls.len() > MAX_OFFICIAL_CSS_FILES {
    return Err(format!(
      "Official-site logo discovery can follow at most {MAX_OFFICIAL_CSS_FILES} linked CSS files."
    ));
  }

  let mut documents = Vec::new();

  for url in urls {
    if let Ok(document) = fetch_official_logo_discovery_css_document(url).await {
      documents.push(document);
    }
  }

  Ok(documents)
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
fn find_steam_library_cache_assets(appid: u32) -> Result<Vec<LocalSteamLibraryCacheAsset>, String> {
  let appid_string = appid.to_string();
  let mut assets = Vec::new();
  let mut seen_relative_paths = HashSet::new();

  for steam_root in steam_install_roots() {
    let cache_root = steam_root
      .join("appcache")
      .join("librarycache")
      .join(&appid_string);

    if !cache_root.is_dir() {
      continue;
    }

    let entries = match std::fs::read_dir(&cache_root) {
      Ok(entries) => entries,
      Err(_) => continue,
    };

    for entry in entries.flatten() {
      let entry_path = entry.path();
      let entry_name = match entry.file_name().to_str() {
        Some(name) => name.to_string(),
        None => continue,
      };

      if entry_path.is_dir() {
        if !is_steam_asset_hash(&entry_name) {
          continue;
        }

        let files = match std::fs::read_dir(&entry_path) {
          Ok(files) => files,
          Err(_) => continue,
        };

        for file in files.flatten() {
          let path = file.path();

          if !path.is_file() || image_content_type_for_path(&path).is_none() {
            continue;
          }

          let file_name = match file.file_name().to_str() {
            Some(name) => name.to_string(),
            None => continue,
          };
          let relative_path = format!("{entry_name}/{file_name}");

          if !seen_relative_paths.insert(relative_path.clone()) {
            continue;
          }

          let modified_unix_seconds = file
            .metadata()
            .ok()
            .and_then(|metadata| metadata.modified().ok())
            .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs());

          assets.push(LocalSteamLibraryCacheAsset {
            id: format!("steam-library-cache-{}-{}", appid, assets.len()),
            label: file_name,
            relative_path,
            path: path.to_string_lossy().to_string(),
            modified_unix_seconds,
          });
        }

        continue;
      }

      if !entry_path.is_file()
        || image_content_type_for_path(&entry_path).is_none()
        || !is_steam_asset_hash_file_name(&entry_name)
      {
        continue;
      }

      if !seen_relative_paths.insert(entry_name.clone()) {
        continue;
      }

      let modified_unix_seconds = entry
        .metadata()
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs());

      assets.push(LocalSteamLibraryCacheAsset {
        id: format!("steam-library-cache-{}-{}", appid, assets.len()),
        label: entry_name.clone(),
        relative_path: entry_name,
        path: entry_path.to_string_lossy().to_string(),
        modified_unix_seconds,
      });
    }
  }

  assets.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

  Ok(assets)
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

#[tauri::command]
async fn download_official_logo_candidate_image(url: String) -> Result<DownloadedArtwork, String> {
  const MAX_OFFICIAL_IMAGE_BYTES: usize = 6_000_000;

  let (_, content_type, bytes) = fetch_guarded_official_bytes(
    url,
    &["image/"],
    MAX_OFFICIAL_IMAGE_BYTES,
    "image",
  )
  .await?;

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
      fetch_steam_store_items,
      fetch_steam_page_html,
      find_steam_screenshots,
      find_steam_library_cache_assets,
      read_local_image_file,
      open_local_folder,
      download_steam_artwork,
      fetch_official_logo_discovery_html,
      fetch_official_logo_discovery_css_files,
      download_official_logo_candidate_image
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
