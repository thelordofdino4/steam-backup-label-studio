import type { DiscTextValues } from '../discText'
import type { ProjectMetadata } from './projectTypes'

function normalizeText(value: string | undefined) {
  return value?.trim() ?? ''
}

export function getProjectMetadataDiscNumberText(metadata: ProjectMetadata) {
  const discNumber = normalizeText(metadata.discNumber)
  const discTotal = normalizeText(metadata.discTotal)

  if (discNumber && discTotal) {
    return `Disc ${discNumber} of ${discTotal}`
  }

  if (discNumber) {
    return `Disc ${discNumber}`
  }

  if (discTotal) {
    return `Disc 1 of ${discTotal}`
  }

  return ''
}

export function resolveMetadataBoundDiscTextValues(
  values: DiscTextValues,
  metadata: ProjectMetadata,
): DiscTextValues {
  const metadataDiscNumber = getProjectMetadataDiscNumberText(metadata)
  const metadataBackupDate = normalizeText(metadata.backupDate)
  const metadataAppId = normalizeText(metadata.steamAppId)
  const metadataCopyright = normalizeText(metadata.copyrightText)

  return {
    ...values,
    discNumber: metadataDiscNumber || values.discNumber,
    backupDate: metadataBackupDate || values.backupDate,
    appId: metadataAppId || values.appId,
    copyright: metadataCopyright || values.copyright,
  }
}
