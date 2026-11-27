mod application_menu;
mod commands;
mod legacy_project_identity;
mod native_termination;
mod platform;
mod project_binary_io;
mod project_file;
mod project_format_recognition;
mod startup_diagnostics;

fn application_invoke_handler(
) -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        native_termination::install_native_termination,
        native_termination::commit_native_termination,
        native_termination::dispose_native_termination,
        application_menu::application_menu_platform,
        application_menu::install_application_menu,
        application_menu::apply_application_menu_projection,
        application_menu::dispose_application_menu,
        commands::files::write_project_file,
        commands::files::read_project_file,
        commands::files::write_export_png,
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
        commands::disc_background_picker::pick_disc_background_image,
        commands::image_import::validate_imported_image_asset,
        platform::open_folder::open_local_folder,
        commands::steam::download_steam_artwork,
        commands::official_site::fetch_official_logo_discovery_html,
        commands::official_site::fetch_official_logo_discovery_css_files,
        commands::official_site::download_official_logo_candidate_image
    ]
}

fn configure_native_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    if cfg!(debug_assertions) {
        app.handle().plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let started = std::time::Instant::now();
    let built = tauri::Builder::default()
        .manage(application_menu::ApplicationMenuManager::default())
        .manage(native_termination::NativeTerminationManager::default())
        .on_window_event(native_termination::on_window_event)
        .on_menu_event(application_menu::forward_application_menu_event)
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(application_invoke_handler())
        .setup(move |app| {
            // Tauri runs this hook after build and panics on an error returned to it.
            // Report the application-owned failure before it reaches that boundary.
            if let Err(error) = configure_native_app(app) {
                startup_diagnostics::report_failure_and_exit(
                    &tauri::Error::Setup(error.into()),
                    started.elapsed(),
                );
            }
            Ok(())
        })
        .build(tauri::generate_context!());
    match built {
        Ok(app) => app.run(native_termination::on_run_event),
        Err(error) => startup_diagnostics::report_failure_and_exit(&error, started.elapsed()),
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn dedicated_project_persistence_commands_are_registered_in_the_application_handler() {
        let source = include_str!("lib.rs");
        assert!(!source.contains(&["commands::files::", "write_binary_file"].concat()));
        for (module, command) in [
            ("image_import", "validate_imported_image_asset"),
            ("files", "write_export_png"),
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
