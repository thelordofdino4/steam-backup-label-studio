//! Native event adapter only. Project state and Save/Discard/Cancel live in the
//! application lifecycle owner; this gate holds no project or dirty-state copy.
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, Manager};

const MAIN_WINDOW: &str = "main";
const REQUEST_EVENT: &str = "application-termination://requested";
const MAX_SAFE_SEQUENCE: u64 = 9_007_199_254_740_991;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum TerminationKind {
    CloseWindow,
    Quit,
}

#[derive(Default)]
struct TerminationGate {
    bridge_id: Option<String>,
    sequence: u64,
    permit: Option<TerminationKind>,
    window_close_authorized: bool,
    terminating: bool,
}

#[derive(Default)]
pub(crate) struct NativeTerminationManager(Mutex<TerminationGate>);

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminationRequest {
    bridge_id: String,
    window_label: &'static str,
    sequence: u64,
    kind: TerminationKind,
}

#[derive(Debug)]
enum NativeDecision {
    Allow,
    Prevent(Option<TerminationRequest>),
}

impl TerminationGate {
    fn install(&mut self, bridge_id: String) -> Result<(), String> {
        if bridge_id.is_empty() || bridge_id.len() > 128 || bridge_id.contains('\0') {
            return Err("Invalid native termination identity.".into());
        }
        if self.permit.is_some() || self.window_close_authorized || self.terminating {
            return Err("Native termination is already committed.".into());
        }
        self.bridge_id = Some(bridge_id);
        self.sequence = 0;
        Ok(())
    }

    fn authorize(&mut self, bridge_id: &str, kind: TerminationKind) -> Result<(), String> {
        if self.bridge_id.as_deref() != Some(bridge_id) {
            return Err("The native termination connection changed.".into());
        }
        if self.permit.is_some() || self.window_close_authorized || self.terminating {
            return Err("Native termination is already committed.".into());
        }
        self.permit = Some(kind);
        Ok(())
    }

    fn dispose(&mut self, bridge_id: &str) {
        // A stale StrictMode/HMR cleanup must not remove a newer connection.
        if self.bridge_id.as_deref() == Some(bridge_id)
            && self.permit.is_none()
            && !self.window_close_authorized
            && !self.terminating
        {
            self.bridge_id = None;
        }
    }

    fn rollback_close(&mut self, bridge_id: &str) {
        if self.bridge_id.as_deref() == Some(bridge_id)
            && self.permit == Some(TerminationKind::CloseWindow)
        {
            self.permit = None;
        }
    }

    fn prevent(&mut self, kind: TerminationKind) -> NativeDecision {
        let request = self.bridge_id.as_ref().and_then(|bridge_id| {
            if self.sequence >= MAX_SAFE_SEQUENCE {
                return None;
            }
            self.sequence += 1;
            Some(TerminationRequest {
                bridge_id: bridge_id.clone(),
                window_label: MAIN_WINDOW,
                sequence: self.sequence,
                kind,
            })
        });
        NativeDecision::Prevent(request)
    }

    fn window_close(&mut self) -> NativeDecision {
        if self.terminating {
            return NativeDecision::Allow;
        }
        if self.permit == Some(TerminationKind::CloseWindow) {
            self.permit = None;
            self.window_close_authorized = true;
            return NativeDecision::Allow;
        }
        self.prevent(TerminationKind::CloseWindow)
    }

    fn exit(&mut self, code: Option<i32>) -> NativeDecision {
        if self.terminating {
            return NativeDecision::Allow;
        }
        if self.permit == Some(TerminationKind::Quit)
            || (self.window_close_authorized && code.is_none())
        {
            self.permit = None;
            self.terminating = true;
            return NativeDecision::Allow;
        }
        self.prevent(TerminationKind::Quit)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CommitTerminationRequest {
    bridge_id: String,
    kind: TerminationKind,
}

#[derive(Serialize)]
pub(crate) struct TerminationSuccess {
    status: &'static str,
}

fn require_main(window_label: &str) -> Result<(), String> {
    if window_label == MAIN_WINDOW {
        Ok(())
    } else {
        Err("Native termination is owned by the main window.".into())
    }
}

#[tauri::command]
pub(crate) fn install_native_termination(
    window: tauri::WebviewWindow,
    manager: tauri::State<'_, NativeTerminationManager>,
    bridge_id: String,
) -> Result<TerminationSuccess, String> {
    require_main(window.label())?;
    manager
        .0
        .lock()
        .map_err(|_| "Native termination is unavailable.")?
        .install(bridge_id)?;
    Ok(TerminationSuccess { status: "success" })
}

#[tauri::command]
pub(crate) fn dispose_native_termination(
    window: tauri::WebviewWindow,
    manager: tauri::State<'_, NativeTerminationManager>,
    bridge_id: String,
) -> Result<TerminationSuccess, String> {
    require_main(window.label())?;
    manager
        .0
        .lock()
        .map_err(|_| "Native termination is unavailable.")?
        .dispose(&bridge_id);
    Ok(TerminationSuccess { status: "success" })
}

#[tauri::command]
pub(crate) fn commit_native_termination(
    window: tauri::WebviewWindow,
    manager: tauri::State<'_, NativeTerminationManager>,
    request: CommitTerminationRequest,
) -> Result<TerminationSuccess, String> {
    require_main(window.label())?;
    manager
        .0
        .lock()
        .map_err(|_| "Native termination is unavailable.")?
        .authorize(&request.bridge_id, request.kind)?;
    // Never hold the gate mutex while entering the native event loop.
    match request.kind {
        TerminationKind::CloseWindow => {
            if let Err(error) = window.close() {
                if let Ok(mut gate) = manager.0.lock() {
                    gate.rollback_close(&request.bridge_id);
                }
                return Err(format!("The native window could not close: {error}"));
            }
        }
        TerminationKind::Quit => window.app_handle().exit(0),
    }
    Ok(TerminationSuccess { status: "success" })
}

fn emit_request(app: &tauri::AppHandle, request: Option<TerminationRequest>) {
    if let Some(request) = request {
        if let Err(error) = app.emit_to(MAIN_WINDOW, REQUEST_EVENT, request) {
            log::error!("Native termination request could not reach the lifecycle owner: {error}");
        }
    }
}

pub(crate) fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if window.label() != MAIN_WINDOW {
        return;
    }
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let manager = window.state::<NativeTerminationManager>();
        let decision = manager
            .0
            .lock()
            .map(|mut gate| gate.window_close())
            .unwrap_or(NativeDecision::Prevent(None));
        if let NativeDecision::Prevent(request) = decision {
            api.prevent_close();
            emit_request(window.app_handle(), request);
        }
    }
}

pub(crate) fn on_run_event(app: &tauri::AppHandle, event: tauri::RunEvent) {
    if let tauri::RunEvent::ExitRequested { code, api, .. } = event {
        let manager = app.state::<NativeTerminationManager>();
        let decision = manager
            .0
            .lock()
            .map(|mut gate| gate.exit(code))
            .unwrap_or(NativeDecision::Prevent(None));
        if let NativeDecision::Prevent(request) = decision {
            api.prevent_exit();
            emit_request(app, request);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn connected() -> TerminationGate {
        let mut gate = TerminationGate::default();
        gate.install("current".into()).unwrap();
        gate
    }
    fn request(decision: NativeDecision, expected: TerminationKind, sequence: u64) {
        match decision {
            NativeDecision::Prevent(Some(request)) => {
                assert_eq!(request.kind, expected);
                assert_eq!(request.sequence, sequence);
                assert_eq!(request.bridge_id, "current");
                assert_eq!(request.window_label, "main");
            }
            _ => panic!("expected a guarded native request"),
        }
    }
    #[test]
    fn startup_disconnect_and_sequence_exhaustion_remain_closed() {
        let mut gate = TerminationGate::default();
        assert!(matches!(gate.window_close(), NativeDecision::Prevent(None)));
        assert!(matches!(gate.exit(Some(0)), NativeDecision::Prevent(None)));
        gate.install("current".into()).unwrap();
        gate.sequence = MAX_SAFE_SEQUENCE;
        assert!(matches!(gate.window_close(), NativeDecision::Prevent(None)));
        gate.dispose("current");
        assert!(matches!(gate.exit(None), NativeDecision::Prevent(None)));
    }
    #[test]
    fn cancelled_requests_can_retry_without_native_permits() {
        let mut gate = connected();
        request(gate.window_close(), TerminationKind::CloseWindow, 1);
        request(gate.exit(Some(0)), TerminationKind::Quit, 2);
        request(gate.window_close(), TerminationKind::CloseWindow, 3);
    }
    #[test]
    fn window_permit_is_single_use_and_last_window_exit_needs_no_second_prompt() {
        let mut gate = connected();
        gate.authorize("current", TerminationKind::CloseWindow)
            .unwrap();
        assert!(matches!(gate.window_close(), NativeDecision::Allow));
        assert!(gate.permit.is_none());
        request(gate.window_close(), TerminationKind::CloseWindow, 1);
        request(gate.exit(Some(0)), TerminationKind::Quit, 2);
        assert!(matches!(gate.exit(None), NativeDecision::Allow));
        assert!(matches!(gate.window_close(), NativeDecision::Allow));
    }
    #[test]
    fn quit_permit_cannot_be_consumed_by_an_unrelated_window_event() {
        let mut gate = connected();
        gate.authorize("current", TerminationKind::Quit).unwrap();
        request(gate.window_close(), TerminationKind::CloseWindow, 1);
        assert!(matches!(gate.exit(Some(0)), NativeDecision::Allow));
        assert!(gate.permit.is_none());
        assert!(matches!(gate.exit(None), NativeDecision::Allow));
    }
    #[test]
    fn stale_bridge_and_cleanup_cannot_authorize_or_remove_current_owner() {
        let mut gate = connected();
        assert!(gate.authorize("old", TerminationKind::Quit).is_err());
        gate.dispose("old");
        request(gate.window_close(), TerminationKind::CloseWindow, 1);
        gate.install("replacement".into()).unwrap();
        gate.dispose("current");
        assert!(gate.authorize("current", TerminationKind::Quit).is_err());
        gate.authorize("replacement", TerminationKind::Quit)
            .unwrap();
        assert!(gate.install("late".into()).is_err());
        assert!(gate
            .authorize("replacement", TerminationKind::Quit)
            .is_err());
    }
    #[test]
    fn failed_close_restores_gate_and_wrong_bridge_cannot_rollback() {
        let mut gate = connected();
        gate.authorize("current", TerminationKind::CloseWindow)
            .unwrap();
        gate.rollback_close("old");
        assert!(gate.permit.is_some());
        gate.rollback_close("current");
        assert!(gate.permit.is_none());
        request(gate.window_close(), TerminationKind::CloseWindow, 1);
        gate.authorize("current", TerminationKind::CloseWindow)
            .unwrap();
    }
    #[test]
    fn only_main_window_and_bounded_valid_bridge_ids_are_accepted() {
        assert!(require_main("main").is_ok());
        assert!(require_main("other").is_err());
        for id in [String::new(), "x".repeat(129), "bad\0id".into()] {
            assert!(TerminationGate::default().install(id).is_err());
        }
    }
}
