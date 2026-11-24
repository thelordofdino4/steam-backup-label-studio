import { spawnSync } from 'node:child_process'
import { repositoryRoot } from './discover-tests.mjs'
import { testCommands, testFiles } from './test-file-list.mjs'

const [mode, lane, ...extra] = process.argv.slice(2)
const lifetimeTestFile = 'src/export/discBackgroundLifetime.integration.test.mjs'
const validModes = ['--list', '--node-only', '--rust-only']
const validLanes = ['--exclude-disc-background-lifetime', '--disc-background-lifetime-only']

if (extra.length || (mode && !validModes.includes(mode)) ||
    (lane && (!validLanes.includes(lane) || mode === '--rust-only'))) {
  throw new Error('Usage: node scripts/run-tests.mjs [--list|--node-only|--rust-only] [--exclude-disc-background-lifetime|--disc-background-lifetime-only]')
}

if (lane && !testFiles.includes(lifetimeTestFile)) {
  throw new Error('The explicit Disc Background lifetime test lane must contain a discovered test file.')
}
const selectedTestFiles = lane === '--exclude-disc-background-lifetime'
  ? testFiles.filter(file => file !== lifetimeTestFile)
  : lane === '--disc-background-lifetime-only' ? [lifetimeTestFile] : testFiles

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
