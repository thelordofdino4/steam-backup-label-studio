import assert from 'node:assert/strict'
import test from 'node:test'
import type { SetStateAction } from 'react'
import type {
  CaseInsertPreviewTextTarget,
} from '../caseInsert/previewTextSelection.ts'
import {
  createDefaultProjectJewelCaseState,
} from '../project/projectCaseInsert.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  createCaseInsertPreviewTextHandlers,
} from './appCaseInsertPreviewTextHandlers.ts'

function applyProjectUpdate(
  current: ProjectJewelCaseState,
  update: SetStateAction<ProjectJewelCaseState>,
) {
  return typeof update === 'function' ? update(current) : update
}

test('case insert preview text handlers preserve draft update routing', () => {
  let caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  let selectedTarget: CaseInsertPreviewTextTarget | null | undefined
  const target: CaseInsertPreviewTextTarget = {
    scope: 'templateTextBlock',
    paneId: 'cover',
    textBlockId: 'cover-title-text',
  }
  const handlers = createCaseInsertPreviewTextHandlers({
    projectJewelCase: caseInsert,
    projectMetadata: createDefaultProjectMetadata(),
    setProjectJewelCase: (update) => {
      caseInsert = applyProjectUpdate(caseInsert, update)
    },
    setSelectedCaseInsertTextTarget: (nextTarget) => {
      selectedTarget = nextTarget
    },
    resetSpineTitleLayout: () => {},
    resetTemplateTextBlockLayout: () => {},
  })

  handlers.handleCaseInsertPreviewTextValueChange(target, 'Custom title')
  const editedTitle = caseInsert.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )

  assert.equal(editedTitle?.value, 'Custom title')
  assert.equal(editedTitle?.source, 'manual')

  selectedTarget = target
  assert.equal(selectedTarget, target)
  handlers.handleCaseInsertPreviewTextEnabledChange(target, false)
  const disabledTitle = caseInsert.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )

  assert.equal(disabledTitle?.enabled, false)
  assert.equal(selectedTarget, null)
})

test('case insert preview text reset layout routes to target-specific editors', () => {
  const calls: string[] = []
  const handlers = createCaseInsertPreviewTextHandlers({
    projectJewelCase: createDefaultProjectJewelCaseState('Portal 2'),
    projectMetadata: createDefaultProjectMetadata(),
    setProjectJewelCase: () => {},
    setSelectedCaseInsertTextTarget: () => {},
    resetSpineTitleLayout: (side) => {
      calls.push(`spine:${side}`)
    },
    resetTemplateTextBlockLayout: (paneId, textBlockId) => {
      calls.push(`template:${paneId}:${textBlockId}`)
    },
  })

  handlers.handleCaseInsertPreviewTextResetLayout({
    scope: 'spineTitle',
    side: 'left',
  })
  handlers.handleCaseInsertPreviewTextResetLayout({
    scope: 'templateTextBlock',
    paneId: 'tray',
    textBlockId: 'tray-description',
  })
  handlers.handleCaseInsertPreviewTextResetLayout({
    scope: 'spineTextBlock',
    side: 'right',
    textBlockId: 'right-spine-subtitle-text',
  })

  assert.deepEqual(calls, [
    'spine:left',
    'template:tray:tray-description',
  ])
})
