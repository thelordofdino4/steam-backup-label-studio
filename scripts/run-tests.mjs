import { spawnSync } from 'node:child_process'
import { testCommands, testFiles } from './test-file-list.mjs'

const batchSize = 40
let failed = false

for (let index = 0; index < testFiles.length; index += batchSize) {
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
    break
  }
}

for (const { command, args } of testCommands) {
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
