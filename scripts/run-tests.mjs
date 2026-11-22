import { spawnSync } from 'node:child_process'
import { repositoryRoot } from './discover-tests.mjs'
import { testCommands, testFiles } from './test-file-list.mjs'

const mode = process.argv[2]
if (process.argv.length > 3 || (mode && !['--list', '--node-only', '--rust-only'].includes(mode))) {
  throw new Error('Usage: node scripts/run-tests.mjs [--list|--node-only|--rust-only]')
}
if (mode === '--list') {
  console.log(testFiles.join('\n'))
  process.exit(0)
}
process.chdir(repositoryRoot)
const batchSize = 40
let failed = false

console.log(`Discovered ${testFiles.length} Node test files.`)
for (let index = 0; mode !== '--rust-only' && index < testFiles.length; index += batchSize) {
  const batch = testFiles.slice(index, index + batchSize)
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

// Run this one comparison lane after the complete Node suite, not alongside it.
if (!failed && mode === '--node-only' &&
    process.env.GITHUB_ACTIONS === 'true' &&
    process.env.GITHUB_EVENT_NAME === 'pull_request' &&
    process.env.GITHUB_HEAD_REF === 'agent/365-background-baseline-ci-20261122' &&
    process.env.GITHUB_BASE_REF === 'main') {
  const baseline = spawnSync(process.execPath, ['scripts/performance/disc-background-mounted-baseline.mjs'], { stdio: 'inherit' })
  if (baseline.status !== 0) failed = true
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
