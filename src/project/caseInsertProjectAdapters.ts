import {
  getCaseInsertTemplate,
} from '../templates/caseInsertTemplates.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import {
  DEFAULT_CASE_INSERT_PROJECT_TITLE,
} from '../caseInsert/defaults.ts'
import {
  normalizeCaseInsertTemplateType,
  normalizeProjectJewelCaseState,
} from '../caseInsert/normalization.ts'
import {
  asRecord,
  normalizeString,
} from './savedProjectNormalization.ts'
import type {
  CreateCaseInsertProjectSnapshotParams,
  RestoredCaseInsertProjectState,
} from '../caseInsert/types.ts'
import { normalizeProjectMetadata } from './projectMetadata.ts'
import type {
  ProjectMetadata,
  SavedCaseInsertProject,
} from './projectTypes.ts'
import {
  DEFAULT_CASE_INSERT_TEMPLATE_PANE_ID,
  normalizeCaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces.ts'
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  parseSavedProjectContents,
} from './projectSchema.ts'
import {
  createUnattachedCaseInsertLayoutPresetProjectState,
} from './caseInsertPresetProjectPersistence.ts'

export function createCaseInsertProjectSnapshot(
  params: CreateCaseInsertProjectSnapshotParams = {},
): SavedCaseInsertProject {
  const manualGameTitle = normalizeString(
    params.manualGameTitle,
    DEFAULT_CASE_INSERT_PROJECT_TITLE,
  )
  const selectedSteamGame = params.selectedSteamGame ?? null
  const caseInsert = normalizeProjectJewelCaseState(
    params.caseInsert,
    manualGameTitle,
    normalizeCaseInsertTemplateType(params.caseInsert?.templateType),
  )
  const projectMetadata = normalizeProjectMetadata(
    params.projectMetadata,
    manualGameTitle,
    selectedSteamGame?.appId,
  )
  const activeCaseInsertTemplatePane = normalizeCaseInsertTemplatePaneId(
    params.activeCaseInsertTemplatePane,
  )

  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'caseInsert',
    title: manualGameTitle,
    savedAt: params.savedAt ?? new Date().toISOString(),
    game: {
      manualTitle: manualGameTitle,
      selectedSteamGame,
    },
    metadata: projectMetadata,
    template: {
      type: 'caseInsert',
      variant: caseInsert.templateType,
    },
    editor: {
      activeCaseInsertTemplatePane,
    },
    caseInsert,
    caseInsertLayoutPreset:
      createUnattachedCaseInsertLayoutPresetProjectState(),
  }
}

export function createBlankJewelCaseSavedProject(
  title = DEFAULT_CASE_INSERT_PROJECT_TITLE,
): SavedCaseInsertProject {
  return createCaseInsertProjectSnapshot({ manualGameTitle: title })
}

export function normalizeSavedCaseInsertProject(
  project: unknown,
): SavedCaseInsertProject {
  const record = asRecord(project)
  const savedTitle = normalizeString(record?.title, DEFAULT_CASE_INSERT_PROJECT_TITLE)
  const gameRecord = asRecord(record?.game)
  const manualGameTitle = normalizeString(gameRecord?.manualTitle, savedTitle)
  const savedSteamGame = gameRecord?.selectedSteamGame
  const selectedSteamGame = asRecord(savedSteamGame)
    ? savedSteamGame as SteamImportedGame
    : null
  const templateRecord = asRecord(record?.template)
  const caseInsertRecord = asRecord(record?.caseInsert) ?? asRecord(record?.jewelCase)
  const templateType = normalizeCaseInsertTemplateType(
    templateRecord?.variant ?? caseInsertRecord?.templateType ?? templateRecord?.type,
  )
  const metadataRecord = asRecord(record?.metadata)
  const editorRecord = asRecord(record?.editor)
  const activeCaseInsertTemplatePane = normalizeCaseInsertTemplatePaneId(
    editorRecord?.activeCaseInsertTemplatePane,
    DEFAULT_CASE_INSERT_TEMPLATE_PANE_ID,
  )
  const caseInsert = normalizeProjectJewelCaseState(
    caseInsertRecord,
    manualGameTitle,
    templateType,
  )

  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'caseInsert',
    title: savedTitle,
    savedAt: normalizeString(record?.savedAt, new Date().toISOString()),
    game: {
      manualTitle: manualGameTitle,
      selectedSteamGame,
    },
    metadata: normalizeProjectMetadata(
      metadataRecord as Partial<ProjectMetadata> | undefined,
      manualGameTitle,
      selectedSteamGame?.appId,
    ),
    template: {
      type: 'caseInsert',
      variant: caseInsert.templateType,
    },
    editor: {
      activeCaseInsertTemplatePane,
    },
    caseInsert,
    caseInsertLayoutPreset: record?.caseInsertLayoutPreset as
      SavedCaseInsertProject['caseInsertLayoutPreset'] ??
        createUnattachedCaseInsertLayoutPresetProjectState(),
  }
}

export function restoreCaseInsertProjectState(
  project: unknown,
): RestoredCaseInsertProjectState {
  const savedProject = normalizeSavedCaseInsertProject(project)

  return {
    manualGameTitle: savedProject.game.manualTitle,
    projectMetadata: savedProject.metadata ?? normalizeProjectMetadata(
      undefined,
      savedProject.game.manualTitle,
      savedProject.game.selectedSteamGame?.appId,
    ),
    selectedSteamGame: savedProject.game.selectedSteamGame,
    template: {
      selectedCaseInsertTemplateId: savedProject.caseInsert.templateType,
      selectedCaseInsertTemplate: getCaseInsertTemplate(
        savedProject.caseInsert.templateType,
      ),
    },
    caseInsert: savedProject.caseInsert,
    activeCaseInsertTemplatePane:
      savedProject.editor?.activeCaseInsertTemplatePane ??
      DEFAULT_CASE_INSERT_TEMPLATE_PANE_ID,
  }
}

export function restoreCaseInsertProjectStateFromContents(
  contents: string,
): RestoredCaseInsertProjectState {
  return restoreCaseInsertProjectState(parseSavedProjectContents(contents))
}
