import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(currentDir))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

test('approved simple optional visual slots use the shared shell', () => {
  const targets = [
    {
      path: 'src/components/sidebar/artwork/TitleArtworkControls.tsx',
      className: 'feature-control-body title-artwork-control',
      label: 'Show game logo',
    },
    {
      path: 'src/components/sidebar/branding/LogoAssetControls.tsx',
      className: 'logo-asset-card',
      label: 'Show ${label.toLowerCase()} logo',
    },
    {
      path: 'src/components/caseInsert/CaseInsertLogoSlotControls.tsx',
      className: 'logo-asset-card',
      label: 'Show ${label.toLocaleLowerCase()}',
    },
  ] as const

  targets.forEach(({ path, className, label }) => {
    const source = readRepoFile(path)

    assert.match(source, /OptionalFeatureSection/)
    assert.match(source, new RegExp(`className="${className}"`))
    assert.ok(source.includes(`enableLabel={\`${label}\`}`) ||
      source.includes(`enableLabel="${label}"`))
  })
})

test('additional artwork global and frame gates use the shared shell', () => {
  const targets = [
    {
      path: 'src/components/sidebar/artwork/AdditionalArtworkControls.tsx',
      className: 'feature-control-body additional-artwork-control',
      label: 'Show additional artwork',
    },
    {
      path: 'src/components/caseInsert/CaseInsertTemplateControls.tsx',
      className: 'feature-control-body additional-artwork-control',
      label: 'Show additional artwork',
    },
    {
      path: 'src/components/caseInsert/CaseInsertSpineControls.tsx',
      className: 'feature-control-body additional-artwork-control',
      label: 'Show additional artwork',
    },
    {
      path: 'src/components/editor/EditorArtworkFrameControls.tsx',
      className: 'additional-artwork-frame-controls',
      label: 'Show border/frame',
    },
  ] as const

  targets.forEach(({ path, className, label }) => {
    const source = readRepoFile(path)

    assert.match(source, /OptionalFeatureSection/)
    assert.match(source, new RegExp(`className="${className}"`))
    assert.match(source, new RegExp(`enableLabel="${label}"`))
  })
})

test('additional artwork frame keeps reset in the shell action slot', () => {
  const source = readRepoFile(
    'src/components/editor/EditorArtworkFrameControls.tsx',
  )

  assert.match(source, /actions=\{\(/)
  assert.match(source, /Reset frame/)
})

test('additional artwork per-item cards remain feature-owned', () => {
  const discAdditionalArtwork = readRepoFile(
    'src/components/sidebar/artwork/AdditionalArtworkControls.tsx',
  )
  const caseInsertTemplate = readRepoFile(
    'src/components/caseInsert/CaseInsertTemplateControls.tsx',
  )
  const caseInsertSpine = readRepoFile(
    'src/components/caseInsert/CaseInsertSpineControls.tsx',
  )

  assert.match(discAdditionalArtwork, /RepeatedVisualElementCard/)
  assert.match(caseInsertTemplate, /RepeatedVisualElementCard/)
  assert.match(caseInsertSpine, /RepeatedVisualElementCard/)
  assert.match(discAdditionalArtwork, /handleRemoveAdditionalArtworkElement/)
  assert.match(caseInsertTemplate, /deleteLabel=/)
  assert.match(caseInsertTemplate, /onDelete=/)
  assert.match(caseInsertSpine, /deleteLabel=/)
  assert.match(caseInsertSpine, /onDelete=/)
})

test('Steam banner controls use the shared shell without owning banner state', () => {
  const editorControls = readRepoFile(
    'src/components/editor/EditorSteamBannerControls.tsx',
  )
  const discControls = readRepoFile(
    'src/components/sidebar/branding/SteamBannerControls.tsx',
  )
  const caseControls = readRepoFile(
    'src/components/caseInsert/CaseInsertSteamBannerControls.tsx',
  )

  assert.match(editorControls, /OptionalFeatureSection/)
  assert.match(editorControls, /className="feature-control-body"/)
  assert.match(editorControls, /enableLabel="Show Steam banner"/)
  assert.match(editorControls, /actions=\{actions\}/)
  assert.match(editorControls, /onResetColors/)
  assert.match(editorControls, /onResetLayout/)

  assert.match(discControls, /createSteamLogoPlacementMemory/)
  assert.match(discControls, /getEnabledSteamLogoPlacement/)
  assert.match(discControls, /getNextSteamLogoPlacementMemory/)
  assert.match(discControls, /handleSteamLogoPlacementChange\('none'\)/)
  assert.doesNotMatch(discControls, /OptionalFeatureSection/)

  assert.match(caseControls, /enabled=\{banner\.enabled\}/)
  assert.match(caseControls, /onEnabledChange=\{onEnabledChange\}/)
  assert.doesNotMatch(caseControls, /OptionalFeatureSection/)
})

test('rating badge controls use the shared shell while keeping supplemental USK feature-owned', () => {
  const source = readRepoFile(
    'src/components/sidebar/branding/RatingBadgeControls.tsx',
  )

  assert.match(source, /OptionalFeatureSection/)
  assert.match(source, /className="logo-asset-card"/)
  assert.match(source, /enableLabel="Show rating badge"/)
  assert.match(source, /onEnabledChange=\{handleRatingBadgeEnabledChange\}/)
  assert.match(source, /activeRatingSystem === 'PEGI'/)
  assert.match(source, /projectRatingBadge\.uskBadge\.layout\.enabled/)
  assert.match(source, /handleSupplementalUskRatingBadgeEnabledChange/)
  assert.match(source, /handleSupplementalUskRatingBadgeValueChange/)
  assert.match(source, /renderSupplementalUskLayoutControls/)
  assert.match(source, /EditorMarkImageSourceControls/)
  assert.match(source, /handleClearRatingBadgeImage/)
  assert.match(source, /handleResetRatingBadgeLayout/)
  assert.match(source, /handleResetSupplementalUskRatingBadgeLayout/)
})

test('disc title artwork keeps its reset action in the shell action slot', () => {
  const source = readRepoFile(
    'src/components/sidebar/artwork/TitleArtworkControls.tsx',
  )

  assert.match(source, /actions=\{\(/)
  assert.match(source, /Reset game logo layout/)
  assert.match(source, /disabled=\{!isRenderable\}/)
})

test('non-target optional visual components stay out of this mechanical migration', () => {
  const excludedPaths = [
    'src/components/sidebar/artwork/BackgroundArtworkControls.tsx',
    'src/components/sidebar/branding/PlatformMarkControls.tsx',
    'src/components/sidebar/branding/TechnicalMarkControls.tsx',
    'src/components/sidebar/DiscTextControl.tsx',
    'src/components/sidebar/RepeatedVisualElementCard.tsx',
  ]

  excludedPaths.forEach((path) => {
    assert.doesNotMatch(readRepoFile(path), /OptionalFeatureSection/)
  })
})
