import {
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from 'react'
import { DiscLegalTextControls } from '../sidebar/text/DiscLegalTextControls.tsx'
import {
  registerDiscLegalInfoFocusTarget,
} from './discFixedTextRoleFocusRegistration.ts'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export type DiscLegalInfoRoleControlsProps = {
  textControls: ComponentProps<typeof DiscLegalTextControls>
}

export function DiscLegalInfoRoleControls({
  textControls,
}: DiscLegalInfoRoleControlsProps) {
  const { registerFocusTarget } = useEditorRoleFocus()
  const copyrightRef = useRef<HTMLInputElement | null>(null)

  useLayoutEffect(() => registerDiscLegalInfoFocusTarget({
    copyrightElement: () => copyrightRef.current,
    registerFocusTarget,
  }), [registerFocusTarget])

  return (
    <DiscLegalTextControls
      {...textControls}
      enableControlRef={copyrightRef}
    />
  )
}
