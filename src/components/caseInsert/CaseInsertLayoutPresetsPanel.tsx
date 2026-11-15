import {
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react'

import type {
  CaseInsertPresetPresentationController,
} from '../../app/caseInsertPresetPresentationController.ts'
import { EditorPanel } from '../editor/EditorPanel.tsx'
import {
  useRegisteredWorkflowNavigationControl,
} from '../editor/applicationWorkflowNavigation.ts'

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
  const errorRef = useRef<HTMLDivElement | null>(null)
  const statusRef = useRef<HTMLParagraphElement | null>(null)
  const actionDescriptionId = snapshot.notice?.kind === 'error'
    ? 'case-layout-preset-action-error'
    : snapshot.pending || snapshot.notice?.kind === 'status'
      ? 'case-layout-preset-action-status'
      : null
  const describedBy = [
    'case-layout-preset-help',
    actionDescriptionId,
  ].filter(Boolean).join(' ')

  useLayoutEffect(() => {
    const target = snapshot.focusRequest?.target
    if (!target) return
    const element = target === 'selector'
      ? selectorRef.current
      : target === 'error-summary'
        ? errorRef.current
        : statusRef.current
    element?.focus({ preventScroll: false })
  }, [snapshot.focusRequest])

  return (
    <EditorPanel detailsRef={detailsRef} title="Case Layout Presets">
      {snapshot.inspection.ok ? (
        <>
          <label
            className="field-label"
            htmlFor="case-layout-preset-selector"
          >
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
            aria-describedby={describedBy}
            aria-invalid={snapshot.notice?.kind === 'error'}
            onChange={(event) => controller.selectOption(event.target.value)}
          >
            <option value="">Choose a preset</option>
            {snapshot.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.name} (revision {option.revision})
              </option>
            ))}
          </select>
          <p id="case-layout-preset-help" className="hint">
            Applies the preset’s layout without replacing your content.
          </p>
          <button
            type="button"
            disabled={snapshot.selectedOptionValue === '' || snapshot.pending}
            aria-busy={snapshot.pending}
            aria-describedby={describedBy}
            onClick={() => { void controller.applySelectedPreset() }}
          >
            {snapshot.pending ? 'Applying…' : 'Apply preset'}
          </button>
        </>
      ) : (
        <div
          id="case-layout-preset-inspection-error"
          className="case-layout-preset-error"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          <strong>Case layout presets unavailable</strong>
          <p>Open a compatible Case project and try again.</p>
        </div>
      )}

      {snapshot.pending ? (
        <p
          id="case-layout-preset-action-status"
          className="case-layout-preset-result"
          ref={statusRef}
          role="status"
          tabIndex={-1}
        >
          Applying preset…
        </p>
      ) : snapshot.notice?.kind === 'status' ? (
        <p
          id="case-layout-preset-action-status"
          className="case-layout-preset-result"
          ref={statusRef}
          role="status"
          tabIndex={-1}
        >
          {snapshot.notice.message}
        </p>
      ) : null}

      {snapshot.notice?.kind === 'error' ? (
        <div
          id="case-layout-preset-action-error"
          className="case-layout-preset-error"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          <strong>Preset not applied</strong>
          <p>{snapshot.notice.message}</p>
        </div>
      ) : null}
    </EditorPanel>
  )
}
