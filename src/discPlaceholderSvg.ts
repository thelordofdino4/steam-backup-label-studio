import { getMediaMarkLabel, getPlatformMarkLabel } from './project/projectMediaMark'
import type { PlatformMarkValue, ProjectMetadata } from './project/projectTypes'
import { escapeSvgAttribute, escapeSvgText } from './svgUtils'

const PLACEHOLDER_SHADOW_FILTER = `
  <filter id="placeholder-shadow" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
    <feDropShadow dx="0" dy="2.4" stdDeviation="3.4" flood-color="#000000" flood-opacity="0.28" />
  </filter>
`

function getRatingPlaceholderLabel(metadata: ProjectMetadata) {
  if (metadata.ratingSystem === 'none') {
    return ''
  }

  return metadata.ratingValue.trim() || metadata.ratingSystem
}

function getRatingColors(metadata: ProjectMetadata) {
  if (metadata.ratingSystem === 'custom') {
    return {
      fill: '#111827',
      stroke: '#f9fafb',
      text: '#f9fafb',
    }
  }

  return {
    fill: '#f9fafb',
    stroke: '#111827',
    text: '#111827',
  }
}

function splitPlaceholderWords(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean)

  if (words.length <= 1) return [label]

  const midpoint = Math.ceil(words.length / 2)
  return [
    words.slice(0, midpoint).join(' '),
    words.slice(midpoint).join(' '),
  ]
}

export function buildRatingBadgePlaceholderSvg(metadata: ProjectMetadata) {
  const label = getRatingPlaceholderLabel(metadata)
  const colors = getRatingColors(metadata)
  const escapedSystem = escapeSvgText(metadata.ratingSystem)
  const escapedLabel = escapeSvgText(label)
  const shape =
    metadata.ratingSystem === 'PEGI'
      ? `<circle cx="45" cy="65" r="43" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="4" />`
      : `<rect x="2" y="2" width="86" height="126" rx="6" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="4" />`

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="90" height="130" viewBox="0 0 90 130" role="img" aria-label="${escapeSvgAttribute(`${metadata.ratingSystem} rating placeholder`)}">
      <defs>${PLACEHOLDER_SHADOW_FILTER}</defs>
      <g filter="url(#placeholder-shadow)">
        ${shape}
        <text x="45" y="25" fill="${colors.text}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="10" font-weight="800" letter-spacing="0.7">${escapedSystem}</text>
        <text x="45" y="66" fill="${colors.text}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="36" font-weight="900">${escapedLabel}</text>
        <text x="45" y="106" fill="${colors.text}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="8.5" font-weight="800" letter-spacing="0.8">PLACEHOLDER</text>
      </g>
    </svg>
  `
}

export function buildMediaMarkPlaceholderSvg(value: Parameters<typeof getMediaMarkLabel>[0]) {
  const label = getMediaMarkLabel(value).toUpperCase()

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="130" height="80" viewBox="0 0 130 80" role="img" aria-label="${escapeSvgAttribute(`${label} media mark placeholder`)}">
      <defs>${PLACEHOLDER_SHADOW_FILTER}</defs>
      <g filter="url(#placeholder-shadow)">
        <rect x="2" y="2" width="126" height="76" rx="7" fill="rgba(17, 24, 39, 0.88)" stroke="rgba(249, 250, 251, 0.92)" stroke-width="4" />
        <text x="65" y="35" fill="#f9fafb" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="22" font-weight="900">${escapeSvgText(label)}</text>
        <text x="65" y="58" fill="#f9fafb" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="8" font-weight="800" letter-spacing="1">MEDIA</text>
      </g>
    </svg>
  `
}

export function buildPlatformMarkPlaceholderSvg(value: PlatformMarkValue) {
  const labelLines = splitPlaceholderWords(getPlatformMarkLabel(value).toUpperCase())
  const lineHeight = labelLines.length > 1 ? 18 : 0
  const firstLineY = labelLines.length > 1 ? 31 : 40

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80" role="img" aria-label="${escapeSvgAttribute(`${getPlatformMarkLabel(value)} platform mark placeholder`)}">
      <defs>${PLACEHOLDER_SHADOW_FILTER}</defs>
      <g filter="url(#placeholder-shadow)">
        <rect x="2" y="2" width="116" height="76" rx="7" fill="rgba(17, 24, 39, 0.88)" stroke="rgba(249, 250, 251, 0.92)" stroke-width="4" />
        <text fill="#f9fafb" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${labelLines.length > 1 ? 16 : 18}" font-weight="900">
          ${labelLines.map((line, index) => `<tspan x="60" y="${firstLineY + index * lineHeight}">${escapeSvgText(line)}</tspan>`).join('')}
        </text>
      </g>
    </svg>
  `
}
