import {
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from 'react'

import type {
  AppCaseInsertPresetInspectionResult,
  AppCaseInsertPresetWorkflowReview,
} from '../../app/appCaseInsertPresetWorkflow.ts'
import type {
  CaseInsertPresetPresentationController,
  CaseInsertPresetPresentationSnapshot,
} from '../../app/caseInsertPresetPresentationController.ts'
import type {
  CaseInsertAppliedPresetOwnedFieldAddress,
} from '../../presets/caseInsertPresetAppliedConfiguration.ts'
import type {
  CaseInsertPresetPlanWarning,
} from '../../presets/caseInsertPresetApplyPlanning.ts'
import { EditorPanel } from '../editor/EditorPanel.tsx'
import {
  useRegisteredWorkflowNavigationControl,
} from '../editor/applicationWorkflowNavigation.ts'

function words(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function addressLabel(address: CaseInsertAppliedPresetOwnedFieldAddress) {
  return `${words(address.region)} · ${words(address.fieldId)} · ${address.runtimeObjectId}`
}

function recoveryStatusLabel(
  inspection: Extract<AppCaseInsertPresetInspectionResult, { ok: true }>,
) {
  const status = inspection.recoveryStatus
  switch (status.status) {
    case 'not-applicable':
      return 'Not applicable'
    case 'current':
      return `Current catalog definition · ${words(status.customization)}`
    case 'stale':
      return `Stale catalog definition · saved revision ${status.savedRevision}; latest revision ${status.latestAvailableRevision} · ${words(status.customization)}`
    case 'incompatible':
      return `Incompatible catalog definition · ${status.code}`
    case 'unavailable':
      return `Exact catalog definition unavailable · ${status.code}`
  }
}

function planWarningLabel(warning: CaseInsertPresetPlanWarning): string {
  switch (warning.kind) {
    case 'disabled-target-layout-only':
      return `A disabled ${warning.objectId} target receives layout values only.`
    case 'complete-tray-span':
      return `Assignment ${warning.assignmentId} spans the complete Tray Card.`
    case 'text-height-fitting-deferred':
      return `Text-height fitting remains deferred to issue #${warning.issue}.`
    case 'multiple-concrete-regions':
      return `This complete preset affects ${warning.regions.map(words).join(', ')}.`
  }
}

function reviewWarningLabel(
  review: AppCaseInsertPresetWorkflowReview,
  index: number,
): string {
  if (review.operation === 'apply') {
    const warning = review.plan.warnings[index]
    return warning ? planWarningLabel(warning) : 'Review this preset warning.'
  }
  if (review.operation === 'reapply') {
    const warning = review.plan.warnings[index]
    if (!warning) return 'Review this Reapply warning.'
    return warning.kind === 'selected-layout-warning'
      ? planWarningLabel(warning.warning)
      : `${words(warning.kind)}: ${addressLabel(warning.address)}.`
  }
  const warning = review.plan.warnings[index]
  return warning
    ? `Detach releases ${warning.releaseCount} owned fields across ${warning.resolvedRegions.map(words).join(', ')} while preserving every current value.`
    : 'Review the complete ownership release.'
}

function materialConsentLabel(
  review: AppCaseInsertPresetWorkflowReview,
  index: number,
): string {
  if (review.operation === 'apply') {
    const requirement = review.plan.materialConsentRequirements[index]
    return requirement
      ? `Allow the complete preset to update ${requirement.regions.map(words).join(', ')}.`
      : 'Accept this material layout change.'
  }
  if (review.operation === 'reapply') {
    const requirement = review.plan.materialConsentRequirements[index]
    if (!requirement) return 'Accept this material Reapply change.'
    if (requirement.kind === 'multiple-concrete-regions') {
      return `Allow Reapply across ${requirement.regions.map(words).join(', ')}.`
    }
    const target = requirement.address
      ? addressLabel(requirement.address)
      : 'the selected fields'
    return requirement.kind === 'overwrite-customized-owned-field'
      ? `Overwrite the current customization for ${target}.`
      : `Allow the preset to claim and change ${target}.`
  }
  return 'Accept this material change.'
}

function reviewRegions(review: AppCaseInsertPresetWorkflowReview) {
  return review.plan.resolvedRegions.map(words).join(', ')
}

function ReviewEvidence({
  review,
}: Readonly<{ review: AppCaseInsertPresetWorkflowReview }>) {
  if (review.operation === 'apply') {
    return (
      <>
        <p className="hint">
          {review.planningStatus === 'semantic-no-op'
            ? 'The current aggregate already matches this reviewed layout; attachment still requires explicit confirmation.'
            : `${review.plan.fieldActions.length} field action(s), ${review.plan.preservationDecisions.length} preserved decision(s), and ${review.plan.skips.length} skipped optional assignment(s).`}
        </p>
        <ul className="case-layout-preset-evidence-list">
          {review.plan.assignments.map((assignment) => (
            <li key={assignment.assignmentId}>
              <strong>{words(assignment.region)}</strong>: {words(assignment.roleId)}
              {' · '}{words(assignment.bindingStatus)}
              {assignment.semanticNoOp ? ' · no value change' : ''}
            </li>
          ))}
        </ul>
      </>
    )
  }
  if (review.operation === 'reapply') {
    return (
      <>
        <p className="hint">
          {review.customizationReport.summary.customizedFieldCount} customized
          {' '}field(s); {review.plan.aggregateWrites.length} aggregate write(s);
          {' '}{review.plan.preservedCustomizedFields.length} customization(s)
          {' '}preserved.
        </p>
        <ul className="case-layout-preset-evidence-list">
          {review.plan.fieldEffects.map((effect) => (
            <li key={JSON.stringify(effect.address)}>
              <strong>{addressLabel(effect.address)}</strong>:{' '}
              {words(effect.disposition)}
              {effect.policy ? ` · ${words(effect.policy)}` : ''}
            </li>
          ))}
        </ul>
      </>
    )
  }
  return (
    <p className="hint">
      Detach releases {review.plan.releaseFootprint.length} preset-owned field(s)
      {' '}and preserves every current geometry and content value.
    </p>
  )
}

function ReviewPanel({
  snapshot,
  controller,
  headingRef,
  errorRef,
}: Readonly<{
  snapshot: CaseInsertPresetPresentationSnapshot
  controller: CaseInsertPresetPresentationController
  headingRef: RefObject<HTMLHeadingElement | null>
  errorRef: RefObject<HTMLDivElement | null>
}>) {
  const review = snapshot.review!
  const warnings = new Set(snapshot.acknowledgedWarningIds)
  const consents = new Set(snapshot.acceptedMaterialConsentRequirementIds)
  const warningComplete = review.warningIds.every((id) => warnings.has(id))
  const consentComplete = review.materialConsentRequirementIds.every((id) =>
    consents.has(id))
  const blockers = review.operation === 'apply' ? review.plan.blockers.length : 0
  const title = review.operation === 'apply'
    ? 'Review complete preset'
    : review.operation === 'reapply'
      ? 'Review Reapply'
      : 'Review Detach'

  return (
    <section aria-labelledby="case-layout-preset-review-heading">
      <h3
        id="case-layout-preset-review-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        {title}
      </h3>
      <dl className="template-metrics case-layout-preset-review-summary">
        <div><dt>Preset</dt><dd>{review.selectedPreset?.id ?? 'Saved attachment'}</dd></div>
        <div><dt>Revision</dt><dd>{review.selectedPreset?.revision ?? '—'}</dd></div>
        <div><dt>Scope</dt><dd>Complete preset</dd></div>
        <div><dt>Regions</dt><dd>{reviewRegions(review)}</dd></div>
      </dl>
      <ReviewEvidence review={review} />

      {blockers > 0 ? (
        <p className="case-layout-preset-error" role="alert">
          This review contains {blockers} blocker(s) and cannot be confirmed.
        </p>
      ) : null}

      {review.warningIds.length > 0 ? (
        <fieldset className="case-layout-preset-decisions">
          <legend>Warnings to acknowledge</legend>
          {review.warningIds.map((id, index) => (
            <label className="checkbox-row" key={id}>
              <input
                type="checkbox"
                checked={warnings.has(id)}
                disabled={snapshot.pending}
                onChange={(event) => controller.setWarningAcknowledged(
                  id,
                  event.target.checked,
                )}
              />
              <span>{reviewWarningLabel(review, index)}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {review.materialConsentRequirementIds.length > 0 ? (
        <fieldset className="case-layout-preset-decisions">
          <legend>Required material-change consent</legend>
          {review.materialConsentRequirementIds.map((id, index) => (
            <label className="checkbox-row" key={id}>
              <input
                type="checkbox"
                checked={consents.has(id)}
                disabled={snapshot.pending}
                onChange={(event) => controller.setMaterialConsentAccepted(
                  id,
                  event.target.checked,
                )}
              />
              <span>{materialConsentLabel(review, index)}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {snapshot.notice?.kind === 'error' ? (
        <div
          className="case-layout-preset-error"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          <strong>Review not completed</strong>
          <p>{snapshot.notice.message}</p>
          <code>{snapshot.notice.code}</code>
        </div>
      ) : null}

      <div className="button-row case-layout-preset-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={snapshot.pending}
          onClick={controller.cancelReview}
        >
          Cancel review
        </button>
        <button
          type="button"
          disabled={
            snapshot.pending || !warningComplete || !consentComplete ||
            blockers > 0
          }
          onClick={() => { void controller.confirmReview() }}
        >
          {snapshot.pending ? 'Working…' : `Confirm ${words(review.operation)}`}
        </button>
      </div>
    </section>
  )
}

function AttachmentStatus({
  inspection,
}: Readonly<{
  inspection: Extract<AppCaseInsertPresetInspectionResult, { ok: true }>
}>) {
  if (inspection.status === 'detached') {
    return (
      <div className="case-layout-preset-status">
        <strong>Detached</strong>
        <p>No Case layout preset is attached.</p>
      </div>
    )
  }
  return (
    <div className="case-layout-preset-status">
      <strong>Attached</strong>
      <dl className="template-metrics">
        <div><dt>Preset</dt><dd>{inspection.configuration.preset.id}</dd></div>
        <div><dt>Revision</dt><dd>{inspection.configuration.preset.revision}</dd></div>
        <div><dt>Application revision</dt><dd>{inspection.applicationRevision}</dd></div>
        <div><dt>Catalog</dt><dd>{recoveryStatusLabel(inspection)}</dd></div>
      </dl>
      {inspection.customization.ok ? (
        <p className="hint">
          {inspection.customization.summary.customizedFieldCount} of{' '}
          {inspection.customization.summary.fieldCount} preset-owned field(s)
          {' '}are customized.
        </p>
      ) : (
        <p className="case-layout-preset-error">
          Customization status unavailable: {inspection.customization.code}
        </p>
      )}
    </div>
  )
}

export function CaseInsertLayoutPresetsPanel({
  controller,
}: Readonly<{
  controller: CaseInsertPresetPresentationController
}>) {
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  const { detailsRef, controlRef } =
    useRegisteredWorkflowNavigationControl<HTMLSelectElement>({
      workflowId: 'workflow.case-layout-presets',
      ownerId: 'owner.case-layout-presets',
      controlId: 'control.case-layout-presets.selector',
    })
  const selectorRef = useRef<HTMLSelectElement | null>(null)
  const reviewHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const errorRef = useRef<HTMLDivElement | null>(null)
  const statusRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => controller.synchronize())

  useLayoutEffect(() => {
    const target = snapshot.focusRequest?.target
    if (!target) return
    const element = target === 'selector'
      ? selectorRef.current
      : target === 'review-heading'
        ? reviewHeadingRef.current
        : target === 'error-summary'
          ? errorRef.current
          : statusRef.current
    element?.focus({ preventScroll: false })
  }, [snapshot.focusRequest])

  const inspection = snapshot.inspection
  const attached = inspection.ok && inspection.status === 'attached'
    ? inspection
    : null
  const canReapply = attached !== null &&
    attached.customization.ok &&
    (attached.recoveryStatus.status === 'current' ||
      attached.recoveryStatus.status === 'stale')
  const policiesComplete = snapshot.reapplyPolicies.every(({ policy }) =>
    policy !== null)

  return (
    <EditorPanel detailsRef={detailsRef} title="Case Layout Presets">
      <div ref={statusRef} tabIndex={-1}>
        {inspection.ok ? (
          <AttachmentStatus inspection={inspection} />
        ) : (
          <div className="case-layout-preset-error" role="alert">
            <strong>Case layout presets unavailable</strong>
            <p>{inspection.code}</p>
          </div>
        )}
      </div>

      {snapshot.notice && snapshot.notice.kind === 'status' ? (
        <p className="case-layout-preset-result" role="status">
          {snapshot.notice.message}
        </p>
      ) : null}

      {inspection.ok ? (
        <>
          <label className="field-label spacing-top" htmlFor="case-layout-preset-selector">
            Preset
          </label>
          <select
            id="case-layout-preset-selector"
            ref={(element) => {
              selectorRef.current = element
              controlRef(element)
            }}
            value={snapshot.selectedOptionValue}
            disabled={snapshot.pending}
            onChange={(event) => controller.selectOption(event.target.value)}
          >
            <option value="">Choose a preset</option>
            {snapshot.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.name} (revision {option.revision})
              </option>
            ))}
          </select>
          <p className="hint">
            Selection is temporary and never changes the project by itself.
          </p>
        </>
      ) : null}

      {!snapshot.review && inspection.ok && inspection.status === 'detached' ? (
        <>
          <button
            className="secondary-button"
            type="button"
            disabled={snapshot.selectedOptionValue === '' || snapshot.pending}
            onClick={() => controller.beginApplyReview()}
          >
            Review complete preset
          </button>
        </>
      ) : null}

      {!snapshot.review && attached ? (
        <>
          {snapshot.reapplyPolicies.length > 0 ? (
            <fieldset className="case-layout-preset-decisions">
              <legend>Customized field choices for Reapply</legend>
              {snapshot.reapplyPolicies.map(({ key, field, policy }) => (
                <label className="field-label" key={key}>
                  {addressLabel(field.address)}
                  <select
                    value={policy ?? ''}
                    disabled={snapshot.pending || !canReapply}
                    onChange={(event) => controller.setReapplyPolicy(
                      key,
                      event.target.value === ''
                        ? null
                        : event.target.value as
                          | 'preserve-current-customization'
                          | 'overwrite-with-selected-preset',
                    )}
                  >
                    <option value="">Choose Preserve or Overwrite</option>
                    <option value="preserve-current-customization">
                      Preserve current customization
                    </option>
                    <option value="overwrite-with-selected-preset">
                      Overwrite with saved preset revision
                    </option>
                  </select>
                </label>
              ))}
            </fieldset>
          ) : null}
          {!canReapply ? (
            <p className="hint">
              Reapply is unavailable for this catalog status. Detach remains
              available and does not require a catalog definition.
            </p>
          ) : null}
          <div className="button-row case-layout-preset-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!canReapply || !policiesComplete || snapshot.pending}
              onClick={() => controller.beginReapplyReview()}
            >
              Review Reapply
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={snapshot.pending}
              onClick={() => controller.beginDetachReview()}
            >
              Review Detach
            </button>
          </div>
        </>
      ) : null}

      {snapshot.review ? (
        <ReviewPanel
          snapshot={snapshot}
          controller={controller}
          headingRef={reviewHeadingRef}
          errorRef={errorRef}
        />
      ) : snapshot.notice?.kind === 'error' ? (
        <div
          className="case-layout-preset-error"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          <strong>Case layout preset action unavailable</strong>
          <p>{snapshot.notice.message}</p>
          <code>{snapshot.notice.code}</code>
        </div>
      ) : null}
    </EditorPanel>
  )
}
