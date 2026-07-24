import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react'

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
import { useEditorRoleFocus } from '../editor/editorRoleFocusContext.ts'

type DiscGuidedPlaceholderActionsProps = {
  placeholders: readonly DiscGuidedPlaceholderViewModel[]
  workflowRevision: object
  onOmitSlot: (slotId: DiscGuidedSlotId) => void
  fallbackFocusRef: RefObject<HTMLElement | null>
}

type DiscGuidedPlaceholderSetupMenuProps = {
  actionViewModel: DiscGuidedPlaceholderActionViewModel
  firstItemRef: RefObject<HTMLButtonElement | null>
  menuId: string
  onClose: () => void
  onOmit: () => void
  onSetup: (action: DiscGuidedSetupAction) => void
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

export function DiscGuidedPlaceholderSetupMenu({
  actionViewModel,
  firstItemRef,
  menuId,
  onClose,
  onOmit,
  onSetup,
}: DiscGuidedPlaceholderSetupMenuProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return

    event.preventDefault()
    event.stopPropagation()
    onClose()
  }

  return (
    <div
      id={menuId}
      className="disc-guided-placeholder-setup-popover"
      style={getPopoverAnchorStyle(actionViewModel.actionGeometry)}
      role="menu"
      aria-label={`${actionViewModel.label} setup menu`}
      onKeyDown={handleKeyDown}
    >
      <p>{actionViewModel.setup.label}</p>
      <div className="disc-guided-placeholder-setup-actions">
        {actionViewModel.setup.actions.map((action, index) => (
          <button
            key={action.id}
            ref={index === 0 ? firstItemRef : undefined}
            type="button"
            role="menuitem"
            onClick={() => onSetup(action)}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          role="menuitem"
          aria-label={`Remove ${actionViewModel.label} from layout`}
          onClick={onOmit}
        >
          Remove from layout
        </button>
      </div>
    </div>
  )
}

export function DiscGuidedPlaceholderActions({
  placeholders,
  workflowRevision,
  onOmitSlot,
  fallbackFocusRef,
}: DiscGuidedPlaceholderActionsProps) {
  const { requestRoleFocus } = useEditorRoleFocus()
  const menuId = `disc-guided-placeholder-setup-${useId().replaceAll(':', '')}`
  const originButtonRefs = useRef(new Map<DiscGuidedSlotId, HTMLButtonElement>())
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null)
  const pendingFocusSlotIdsRef = useRef<readonly DiscGuidedSlotId[] | null>(null)
  const previousWorkflowRevisionRef = useRef(workflowRevision)
  const previousOpenSlotIdRef = useRef<DiscGuidedSlotId | null>(null)
  const [openMenu, setOpenMenu] = useState<Readonly<{
    slotId: DiscGuidedSlotId
  }> | null>(null)
  const openSlotId = openMenu?.slotId ?? null
  const actions = useMemo(
    () => createDiscGuidedPlaceholderActionViewModels(placeholders),
    [placeholders],
  )
  const actionSlotSignature = actions.map(({ slotId }) => slotId).join('|')
  const [renderedActionSlotSignature, setRenderedActionSlotSignature] =
    useState(actionSlotSignature)

  if (renderedActionSlotSignature !== actionSlotSignature) {
    setRenderedActionSlotSignature(actionSlotSignature)
    if (openSlotId && !actions.some(({ slotId }) => slotId === openSlotId)) {
      setOpenMenu(null)
    }
  }

  const openAction = openSlotId
    ? actions.find(({ slotId }) => slotId === openSlotId) ?? null
    : null

  useLayoutEffect(() => {
    if (openAction) {
      firstMenuItemRef.current?.focus({ preventScroll: true })
    }
  }, [openAction])

  useLayoutEffect(() => {
    const previousOpenSlotId = previousOpenSlotIdRef.current
    previousOpenSlotIdRef.current = openSlotId

    if (
      previousOpenSlotId &&
      !openSlotId &&
      !actions.some(({ slotId }) => slotId === previousOpenSlotId) &&
      !pendingFocusSlotIdsRef.current
    ) {
      fallbackFocusRef.current?.focus({ preventScroll: true })
    }
  }, [actionSlotSignature, actions, fallbackFocusRef, openSlotId])

  useLayoutEffect(() => {
    const pendingSlotIds = pendingFocusSlotIdsRef.current

    if (!pendingSlotIds) return

    pendingFocusSlotIdsRef.current = null
    const nextButton = pendingSlotIds
      .map((slotId) => originButtonRefs.current.get(slotId))
      .find((button) => Boolean(button))

    if (nextButton) {
      nextButton.focus({ preventScroll: true })
    } else {
      fallbackFocusRef.current?.focus({ preventScroll: true })
    }
  }, [actions, fallbackFocusRef])

  useLayoutEffect(() => {
    if (previousWorkflowRevisionRef.current === workflowRevision) return

    previousWorkflowRevisionRef.current = workflowRevision
    if (!pendingFocusSlotIdsRef.current && openSlotId) {
      const origin = originButtonRefs.current.get(openSlotId)
      ;(origin ?? fallbackFocusRef.current)?.focus({ preventScroll: true })
    }
    setOpenMenu(null)
  }, [fallbackFocusRef, openSlotId, workflowRevision])

  function closeMenuAndReturnFocus() {
    const origin = openSlotId
      ? originButtonRefs.current.get(openSlotId)
      : null

    setOpenMenu(null)
    ;(origin ?? fallbackFocusRef.current)?.focus({ preventScroll: true })
  }

  function dispatchSetupAction(action: DiscGuidedSetupAction) {
    setOpenMenu(null)
    requestRoleFocus(action.request)
  }

  function omitOpenSlot() {
    if (!openAction) return

    const currentIndex = actions.findIndex(
      ({ slotId }) => slotId === openAction.slotId,
    )
    const nextSlotIds = actions
      .slice(currentIndex + 1)
      .map(({ slotId }) => slotId)
    const previousSlotIds = actions
      .slice(0, currentIndex)
      .reverse()
      .map(({ slotId }) => slotId)

    pendingFocusSlotIdsRef.current = [...nextSlotIds, ...previousSlotIds]
    setOpenMenu(null)
    onOmitSlot(openAction.slotId)
  }

  if (actions.length === 0) {
    return null
  }

  return (
    <>
      <div className="disc-guided-placeholder-action-layer">
        {actions.map((actionViewModel) => {
          const isOpen = openAction?.slotId === actionViewModel.slotId
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
              aria-expanded={isOpen}
              aria-haspopup="menu"
              aria-controls={isOpen ? menuId : undefined}
              data-guided-slot-id={actionViewModel.slotId}
              data-guided-lifecycle={actionViewModel.lifecycle}
              draggable={false}
              onClick={() => {
                setOpenMenu({ slotId: actionViewModel.slotId })
              }}
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

      {openAction ? (
        <DiscGuidedPlaceholderSetupMenu
          actionViewModel={openAction}
          firstItemRef={firstMenuItemRef}
          menuId={menuId}
          onClose={closeMenuAndReturnFocus}
          onOmit={omitOpenSlot}
          onSetup={dispatchSetupAction}
        />
      ) : null}
    </>
  )
}
