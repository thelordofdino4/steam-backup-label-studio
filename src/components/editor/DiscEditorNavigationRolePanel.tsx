import {
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { DiscRolePresetRole } from '../../layout/discRolePresets.ts'
import { EditorNavigationRolePanel } from './EditorNavigationShell.tsx'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export type DiscEditorNavigationRolePanelProps = {
  children?: ReactNode
  label: string
  roleId: DiscRolePresetRole
  smokeId: string
}

export function DiscEditorNavigationRolePanel({
  children,
  label,
  roleId,
  smokeId,
}: DiscEditorNavigationRolePanelProps) {
  const {
    isRoleOpen,
    registerRolePanel,
    setRoleOpen,
  } = useEditorRoleFocus()
  const detailsRef = useRef<HTMLDetailsElement | null>(null)
  const summaryRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => registerRolePanel(roleId, {
    detailsElement: () => detailsRef.current,
    summaryElement: () => summaryRef.current,
  }), [registerRolePanel, roleId])

  return (
    <EditorNavigationRolePanel
      label={label}
      smokeId={smokeId}
      open={isRoleOpen(roleId)}
      onOpenChange={(open) => setRoleOpen(roleId, open)}
      detailsRef={detailsRef}
      summaryRef={summaryRef}
    >
      {children}
    </EditorNavigationRolePanel>
  )
}
