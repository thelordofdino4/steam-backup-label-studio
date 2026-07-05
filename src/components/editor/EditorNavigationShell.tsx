import type { ReactNode } from 'react'
import type {
  CaseInsertNavigationSurfaceId,
} from '../../editor/editorNavigationShell.ts'
import { EditorPanel } from './EditorPanel.tsx'
import {
  EDITOR_NAVIGATION_SHELL_SMOKE_IDS,
  getCaseInsertNavigationSurfaceTabItems,
} from './editorNavigationShellViewModel.ts'

export type EditorNavigationRolePanelProps = {
  children?: ReactNode
  label: string
  smokeId: string
}

export type CaseInsertSurfaceTabsProps = {
  activeSurfaceId: CaseInsertNavigationSurfaceId
  onSurfaceChange: (surfaceId: CaseInsertNavigationSurfaceId) => void
}

export function CaseInsertSurfaceTabs({
  activeSurfaceId,
  onSurfaceChange,
}: CaseInsertSurfaceTabsProps) {
  const surfaceItems = getCaseInsertNavigationSurfaceTabItems(activeSurfaceId)

  return (
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
}

export function EditorNavigationRolePanel({
  children,
  label,
  smokeId,
}: EditorNavigationRolePanelProps) {
  return (
    <EditorPanel title={label}>
      {children ?? (
        <p className="hint" data-smoke-id={smokeId}>
          Controls move here in #272/#274.
        </p>
      )}
    </EditorPanel>
  )
}
