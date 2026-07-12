import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
} from '../branding/steamBannerDefaults.ts'
import { createDefaultProjectDiscNumberArtwork } from '../discText/discNumberArtwork.ts'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import { DEFAULT_EXPORT_GUIDES } from '../export/exportGuides.ts'
import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  applyDiscGuidedLayout,
  getDiscGuidedOmittedSlotIdSet,
  omitDiscGuidedSlot,
  restoreAllDiscGuidedSlots,
  restoreDiscGuidedSlot,
} from '../guidedPresets/discGuidedWorkflow.ts'
import {
  resolveDiscGuidedSlot,
  type DiscGuidedSlotState,
} from '../guidedPresets/discGuidedSlots.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import { createProjectSnapshot } from './createProjectSnapshot.ts'
import { createDefaultDiscTextValueSources } from './metadataDiscText.ts'
import { createDefaultProjectAdditionalArtwork } from './projectAdditionalArtwork.ts'
import { createDefaultProjectLogoAssets } from './projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from './projectMediaMark.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from './projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from './projectRatingBadge.ts'
import {
  createSavedDiscGuidedLayout,
  restoreSavedDiscGuidedWorkflow,
} from './projectGuidedWorkflow.ts'
import { createDefaultProjectTechnicalMarks } from './projectTechnicalMarks.ts'
import { createDefaultProjectTitleArtwork } from './projectTitleArtwork.ts'
import { restoreProjectStateFromContents } from './restoreProjectState.ts'
import type { ProjectLogoAssets } from './projectTypes.ts'

const CLASSIC_ID = 'disc:guided-layout:classic-top-title'
const RATING_ID = 'disc:guided:rating-badge:primary'
const PUBLISHER_ID = 'disc:guided:publisher-logo:primary'

function createWorkflow() {
  return applyDiscGuidedLayout(INITIAL_DISC_GUIDED_WORKFLOW_STATE, {
    id: CLASSIC_ID,
    version: 1,
  }).state
}

function createSnapshot(
  workflow = INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  projectLogoAssets?: ProjectLogoAssets,
) {
  const template = discTemplates.standardPrintableDisc

  return createProjectSnapshot({
    discGuidedWorkflow: workflow,
    manualGameTitle: 'Guided persistence fixture',
    selectedSteamGame: null,
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets:
      projectLogoAssets ?? createDefaultProjectLogoAssets(template),
    projectTitleArtwork: createDefaultProjectTitleArtwork(template, 'top'),
    projectDiscNumberArtwork: createDefaultProjectDiscNumberArtwork(),
    projectAdditionalArtwork: createDefaultProjectAdditionalArtwork(),
    projectRatingBadge: createDefaultProjectRatingBadge(template),
    projectMediaMark: createDefaultProjectMediaMark(template),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    selectedDiscTemplateId: 'standardPrintableDisc',
    customDiscTemplate: template,
    steamLogoPlacement: 'top',
    steamBannerColors: DEFAULT_STEAM_BANNER_COLORS,
    steamBannerLockupImageUrl: null,
    steamBannerLockupImageSource: null,
    steamBannerLockupImageSize: null,
    steamBannerLockupLayout: DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
    steamBannerUseTextFallback: false,
    steamBannerFallbackText: DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
    exportGuides: DEFAULT_EXPORT_GUIDES,
    backgroundScale: 1,
    backgroundOffset: { x: 0, y: 0 },
    backgroundImageUrl: null,
    backgroundImageSource: null,
    backgroundImageSize: null,
    isBackgroundArtworkEnabled: true,
    discTextSettings: DEFAULT_DISC_TEXT_SETTINGS,
    discTextValues: createDefaultDiscTextValues(),
    discTextValueSources: createDefaultDiscTextValueSources(),
    discTextTitleValue: '',
    discTextHtmlSources: {},
    discTextLayout: createDefaultDiscTextLayout('top', template),
    discTextStyles: createDefaultDiscTextStyles(),
  })
}

function createSlotState(
  restored: Awaited<ReturnType<typeof restoreProjectStateFromContents>>,
): DiscGuidedSlotState {
  return {
    background: {
      enabled: restored.isBackgroundArtworkEnabled,
      imageDataUrl: restored.backgroundImageUrl,
      imageSize: restored.backgroundImageSize,
    },
    titleArtwork: restored.projectTitleArtwork,
    metadata: restored.projectMetadata,
    ratingBadge: restored.projectRatingBadge,
    mediaMark: restored.projectMediaMark,
    platformMarks: restored.projectPlatformMarks,
    logoAssets: restored.projectLogoAssets,
    additionalArtwork: restored.projectAdditionalArtwork,
    discText: {
      settings: restored.discTextSettings,
      values: restored.discTextValues,
      valueSources: restored.discTextValueSources,
      titleValue: restored.discTextTitleValue,
      htmlSources: restored.discTextHtmlSources,
    },
  }
}

test('inactive guidance stays compact while active guidance persists canonically', () => {
  const inactive = createSnapshot()
  assert.equal(inactive.editor, undefined)
  assert.equal(
    createSavedDiscGuidedLayout(INITIAL_DISC_GUIDED_WORKFLOW_STATE),
    null,
  )

  let workflow = createWorkflow()
  workflow = omitDiscGuidedSlot(workflow, PUBLISHER_ID).state
  workflow = omitDiscGuidedSlot(workflow, RATING_ID).state

  const active = createSnapshot(workflow)
  assert.deepEqual(active.editor?.guidedLayout, {
    id: CLASSIC_ID,
    version: 1,
    omittedSlotIds: [RATING_ID, PUBLISHER_ID],
  })
})

test('active workflows round trip with zero, one, several, and restored omissions', async () => {
  const active = createWorkflow()
  const one = omitDiscGuidedSlot(active, PUBLISHER_ID).state
  const several = omitDiscGuidedSlot(
    omitDiscGuidedSlot(active, PUBLISHER_ID).state,
    RATING_ID,
  ).state
  const restoredOne = restoreDiscGuidedSlot(several, RATING_ID).state
  const restoredAll = restoreAllDiscGuidedSlots(several).state

  for (const workflow of [active, one, several, restoredOne, restoredAll]) {
    const snapshot = createSnapshot(workflow)
    const restored = await restoreProjectStateFromContents(JSON.stringify(snapshot))

    assert.deepEqual(restored.discGuidedWorkflow, workflow)
    assert.deepEqual(
      createSavedDiscGuidedLayout(restored.discGuidedWorkflow),
      snapshot.editor?.guidedLayout,
    )
  }
})

test('filled omitted owner content survives save/load and resolves after restore', async () => {
  const template = discTemplates.standardPrintableDisc
  const logoAssets = createDefaultProjectLogoAssets(template)
  logoAssets.publisherLogoDataUrl = 'data:image/png;base64,cHVibGlzaGVy'
  logoAssets.publisherLogoImageSize = { width: 640, height: 240 }
  logoAssets.publisherLogoLayout = {
    ...logoAssets.publisherLogoLayout,
    enabled: true,
  }
  const omittedWorkflow = omitDiscGuidedSlot(
    createWorkflow(),
    PUBLISHER_ID,
  ).state
  const restored = await restoreProjectStateFromContents(
    JSON.stringify(createSnapshot(omittedWorkflow, logoAssets)),
  )
  const slotState = createSlotState(restored)

  assert.equal(restored.projectLogoAssets.publisherLogoLayout.enabled, true)
  assert.equal(
    restored.projectLogoAssets.publisherLogoDataUrl,
    logoAssets.publisherLogoDataUrl,
  )
  assert.equal(
    resolveDiscGuidedSlot({
      slotId: PUBLISHER_ID,
      state: slotState,
      suggestions: [],
      omittedSlotIds: getDiscGuidedOmittedSlotIdSet(
        restored.discGuidedWorkflow,
      ),
    }).lifecycle,
    'omitted',
  )

  const visibleWorkflow = restoreDiscGuidedSlot(
    restored.discGuidedWorkflow,
    PUBLISHER_ID,
  ).state
  assert.equal(
    resolveDiscGuidedSlot({
      slotId: PUBLISHER_ID,
      state: slotState,
      suggestions: [],
      omittedSlotIds: getDiscGuidedOmittedSlotIdSet(visibleWorkflow),
    }).lifecycle,
    'filled',
  )
})

test('malformed, unknown, and future guided metadata deactivates safely', async () => {
  const malformedValues = [
    undefined,
    'invalid-editor',
    { guidedLayout: null },
    { guidedLayout: { id: 'unknown', version: 1, omittedSlotIds: [] } },
    { guidedLayout: { id: CLASSIC_ID, version: 99, omittedSlotIds: [] } },
  ]

  for (const editor of malformedValues) {
    assert.deepEqual(
      restoreSavedDiscGuidedWorkflow(editor),
      INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    )
  }

  const project = createSnapshot()
  const restored = await restoreProjectStateFromContents(JSON.stringify({
    ...project,
    editor: 'malformed-editor',
  }))
  assert.deepEqual(
    restored.discGuidedWorkflow,
    INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  )
  assert.equal(restored.manualGameTitle, project.game.manualTitle)
})

test('saved omission IDs are filtered, deduplicated, and canonically ordered', () => {
  const restored = restoreSavedDiscGuidedWorkflow({
    guidedLayout: {
      id: CLASSIC_ID,
      version: 1,
      omittedSlotIds: [
        PUBLISHER_ID,
        'disc:guided:additional-text:custom-note',
        RATING_ID,
        PUBLISHER_ID,
        'disc:guided:unknown',
      ],
    },
  })

  assert.deepEqual(restored.omittedSlotIds, [RATING_ID, PUBLISHER_ID])
})

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`

    if (entry.isDirectory()) return listTypeScriptFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

test('guided workflow persistence stays isolated from renderers and export inputs', () => {
  const guardedFiles = [
    'src/app/appPngExportInputs.ts',
    ...listTypeScriptFiles('src/export'),
    ...listTypeScriptFiles('src/render'),
  ]

  for (const file of guardedFiles) {
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /guidedLayout|discGuidedWorkflow|omittedSlotIds/)
  }

  for (const file of listTypeScriptFiles('src/components/preview')) {
    if (/\.test\.[cm]?tsx?$/.test(file)) continue
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(
      source,
      /projectGuidedWorkflow|projectSchema|createProjectSnapshot|restoreProject/,
    )
  }
})

test('App keeps guided persistence wiring to state pass-through and reset', () => {
  const source = readFileSync('src/app/App.tsx', 'utf8')

  assert.match(source, /discGuidedWorkflow,/)
  assert.match(source, /restoreDiscGuidedWorkflow: setDiscGuidedWorkflow/)
  assert.match(
    source,
    /setDiscGuidedWorkflow\(INITIAL_DISC_GUIDED_WORKFLOW_STATE\)/,
  )
  assert.doesNotMatch(
    source,
    /omitDiscGuidedSlot|restoreDiscGuidedSlot|normalizeDiscGuidedWorkflowState/,
  )
})
