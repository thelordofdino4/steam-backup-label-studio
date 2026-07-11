import {
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from 'react'
import { DiscAdditionalTextControls } from '../sidebar/text/DiscAdditionalTextControls.tsx'
import {
  registerDiscAdditionalTextFocusTarget,
} from './discFixedTextRoleFocusRegistration.ts'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export type DiscAdditionalTextRoleControlsProps = {
  textControls: ComponentProps<typeof DiscAdditionalTextControls>
}

export function DiscAdditionalTextRoleControls({
  textControls,
}: DiscAdditionalTextRoleControlsProps) {
  const { registerFocusTarget } = useEditorRoleFocus()
  const customNoteRef = useRef<HTMLInputElement | null>(null)

  useLayoutEffect(() => registerDiscAdditionalTextFocusTarget({
    customNoteElement: () => customNoteRef.current,
    registerFocusTarget,
  }), [registerFocusTarget])

  return (
    <DiscAdditionalTextControls
      {...textControls}
      customNoteEnableControlRef={customNoteRef}
    />
  )
}
