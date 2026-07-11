import type {
  DiscTextHtmlSources,
  DiscTextKey,
  DiscTextLayout,
  DiscTextLayoutSettings,
  DiscTextSettings,
  DiscTextValues,
} from '../discText/types'
import type { DiscTextStyleSettings } from '../discText/styles'
import type { DiscTextValueSources } from '../project/metadataDiscTextTypes'
import { shouldRenderRatingBadge } from '../project/projectRatingBadge.ts'
import {
  isOptionalLayoutFeatureEnabled,
  isOptionalVisualFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import { getProjectPlatformMarkAsset } from '../project/projectPlatformMarks.ts'
import {
  placeGroupedPlatformMarks,
  type DiscNormalizedRegion,
} from './groupedPlatformMarkPlacement.ts'
import type {
  BackgroundImageSize,
  BackgroundOffset,
  ProjectAdditionalArtwork,
  ProjectImageAssetProvenance,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template.ts'

export const DISC_ROLE_PRESET_IDS = [
  'classic-top-title',
  'centered-logo-archive',
  'clean-metadata-footer',
] as const

export type DiscRolePresetId = (typeof DISC_ROLE_PRESET_IDS)[number]

export type DiscRolePresetSurface = 'disc'

export type DiscRolePresetRole =
  | 'background-artwork'
  | 'game-title'
  | 'game-info-logos'
  | 'company-logos'
  | 'legal-info'
  | 'additional-artwork'
  | 'additional-text'

export type DiscRolePresetFeatureOwner =
  | 'backgroundImage'
  | 'titleArtwork'
  | 'discText'
  | 'ratingBadge'
  | 'mediaMark'
  | 'platformMarks'
  | 'technicalMarks'
  | 'logoAssets'
  | 'additionalArtwork'

export type DiscRolePresetSlot =
  | 'background'
  | 'titleArtwork'
  | 'titleTextFallback'
  | 'ratingBadge'
  | 'mediaMark'
  | 'selectedPlatformMarks'
  | 'selectedTechnicalMarks'
  | 'developerLogo'
  | 'publisherLogo'
  | 'copyrightText'
  | 'appIdText'
  | 'backupDateText'
  | 'developerText'
  | 'publisherText'
  | 'installNotesText'
  | 'customNoteText'
  | 'existingAdditionalArtwork'

export type DiscRolePresetAllowedField =
  | 'enabled'
  | 'scale'
  | 'offset.x'
  | 'offset.y'
  | 'layout.enabled'
  | 'layout.x'
  | 'layout.y'
  | 'layout.scale'
  | 'textSetting.enabled'
  | 'textLayout.x'
  | 'textLayout.y'
  | 'textLayout.width'
  | 'textLayout.scale'
  | 'textLayout.fontSizePt'
  | 'textLayout.align'
  | 'textLayout.mode'
  | 'textLayout.arcDegrees'
  | 'textLayout.arcSide'

export type DiscRolePresetFieldValue = boolean | number | string

export type DiscRolePresetFieldUpdate = {
  field: DiscRolePresetAllowedField
  value: DiscRolePresetFieldValue
}

export type DiscRolePresetEnablementBehavior =
  | 'enable-intended-slot'
  | 'enable-if-renderable'
  | 'leave-unchanged'

export type DiscRolePresetCondition =
  | 'always'
  | 'when-enabled'
  | 'when-existing-owner-is-renderable'
  | 'when-title-artwork-is-not-renderable'
  | 'for-existing-configured-values'
  | 'for-existing-repeatable-objects'

export type DiscRolePresetUpdate = {
  role: DiscRolePresetRole
  slot: DiscRolePresetSlot
  condition: DiscRolePresetCondition
  enablement: DiscRolePresetEnablementBehavior
  fields: readonly DiscRolePresetFieldUpdate[]
  placement?: {
    kind: 'grouped-platform-marks'
    region: DiscNormalizedRegion
  }
  notes?: readonly string[]
}

export type DiscRolePresetOwnerUpdatePlan = {
  owner: DiscRolePresetFeatureOwner
  updates: readonly DiscRolePresetUpdate[]
}

export type DiscRolePreset = {
  id: DiscRolePresetId
  label: string
  description: string
  targetSurface: DiscRolePresetSurface
  affectedRoles: readonly DiscRolePresetRole[]
  intentionallyUntouchedRoles: readonly DiscRolePresetRole[]
  enablementBehavior: string
  updatePlan: readonly DiscRolePresetOwnerUpdatePlan[]
  notes?: readonly string[]
  warnings?: readonly string[]
}

export type DiscRolePresetBackgroundState = {
  enabled: boolean
  scale: number
  offset: BackgroundOffset
  imageDataUrl: string | null
  imageSource?: ProjectImageAssetProvenance | null
  imageSize?: BackgroundImageSize | null
  note?: string
}

export type DiscRolePresetApplicationState = {
  background: DiscRolePresetBackgroundState
  titleArtwork: ProjectTitleArtwork
  discTextSettings: DiscTextSettings
  discTextLayout: DiscTextLayoutSettings
  logoAssets: ProjectLogoAssets
  ratingBadge: ProjectRatingBadge
  mediaMark: ProjectMediaMark
  platformMarks: ProjectPlatformMarks
  technicalMarks: ProjectTechnicalMarks
  additionalArtwork: ProjectAdditionalArtwork
  metadata?: ProjectMetadata
  discTextValues?: DiscTextValues
  discTextValueSources?: DiscTextValueSources
  discTextTitleValue?: string
  discTextHtmlSources?: DiscTextHtmlSources
  discTextStyles?: DiscTextStyleSettings
}

export type DiscRolePresetApplicationResult = {
  applied: boolean
  preset: DiscRolePreset | null
  state: DiscRolePresetApplicationState
}

export const DISC_ROLE_PRESETS = [
  {
    id: 'classic-top-title',
    label: 'Classic Top Title',
    description:
      'Places the game title high, keeps company and game-info marks low, and moves legal text toward the bottom edge.',
    targetSurface: 'disc',
    affectedRoles: [
      'background-artwork',
      'game-title',
      'game-info-logos',
      'company-logos',
      'legal-info',
    ],
    intentionallyUntouchedRoles: ['additional-artwork', 'additional-text'],
    enablementBehavior:
      'Place existing content without enabling optional roles or changing sources, selected values, text content, or user-created repeatable objects.',
    updatePlan: [
      {
        owner: 'backgroundImage',
        updates: [
          {
            role: 'background-artwork',
            slot: 'background',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'enabled', value: true },
              { field: 'scale', value: 1 },
              { field: 'offset.x', value: 0 },
              { field: 'offset.y', value: 0 },
            ],
          },
        ],
      },
      {
        owner: 'titleArtwork',
        updates: [
          {
            role: 'game-title',
            slot: 'titleArtwork',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 50 },
              { field: 'layout.y', value: 19.5 },
              { field: 'layout.scale', value: 1 },
            ],
          },
        ],
      },
      {
        owner: 'discText',
        updates: [
          {
            role: 'game-title',
            slot: 'titleTextFallback',
            condition: 'when-title-artwork-is-not-renderable',
            enablement: 'enable-intended-slot',
            fields: [
              { field: 'textSetting.enabled', value: true },
              { field: 'textLayout.x', value: 0 },
              { field: 'textLayout.y', value: 19.5 },
              { field: 'textLayout.width', value: 62 },
              { field: 'textLayout.scale', value: 1.05 },
              { field: 'textLayout.align', value: 'center' },
              { field: 'textLayout.mode', value: 'straight' },
            ],
          },
          {
            role: 'legal-info',
            slot: 'copyrightText',
            condition: 'when-enabled',
            enablement: 'enable-intended-slot',
            fields: [
              { field: 'textLayout.x', value: 0 },
              { field: 'textLayout.y', value: 89 },
              { field: 'textLayout.width', value: 64 },
              { field: 'textLayout.scale', value: 0.84 },
              { field: 'textLayout.align', value: 'center' },
              { field: 'textLayout.mode', value: 'straight' },
            ],
          },
        ],
      },
      {
        owner: 'ratingBadge',
        updates: [
          {
            role: 'game-info-logos',
            slot: 'ratingBadge',
            condition: 'when-existing-owner-is-renderable',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.x', value: 79 },
              { field: 'layout.y', value: 62 },
              { field: 'layout.scale', value: 0.75 },
            ],
          },
        ],
      },
      {
        owner: 'mediaMark',
        updates: [
          {
            role: 'game-info-logos',
            slot: 'mediaMark',
            condition: 'when-existing-owner-is-renderable',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.x', value: 80 },
              { field: 'layout.y', value: 76 },
              { field: 'layout.scale', value: 0.7 },
            ],
          },
        ],
      },
      {
        owner: 'platformMarks',
        updates: [
          {
            role: 'game-info-logos',
            slot: 'selectedPlatformMarks',
            condition: 'for-existing-configured-values',
            enablement: 'leave-unchanged',
            fields: [],
            placement: {
              kind: 'grouped-platform-marks',
              region: {
                centerXPercent: 50,
                centerYPercent: 73,
                widthPercent: 28,
                heightPercent: 10,
              },
            },
          },
        ],
      },
      {
        owner: 'logoAssets',
        updates: [
          {
            role: 'company-logos',
            slot: 'developerLogo',
            condition: 'when-existing-owner-is-renderable',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.x', value: 21 },
              { field: 'layout.y', value: 62 },
              { field: 'layout.scale', value: 0.7 },
            ],
          },
          {
            role: 'company-logos',
            slot: 'publisherLogo',
            condition: 'when-existing-owner-is-renderable',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.x', value: 21 },
              { field: 'layout.y', value: 74 },
              { field: 'layout.scale', value: 0.7 },
            ],
          },
        ],
      },
    ],
    notes: [
      'Additional artwork is deliberately untouched so the MVP does not create, delete, or rearrange user-created artwork elements.',
      'Selected enabled operating-system marks use deterministic grouped placement without changing selection or enablement.',
    ],
  },
  {
    id: 'centered-logo-archive',
    label: 'Centered Logo Archive',
    description:
      'Centers the game title artwork, keeps supporting marks compact, and favors archival text near the lower edge.',
    targetSurface: 'disc',
    affectedRoles: [
      'background-artwork',
      'game-title',
      'game-info-logos',
      'company-logos',
      'legal-info',
      'additional-text',
    ],
    intentionallyUntouchedRoles: ['additional-artwork'],
    enablementBehavior:
      'Enable the centered title treatment and compact supporting slots while preserving all existing content and sources.',
    updatePlan: [
      {
        owner: 'backgroundImage',
        updates: [
          {
            role: 'background-artwork',
            slot: 'background',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'enabled', value: true },
              { field: 'scale', value: 1 },
              { field: 'offset.x', value: 0 },
              { field: 'offset.y', value: 0 },
            ],
          },
        ],
      },
      {
        owner: 'titleArtwork',
        updates: [
          {
            role: 'game-title',
            slot: 'titleArtwork',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 50 },
              { field: 'layout.y', value: 50 },
              { field: 'layout.scale', value: 1.35 },
            ],
          },
        ],
      },
      {
        owner: 'discText',
        updates: [
          {
            role: 'game-title',
            slot: 'titleTextFallback',
            condition: 'when-title-artwork-is-not-renderable',
            enablement: 'enable-intended-slot',
            fields: [
              { field: 'textSetting.enabled', value: true },
              { field: 'textLayout.x', value: 0 },
              { field: 'textLayout.y', value: 50 },
              { field: 'textLayout.width', value: 58 },
              { field: 'textLayout.scale', value: 1.08 },
              { field: 'textLayout.align', value: 'center' },
              { field: 'textLayout.mode', value: 'straight' },
            ],
          },
          {
            role: 'legal-info',
            slot: 'copyrightText',
            condition: 'always',
            enablement: 'enable-intended-slot',
            fields: [
              { field: 'textSetting.enabled', value: true },
              { field: 'textLayout.x', value: 0 },
              { field: 'textLayout.y', value: 8 },
              { field: 'textLayout.scale', value: 1 },
              { field: 'textLayout.align', value: 'center' },
              { field: 'textLayout.mode', value: 'curved' },
              { field: 'textLayout.arcDegrees', value: 210 },
              { field: 'textLayout.arcSide', value: 'bottom' },
            ],
          },
          {
            role: 'additional-text',
            slot: 'backupDateText',
            condition: 'always',
            enablement: 'enable-intended-slot',
            fields: [
              { field: 'textSetting.enabled', value: true },
              { field: 'textLayout.x', value: 0 },
              { field: 'textLayout.y', value: 74 },
              { field: 'textLayout.width', value: 48 },
              { field: 'textLayout.scale', value: 0.86 },
              { field: 'textLayout.align', value: 'center' },
              { field: 'textLayout.mode', value: 'straight' },
            ],
          },
        ],
      },
      {
        owner: 'ratingBadge',
        updates: [
          {
            role: 'game-info-logos',
            slot: 'ratingBadge',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 78 },
              { field: 'layout.y', value: 74 },
              { field: 'layout.scale', value: 0.75 },
            ],
          },
        ],
      },
      {
        owner: 'mediaMark',
        updates: [
          {
            role: 'game-info-logos',
            slot: 'mediaMark',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 66 },
              { field: 'layout.y', value: 78 },
              { field: 'layout.scale', value: 0.75 },
            ],
          },
        ],
      },
      {
        owner: 'logoAssets',
        updates: [
          {
            role: 'company-logos',
            slot: 'developerLogo',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 24 },
              { field: 'layout.y', value: 76 },
              { field: 'layout.scale', value: 0.72 },
            ],
          },
          {
            role: 'company-logos',
            slot: 'publisherLogo',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 36 },
              { field: 'layout.y', value: 76 },
              { field: 'layout.scale', value: 0.72 },
            ],
          },
        ],
      },
    ],
    notes: [
      'This preset is intentionally conservative with repeatable logos and artwork; integration should only update slots that already exist.',
    ],
  },
  {
    id: 'clean-metadata-footer',
    label: 'Clean Metadata Footer',
    description:
      'Keeps the background dominant and places compact identity, metadata, logos, and legal text into footer-style rows.',
    targetSurface: 'disc',
    affectedRoles: [
      'background-artwork',
      'game-title',
      'game-info-logos',
      'company-logos',
      'legal-info',
      'additional-text',
    ],
    intentionallyUntouchedRoles: ['additional-artwork'],
    enablementBehavior:
      'Enable compact footer roles and keep optional repeatable artwork untouched for manual composition.',
    updatePlan: [
      {
        owner: 'backgroundImage',
        updates: [
          {
            role: 'background-artwork',
            slot: 'background',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'enabled', value: true },
              { field: 'scale', value: 1.05 },
              { field: 'offset.x', value: 0 },
              { field: 'offset.y', value: 0 },
            ],
          },
        ],
      },
      {
        owner: 'titleArtwork',
        updates: [
          {
            role: 'game-title',
            slot: 'titleArtwork',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 50 },
              { field: 'layout.y', value: 24 },
              { field: 'layout.scale', value: 0.84 },
            ],
          },
        ],
      },
      {
        owner: 'discText',
        updates: [
          {
            role: 'game-title',
            slot: 'titleTextFallback',
            condition: 'when-title-artwork-is-not-renderable',
            enablement: 'enable-intended-slot',
            fields: [
              { field: 'textSetting.enabled', value: true },
              { field: 'textLayout.x', value: 0 },
              { field: 'textLayout.y', value: 24 },
              { field: 'textLayout.width', value: 62 },
              { field: 'textLayout.scale', value: 0.92 },
              { field: 'textLayout.align', value: 'center' },
              { field: 'textLayout.mode', value: 'straight' },
            ],
          },
          {
            role: 'additional-text',
            slot: 'developerText',
            condition: 'always',
            enablement: 'enable-intended-slot',
            fields: [
              { field: 'textSetting.enabled', value: true },
              { field: 'textLayout.x', value: -20 },
              { field: 'textLayout.y', value: 68 },
              { field: 'textLayout.width', value: 36 },
              { field: 'textLayout.scale', value: 0.82 },
              { field: 'textLayout.align', value: 'left' },
              { field: 'textLayout.mode', value: 'straight' },
            ],
          },
          {
            role: 'additional-text',
            slot: 'publisherText',
            condition: 'always',
            enablement: 'enable-intended-slot',
            fields: [
              { field: 'textSetting.enabled', value: true },
              { field: 'textLayout.x', value: 20 },
              { field: 'textLayout.y', value: 68 },
              { field: 'textLayout.width', value: 36 },
              { field: 'textLayout.scale', value: 0.82 },
              { field: 'textLayout.align', value: 'right' },
              { field: 'textLayout.mode', value: 'straight' },
            ],
          },
          {
            role: 'legal-info',
            slot: 'copyrightText',
            condition: 'always',
            enablement: 'enable-intended-slot',
            fields: [
              { field: 'textSetting.enabled', value: true },
              { field: 'textLayout.x', value: 0 },
              { field: 'textLayout.y', value: 86 },
              { field: 'textLayout.width', value: 74 },
              { field: 'textLayout.scale', value: 0.84 },
              { field: 'textLayout.align', value: 'center' },
              { field: 'textLayout.mode', value: 'straight' },
            ],
          },
        ],
      },
      {
        owner: 'platformMarks',
        updates: [
          {
            role: 'game-info-logos',
            slot: 'selectedPlatformMarks',
            condition: 'for-existing-configured-values',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 50 },
              { field: 'layout.y', value: 74 },
              { field: 'layout.scale', value: 0.7 },
            ],
          },
        ],
      },
      {
        owner: 'technicalMarks',
        updates: [
          {
            role: 'game-info-logos',
            slot: 'selectedTechnicalMarks',
            condition: 'for-existing-configured-values',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 62 },
              { field: 'layout.y', value: 74 },
              { field: 'layout.scale', value: 0.7 },
            ],
          },
        ],
      },
      {
        owner: 'logoAssets',
        updates: [
          {
            role: 'company-logos',
            slot: 'developerLogo',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 24 },
              { field: 'layout.y', value: 78 },
              { field: 'layout.scale', value: 0.68 },
            ],
          },
          {
            role: 'company-logos',
            slot: 'publisherLogo',
            condition: 'always',
            enablement: 'enable-if-renderable',
            fields: [
              { field: 'layout.enabled', value: true },
              { field: 'layout.x', value: 76 },
              { field: 'layout.y', value: 78 },
              { field: 'layout.scale', value: 0.68 },
            ],
          },
        ],
      },
    ],
    warnings: [
      'Footer density depends on the user-selected template, current text length, and enabled marks; manual fine-tuning remains expected.',
    ],
  },
] as const satisfies readonly DiscRolePreset[]

export function getDiscRolePreset(
  presetId: string,
): DiscRolePreset | null {
  return (
    DISC_ROLE_PRESETS.find((preset) => preset.id === presetId) ?? null
  )
}

export function getDiscRolePresetUpdatePlan(
  presetId: string,
): readonly DiscRolePresetOwnerUpdatePlan[] {
  return getDiscRolePreset(presetId)?.updatePlan ?? []
}

export function applyDiscRolePresetToState(
  state: DiscRolePresetApplicationState,
  presetId: string,
  selectedDiscTemplate?: DiscTemplate,
): DiscRolePresetApplicationResult {
  const preset = getDiscRolePreset(presetId)

  if (!preset) {
    return {
      applied: false,
      preset: null,
      state,
    }
  }

  const nextState = preset.updatePlan.reduce(
    (nextState, ownerPlan) => applyOwnerUpdatePlan(
      nextState,
      ownerPlan,
      selectedDiscTemplate,
    ),
    state,
  )

  return {
    applied: true,
    preset,
    state: nextState,
  }
}

function applyOwnerUpdatePlan(
  state: DiscRolePresetApplicationState,
  ownerPlan: DiscRolePresetOwnerUpdatePlan,
  selectedDiscTemplate?: DiscTemplate,
): DiscRolePresetApplicationState {
  switch (ownerPlan.owner) {
    case 'backgroundImage':
      return {
        ...state,
        background: ownerPlan.updates.reduce(
          (background, update) =>
            update.slot === 'background'
              ? applyBackgroundUpdate(background, update)
              : background,
          state.background,
        ),
      }
    case 'titleArtwork':
      return {
        ...state,
        titleArtwork: ownerPlan.updates.reduce(
          (titleArtwork, update) =>
            update.slot === 'titleArtwork'
              ? {
                  ...titleArtwork,
                  layout: applyVisualLayoutUpdate(
                    titleArtwork.layout,
                    update,
                    Boolean(titleArtwork.imageDataUrl),
                  ),
                }
              : titleArtwork,
          state.titleArtwork,
        ),
      }
    case 'discText':
      return applyDiscTextUpdatePlan(state, ownerPlan)
    case 'ratingBadge':
      return {
        ...state,
        ratingBadge: {
          ...state.ratingBadge,
          layout: ownerPlan.updates.reduce(
            (layout, update) =>
              update.slot === 'ratingBadge' &&
                  (update.condition !== 'when-existing-owner-is-renderable' ||
                    shouldRenderRatingBadge(
                      state.metadata ?? { ratingSystem: 'none' },
                      state.ratingBadge,
                    ))
                ? applyVisualLayoutUpdate(
                    layout,
                    update,
                    canEnableRatingBadge(state),
                  )
                : layout,
            state.ratingBadge.layout,
          ),
        },
      }
    case 'mediaMark':
      return {
        ...state,
        mediaMark: {
          ...state.mediaMark,
          layout: ownerPlan.updates.reduce(
            (layout, update) =>
              update.slot === 'mediaMark' &&
                  (update.condition !== 'when-existing-owner-is-renderable' ||
                    isOptionalLayoutFeatureEnabled(state.mediaMark))
                ? applyVisualLayoutUpdate(layout, update, true)
                : layout,
            state.mediaMark.layout,
          ),
        },
      }
    case 'platformMarks':
      return {
        ...state,
        platformMarks: ownerPlan.updates.reduce(
          (platformMarks, update) => applyPlatformMarksUpdate(
            platformMarks,
            update,
            selectedDiscTemplate,
          ),
          state.platformMarks,
        ),
      }
    case 'technicalMarks':
      return {
        ...state,
        technicalMarks: ownerPlan.updates.reduce(
          applyTechnicalMarksUpdate,
          state.technicalMarks,
        ),
      }
    case 'logoAssets':
      return {
        ...state,
        logoAssets: ownerPlan.updates.reduce(
          applyLogoAssetUpdate,
          state.logoAssets,
        ),
      }
    case 'additionalArtwork':
      return state
  }
}

function canEnableRatingBadge(state: DiscRolePresetApplicationState) {
  if (!state.metadata) {
    return false
  }

  return shouldRenderRatingBadge(state.metadata, {
    ...state.ratingBadge,
    layout: {
      ...state.ratingBadge.layout,
      enabled: true,
    },
  })
}

function applyBackgroundUpdate(
  background: DiscRolePresetBackgroundState,
  update: DiscRolePresetUpdate,
): DiscRolePresetBackgroundState {
  const canEnable = Boolean(background.imageDataUrl)

  return update.fields.reduce((nextBackground, fieldUpdate) => {
    switch (fieldUpdate.field) {
      case 'enabled':
        return typeof fieldUpdate.value === 'boolean' && canEnable
          ? { ...nextBackground, enabled: fieldUpdate.value }
          : nextBackground
      case 'scale':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextBackground, scale: fieldUpdate.value }
          : nextBackground
      case 'offset.x':
        return typeof fieldUpdate.value === 'number'
          ? {
              ...nextBackground,
              offset: { ...nextBackground.offset, x: fieldUpdate.value },
            }
          : nextBackground
      case 'offset.y':
        return typeof fieldUpdate.value === 'number'
          ? {
              ...nextBackground,
              offset: { ...nextBackground.offset, y: fieldUpdate.value },
            }
          : nextBackground
      default:
        return nextBackground
    }
  }, background)
}

function applyDiscTextUpdatePlan(
  state: DiscRolePresetApplicationState,
  ownerPlan: DiscRolePresetOwnerUpdatePlan,
): DiscRolePresetApplicationState {
  return ownerPlan.updates.reduce((nextState, update) => {
    const textKey = getDiscTextKeyForPresetSlot(update.slot)

    if (!textKey || !shouldApplyDiscTextUpdate(nextState, update)) {
      return nextState
    }

    return {
      ...nextState,
      discTextSettings: applyDiscTextSettingsUpdate(
        nextState.discTextSettings,
        textKey,
        update,
      ),
      discTextLayout: {
        ...nextState.discTextLayout,
        [textKey]: applyDiscTextLayoutUpdate(
          nextState.discTextLayout[textKey],
          update,
        ),
      },
    }
  }, state)
}

function shouldApplyDiscTextUpdate(
  state: DiscRolePresetApplicationState,
  update: DiscRolePresetUpdate,
) {
  if (update.condition === 'when-enabled') {
    const textKey = getDiscTextKeyForPresetSlot(update.slot)
    return Boolean(textKey && state.discTextSettings[textKey])
  }

  if (update.condition !== 'when-title-artwork-is-not-renderable') {
    return true
  }

  return !state.titleArtwork.imageDataUrl
}

function applyDiscTextSettingsUpdate(
  settings: DiscTextSettings,
  key: DiscTextKey,
  update: DiscRolePresetUpdate,
): DiscTextSettings {
  return update.fields.reduce((nextSettings, fieldUpdate) => {
    if (
      fieldUpdate.field !== 'textSetting.enabled' ||
      typeof fieldUpdate.value !== 'boolean'
    ) {
      return nextSettings
    }

    return {
      ...nextSettings,
      [key]: fieldUpdate.value,
    }
  }, settings)
}

function applyDiscTextLayoutUpdate(
  layout: DiscTextLayout,
  update: DiscRolePresetUpdate,
): DiscTextLayout {
  return update.fields.reduce((nextLayout, fieldUpdate) => {
    switch (fieldUpdate.field) {
      case 'textLayout.x':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextLayout, x: fieldUpdate.value }
          : nextLayout
      case 'textLayout.y':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextLayout, y: fieldUpdate.value }
          : nextLayout
      case 'textLayout.width':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextLayout, width: fieldUpdate.value }
          : nextLayout
      case 'textLayout.scale':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextLayout, scale: fieldUpdate.value }
          : nextLayout
      case 'textLayout.fontSizePt':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextLayout, fontSizePt: fieldUpdate.value }
          : nextLayout
      case 'textLayout.align':
        return isDiscTextAlign(fieldUpdate.value)
          ? { ...nextLayout, align: fieldUpdate.value }
          : nextLayout
      case 'textLayout.mode':
        return isDiscTextMode(fieldUpdate.value)
          ? { ...nextLayout, mode: fieldUpdate.value }
          : nextLayout
      case 'textLayout.arcDegrees':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextLayout, arcDegrees: fieldUpdate.value }
          : nextLayout
      case 'textLayout.arcSide':
        return isDiscTextArcSide(fieldUpdate.value)
          ? { ...nextLayout, arcSide: fieldUpdate.value }
          : nextLayout
      default:
        return nextLayout
    }
  }, layout)
}

function applyPlatformMarksUpdate(
  platformMarks: ProjectPlatformMarks,
  update: DiscRolePresetUpdate,
  selectedDiscTemplate?: DiscTemplate,
): ProjectPlatformMarks {
  if (update.slot !== 'selectedPlatformMarks') {
    return platformMarks
  }

  if (update.placement?.kind === 'grouped-platform-marks') {
    if (!selectedDiscTemplate) return platformMarks

    const placement = placeGroupedPlatformMarks({
      platformMarks,
      region: update.placement.region,
      template: selectedDiscTemplate,
    })

    if (placement.status !== 'placed') return platformMarks

    const nextAssets = { ...platformMarks.assets }

    for (const layoutUpdate of placement.updates) {
      const asset = getProjectPlatformMarkAsset(
        platformMarks,
        layoutUpdate.value,
        selectedDiscTemplate,
      )

      nextAssets[layoutUpdate.value] = {
        ...asset,
        layout: {
          ...asset.layout,
          x: layoutUpdate.x,
          y: layoutUpdate.y,
          scale: layoutUpdate.scale,
        },
      }
    }

    return {
      ...platformMarks,
      assets: nextAssets,
    }
  }

  const nextAssets = { ...platformMarks.assets }

  for (const value of platformMarks.values) {
    const asset = nextAssets[value]

    if (!asset) {
      continue
    }

    nextAssets[value] = {
      ...asset,
      layout: applyVisualLayoutUpdate(asset.layout, update, true),
    }
  }

  return {
    ...platformMarks,
    assets: nextAssets,
  }
}

function applyTechnicalMarksUpdate(
  technicalMarks: ProjectTechnicalMarks,
  update: DiscRolePresetUpdate,
): ProjectTechnicalMarks {
  if (update.slot !== 'selectedTechnicalMarks') {
    return technicalMarks
  }

  const nextAssets = { ...technicalMarks.assets }

  for (const value of technicalMarks.values) {
    const asset = nextAssets[value]

    if (!asset) {
      continue
    }

    nextAssets[value] = {
      ...asset,
      layout: applyVisualLayoutUpdate(asset.layout, update, true),
    }
  }

  return {
    ...technicalMarks,
    assets: nextAssets,
  }
}

function applyLogoAssetUpdate(
  logoAssets: ProjectLogoAssets,
  update: DiscRolePresetUpdate,
): ProjectLogoAssets {
  switch (update.slot) {
    case 'developerLogo':
      if (
        update.condition === 'when-existing-owner-is-renderable' &&
        (!isOptionalVisualFeatureEnabled(logoAssets.developerLogoLayout) ||
          !logoAssets.developerLogoDataUrl)
      ) {
        return logoAssets
      }
      return {
        ...logoAssets,
        developerLogoLayout: applyVisualLayoutUpdate(
          logoAssets.developerLogoLayout,
          update,
          Boolean(logoAssets.developerLogoDataUrl),
        ),
      }
    case 'publisherLogo':
      if (
        update.condition === 'when-existing-owner-is-renderable' &&
        (!isOptionalVisualFeatureEnabled(logoAssets.publisherLogoLayout) ||
          !logoAssets.publisherLogoDataUrl)
      ) {
        return logoAssets
      }
      return {
        ...logoAssets,
        publisherLogoLayout: applyVisualLayoutUpdate(
          logoAssets.publisherLogoLayout,
          update,
          Boolean(logoAssets.publisherLogoDataUrl),
        ),
      }
    default:
      return logoAssets
  }
}

function applyVisualLayoutUpdate<
  Layout extends { enabled: boolean; scale: number; x: number; y: number },
>(
  layout: Layout,
  update: DiscRolePresetUpdate,
  canEnable: boolean,
): Layout {
  return update.fields.reduce((nextLayout, fieldUpdate) => {
    switch (fieldUpdate.field) {
      case 'layout.enabled':
        return typeof fieldUpdate.value === 'boolean' && canEnable
          ? { ...nextLayout, enabled: fieldUpdate.value }
          : nextLayout
      case 'layout.x':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextLayout, x: fieldUpdate.value }
          : nextLayout
      case 'layout.y':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextLayout, y: fieldUpdate.value }
          : nextLayout
      case 'layout.scale':
        return typeof fieldUpdate.value === 'number'
          ? { ...nextLayout, scale: fieldUpdate.value }
          : nextLayout
      default:
        return nextLayout
    }
  }, layout)
}

function getDiscTextKeyForPresetSlot(
  slot: DiscRolePresetSlot,
): DiscTextKey | null {
  switch (slot) {
    case 'titleTextFallback':
      return 'title'
    case 'copyrightText':
      return 'copyright'
    case 'appIdText':
      return 'appId'
    case 'backupDateText':
      return 'backupDate'
    case 'developerText':
      return 'developer'
    case 'publisherText':
      return 'publisher'
    case 'installNotesText':
      return 'installNotes'
    case 'customNoteText':
      return 'customNote'
    default:
      return null
  }
}

function isDiscTextAlign(
  value: DiscRolePresetFieldValue,
): value is DiscTextLayout['align'] {
  return value === 'left' || value === 'center' || value === 'right'
}

function isDiscTextMode(
  value: DiscRolePresetFieldValue,
): value is DiscTextLayout['mode'] {
  return value === 'straight' || value === 'curved'
}

function isDiscTextArcSide(
  value: DiscRolePresetFieldValue,
): value is DiscTextLayout['arcSide'] {
  return value === 'top' || value === 'bottom'
}
