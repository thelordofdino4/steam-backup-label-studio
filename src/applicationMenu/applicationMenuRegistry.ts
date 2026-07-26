import type { ApplicationCommandId } from '../lifecycle/applicationCommandTypes.ts'
import {
  APPLICATION_MENU_ITEM_IDS,
  APPLICATION_MENU_RESERVED_ITEM_IDS,
  APPLICATION_MENU_SUBMENU_IDS,
  type ApplicationMenuAccelerator,
  type ApplicationMenuDescriptorRegistry,
  type ApplicationMenuEditorDestination,
  type ApplicationMenuEventRoutingOwner,
  type ApplicationMenuItemDescriptor,
  type ApplicationMenuItemId,
  type ApplicationMenuPhysicalProjectTarget,
  type ApplicationMenuPlatform,
  type ApplicationMenuPlatformDescriptor,
  type ApplicationMenuPlatformEntry,
  type ApplicationMenuPlatformItemDescriptor,
  type ApplicationMenuPlatformPlacement,
  type ApplicationMenuPlatformSeparatorDescriptor,
  type ApplicationMenuSemanticClass,
  type ApplicationMenuSemanticTarget,
  type ApplicationMenuSubmenuDescriptor,
  type ApplicationMenuSubmenuId,
  type ApplicationMenuWorkflowId,
  type ApplicationMenuWorkflowNavigationTarget,
} from './applicationMenuTypes.ts'

const PRODUCT_SUBMENU_PLACEMENT = Object.freeze({
  windows: 'product-submenu',
  linux: 'product-submenu',
  macos: 'product-submenu',
} as const satisfies Readonly<Record<
  ApplicationMenuPlatform,
  ApplicationMenuPlatformPlacement
>>)

const MACOS_APPLICATION_MENU_PLACEMENT = Object.freeze({
  windows: 'product-submenu',
  linux: 'product-submenu',
  macos: 'macos-application-menu',
} as const satisfies Readonly<Record<
  ApplicationMenuPlatform,
  ApplicationMenuPlatformPlacement
>>)

function accelerators(
  windows: ApplicationMenuAccelerator | null,
  linux: ApplicationMenuAccelerator | null,
  macos: ApplicationMenuAccelerator | null,
) {
  return Object.freeze({ windows, linux, macos })
}

const NO_ACCELERATORS = accelerators(null, null, null)

function lifecycleTarget(
  commandId: ApplicationCommandId,
): Extract<ApplicationMenuSemanticTarget, { kind: 'lifecycle-command' }> {
  return Object.freeze({ kind: 'lifecycle-command', commandId })
}

function editorDestination(
  destination: Omit<ApplicationMenuEditorDestination, 'kind'>,
): ApplicationMenuEditorDestination {
  return Object.freeze({ kind: 'domain-area', ...destination })
}

function workflowTarget(
  workflowId: ApplicationMenuWorkflowId,
  destinations: Readonly<Partial<Record<
    ApplicationMenuPhysicalProjectTarget,
    ApplicationMenuEditorDestination
  >>>,
): ApplicationMenuWorkflowNavigationTarget {
  return Object.freeze({
    kind: 'workflow-navigation',
    workflowId,
    behavior: 'focus',
    destinations: Object.freeze({ ...destinations }),
  })
}

const GAME_WORKFLOW_TARGET = workflowTarget('workflow.game', {
  disc: editorDestination({
    workspaceId: 'workspace.disc',
    surfaceId: 'surface.disc',
    areaId: 'area.game',
    ownerId: 'owner.game.search',
    controlId: 'control.game.query',
  }),
  'case-cover': editorDestination({
    workspaceId: 'workspace.case',
    surfaceId: 'surface.case.front',
    areaId: 'area.game',
    ownerId: 'owner.game.search',
    controlId: 'control.game.query',
  }),
  'case-tray': editorDestination({
    workspaceId: 'workspace.case',
    surfaceId: 'surface.case.back',
    areaId: 'area.game',
    ownerId: 'owner.game.search',
    controlId: 'control.game.query',
  }),
  'case-spine-left': editorDestination({
    workspaceId: 'workspace.case',
    surfaceId: 'surface.case.spine.left',
    areaId: 'area.game',
    ownerId: 'owner.game.search',
    controlId: 'control.game.query',
  }),
  'case-spine-right': editorDestination({
    workspaceId: 'workspace.case',
    surfaceId: 'surface.case.spine.right',
    areaId: 'area.game',
    ownerId: 'owner.game.search',
    controlId: 'control.game.query',
  }),
})

const DISC_TEMPLATE_WORKFLOW_TARGET = workflowTarget(
  'workflow.disc-template',
  {
    disc: editorDestination({
      workspaceId: 'workspace.disc',
      surfaceId: 'surface.disc',
      areaId: 'area.template.disc',
      ownerId: 'owner.disc-template',
      controlId: 'control.disc-template.selector',
    }),
  },
)

const DISC_LAYOUT_PRESETS_WORKFLOW_TARGET = workflowTarget(
  'workflow.disc-layout-presets',
  {
    disc: editorDestination({
      workspaceId: 'workspace.disc',
      surfaceId: 'surface.disc',
      areaId: 'area.layout-presets.disc',
      ownerId: 'owner.disc-layout-presets',
      controlId: 'control.disc-layout-presets.selector',
    }),
  },
)

const EXPORT_OPTIONS_WORKFLOW_TARGET = workflowTarget(
  'workflow.export-options',
  {
    disc: editorDestination({
      workspaceId: 'workspace.disc',
      surfaceId: 'surface.disc',
      areaId: 'area.export',
      ownerId: 'owner.export.disc-guides',
      controlId: 'control.export.disc.center-hole',
    }),
    'case-cover': editorDestination({
      workspaceId: 'workspace.case',
      surfaceId: 'surface.case.front',
      areaId: 'area.export',
      ownerId: 'owner.export.case-guides',
      controlId: 'control.export.case.cover-trim',
    }),
    'case-tray': editorDestination({
      workspaceId: 'workspace.case',
      surfaceId: 'surface.case.back',
      areaId: 'area.export',
      ownerId: 'owner.export.case-guides',
      controlId: 'control.export.case.tray-trim',
    }),
    'case-spine-left': editorDestination({
      workspaceId: 'workspace.case',
      surfaceId: 'surface.case.spine.left',
      areaId: 'area.export',
      ownerId: 'owner.export.case-guides',
      controlId: 'control.export.case.tray-trim',
    }),
    'case-spine-right': editorDestination({
      workspaceId: 'workspace.case',
      surfaceId: 'surface.case.spine.right',
      areaId: 'area.export',
      ownerId: 'owner.export.case-guides',
      controlId: 'control.export.case.tray-trim',
    }),
  },
)

function freezeItem<const Item extends ApplicationMenuItemDescriptor>(
  item: Item,
): Item {
  return Object.freeze(item)
}

export const APPLICATION_MENU_SUBMENUS = Object.freeze([
  Object.freeze({ id: 'menu.file', label: 'File', order: 1 }),
  Object.freeze({ id: 'menu.edit', label: 'Edit', order: 2 }),
  Object.freeze({ id: 'menu.tools', label: 'Tools', order: 3 }),
  Object.freeze({ id: 'menu.window', label: 'Window', order: 4 }),
  Object.freeze({ id: 'menu.help', label: 'Help', order: 5 }),
] as const satisfies readonly ApplicationMenuSubmenuDescriptor[])

export const APPLICATION_MENU_ITEMS = Object.freeze([
  freezeItem({
    kind: 'item', id: 'menu.file.new-disc', label: 'New Disc Project',
    parentMenuId: 'menu.file', order: 10, group: 'file-create',
    semanticClass: 'direct-command',
    semanticTarget: lifecycleTarget('project.new-disc'),
    acceleratorByPlatform: accelerators('Ctrl+N', 'Ctrl+N', 'Command+N'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.new-case', label: 'New Case Project',
    parentMenuId: 'menu.file', order: 20, group: 'file-create',
    semanticClass: 'direct-command',
    semanticTarget: lifecycleTarget('project.new-case'),
    acceleratorByPlatform: accelerators(
      'Ctrl+Shift+N', 'Ctrl+Shift+N', 'Command+Shift+N',
    ),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.open', label: 'Open Project…',
    parentMenuId: 'menu.file', order: 30, group: 'file-create',
    semanticClass: 'direct-command',
    semanticTarget: lifecycleTarget('project.open'),
    acceleratorByPlatform: accelerators('Ctrl+O', 'Ctrl+O', 'Command+O'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.save', label: 'Save',
    parentMenuId: 'menu.file', order: 50, group: 'file-save',
    semanticClass: 'direct-command',
    semanticTarget: lifecycleTarget('project.save'),
    acceleratorByPlatform: accelerators('Ctrl+S', 'Ctrl+S', 'Command+S'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.save-as', label: 'Save As…',
    parentMenuId: 'menu.file', order: 60, group: 'file-save',
    semanticClass: 'direct-command',
    semanticTarget: lifecycleTarget('project.save-as'),
    acceleratorByPlatform: accelerators(
      'Ctrl+Shift+S', 'Ctrl+Shift+S', 'Command+Shift+S',
    ),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.export-png', label: 'Export PNG…',
    parentMenuId: 'menu.file', order: 80, group: 'file-export',
    semanticClass: 'workflow-command',
    semanticTarget: Object.freeze({ kind: 'domain-command', commandId: 'export.png' }),
    acceleratorByPlatform: accelerators('Ctrl+E', 'Ctrl+E', 'Command+E'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'domain-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.return-home', label: 'Return Home',
    parentMenuId: 'menu.file', order: 100, group: 'file-session',
    semanticClass: 'direct-command',
    semanticTarget: lifecycleTarget('workspace.return-home'),
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.resume-project', label: 'Resume Project',
    parentMenuId: 'menu.file', order: 110, group: 'file-session',
    semanticClass: 'direct-command',
    semanticTarget: lifecycleTarget('project.resume'),
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.close-project', label: 'Close Project',
    parentMenuId: 'menu.file', order: 120, group: 'file-session',
    semanticClass: 'direct-command',
    semanticTarget: lifecycleTarget('project.close'),
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.close-window', label: 'Close Window',
    parentMenuId: 'menu.file', order: 140, group: 'file-termination',
    semanticClass: 'guarded-application-command',
    semanticTarget: lifecycleTarget('application.close-window'),
    acceleratorByPlatform: accelerators('Ctrl+W', 'Ctrl+W', 'Command+W'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.file.quit', label: 'Quit Steam Backup Label Studio',
    parentMenuId: 'menu.file', order: 150, group: 'file-termination',
    semanticClass: 'guarded-application-command',
    semanticTarget: lifecycleTarget('application.quit'),
    acceleratorByPlatform: accelerators('Ctrl+Q', 'Ctrl+Q', 'Command+Q'),
    placementByPlatform: MACOS_APPLICATION_MENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'application-command-dispatcher',
  }),
  freezeItem({
    kind: 'item', id: 'menu.edit.undo', label: 'Undo',
    parentMenuId: 'menu.edit', order: 10, group: 'edit-history',
    semanticClass: 'focused-edit-role',
    semanticTarget: Object.freeze({ kind: 'focused-edit', operationId: 'focused-edit.undo' }),
    acceleratorByPlatform: accelerators('Ctrl+Z', 'Ctrl+Z', 'Command+Z'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'focused-edit-owner',
  }),
  freezeItem({
    kind: 'item', id: 'menu.edit.redo', label: 'Redo',
    parentMenuId: 'menu.edit', order: 20, group: 'edit-history',
    semanticClass: 'focused-edit-role',
    semanticTarget: Object.freeze({ kind: 'focused-edit', operationId: 'focused-edit.redo' }),
    acceleratorByPlatform: accelerators(
      'Ctrl+Y', 'Ctrl+Y', 'Command+Shift+Z',
    ),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'focused-edit-owner',
  }),
  freezeItem({
    kind: 'item', id: 'menu.edit.cut', label: 'Cut',
    parentMenuId: 'menu.edit', order: 40, group: 'edit-transfer',
    semanticClass: 'focused-edit-role',
    semanticTarget: Object.freeze({ kind: 'focused-edit', operationId: 'focused-edit.cut' }),
    acceleratorByPlatform: accelerators('Ctrl+X', 'Ctrl+X', 'Command+X'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'focused-edit-owner',
  }),
  freezeItem({
    kind: 'item', id: 'menu.edit.copy', label: 'Copy',
    parentMenuId: 'menu.edit', order: 50, group: 'edit-transfer',
    semanticClass: 'focused-edit-role',
    semanticTarget: Object.freeze({ kind: 'focused-edit', operationId: 'focused-edit.copy' }),
    acceleratorByPlatform: accelerators('Ctrl+C', 'Ctrl+C', 'Command+C'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'focused-edit-owner',
  }),
  freezeItem({
    kind: 'item', id: 'menu.edit.paste', label: 'Paste',
    parentMenuId: 'menu.edit', order: 60, group: 'edit-transfer',
    semanticClass: 'focused-edit-role',
    semanticTarget: Object.freeze({ kind: 'focused-edit', operationId: 'focused-edit.paste' }),
    acceleratorByPlatform: accelerators('Ctrl+V', 'Ctrl+V', 'Command+V'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'focused-edit-owner',
  }),
  freezeItem({
    kind: 'item', id: 'menu.edit.select-all', label: 'Select All',
    parentMenuId: 'menu.edit', order: 70, group: 'edit-transfer',
    semanticClass: 'focused-edit-role',
    semanticTarget: Object.freeze({ kind: 'focused-edit', operationId: 'focused-edit.select-all' }),
    acceleratorByPlatform: accelerators('Ctrl+A', 'Ctrl+A', 'Command+A'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'focused-edit-owner',
  }),
  freezeItem({
    kind: 'item', id: 'menu.tools.game', label: 'Game…',
    parentMenuId: 'menu.tools', order: 10, group: 'tools-game',
    semanticClass: 'workflow-launcher', semanticTarget: GAME_WORKFLOW_TARGET,
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'editor-navigation-router',
  }),
  freezeItem({
    kind: 'item', id: 'menu.tools.disc-template', label: 'Disc Template…',
    parentMenuId: 'menu.tools', order: 30, group: 'tools-disc',
    semanticClass: 'workflow-launcher',
    semanticTarget: DISC_TEMPLATE_WORKFLOW_TARGET,
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'editor-navigation-router',
  }),
  freezeItem({
    kind: 'item', id: 'menu.tools.disc-layout-presets',
    label: 'Disc Layout Presets…', parentMenuId: 'menu.tools',
    order: 40, group: 'tools-disc', semanticClass: 'workflow-launcher',
    semanticTarget: DISC_LAYOUT_PRESETS_WORKFLOW_TARGET,
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'editor-navigation-router',
  }),
  freezeItem({
    kind: 'item', id: 'menu.tools.export-options', label: 'Export Options…',
    parentMenuId: 'menu.tools', order: 60, group: 'tools-export',
    semanticClass: 'workflow-launcher',
    semanticTarget: EXPORT_OPTIONS_WORKFLOW_TARGET,
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'editor-navigation-router',
  }),
  freezeItem({
    kind: 'item', id: 'menu.window.minimize', label: 'Minimize',
    parentMenuId: 'menu.window', order: 10, group: 'window-size',
    semanticClass: 'native-window-operation',
    semanticTarget: Object.freeze({ kind: 'native-window', operationId: 'native.window.minimize' }),
    acceleratorByPlatform: accelerators(null, null, 'Command+M'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'native-window-adapter',
  }),
  freezeItem({
    kind: 'item', id: 'menu.window.toggle-maximize', label: 'Maximize',
    parentMenuId: 'menu.window', order: 20, group: 'window-size',
    semanticClass: 'native-window-operation',
    semanticTarget: Object.freeze({
      kind: 'native-window', operationId: 'native.window.toggle-maximize',
    }),
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'maximize-restore', release: 'first-release',
    eventRoutingOwner: 'native-window-adapter',
  }),
  freezeItem({
    kind: 'item', id: 'menu.window.toggle-fullscreen',
    label: 'Enter Full Screen', parentMenuId: 'menu.window',
    order: 40, group: 'window-fullscreen',
    semanticClass: 'native-window-operation',
    semanticTarget: Object.freeze({
      kind: 'native-window', operationId: 'native.window.toggle-fullscreen',
    }),
    acceleratorByPlatform: accelerators('F11', 'F11', 'Control+Command+F'),
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'fullscreen', release: 'first-release',
    eventRoutingOwner: 'native-window-adapter',
  }),
  freezeItem({
    kind: 'item', id: 'menu.help.documentation',
    label: 'Steam Backup Label Studio Help', parentMenuId: 'menu.help',
    order: 10, group: 'help-primary',
    semanticClass: 'informational-operation',
    semanticTarget: Object.freeze({
      kind: 'informational', operationId: 'help.open-documentation',
    }),
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: PRODUCT_SUBMENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'informational-operation-owner',
  }),
  freezeItem({
    kind: 'item', id: 'menu.help.about',
    label: 'About Steam Backup Label Studio', parentMenuId: 'menu.help',
    order: 40, group: 'help-about',
    semanticClass: 'informational-operation',
    semanticTarget: Object.freeze({
      kind: 'informational', operationId: 'help.show-about',
    }),
    acceleratorByPlatform: NO_ACCELERATORS,
    placementByPlatform: MACOS_APPLICATION_MENU_PLACEMENT,
    dynamicLabelPolicy: 'static', release: 'first-release',
    eventRoutingOwner: 'informational-operation-owner',
  }),
] as const satisfies readonly ApplicationMenuItemDescriptor[])

export const APPLICATION_MENU_DESCRIPTOR_REGISTRY = Object.freeze({
  submenus: APPLICATION_MENU_SUBMENUS,
  items: APPLICATION_MENU_ITEMS,
}) satisfies ApplicationMenuDescriptorRegistry

type ApplicationMenuSubmenuCandidate = Readonly<{
  id: string
  label: string
  order: number
}>

type ApplicationMenuItemCandidate = Readonly<{
  kind: 'item'
  id: string
  parentMenuId: string
  order: number
  group: string
  semanticClass: string
  semanticTarget?: unknown
}>

type ApplicationMenuSeparatorCandidate = Readonly<{
  kind: 'separator'
  semanticTarget?: unknown
}>

export type ApplicationMenuDescriptorRegistryCandidate = Readonly<{
  submenus: readonly ApplicationMenuSubmenuCandidate[]
  items: readonly (ApplicationMenuItemCandidate | ApplicationMenuSeparatorCandidate)[]
}>

const SUPPORTED_SEMANTIC_CLASSES: ReadonlySet<string> = new Set([
  'direct-command',
  'guarded-application-command',
  'workflow-command',
  'workflow-launcher',
  'focused-edit-role',
  'native-window-operation',
  'informational-operation',
])

const RESERVED_ITEM_IDS: ReadonlySet<string> = new Set(
  APPLICATION_MENU_RESERVED_ITEM_IDS,
)

function requireExactCatalog(
  actual: readonly string[],
  expected: readonly string[],
  catalogName: string,
) {
  const missing = expected.filter((id) => !actual.includes(id))
  const unexpected = actual.filter((id) => !expected.includes(id))
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${catalogName} catalog mismatch; missing: ${missing.join(', ') || 'none'}; ` +
      `unexpected: ${unexpected.join(', ') || 'none'}.`,
    )
  }
}

function requireNoDuplicates(values: readonly string[], name: string) {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${name}: ${value}`)
    seen.add(value)
  }
}

function isSemanticTarget(value: unknown): value is ApplicationMenuSemanticTarget {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return false
  }
  const kind = value.kind
  return kind === 'lifecycle-command' ||
    kind === 'domain-command' ||
    kind === 'workflow-navigation' ||
    kind === 'focused-edit' ||
    kind === 'native-window' ||
    kind === 'informational'
}

function validateGroupOrdering(items: readonly ApplicationMenuItemCandidate[]) {
  for (const submenuId of APPLICATION_MENU_SUBMENU_IDS) {
    const ordered = items
      .filter((item) => item.parentMenuId === submenuId)
      .toSorted((first, second) => first.order - second.order)
    const completedGroups = new Set<string>()
    let currentGroup: string | null = null
    for (const item of ordered) {
      if (item.group === currentGroup) continue
      if (completedGroups.has(item.group)) {
        throw new Error(`Invalid non-contiguous group ordering: ${item.group}`)
      }
      if (currentGroup !== null) completedGroups.add(currentGroup)
      currentGroup = item.group
    }
  }
}

export function validateApplicationMenuDescriptorRegistry(
  registry: ApplicationMenuDescriptorRegistryCandidate,
): void {
  const submenuIds = registry.submenus.map((submenu) => submenu.id)
  requireNoDuplicates(submenuIds, 'submenu ID')
  requireExactCatalog(submenuIds, APPLICATION_MENU_SUBMENU_IDS, 'Submenu')

  const submenuOrders = registry.submenus.map((submenu) => String(submenu.order))
  requireNoDuplicates(submenuOrders, 'submenu order')

  const itemCandidates: ApplicationMenuItemCandidate[] = []
  for (const entry of registry.items) {
    if (entry.kind === 'separator') {
      if (entry.semanticTarget !== undefined) {
        throw new Error('A separator must not have a semantic target.')
      }
      throw new Error('Base menu separators must be derived from item groups.')
    }
    itemCandidates.push(entry)
  }

  const itemIds = itemCandidates.map((item) => item.id)
  requireNoDuplicates(itemIds, 'item ID')
  requireExactCatalog(itemIds, APPLICATION_MENU_ITEM_IDS, 'First-release item')
  if (itemIds.some((id) => RESERVED_ITEM_IDS.has(id))) {
    throw new Error('Reserved future items cannot enter the first-release catalog.')
  }

  const knownSubmenus = new Set<string>(APPLICATION_MENU_SUBMENU_IDS)
  const ordersBySubmenu = new Map<string, Set<number>>()
  for (const item of itemCandidates) {
    if (!knownSubmenus.has(item.parentMenuId)) {
      throw new Error(`Unknown parent submenu ID: ${item.parentMenuId}`)
    }
    const orders = ordersBySubmenu.get(item.parentMenuId) ?? new Set<number>()
    if (orders.has(item.order)) {
      throw new Error(
        `Duplicate item order ${item.order} in ${item.parentMenuId}.`,
      )
    }
    orders.add(item.order)
    ordersBySubmenu.set(item.parentMenuId, orders)

    if (!SUPPORTED_SEMANTIC_CLASSES.has(item.semanticClass)) {
      throw new Error(`Unsupported semantic class: ${item.semanticClass}`)
    }
    if (!isSemanticTarget(item.semanticTarget)) {
      throw new Error(`Menu item ${item.id} has no supported semantic target.`)
    }
  }
  validateGroupOrdering(itemCandidates)
}

function platformItem(
  item: ApplicationMenuItemDescriptor,
  platform: ApplicationMenuPlatform,
): ApplicationMenuPlatformItemDescriptor {
  return Object.freeze({
    kind: 'item',
    itemId: item.id,
    label: item.dynamicLabelPolicy === 'maximize-restore' && platform === 'macos'
      ? 'Zoom'
      : item.label,
    logicalParentMenuId: item.parentMenuId,
    order: item.order,
    group: item.group,
    semanticClass: item.semanticClass,
    semanticTarget: item.semanticTarget,
    eventRoutingOwner: item.eventRoutingOwner,
    accelerator: item.acceleratorByPlatform[platform],
    placement: item.placementByPlatform[platform],
    dynamicLabelPolicy: item.dynamicLabelPolicy,
    visible: true,
    checked: false,
  })
}

function separator(
  parentMenuId: ApplicationMenuSubmenuId | 'macos-application-menu',
  afterGroup: string,
  beforeGroup: string,
): ApplicationMenuPlatformSeparatorDescriptor {
  return Object.freeze({
    kind: 'separator', parentMenuId, afterGroup, beforeGroup,
  })
}

function withGroupSeparators(
  parentMenuId: ApplicationMenuSubmenuId,
  items: readonly ApplicationMenuPlatformItemDescriptor[],
): readonly ApplicationMenuPlatformEntry[] {
  const entries: ApplicationMenuPlatformEntry[] = []
  let previousGroup: string | null = null
  for (const item of items) {
    if (previousGroup !== null && previousGroup !== item.group) {
      entries.push(separator(parentMenuId, previousGroup, item.group))
    }
    entries.push(item)
    previousGroup = item.group
  }
  return Object.freeze(entries)
}

export function createApplicationMenuPlatformDescriptor(
  platform: ApplicationMenuPlatform,
): ApplicationMenuPlatformDescriptor {
  const items = Object.freeze(APPLICATION_MENU_ITEMS.map((item) =>
    platformItem(item, platform)))
  const productMenus = Object.freeze(APPLICATION_MENU_SUBMENUS.map((submenu) => {
    const submenuItems = items.filter((item) =>
      item.logicalParentMenuId === submenu.id &&
      item.placement === 'product-submenu')
    return Object.freeze({
      ...submenu,
      entries: withGroupSeparators(submenu.id, submenuItems),
    })
  }))

  const applicationMenuEntries = platform === 'macos'
    ? Object.freeze([
        items.find((item) => item.itemId === 'menu.help.about'),
        separator('macos-application-menu', 'help-about', 'file-termination'),
        items.find((item) => item.itemId === 'menu.file.quit'),
      ].filter((entry): entry is ApplicationMenuPlatformEntry => entry !== undefined))
    : Object.freeze([] as ApplicationMenuPlatformEntry[])

  const descriptor = Object.freeze({
    platform,
    productMenus,
    applicationMenuEntries,
    items,
  })
  validateApplicationMenuPlatformDescriptor(descriptor)
  return descriptor
}

type ApplicationMenuPlatformEntryCandidate = Readonly<{
  kind: 'item' | 'separator'
  itemId?: string
  semanticTarget?: unknown
}>

export type ApplicationMenuPlatformDescriptorCandidate = Readonly<{
  platform: ApplicationMenuPlatform
  productMenus: readonly Readonly<{
    id: string
    entries: readonly ApplicationMenuPlatformEntryCandidate[]
  }>[]
  applicationMenuEntries: readonly ApplicationMenuPlatformEntryCandidate[]
  items: readonly ApplicationMenuPlatformEntryCandidate[]
}>

function itemIds(entries: readonly ApplicationMenuPlatformEntryCandidate[]) {
  return entries.flatMap((entry) =>
    entry.kind === 'item' && entry.itemId ? [entry.itemId] : [])
}

function validateSeparatorTargets(
  entries: readonly ApplicationMenuPlatformEntryCandidate[],
) {
  for (const entry of entries) {
    if (entry.kind === 'separator' && entry.semanticTarget !== undefined) {
      throw new Error('A platform separator must not have a semantic target.')
    }
  }
}

export function validateApplicationMenuPlatformDescriptor(
  descriptor: ApplicationMenuPlatformDescriptorCandidate,
): void {
  const orderedItemIds = itemIds(descriptor.items)
  const allProjectedItemIds = [
    ...orderedItemIds,
    ...descriptor.productMenus.flatMap((menu) => itemIds(menu.entries)),
    ...itemIds(descriptor.applicationMenuEntries),
  ]
  if (allProjectedItemIds.includes('menu.help.report-issue')) {
    throw new Error('Report an Issue must be omitted from first-release projections.')
  }
  if (
    orderedItemIds.length !== APPLICATION_MENU_ITEM_IDS.length ||
    orderedItemIds.some((id, index) => id !== APPLICATION_MENU_ITEM_IDS[index])
  ) {
    throw new Error('Platform-present item order differs from the contract.')
  }

  const productMenuIds = descriptor.productMenus.map((menu) => menu.id)
  if (
    productMenuIds.length !== APPLICATION_MENU_SUBMENU_IDS.length ||
    productMenuIds.some((id, index) => id !== APPLICATION_MENU_SUBMENU_IDS[index])
  ) {
    throw new Error('Platform product-menu order differs from the contract.')
  }

  const expectedItems = APPLICATION_MENU_ITEMS.filter((item) =>
    item.placementByPlatform[descriptor.platform] === 'product-submenu')
  for (const menu of descriptor.productMenus) {
    const expected = expectedItems
      .filter((item) => item.parentMenuId === menu.id)
      .map((item) => item.id)
    const actual = itemIds(menu.entries)
    if (
      actual.length !== expected.length ||
      actual.some((id, index) => id !== expected[index])
    ) {
      throw new Error(`Item order differs from the contract in ${menu.id}.`)
    }
    validateSeparatorTargets(menu.entries)
  }
  validateSeparatorTargets(descriptor.applicationMenuEntries)

  const expectedApplicationItems = descriptor.platform === 'macos'
    ? ['menu.help.about', 'menu.file.quit']
    : []
  const actualApplicationItems = itemIds(descriptor.applicationMenuEntries)
  if (
    actualApplicationItems.length !== expectedApplicationItems.length ||
    actualApplicationItems.some(
      (id, index) => id !== expectedApplicationItems[index],
    )
  ) {
    throw new Error('Application-menu placement differs from the contract.')
  }
}

export function getApplicationMenuItemDescriptor(
  itemId: ApplicationMenuItemId,
): ApplicationMenuItemDescriptor {
  const item = APPLICATION_MENU_ITEMS.find((candidate) => candidate.id === itemId)
  if (!item) throw new Error(`Missing application menu descriptor: ${itemId}`)
  return item
}

export function resolveApplicationMenuWorkflowDestination(
  target: ApplicationMenuWorkflowNavigationTarget,
  physicalProjectTarget: ApplicationMenuPhysicalProjectTarget | null,
): ApplicationMenuEditorDestination | null {
  if (physicalProjectTarget === null) return null
  return target.destinations[physicalProjectTarget] ?? null
}

validateApplicationMenuDescriptorRegistry(APPLICATION_MENU_DESCRIPTOR_REGISTRY)

export type {
  ApplicationMenuEventRoutingOwner,
  ApplicationMenuSemanticClass,
}
