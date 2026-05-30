import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText.ts'
import { createDefaultDiscTextStyles } from '../discTextStyles.ts'
import { createDefaultProjectDiscNumberArtwork } from '../discNumberArtwork.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import { createDefaultProjectAdditionalArtwork } from '../project/projectAdditionalArtwork.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectMediaMark,
  createDefaultProjectPlatformMarks,
} from '../project/projectMediaMark.ts'
import { createDefaultProjectTechnicalMarks } from '../project/projectTechnicalMarks.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import { createDiscTextOccupiedRegions } from './discTextOccupiedRegions.ts'

function measureText(text: string) {
  return Array.from(text).length
}

test('occupied regions include other visible straight text boxes for opt-in avoidance', () => {
  const template = discTemplates.standardPrintableDisc
  const layout = createDefaultDiscTextLayout('top', template)
  const regions = createDiscTextOccupiedRegions({
    projectTitleArtwork: createDefaultProjectTitleArtwork(template, 'top'),
    projectLogoAssets: createDefaultProjectLogoAssets(template),
    projectAdditionalArtwork: createDefaultProjectAdditionalArtwork(),
    projectMetadata: createDefaultProjectMetadata(),
    projectRatingBadge: createDefaultProjectRatingBadge(template),
    projectMediaMark: createDefaultProjectMediaMark(template),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    projectDiscNumberArtwork: createDefaultProjectDiscNumberArtwork(),
    discTextSettings: {
      ...DEFAULT_DISC_TEXT_SETTINGS,
      title: true,
      customNote: true,
    },
    discTextValues: {
      ...createDefaultDiscTextValues(),
      customNote: 'Visible custom note',
    },
    discTextLayout: {
      ...layout,
      title: {
        ...layout.title,
        y: 40,
      },
      customNote: {
        ...layout.customNote,
        y: 45,
      },
    },
    discTextStyles: createDefaultDiscTextStyles(),
    discTextTitle: 'Visible title',
    measureText,
  })

  assert.ok(
    regions.some(
      (region) =>
        region.id === 'disc-text-title' &&
        region.sourceDiscTextKey === 'title',
    ),
  )
  assert.ok(
    regions.some(
      (region) =>
        region.id === 'disc-text-customNote' &&
        region.sourceDiscTextKey === 'customNote',
    ),
  )
})
