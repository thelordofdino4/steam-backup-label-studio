import { discoverTestFiles } from './discover-tests.mjs'

export const testFiles = discoverTestFiles()

export const testCommands = [
  {
    command: 'cargo',
    args: [
      'test',
      '--manifest-path',
      'src-tauri/Cargo.toml',
      '--workspace',
      '--locked',
      '--jobs',
      '1',
      '--',
      '--test-threads',
      '1',
    ],
  },
]
