import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { preserveDiscPointOwnerPlacement } from '../presets/discPresetOwnerPlacement.ts'

const discTextSource = readFileSync(
  new URL('./useDiscTextState.ts', import.meta.url),
  'utf8',
)
const titleArtworkSource = readFileSync(
  new URL('./useTitleArtwork.ts', import.meta.url),
  'utf8',
)
const ratingBadgeSource = readFileSync(
  new URL('./useRatingBadgeState.ts', import.meta.url),
  'utf8',
)
const mediaMarkSource = readFileSync(
  new URL('./useMediaMarkState.ts', import.meta.url),
  'utf8',
)
const logoAssetsSource = readFileSync(
  new URL('./useProjectLogoAssets.ts', import.meta.url),
  'utf8',
)
const logoDiscoverySource = readFileSync(
  new URL('./useLogoAssetDiscovery.ts', import.meta.url),
  'utf8',
)
const backgroundSource = readFileSync(
  new URL('./useBackgroundImage.ts', import.meta.url),
  'utf8',
)
const appSource = readFileSync(
  new URL('../app/App.tsx', import.meta.url),
  'utf8',
)

function getFunctionSource(source: string, name: string) {
  const functionStart = source.indexOf(`function ${name}`)
  assert.notEqual(functionStart, -1, `Expected function ${name} to exist.`)

  const signatureEnd = source.indexOf(') {', functionStart)
  assert.notEqual(
    signatureEnd,
    -1,
    `Expected function ${name} to have a body.`,
  )
  const bodyStart = signatureEnd + 2

  let depth = 0
  let quote: "'" | '"' | '`' | null = null
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index]
    const nextCharacter = source[index + 1]

    if (lineComment) {
      if (character === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      if (character === '*' && nextCharacter === '/') {
        blockComment = false
        index += 1
      }
      continue
    }

    if (quote) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === '/' && nextCharacter === '/') {
      lineComment = true
      index += 1
      continue
    }

    if (character === '/' && nextCharacter === '*') {
      blockComment = true
      index += 1
      continue
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character
      continue
    }

    if (character === '{') depth += 1
    if (character !== '}') continue

    depth -= 1
    if (depth === 0) return source.slice(functionStart, index + 1)
  }

  assert.fail(`Could not find the end of function ${name}.`)
}

function getRefSyncEffectSource(source: string, dependency: string) {
  const pattern = new RegExp(
    `useEffect\\(\\(\\) => \\{([\\s\\S]*?)\\n  \\}, \\[${dependency}\\]\\)`,
  )
  const match = source.match(pattern)

  assert.ok(match, `Expected a ref-sync effect for ${dependency}.`)
  return match[1]
}

const activeFitPattern =
  /applyActivePresetPlacement|applySemantic(?:TitleArtwork|RatingBadge|MediaMark|PrimaryLogo|Background)Change/

test('Background replacement and re-enable refit while manual controls stay manual', () => {
  assert.match(
    getFunctionSource(backgroundSource, 'applySemanticBackgroundChange'),
    /applyActivePresetPlacement\(background\)[\s\S]*?scale: backgroundScale[\s\S]*?offset: \{ \.\.\.backgroundOffset \}/,
  )
  assert.match(
    getFunctionSource(backgroundSource, 'applyBackgroundImageImport'),
    /applySemanticBackgroundChange\(\{[\s\S]*?imageSize:[\s\S]*?scale:[\s\S]*?offset:/,
  )
  assert.match(
    getFunctionSource(backgroundSource, 'handleBackgroundArtworkEnabledChange'),
    /enabled[\s\S]*?applySemanticBackgroundChange\(/,
  )

  for (const manualHandler of [
    'handleResetBackground',
    'handleBackgroundScaleChange',
    'handleBackgroundOffsetChange',
    'handleFitBackgroundToSteamBannerOpenArea',
  ]) {
    assert.doesNotMatch(
      getFunctionSource(backgroundSource, manualHandler),
      activeFitPattern,
      `${manualHandler} must preserve direct user placement.`,
    )
  }
})

test('Title and Legal content/style semantics refit without hijacking manual layout', () => {
  assert.match(
    getFunctionSource(discTextSource, 'applyActivePresetTitleLayout'),
    /applyActivePresetTitlePlacement\(\{/,
  )

  const contentFit = getFunctionSource(
    discTextSource,
    'clampDiscTextLayoutForContent',
  )
  assert.match(
    contentFit,
    /key === 'title' && contentChanged[\s\S]*?applyActivePresetTitleLayout\(\{/,
  )
  assert.match(
    contentFit,
    /areDiscTextRenderableContentsMeasurementEquivalent\(/,
  )
  assert.match(
    contentFit,
    /applyActivePresetTitleLayout\([\s\S]*?\?\? currentTextLayout/,
  )
  assert.match(
    contentFit,
    /applyActivePresetCopyrightLayout\([\s\S]*?\?\? currentTextLayout/,
  )
  assert.doesNotMatch(discTextSource, /richText\?\.source ===/)

  const metadataFit = getFunctionSource(
    discTextSource,
    'clampMetadataBoundDiscTextLayoutsForContent',
  )
  assert.match(
    metadataFit,
    /key === 'title' && contentChanged[\s\S]*?applyActivePresetTitleLayout\(\{/,
  )
  assert.match(
    metadataFit,
    /areDiscTextRenderableContentsMeasurementEquivalent\(/,
  )
  assert.match(
    metadataFit,
    /applyActivePresetTitleLayout\([\s\S]*?\?\? currentTextLayout/,
  )

  assert.match(
    getFunctionSource(discTextSource, 'applyDiscTextInputUpdate'),
    /clampDiscTextLayoutForContent\(/,
  )
  for (const handler of [
    'handleDiscTextContentChange',
    'handleDiscTextContentModeChange',
    'handleDiscTextInlineDraftChange',
    'handleUseMetadataDiscTextValue',
    'handleDiscTextRichTextCommand',
    'handleDiscTextRichTextKeyboardCommand',
  ]) {
    assert.match(
      getFunctionSource(discTextSource, handler),
      /applyDiscTextInputUpdate\(|clampDiscTextLayoutForContent\(/,
      `${handler} must flow through content-aware preset fitting.`,
    )
  }
  const steamTitleImport = getFunctionSource(
    titleArtworkSource,
    'applySteamTitleArtworkImport',
  )
  assert.match(
    steamTitleImport,
    /placementRefitRequired[\s\S]*?applySemanticTitleArtworkChange\([\s\S]*?!titleArtworkImport\.placementRefitRequired[\s\S]*?commitProjectTitleArtwork\(/,
  )

  assert.match(
    getFunctionSource(discTextSource, 'handleDiscTextToggle'),
    /key === 'title' && checked[\s\S]*?applyActivePresetTitleLayout\(\{/,
  )
  assert.match(
    getFunctionSource(discTextSource, 'handleDiscTextStyleChange'),
    /didDiscTextPresetFitStyleChange\([\s\S]*?key === 'title' && presetFitStyleChanged[\s\S]*?applyActivePresetTitleLayout\(\{/,
  )
  assert.match(
    getFunctionSource(discTextSource, 'didDiscTextPresetFitStyleChange'),
    /key === 'title' \|\| key === 'copyright'[\s\S]*?areDiscPresetFitStylesEquivalent\([\s\S]*?areDiscTextStylesMeasurementEquivalent\(/,
  )
  assert.match(
    getFunctionSource(discTextSource, 'handleDiscTextStyleChange'),
    /key === 'copyright' && presetFitStyleChanged[\s\S]*?applyActivePresetCopyrightLayout\(\{/,
  )
  assert.match(
    getFunctionSource(discTextSource, 'handleResetDiscTextStyle'),
    /didDiscTextPresetFitStyleChange\([\s\S]*?presetFitStyleChanged && key === 'title'[\s\S]*?applyActivePresetTitleLayout\(\{/,
  )
  assert.match(
    getFunctionSource(discTextSource, 'handleApplyDiscTextStylePreset'),
    /didDiscTextPresetFitStyleChange\([\s\S]*?presetFitStyleChanged && key === 'title'[\s\S]*?applyActivePresetTitleLayout\(\{/,
  )

  for (const directLayoutHandler of [
    'handleDiscTextLayoutChange',
    'handleDiscTextAlignmentChange',
    'handleDiscTextModeChange',
    'handleDiscTextArcSideChange',
    'handleDiscTextVisualAvoidanceChange',
    'handleResetDiscTextLayout',
    'repositionDiscTextForSteamLogoPlacement',
  ]) {
    assert.doesNotMatch(
      getFunctionSource(discTextSource, directLayoutHandler),
      /applyActivePresetTitleLayout|applyActivePresetTitlePlacement/,
      `${directLayoutHandler} must preserve direct user placement.`,
    )
  }

  assert.doesNotMatch(discTextSource, /useEffect/)
})

test('point-owner semantic changes refit while layout/reset handlers stay manual', () => {
  assert.match(
    getFunctionSource(titleArtworkSource, 'applySemanticTitleArtworkChange'),
    /applyActivePresetPlacement\(titleArtwork\) \?\?[\s\S]*?preserveDiscPointOwnerPlacement\([\s\S]*?titleArtwork\.layout,[\s\S]*?projectTitleArtworkRef\.current\.layout/,
  )
  for (const handler of [
    'handleRestoreTitleArtworkDefault',
    'handleTitleArtworkUpload',
    'applySteamTitleArtworkImport',
  ]) {
    assert.match(
      getFunctionSource(titleArtworkSource, handler),
      /applySemanticTitleArtworkChange\(/,
    )
  }
  assert.match(
    getFunctionSource(ratingBadgeSource, 'applySemanticRatingBadgeChange'),
    /applyActivePresetPlacement\([\s\S]*?\) \?\?[\s\S]*?preserveDiscPointOwnerPlacement\([\s\S]*?ratingBadge\.layout,[\s\S]*?projectRatingBadgeRef\.current\.layout/,
  )
  assert.match(
    getFunctionSource(titleArtworkSource, 'handleTitleArtworkLayoutChange'),
    /field === 'enabled' && value === true[\s\S]*?applySemanticTitleArtworkChange\(/,
  )

  for (const handler of [
    'resetProjectTitleArtwork',
    'resetTitleArtworkLayoutForPlacement',
    'handleResetTitleArtworkLayout',
  ]) {
    assert.doesNotMatch(
      getFunctionSource(titleArtworkSource, handler),
      activeFitPattern,
    )
  }
  assert.match(
    getFunctionSource(mediaMarkSource, 'applySemanticMediaMarkChange'),
    /applyActivePresetPlacement\(mediaMark\) \?\?[\s\S]*?preserveDiscPointOwnerPlacement\([\s\S]*?mediaMark\.layout,[\s\S]*?projectMediaMarkRef\.current\.layout/,
  )

  for (const handler of [
    'setRatingBadgeEnabled',
    'setRatingBadgeEnabledForAppliedCandidate',
    'handleRatingBadgeUpload',
    'handleRatingBadgeSourceChange',
    'handleClearRatingBadgeImage',
  ]) {
    assert.match(
      getFunctionSource(ratingBadgeSource, handler),
      /applySemanticRatingBadgeChange\(/,
    )
  }
  assert.match(
    getFunctionSource(ratingBadgeSource, 'handleRatingBadgeLayoutChange'),
    /field === 'enabled' && value === true[\s\S]*?applySemanticRatingBadgeChange\(/,
  )
  assert.doesNotMatch(
    getFunctionSource(ratingBadgeSource, 'handleResetRatingBadgeLayout'),
    activeFitPattern,
  )

  for (const handler of [
    'handleMediaMarkUpload',
    'handleMediaMarkValueChange',
    'handleMediaMarkSourceChange',
    'handleMediaMarkThemeChange',
    'handleClearMediaMarkImage',
  ]) {
    assert.match(
      getFunctionSource(mediaMarkSource, handler),
      /applySemanticMediaMarkChange\(/,
    )
  }
  assert.match(
    getFunctionSource(mediaMarkSource, 'handleMediaMarkLayoutChange'),
    /field === 'enabled' && value === true[\s\S]*?applySemanticMediaMarkChange\(/,
  )
  assert.doesNotMatch(
    getFunctionSource(mediaMarkSource, 'handleResetMediaMarkLayout'),
    activeFitPattern,
  )

  const logoLayoutChange = getFunctionSource(
    logoAssetsSource,
    'handleLogoAssetLayoutChange',
  )
  assert.match(
    logoLayoutChange,
    /!additionalLogoId && field === 'enabled' && value === true[\s\S]*?applySemanticPrimaryLogoChange\(/,
  )
  assert.doesNotMatch(
    getFunctionSource(logoAssetsSource, 'handleResetLogoAssetLayout'),
    activeFitPattern,
  )
  assert.match(
    getFunctionSource(logoAssetsSource, 'applySemanticPrimaryLogoChange'),
    /applyActivePresetPlacement\([\s\S]*?\) \?\?[\s\S]*?preserveDiscPointOwnerPlacement\([\s\S]*?logoAssets\.(?:developerLogoLayout|publisherLogoLayout),[\s\S]*?projectLogoAssetsRef\.current\.(?:developerLogoLayout|publisherLogoLayout)/,
  )
})

test('impossible point-owner fits preserve placement without reverting semantic state', () => {
  const previousLayout = {
    enabled: false,
    scale: 1.75,
    x: 19,
    y: 73,
  }

  assert.deepEqual(
    preserveDiscPointOwnerPlacement(
      { enabled: true, scale: 0.4, x: 50, y: 40 },
      previousLayout,
    ),
    { enabled: true, scale: 1.75, x: 19, y: 73 },
  )
  assert.deepEqual(
    preserveDiscPointOwnerPlacement(
      { enabled: false, scale: 2, x: 60, y: 30 },
      { ...previousLayout, enabled: true },
    ),
    { enabled: false, scale: 1.75, x: 19, y: 73 },
  )
})

test('supplemental USK and additional logos never enter primary-owner fitting', () => {
  for (const supplementalHandler of [
    'handleSupplementalUskRatingBadgeEnabledChange',
    'handleSupplementalUskRatingBadgeValueChange',
    'handleSupplementalUskRatingBadgeLayoutChange',
    'handleResetSupplementalUskRatingBadgeLayout',
  ]) {
    assert.doesNotMatch(
      getFunctionSource(ratingBadgeSource, supplementalHandler),
      activeFitPattern,
    )
  }

  const logoImport = getFunctionSource(logoAssetsSource, 'applyLogoAssetImport')
  assert.match(
    logoImport,
    /if \(additionalLogoId\) \{[\s\S]*?commitProjectLogoAssets\(nextLogoAssets\)[\s\S]*?return nextLogoAssets[\s\S]*?\}[\s\S]*?applySemanticPrimaryLogoChange\(/,
  )

  const logoClear = getFunctionSource(logoAssetsSource, 'handleClearLogoAsset')
  assert.match(
    logoClear,
    /if \(additionalLogoId\) \{[\s\S]*?commitProjectLogoAssets\(clampedLogoAssets\)[\s\S]*?\} else \{[\s\S]*?applySemanticPrimaryLogoChange\(/,
  )

  for (const additionalHandler of [
    'handleAddAdditionalLogoAsset',
    'handleRemoveAdditionalLogoAsset',
    'handleAdditionalLogoAssetLabelChange',
  ]) {
    assert.doesNotMatch(
      getFunctionSource(logoAssetsSource, additionalHandler),
      activeFitPattern,
    )
  }

  const remoteCandidate = getFunctionSource(
    logoDiscoverySource,
    'useLogoAssetDiscovery',
  )
  assert.match(
    remoteCandidate,
    /applyLogoAssetImport\([\s\S]*?additionalLogoId/,
  )
  assert.doesNotMatch(remoteCandidate, /applyActivePresetPlacement/)
})

test('ref-sync effects cannot feed active-preset fitting loops', () => {
  const refSyncEffects = [
    getRefSyncEffectSource(titleArtworkSource, 'projectTitleArtwork'),
    getRefSyncEffectSource(ratingBadgeSource, 'projectRatingBadge'),
    getRefSyncEffectSource(mediaMarkSource, 'projectMediaMark'),
    getRefSyncEffectSource(logoAssetsSource, 'projectLogoAssets'),
  ]

  for (const effectSource of refSyncEffects) {
    assert.doesNotMatch(effectSource, activeFitPattern)
    assert.match(effectSource, /Ref\.current =/)
  }
})

test('App passes targeted fitters into every semantic owner hook', () => {
  assert.match(
    appSource,
    /useBackgroundImage\(\{[\s\S]*?applyActivePresetPlacement:\s*applyActiveBackgroundPresetPlacement/,
  )
  assert.match(
    appSource,
    /useDiscTextEditor\(\{[\s\S]*?applyActivePresetTitlePlacement:\s*\(input\) => \{[\s\S]*?applyActiveDiscPresetToTitleTextState\(/,
  )
  assert.match(
    appSource,
    /useTitleArtwork\(\{[\s\S]*?applyActivePresetPlacement:\s*applyActiveTitleArtworkPresetPlacement/,
  )
  assert.match(
    appSource,
    /useRatingBadgeState\(\{[\s\S]*?applyActivePresetPlacement:\s*applyActiveRatingBadgePresetPlacement/,
  )
  assert.match(
    appSource,
    /useMediaMarkState\(\{[\s\S]*?applyActivePresetPlacement:\s*applyActiveMediaMarkPresetPlacement/,
  )
  assert.match(
    appSource,
    /useProjectLogoAssets\(\{[\s\S]*?applyActivePresetPlacement:\s*applyActiveLogoPresetPlacement/,
  )
  assert.match(
    appSource,
    /useLogoAssetDiscovery\(\{[\s\S]*?applyLogoAssetImport/,
  )
  assert.equal(
    (appSource.match(/fitIsImpossible \? null : result\.(?:titleText|legalText)\.layout/g) ?? []).length,
    2,
  )
  assert.match(appSource, /isActiveDiscPresetPointFitImpossible\(/)

  const ratingEnableHandler = getFunctionSource(
    appSource,
    'handleRatingBadgeEnabledChange',
  )
  assert.match(
    ratingEnableHandler,
    /applyActiveRatingBadgePresetPlacement\([\s\S]*?\?\? \{[\s\S]*?preserveDiscPointOwnerPlacement\([\s\S]*?nextRatingBadge\.layout,[\s\S]*?projectRatingBadge\.layout/,
  )

  const ratingMetadataHandler = getFunctionSource(
    appSource,
    'handleProjectMetadataFieldsChange',
  )
  assert.match(
    ratingMetadataHandler,
    /affectedMetadataFields\.includes\('ratingSystem'\)[\s\S]*?affectedMetadataFields\.includes\('ratingValue'\)[\s\S]*?applyActiveRatingBadgePresetPlacement\(/,
  )

  const ratingCandidateHandler = getFunctionSource(
    appSource,
    'applyRatingCandidateToProject',
  )
  assert.match(
    ratingCandidateHandler,
    /shouldApplyAsSupplementalUsk[\s\S]*?applySupplementalUskRatingCandidate\(\{[\s\S]*?applyActivePrimaryRatingPlacement:[\s\S]*?applyActiveRatingBadgePresetPlacement\(/,
  )
  assert.doesNotMatch(
    ratingCandidateHandler,
    /shouldApplyAsSupplementalUsk[\s\S]*?setProjectRatingBadge\(\(currentBadge\)/,
  )
})
