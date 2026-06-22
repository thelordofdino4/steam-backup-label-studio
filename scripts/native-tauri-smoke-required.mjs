#!/usr/bin/env node

const lines = [
  'Native Tauri text-editor smoke is not runnable as a repository npm script.',
  '',
  'Required runtime target:',
  '  cd "$env:USERPROFILE\\steam-backup-label-studio"',
  '  npm run tauri dev',
  '',
  'Then use Codex Any App / Computer Use against the native Tauri window spawned',
  'from this checkout. Do not browse to localhost or use Brave/Chrome/Edge for',
  'visual acceptance. Browser-only diagnostics are available through:',
  '',
  '  npm run diagnose:text-editor:browser',
  '  npm run capture:ribbon:browser',
  '',
  'This command exits nonzero so browser diagnostics cannot accidentally satisfy',
  'the required native runtime smoke gate.',
]

console.error(lines.join('\n'))
process.exitCode = 1
