use std::{
    collections::{HashMap, HashSet},
    sync::{Mutex, MutexGuard},
};

use serde::{Deserialize, Serialize};
use tauri::{menu::MenuEvent, AppHandle, Emitter, Manager};

#[cfg(not(test))]
use tauri::{
    menu::{CheckMenuItem, CheckMenuItemBuilder, Menu, PredefinedMenuItem, Submenu},
    State, WebviewWindow, Wry,
};

const APPLICATION_MENU_EVENT: &str = "application-menu://invoked";
const TARGET_WINDOW_LABEL: &str = "main";
const PRODUCT_MENU_COUNT: usize = 5;
const MAX_ITEM_COUNT: usize = 128;
const MAX_IDENTITY_LENGTH: usize = 128;
const MAX_LABEL_LENGTH: usize = 256;
const MAX_ACCELERATOR_LENGTH: usize = 64;
const MAX_SAFE_GENERATION: u64 = 9_007_199_254_740_991;

#[cfg(not(test))]
type NativeMenuHandles = HashMap<String, CheckMenuItem<Wry>>;
#[cfg(not(test))]
type BuiltNativeMenu = (Menu<Wry>, NativeMenuHandles);

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ApplicationMenuPlatform {
    Windows,
    Linux,
    Macos,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum NativeApplicationMenuEntry {
    Item {
        item_id: String,
        label: String,
        accelerator: Option<String>,
    },
    Separator,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NativeApplicationMenuSubmenu {
    id: String,
    label: String,
    entries: Vec<NativeApplicationMenuEntry>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NativeApplicationMenuDescriptor {
    platform: ApplicationMenuPlatform,
    product_menus: Vec<NativeApplicationMenuSubmenu>,
    application_menu_entries: Vec<NativeApplicationMenuEntry>,
    item_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeApplicationMenuInstallRequest {
    window_label: String,
    bridge_instance_id: String,
    descriptor: NativeApplicationMenuDescriptor,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NativeApplicationMenuProjectionItem {
    item_id: String,
    enabled: bool,
    checked: bool,
    label: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NativeApplicationMenuProjection {
    generation: u64,
    platform: ApplicationMenuPlatform,
    window_label: String,
    items: Vec<NativeApplicationMenuProjectionItem>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeApplicationMenuProjectionRequest {
    bridge_instance_id: String,
    projection: NativeApplicationMenuProjection,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeApplicationMenuDisposeRequest {
    window_label: String,
    bridge_instance_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeApplicationMenuInstallResult {
    status: &'static str,
    platform: ApplicationMenuPlatform,
    window_label: String,
    bridge_instance_id: String,
    item_count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeApplicationMenuProjectionResult {
    status: &'static str,
    window_label: String,
    generation: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'static str>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeApplicationMenuDisposeResult {
    status: &'static str,
    window_label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplicationMenuInvocation {
    invocation_id: String,
    bridge_instance_id: String,
    item_id: String,
    window_label: String,
    projection_generation: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct NativeItemPresentation {
    item_id: String,
    enabled: bool,
    checked: bool,
    label: String,
}

struct InstalledApplicationMenu {
    descriptor: NativeApplicationMenuDescriptor,
    window_label: String,
    bridge_instance_id: String,
    #[cfg(not(test))]
    handles: NativeMenuHandles,
    presentations: Vec<NativeItemPresentation>,
    projection_generation: Option<u64>,
}

#[derive(Default)]
struct ApplicationMenuState {
    installed: Option<InstalledApplicationMenu>,
    next_invocation_sequence: u64,
}

#[derive(Default)]
pub struct ApplicationMenuManager(Mutex<ApplicationMenuState>);

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum DisposeDecision {
    Remove,
    Ignore(&'static str),
}

fn native_platform() -> ApplicationMenuPlatform {
    #[cfg(target_os = "windows")]
    {
        ApplicationMenuPlatform::Windows
    }
    #[cfg(target_os = "linux")]
    {
        ApplicationMenuPlatform::Linux
    }
    #[cfg(target_os = "macos")]
    {
        ApplicationMenuPlatform::Macos
    }
}

fn lock_state(
    manager: &ApplicationMenuManager,
) -> Result<MutexGuard<'_, ApplicationMenuState>, String> {
    manager
        .0
        .lock()
        .map_err(|_| "application-menu.state-unavailable".to_string())
}

fn require_identity(value: &str, field: &str) -> Result<(), String> {
    if value.is_empty() || value.len() > MAX_IDENTITY_LENGTH {
        return Err(format!("application-menu.invalid-{field}"));
    }
    Ok(())
}

fn require_label(value: &str) -> Result<(), String> {
    if value.is_empty() || value.len() > MAX_LABEL_LENGTH {
        return Err("application-menu.invalid-label".to_string());
    }
    Ok(())
}

fn validate_entries(
    entries: &[NativeApplicationMenuEntry],
    item_ids: &mut Vec<String>,
) -> Result<(), String> {
    if entries.is_empty()
        || matches!(entries.first(), Some(NativeApplicationMenuEntry::Separator))
        || matches!(entries.last(), Some(NativeApplicationMenuEntry::Separator))
    {
        return Err("application-menu.invalid-separator-placement".to_string());
    }
    let mut previous_separator = false;
    for entry in entries {
        match entry {
            NativeApplicationMenuEntry::Separator => {
                if previous_separator {
                    return Err("application-menu.invalid-separator-placement".to_string());
                }
                previous_separator = true;
            }
            NativeApplicationMenuEntry::Item {
                item_id,
                label,
                accelerator,
            } => {
                require_identity(item_id, "item-id")?;
                require_label(label)?;
                if accelerator
                    .as_ref()
                    .is_some_and(|value| value.is_empty() || value.len() > MAX_ACCELERATOR_LENGTH)
                {
                    return Err("application-menu.invalid-accelerator".to_string());
                }
                item_ids.push(item_id.clone());
                previous_separator = false;
            }
        }
    }
    Ok(())
}

fn validate_descriptor(
    descriptor: &NativeApplicationMenuDescriptor,
    expected_platform: ApplicationMenuPlatform,
) -> Result<(), String> {
    if descriptor.platform != expected_platform {
        return Err("application-menu.wrong-platform".to_string());
    }
    if descriptor.product_menus.len() != PRODUCT_MENU_COUNT
        || descriptor.item_ids.is_empty()
        || descriptor.item_ids.len() > MAX_ITEM_COUNT
    {
        return Err("application-menu.invalid-descriptor-shape".to_string());
    }
    if descriptor.platform == ApplicationMenuPlatform::Macos {
        if descriptor.application_menu_entries.is_empty() {
            return Err("application-menu.missing-application-menu".to_string());
        }
    } else if !descriptor.application_menu_entries.is_empty() {
        return Err("application-menu.unexpected-application-menu".to_string());
    }

    let mut submenu_ids = HashSet::new();
    let mut encountered_item_ids = Vec::new();
    for submenu in &descriptor.product_menus {
        require_identity(&submenu.id, "submenu-id")?;
        require_label(&submenu.label)?;
        if !submenu_ids.insert(submenu.id.as_str()) {
            return Err("application-menu.duplicate-submenu-id".to_string());
        }
        validate_entries(&submenu.entries, &mut encountered_item_ids)?;
    }
    if !descriptor.application_menu_entries.is_empty() {
        validate_entries(
            &descriptor.application_menu_entries,
            &mut encountered_item_ids,
        )?;
    }

    let expected_ids: HashSet<&str> = descriptor.item_ids.iter().map(String::as_str).collect();
    let encountered_ids: HashSet<&str> = encountered_item_ids.iter().map(String::as_str).collect();
    if expected_ids.len() != descriptor.item_ids.len()
        || encountered_ids.len() != encountered_item_ids.len()
        || expected_ids != encountered_ids
        || descriptor
            .item_ids
            .iter()
            .any(|item_id| submenu_ids.contains(item_id.as_str()))
    {
        return Err("application-menu.invalid-item-set".to_string());
    }
    for item_id in &descriptor.item_ids {
        require_identity(item_id, "item-id")?;
    }
    Ok(())
}

fn reused_install_result(
    installed: Option<&InstalledApplicationMenu>,
    request: &NativeApplicationMenuInstallRequest,
) -> Result<Option<NativeApplicationMenuInstallResult>, String> {
    let Some(installed) = installed else {
        return Ok(None);
    };
    if installed.window_label != request.window_label {
        return Err("application-menu.multiple-windows-unsupported".to_string());
    }
    if installed.bridge_instance_id != request.bridge_instance_id {
        return Ok(None);
    }
    if installed.descriptor != request.descriptor {
        return Err("application-menu.bridge-descriptor-mismatch".to_string());
    }
    Ok(Some(NativeApplicationMenuInstallResult {
        status: "already-installed",
        platform: installed.descriptor.platform,
        window_label: installed.window_label.clone(),
        bridge_instance_id: installed.bridge_instance_id.clone(),
        item_count: installed.descriptor.item_ids.len(),
    }))
}

fn dispose_decision(
    installed: Option<&InstalledApplicationMenu>,
    request: &NativeApplicationMenuDisposeRequest,
) -> DisposeDecision {
    match installed {
        None => DisposeDecision::Ignore("not-installed"),
        Some(installed) if installed.bridge_instance_id != request.bridge_instance_id => {
            DisposeDecision::Ignore("stale-bridge")
        }
        Some(_) => DisposeDecision::Remove,
    }
}

fn base_presentations(descriptor: &NativeApplicationMenuDescriptor) -> Vec<NativeItemPresentation> {
    let labels: HashMap<&str, &str> = descriptor
        .product_menus
        .iter()
        .flat_map(|submenu| submenu.entries.iter())
        .chain(descriptor.application_menu_entries.iter())
        .filter_map(|entry| match entry {
            NativeApplicationMenuEntry::Item { item_id, label, .. } => {
                Some((item_id.as_str(), label.as_str()))
            }
            NativeApplicationMenuEntry::Separator => None,
        })
        .collect();
    descriptor
        .item_ids
        .iter()
        .map(|item_id| NativeItemPresentation {
            item_id: item_id.clone(),
            enabled: false,
            checked: false,
            label: labels[item_id.as_str()].to_string(),
        })
        .collect()
}

#[cfg(not(test))]
fn append_entries(
    app: &AppHandle,
    submenu: &Submenu<Wry>,
    entries: &[NativeApplicationMenuEntry],
    handles: &mut NativeMenuHandles,
) -> Result<(), String> {
    for entry in entries {
        match entry {
            NativeApplicationMenuEntry::Separator => {
                let separator = PredefinedMenuItem::separator(app)
                    .map_err(|error| format!("application-menu.build-failed: {error}"))?;
                submenu
                    .append(&separator)
                    .map_err(|error| format!("application-menu.build-failed: {error}"))?;
            }
            NativeApplicationMenuEntry::Item {
                item_id,
                label,
                accelerator,
            } => {
                let mut builder = CheckMenuItemBuilder::with_id(item_id.as_str(), label)
                    .enabled(false)
                    .checked(false);
                if let Some(accelerator) = accelerator {
                    builder = builder.accelerator(accelerator);
                }
                let item = builder
                    .build(app)
                    .map_err(|error| format!("application-menu.build-failed: {error}"))?;
                submenu
                    .append(&item)
                    .map_err(|error| format!("application-menu.build-failed: {error}"))?;
                handles.insert(item_id.clone(), item);
            }
        }
    }
    Ok(())
}

#[cfg(not(test))]
fn build_native_menu(
    app: &AppHandle,
    descriptor: &NativeApplicationMenuDescriptor,
) -> Result<BuiltNativeMenu, String> {
    let menu = Menu::new(app).map_err(|error| format!("application-menu.build-failed: {error}"))?;
    let mut handles = HashMap::new();

    if descriptor.platform == ApplicationMenuPlatform::Macos {
        let application_submenu = Submenu::with_id(
            app,
            "application-menu.product",
            &app.package_info().name,
            true,
        )
        .map_err(|error| format!("application-menu.build-failed: {error}"))?;
        append_entries(
            app,
            &application_submenu,
            &descriptor.application_menu_entries,
            &mut handles,
        )?;
        menu.append(&application_submenu)
            .map_err(|error| format!("application-menu.build-failed: {error}"))?;
    }

    for product_menu in &descriptor.product_menus {
        let submenu = Submenu::with_id(app, product_menu.id.as_str(), &product_menu.label, true)
            .map_err(|error| format!("application-menu.build-failed: {error}"))?;
        append_entries(app, &submenu, &product_menu.entries, &mut handles)?;
        menu.append(&submenu)
            .map_err(|error| format!("application-menu.build-failed: {error}"))?;
    }
    Ok((menu, handles))
}

#[cfg(target_os = "macos")]
#[cfg(not(test))]
fn attach_native_menu(
    app: &AppHandle,
    _window: &WebviewWindow,
    menu: Menu<Wry>,
) -> Result<(), String> {
    app.set_menu(menu)
        .map(|_| ())
        .map_err(|error| format!("application-menu.install-failed: {error}"))
}

#[cfg(not(target_os = "macos"))]
#[cfg(not(test))]
fn attach_native_menu(
    _app: &AppHandle,
    window: &WebviewWindow,
    menu: Menu<Wry>,
) -> Result<(), String> {
    window
        .set_menu(menu)
        .map(|_| ())
        .map_err(|error| format!("application-menu.install-failed: {error}"))
}

#[cfg(target_os = "macos")]
#[cfg(not(test))]
fn remove_native_menu(app: &AppHandle, _window_label: &str) -> Result<(), String> {
    app.remove_menu()
        .map(|_| ())
        .map_err(|error| format!("application-menu.dispose-failed: {error}"))
}

#[cfg(not(target_os = "macos"))]
#[cfg(not(test))]
fn remove_native_menu(app: &AppHandle, window_label: &str) -> Result<(), String> {
    let window = app
        .get_webview_window(window_label)
        .ok_or_else(|| "application-menu.window-unavailable".to_string())?;
    window
        .remove_menu()
        .map(|_| ())
        .map_err(|error| format!("application-menu.dispose-failed: {error}"))
}

#[cfg(not(test))]
fn validate_command_window(window: &WebviewWindow, requested: &str) -> Result<(), String> {
    require_identity(requested, "window-label")?;
    if requested != TARGET_WINDOW_LABEL || window.label() != requested {
        return Err("application-menu.wrong-window".to_string());
    }
    Ok(())
}

fn projection_presentations(
    installed: &InstalledApplicationMenu,
    request: &NativeApplicationMenuProjectionRequest,
) -> Result<Result<Vec<NativeItemPresentation>, &'static str>, String> {
    let projection = &request.projection;
    require_identity(&request.bridge_instance_id, "bridge-instance-id")?;
    if request.bridge_instance_id != installed.bridge_instance_id {
        return Err("application-menu.stale-bridge".to_string());
    }
    if projection.window_label != installed.window_label {
        return Err("application-menu.wrong-window".to_string());
    }
    if projection.platform != installed.descriptor.platform {
        return Err("application-menu.wrong-platform".to_string());
    }
    if projection.generation > MAX_SAFE_GENERATION {
        return Err("application-menu.invalid-generation".to_string());
    }
    if let Some(current) = installed.projection_generation {
        if projection.generation < current {
            return Ok(Err("stale-generation"));
        }
        if projection.generation == current {
            return Ok(Err("duplicate-generation"));
        }
    }
    if projection.items.len() != installed.descriptor.item_ids.len()
        || projection
            .items
            .iter()
            .zip(&installed.descriptor.item_ids)
            .any(|(item, expected)| item.item_id != *expected)
    {
        return Err("application-menu.invalid-item-set".to_string());
    }
    let base = base_presentations(&installed.descriptor);
    projection
        .items
        .iter()
        .zip(base)
        .map(|(item, base)| {
            let label = item.label.as_deref().unwrap_or(&base.label);
            require_label(label)?;
            Ok(NativeItemPresentation {
                item_id: item.item_id.clone(),
                enabled: item.enabled,
                checked: item.checked,
                label: label.to_string(),
            })
        })
        .collect::<Result<Vec<_>, _>>()
        .map(Ok)
}

fn apply_with_rollback(
    current: &[NativeItemPresentation],
    next: &[NativeItemPresentation],
    mut apply: impl FnMut(&NativeItemPresentation) -> Result<(), String>,
) -> Result<(), String> {
    for (index, presentation) in next.iter().enumerate() {
        if let Err(error) = apply(presentation) {
            let rollback_error = current
                .iter()
                .take(index + 1)
                .find_map(|previous| apply(previous).err());
            return match rollback_error {
                Some(rollback_error) => Err(format!(
                    "{error}; application-menu.rollback-failed: {rollback_error}"
                )),
                None => Err(error),
            };
        }
    }
    Ok(())
}

#[tauri::command]
pub fn application_menu_platform() -> ApplicationMenuPlatform {
    native_platform()
}

#[tauri::command]
#[cfg(not(test))]
pub fn install_application_menu(
    app: AppHandle,
    window: WebviewWindow,
    manager: State<'_, ApplicationMenuManager>,
    request: NativeApplicationMenuInstallRequest,
) -> Result<NativeApplicationMenuInstallResult, String> {
    validate_command_window(&window, &request.window_label)?;
    require_identity(&request.bridge_instance_id, "bridge-instance-id")?;
    validate_descriptor(&request.descriptor, native_platform())?;

    let mut state = lock_state(&manager)?;
    if let Some(result) = reused_install_result(state.installed.as_ref(), &request)? {
        return Ok(result);
    }

    let (menu, handles) = build_native_menu(&app, &request.descriptor)?;
    attach_native_menu(&app, &window, menu)?;
    let presentations = base_presentations(&request.descriptor);
    let result = NativeApplicationMenuInstallResult {
        status: "installed",
        platform: request.descriptor.platform,
        window_label: request.window_label.clone(),
        bridge_instance_id: request.bridge_instance_id.clone(),
        item_count: request.descriptor.item_ids.len(),
    };
    state.installed = Some(InstalledApplicationMenu {
        descriptor: request.descriptor,
        window_label: request.window_label,
        bridge_instance_id: request.bridge_instance_id,
        handles,
        presentations,
        projection_generation: None,
    });
    Ok(result)
}

#[tauri::command]
#[cfg(not(test))]
pub fn apply_application_menu_projection(
    window: WebviewWindow,
    manager: State<'_, ApplicationMenuManager>,
    request: NativeApplicationMenuProjectionRequest,
) -> Result<NativeApplicationMenuProjectionResult, String> {
    validate_command_window(&window, &request.projection.window_label)?;
    let mut state = lock_state(&manager)?;
    let installed = state
        .installed
        .as_mut()
        .ok_or_else(|| "application-menu.not-installed".to_string())?;
    let next = match projection_presentations(installed, &request)? {
        Ok(next) => next,
        Err(reason) => {
            return Ok(NativeApplicationMenuProjectionResult {
                status: "ignored",
                window_label: request.projection.window_label,
                generation: request.projection.generation,
                reason: Some(reason),
            })
        }
    };
    apply_with_rollback(&installed.presentations, &next, |presentation| {
        let handle = installed
            .handles
            .get(&presentation.item_id)
            .ok_or_else(|| "application-menu.item-handle-missing".to_string())?;
        handle
            .set_text(&presentation.label)
            .map_err(|error| format!("application-menu.projection-failed: {error}"))?;
        handle
            .set_checked(presentation.checked)
            .map_err(|error| format!("application-menu.projection-failed: {error}"))?;
        handle
            .set_enabled(presentation.enabled)
            .map_err(|error| format!("application-menu.projection-failed: {error}"))
    })?;
    installed.presentations = next;
    installed.projection_generation = Some(request.projection.generation);
    Ok(NativeApplicationMenuProjectionResult {
        status: "applied",
        window_label: request.projection.window_label,
        generation: request.projection.generation,
        reason: None,
    })
}

#[tauri::command]
#[cfg(not(test))]
pub fn dispose_application_menu(
    app: AppHandle,
    window: WebviewWindow,
    manager: State<'_, ApplicationMenuManager>,
    request: NativeApplicationMenuDisposeRequest,
) -> Result<NativeApplicationMenuDisposeResult, String> {
    validate_command_window(&window, &request.window_label)?;
    require_identity(&request.bridge_instance_id, "bridge-instance-id")?;
    let mut state = lock_state(&manager)?;
    match dispose_decision(state.installed.as_ref(), &request) {
        DisposeDecision::Ignore(reason) => {
            return Ok(NativeApplicationMenuDisposeResult {
                status: "ignored",
                window_label: request.window_label,
                reason: Some(reason),
            })
        }
        DisposeDecision::Remove => {}
    }
    remove_native_menu(&app, &request.window_label)?;
    state.installed = None;
    Ok(NativeApplicationMenuDisposeResult {
        status: "disposed",
        window_label: request.window_label,
        reason: None,
    })
}

// Tauri's Windows menu backend imports Common Controls v6 entrypoints. Cargo's
// library-test executable has no application activation context, so linking
// the OS-handle functions into that harness prevents it from reaching `main`.
// Production builds compile the real commands above; unit tests exercise the
// shared descriptor, projection, rollback, and event-envelope logic below.
#[tauri::command]
#[cfg(test)]
pub fn install_application_menu(
    request: NativeApplicationMenuInstallRequest,
) -> Result<NativeApplicationMenuInstallResult, String> {
    let _ = (
        request.window_label,
        request.bridge_instance_id,
        request.descriptor,
    );
    Err("application-menu.native-test-adapter-unavailable".to_string())
}

#[tauri::command]
#[cfg(test)]
pub fn apply_application_menu_projection(
    _request: NativeApplicationMenuProjectionRequest,
) -> Result<NativeApplicationMenuProjectionResult, String> {
    Err("application-menu.native-test-adapter-unavailable".to_string())
}

#[tauri::command]
#[cfg(test)]
pub fn dispose_application_menu(
    request: NativeApplicationMenuDisposeRequest,
) -> Result<NativeApplicationMenuDisposeResult, String> {
    let _ = (request.window_label, request.bridge_instance_id);
    Err("application-menu.native-test-adapter-unavailable".to_string())
}

fn prepare_invocation(
    state: &mut ApplicationMenuState,
    item_id: &str,
) -> Option<ApplicationMenuInvocation> {
    let installed = state.installed.as_ref()?;
    if !installed
        .descriptor
        .item_ids
        .iter()
        .any(|candidate| candidate == item_id)
    {
        return None;
    }
    let projection_generation = installed.projection_generation?;
    let bridge_instance_id = installed.bridge_instance_id.clone();
    let window_label = installed.window_label.clone();
    state.next_invocation_sequence = state.next_invocation_sequence.saturating_add(1);
    Some(ApplicationMenuInvocation {
        invocation_id: format!("menu-{:016x}", state.next_invocation_sequence),
        bridge_instance_id,
        item_id: item_id.to_string(),
        window_label,
        projection_generation,
    })
}

pub fn forward_application_menu_event(app: &AppHandle, event: MenuEvent) {
    let invocation = {
        let manager = app.state::<ApplicationMenuManager>();
        let Ok(mut state) = lock_state(&manager) else {
            log::error!("application-menu.state-unavailable");
            return;
        };
        prepare_invocation(&mut state, event.id().0.as_str())
    };
    if let Some(invocation) = invocation {
        let window_label = invocation.window_label.clone();
        if let Err(error) = app.emit_to(window_label, APPLICATION_MENU_EVENT, invocation) {
            log::error!("application-menu.emit-failed: {error}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(id: &str) -> NativeApplicationMenuEntry {
        NativeApplicationMenuEntry::Item {
            item_id: id.to_string(),
            label: id.to_string(),
            accelerator: None,
        }
    }

    fn descriptor(platform: ApplicationMenuPlatform) -> NativeApplicationMenuDescriptor {
        let product_menus = (0..PRODUCT_MENU_COUNT)
            .map(|index| NativeApplicationMenuSubmenu {
                id: format!("menu.{index}"),
                label: format!("Menu {index}"),
                entries: vec![item(&format!("item.{index}"))],
            })
            .collect::<Vec<_>>();
        let application_menu_entries = if platform == ApplicationMenuPlatform::Macos {
            vec![item("item.about")]
        } else {
            Vec::new()
        };
        let item_ids = product_menus
            .iter()
            .flat_map(|menu| menu.entries.iter())
            .chain(application_menu_entries.iter())
            .filter_map(|entry| match entry {
                NativeApplicationMenuEntry::Item { item_id, .. } => Some(item_id.clone()),
                NativeApplicationMenuEntry::Separator => None,
            })
            .collect();
        NativeApplicationMenuDescriptor {
            platform,
            product_menus,
            application_menu_entries,
            item_ids,
        }
    }

    fn installed(platform: ApplicationMenuPlatform) -> InstalledApplicationMenu {
        let descriptor = descriptor(platform);
        let presentations = base_presentations(&descriptor);
        InstalledApplicationMenu {
            descriptor,
            window_label: TARGET_WINDOW_LABEL.to_string(),
            bridge_instance_id: "bridge-1".to_string(),
            presentations,
            projection_generation: None,
        }
    }

    fn projection(
        installed: &InstalledApplicationMenu,
        generation: u64,
    ) -> NativeApplicationMenuProjectionRequest {
        NativeApplicationMenuProjectionRequest {
            bridge_instance_id: installed.bridge_instance_id.clone(),
            projection: NativeApplicationMenuProjection {
                generation,
                platform: installed.descriptor.platform,
                window_label: installed.window_label.clone(),
                items: installed
                    .descriptor
                    .item_ids
                    .iter()
                    .map(|item_id| NativeApplicationMenuProjectionItem {
                        item_id: item_id.clone(),
                        enabled: false,
                        checked: false,
                        label: None,
                    })
                    .collect(),
            },
        }
    }

    #[test]
    fn validates_descriptor_driven_windows_linux_and_macos_plans() {
        for platform in [
            ApplicationMenuPlatform::Windows,
            ApplicationMenuPlatform::Linux,
            ApplicationMenuPlatform::Macos,
        ] {
            let descriptor = descriptor(platform);
            validate_descriptor(&descriptor, platform).unwrap();
            assert!(base_presentations(&descriptor)
                .iter()
                .all(|item| !item.enabled));
        }
    }

    #[test]
    fn descriptor_wire_format_accepts_camel_case_and_rejects_rust_field_names() {
        let camel_case = serde_json::json!({
            "platform": "windows",
            "productMenus": [
                { "id": "menu.0", "label": "File", "entries": [
                    { "kind": "item", "itemId": "item.0", "label": "Item", "accelerator": null }
                ]},
                { "id": "menu.1", "label": "Edit", "entries": [
                    { "kind": "item", "itemId": "item.1", "label": "Item", "accelerator": null }
                ]},
                { "id": "menu.2", "label": "Tools", "entries": [
                    { "kind": "item", "itemId": "item.2", "label": "Item", "accelerator": null }
                ]},
                { "id": "menu.3", "label": "Window", "entries": [
                    { "kind": "item", "itemId": "item.3", "label": "Item", "accelerator": null }
                ]},
                { "id": "menu.4", "label": "Help", "entries": [
                    { "kind": "item", "itemId": "item.4", "label": "Item", "accelerator": null }
                ]}
            ],
            "applicationMenuEntries": [],
            "itemIds": ["item.0", "item.1", "item.2", "item.3", "item.4"]
        });
        let descriptor: NativeApplicationMenuDescriptor =
            serde_json::from_value(camel_case.clone()).unwrap();
        validate_descriptor(&descriptor, ApplicationMenuPlatform::Windows).unwrap();

        let mut rust_case = camel_case;
        let entry = rust_case["productMenus"][0]["entries"][0]
            .as_object_mut()
            .unwrap();
        let item_id = entry.remove("itemId").unwrap();
        entry.insert("item_id".to_string(), item_id);
        assert!(serde_json::from_value::<NativeApplicationMenuDescriptor>(rust_case).is_err());
    }

    #[test]
    fn rejects_wrong_platform_duplicate_ids_and_malformed_separators() {
        let windows = descriptor(ApplicationMenuPlatform::Windows);
        assert_eq!(
            validate_descriptor(&windows, ApplicationMenuPlatform::Linux),
            Err("application-menu.wrong-platform".to_string())
        );
        let mut duplicate = windows.clone();
        duplicate.item_ids[1] = duplicate.item_ids[0].clone();
        assert_eq!(
            validate_descriptor(&duplicate, ApplicationMenuPlatform::Windows),
            Err("application-menu.invalid-item-set".to_string())
        );
        let mut malformed = windows;
        malformed.product_menus[0]
            .entries
            .insert(0, NativeApplicationMenuEntry::Separator);
        assert_eq!(
            validate_descriptor(&malformed, ApplicationMenuPlatform::Windows),
            Err("application-menu.invalid-separator-placement".to_string())
        );
    }

    #[test]
    fn projection_rejects_wrong_identity_platform_window_and_item_set() {
        let installed = installed(ApplicationMenuPlatform::Windows);
        let mut request = projection(&installed, 0);
        request.bridge_instance_id = "stale".to_string();
        assert_eq!(
            projection_presentations(&installed, &request).unwrap_err(),
            "application-menu.stale-bridge"
        );
        let mut request = projection(&installed, 0);
        request.projection.platform = ApplicationMenuPlatform::Linux;
        assert_eq!(
            projection_presentations(&installed, &request).unwrap_err(),
            "application-menu.wrong-platform"
        );
        let mut request = projection(&installed, 0);
        request.projection.window_label = "other".to_string();
        assert_eq!(
            projection_presentations(&installed, &request).unwrap_err(),
            "application-menu.wrong-window"
        );
        let mut request = projection(&installed, 0);
        request.projection.items.swap(0, 1);
        assert_eq!(
            projection_presentations(&installed, &request).unwrap_err(),
            "application-menu.invalid-item-set"
        );
    }

    #[test]
    fn projection_generations_are_monotonic_and_duplicate_safe() {
        let mut installed = installed(ApplicationMenuPlatform::Windows);
        let mut request = projection(&installed, 4);
        request.projection.items[0].checked = true;
        request.projection.items[0].enabled = true;
        request.projection.items[0].label = Some("Projected".to_string());
        let next = projection_presentations(&installed, &request)
            .unwrap()
            .unwrap();
        assert_eq!(
            next[0],
            NativeItemPresentation {
                item_id: "item.0".to_string(),
                enabled: true,
                checked: true,
                label: "Projected".to_string(),
            }
        );
        installed.presentations = next;
        installed.projection_generation = Some(4);
        assert_eq!(
            projection_presentations(&installed, &projection(&installed, 4)).unwrap(),
            Err("duplicate-generation")
        );
        assert_eq!(
            projection_presentations(&installed, &projection(&installed, 3)).unwrap(),
            Err("stale-generation")
        );
        assert!(
            projection_presentations(&installed, &projection(&installed, 5))
                .unwrap()
                .is_ok()
        );
    }

    #[test]
    fn failed_native_mutation_rolls_back_prior_and_current_items() {
        let current = vec![
            NativeItemPresentation {
                item_id: "one".to_string(),
                enabled: false,
                checked: false,
                label: "One".to_string(),
            },
            NativeItemPresentation {
                item_id: "two".to_string(),
                enabled: false,
                checked: true,
                label: "Two".to_string(),
            },
        ];
        let next = vec![
            NativeItemPresentation {
                item_id: "one".to_string(),
                enabled: true,
                checked: true,
                label: "Changed One".to_string(),
            },
            NativeItemPresentation {
                item_id: "two".to_string(),
                enabled: true,
                checked: false,
                label: "Changed Two".to_string(),
            },
        ];
        let mut calls = Vec::new();
        let mut failed = false;
        let result = apply_with_rollback(&current, &next, |item| {
            calls.push((item.item_id.clone(), item.checked, item.label.clone()));
            if item.item_id == "two" && item.enabled && !failed {
                failed = true;
                return Err("injected".to_string());
            }
            Ok(())
        });
        assert_eq!(result, Err("injected".to_string()));
        assert_eq!(
            calls,
            vec![
                ("one".to_string(), true, "Changed One".to_string()),
                ("two".to_string(), false, "Changed Two".to_string()),
                ("one".to_string(), false, "One".to_string()),
                ("two".to_string(), true, "Two".to_string()),
            ]
        );
    }

    #[test]
    fn events_require_a_known_item_and_an_applied_projection() {
        let mut state = ApplicationMenuState {
            installed: Some(installed(ApplicationMenuPlatform::Windows)),
            next_invocation_sequence: 0,
        };
        assert_eq!(prepare_invocation(&mut state, "item.0"), None);
        state.installed.as_mut().unwrap().projection_generation = Some(7);
        assert_eq!(prepare_invocation(&mut state, "unknown"), None);
        let first = prepare_invocation(&mut state, "item.0").unwrap();
        let second = prepare_invocation(&mut state, "item.0").unwrap();
        assert_eq!(first.projection_generation, 7);
        assert_ne!(first.invocation_id, second.invocation_id);
        assert_eq!(first.item_id, "item.0");
        assert_eq!(first.window_label, TARGET_WINDOW_LABEL);
    }

    #[test]
    fn registration_and_teardown_are_bridge_scoped_and_remount_safe() {
        let installed = installed(ApplicationMenuPlatform::Windows);
        let request = NativeApplicationMenuInstallRequest {
            window_label: TARGET_WINDOW_LABEL.to_string(),
            bridge_instance_id: "bridge-1".to_string(),
            descriptor: installed.descriptor.clone(),
        };
        let reused = reused_install_result(Some(&installed), &request)
            .unwrap()
            .unwrap();
        assert_eq!(reused.status, "already-installed");

        let remount = NativeApplicationMenuInstallRequest {
            bridge_instance_id: "bridge-2".to_string(),
            ..request.clone()
        };
        assert!(reused_install_result(Some(&installed), &remount)
            .unwrap()
            .is_none());
        let mismatched = NativeApplicationMenuInstallRequest {
            descriptor: descriptor(ApplicationMenuPlatform::Windows),
            ..request.clone()
        };
        let mut mismatched = mismatched;
        mismatched.descriptor.product_menus[0].label = "Changed".to_string();
        assert_eq!(
            reused_install_result(Some(&installed), &mismatched).unwrap_err(),
            "application-menu.bridge-descriptor-mismatch"
        );

        assert_eq!(
            dispose_decision(
                Some(&installed),
                &NativeApplicationMenuDisposeRequest {
                    window_label: TARGET_WINDOW_LABEL.to_string(),
                    bridge_instance_id: "bridge-2".to_string(),
                },
            ),
            DisposeDecision::Ignore("stale-bridge")
        );
        assert_eq!(
            dispose_decision(
                Some(&installed),
                &NativeApplicationMenuDisposeRequest {
                    window_label: TARGET_WINDOW_LABEL.to_string(),
                    bridge_instance_id: "bridge-1".to_string(),
                }
            ),
            DisposeDecision::Remove
        );
        assert_eq!(
            dispose_decision(
                None,
                &NativeApplicationMenuDisposeRequest {
                    window_label: TARGET_WINDOW_LABEL.to_string(),
                    bridge_instance_id: "bridge-1".to_string(),
                }
            ),
            DisposeDecision::Ignore("not-installed")
        );
    }
}
