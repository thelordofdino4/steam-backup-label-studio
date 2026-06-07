import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import type { ProjectImageAssetProvenance } from '../project/projectTypes.ts'
import {
  createImportedImageAssetFromDataUrl,
  type ImportedImageAsset,
} from '../utils/importedImageAsset.ts'
import {
  downloadRemoteLogoCandidateAsDataUrl,
  type RemoteLogoCandidate,
} from './steamLogoCandidates.ts'

export type ImportedLogoCandidateAsset = {
  importedImage: ImportedImageAsset
  imageSource: ProjectImageAssetProvenance
}

export function createLogoCandidateAssetProvenance(
  candidate: RemoteLogoCandidate,
): ProjectImageAssetProvenance {
  return createProjectImageAssetProvenance({
    source: candidate.sourceKind.startsWith('steam-')
      ? 'steam-logo-candidate'
      : 'official-logo-candidate',
    sourceId: candidate.id,
    sourceLabel: candidate.label,
    sourceUrl: candidate.url,
  })
}

export async function importRemoteLogoCandidateAsset(
  candidate: RemoteLogoCandidate,
): Promise<ImportedLogoCandidateAsset> {
  const imageDataUrl = await downloadRemoteLogoCandidateAsDataUrl(candidate)

  return {
    importedImage: await createImportedImageAssetFromDataUrl(
      imageDataUrl,
      candidate.label,
    ),
    imageSource: createLogoCandidateAssetProvenance(candidate),
  }
}
