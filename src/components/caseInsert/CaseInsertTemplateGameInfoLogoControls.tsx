import { type ReactNode } from 'react'
import {
  CASE_INSERT_MARK_BRANDING_SECTIONS,
} from '../../caseInsert/brandingPanelSections'
import {
  getEnabledCaseInsertMarkSlotForKind,
  getEnabledCaseInsertMarkSlotForSourcePrefix,
} from '../../caseInsert/brandingMarkPlacement'
import {
  getCaseInsertTemplateMarkPlacementFields,
} from '../../caseInsert/brandingMarkPlacementFields'
import type {
  CaseInsertMarkLayerKind,
} from '../../caseInsert/brandingSlotSources'
import type { CaseInsertTemplatePaneId } from '../../caseInsert/templateSurfaces'
import type { CaseInsertTemplateEditorActions } from '../../hooks/useCaseInsertTemplateEditor'
import {
  RATING_BADGE_LAYOUT_PRESETS,
} from '../../layout/presets'
import type { ProjectCaseInsertImageSlot } from '../../project/projectTypes'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import {
  CaseInsertMediaMarkSetupControls,
  CaseInsertPlatformMarkSetupControls,
  CaseInsertRatingBadgeSetupControls,
  CaseInsertTechnicalMarkSetupControls,
} from './CaseInsertBrandingSetupControls'
import { CaseInsertMarkPlacementControls } from './CaseInsertMarkPlacementControls'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'

function CaseInsertGameInfoFeatureSection({
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

function TemplateMarkPlacementControls({
  paneId,
  slot,
  idPrefix,
  layoutPresets,
  presetLabel,
  resetLabel,
  actions,
}: {
  paneId: CaseInsertTemplatePaneId
  slot: ProjectCaseInsertImageSlot | null
  idPrefix: string
  layoutPresets?: typeof RATING_BADGE_LAYOUT_PRESETS
  presetLabel?: string
  resetLabel: string
  actions: CaseInsertTemplateEditorActions
}) {
  return (
    <CaseInsertMarkPlacementControls
      fields={slot ? getCaseInsertTemplateMarkPlacementFields(paneId, slot) : []}
      idPrefix={idPrefix}
      layoutPresets={layoutPresets}
      slot={slot}
      presetLabel={presetLabel}
      resetLabel={resetLabel}
      onLayoutChange={(field, value) => {
        if (!slot) return
        actions.handleGroupedImageSlotLayoutChange(
          paneId,
          'markSlots',
          slot.id,
          field,
          value,
        )
      }}
      onResetLayout={() => {
        if (!slot) return
        actions.handleResetGroupedImageSlotLayout(
          paneId,
          'markSlots',
          slot.id,
        )
      }}
    />
  )
}

function getTemplateMarkSlotForSection(
  markSlots: ProjectCaseInsertImageSlot[],
  markKind: CaseInsertMarkLayerKind,
) {
  return getEnabledCaseInsertMarkSlotForKind(markSlots, markKind)
}

export function CaseInsertTemplateGameInfoLogoControls({
  paneId,
  templateState,
  actions,
  getBrandingControls,
}: CaseInsertTemplateControlsProps) {
  const brandingControls = getBrandingControls(
    { type: 'template', paneId },
    templateState,
  )

  return (
    <>
      {CASE_INSERT_MARK_BRANDING_SECTIONS.map((section) => (
        <CaseInsertGameInfoFeatureSection
          key={section.markKind}
          title={section.title}
        >
          {section.markKind === 'rating' ? (
            <CaseInsertRatingBadgeSetupControls
              {...brandingControls}
              idPrefix={`${paneId}-${section.markKind}`}
              renderSupplementalUskLayoutControls={() => (
                <TemplateMarkPlacementControls
                  paneId={paneId}
                  slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                    templateState.markSlots,
                    'rating',
                    'case-rating:USK:',
                  )}
                  idPrefix={`${paneId}-usk-rating-badge`}
                  layoutPresets={RATING_BADGE_LAYOUT_PRESETS}
                  presetLabel="USK layout preset"
                  resetLabel="Reset USK badge layout"
                  actions={actions}
                />
              )}
            >
              <TemplateMarkPlacementControls
                paneId={paneId}
                slot={getTemplateMarkSlotForSection(
                  templateState.markSlots,
                  'rating',
                )}
                idPrefix={`${paneId}-rating-badge`}
                layoutPresets={RATING_BADGE_LAYOUT_PRESETS}
                resetLabel="Reset rating badge layout"
                actions={actions}
              />
            </CaseInsertRatingBadgeSetupControls>
          ) : null}
          {section.markKind === 'media' ? (
            <CaseInsertMediaMarkSetupControls
              {...brandingControls}
              idPrefix={`${paneId}-${section.markKind}`}
            >
              <TemplateMarkPlacementControls
                paneId={paneId}
                slot={getTemplateMarkSlotForSection(
                  templateState.markSlots,
                  'media',
                )}
                idPrefix={`${paneId}-media-mark`}
                resetLabel="Reset media mark layout"
                actions={actions}
              />
            </CaseInsertMediaMarkSetupControls>
          ) : null}
          {section.markKind === 'platform' ? (
            <CaseInsertPlatformMarkSetupControls
              {...brandingControls}
              idPrefix={`${paneId}-${section.markKind}`}
              renderLayoutControls={(value, label) => (
                <TemplateMarkPlacementControls
                  paneId={paneId}
                  slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                    templateState.markSlots,
                    'platform',
                    `case-platform:${value}:`,
                  )}
                  idPrefix={`${paneId}-platform-mark-${value}`}
                  resetLabel={`Reset ${label} layout`}
                  actions={actions}
                />
              )}
            />
          ) : null}
          {section.markKind === 'technical' ? (
            <CaseInsertTechnicalMarkSetupControls
              {...brandingControls}
              idPrefix={`${paneId}-${section.markKind}`}
              renderLayoutControls={(value, label, _asset, assetId) => (
                <TemplateMarkPlacementControls
                  paneId={paneId}
                  slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                    templateState.markSlots,
                    'technical',
                    `case-technical:${value}:${assetId ?? 'primary'}`,
                  )}
                  idPrefix={`${paneId}-technical-mark-${value}-${assetId ?? 'primary'}`}
                  resetLabel={`Reset ${label} layout`}
                  actions={actions}
                />
              )}
            />
          ) : null}
        </CaseInsertGameInfoFeatureSection>
      ))}
    </>
  )
}
