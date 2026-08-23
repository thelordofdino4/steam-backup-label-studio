import {
  CASE_INSERT_PRESET_DEFINITION_KIND,
  CASE_INSERT_PRESET_FORMAT_VERSION_V2,
  parseCaseInsertPresetDefinitionV2,
  type CaseInsertPresetDefinitionV2,
} from '../caseInsertPresetDefinition.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
} from './jewelCaseEssentialsCasePreset.ts'

export const JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION_V2 = 2 as const

const JEWEL_CASE_ESSENTIALS_CASE_PRESET_SOURCE_V2 = {
  kind: CASE_INSERT_PRESET_DEFINITION_KIND,
  formatVersion: CASE_INSERT_PRESET_FORMAT_VERSION_V2,
  id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
  revision: JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION_V2,
  name: 'Jewel Case Essentials',
  description:
    'A coordinated Jewel Case layout for primary artwork, descriptive copy, system requirements, screenshots, legal text, and spine titles.',
  surface: 'case-insert',
  compatibility: {
    mode: 'specific-template',
    templateId: 'jewelCase',
  },
  applicationScopes: [
    { kind: 'region', region: 'front-cover' },
    { kind: 'region', region: 'tray-card' },
    { kind: 'region', region: 'back-panel' },
    { kind: 'region', region: 'left-spine' },
    { kind: 'region', region: 'right-spine' },
    { kind: 'section', section: 'front' },
    { kind: 'section', section: 'back' },
    { kind: 'section', section: 'spine' },
    { kind: 'complete' },
  ],
  slots: [
    {
      id: 'case:preset-slot:front-background',
      roleId: 'background-artwork',
      assignments: [{
        id: 'case:preset-assignment:front-background',
        region: 'front-cover',
        coordinateBasis: 'front',
        ownerId: 'case.cover.background',
        object: { kind: 'fixed', id: 'case:cover:background' },
        targetPresence: 'required',
        contentRegion: {
          centerXPercent: 50,
          centerYPercent: 50,
          widthPercent: 100,
          heightPercent: 100,
        },
      }],
    },
    {
      id: 'case:preset-slot:front-title-artwork',
      roleId: 'game-title',
      assignments: [{
        id: 'case:preset-assignment:front-title-artwork',
        region: 'front-cover',
        coordinateBasis: 'frontSafe',
        ownerId: 'case.cover.title-artwork',
        object: { kind: 'fixed', id: 'case:cover:title-artwork' },
        targetPresence: 'required',
        contentRegion: {
          centerXPercent: 50,
          centerYPercent: 18,
          widthPercent: 70,
          heightPercent: 24,
        },
      }],
    },
    {
      id: 'case:preset-slot:tray-background',
      roleId: 'background-artwork',
      assignments: [{
        id: 'case:preset-assignment:tray-background',
        region: 'tray-card',
        coordinateBasis: 'back',
        ownerId: 'case.tray.background',
        object: { kind: 'fixed', id: 'case:tray:background' },
        targetPresence: 'required',
        contentRegion: {
          centerXPercent: 50,
          centerYPercent: 50,
          widthPercent: 100,
          heightPercent: 100,
        },
      }],
    },
    {
      id: 'case:preset-slot:back-description',
      roleId: 'game-description-text',
      assignments: [{
        id: 'case:preset-assignment:back-description',
        region: 'back-panel',
        coordinateBasis: 'backPanelSafe',
        ownerId: 'case.tray.text-blocks',
        object: { kind: 'fixed', id: 'case:tray:text:description' },
        targetPresence: 'required',
        contentRegion: {
          centerXPercent: 30,
          centerYPercent: 18,
          widthPercent: 50,
          heightPercent: 24,
        },
      }],
    },
    {
      id: 'case:preset-slot:back-feature-bullets',
      roleId: 'feature-bullets-callouts',
      assignments: [{
        id: 'case:preset-assignment:back-feature-bullets',
        region: 'back-panel',
        coordinateBasis: 'backPanelSafe',
        ownerId: 'case.tray.text-lists',
        object: { kind: 'fixed', id: 'case:tray:text-list:feature-bullets' },
        targetPresence: 'required',
        contentRegion: {
          centerXPercent: 78,
          centerYPercent: 18,
          widthPercent: 34,
          heightPercent: 24,
        },
      }],
    },
    {
      id: 'case:preset-slot:back-system-requirements',
      roleId: 'system-requirements',
      assignments: [
        {
          id: 'case:preset-assignment:back-minimum-requirements',
          region: 'back-panel',
          coordinateBasis: 'backPanelSafe',
          ownerId: 'case.tray.text-blocks',
          object: {
            kind: 'fixed',
            id: 'case:tray:text:minimum-requirements',
          },
          targetPresence: 'required',
          contentRegion: {
            centerXPercent: 27,
            centerYPercent: 52,
            widthPercent: 44,
            heightPercent: 28,
          },
        },
        {
          id: 'case:preset-assignment:back-recommended-requirements',
          region: 'back-panel',
          coordinateBasis: 'backPanelSafe',
          ownerId: 'case.tray.text-blocks',
          object: {
            kind: 'fixed',
            id: 'case:tray:text:recommended-requirements',
          },
          targetPresence: 'required',
          contentRegion: {
            centerXPercent: 73,
            centerYPercent: 52,
            widthPercent: 44,
            heightPercent: 28,
          },
        },
      ],
    },
    {
      id: 'case:preset-slot:back-screenshots',
      roleId: 'screenshots',
      assignments: [
        {
          id: 'case:preset-assignment:back-screenshot-one',
          region: 'back-panel',
          coordinateBasis: 'backPanelSafe',
          ownerId: 'case.tray.artwork-slots',
          object: { kind: 'repeated', id: 'tray-artwork-1' },
          targetPresence: 'optional',
          missingTargetPolicy: 'create-empty',
          contentRegion: {
            centerXPercent: 17,
            centerYPercent: 78,
            widthPercent: 26,
            heightPercent: 16,
          },
          actionRegion: {
            centerXPercent: 17,
            centerYPercent: 78,
            widthPercent: 26,
            heightPercent: 16,
          },
          artworkViewport: {
            fitting: { mode: 'cover' },
            focalPosition: { xPercent: 50, yPercent: 50 },
            zoom: 1,
          },
        },
        {
          id: 'case:preset-assignment:back-screenshot-two',
          region: 'back-panel',
          coordinateBasis: 'backPanelSafe',
          ownerId: 'case.tray.artwork-slots',
          object: { kind: 'repeated', id: 'tray-artwork-2' },
          targetPresence: 'optional',
          missingTargetPolicy: 'create-empty',
          contentRegion: {
            centerXPercent: 50,
            centerYPercent: 78,
            widthPercent: 26,
            heightPercent: 16,
          },
          actionRegion: {
            centerXPercent: 50,
            centerYPercent: 78,
            widthPercent: 26,
            heightPercent: 16,
          },
          artworkViewport: {
            fitting: { mode: 'cover' },
            focalPosition: { xPercent: 50, yPercent: 50 },
            zoom: 1,
          },
        },
        {
          id: 'case:preset-assignment:back-screenshot-three',
          region: 'back-panel',
          coordinateBasis: 'backPanelSafe',
          ownerId: 'case.tray.artwork-slots',
          object: { kind: 'repeated', id: 'tray-artwork-3' },
          targetPresence: 'optional',
          missingTargetPolicy: 'create-empty',
          contentRegion: {
            centerXPercent: 83,
            centerYPercent: 78,
            widthPercent: 26,
            heightPercent: 16,
          },
          actionRegion: {
            centerXPercent: 83,
            centerYPercent: 78,
            widthPercent: 26,
            heightPercent: 16,
          },
          artworkViewport: {
            fitting: { mode: 'cover' },
            focalPosition: { xPercent: 50, yPercent: 50 },
            zoom: 1,
          },
        },
      ],
    },
    {
      id: 'case:preset-slot:back-legal',
      roleId: 'legal-info',
      assignments: [{
        id: 'case:preset-assignment:back-legal',
        region: 'back-panel',
        coordinateBasis: 'backPanelSafe',
        ownerId: 'case.tray.text-blocks',
        object: { kind: 'fixed', id: 'case:tray:text:copyright' },
        targetPresence: 'required',
        contentRegion: {
          centerXPercent: 50,
          centerYPercent: 94,
          widthPercent: 90,
          heightPercent: 8,
        },
      }],
    },
    {
      id: 'case:preset-slot:spine-backgrounds',
      roleId: 'spine-background-artwork',
      assignments: [
        {
          id: 'case:preset-assignment:left-spine-background',
          region: 'left-spine',
          coordinateBasis: 'leftSpine',
          ownerId: 'case.spine.left.background',
          object: { kind: 'fixed', id: 'case:spine:left:background' },
          targetPresence: 'required',
          contentRegion: {
            centerXPercent: 50,
            centerYPercent: 50,
            widthPercent: 100,
            heightPercent: 100,
          },
        },
        {
          id: 'case:preset-assignment:right-spine-background',
          region: 'right-spine',
          coordinateBasis: 'rightSpine',
          ownerId: 'case.spine.right.background',
          object: { kind: 'fixed', id: 'case:spine:right:background' },
          targetPresence: 'required',
          contentRegion: {
            centerXPercent: 50,
            centerYPercent: 50,
            widthPercent: 100,
            heightPercent: 100,
          },
        },
      ],
    },
    {
      id: 'case:preset-slot:spine-title-text',
      roleId: 'vertical-game-logo-title',
      assignments: [
        {
          id: 'case:preset-assignment:left-spine-title-text',
          region: 'left-spine',
          coordinateBasis: 'leftSpineSafe',
          ownerId: 'case.spine.left.title-text',
          object: { kind: 'fixed', id: 'case:spine:left:text:title' },
          targetPresence: 'required',
          contentRegion: {
            centerXPercent: 50,
            centerYPercent: 50,
            widthPercent: 82,
            heightPercent: 70,
          },
        },
        {
          id: 'case:preset-assignment:right-spine-title-text',
          region: 'right-spine',
          coordinateBasis: 'rightSpineSafe',
          ownerId: 'case.spine.right.title-text',
          object: { kind: 'fixed', id: 'case:spine:right:text:title' },
          targetPresence: 'required',
          contentRegion: {
            centerXPercent: 50,
            centerYPercent: 50,
            widthPercent: 82,
            heightPercent: 70,
          },
        },
      ],
    },
  ],
} as const

const parsedJewelCaseEssentialsV2 = parseCaseInsertPresetDefinitionV2(
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_SOURCE_V2,
)

if (!parsedJewelCaseEssentialsV2.ok ||
    parsedJewelCaseEssentialsV2.value.formatVersion !==
      CASE_INSERT_PRESET_FORMAT_VERSION_V2) {
  throw new Error(
    `Invalid built-in Jewel Case Essentials revision 2 at ${
      parsedJewelCaseEssentialsV2.ok
        ? 'formatVersion'
        : parsedJewelCaseEssentialsV2.error.path
    }.`,
  )
}

export const JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2:
  CaseInsertPresetDefinitionV2 = parsedJewelCaseEssentialsV2.value
