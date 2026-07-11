import type { ReactNode } from 'react'
import type {
  CaseInsertNavigationSurfaceId,
} from '../../editor/editorNavigationShell.ts'
import {
  EditorPanel,
  type EditorPanelProps,
} from './EditorPanel.tsx'
import {
  EDITOR_NAVIGATION_SHELL_SMOKE_IDS,
  getCaseInsertNavigationSurfaceTabItems,
} from './editorNavigationShellViewModel.ts'

type EditorNavigationRolePanelControlProps = Pick<
  EditorPanelProps,
  'open' | 'onOpenChange' | 'detailsRef' | 'summaryRef'
>

export type EditorNavigationRolePanelProps =
  EditorNavigationRolePanelControlProps & {
    children?: ReactNode
    label: string
    smokeId: string
  }

export type CaseInsertSurfaceTabsProps = {
  activeSurfaceId: CaseInsertNavigationSurfaceId
  onSurfaceChange: (surfaceId: CaseInsertNavigationSurfaceId) => void
  supportedSurfaceIds?: readonly CaseInsertNavigationSurfaceId[]
  trailingAction?: ReactNode
}

export function CaseInsertSurfaceTabs({
  activeSurfaceId,
  onSurfaceChange,
  supportedSurfaceIds,
  trailingAction,
}: CaseInsertSurfaceTabsProps) {
  const surfaceItems = getCaseInsertNavigationSurfaceTabItems(
    activeSurfaceId,
    supportedSurfaceIds,
  )

  if (surfaceItems.length <= 1) {
    return null
  }

  const tabList = (
    <div
      className="case-insert-surface-tabs"
      role="tablist"
      aria-label="Case insert surfaces"
      data-smoke-id={EDITOR_NAVIGATION_SHELL_SMOKE_IDS.caseInsertSurfaceTabs}
    >
      {surfaceItems.map((surface) => (
        <button
          className={`case-insert-surface-tab${
            surface.active ? ' is-active' : ''
          }`}
          data-smoke-id={surface.smokeId}
          type="button"
          role="tab"
          aria-selected={surface.active}
          key={surface.id}
          onClick={() => onSurfaceChange(surface.id)}
        >
          {surface.label}
        </button>
      ))}
    </div>
  )

  if (!trailingAction) {
    return tabList
  }

  return (
    <div className="case-insert-surface-tabs-shell">
      {tabList}
      <div className="case-insert-surface-tabs-action">
        {trailingAction}
      </div>
    </div>
  )
}

export function EditorNavigationRolePanel({
  children,
  label,
  smokeId,
  open,
  onOpenChange,
  detailsRef,
  summaryRef,
}: EditorNavigationRolePanelProps) {
  return (
    <EditorPanel
      title={label}
      open={open}
      onOpenChange={onOpenChange}
      detailsRef={detailsRef}
      summaryRef={summaryRef}
    >
      {children ?? (
        <p className="hint" data-smoke-id={smokeId}>
          Controls move here in #272/#274.
        </p>
      )}
    </EditorPanel>
  )
}
