import { invoke } from '@tauri-apps/api/core'

export function readProjectFile(path: string) {
  return invoke<string>('read_project_file', { path })
}

export function writeProjectFile(path: string, contents: string) {
  return invoke('write_project_file', { path, contents })
}
