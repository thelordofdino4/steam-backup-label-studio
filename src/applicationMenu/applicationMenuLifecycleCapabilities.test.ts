import assert from 'node:assert/strict'
import test from 'node:test'
import type { ApplicationCommandCapability } from '../lifecycle/applicationCommandTypes.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { commandSucceeded } from '../lifecycle/applicationCommandTypes.ts'
import { createApplicationMenuPlatformDescriptor } from './applicationMenuRegistry.ts'
import { projectApplicationMenuCapabilities } from './applicationMenuProjection.ts'
import {
  APPLICATION_MENU_FOCUSED_EDIT_OPERATION_IDS,
  APPLICATION_MENU_INFORMATIONAL_OPERATION_IDS,
  APPLICATION_MENU_NATIVE_WINDOW_OPERATION_IDS,
  type ApplicationMenuFocusedEditOperationId,
  type ApplicationMenuInformationalOperationId,
  type ApplicationMenuNativeWindowOperationId,
  type ApplicationMenuOwnerCapabilities,
  type ApplicationMenuWorkflowId,
} from './applicationMenuTypes.ts'
import { getApplicationMenuLifecycleCapabilities } from './applicationMenuLifecycleCapabilities.ts'

const DISABLED = Object.freeze({
  canExecute: false,
  reasonCode: 'test.owner-unavailable',
} as const satisfies ApplicationCommandCapability)

function mappedCapabilities<Key extends string>(
  keys: readonly Key[],
): Readonly<Record<Key, ApplicationCommandCapability>> {
  return Object.freeze(Object.fromEntries(
    keys.map((key) => [key, DISABLED]),
  )) as Readonly<Record<Key, ApplicationCommandCapability>>
}

function ownerCapabilities(
  lifecycle: ApplicationMenuOwnerCapabilities['lifecycle'],
): ApplicationMenuOwnerCapabilities {
  return {
    lifecycle,
    exportPng: DISABLED,
    workflowNavigation: mappedCapabilities<ApplicationMenuWorkflowId>([
      'workflow.game',
      'workflow.disc-template',
      'workflow.disc-layout-presets',
      'workflow.export-options',
    ]),
    focusedEdit: mappedCapabilities<ApplicationMenuFocusedEditOperationId>(
      APPLICATION_MENU_FOCUSED_EDIT_OPERATION_IDS,
    ),
    nativeWindow: mappedCapabilities<ApplicationMenuNativeWindowOperationId>(
      APPLICATION_MENU_NATIVE_WINDOW_OPERATION_IDS,
    ),
    informational: mappedCapabilities<ApplicationMenuInformationalOperationId>(
      APPLICATION_MENU_INFORMATIONAL_OPERATION_IDS,
    ),
  }
}

test('menu projection consumes root lifecycle capabilities without a dispatch seam', () => {
  const root = createApplicationLifecycleCompositionRoot({
    ports: {
      newDisc: {
        availability: 'implemented',
        executeNewDisc: () => commandSucceeded(undefined),
      },
    },
  })
  const lifecycle = getApplicationMenuLifecycleCapabilities(root)
  const projection = projectApplicationMenuCapabilities(
    createApplicationMenuPlatformDescriptor('windows'),
    {
      generation: root.getSnapshot().generation,
      platform: 'windows',
      window: {
        windowLabel: 'main',
        live: true,
        maximized: false,
        fullscreen: false,
      },
      workspace: 'home',
      physicalProjectTarget: null,
      capabilities: ownerCapabilities(lifecycle),
    },
  )

  const byId = new Map(projection.items.map((item) => [item.itemId, item]))
  assert.equal(byId.get('menu.file.new-disc')?.enabled, true)
  assert.deepEqual(byId.get('menu.file.open'), {
    itemId: 'menu.file.open',
    enabled: false,
    checked: false,
    visible: true,
    unavailableReason: 'application.command-owner-unimplemented',
  })
  assert.equal(
    byId.get('menu.file.save')?.unavailableReason,
    'project.no-active-session',
  )
  assert.equal('dispatch' in lifecycle, false)
})
