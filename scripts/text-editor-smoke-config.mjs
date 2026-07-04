import os from 'node:os'
import path from 'node:path'

export const TEXT_EDITOR_SMOKE_LOG_PREFIX = '[text-editor-smoke]'
export const TEXT_EDITOR_SMOKE_DIAGNOSTIC_NOTICE =
  'Browser diagnostic only; not Tauri visual verification.'

const DEFAULT_TEXT_EDITOR_SMOKE_PORT = 5177
const DEFAULT_TEXT_EDITOR_SMOKE_ARTIFACT_DIR =
  'steam-backup-label-studio-text-editor-smoke'
const TEXT_EDITOR_SMOKE_STARTUP_TIMEOUT_MS = 30_000

export function createTextEditorSmokeConfig({
  env = process.env,
  tmpDir = os.tmpdir(),
} = {}) {
  const port = Number(env.TEXT_EDITOR_SMOKE_PORT ?? DEFAULT_TEXT_EDITOR_SMOKE_PORT)

  return {
    artifactDir: env.TEXT_EDITOR_SMOKE_ARTIFACT_DIR ??
      path.join(tmpDir, DEFAULT_TEXT_EDITOR_SMOKE_ARTIFACT_DIR),
    baseUrl: `http://127.0.0.1:${port}/`,
    port,
    startupTimeoutMs: TEXT_EDITOR_SMOKE_STARTUP_TIMEOUT_MS,
  }
}

export function getTextEditorSmokeBrowserCandidates(env = process.env) {
  return [
    env.TEXT_EDITOR_SMOKE_BROWSER,
    env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean)
}
