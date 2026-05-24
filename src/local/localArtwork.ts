import { invoke } from '@tauri-apps/api/core'
import { bytesToBase64 } from '../utils/bytesToBase64'

export type LocalSteamScreenshotAsset = {
  id: string
  label: string
  path: string
  folderPath: string
  modifiedUnixSeconds?: number
}

type RawLocalSteamScreenshotAsset = {
  id: string
  label: string
  path: string
  folderPath?: string
  folder_path?: string
  modifiedUnixSeconds?: number
  modified_unix_seconds?: number
}

type DownloadedArtwork = {
  content_type: string
  bytes: number[]
}


export async function findSteamScreenshots(appId: number) {
  const screenshots = await invoke<RawLocalSteamScreenshotAsset[]>('find_steam_screenshots', {
    appid: appId,
  })

  return screenshots.map((screenshot) => ({
    id: screenshot.id,
    label: screenshot.label,
    path: screenshot.path,
    folderPath: screenshot.folderPath ?? screenshot.folder_path ?? '',
    modifiedUnixSeconds:
      screenshot.modifiedUnixSeconds ?? screenshot.modified_unix_seconds,
  }))
}

export async function readLocalImageAsDataUrl(path: string) {
  const image = await invoke<DownloadedArtwork>('read_local_image_file', {
    path,
  })
  const base64 = bytesToBase64(image.bytes)

  return `data:${image.content_type};base64,${base64}`
}

export async function openLocalFolder(path: string) {
  await invoke('open_local_folder', {
    path,
  })
}