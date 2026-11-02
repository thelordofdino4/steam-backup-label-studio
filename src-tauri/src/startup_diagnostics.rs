use serde::Serialize;
use std::time::Duration;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StartupFailure {
    format: &'static str,
    version: u8,
    stage: &'static str,
    failure_code: &'static str,
    elapsed_ms: u64,
    elapsed_capped: bool,
    user_message: &'static str,
}

// Project only known variants. Never format a platform error, path, plugin name or payload.
pub(crate) fn project_failure(error: &tauri::Error, elapsed: Duration) -> StartupFailure {
    let (stage, failure_code, user_message) = match error {
        tauri::Error::Runtime(_) | tauri::Error::InvalidWindowHandle => (
            "native-window-webview", "startup.native-runtime-failed",
            "The native window or WebView could not start. Reopen SBLS; on Windows, check the Microsoft Edge WebView2 Runtime installation."),
        tauri::Error::PluginInitialization(_, _) => (
            "native-plugin", "startup.native-plugin-failed",
            "A desktop service could not initialize. Reopen SBLS; if this continues, reinstall it."),
        tauri::Error::Setup(_) => (
            "native-setup", "startup.native-setup-failed",
            "Desktop application setup failed. Reopen SBLS and try again."),
        tauri::Error::AssetNotFound(_) => (
            "packaged-assets", "startup.native-asset-missing",
            "A required application file is missing. Reinstall SBLS and try again."),
        tauri::Error::InvalidIcon(_) => (
            "native-icon", "startup.native-icon-invalid",
            "An application icon could not be loaded. Reinstall SBLS and try again."),
        _ => ("native-startup", "startup.native-unclassified",
            "Desktop startup failed. Reopen SBLS; if this continues, include this code in a bug report."),
    };
    let millis = elapsed.as_millis();
    StartupFailure {
        format: "sbls-native-startup-diagnostics",
        version: 1,
        stage,
        failure_code,
        elapsed_ms: millis.min(86_400_000) as u64,
        elapsed_capped: millis > 86_400_000,
        user_message,
    }
}

pub(crate) fn report_failure(error: &tauri::Error, elapsed: Duration) {
    let failure = project_failure(error, elapsed);
    // This structure contains static allowlisted text and bounded duration only.
    let report = serde_json::to_string_pretty(&failure)
        .unwrap_or_else(|_| "startup.native-report-unavailable".into());
    eprintln!("{report}");
    #[cfg(windows)]
    show_windows_failure(&report);
}

#[cfg(windows)]
fn show_windows_failure(report: &str) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};
    let title: Vec<u16> = "Steam Backup Label Studio startup failure\0"
        .encode_utf16()
        .collect();
    let text: Vec<u16> =
        format!("{report}\n\nPress Ctrl+C to copy this message when reporting the problem.\0")
            .encode_utf16()
            .collect();
    // Both NUL-terminated strings remain alive for this synchronous call. No window
    // exists yet; the dialog is intentionally independent of the failed WebView.
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            text.as_ptr(),
            title.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_native_prerequisites_have_safe_categories_without_platform_details() {
        for (error, stage) in [
            (
                tauri::Error::PluginInitialization("private-plugin".into(), "private-cause".into()),
                "native-plugin",
            ),
            (
                tauri::Error::AssetNotFound("private-path".into()),
                "packaged-assets",
            ),
            (tauri::Error::InvalidWindowHandle, "native-window-webview"),
            (
                tauri::Error::InvalidIcon(std::io::Error::other("private-path")),
                "native-icon",
            ),
            (
                tauri::Error::Io(std::io::Error::other("private-path")),
                "native-startup",
            ),
        ] {
            let failure = project_failure(&error, Duration::from_millis(23));
            assert_eq!(failure.stage, stage);
            assert_eq!(failure.elapsed_ms, 23);
            let report = serde_json::to_string(&failure).unwrap();
            assert!(!report.contains("private"));
            assert!(!report.contains("cause"));
        }
    }

    #[test]
    fn native_elapsed_time_is_bounded_without_wall_clock_or_project_identity() {
        let failure = project_failure(&tauri::Error::WindowNotFound, Duration::MAX);
        assert_eq!(failure.elapsed_ms, 86_400_000);
        assert!(failure.elapsed_capped);
    }
}
