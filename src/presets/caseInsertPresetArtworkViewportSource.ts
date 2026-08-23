import type {
  ProjectCaseInsertImageSlot,
} from '../project/projectTypes.ts'
import {
  deepFreezeCaseInsertPresetValue,
} from './caseInsertPresetSafeInput.ts'
import {
  createCaseInsertPresetDeterministicIdentityDigest,
} from './caseInsertPresetDeterministicIdentity.ts'
import type {
  CaseInsertPresetArtworkViewportSource,
} from './caseInsertPresetArtworkViewport.ts'

export type CaseInsertPresetArtworkViewportSourceState =
  | Readonly<{ status: 'absent' }>
  | Readonly<{
      status: 'present'
      assetIdentity: string
      provenanceIdentity: string | null
      width: number
      height: number
      contentBounds: CaseInsertPresetArtworkViewportSource['contentBounds']
    }>

export type CaseInsertPresetArtworkViewportSourceEvidenceResult =
  | Readonly<{
      ok: true
      source: CaseInsertPresetArtworkViewportSource | null
      sourceState: CaseInsertPresetArtworkViewportSourceState
    }>
  | Readonly<{
      ok: false
      status: 'source-evidence-unavailable'
      code:
        | 'artwork-source-data-invalid'
        | 'artwork-source-dimensions-unavailable'
    }>

function failure(
  code: Extract<
    CaseInsertPresetArtworkViewportSourceEvidenceResult,
    Readonly<{ ok: false }>
  >['code'],
): CaseInsertPresetArtworkViewportSourceEvidenceResult {
  return Object.freeze({
    ok: false,
    status: 'source-evidence-unavailable',
    code,
  })
}

/**
 * Produces the one canonical source identity used by Apply and Reapply review.
 * The identity is derived from exact encoded artwork and normalized provenance;
 * display labels, enablement, layout, frame, and viewport state are deliberately
 * outside this source boundary.
 */
export function createCaseInsertPresetArtworkViewportSourceEvidence(
  slot: Readonly<ProjectCaseInsertImageSlot>,
): CaseInsertPresetArtworkViewportSourceEvidenceResult {
  if (slot.imageDataUrl === null) {
    return deepFreezeCaseInsertPresetValue({
      ok: true,
      source: null,
      sourceState: { status: 'absent' },
    })
  }
  if (typeof slot.imageDataUrl !== 'string' || slot.imageDataUrl.length === 0) {
    return failure('artwork-source-data-invalid')
  }
  const size = slot.imageSize
  if (!size || !Number.isFinite(size.width) || size.width <= 0 ||
      !Number.isFinite(size.height) || size.height <= 0) {
    return failure('artwork-source-dimensions-unavailable')
  }

  const assetIdentity = `case:preset-artwork-asset:v1:${
    createCaseInsertPresetDeterministicIdentityDigest(slot.imageDataUrl)
  }`
  const provenanceIdentity = slot.imageSource
    ? `case:preset-artwork-provenance:v1:${
        createCaseInsertPresetDeterministicIdentityDigest(slot.imageSource)
      }`
    : null
  const contentBounds = size.contentBounds
    ? { ...size.contentBounds }
    : null
  const source: CaseInsertPresetArtworkViewportSource = {
    assetIdentity,
    provenanceIdentity,
    width: size.width,
    height: size.height,
    contentBounds,
  }
  return deepFreezeCaseInsertPresetValue({
    ok: true,
    source,
    sourceState: {
      status: 'present',
      assetIdentity,
      provenanceIdentity,
      width: size.width,
      height: size.height,
      contentBounds,
    },
  })
}
