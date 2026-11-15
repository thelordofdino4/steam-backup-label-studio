import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL } from '../assets/assetManifest.ts'
import { DEFAULT_STEAM_BANNER_FALLBACK_TEXT } from '../branding/steamBannerDefaults.ts'
import { createProjectPackageCapturePlan } from '../package/projectPackageCapturePlan.ts'
import { createProjectPackageWriteProjection } from '../package/projectPackageWriteProjection.ts'
import { createProjectSnapshot } from './createProjectSnapshot.ts'
import {
  restoreSavedProjectState,
  restoreProjectStateFromContents,
  type RestoredProjectState,
} from './restoreProjectState.ts'
import type { SavedDiscProject } from './projectTypes.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from './projectSchema.ts'

const baseProject: SavedDiscProject = {
  schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
  title: 'Saved Title',
  savedAt: '2026-01-01T00:00:00.000Z',
  game: {
    manualTitle: 'Manual Saved Title',
    selectedSteamGame: {
      appId: 123,
      title: 'Imported Game',
      developer: ['Example Dev'],
      publisher: ['Example Publisher'],
      releaseDate: '2025',
      artwork: [],
    },
  },
  template: {
    type: 'disc',
    variant: 'standardPrintableDisc',
    customDimensions: null,
  },
  steamBackupLogo: {
    placement: 'top',
  },
  background: {
    scale: 1.35,
    offset: { x: 8, y: -4 },
    imageDataUrl: null,
    note: 'test project',
  },
}

test('restores saved built-in Steam banner lockups with the current included default', async () => {
  const restored = await restoreSavedProjectState(
    {
      ...baseProject,
      steamBackupLogo: {
        placement: 'top',
        lockupImageDataUrl: '/assets/steam-default-lockup-stale.png',
        lockupImageSource: {
          source: 'built-in',
          sourceId: null,
          sourceLabel: 'Default Steam banner lockup',
        },
        lockupImageSize: null,
      },
    },
    {
      defaultSteamBannerLockupImageUrl: 'current-default-lockup.png',
    },
  )

  assert.equal(restored.steamBannerLockupImageUrl, 'current-default-lockup.png')
  assert.equal(restored.steamBannerLockupImageSource?.source, 'built-in')
  assert.equal(restored.steamBannerLockupImageSize, null)
})

test('restores saved Steam banner text fallback while keeping the lockup image', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    steamBackupLogo: {
      placement: 'bottom',
      lockupImageDataUrl: 'data:image/png;base64,custom-lockup',
      lockupImageSize: { width: 480, height: 128 },
      useTextFallback: true,
      fallbackText: 'Taihazu Archive',
    },
  })

  assert.equal(restored.steamLogoPlacement, 'bottom')
  assert.equal(restored.steamBannerLockupImageUrl, 'data:image/png;base64,custom-lockup')
  assert.equal(restored.steamBannerUseTextFallback, true)
  assert.equal(restored.steamBannerFallbackText, 'Taihazu Archive')
})

test('normalizes blank Steam banner fallback text to the default', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    steamBackupLogo: {
      placement: 'top',
      useTextFallback: true,
      fallbackText: '   ',
    },
  })

  assert.equal(restored.steamBannerUseTextFallback, true)
  assert.equal(restored.steamBannerFallbackText, DEFAULT_STEAM_BANNER_FALLBACK_TEXT)
})

function snapshot(restored: RestoredProjectState) {
  return createProjectSnapshot({
    ...restored,
    selectedDiscTemplateId: restored.template.selectedDiscTemplateId,
    customDiscTemplate: restored.template.customDiscTemplate ?? restored.template.selectedDiscTemplate,
  })
}

function bannerDecision(project: SavedDiscProject) {
  return createProjectPackageCapturePlan(project).captures.find(
    ({ ownerId }) => ownerId === 'disc.steam-banner',
  )!.decision
}

test('minimal legacy restore qualifies the actual default banner without persisting its runtime URL', async () => {
  const contents = await readFile('fixtures/projects/legacy-minimal-0.1.0.sbls.json', 'utf8')
  const restored = await restoreProjectStateFromContents(contents, {
    defaultSteamBannerLockupImageUrl: DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
  })
  assert.equal(restored.steamBannerLockupImageUrl, DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL)
  assert.equal(restored.steamBannerLockupImageSource?.source, 'built-in')
  for (const placement of ['top', 'bottom', 'none'] as const) {
    const project = snapshot({ ...restored, steamLogoPlacement: placement })
    assert.equal(project.steamBackupLogo.placement, placement)
    assert.equal(project.steamBackupLogo.lockupImageDataUrl, null)
    assert.equal(project.steamBackupLogo.lockupImageSize, null)
    assert.deepEqual(bannerDecision(project), {
      kind: 'qualified-built-in', compatibilityId: 'steam-banner:banner-lockup',
    })
    const plan = createProjectPackageCapturePlan(project)
    assert.deepEqual(plan.captures.filter(({ decision }) => decision.kind === 'unsupported-nonportable-asset'), [])
    const projected = createProjectPackageWriteProjection(project, plan)
    assert.deepEqual(projected.dataUrls, [])
    assert.equal(projected.projectJson.includes(DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL), false)
    assert.equal(JSON.parse(projected.projectJson).steamBackupLogo.lockupImageSource.source, 'built-in')
  }
})

test('missing runtime defaults do not invent banner provenance', async () => {
  for (const defaultSteamBannerLockupImageUrl of [undefined, null, '']) {
    const restored = await restoreSavedProjectState(baseProject, { defaultSteamBannerLockupImageUrl })
    assert.equal(restored.steamBannerLockupImageSource, null)
  }
})

test('explicit null and empty-string banner absence can still restore the default', async () => {
  for (const lockupImageDataUrl of [null, undefined, '', '   ']) {
    const restored = await restoreProjectStateFromContents(JSON.stringify({
      ...baseProject,
      steamBackupLogo: { placement: 'top', lockupImageDataUrl },
    }), { defaultSteamBannerLockupImageUrl: DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL })
    assert.equal(restored.steamBannerLockupImageSource?.source, 'built-in')
    assert.deepEqual(bannerDecision(snapshot(restored)), {
      kind: 'qualified-built-in', compatibilityId: 'steam-banner:banner-lockup',
    })
  }
})

test('malformed non-null banner image evidence never becomes a qualified default', async () => {
  for (const lockupImageDataUrl of [
    { dataUrl: 'data:image/png;base64,Y3VzdG9t' }, 17, [], false,
  ]) {
    const restored = await restoreProjectStateFromContents(JSON.stringify({
      ...baseProject,
      steamBackupLogo: { placement: 'none', lockupImageDataUrl },
    }), { defaultSteamBannerLockupImageUrl: DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL })
    assert.notEqual(restored.steamBannerLockupImageSource?.source, 'built-in')
    assert.deepEqual(bannerDecision(snapshot(restored)), { kind: 'unsupported-nonportable-asset' })
  }
})

test('retained custom banner bytes and provenance survive visible and disabled restore', async () => {
  const image = 'data:image/png;base64,custom-remembered-banner'
  const size = { width: 480, height: 128 }
  for (const source of [undefined, { source: 'uploaded' as const, sourceId: 'custom-banner', sourceLabel: 'My banner' }]) {
    for (const placement of ['top', 'none'] as const) {
      const restored = await restoreSavedProjectState({
        ...baseProject,
        steamBackupLogo: { placement, lockupImageDataUrl: image, lockupImageSize: size, lockupImageSource: source },
      }, { defaultSteamBannerLockupImageUrl: DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL })
      const project = snapshot(restored)
      assert.equal(project.steamBackupLogo.lockupImageDataUrl, image)
      assert.deepEqual(project.steamBackupLogo.lockupImageSize, size)
      assert.equal(project.steamBackupLogo.lockupImageSource?.source, source?.source ?? 'embedded')
      if (source) assert.deepEqual(project.steamBackupLogo.lockupImageSource, { ...source, sourceUrl: null })
      assert.equal(project.steamBackupLogo.placement, placement)
      assert.deepEqual(bannerDecision(project), { kind: 'project-owned-data-url' })
    }
  }
})

test('missing custom banner evidence is not silently relabeled as the default built-in', async () => {
  for (const evidence of [
    { lockupImageSource: { source: 'uploaded' as const, sourceId: 'missing-banner' } },
    { lockupImageSize: { width: 480, height: 128 } },
    { lockupImageSize: { width: 0, height: 128 } },
    { lockupImageSource: { sourceId: 'partial-custom-evidence' } },
  ]) {
    const restored = await restoreSavedProjectState({
      ...baseProject,
      steamBackupLogo: { placement: 'none', ...evidence },
    }, { defaultSteamBannerLockupImageUrl: DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL })
    assert.notEqual(restored.steamBannerLockupImageSource?.source, 'built-in')
    assert.deepEqual(bannerDecision(snapshot(restored)), { kind: 'unsupported-nonportable-asset' })
  }
})
