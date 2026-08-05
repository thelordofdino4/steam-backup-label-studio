import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ApplicationCommandCapability,
  ApplicationCommandId,
} from '../lifecycle/applicationCommandTypes.ts'
import { projectLifecycleCommandCapabilities } from '../lifecycle/lifecycleCommandCapabilities.ts'
import type { ApplicationLifecycleState } from '../lifecycle/projectSession.ts'
import { createApplicationMenuPlatformDescriptor } from './applicationMenuRegistry.ts'
import { projectApplicationMenuCapabilities } from './applicationMenuProjection.ts'
import {
  APPLICATION_MENU_FOCUSED_EDIT_OPERATION_IDS,
  APPLICATION_MENU_INFORMATIONAL_OPERATION_IDS,
  APPLICATION_MENU_ITEM_IDS,
  APPLICATION_MENU_NATIVE_WINDOW_OPERATION_IDS,
  type ApplicationMenuFocusedEditOperationId,
  type ApplicationMenuInformationalOperationId,
  type ApplicationMenuItemId,
  type ApplicationMenuNativeWindowOperationId,
  type ApplicationMenuOwnerCapabilities,
  type ApplicationMenuPhysicalProjectTarget,
  type ApplicationMenuProjection,
  type ApplicationMenuProjectionContext,
  type ApplicationMenuWorkflowId,
  type ApplicationMenuWorkspace,
} from './applicationMenuTypes.ts'

const ENABLED = Object.freeze({ canExecute: true } as const)

function disabled(reasonCode: string): ApplicationCommandCapability {
  return Object.freeze({ canExecute: false, reasonCode })
}

function lifecycleState(
  visibleWorkspace: ApplicationLifecycleState['visibleWorkspace'],
  sessionId: string | null,
): ApplicationLifecycleState {
  return {
    visibleWorkspace,
    activeSession: sessionId === null
      ? null
      : {
          id: sessionId,
        } as ApplicationLifecycleState['activeSession'],
  }
}

function lifecycleCapabilities(
  lifecycle: ApplicationLifecycleState,
  busyScopes: readonly (
    | 'lifecycle.transition'
    | 'workspace.navigation'
    | 'dialog.project-file'
    | 'persistence.read'
    | 'persistence.write'
    | 'application.termination'
  )[] = [],
) {
  return projectLifecycleCommandCapabilities({
    lifecycle,
    busy: { occupiedScopes: busyScopes },
    termination: { closeWindow: 'unimplemented', quit: 'unimplemented' },
  })
}

function mappedCapabilities<Key extends string>(
  keys: readonly Key[],
  capability: ApplicationCommandCapability,
): Readonly<Record<Key, ApplicationCommandCapability>> {
  return Object.freeze(Object.fromEntries(
    keys.map((key) => [key, capability]),
  )) as Readonly<Record<Key, ApplicationCommandCapability>>
}

function ownerCapabilities(
  lifecycle: Readonly<Record<ApplicationCommandId, ApplicationCommandCapability>>,
  overrides: Partial<ApplicationMenuOwnerCapabilities> = {},
): ApplicationMenuOwnerCapabilities {
  return {
    lifecycle,
    exportPng: ENABLED,
    workflowNavigation: mappedCapabilities<ApplicationMenuWorkflowId>([
      'workflow.game',
      'workflow.disc-template',
      'workflow.disc-layout-presets',
      'workflow.case-layout-presets',
      'workflow.export-options',
    ], ENABLED),
    focusedEdit: mappedCapabilities<ApplicationMenuFocusedEditOperationId>(
      APPLICATION_MENU_FOCUSED_EDIT_OPERATION_IDS,
      disabled('focused-edit.no-owner'),
    ),
    nativeWindow: mappedCapabilities<ApplicationMenuNativeWindowOperationId>(
      APPLICATION_MENU_NATIVE_WINDOW_OPERATION_IDS,
      ENABLED,
    ),
    informational: mappedCapabilities<ApplicationMenuInformationalOperationId>(
      APPLICATION_MENU_INFORMATIONAL_OPERATION_IDS,
      disabled('help.not-implemented'),
    ),
    ...overrides,
  }
}

function context(
  lifecycle: ApplicationLifecycleState,
  workspace: ApplicationMenuWorkspace,
  physicalProjectTarget: ApplicationMenuPhysicalProjectTarget | null,
  overrides: Partial<ApplicationMenuProjectionContext> = {},
): ApplicationMenuProjectionContext {
  return {
    generation: 1,
    platform: 'windows',
    window: {
      windowLabel: 'main',
      live: true,
      maximized: false,
      fullscreen: false,
    },
    ...(lifecycle.activeSession ? { sessionId: lifecycle.activeSession.id } : {}),
    workspace,
    physicalProjectTarget,
    capabilities: ownerCapabilities(lifecycleCapabilities(lifecycle)),
    ...overrides,
  }
}

function projection(
  projectionContext: ApplicationMenuProjectionContext,
): ApplicationMenuProjection {
  return projectApplicationMenuCapabilities(
    createApplicationMenuPlatformDescriptor(projectionContext.platform),
    projectionContext,
  )
}

function projectedItem(
  menuProjection: ApplicationMenuProjection,
  itemId: ApplicationMenuItemId,
) {
  const found = menuProjection.items.find((entry) => entry.itemId === itemId)
  assert.ok(found)
  return found
}

test('H0 and H1 preserve lifecycle Save, Return Home, Resume, and Close distinctions', () => {
  const h0Lifecycle = lifecycleState('home', null)
  const h0 = projection(context(h0Lifecycle, 'home', null))
  assert.equal(projectedItem(h0, 'menu.file.new-disc').enabled, true)
  assert.equal(projectedItem(h0, 'menu.file.open').enabled, true)
  assert.deepEqual(projectedItem(h0, 'menu.file.save'), {
    itemId: 'menu.file.save',
    enabled: false,
    checked: false,
    visible: true,
    unavailableReason: 'project.no-active-session',
  })
  assert.equal(projectedItem(h0, 'menu.file.save-as').enabled, false)
  assert.equal(projectedItem(h0, 'menu.file.return-home').enabled, false)
  assert.equal(projectedItem(h0, 'menu.file.resume-project').enabled, false)
  assert.equal(projectedItem(h0, 'menu.file.close-project').enabled, false)

  const h1Lifecycle = lifecycleState('home', 'retained-disc')
  const h1 = projection(context(h1Lifecycle, 'home', 'disc'))
  assert.equal(projectedItem(h1, 'menu.file.save').enabled, true)
  assert.equal(projectedItem(h1, 'menu.file.save-as').enabled, true)
  assert.equal(projectedItem(h1, 'menu.file.export-png').enabled, true)
  assert.equal(projectedItem(h1, 'menu.file.return-home').enabled, false)
  assert.equal(
    projectedItem(h1, 'menu.file.return-home').unavailableReason,
    'workspace.already-home',
  )
  assert.equal(projectedItem(h1, 'menu.file.resume-project').enabled, true)
  assert.equal(projectedItem(h1, 'menu.file.close-project').enabled, true)
})

test('Disc and Case matrices enforce workflow-host and Disc-only destination boundaries', () => {
  const discLifecycle = lifecycleState('disc', 'disc-session')
  const disc = projection(context(discLifecycle, 'disc', 'disc'))
  assert.equal(projectedItem(disc, 'menu.file.return-home').enabled, true)
  assert.equal(projectedItem(disc, 'menu.file.resume-project').enabled, false)
  assert.equal(projectedItem(disc, 'menu.tools.game').enabled, true)
  assert.equal(projectedItem(disc, 'menu.tools.export-options').enabled, true)
  assert.equal(projectedItem(disc, 'menu.tools.disc-template').enabled, true)
  assert.equal(projectedItem(disc, 'menu.tools.disc-layout-presets').enabled, true)
  assert.equal(
    projectedItem(disc, 'menu.tools.case-layout-presets').unavailableReason,
    'workflow.destination-unavailable',
  )

  const caseLifecycle = lifecycleState('caseInsert', 'case-session')
  const caseProjection = projection(context(
    caseLifecycle,
    'case',
    'case-spine-left',
  ))
  assert.equal(projectedItem(caseProjection, 'menu.tools.game').enabled, true)
  assert.equal(projectedItem(caseProjection, 'menu.tools.export-options').enabled, true)
  assert.equal(
    projectedItem(caseProjection, 'menu.tools.case-layout-presets').enabled,
    true,
  )
  assert.deepEqual(projectedItem(caseProjection, 'menu.tools.disc-template'), {
    itemId: 'menu.tools.disc-template',
    enabled: false,
    checked: false,
    visible: true,
    unavailableReason: 'editor-incompatible',
  })
  assert.equal(
    projectedItem(caseProjection, 'menu.tools.disc-layout-presets')
      .unavailableReason,
    'editor-incompatible',
  )

  const home = projection(context(
    lifecycleState('home', 'retained-case'),
    'home',
    'case-cover',
  ))
  for (const id of [
    'menu.tools.game',
    'menu.tools.export-options',
    'menu.tools.disc-template',
    'menu.tools.disc-layout-presets',
    'menu.tools.case-layout-presets',
  ] as const) {
    assert.equal(projectedItem(home, id).enabled, false)
    assert.equal(projectedItem(home, id).unavailableReason,
      'workflow.no-active-editor')
  }
})

test('semantic capabilities and exclusive modal boundaries retain stable reason codes', () => {
  const lifecycle = lifecycleState('disc', 'busy-disc')
  const busyLifecycle = lifecycleCapabilities(lifecycle, ['lifecycle.transition'])
  const busy = projection(context(lifecycle, 'disc', 'disc', {
    capabilities: ownerCapabilities(busyLifecycle, {
      exportPng: disabled('export.busy'),
      workflowNavigation: {
        'workflow.game': disabled('game.search-busy'),
        'workflow.disc-template': ENABLED,
        'workflow.disc-layout-presets': ENABLED,
        'workflow.case-layout-presets': ENABLED,
        'workflow.export-options': ENABLED,
      },
      exclusiveBoundaries: {
        'workflow-navigation': disabled('application.modal-active'),
        'focused-edit': disabled('application.modal-active'),
      },
    }),
  }))
  assert.equal(
    projectedItem(busy, 'menu.file.save').unavailableReason,
    'application.command-busy',
  )
  assert.equal(
    projectedItem(busy, 'menu.file.export-png').unavailableReason,
    'export.busy',
  )
  assert.equal(
    projectedItem(busy, 'menu.tools.game').unavailableReason,
    'game.search-busy',
  )
  assert.equal(
    projectedItem(busy, 'menu.tools.disc-template').unavailableReason,
    'application.modal-active',
  )
})

test('pathless, clean, and dirty policy remains injected while Save labels stay stable', () => {
  const lifecycle = lifecycleState('disc', 'save-disc')
  for (const ownerReason of ['pathless', 'clean', 'dirty']) {
    const saveCapabilities = lifecycleCapabilities(lifecycle)
    const menuProjection = projection(context(lifecycle, 'disc', 'disc', {
      generation: ownerReason.length,
      capabilities: ownerCapabilities(saveCapabilities),
    }))
    assert.equal(projectedItem(menuProjection, 'menu.file.save').enabled, true)
    assert.equal(projectedItem(menuProjection, 'menu.file.save-as').enabled, true)
    assert.equal(projectedItem(menuProjection, 'menu.file.save').label, undefined)
    assert.equal(projectedItem(menuProjection, 'menu.file.save-as').label, undefined)
  }
})

test('focused editing is entirely owner-injected and focus-dependent', () => {
  const lifecycle = lifecycleState('disc', 'edit-disc')
  const focusedCapabilities = mappedCapabilities<ApplicationMenuFocusedEditOperationId>(
    APPLICATION_MENU_FOCUSED_EDIT_OPERATION_IDS,
    disabled('focused-edit.no-owner'),
  )
  const withTextFocus = {
    ...focusedCapabilities,
    'focused-edit.copy': ENABLED,
    'focused-edit.select-all': ENABLED,
    'focused-edit.undo': disabled('focused-edit.undo-unavailable'),
  }
  const menuProjection = projection(context(lifecycle, 'disc', 'disc', {
    capabilities: ownerCapabilities(lifecycleCapabilities(lifecycle), {
      focusedEdit: withTextFocus,
    }),
  }))
  assert.equal(projectedItem(menuProjection, 'menu.edit.copy').enabled, true)
  assert.equal(projectedItem(menuProjection, 'menu.edit.select-all').enabled, true)
  assert.equal(projectedItem(menuProjection, 'menu.edit.paste').enabled, false)
  assert.equal(
    projectedItem(menuProjection, 'menu.edit.undo').unavailableReason,
    'focused-edit.undo-unavailable',
  )
})

test('termination and Help/About stay disabled until their injected owners exist', () => {
  const lifecycle = lifecycleState('disc', 'future-owners')
  const menuProjection = projection(context(lifecycle, 'disc', 'disc'))
  assert.equal(projectedItem(menuProjection, 'menu.file.close-window').enabled, false)
  assert.equal(
    projectedItem(menuProjection, 'menu.file.close-window').unavailableReason,
    'application.termination-not-implemented',
  )
  assert.equal(projectedItem(menuProjection, 'menu.file.quit').enabled, false)
  assert.equal(projectedItem(menuProjection, 'menu.help.documentation').enabled, false)
  assert.equal(projectedItem(menuProjection, 'menu.help.about').enabled, false)
})

test('live window state controls native availability and only the two dynamic label policies', () => {
  const lifecycle = lifecycleState('home', null)
  const normal = projection(context(lifecycle, 'home', null))
  assert.equal(
    projectedItem(normal, 'menu.window.toggle-maximize').label,
    'Maximize',
  )
  assert.equal(
    projectedItem(normal, 'menu.window.toggle-fullscreen').label,
    'Enter Full Screen',
  )

  const changed = projection(context(lifecycle, 'home', null, {
    generation: 2,
    window: {
      windowLabel: 'main', live: true, maximized: true, fullscreen: true,
    },
  }))
  assert.equal(
    projectedItem(changed, 'menu.window.toggle-maximize').label,
    'Restore',
  )
  assert.equal(
    projectedItem(changed, 'menu.window.toggle-fullscreen').label,
    'Exit Full Screen',
  )

  const macos = projection(context(lifecycle, 'home', null, {
    platform: 'macos',
  }))
  assert.equal(projectedItem(macos, 'menu.window.toggle-maximize').label, 'Zoom')

  const noWindow = projection(context(lifecycle, 'home', null, {
    window: {
      windowLabel: 'closed', live: false, maximized: false, fullscreen: false,
    },
  }))
  for (const id of [
    'menu.window.minimize',
    'menu.window.toggle-maximize',
    'menu.window.toggle-fullscreen',
  ] as const) {
    assert.equal(projectedItem(noWindow, id).enabled, false)
    assert.equal(
      projectedItem(noWindow, id).unavailableReason,
      'native.window-unavailable',
    )
  }
  assert.equal(projectedItem(normal, 'menu.file.save').label, undefined)
  assert.equal(projectedItem(normal, 'menu.tools.game').label, undefined)
})

test('every platform-present item receives one visible, unchecked projection in descriptor order', () => {
  const lifecycle = lifecycleState('disc', 'complete-projection')
  for (const platform of ['windows', 'linux', 'macos'] as const) {
    const menuProjection = projection(context(lifecycle, 'disc', 'disc', {
      platform,
    }))
    assert.deepEqual(
      menuProjection.items.map((entry) => entry.itemId),
      APPLICATION_MENU_ITEM_IDS,
    )
    assert.equal(new Set(menuProjection.items.map((entry) => entry.itemId)).size,
      APPLICATION_MENU_ITEM_IDS.length)
    assert.ok(menuProjection.items.every((entry) => entry.visible))
    assert.ok(menuProjection.items.every((entry) => entry.checked === false))
  }
})
