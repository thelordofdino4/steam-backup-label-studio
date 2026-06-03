import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  type SupportedCaseInsertTemplateType,
} from '../editor/editorTypes.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import {
  getCaseInsertTemplate,
  jewelCaseInsertTemplate,
  type JewelCaseGuideId,
  type JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates.ts'
import type { RectangularPrintTemplate } from '../types/template.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
  normalizeProjectImageAssetProvenance,
} from './projectAssetStatus.ts'
import { normalizeProjectMetadata } from './projectMetadata.ts'
import type {
  BackgroundImageSize,
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextSource,
  ProjectImageAssetProvenance,
  ProjectJewelCaseBackState,
  ProjectJewelCaseExportSettings,
  ProjectJewelCaseFrontState,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
  ProjectJewelCaseState,
  ProjectMetadata,
  SavedCaseInsertProject,
} from './projectTypes.ts'

type JsonRecord = Record<string, unknown>

export type CreateCaseInsertProjectSnapshotParams = {
  manualGameTitle?: string
  selectedSteamGame?: SteamImportedGame | null
  projectMetadata?: Partial<ProjectMetadata>
  caseInsert?: Partial<ProjectJewelCaseState>
  savedAt?: string
}

export type RestoredCaseInsertTemplateState = {
  selectedCaseInsertTemplateId: SupportedCaseInsertTemplateType
  selectedCaseInsertTemplate: RectangularPrintTemplate
}

export type RestoredCaseInsertProjectState = {
  manualGameTitle: string
  projectMetadata: ProjectMetadata
  selectedSteamGame: SteamImportedGame | null
  template: RestoredCaseInsertTemplateState
  caseInsert: ProjectJewelCaseState
}

export const DEFAULT_CASE_INSERT_PROJECT_TITLE = 'Untitled Jewel Case Insert'

const DEFAULT_CASE_INSERT_SURFACES: JewelCaseSurfaceId[] = ['front', 'back']
const JEWEL_CASE_GUIDE_IDS = jewelCaseInsertTemplate.guides.map(
  ({ id }) => id as JewelCaseGuideId,
)
const DEFAULT_JEWEL_CASE_GUIDE_IDS = jewelCaseInsertTemplate.guides
  .filter(({ visibleByDefault }) => visibleByDefault)
  .map(({ id }) => id as JewelCaseGuideId)

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function normalizeNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback
}

function normalizeCaseInsertTemplateType(
  value: unknown,
): SupportedCaseInsertTemplateType {
  return value === DEFAULT_CASE_INSERT_TEMPLATE_TYPE
    ? DEFAULT_CASE_INSERT_TEMPLATE_TYPE
    : DEFAULT_CASE_INSERT_TEMPLATE_TYPE
}

function normalizeCaseInsertImageFit(
  value: unknown,
  fallback: ProjectCaseInsertImageFit,
): ProjectCaseInsertImageFit {
  return value === 'cover' || value === 'contain' ? value : fallback
}

function normalizeCaseInsertTextSource(
  value: unknown,
  fallback: ProjectCaseInsertTextSource,
): ProjectCaseInsertTextSource {
  return value === 'manual' || value === 'metadata' || value === 'steam'
    ? value
    : fallback
}

function normalizeCaseInsertTextAlign(
  value: unknown,
  fallback: ProjectCaseInsertTextAlign,
): ProjectCaseInsertTextAlign {
  return value === 'left' || value === 'center' || value === 'right'
    ? value
    : fallback
}

function normalizeImageSize(value: unknown): BackgroundImageSize | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const width = normalizePositiveNumber(record.width, 0)
  const height = normalizePositiveNumber(record.height, 0)

  return width > 0 && height > 0 ? { width, height } : null
}

function createDefaultCaseInsertLayout(
  layout: Partial<ProjectCaseInsertLayout> = {},
): ProjectCaseInsertLayout {
  return {
    scale: layout.scale ?? 1,
    x: layout.x ?? 0,
    y: layout.y ?? 0,
    rotation: layout.rotation ?? 0,
  }
}

function normalizeCaseInsertLayout(
  value: unknown,
  defaults: ProjectCaseInsertLayout,
): ProjectCaseInsertLayout {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    scale: normalizePositiveNumber(record.scale, defaults.scale),
    x: normalizeFiniteNumber(record.x, defaults.x),
    y: normalizeFiniteNumber(record.y, defaults.y),
    rotation: normalizeFiniteNumber(record.rotation, defaults.rotation),
  }
}

export function createDefaultCaseInsertImageSlot(
  id: string,
  label: string,
  options: {
    enabled?: boolean
    fit?: ProjectCaseInsertImageFit
    layout?: Partial<ProjectCaseInsertLayout>
  } = {},
): ProjectCaseInsertImageSlot {
  return {
    id,
    label,
    enabled: options.enabled ?? false,
    imageDataUrl: null,
    imageSource: null,
    imageSize: null,
    fit: options.fit ?? 'contain',
    layout: createDefaultCaseInsertLayout(options.layout),
  }
}

function normalizeCaseInsertImageSlot(
  value: unknown,
  defaults: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  const imageDataUrl = normalizeNullableString(record.imageDataUrl)
  const rawImageSource = asRecord(record.imageSource)
  const fallbackImageSource = imageDataUrl
    ? createEmbeddedProjectImageAssetProvenance(defaults.label)
    : defaults.imageSource ?? null

  return {
    id: normalizeString(record.id, defaults.id),
    label: normalizeString(record.label, defaults.label),
    enabled: normalizeBoolean(record.enabled, defaults.enabled),
    imageDataUrl,
    imageSource: normalizeProjectImageAssetProvenance(
      rawImageSource as Partial<ProjectImageAssetProvenance> | null,
      fallbackImageSource,
    ),
    imageSize: normalizeImageSize(record.imageSize) ?? defaults.imageSize,
    fit: normalizeCaseInsertImageFit(record.fit, defaults.fit),
    layout: normalizeCaseInsertLayout(record.layout, defaults.layout),
  }
}

function normalizeCaseInsertImageSlotArray(
  value: unknown,
  idPrefix: string,
  labelPrefix: string,
) {
  return (asArray(value) ?? []).map((slot, index) =>
    normalizeCaseInsertImageSlot(
      slot,
      createDefaultCaseInsertImageSlot(
        `${idPrefix}-${index + 1}`,
        `${labelPrefix} ${index + 1}`,
      ),
    ),
  )
}

export function createDefaultCaseInsertTextBlock(
  id: string,
  label: string,
  options: {
    enabled?: boolean
    value?: string
    source?: ProjectCaseInsertTextSource
    align?: ProjectCaseInsertTextAlign
    layout?: Partial<ProjectCaseInsertLayout>
  } = {},
): ProjectCaseInsertTextBlock {
  return {
    id,
    label,
    enabled: options.enabled ?? false,
    value: options.value ?? '',
    source: options.source ?? 'manual',
    align: options.align ?? 'left',
    layout: createDefaultCaseInsertLayout(options.layout),
  }
}

function normalizeCaseInsertTextBlock(
  value: unknown,
  defaults: ProjectCaseInsertTextBlock,
): ProjectCaseInsertTextBlock {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    id: normalizeString(record.id, defaults.id),
    label: normalizeString(record.label, defaults.label),
    enabled: normalizeBoolean(record.enabled, defaults.enabled),
    value: normalizeString(record.value ?? record.text, defaults.value),
    source: normalizeCaseInsertTextSource(record.source, defaults.source),
    align: normalizeCaseInsertTextAlign(record.align, defaults.align),
    layout: normalizeCaseInsertLayout(record.layout, defaults.layout),
  }
}

function normalizeCaseInsertTextBlockArray(
  value: unknown,
  idPrefix: string,
  labelPrefix: string,
) {
  return (asArray(value) ?? []).map((textBlock, index) =>
    normalizeCaseInsertTextBlock(
      textBlock,
      createDefaultCaseInsertTextBlock(
        `${idPrefix}-${index + 1}`,
        `${labelPrefix} ${index + 1}`,
      ),
    ),
  )
}

function createDefaultCaseInsertSurfaceState(
  surfaceId: JewelCaseSurfaceId,
  label: string,
): ProjectCaseInsertSurfaceState {
  return {
    background: createDefaultCaseInsertImageSlot(
      `${surfaceId}-background`,
      `${label} background`,
      { enabled: true, fit: 'cover' },
    ),
    titleArtwork: createDefaultCaseInsertImageSlot(
      `${surfaceId}-title-artwork`,
      `${label} title artwork`,
    ),
    artworkSlots: [],
    logoSlots: [],
    markSlots: [],
    textBlocks: [],
  }
}

function normalizeCaseInsertSurfaceState(
  value: unknown,
  defaults: ProjectCaseInsertSurfaceState,
  idPrefix: string,
  labelPrefix: string,
): ProjectCaseInsertSurfaceState {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    background: normalizeCaseInsertImageSlot(record.background, defaults.background),
    titleArtwork: normalizeCaseInsertImageSlot(
      record.titleArtwork,
      defaults.titleArtwork,
    ),
    artworkSlots: normalizeCaseInsertImageSlotArray(
      record.artworkSlots ?? record.artwork,
      `${idPrefix}-artwork`,
      `${labelPrefix} artwork`,
    ),
    logoSlots: normalizeCaseInsertImageSlotArray(
      record.logoSlots ?? record.logos,
      `${idPrefix}-logo`,
      `${labelPrefix} logo`,
    ),
    markSlots: normalizeCaseInsertImageSlotArray(
      record.markSlots ?? record.marks,
      `${idPrefix}-mark`,
      `${labelPrefix} mark`,
    ),
    textBlocks: normalizeCaseInsertTextBlockArray(
      record.textBlocks ?? record.text,
      `${idPrefix}-text`,
      `${labelPrefix} text`,
    ),
  }
}

function createDefaultJewelCaseBackState(): ProjectJewelCaseBackState {
  return {
    ...createDefaultCaseInsertSurfaceState('back', 'Back'),
    screenshotSlots: [],
  }
}

function normalizeJewelCaseBackState(value: unknown): ProjectJewelCaseBackState {
  const defaults = createDefaultJewelCaseBackState()
  const record = asRecord(value)
  const surfaceState = normalizeCaseInsertSurfaceState(
    record,
    defaults,
    'back',
    'Back',
  )

  return {
    ...surfaceState,
    screenshotSlots: normalizeCaseInsertImageSlotArray(
      record?.screenshotSlots ?? record?.screenshots,
      'back-screenshot',
      'Back screenshot',
    ),
  }
}

function createDefaultJewelCaseSpineSideState(
  side: 'left' | 'right',
  title: string,
): ProjectJewelCaseSpineSideState {
  const label = side === 'left' ? 'Left spine' : 'Right spine'

  return {
    background: createDefaultCaseInsertImageSlot(
      `${side}-spine-background`,
      `${label} background`,
      { fit: 'cover' },
    ),
    title: createDefaultCaseInsertTextBlock(
      `${side}-spine-title`,
      `${label} title`,
      { align: 'center', value: title },
    ),
    logo: createDefaultCaseInsertImageSlot(`${side}-spine-logo`, `${label} logo`),
  }
}

function normalizeJewelCaseSpineSideState(
  value: unknown,
  defaults: ProjectJewelCaseSpineSideState,
): ProjectJewelCaseSpineSideState {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    background: normalizeCaseInsertImageSlot(record.background, defaults.background),
    title: normalizeCaseInsertTextBlock(record.title ?? record.titleText, defaults.title),
    logo: normalizeCaseInsertImageSlot(record.logo, defaults.logo),
  }
}

function createDefaultJewelCaseSpineState(title: string): ProjectJewelCaseSpineState {
  return {
    left: createDefaultJewelCaseSpineSideState('left', title),
    right: createDefaultJewelCaseSpineSideState('right', title),
  }
}

function normalizeJewelCaseSpineState(
  value: unknown,
  title: string,
): ProjectJewelCaseSpineState {
  const defaults = createDefaultJewelCaseSpineState(title)
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    left: normalizeJewelCaseSpineSideState(record.left, defaults.left),
    right: normalizeJewelCaseSpineSideState(record.right, defaults.right),
  }
}

function isJewelCaseSurfaceId(value: unknown): value is JewelCaseSurfaceId {
  return value === 'front' || value === 'back'
}

function isJewelCaseGuideId(value: unknown): value is JewelCaseGuideId {
  return typeof value === 'string' &&
    JEWEL_CASE_GUIDE_IDS.includes(value as JewelCaseGuideId)
}

function normalizeCaseInsertSurfaceIds(value: unknown): JewelCaseSurfaceId[] {
  const surfaceIds = (asArray(value) ?? []).filter(isJewelCaseSurfaceId)

  return surfaceIds.length > 0
    ? Array.from(new Set(surfaceIds))
    : [...DEFAULT_CASE_INSERT_SURFACES]
}

function normalizeJewelCaseGuideIds(value: unknown): JewelCaseGuideId[] {
  const record = asRecord(value)

  if (record) {
    return JEWEL_CASE_GUIDE_IDS.filter((guideId) => record[guideId] === true)
  }

  const guideIds = asArray(value)

  if (guideIds) {
    return Array.from(new Set(guideIds.filter(isJewelCaseGuideId)))
  }

  return [...DEFAULT_JEWEL_CASE_GUIDE_IDS]
}

function normalizeJewelCaseExportSettings(
  value: unknown,
): ProjectJewelCaseExportSettings {
  const record = asRecord(value)

  if (!record) {
    return {
      surfaces: [...DEFAULT_CASE_INSERT_SURFACES],
      guideIds: [...DEFAULT_JEWEL_CASE_GUIDE_IDS],
    }
  }

  return {
    surfaces: normalizeCaseInsertSurfaceIds(record.surfaces),
    guideIds: normalizeJewelCaseGuideIds(record.guideIds ?? record.guides),
  }
}

export function createDefaultProjectJewelCaseState(
  title = '',
): ProjectJewelCaseState {
  return {
    templateType: DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
    front: createDefaultCaseInsertSurfaceState('front', 'Front'),
    back: createDefaultJewelCaseBackState(),
    spine: createDefaultJewelCaseSpineState(title),
    export: {
      surfaces: [...DEFAULT_CASE_INSERT_SURFACES],
      guideIds: [...DEFAULT_JEWEL_CASE_GUIDE_IDS],
    },
  }
}

export function normalizeProjectJewelCaseState(
  value: unknown,
  title = '',
  templateType: SupportedCaseInsertTemplateType = DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
): ProjectJewelCaseState {
  const defaults = createDefaultProjectJewelCaseState(title)
  const record = asRecord(value)
  const normalizedTemplateType = normalizeCaseInsertTemplateType(
    record?.templateType ?? templateType,
  )

  return {
    templateType: normalizedTemplateType,
    front: normalizeCaseInsertSurfaceState(
      record?.front,
      defaults.front,
      'front',
      'Front',
    ) as ProjectJewelCaseFrontState,
    back: normalizeJewelCaseBackState(record?.back),
    spine: normalizeJewelCaseSpineState(record?.spine, title),
    export: normalizeJewelCaseExportSettings(record?.export),
  }
}

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

  return {
    schemaVersion: '0.1.0',
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
    caseInsert,
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
  const caseInsert = normalizeProjectJewelCaseState(
    caseInsertRecord,
    manualGameTitle,
    templateType,
  )

  return {
    schemaVersion: '0.1.0',
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
    caseInsert,
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
  }
}

export function restoreCaseInsertProjectStateFromContents(
  contents: string,
): RestoredCaseInsertProjectState {
  return restoreCaseInsertProjectState(JSON.parse(contents) as unknown)
}
