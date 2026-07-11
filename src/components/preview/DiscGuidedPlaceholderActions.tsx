import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { useEditorRoleFocus } from '../editor/editorRoleFocusContext.ts'
import type {
  DiscGuidedRectGeometry,
} from '../../guidedPresets/discGuidedLayouts.ts'
import type {
  DiscGuidedPlaceholderViewModel,
} from '../../guidedPresets/discGuidedPlaceholderViewModel.ts'
import {
  createDiscGuidedPlaceholderActionViewModels,
  type DiscGuidedPlaceholderActionViewModel,
  type DiscGuidedSetupAction,
} from '../../guidedPresets/discGuidedPlaceholderSetup.ts'
import type { DiscGuidedSlotId } from '../../guidedPresets/discGuidedSlots.ts'

type DiscGuidedPlaceholderActionsProps = {
  placeholders: readonly DiscGuidedPlaceholderViewModel[]
}

function getActionRegionStyle(
  geometry: DiscGuidedRectGeometry,
): CSSProperties {
  return {
    left: `${geometry.centerXPercent - geometry.widthPercent / 2}%`,
    top: `${geometry.centerYPercent - geometry.heightPercent / 2}%`,
    width: `${geometry.widthPercent}%`,
    height: `${geometry.heightPercent}%`,
    transform: `rotate(${geometry.rotationDegrees ?? 0}deg)`,
  }
}

function getPopoverAnchorStyle(
  geometry: DiscGuidedRectGeometry,
): CSSProperties {
  const placeAbove = geometry.centerYPercent >= 60
  const edgeY = placeAbove
    ? geometry.centerYPercent - geometry.heightPercent / 2
    : geometry.centerYPercent + geometry.heightPercent / 2

  return {
    left: `${geometry.centerXPercent}%`,
    top: `${edgeY}%`,
    transform: placeAbove
      ? 'translate(-50%, calc(-100% - 8px))'
      : 'translate(-50%, 8px)',
  }
}

export function DiscGuidedPlaceholderActions({
  placeholders,
}: DiscGuidedPlaceholderActionsProps) {
  const { requestRoleFocus } = useEditorRoleFocus()
  const popoverId = `disc-guided-placeholder-setup-${useId().replaceAll(':', '')}`
  const originButtonRefs = useRef(new Map<DiscGuidedSlotId, HTMLButtonElement>())
  const firstChoiceRef = useRef<HTMLButtonElement | null>(null)
  const [openAction, setOpenAction] =
    useState<DiscGuidedPlaceholderActionViewModel | null>(null)
  const actions = useMemo(
    () => createDiscGuidedPlaceholderActionViewModels(placeholders),
    [placeholders],
  )
  const projectedOpenAction = openAction && actions.includes(openAction)
    ? openAction
    : null
  const openChoiceSetup = projectedOpenAction?.setup.kind === 'choice'
    ? projectedOpenAction.setup
    : null
  const openChoice = openChoiceSetup ? projectedOpenAction : null

  useLayoutEffect(() => {
    if (openChoice) {
      firstChoiceRef.current?.focus({ preventScroll: true })
    }
  }, [openChoice])

  function closeChoiceAndReturnFocus() {
    const origin = openChoice
      ? originButtonRefs.current.get(openChoice.slotId)
      : null

    setOpenAction(null)
    origin?.focus({ preventScroll: true })
  }

  function dispatchSetupAction(action: DiscGuidedSetupAction) {
    setOpenAction(null)
    requestRoleFocus(action.request)
  }

  function activatePlaceholder(
    actionViewModel: DiscGuidedPlaceholderActionViewModel,
  ) {
    if (actionViewModel.setup.kind === 'direct') {
      dispatchSetupAction(actionViewModel.setup.action)
      return
    }

    setOpenAction(actionViewModel)
  }

  function handlePopoverKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return

    event.preventDefault()
    event.stopPropagation()
    closeChoiceAndReturnFocus()
  }

  if (actions.length === 0) {
    return null
  }

  return (
    <>
      <div className="disc-guided-placeholder-action-layer">
        {actions.map((actionViewModel) => {
          const isChoice = actionViewModel.setup.kind === 'choice'
          const isOpen = openChoice?.slotId === actionViewModel.slotId
          const suggestedDescriptionId =
            `disc-guided-placeholder-suggested-${actionViewModel.slotId}`

          return (
            <button
              key={actionViewModel.slotId}
              ref={(element) => {
                if (element) {
                  originButtonRefs.current.set(actionViewModel.slotId, element)
                } else {
                  originButtonRefs.current.delete(actionViewModel.slotId)
                }
              }}
              type="button"
              className="disc-guided-placeholder-action"
              style={getActionRegionStyle(actionViewModel.actionGeometry)}
              aria-label={actionViewModel.label}
              aria-describedby={
                actionViewModel.lifecycle === 'suggested'
                  ? suggestedDescriptionId
                  : undefined
              }
              aria-expanded={isChoice ? isOpen : undefined}
              aria-haspopup={isChoice ? 'dialog' : undefined}
              aria-controls={isChoice && isOpen ? popoverId : undefined}
              data-guided-slot-id={actionViewModel.slotId}
              data-guided-lifecycle={actionViewModel.lifecycle}
              draggable={false}
              onClick={() => activatePlaceholder(actionViewModel)}
            >
              {actionViewModel.lifecycle === 'suggested' ? (
                <span
                  id={suggestedDescriptionId}
                  className="disc-guided-placeholder-accessible-status"
                >
                  Suggested. Opens setup without accepting automatically.
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {openChoice && openChoiceSetup ? (
        <div
          id={popoverId}
          className="disc-guided-placeholder-setup-popover"
          style={getPopoverAnchorStyle(openChoice.actionGeometry)}
          role="dialog"
          aria-label={openChoiceSetup.label}
          onKeyDown={handlePopoverKeyDown}
        >
          <p>{openChoiceSetup.label}</p>
          <div className="disc-guided-placeholder-setup-actions">
            {openChoiceSetup.actions.map((action, index) => (
              <button
                key={action.id}
                ref={index === 0 ? firstChoiceRef : undefined}
                type="button"
                onClick={() => dispatchSetupAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
