use std::time::Duration;

use super::types::DownloadedArtwork;

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
pub(crate) async fn search_steam_store(term: String) -> Result<String, String> {
    let trimmed_term = term.trim();

    if trimmed_term.is_empty() {
        return Err("Search term cannot be empty.".to_string());
    }

    let url = reqwest::Url::parse_with_params(
        "https://store.steampowered.com/api/storesearch/",
        &[("term", trimmed_term), ("l", "english"), ("cc", "us")],
    )
    .map_err(|error| error.to_string())?;

    fetch_url_text(url).await
}

#[tauri::command]
pub(crate) async fn fetch_steam_app_details(appid: u32) -> Result<String, String> {
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
pub(crate) async fn fetch_steam_store_items(appid: u32) -> Result<String, String> {
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
pub(crate) async fn fetch_steam_page_html(url: String) -> Result<String, String> {
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
            let redirect_url = parsed_url
                .join(location)
                .map_err(|error| error.to_string())?;

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

        if !content_type.starts_with("text/html") && !content_type.starts_with("application/xhtml")
        {
            return Err("Steam page response was not HTML.".to_string());
        }

        let bytes = response.bytes().await.map_err(|error| error.to_string())?;

        if bytes.len() > MAX_STEAM_PAGE_BYTES {
            return Err("Steam page response was too large for logo discovery.".to_string());
        }

        return String::from_utf8(bytes.to_vec()).map_err(|error| error.to_string());
    }

    Err("Steam page redirected too many times.".to_string())
}

#[tauri::command]
pub(crate) async fn download_steam_artwork(url: String) -> Result<DownloadedArtwork, String> {
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
