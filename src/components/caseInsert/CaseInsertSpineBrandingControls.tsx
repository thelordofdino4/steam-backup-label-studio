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
import {
  getCaseInsertAdditionalLogoSlotsForKey,
  getCaseInsertPrimaryLogoSlot,
  getCaseInsertUnassignedAdditionalLogoSlots,
} from '../../caseInsert/brandingLogoSlots'
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
import { PlusIcon } from '../sidebar/PanelIcons'
import {
  CaseInsertMediaMarkSetupControls,
  CaseInsertPlatformMarkSetupControls,
  CaseInsertRatingBadgeSetupControls,
  CaseInsertTechnicalMarkSetupControls,
  type CaseInsertBrandingSetupControlsProps,
} from './CaseInsertBrandingSetupControls'
import { CaseInsertLogoSlotControls } from './CaseInsertLogoSlotControls'
import { CaseInsertMarkPlacementControls } from './CaseInsertMarkPlacementControls'
import { CaseInsertSteamBannerControls } from './CaseInsertSteamBannerControls'
import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import {
  getSpineImageSlotPlacementFields,
  SPINE_OVERLAY_PLACEMENT_FIELDS,
} from './CaseInsertSpineControlPlacement'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'
import {
  SpineGroupedImageSlotControls,
} from './CaseInsertSpineImageSlotControls'

function SpineBrandingFeatureSection({
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

  if (markKind === 'media') {
    return (
      <CaseInsertMediaMarkSetupControls {...setupProps}>
        {children}
      </CaseInsertMediaMarkSetupControls>
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

export function CaseInsertSpineBrandingControls({
  spine,
  actions,
  imageSources,
  getBrandingControls,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
}: CaseInsertSpineControlsProps) {
  return (
    <CaseInsertSpineControlSections
      spine={spine}
      renderControls={({ side }) => {
        const state = spine[side]
      const developerLogoSlot = getCaseInsertPrimaryLogoSlot(
        state,
        'developer',
      )
      const publisherLogoSlot = getCaseInsertPrimaryLogoSlot(
        state,
        'publisher',
      )
      const additionalDeveloperLogoSlots =
        getCaseInsertAdditionalLogoSlotsForKey(state, 'developer')
      const additionalPublisherLogoSlots =
        getCaseInsertAdditionalLogoSlotsForKey(state, 'publisher')
      const unassignedAdditionalLogoSlots =
        getCaseInsertUnassignedAdditionalLogoSlots(state)
      const brandingControls = getBrandingControls(
        { type: 'spine', side },
        state,
      )

        return (
          <>
          <SpineBrandingFeatureSection title="Steam banner">
            <CaseInsertSteamBannerControls
              banner={state.steamBanner}
              idPrefix={`${side}-spine-steam-banner`}
              targetKind="spine"
              onEnabledChange={(enabled) =>
                actions.handleSpineSteamBannerEnabledChange(side, enabled)}
              onLockupUpload={(event) =>
                actions.handleSpineSteamBannerLockupUpload(side, event)}
              onClearLockup={() =>
                actions.handleClearSpineSteamBannerLockup(side)}
              onLayoutChange={(field, value) =>
                actions.handleSpineSteamBannerLockupLayoutChange(
                  side,
                  field,
                  value,
                )}
              onResetLayout={() =>
                actions.handleResetSpineSteamBannerLockupLayout(side)}
              onUseTextFallbackChange={(useTextFallback) =>
                actions.handleSpineSteamBannerUseTextFallbackChange(
                  side,
                  useTextFallback,
                )}
              onFallbackTextChange={(fallbackText) =>
                actions.handleSpineSteamBannerFallbackTextChange(
                  side,
                  fallbackText,
                )}
              onColorChange={(field, value) =>
                actions.handleSpineSteamBannerColorChange(
                  side,
                  field,
                  value,
                )}
              onResetColors={() =>
                actions.handleResetSpineSteamBannerColors(side)}
            />
          </SpineBrandingFeatureSection>
          <SpineBrandingFeatureSection title="Developer / publisher logos">
            <CaseInsertLogoSlotControls
              paneId="spine"
              logoKey="developer"
              slot={developerLogoSlot}
              uploadId={`${side}-spine-developer-logo-upload`}
              fields={developerLogoSlot
                ? getSpineImageSlotPlacementFields(
                    side,
                    developerLogoSlot,
                    'logo',
                  )
                : SPINE_OVERLAY_PLACEMENT_FIELDS}
              logoCandidateDiscovery={logoCandidateDiscovery}
              handleFindLogoCandidates={handleFindLogoCandidates}
              onUseLogoCandidate={(logoKey, candidate) =>
                actions.handleUseSpineLogoCandidate(
                  side,
                  logoKey,
                  candidate,
                )}
              onEnabledChange={(enabled) =>
                actions.handleSpinePrimaryLogoSlotEnabledChange(
                  side,
                  'developer',
                  enabled,
                )}
              onUpload={(event) =>
                actions.handleSpinePrimaryLogoSlotUpload(
                  side,
                  'developer',
                  event,
                )}
              onLayoutChange={(field, value) =>
                actions.handleSpinePrimaryLogoSlotLayoutChange(
                  side,
                  'developer',
                  field,
                  value,
                )}
              onResetLayout={() =>
                actions.handleResetSpinePrimaryLogoSlotLayout(
                  side,
                  'developer',
                )}
              onClearImage={() =>
                actions.handleClearSpinePrimaryLogoSlot(side, 'developer')}
            >
              <EditorFeaturePanel title="Additional developer logos">
                {additionalDeveloperLogoSlots.length === 0 ? (
                  <p className="hint">No additional developer logos.</p>
                ) : null}
                {additionalDeveloperLogoSlots.map((slot, index) => (
                  <SpineGroupedImageSlotControls
                    key={slot.id}
                    side={side}
                    slotKey="logoSlots"
                    slot={slot}
                    uploadId={`${side}-spine-developer-logo-${slot.id}-${index + 1}-upload`}
                    imageSources={imageSources}
                    actions={actions}
                  />
                ))}
                <button
                  className="secondary-button icon-text-button spacing-top"
                  type="button"
                  onClick={() =>
                    actions.handleAddSpineAdditionalLogoSlot(
                      side,
                      'developer',
                    )}
                >
                  <PlusIcon />
                  <span>Add additional logo</span>
                </button>
              </EditorFeaturePanel>
            </CaseInsertLogoSlotControls>

            <CaseInsertLogoSlotControls
              paneId="spine"
              logoKey="publisher"
              slot={publisherLogoSlot}
              uploadId={`${side}-spine-publisher-logo-upload`}
              fields={publisherLogoSlot
                ? getSpineImageSlotPlacementFields(
                    side,
                    publisherLogoSlot,
                    'logo',
                  )
                : SPINE_OVERLAY_PLACEMENT_FIELDS}
              logoCandidateDiscovery={logoCandidateDiscovery}
              handleFindLogoCandidates={handleFindLogoCandidates}
              onUseLogoCandidate={(logoKey, candidate) =>
                actions.handleUseSpineLogoCandidate(
                  side,
                  logoKey,
                  candidate,
                )}
              onEnabledChange={(enabled) =>
                actions.handleSpinePrimaryLogoSlotEnabledChange(
                  side,
                  'publisher',
                  enabled,
                )}
              onUpload={(event) =>
                actions.handleSpinePrimaryLogoSlotUpload(
                  side,
                  'publisher',
                  event,
                )}
              onLayoutChange={(field, value) =>
                actions.handleSpinePrimaryLogoSlotLayoutChange(
                  side,
                  'publisher',
                  field,
                  value,
                )}
              onResetLayout={() =>
                actions.handleResetSpinePrimaryLogoSlotLayout(
                  side,
                  'publisher',
                )}
              onClearImage={() =>
                actions.handleClearSpinePrimaryLogoSlot(side, 'publisher')}
            >
              <EditorFeaturePanel title="Additional publisher logos">
                {additionalPublisherLogoSlots.length === 0 ? (
                  <p className="hint">No additional publisher logos.</p>
                ) : null}
                {additionalPublisherLogoSlots.map((slot, index) => (
                  <SpineGroupedImageSlotControls
                    key={slot.id}
                    side={side}
                    slotKey="logoSlots"
                    slot={slot}
                    uploadId={`${side}-spine-publisher-logo-${slot.id}-${index + 1}-upload`}
                    imageSources={imageSources}
                    actions={actions}
                  />
                ))}
                <button
                  className="secondary-button icon-text-button spacing-top"
                  type="button"
                  onClick={() =>
                    actions.handleAddSpineAdditionalLogoSlot(
                      side,
                      'publisher',
                    )}
                >
                  <PlusIcon />
                  <span>Add additional logo</span>
                </button>
              </EditorFeaturePanel>
            </CaseInsertLogoSlotControls>

            {unassignedAdditionalLogoSlots.length > 0 ? (
              <EditorFeaturePanel title="Unassigned additional logos">
                {unassignedAdditionalLogoSlots.map((slot, index) => (
                  <SpineGroupedImageSlotControls
                    key={slot.id}
                    side={side}
                    slotKey="logoSlots"
                    slot={slot}
                    uploadId={`${side}-spine-logo-${slot.id}-${index + 1}-upload`}
                    imageSources={imageSources}
                    actions={actions}
                  />
                ))}
              </EditorFeaturePanel>
            ) : null}
          </SpineBrandingFeatureSection>
          {CASE_INSERT_MARK_BRANDING_SECTIONS.map((section) => {
            return (
              <SpineBrandingFeatureSection
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
                  renderLayoutControls={(value, markLabel, _asset, assetId) => {
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
                  {section.markKind === 'media' ? (
                    <SpineMarkPlacementControls
                      side={side}
                      slot={getEnabledCaseInsertMarkSlotForKind(
                        state.markSlots,
                        'media',
                      )}
                      idPrefix={`${side}-spine-media-mark`}
                      resetLabel="Reset media mark layout"
                      actions={actions}
                    />
                  ) : null}
                </SpineMarkSetupControls>
              </SpineBrandingFeatureSection>
            )
          })}
          </>
        )
      }}
    />
  )
}
