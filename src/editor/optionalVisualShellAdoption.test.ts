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
    'src/components/editor/EditorSteamBannerControls.tsx',
    'src/components/sidebar/artwork/BackgroundArtworkControls.tsx',
    'src/components/sidebar/branding/PlatformMarkControls.tsx',
    'src/components/sidebar/branding/RatingBadgeControls.tsx',
    'src/components/sidebar/branding/TechnicalMarkControls.tsx',
    'src/components/sidebar/DiscTextControl.tsx',
    'src/components/sidebar/RepeatedVisualElementCard.tsx',
  ]

  excludedPaths.forEach((path) => {
    assert.doesNotMatch(readRepoFile(path), /OptionalFeatureSection/)
  })
})
