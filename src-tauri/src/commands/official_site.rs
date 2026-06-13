use std::net::{IpAddr, ToSocketAddrs};
use std::time::Duration;

use super::types::{DownloadedArtwork, FetchedTextDocument};

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
            return Err(
                "Official-site URL points to a blocked internal network address.".to_string(),
            );
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
            return Err(
                "Official-site URL resolved to a blocked internal network address.".to_string(),
            );
        }
    }

    if !saw_address {
        return Err("Official-site host did not resolve to any addresses.".to_string());
    }

    Ok(())
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
            let redirect_url = parsed_url
                .join(location)
                .map_err(|error| error.to_string())?;

            validate_public_https_url(&redirect_url)?;
            parsed_url = redirect_url;
            continue;
        }

        if !status.is_success() {
            return Err(format!(
                "Official-site {response_label} request failed with status {status}"
            ));
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

        if response
            .content_length()
            .is_some_and(|length| length > max_bytes as u64)
        {
            return Err(format!(
                "Official-site {response_label} response was too large."
            ));
        }

        let bytes = response.bytes().await.map_err(|error| error.to_string())?;

        if bytes.len() > max_bytes {
            return Err(format!(
                "Official-site {response_label} response was too large."
            ));
        }

        return Ok((parsed_url, content_type, bytes.to_vec()));
    }

    Err("Official-site URL redirected too many times.".to_string())
}

#[tauri::command]
pub(crate) async fn fetch_official_logo_discovery_html(
    url: String,
) -> Result<FetchedTextDocument, String> {
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

    let (final_url, _, bytes) =
        fetch_guarded_official_bytes(url, &["text/css"], MAX_OFFICIAL_CSS_BYTES, "CSS").await?;

    Ok(FetchedTextDocument {
        final_url: final_url.to_string(),
        contents: String::from_utf8(bytes).map_err(|error| error.to_string())?,
    })
}

#[tauri::command]
pub(crate) async fn fetch_official_logo_discovery_css_files(
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
pub(crate) async fn download_official_logo_candidate_image(
    url: String,
) -> Result<DownloadedArtwork, String> {
    const MAX_OFFICIAL_IMAGE_BYTES: usize = 6_000_000;

    let (_, content_type, bytes) =
        fetch_guarded_official_bytes(url, &["image/"], MAX_OFFICIAL_IMAGE_BYTES, "image").await?;

    Ok(DownloadedArtwork {
        content_type,
        bytes,
    })
}
