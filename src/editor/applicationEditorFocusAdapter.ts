import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'

/**
 * Restores keyboard focus to the editor WebView before a semantic owner
 * focuses one of its controls. A native menu can leave the outer window active
 * while the embedded WebView itself does not own keyboard focus.
 */
export async function focusApplicationEditorSurface(): Promise<void> {
  if (isTauri()) {
    await getCurrentWebview().setFocus()
    return
  }
  if (typeof window !== 'undefined') window.focus()
}
