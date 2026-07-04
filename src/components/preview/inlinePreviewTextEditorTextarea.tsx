import type {
  CSSProperties,
  ChangeEventHandler,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactEventHandler,
  Ref,
} from 'react'
import type {
  InlinePreviewTextEditorInputMode,
} from './inlinePreviewTextEditorContract'

type InlinePreviewTextEditorTextareaProps = {
  ariaLabel: string
  inputMode: InlinePreviewTextEditorInputMode
  readOnly: boolean
  textareaRef: Ref<HTMLTextAreaElement>
  textareaStyle?: CSSProperties
  value: string
  onBlur: FocusEventHandler<HTMLTextAreaElement>
  onChange: ChangeEventHandler<HTMLTextAreaElement>
  onClick: MouseEventHandler<HTMLTextAreaElement>
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>
  onKeyUp: KeyboardEventHandler<HTMLTextAreaElement>
  onPointerDown?: PointerEventHandler<HTMLTextAreaElement>
  onPointerUp: PointerEventHandler<HTMLTextAreaElement>
  onSelect: ReactEventHandler<HTMLTextAreaElement>
}

export function InlinePreviewTextEditorTextarea({
  ariaLabel,
  inputMode,
  readOnly,
  textareaRef,
  textareaStyle,
  value,
  onBlur,
  onChange,
  onClick,
  onKeyDown,
  onKeyUp,
  onPointerDown,
  onPointerUp,
  onSelect,
}: InlinePreviewTextEditorTextareaProps) {
  return (
    <textarea
      ref={textareaRef}
      aria-label={ariaLabel}
      className={[
        'inline-preview-textarea',
        inputMode === 'adapter'
          ? 'inline-preview-textarea--adapter'
          : '',
      ].filter(Boolean).join(' ')}
      data-smoke-id="inline-text-input"
      readOnly={readOnly || undefined}
      value={value}
      spellCheck={false}
      style={inputMode === 'overlay' ? textareaStyle : undefined}
      onBlur={onBlur}
      onChange={onChange}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onSelect={onSelect}
    />
  )
}
