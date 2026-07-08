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

export function DiscAdditionalTextControls(props: TextPanelProps) {
  return (
    <div className="editor-text-control-list">
      {DISC_ADDITIONAL_TEXT_KEYS.map((textKey) => (
        <DiscTextControl
          key={textKey}
          textKey={textKey}
          {...props}
        />
      ))}
    </div>
  )
}
