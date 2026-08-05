import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const hostSource = await readFile(
  new URL('./ApplicationWorkflowHost.tsx', import.meta.url),
  'utf8',
)
const storeSource = await readFile(
  new URL('../../editor/applicationWorkflowNavigationStore.ts', import.meta.url),
  'utf8',
)
const appSource = await readFile(
  new URL('../../app/App.tsx', import.meta.url),
  'utf8',
)
const caseSource = await readFile(
  new URL('../caseInsert/CaseInsertEditorShell.tsx', import.meta.url),
  'utf8',
)

test('one nonmodal named host moves one stable portal presentation and exposes Close', () => {
  assert.match(hostSource, /className="application-workflow-host"/)
  assert.match(hostSource, /role="region"/)
  assert.match(hostSource, /aria-labelledby="application-workflow-host-heading"/)
  assert.doesNotMatch(hostSource, /aria-modal/)
  assert.match(hostSource, /createPortal\(children, container\)/)
  assert.match(hostSource, /target\.appendChild\(container\)/)
  assert.match(hostSource, /closeActiveWorkflow/)
})

test('committed navigation focuses registered controls without polling or timers', () => {
  assert.match(storeSource, /presentationCommitted/)
  assert.match(storeSource, /focusApplicationSurface/)
  assert.match(storeSource, /focusControl\.focus\(\{ preventScroll: false \}\)/)
  assert.match(hostSource, /pendingRequestId/)
  assert.doesNotMatch(
    `${hostSource}\n${storeSource}`,
    /setTimeout|setInterval/,
  )
})

test('Disc and Case retain sidebar outlets for existing controlled panels', () => {
  for (const workflowId of [
    'workflow.game',
    'workflow.disc-template',
    'workflow.disc-layout-presets',
    'workflow.export-options',
  ]) {
    assert.match(appSource, new RegExp(
      `WorkflowPresentationOutlet workflowId="${workflowId}"`,
    ))
  }
  assert.match(caseSource,
    /workflowId="workflow\.game"[\s\S]*<GamePanel/)
  assert.match(caseSource,
    /workflowId="workflow\.export-options"[\s\S]*<CaseInsertExportOptionsPanel/)
  assert.match(caseSource,
    /workflowId="workflow\.case-layout-presets"[\s\S]*<CaseInsertLayoutPresetsPanel/)
  assert.equal((appSource.match(/<ApplicationWorkflowHostBoundary/g) ?? []).length, 2)
  assert.doesNotMatch(
    `${hostSource}\n${storeSource}`,
    /handleSteamSearch|handleSteamImport|handleTemplateChange|onApplyPreset|handleExportGuideToggle/,
  )
})
