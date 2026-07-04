import type {
  PointerEvent,
  Ref,
  SyntheticEvent,
} from 'react'
import {
  CONTEXTUAL_TEXT_CONTROL_GROUPS,
} from '../../text/contextualTextControlViewModel'
import { TrashIcon } from '../sidebar/PanelIcons'
import {
  getContextualTextRibbonTabDisplayLabel,
} from './contextualTextRibbonModel'
import {
  keepInlineTextEditorFocus,
  stopInlineTextEditorClick,
  stopInlineTextEditorPointer,
} from './inlinePreviewTextRibbonControls'
import type {
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorTab,
} from './inlinePreviewTextEditorContract'
import {
  InlinePreviewTextEditorMenuContent,
} from './inlinePreviewTextEditorMenuContent'

const INLINE_TEXT_EDITOR_TABS = CONTEXTUAL_TEXT_CONTROL_GROUPS

type InlinePreviewTextEditorRibbonProps = {
  activeTab: InlinePreviewTextEditorTab
  controls: InlinePreviewTextEditorControls | undefined
  getCommandSelection: () => InlinePreviewTextEditorSelectionRange
  isCurvedText: boolean
  selection: InlinePreviewTextEditorSelectionRange
  sourceDraft: string
  tabsRef: Ref<HTMLDivElement>
  onDone: () => void
  onRibbonControlInteraction: (event: SyntheticEvent<Element>) => void
  onRibbonKeyboardInteraction: () => void
  onRibbonMenuRef: (element: HTMLDivElement | null) => void
  onRibbonPointerDown: () => void
  onRetainTextareaSelectionForCommands: () => void
  onSelectionChange: (selection: InlinePreviewTextEditorSelectionRange) => void
  onSourceDraftChange: (sourceDraft: string) => void
  onTabChange: (tab: InlinePreviewTextEditorTab) => void
}

export function InlinePreviewTextEditorRibbon({
  activeTab,
  controls,
  getCommandSelection,
  isCurvedText,
  selection,
  sourceDraft,
  tabsRef,
  onDone,
  onRibbonControlInteraction,
  onRibbonKeyboardInteraction,
  onRibbonMenuRef,
  onRibbonPointerDown,
  onRetainTextareaSelectionForCommands,
  onSelectionChange,
  onSourceDraftChange,
  onTabChange,
}: InlinePreviewTextEditorRibbonProps) {
  const deleteAction = controls?.deleteAction
  const deleteLabel = deleteAction?.label ?? 'Delete'
  const deleteAriaLabel = deleteAction?.ariaLabel ?? deleteLabel
  const handleRibbonPointerDown = (event: PointerEvent<Element>) => {
    onRibbonPointerDown()
    stopInlineTextEditorPointer(event)
  }

  return (
    <>
      <div
        ref={tabsRef}
        className="contextual-text-ribbon-tabs"
        data-smoke-id="inline-text-tabs"
        onClick={stopInlineTextEditorClick}
        onPointerDownCapture={onRetainTextareaSelectionForCommands}
        onPointerDown={keepInlineTextEditorFocus}
      >
        {INLINE_TEXT_EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            className={[
              'contextual-text-ribbon-tab',
              activeTab === tab.id ? 'is-active' : '',
            ].filter(Boolean).join(' ')}
            data-smoke-id={`inline-text-tab-${tab.id}`}
            title={tab.label}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onTabChange(tab.id)
            }}
          >
            {getContextualTextRibbonTabDisplayLabel(tab.id)}
          </button>
        ))}
      </div>
      <div
        ref={onRibbonMenuRef}
        className="contextual-text-ribbon-controls"
        data-smoke-id="inline-text-menu"
        onClick={stopInlineTextEditorClick}
        onFocusCapture={onRibbonControlInteraction}
        onKeyDownCapture={onRibbonKeyboardInteraction}
        onPointerDownCapture={onRetainTextareaSelectionForCommands}
        onPointerDown={handleRibbonPointerDown}
      >
        <InlinePreviewTextEditorMenuContent
          activeTab={activeTab}
          controls={controls}
          getCommandSelection={getCommandSelection}
          selection={selection}
          isCurvedText={isCurvedText}
          sourceDraft={sourceDraft}
          onSourceDraftChange={onSourceDraftChange}
          onSelectionChange={onSelectionChange}
        />
        <div className="contextual-text-ribbon-actions">
          {deleteAction ? (
            <button
              type="button"
              className="contextual-text-ribbon-action contextual-text-ribbon-action--danger inline-preview-text-delete-button"
              aria-label={deleteAriaLabel}
              data-smoke-id="inline-text-delete"
              title={deleteAriaLabel}
              onClick={(event) => {
                event.stopPropagation()
                deleteAction.onDelete()
              }}
              onPointerDown={keepInlineTextEditorFocus}
            >
              <TrashIcon />
              <span className="contextual-text-ribbon-action-label--visually-hidden">
                {deleteLabel}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className="contextual-text-ribbon-action inline-preview-text-done-button"
            data-smoke-id="inline-text-done"
            onClick={(event) => {
              event.stopPropagation()
              onDone()
            }}
            onPointerDown={keepInlineTextEditorFocus}
          >
            Done
          </button>
        </div>
      </div>
    </>
  )
}
