import type { ProjectCaseInsertTextSource } from '../project/projectTypes.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import { createFittedSteamBackCoverCopy } from './backCoverCopyFit.ts'
import {
  estimateCaseInsertTextFit, getCaseInsertTextReadabilityWarnings,
  type CaseInsertTextFitEstimate, type CaseInsertTextLayout,
  type CaseInsertTextReadabilityRole,
} from './textReadability.ts'

export type BackCoverCopyReviewTarget = Readonly<{
  id: string
  /** Already resolved by the existing content owner; never normalized or rewritten here. */
  text: string
  source: ProjectCaseInsertTextSource
  /** Supplied by the existing layout owner, in the same pixel space as export preflight. */
  layout: CaseInsertTextLayout | null
}>
export type BackCoverCopyReviewTargets = Readonly<Partial<Record<
  'description' | 'features' | 'minimumRequirements' | 'recommendedRequirements' | 'legalText',
  BackCoverCopyReviewTarget
>>>
export type BackCoverCopyAssessment =
  | Readonly<{ status: 'empty'; warnings: readonly string[] }>
  | Readonly<{ status: 'unavailable'; warnings: readonly string[] }>
  | Readonly<{
      status: 'estimated'
      estimate: Readonly<CaseInsertTextFitEstimate>
      warnings: readonly string[]
    }>

function assess(
  text: string,
  target: BackCoverCopyReviewTarget | undefined,
  label: string,
  role: CaseInsertTextReadabilityRole,
): BackCoverCopyAssessment {
  if (!text.trim()) return Object.freeze({ status: 'empty', warnings: Object.freeze([]) })
  const layout = target?.layout
  const bounds = layout?.reservedBounds ?? layout?.bounds
  if (!layout || !bounds ||
      ![bounds.x, bounds.y, bounds.width, bounds.height, layout.fontSizePx, layout.lineHeightPx].every(Number.isFinite) ||
      bounds.width <= 0 || bounds.height <= 0 || layout.fontSizePx <= 0 || layout.lineHeightPx <= 0) {
    return Object.freeze({ status: 'unavailable', warnings: Object.freeze([
      'A valid target text layout is needed before copy fit can be estimated.',
    ]) })
  }
  // Match export preflight's reserved-box choice; do not invent new wrapping or font rules.
  const assessmentLayout = { ...layout, bounds }
  return Object.freeze({ status: 'estimated',
    estimate: Object.freeze(estimateCaseInsertTextFit(text, assessmentLayout)),
    warnings: Object.freeze(getCaseInsertTextReadabilityWarnings({ text, layout: assessmentLayout, label, role })),
  })
}

function currentReview(target: BackCoverCopyReviewTarget | undefined, label: string, role: CaseInsertTextReadabilityRole) {
  return target ? Object.freeze({ id: target.id, text: target.text, source: target.source,
    assessment: assess(target.text, target, label, role),
  }) : null
}

/**
 * Read-only review preparation, not a Game import plan or commit authorization.
 * No variant is selected. Consumers must re-plan/review against current session
 * state before any future application through the Game atomic commit owner.
 */
export function createBackCoverCopyFitReview(
  importedGame: SteamImportedGame,
  targets: BackCoverCopyReviewTargets,
  options: Readonly<{ legalText?: string }> = {},
) {
  const copy = createFittedSteamBackCoverCopy(importedGame, options)
  const description = Object.freeze({
    current: currentReview(targets.description, 'Description', 'description'),
    variants: Object.freeze(copy.descriptionVariants.map(variant => Object.freeze({
      ...variant,
      assessment: assess(variant.text, targets.description, 'Description', 'description'),
    }))),
  })
  const bulletPrefixes = copy.featureBullets.map((_, index) => {
    const items = Object.freeze(copy.featureBullets.slice(0, index + 1))
    return Object.freeze({ items, omittedCount: copy.featureBullets.length - items.length,
      assessment: assess(items.map(item => `- ${item}`).join('\n'), targets.features, 'Feature bullets', 'features'),
    })
  })
  const features = Object.freeze({
    current: currentReview(targets.features, 'Feature bullets', 'features'),
    sourceItems: Object.freeze([...copy.featureBullets]),
    prefixes: Object.freeze(bulletPrefixes),
  })
  function textReview(key: 'minimumRequirements' | 'recommendedRequirements' | 'legalText', label: string, role: CaseInsertTextReadabilityRole) {
    return Object.freeze({ current: currentReview(targets[key], label, role), candidate: Object.freeze({
      text: copy[key], assessment: assess(copy[key], targets[key], label, role),
    }) })
  }
  return Object.freeze({
    defaultAction: 'preserve' as const,
    fitEvidence: 'existing-preflight-estimate' as const,
    requiresVisualVerification: true as const,
    description, features,
    minimumRequirements: textReview('minimumRequirements', 'Minimum requirements', 'requirements'),
    recommendedRequirements: textReview('recommendedRequirements', 'Recommended requirements', 'requirements'),
    legalText: textReview('legalText', 'Legal text', 'legal'),
    sourceWarnings: Object.freeze([...copy.warnings]),
  })
}
