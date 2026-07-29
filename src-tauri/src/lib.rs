mod commands;
mod legacy_project_identity;
mod platform;
mod project_binary_io;
mod project_file;
mod project_format_recognition;

fn application_invoke_handler<R: tauri::Runtime>(
) -> impl Fn(tauri::ipc::Invoke<R>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        commands::files::write_project_file,
        commands::files::read_project_file,
        commands::files::write_binary_file,
        commands::project_files::read_binary_project_file,
        commands::project_files::recognize_project_file_format,
        commands::project_files::write_binary_project_file,
        commands::project_packages::decode_project_package_file,
        commands::project_packages::encode_and_write_project_package_file,
        commands::steam::search_steam_store,
        commands::steam::fetch_steam_app_details,
        commands::steam::fetch_steam_store_items,
        commands::steam::fetch_steam_page_html,
        commands::local_steam::find_steam_screenshots,
        commands::local_steam::find_steam_library_cache_assets,
        commands::local_images::read_local_image_file,
        platform::open_folder::open_local_folder,
        commands::steam::download_steam_artwork,
        commands::official_site::fetch_official_logo_discovery_html,
        commands::official_site::fetch_official_logo_discovery_css_files,
        commands::official_site::download_official_logo_candidate_image
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(application_invoke_handler())
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

#[cfg(test)]
mod tests {
    #[test]
    fn dedicated_project_persistence_commands_are_registered_in_the_application_handler() {
        let source = include_str!("lib.rs");
        for (module, command) in [
            ("project_files", "read_binary_project_file"),
            ("project_files", "recognize_project_file_format"),
            ("project_files", "write_binary_project_file"),
            ("project_packages", "decode_project_package_file"),
            ("project_packages", "encode_and_write_project_package_file"),
        ] {
            let qualified = ["commands::", module, "::", command].concat();
            assert_eq!(
                source.matches(&qualified).count(),
                1,
                "{command} must be registered exactly once"
            );
        }
    }
}
