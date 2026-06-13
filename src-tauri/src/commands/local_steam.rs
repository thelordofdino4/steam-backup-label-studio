use std::collections::HashSet;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;

use super::local_images::image_content_type_for_path;

#[derive(serde::Serialize)]
pub(crate) struct LocalSteamScreenshotAsset {
    id: String,
    label: String,
    path: String,
    folder_path: String,
    modified_unix_seconds: Option<u64>,
}

#[derive(serde::Serialize)]
pub(crate) struct LocalSteamLibraryCacheAsset {
    id: String,
    label: String,
    relative_path: String,
    path: String,
    modified_unix_seconds: Option<u64>,
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
            add_existing_path(
                &mut roots,
                PathBuf::from(program_files_x86)
                    .join("Steam")
                    .join("userdata"),
            );
        }

        if let Ok(program_files) = std::env::var("ProgramFiles") {
            add_existing_path(
                &mut roots,
                PathBuf::from(program_files).join("Steam").join("userdata"),
            );
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

#[tauri::command]
pub(crate) fn find_steam_screenshots(appid: u32) -> Result<Vec<LocalSteamScreenshotAsset>, String> {
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
pub(crate) fn find_steam_library_cache_assets(
    appid: u32,
) -> Result<Vec<LocalSteamLibraryCacheAsset>, String> {
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
