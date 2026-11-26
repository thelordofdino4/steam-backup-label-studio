import { spawnSync } from 'node:child_process'
import { repositoryRoot } from './discover-tests.mjs'
import { testCommands, testFiles } from './test-file-list.mjs'

const [mode, lane, ...extra] = process.argv.slice(2)
// These files exercise the Chromium sandbox on the ordinary Windows runner.
const sandboxedBrowserTestFiles = [
  'scripts/integration/disc-background-canvas.integration.test.mjs',
  'src/app/discSteamMounted.integration.test.mjs',
  'src/components/preview/inlinePreviewTextEditorRibbon.integration.test.mjs',
  'src/export/discBackgroundLifetime.integration.test.mjs',
  'src/image/backgroundLayout.integration.test.mjs',
]
const validModes = ['--list', '--node-only', '--rust-only']
const validLanes = ['--exclude-sandboxed-browser', '--sandboxed-browser-only']

if (extra.length || (mode && !validModes.includes(mode)) ||
    (lane && (!validLanes.includes(lane) || mode === '--rust-only'))) {
  throw new Error('Usage: node scripts/run-tests.mjs [--list|--node-only|--rust-only] [--exclude-sandboxed-browser|--sandboxed-browser-only]')
}

if (lane) {
  const missing = sandboxedBrowserTestFiles.filter(file => !testFiles.includes(file))
  if (missing.length) throw new Error('Missing sandboxed browser test files: ' + missing.join(', '))
}
const selectedTestFiles = lane === '--exclude-sandboxed-browser'
  ? testFiles.filter(file => !sandboxedBrowserTestFiles.includes(file))
  : lane === '--sandboxed-browser-only' ? sandboxedBrowserTestFiles : testFiles

if (mode === '--list') {
  console.log(selectedTestFiles.join('\n'))
  process.exit(0)
}
process.chdir(repositoryRoot)
const batchSize = 40
let failed = false

console.log(`Selected ${selectedTestFiles.length} of ${testFiles.length} discovered Node test files.`)
for (let index = 0; mode !== '--rust-only' && index < selectedTestFiles.length; index += batchSize) {
  const batch = selectedTestFiles.slice(index, index + batchSize)
  const result = spawnSync(
    process.execPath,
    ['--test', '--experimental-strip-types', ...batch],
    {
      stdio: 'inherit',
    },
  )

  if (result.status !== 0) {
    failed = true
  }
}

for (const { command, args } of mode === '--node-only' ? [] : testCommands) {
  const result = spawnSync(command, args, {
    shell: false,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    failed = true
  }
}

if (failed) {
  process.exitCode = 1
}
