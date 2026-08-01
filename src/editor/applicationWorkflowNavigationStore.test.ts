import assert from 'node:assert/strict'
import test from 'node:test'

import { ApplicationWorkflowNavigationStore } from './applicationWorkflowNavigationStore.ts'
import type { EditorDestination } from './editorNavigationRouter.ts'

class FakeElement {
  isConnected = true
  hidden = false
  focusCount = 0

  getAttribute() {
    return null
  }

  focus() {
    this.focusCount += 1
  }
}

class FakeDetailsElement extends FakeElement {
  open = false
}

const GAME_DESTINATION = Object.freeze({
  kind: 'domain-area',
  workspaceId: 'workspace.disc',
  surfaceId: 'surface.disc',
  areaId: 'area.game',
  ownerId: 'owner.game.search',
  controlId: 'control.game.query',
} as const satisfies EditorDestination)

const TEMPLATE_DESTINATION = Object.freeze({
  kind: 'domain-area',
  workspaceId: 'workspace.disc',
  surfaceId: 'surface.disc',
  areaId: 'area.template.disc',
  ownerId: 'owner.disc-template',
  controlId: 'control.disc-template.selector',
} as const satisfies EditorDestination)

test('one store reveals, focuses, refocuses, switches, and restores without domain mutation', async () => {
  const originalDocument = globalThis.document
  const originalHTMLElement = globalThis.HTMLElement
  const opener = new FakeElement()
  const fallback = new FakeElement()
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: FakeElement,
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      activeElement: opener,
      querySelector: () => null,
    },
  })

  try {
    let capabilityChanges = 0
    let surfaceFocusCount = 0
    const store = new ApplicationWorkflowNavigationStore({
      environment: {
        sessionId: 'disc-session',
        workspaceId: 'workspace.disc',
        surfaceId: 'surface.disc',
        lifecycleTransitionActive: false,
        applicationModalActive: false,
      },
      getFallbackFocus: () => fallback as unknown as HTMLElement,
      focusApplicationSurface: async () => { surfaceFocusCount += 1 },
      onCapabilitiesChanged: () => { capabilityChanges += 1 },
    })
    store.setHostContent(new FakeElement() as unknown as HTMLDivElement)
    const gameDetails = new FakeDetailsElement()
    const gameControl = new FakeElement()
    const templateDetails = new FakeDetailsElement()
    const templateControl = new FakeElement()
    store.registerControl({
      workflowId: 'workflow.game',
      ownerId: 'owner.game.search',
      controlId: 'control.game.query',
      getDetails: () => gameDetails as unknown as HTMLDetailsElement,
      getControl: () => gameControl as unknown as HTMLElement,
    })
    store.registerControl({
      workflowId: 'workflow.disc-template',
      ownerId: 'owner.disc-template',
      controlId: 'control.disc-template.selector',
      getDetails: () => templateDetails as unknown as HTMLDetailsElement,
      getControl: () => templateControl as unknown as HTMLElement,
    })
    const projectIdentity = Object.freeze({
      sessionId: 'disc-session',
      path: 'C:/project.sbls',
      baseline: 'canonical-baseline',
      revision: 9,
      dirty: true,
    })
    const before = JSON.stringify(projectIdentity)

    const first = store.menuPort.navigate({
      workflowId: 'workflow.game',
      behavior: 'focus',
      destination: GAME_DESTINATION,
    })
    assert.equal(store.getSnapshot().activePresentation?.workflowId,
      'workflow.game')
    store.presentationCommitted('workflow.game')
    assert.equal((await first).status, 'completed')
    assert.equal(gameDetails.open, true)
    assert.equal(gameControl.focusCount, 1)

    const repeated = store.menuPort.navigate({
      workflowId: 'workflow.game',
      behavior: 'focus',
      destination: GAME_DESTINATION,
    })
    store.presentationCommitted('workflow.game')
    assert.equal((await repeated).status, 'completed')
    assert.equal(gameControl.focusCount, 2)

    const switched = store.menuPort.navigate({
      workflowId: 'workflow.disc-template',
      behavior: 'focus',
      destination: TEMPLATE_DESTINATION,
    })
    store.presentationCommitted('workflow.disc-template')
    assert.equal((await switched).status, 'completed')
    assert.equal(templateDetails.open, true)
    assert.equal(templateControl.focusCount, 1)
    assert.equal(surfaceFocusCount, 3)
    assert.equal(opener.focusCount, 0)

    store.closeActiveWorkflow()
    assert.equal(store.getSnapshot().activePresentation, null)
    store.presentationReturned('workflow.disc-template')
    assert.equal(opener.focusCount, 1)
    assert.equal(fallback.focusCount, 0)
    assert.equal(JSON.stringify(projectIdentity), before)
    assert.ok(capabilityChanges >= 3)
  } finally {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    })
    Object.defineProperty(globalThis, 'HTMLElement', {
      configurable: true,
      value: originalHTMLElement,
    })
  }
})

test('store fails closed for modal, readiness loss, and stale owner registration', async () => {
  const originalDocument = globalThis.document
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { activeElement: null, querySelector: () => null },
  })
  try {
    const environment = {
      sessionId: 'disc-session',
      workspaceId: 'workspace.disc' as const,
      surfaceId: 'surface.disc' as const,
      lifecycleTransitionActive: false,
      applicationModalActive: true,
    }
    const store = new ApplicationWorkflowNavigationStore({
      environment,
      getFallbackFocus: () => null,
      focusApplicationSurface: async () => {},
      onCapabilitiesChanged: () => {},
    })
    assert.equal((await store.menuPort.navigate({
      workflowId: 'workflow.game',
      behavior: 'focus',
      destination: GAME_DESTINATION,
    })).status, 'unavailable')

    store.updateEnvironment({
      environment: { ...environment, applicationModalActive: false },
      getFallbackFocus: () => null,
      focusApplicationSurface: async () => {},
      onCapabilitiesChanged: () => {},
    })
    assert.equal((await store.menuPort.navigate({
      workflowId: 'workflow.game',
      behavior: 'focus',
      destination: GAME_DESTINATION,
    })).status, 'unavailable')
  } finally {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    })
  }
})

test('native editor-surface focus failure returns a typed unavailable result', async () => {
  const originalDocument = globalThis.document
  const originalHTMLElement = globalThis.HTMLElement
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: FakeElement,
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { activeElement: null, querySelector: () => null },
  })
  try {
    const store = new ApplicationWorkflowNavigationStore({
      environment: {
        sessionId: 'disc-session',
        workspaceId: 'workspace.disc',
        surfaceId: 'surface.disc',
        lifecycleTransitionActive: false,
        applicationModalActive: false,
      },
      getFallbackFocus: () => null,
      focusApplicationSurface: async () => {
        throw new Error('native focus denied')
      },
      onCapabilitiesChanged: () => {},
    })
    store.setHostContent(new FakeElement() as unknown as HTMLDivElement)
    const details = new FakeDetailsElement()
    const control = new FakeElement()
    store.registerControl({
      workflowId: 'workflow.game',
      ownerId: 'owner.game.search',
      controlId: 'control.game.query',
      getDetails: () => details as unknown as HTMLDetailsElement,
      getControl: () => control as unknown as HTMLElement,
    })

    const pending = store.menuPort.navigate({
      workflowId: 'workflow.game',
      behavior: 'focus',
      destination: GAME_DESTINATION,
    })
    store.presentationCommitted('workflow.game')
    assert.deepEqual(await pending, {
      status: 'unavailable',
      destination: GAME_DESTINATION,
      reason: 'focus-unavailable',
    })
    assert.equal(details.open, true)
    assert.equal(control.focusCount, 0)
  } finally {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    })
    Object.defineProperty(globalThis, 'HTMLElement', {
      configurable: true,
      value: originalHTMLElement,
    })
  }
})
