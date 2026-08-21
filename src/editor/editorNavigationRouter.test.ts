import assert from 'node:assert/strict'
import test from 'node:test'

import {
  completeEditorNavigationRequest,
  evaluateEditorNavigationIntent,
  projectEditorWorkflowCapabilities,
  validateEditorNavigationDestination,
  type EditorDestination,
  type EditorNavigationEnvironment,
  type EditorNavigationIntent,
} from './editorNavigationRouter.ts'

const DISC_GAME = Object.freeze({
  kind: 'domain-area',
  workspaceId: 'workspace.disc',
  surfaceId: 'surface.disc',
  areaId: 'area.game',
  ownerId: 'owner.game.search',
  controlId: 'control.game.query',
} as const satisfies EditorDestination)

const CASE_GAME = Object.freeze({
  kind: 'domain-area',
  workspaceId: 'workspace.case',
  surfaceId: 'surface.case.spine.right',
  areaId: 'area.game',
  ownerId: 'owner.game.search',
  controlId: 'control.game.query',
} as const satisfies EditorDestination)

const DISC_TEMPLATE = Object.freeze({
  kind: 'domain-area',
  workspaceId: 'workspace.disc',
  surfaceId: 'surface.disc',
  areaId: 'area.template.disc',
  ownerId: 'owner.disc-template',
  controlId: 'control.disc-template.selector',
} as const satisfies EditorDestination)

const DISC_PRESETS = Object.freeze({
  kind: 'domain-area',
  workspaceId: 'workspace.disc',
  surfaceId: 'surface.disc',
  areaId: 'area.layout-presets.disc',
  ownerId: 'owner.disc-layout-presets',
  controlId: 'control.disc-layout-presets.selector',
} as const satisfies EditorDestination)

const CASE_PRESETS = Object.freeze({
  kind: 'domain-area',
  workspaceId: 'workspace.case',
  surfaceId: 'surface.case.spine.left',
  areaId: 'area.layout-presets.case',
  ownerId: 'owner.case-layout-presets',
  controlId: 'control.case-layout-presets.selector',
} as const satisfies EditorDestination)

const CASE_EXPORT = Object.freeze({
  kind: 'domain-area',
  workspaceId: 'workspace.case',
  surfaceId: 'surface.case.spine.left',
  areaId: 'area.export',
  ownerId: 'owner.export.case-guides',
  controlId: 'control.export.case.tray-trim',
} as const satisfies EditorDestination)

function intent(
  workflowId: EditorNavigationIntent['workflowId'],
  destination: EditorDestination,
  behavior: EditorNavigationIntent['behavior'] = 'focus',
): EditorNavigationIntent {
  return Object.freeze({ workflowId, destination, behavior })
}

function environment(
  overrides: Partial<EditorNavigationEnvironment> = {},
): EditorNavigationEnvironment {
  return Object.freeze({
    sessionId: 'disc-session',
    workspaceId: 'workspace.disc',
    surfaceId: 'surface.disc',
    hostReady: true,
    lifecycleTransitionActive: false,
    applicationModalActive: false,
    hiddenWorkflowIds: Object.freeze([]),
    registrations: Object.freeze([
      {
        workflowId: 'workflow.game',
        ownerId: 'owner.game.search',
        controlId: 'control.game.query',
      },
      {
        workflowId: 'workflow.disc-template',
        ownerId: 'owner.disc-template',
        controlId: 'control.disc-template.selector',
      },
      {
        workflowId: 'workflow.disc-layout-presets',
        ownerId: 'owner.disc-layout-presets',
        controlId: 'control.disc-layout-presets.selector',
      },
      {
        workflowId: 'workflow.case-layout-presets',
        ownerId: 'owner.case-layout-presets',
        controlId: 'control.case-layout-presets.selector',
      },
      {
        workflowId: 'workflow.export-options',
        ownerId: 'owner.export.disc-guides',
        controlId: 'control.export.disc.center-hole',
      },
    ]),
    ...overrides,
  })
}

test('validates exact workflow, workspace, surface, area, owner, and control relationships', () => {
  for (const candidate of [
    intent('workflow.game', DISC_GAME),
    intent('workflow.disc-template', DISC_TEMPLATE),
    intent('workflow.disc-layout-presets', DISC_PRESETS),
    intent('workflow.case-layout-presets', CASE_PRESETS),
    intent('workflow.export-options', CASE_EXPORT),
  ]) {
    assert.deepEqual(validateEditorNavigationDestination(candidate), {
      status: 'ready',
    })
  }

  assert.deepEqual(validateEditorNavigationDestination(intent(
    'workflow.disc-template',
    { ...DISC_TEMPLATE, ownerId: 'owner.game.search' },
  )), { status: 'invalid', reason: 'invalid-owner-control' })
  assert.deepEqual(validateEditorNavigationDestination(intent(
    'workflow.game',
    { ...DISC_GAME, workspaceId: 'workspace.case' },
  )), { status: 'invalid', reason: 'invalid-relationship' })
})

test('returns every typed non-completed state and rechecks combined Spine safely', () => {
  const game = intent('workflow.game', DISC_GAME)
  assert.equal(evaluateEditorNavigationIntent(game, environment()).status, 'ready')
  assert.deepEqual(evaluateEditorNavigationIntent(game, environment({
    sessionId: null,
  })), {
    status: 'unavailable',
    destination: DISC_GAME,
    reason: 'no-active-session',
  })
  assert.equal(evaluateEditorNavigationIntent(game, environment({
    hostReady: false,
  })).status, 'unavailable')
  assert.equal(evaluateEditorNavigationIntent(game, environment({
    registrations: [],
  })).status, 'unavailable')
  assert.equal(evaluateEditorNavigationIntent(game, environment({
    lifecycleTransitionActive: true,
  })).status, 'unavailable')
  assert.equal(evaluateEditorNavigationIntent(game, environment({
    applicationModalActive: true,
  })).status, 'unavailable')
  assert.deepEqual(evaluateEditorNavigationIntent(game, environment({
    hiddenWorkflowIds: ['workflow.game'],
  })), {
    status: 'hidden',
    destination: DISC_GAME,
    reason: 'feature-disabled',
  })
  assert.deepEqual(evaluateEditorNavigationIntent(game, environment({
    workspaceId: 'workspace.case',
    surfaceId: 'surface.case.front',
  })), {
    status: 'editor-incompatible',
    destination: DISC_GAME,
    actualWorkspaceId: 'workspace.case',
  })

  const caseEnvironment = environment({
    sessionId: 'case-session',
    workspaceId: 'workspace.case',
    surfaceId: 'surface.case.spine',
    registrations: [{
      workflowId: 'workflow.game',
      ownerId: 'owner.game.search',
      controlId: 'control.game.query',
    }],
  })
  assert.equal(evaluateEditorNavigationIntent(
    intent('workflow.game', CASE_GAME),
    caseEnvironment,
  ).status, 'ready')
  assert.equal(evaluateEditorNavigationIntent(
    intent('workflow.case-layout-presets', CASE_PRESETS),
    {
      ...caseEnvironment,
      registrations: [{
        workflowId: 'workflow.case-layout-presets',
        ownerId: 'owner.case-layout-presets',
        controlId: 'control.case-layout-presets.selector',
      }],
    },
  ).status, 'ready')
})

test('capability projection is fail-closed without session, host, owner, or during modal/transition', () => {
  assert.ok(Object.values(projectEditorWorkflowCapabilities(environment()))
    .every((capability) => capability.canExecute))

  for (const blocked of [
    environment({ sessionId: null, workspaceId: null, surfaceId: null }),
    environment({ hostReady: false }),
    environment({ registrations: [] }),
    environment({ lifecycleTransitionActive: true }),
    environment({ applicationModalActive: true }),
  ]) {
    assert.ok(Object.values(projectEditorWorkflowCapabilities(blocked))
      .every((capability) => !capability.canExecute))
  }
})

test('completion distinguishes reveal from focus and does not mutate navigation inputs', () => {
  const request = Object.freeze({
    ...intent('workflow.game', DISC_GAME, 'reveal'),
    requestId: 17,
  })
  const before = JSON.stringify(request)
  assert.deepEqual(completeEditorNavigationRequest(request, 'revealed'), {
    status: 'completed',
    destination: DISC_GAME,
    focus: 'revealed',
  })
  assert.equal(JSON.stringify(request), before)
})
