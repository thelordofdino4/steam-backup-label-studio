export type RemoteLogoCandidateFileType = 'svg' | 'png' | 'webp' | 'jpg' | 'gif' | 'unknown'

const NON_IMAGE_EXTENSIONS = ['css', 'js', 'json', 'map', 'txt', 'pdf', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'mp4', 'webm', 'mov']

export function isAllowedHost(url: string, hostPatterns: string[]) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return hostPatterns.some((pattern) => host === pattern || host.endsWith(`.${pattern}`))
  } catch {
    return false
  }
}

export function absolutizeUrl(rawUrl: string | undefined, sourcePageUrl: string) {
  if (!rawUrl) return null

  const trimmedUrl = rawUrl.trim()
  if (!trimmedUrl || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('javascript:')) return null

  try {
    return new URL(trimmedUrl, sourcePageUrl).href
  } catch {
    return null
  }
}

export function canonicalizeUrl(url: string) {
  const parsed = new URL(url)
  parsed.hash = ''
  return parsed.href
}

export function getHostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function getPathExtension(url: string) {
  return new URL(url).pathname.split('.').pop()?.toLowerCase() ?? ''
}

export function getFileType(url: string): RemoteLogoCandidateFileType {
  const extension = getPathExtension(url)

  switch (extension) {
    case 'svg':
      return 'svg'
    case 'png':
      return 'png'
    case 'webp':
      return 'webp'
    case 'jpg':
    case 'jpeg':
      return 'jpg'
    case 'gif':
      return 'gif'
    default:
      return 'unknown'
  }
}

export function isHttpsUrl(url: string) {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

export function isLikelyNonImageUrl(url: string) {
  const extension = getPathExtension(url)
  return NON_IMAGE_EXTENSIONS.includes(extension)
}
