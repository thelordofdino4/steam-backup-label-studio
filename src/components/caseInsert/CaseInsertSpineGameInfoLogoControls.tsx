import { type ReactNode } from 'react'
import {
  CASE_INSERT_MARK_BRANDING_SECTIONS,
} from '../../caseInsert/brandingPanelSections'
import {
  getEnabledCaseInsertMarkSlotForKind,
  getEnabledCaseInsertMarkSlotForSourcePrefix,
} from '../../caseInsert/brandingMarkPlacement'
import {
  getCaseInsertSpineMarkPlacementFields,
} from '../../caseInsert/brandingMarkPlacementFields'
import type {
  CaseInsertMarkLayerKind,
} from '../../caseInsert/brandingSlotSources'
import type { JewelCaseSpineSide } from '../../caseInsert/types'
import {
  RATING_BADGE_LAYOUT_PRESETS,
} from '../../layout/presets'
import type { JewelCaseSpineEditorActions } from '../../hooks/useJewelCaseSpineEditor'
import type {
  PlatformMarkValue,
  ProjectCaseInsertImageSlot,
  ProjectPlatformMarkAsset,
  ProjectTechnicalMarkAsset,
  TechnicalMarkValue,
} from '../../project/projectTypes'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import {
  CaseInsertPlatformMarkSetupControls,
  CaseInsertRatingBadgeSetupControls,
  CaseInsertTechnicalMarkSetupControls,
  type CaseInsertBrandingSetupControlsProps,
} from './CaseInsertBrandingSetupControls'
import { CaseInsertMarkPlacementControls } from './CaseInsertMarkPlacementControls'
import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'

function SpineGameInfoLogoFeatureSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <EditorFeaturePanel title={title} variant="branding">
      {children}
    </EditorFeaturePanel>
  )
}

function SpineMarkSetupControls({
  markKind,
  brandingControls,
  idPrefix,
  children,
  renderSupplementalUskLayoutControls,
  renderLayoutControls,
}: {
  markKind: CaseInsertMarkLayerKind
  brandingControls: CaseInsertBrandingSetupControlsProps
  idPrefix: string
  children?: ReactNode
  renderSupplementalUskLayoutControls?: () => ReactNode
  renderLayoutControls?: (
    value: PlatformMarkValue | TechnicalMarkValue,
    label: string,
    asset: ProjectPlatformMarkAsset | ProjectTechnicalMarkAsset,
    assetId?: string | null,
  ) => ReactNode
}) {
  const setupProps = {
    ...brandingControls,
    idPrefix,
  }

  if (markKind === 'rating') {
    return (
      <CaseInsertRatingBadgeSetupControls
        {...setupProps}
        renderSupplementalUskLayoutControls={renderSupplementalUskLayoutControls}
      >
        {children}
      </CaseInsertRatingBadgeSetupControls>
    )
  }

  if (markKind === 'platform') {
    return (
      <CaseInsertPlatformMarkSetupControls
        {...setupProps}
        renderLayoutControls={
          renderLayoutControls as (
            value: PlatformMarkValue,
            label: string,
            asset: ProjectPlatformMarkAsset,
          ) => ReactNode
        }
      />
    )
  }

  return (
    <CaseInsertTechnicalMarkSetupControls
      {...setupProps}
      renderLayoutControls={
        renderLayoutControls as (
          value: TechnicalMarkValue,
          label: string,
          asset: ProjectTechnicalMarkAsset,
          assetId?: string | null,
        ) => ReactNode
      }
    />
  )
}

function SpineMarkPlacementControls({
  side,
  slot,
  idPrefix,
  layoutPresets,
  presetLabel,
  resetLabel,
  actions,
}: {
  side: JewelCaseSpineSide
  slot: ProjectCaseInsertImageSlot | null
  idPrefix: string
  layoutPresets?: typeof RATING_BADGE_LAYOUT_PRESETS
  presetLabel?: string
  resetLabel: string
  actions: JewelCaseSpineEditorActions
}) {
  return (
    <CaseInsertMarkPlacementControls
      fields={slot ? getCaseInsertSpineMarkPlacementFields(side, slot) : []}
      idPrefix={idPrefix}
      layoutPresets={layoutPresets}
      presetLabel={presetLabel}
      slot={slot}
      resetLabel={resetLabel}
      onLayoutChange={(field, value) => {
        if (!slot) return
        actions.handleSpineGroupedImageSlotLayoutChange(
          side,
          'markSlots',
          slot.id,
          field,
          value,
        )
      }}
      onResetLayout={() => {
        if (!slot) return
        actions.handleResetSpineGroupedImageSlotLayout(
          side,
          'markSlots',
          slot.id,
        )
      }}
    />
  )
}

export function CaseInsertSpineGameInfoLogoControls({
  spine,
  actions,
  getBrandingControls,
}: CaseInsertSpineControlsProps) {
  return (
    <CaseInsertSpineControlSections
      spine={spine}
      renderControls={({ side }) => {
        const state = spine[side]
        const brandingControls = getBrandingControls(
          { type: 'spine', side },
          state,
        )

        return (
          <>
            {CASE_INSERT_MARK_BRANDING_SECTIONS.filter(
              (section) => section.markKind !== 'media',
            ).map((section) => {
              return (
                <SpineGameInfoLogoFeatureSection
                  key={section.markKind}
                  title={section.title}
                >
                  <SpineMarkSetupControls
                    markKind={section.markKind}
                    brandingControls={brandingControls}
                    idPrefix={`${side}-spine-${section.markKind}`}
                    renderSupplementalUskLayoutControls={section.markKind === 'rating'
                      ? () => (
                          <SpineMarkPlacementControls
                            side={side}
                            slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                              state.markSlots,
                              'rating',
                              'case-rating:USK:',
                            )}
                            idPrefix={`${side}-spine-usk-rating-badge`}
                            layoutPresets={RATING_BADGE_LAYOUT_PRESETS}
                            presetLabel="USK layout preset"
                            resetLabel="Reset USK badge layout"
                            actions={actions}
                          />
                        )
                      : undefined}
                    renderLayoutControls={(
                      value,
                      markLabel,
                      _asset,
                      assetId,
                    ) => {
                      if (section.markKind === 'platform') {
                        return (
                          <SpineMarkPlacementControls
                            side={side}
                            slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                              state.markSlots,
                              'platform',
                              `case-platform:${value}:`,
                            )}
                            idPrefix={`${side}-spine-platform-mark-${value}`}
                            resetLabel={`Reset ${markLabel} layout`}
                            actions={actions}
                          />
                        )
                      }

                      if (section.markKind === 'technical') {
                        return (
                          <SpineMarkPlacementControls
                            side={side}
                            slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                              state.markSlots,
                              'technical',
                              `case-technical:${value}:${assetId ?? 'primary'}`,
                            )}
                            idPrefix={`${side}-spine-technical-mark-${value}-${assetId ?? 'primary'}`}
                            resetLabel={`Reset ${markLabel} layout`}
                            actions={actions}
                          />
                        )
                      }

                      return null
                    }}
                  >
                    {section.markKind === 'rating' ? (
                      <SpineMarkPlacementControls
                        side={side}
                        slot={getEnabledCaseInsertMarkSlotForKind(
                          state.markSlots,
                          'rating',
                        )}
                        idPrefix={`${side}-spine-rating-badge`}
                        layoutPresets={RATING_BADGE_LAYOUT_PRESETS}
                        resetLabel="Reset rating badge layout"
                        actions={actions}
                      />
                    ) : null}
                  </SpineMarkSetupControls>
                </SpineGameInfoLogoFeatureSection>
              )
            })}
          </>
        )
      }}
    />
  )
}
