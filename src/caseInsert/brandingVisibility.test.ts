import assert from 'node:assert/strict'
import test from 'node:test'
import type { CaseInsertBrandingSourceCatalog } from './brandingSlotSources.ts'
import {
  isCaseInsertMarkKindEnabled,
  isCaseInsertMarkSlotVisible,
} from './brandingVisibility.ts'
import { createDefaultCaseInsertImageSlot } from './defaults.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import {
  createDefaultProjectMediaMark,
  updateMediaMarkLayoutField,
  updateMediaMarkValue,
} from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarks,
  updateTechnicalMarkToggle,
} from '../project/projectTechnicalMarks.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import type { ProjectCaseInsertImageSlot } from '../project/projectTypes.ts'

function createBrandingSources(
  overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
): CaseInsertBrandingSourceCatalog {
  return {
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(),
    projectMediaMark: createDefaultProjectMediaMark(),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    ...overrides,
  }
}

function createMarkSlot(sourceId: string): ProjectCaseInsertImageSlot {
  return {
    ...createDefaultCaseInsertImageSlot('mark-1', 'Test mark', {
      enabled: true,
    }),
    imageDataUrl: 'data:image/png;base64,test-mark',
    imageSize: { width: 256, height: 128 },
    imageSource: createProjectImageAssetProvenance({
      source: 'placeholder',
      sourceId,
      sourceLabel: 'Test mark',
    }),
  }
}

test('case insert rating mark visibility follows shared rating badge setup', () => {
  const ratingSlot = createMarkSlot('case-rating:ESRB:E')
  const enabledRatingBadge = createDefaultProjectRatingBadge()
  const enabledSources = createBrandingSources({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'E',
    },
    projectRatingBadge: {
      ...enabledRatingBadge,
      layout: {
        ...enabledRatingBadge.layout,
        enabled: true,
      },
    },
  })

  assert.equal(
    isCaseInsertMarkKindEnabled('rating', createBrandingSources()),
    false,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(ratingSlot, 'rating', enabledSources),
    true,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(
      ratingSlot,
      'rating',
      createBrandingSources({
        ...enabledSources,
        projectMetadata: {
          ...enabledSources.projectMetadata,
          ratingValue: 'M',
        },
      }),
    ),
    false,
  )
})

test('case insert media mark visibility follows the selected enabled media mark', () => {
  const mediaSlot = createMarkSlot('case-media:dvd:light')
  const enabledDvdSources = createBrandingSources({
    projectMediaMark: updateMediaMarkValue(
      updateMediaMarkLayoutField(
        createDefaultProjectMediaMark(),
        'enabled',
        true,
      ),
      'dvd',
    ),
  })

  assert.equal(isCaseInsertMarkSlotVisible(
    mediaSlot,
    'media',
    createBrandingSources(),
  ), false)
  assert.equal(isCaseInsertMarkSlotVisible(
    mediaSlot,
    'media',
    enabledDvdSources,
  ), true)
  assert.equal(isCaseInsertMarkSlotVisible(
    mediaSlot,
    'media',
    createBrandingSources({
      projectMediaMark: updateMediaMarkValue(
        enabledDvdSources.projectMediaMark,
        'dataDisc',
      ),
    }),
  ), false)
})

test('case insert platform and technical marks only show selected enabled values', () => {
  const platformSlot = createMarkSlot('case-platform:windows:windows11')
  const technicalSlot = createMarkSlot('case-technical:audio')
  const enabledSources = createBrandingSources({
    projectPlatformMarks: updatePlatformMarkToggle(
      createDefaultProjectPlatformMarks(),
      'windows',
      true,
    ),
    projectTechnicalMarks: updateTechnicalMarkToggle(
      createDefaultProjectTechnicalMarks(),
      'audio',
      true,
    ),
  })

  assert.equal(
    isCaseInsertMarkSlotVisible(platformSlot, 'platform', enabledSources),
    true,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(technicalSlot, 'technical', enabledSources),
    true,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(
      createMarkSlot('case-platform:linux:light'),
      'platform',
      enabledSources,
    ),
    false,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(
      createMarkSlot('case-technical:surround'),
      'technical',
      enabledSources,
    ),
    false,
  )
})
