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
import {
  getCaseInsertAdditionalLogoSlotsForKey,
  getCaseInsertPrimaryLogoSlot,
  getCaseInsertUnassignedAdditionalLogoSlots,
} from '../../caseInsert/brandingLogoSlots'
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
import { CaseInsertLogoSlotControls } from './CaseInsertLogoSlotControls'
import { CaseInsertMarkPlacementControls } from './CaseInsertMarkPlacementControls'
import { CaseInsertSteamBannerControls } from './CaseInsertSteamBannerControls'
import {
  getTemplateGroupedImagePlacementFields,
  TEMPLATE_OVERLAY_PLACEMENT_FIELDS,
} from './CaseInsertTemplateControlPlacement'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  GroupedImageSlotList,
} from './CaseInsertTemplateImageSlotControls'

function CaseInsertBrandingFeatureSection({
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

export function CaseInsertTemplateBrandingControls({
  paneId,
  templateState,
  actions,
  imageSources,
  getBrandingControls,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
}: CaseInsertTemplateControlsProps) {
  const brandingControls = getBrandingControls(
    { type: 'template', paneId },
    templateState,
  )
  const developerLogoSlot = getCaseInsertPrimaryLogoSlot(
    templateState,
    'developer',
  )
  const publisherLogoSlot = getCaseInsertPrimaryLogoSlot(
    templateState,
    'publisher',
  )
  const additionalDeveloperLogoSlots =
    getCaseInsertAdditionalLogoSlotsForKey(templateState, 'developer')
  const additionalPublisherLogoSlots =
    getCaseInsertAdditionalLogoSlotsForKey(templateState, 'publisher')
  const unassignedAdditionalLogoSlots =
    getCaseInsertUnassignedAdditionalLogoSlots(templateState)

  return (
    <>
      {paneId === 'cover' ? (
        <CaseInsertBrandingFeatureSection title="Steam banner">
          <CaseInsertSteamBannerControls
            banner={templateState.steamBanner}
            idPrefix={`${paneId}-steam-banner`}
            targetKind="cover"
            onEnabledChange={(enabled) =>
              actions.handleSteamBannerEnabledChange(paneId, enabled)}
            onLockupUpload={(event) =>
              actions.handleSteamBannerLockupUpload(paneId, event)}
            onClearLockup={() =>
              actions.handleClearSteamBannerLockup(paneId)}
            onLayoutChange={(field, value) =>
              actions.handleSteamBannerLockupLayoutChange(
                paneId,
                field,
                value,
              )}
            onResetLayout={() =>
              actions.handleResetSteamBannerLockupLayout(paneId)}
            onUseTextFallbackChange={(useTextFallback) =>
              actions.handleSteamBannerUseTextFallbackChange(
                paneId,
                useTextFallback,
              )}
            onFallbackTextChange={(fallbackText) =>
              actions.handleSteamBannerFallbackTextChange(
                paneId,
                fallbackText,
              )}
            onColorChange={(field, value) =>
              actions.handleSteamBannerColorChange(paneId, field, value)}
            onResetColors={() =>
              actions.handleResetSteamBannerColors(paneId)}
          />
        </CaseInsertBrandingFeatureSection>
      ) : null}

      <CaseInsertBrandingFeatureSection title="Developer / publisher logos">
        <CaseInsertLogoSlotControls
          paneId={paneId}
          logoKey="developer"
          slot={developerLogoSlot}
          uploadId={`${paneId}-developer-logo-upload`}
          fields={developerLogoSlot
            ? getTemplateGroupedImagePlacementFields(
                paneId,
                'logoSlots',
                developerLogoSlot,
              )
            : TEMPLATE_OVERLAY_PLACEMENT_FIELDS}
          logoCandidateDiscovery={logoCandidateDiscovery}
          handleFindLogoCandidates={handleFindLogoCandidates}
          onUseLogoCandidate={(logoKey, candidate) =>
            actions.handleUseLogoCandidate(paneId, logoKey, candidate)}
          onEnabledChange={(enabled) =>
            actions.handlePrimaryLogoSlotEnabledChange(
              paneId,
              'developer',
              enabled,
            )}
          onUpload={(event) =>
            actions.handlePrimaryLogoSlotUpload(
              paneId,
              'developer',
              event,
            )}
          onLayoutChange={(field, value) =>
            actions.handlePrimaryLogoSlotLayoutChange(
              paneId,
              'developer',
              field,
              value,
            )}
          onResetLayout={() =>
            actions.handleResetPrimaryLogoSlotLayout(paneId, 'developer')}
          onClearImage={() =>
            actions.handleClearPrimaryLogoSlot(paneId, 'developer')}
        >
          <EditorFeaturePanel title="Additional developer logos">
            <GroupedImageSlotList
              paneId={paneId}
              emptyHint="No additional developer logos."
              addLabel="Add additional logo"
              slotKey="logoSlots"
              slots={additionalDeveloperLogoSlots}
              imageSources={imageSources}
              actions={actions}
              onAddSlot={() =>
                actions.handleAddAdditionalLogoSlot(paneId, 'developer')}
            />
          </EditorFeaturePanel>
        </CaseInsertLogoSlotControls>

        <CaseInsertLogoSlotControls
          paneId={paneId}
          logoKey="publisher"
          slot={publisherLogoSlot}
          uploadId={`${paneId}-publisher-logo-upload`}
          fields={publisherLogoSlot
            ? getTemplateGroupedImagePlacementFields(
                paneId,
                'logoSlots',
                publisherLogoSlot,
              )
            : TEMPLATE_OVERLAY_PLACEMENT_FIELDS}
          logoCandidateDiscovery={logoCandidateDiscovery}
          handleFindLogoCandidates={handleFindLogoCandidates}
          onUseLogoCandidate={(logoKey, candidate) =>
            actions.handleUseLogoCandidate(paneId, logoKey, candidate)}
          onEnabledChange={(enabled) =>
            actions.handlePrimaryLogoSlotEnabledChange(
              paneId,
              'publisher',
              enabled,
            )}
          onUpload={(event) =>
            actions.handlePrimaryLogoSlotUpload(
              paneId,
              'publisher',
              event,
            )}
          onLayoutChange={(field, value) =>
            actions.handlePrimaryLogoSlotLayoutChange(
              paneId,
              'publisher',
              field,
              value,
            )}
          onResetLayout={() =>
            actions.handleResetPrimaryLogoSlotLayout(paneId, 'publisher')}
          onClearImage={() =>
            actions.handleClearPrimaryLogoSlot(paneId, 'publisher')}
        >
          <EditorFeaturePanel title="Additional publisher logos">
            <GroupedImageSlotList
              paneId={paneId}
              emptyHint="No additional publisher logos."
              addLabel="Add additional logo"
              slotKey="logoSlots"
              slots={additionalPublisherLogoSlots}
              imageSources={imageSources}
              actions={actions}
              onAddSlot={() =>
                actions.handleAddAdditionalLogoSlot(paneId, 'publisher')}
            />
          </EditorFeaturePanel>
        </CaseInsertLogoSlotControls>

        {unassignedAdditionalLogoSlots.length > 0 ? (
          <EditorFeaturePanel title="Unassigned additional logos">
            <GroupedImageSlotList
              paneId={paneId}
              emptyHint="No unassigned additional logos."
              addLabel="Add additional logo"
              slotKey="logoSlots"
              slots={unassignedAdditionalLogoSlots}
              imageSources={imageSources}
              actions={actions}
              showAddButton={false}
            />
          </EditorFeaturePanel>
        ) : null}
      </CaseInsertBrandingFeatureSection>

      {CASE_INSERT_MARK_BRANDING_SECTIONS.map((section) => (
        <CaseInsertBrandingFeatureSection
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
        </CaseInsertBrandingFeatureSection>
      ))}
    </>
  )
}
