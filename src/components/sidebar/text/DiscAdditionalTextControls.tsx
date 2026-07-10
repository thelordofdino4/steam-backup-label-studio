import type { Ref } from 'react'
import {
  type DiscTextKey,
} from '../../../discText/index'
import { DiscTextControl } from '../DiscTextControl'
import type { TextPanelProps } from '../textPanelTypes'

const DISC_ADDITIONAL_TEXT_KEYS = [
  'subtitle',
  'discNumber',
  'backupDate',
  'appId',
  'developer',
  'publisher',
  'installNotes',
  'customNote',
] as const satisfies readonly DiscTextKey[]

type DiscAdditionalTextControlsProps = TextPanelProps & {
  customNoteEnableControlRef?: Ref<HTMLInputElement>
}

export function DiscAdditionalTextControls({
  customNoteEnableControlRef,
  ...props
}: DiscAdditionalTextControlsProps) {
  return (
    <div className="editor-text-control-list">
      {DISC_ADDITIONAL_TEXT_KEYS.map((textKey) => (
        <DiscTextControl
          enableControlRef={
            textKey === 'customNote' ? customNoteEnableControlRef : undefined
          }
          key={textKey}
          textKey={textKey}
          {...props}
        />
      ))}
    </div>
  )
}
