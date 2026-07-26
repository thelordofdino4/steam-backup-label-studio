import type {
  ApplicationCommandCapability,
  ApplicationCommandId,
} from '../lifecycle/applicationCommandTypes.ts'

export const APPLICATION_MENU_PLATFORMS = Object.freeze([
  'windows',
  'linux',
  'macos',
] as const)

export type ApplicationMenuPlatform =
  typeof APPLICATION_MENU_PLATFORMS[number]

export const APPLICATION_MENU_SUBMENU_IDS = Object.freeze([
  'menu.file',
  'menu.edit',
  'menu.tools',
  'menu.window',
  'menu.help',
] as const)

export type ApplicationMenuSubmenuId =
  typeof APPLICATION_MENU_SUBMENU_IDS[number]

export const APPLICATION_MENU_ITEM_IDS = Object.freeze([
  'menu.file.new-disc',
  'menu.file.new-case',
  'menu.file.open',
  'menu.file.save',
  'menu.file.save-as',
  'menu.file.export-png',
  'menu.file.return-home',
  'menu.file.resume-project',
  'menu.file.close-project',
  'menu.file.close-window',
  'menu.file.quit',
  'menu.edit.undo',
  'menu.edit.redo',
  'menu.edit.cut',
  'menu.edit.copy',
  'menu.edit.paste',
  'menu.edit.select-all',
  'menu.tools.game',
  'menu.tools.disc-template',
  'menu.tools.disc-layout-presets',
  'menu.tools.export-options',
  'menu.window.minimize',
  'menu.window.toggle-maximize',
  'menu.window.toggle-fullscreen',
  'menu.help.documentation',
  'menu.help.about',
] as const)

export type ApplicationMenuItemId = typeof APPLICATION_MENU_ITEM_IDS[number]

export const APPLICATION_MENU_RESERVED_ITEM_IDS = Object.freeze([
  'menu.help.report-issue',
] as const)

export type ApplicationMenuReservedItemId =
  typeof APPLICATION_MENU_RESERVED_ITEM_IDS[number]

export type ApplicationMenuWorkspace = 'home' | 'disc' | 'case'

export const APPLICATION_MENU_PHYSICAL_PROJECT_TARGETS = Object.freeze([
  'disc',
  'case-cover',
  'case-tray',
  'case-spine-left',
  'case-spine-right',
] as const)

export type ApplicationMenuPhysicalProjectTarget =
  typeof APPLICATION_MENU_PHYSICAL_PROJECT_TARGETS[number]

export type ApplicationMenuEditorWorkspaceId =
  | 'workspace.disc'
  | 'workspace.case'

export type ApplicationMenuEditorSurfaceId =
  | 'surface.disc'
  | 'surface.case.front'
  | 'surface.case.back'
  | 'surface.case.spine.left'
  | 'surface.case.spine.right'

export type ApplicationMenuWorkflowId =
  | 'workflow.game'
  | 'workflow.disc-template'
  | 'workflow.disc-layout-presets'
  | 'workflow.export-options'

export type ApplicationMenuEditorDestination = Readonly<{
  kind: 'domain-area'
  workspaceId: ApplicationMenuEditorWorkspaceId
  surfaceId: ApplicationMenuEditorSurfaceId
  areaId:
    | 'area.game'
    | 'area.template.disc'
    | 'area.layout-presets.disc'
    | 'area.export'
  ownerId:
    | 'owner.game.search'
    | 'owner.disc-template'
    | 'owner.disc-layout-presets'
    | 'owner.export.disc-guides'
    | 'owner.export.case-guides'
  controlId:
    | 'control.game.query'
    | 'control.disc-template.selector'
    | 'control.disc-layout-presets.selector'
    | 'control.export.disc.center-hole'
    | 'control.export.case.cover-trim'
    | 'control.export.case.tray-trim'
}>

export type ApplicationMenuWorkflowNavigationTarget = Readonly<{
  kind: 'workflow-navigation'
  workflowId: ApplicationMenuWorkflowId
  behavior: 'focus'
  destinations: Readonly<Partial<Record<
    ApplicationMenuPhysicalProjectTarget,
    ApplicationMenuEditorDestination
  >>>
}>

export const APPLICATION_MENU_FOCUSED_EDIT_OPERATION_IDS = Object.freeze([
  'focused-edit.undo',
  'focused-edit.redo',
  'focused-edit.cut',
  'focused-edit.copy',
  'focused-edit.paste',
  'focused-edit.select-all',
] as const)

export type ApplicationMenuFocusedEditOperationId =
  typeof APPLICATION_MENU_FOCUSED_EDIT_OPERATION_IDS[number]

export const APPLICATION_MENU_NATIVE_WINDOW_OPERATION_IDS = Object.freeze([
  'native.window.minimize',
  'native.window.toggle-maximize',
  'native.window.toggle-fullscreen',
] as const)

export type ApplicationMenuNativeWindowOperationId =
  typeof APPLICATION_MENU_NATIVE_WINDOW_OPERATION_IDS[number]

export const APPLICATION_MENU_INFORMATIONAL_OPERATION_IDS = Object.freeze([
  'help.open-documentation',
  'help.show-about',
] as const)

export type ApplicationMenuInformationalOperationId =
  typeof APPLICATION_MENU_INFORMATIONAL_OPERATION_IDS[number]

export type ApplicationMenuSemanticTarget =
  | Readonly<{
      kind: 'lifecycle-command'
      commandId: ApplicationCommandId
    }>
  | Readonly<{
      kind: 'domain-command'
      commandId: 'export.png'
    }>
  | ApplicationMenuWorkflowNavigationTarget
  | Readonly<{
      kind: 'focused-edit'
      operationId: ApplicationMenuFocusedEditOperationId
    }>
  | Readonly<{
      kind: 'native-window'
      operationId: ApplicationMenuNativeWindowOperationId
    }>
  | Readonly<{
      kind: 'informational'
      operationId: ApplicationMenuInformationalOperationId
    }>

export type ApplicationMenuSemanticClass =
  | 'direct-command'
  | 'guarded-application-command'
  | 'workflow-command'
  | 'workflow-launcher'
  | 'focused-edit-role'
  | 'native-window-operation'
  | 'informational-operation'

export type ApplicationMenuEventRoutingOwner =
  | 'application-command-dispatcher'
  | 'domain-command-dispatcher'
  | 'editor-navigation-router'
  | 'focused-edit-owner'
  | 'native-window-adapter'
  | 'informational-operation-owner'

export type ApplicationMenuDynamicLabelPolicy =
  | 'static'
  | 'maximize-restore'
  | 'fullscreen'

export type ApplicationMenuPlatformPlacement =
  | 'product-submenu'
  | 'macos-application-menu'

export type ApplicationMenuAccelerator =
  | 'Ctrl+N'
  | 'Ctrl+Shift+N'
  | 'Ctrl+O'
  | 'Ctrl+S'
  | 'Ctrl+Shift+S'
  | 'Ctrl+E'
  | 'Ctrl+W'
  | 'Ctrl+Q'
  | 'Ctrl+Z'
  | 'Ctrl+Y'
  | 'Ctrl+X'
  | 'Ctrl+C'
  | 'Ctrl+V'
  | 'Ctrl+A'
  | 'Command+N'
  | 'Command+Shift+N'
  | 'Command+O'
  | 'Command+S'
  | 'Command+Shift+S'
  | 'Command+E'
  | 'Command+W'
  | 'Command+Q'
  | 'Command+Z'
  | 'Command+Shift+Z'
  | 'Command+X'
  | 'Command+C'
  | 'Command+V'
  | 'Command+A'
  | 'Command+M'
  | 'Control+Command+F'
  | 'F11'

type ApplicationMenuItemDescriptorBase = Readonly<{
  kind: 'item'
  id: ApplicationMenuItemId
  label: string
  parentMenuId: ApplicationMenuSubmenuId
  order: number
  group: string
  acceleratorByPlatform: Readonly<Record<
    ApplicationMenuPlatform,
    ApplicationMenuAccelerator | null
  >>
  placementByPlatform: Readonly<Record<
    ApplicationMenuPlatform,
    ApplicationMenuPlatformPlacement
  >>
  dynamicLabelPolicy: ApplicationMenuDynamicLabelPolicy
  release: 'first-release'
}>

export type ApplicationMenuItemDescriptor =
  | ApplicationMenuItemDescriptorBase & Readonly<{
      semanticClass: 'direct-command' | 'guarded-application-command'
      semanticTarget: Extract<
        ApplicationMenuSemanticTarget,
        { kind: 'lifecycle-command' }
      >
      eventRoutingOwner: 'application-command-dispatcher'
    }>
  | ApplicationMenuItemDescriptorBase & Readonly<{
      semanticClass: 'workflow-command'
      semanticTarget: Extract<
        ApplicationMenuSemanticTarget,
        { kind: 'domain-command' }
      >
      eventRoutingOwner: 'domain-command-dispatcher'
    }>
  | ApplicationMenuItemDescriptorBase & Readonly<{
      semanticClass: 'workflow-launcher'
      semanticTarget: ApplicationMenuWorkflowNavigationTarget
      eventRoutingOwner: 'editor-navigation-router'
    }>
  | ApplicationMenuItemDescriptorBase & Readonly<{
      semanticClass: 'focused-edit-role'
      semanticTarget: Extract<
        ApplicationMenuSemanticTarget,
        { kind: 'focused-edit' }
      >
      eventRoutingOwner: 'focused-edit-owner'
    }>
  | ApplicationMenuItemDescriptorBase & Readonly<{
      semanticClass: 'native-window-operation'
      semanticTarget: Extract<
        ApplicationMenuSemanticTarget,
        { kind: 'native-window' }
      >
      eventRoutingOwner: 'native-window-adapter'
    }>
  | ApplicationMenuItemDescriptorBase & Readonly<{
      semanticClass: 'informational-operation'
      semanticTarget: Extract<
        ApplicationMenuSemanticTarget,
        { kind: 'informational' }
      >
      eventRoutingOwner: 'informational-operation-owner'
    }>

export type ApplicationMenuSubmenuDescriptor = Readonly<{
  id: ApplicationMenuSubmenuId
  label: 'File' | 'Edit' | 'Tools' | 'Window' | 'Help'
  order: number
}>

export type ApplicationMenuDescriptorRegistry = Readonly<{
  submenus: readonly ApplicationMenuSubmenuDescriptor[]
  items: readonly ApplicationMenuItemDescriptor[]
}>

export type ApplicationMenuPlatformItemDescriptor = Readonly<{
  kind: 'item'
  itemId: ApplicationMenuItemId
  label: string
  logicalParentMenuId: ApplicationMenuSubmenuId
  order: number
  group: string
  semanticClass: ApplicationMenuSemanticClass
  semanticTarget: ApplicationMenuSemanticTarget
  eventRoutingOwner: ApplicationMenuEventRoutingOwner
  accelerator: ApplicationMenuAccelerator | null
  placement: ApplicationMenuPlatformPlacement
  dynamicLabelPolicy: ApplicationMenuDynamicLabelPolicy
  visible: true
  checked: false
}>

export type ApplicationMenuPlatformSeparatorDescriptor = Readonly<{
  kind: 'separator'
  parentMenuId: ApplicationMenuSubmenuId | 'macos-application-menu'
  afterGroup: string
  beforeGroup: string
}>

export type ApplicationMenuPlatformEntry =
  | ApplicationMenuPlatformItemDescriptor
  | ApplicationMenuPlatformSeparatorDescriptor

export type ApplicationMenuPlatformSubmenuDescriptor = Readonly<{
  id: ApplicationMenuSubmenuId
  label: string
  order: number
  entries: readonly ApplicationMenuPlatformEntry[]
}>

export type ApplicationMenuPlatformDescriptor = Readonly<{
  platform: ApplicationMenuPlatform
  productMenus: readonly ApplicationMenuPlatformSubmenuDescriptor[]
  applicationMenuEntries: readonly ApplicationMenuPlatformEntry[]
  items: readonly ApplicationMenuPlatformItemDescriptor[]
}>

export type ApplicationMenuCapabilityBoundaryId =
  | 'lifecycle'
  | 'export'
  | 'focused-edit'
  | 'workflow-navigation'
  | 'native-window'
  | 'informational'

export type ApplicationMenuWindowState = Readonly<{
  windowLabel: string
  live: boolean
  maximized: boolean
  fullscreen: boolean
}>

export type ApplicationMenuOwnerCapabilities = Readonly<{
  lifecycle: Readonly<Record<
    ApplicationCommandId,
    ApplicationCommandCapability
  >>
  exportPng: ApplicationCommandCapability
  workflowNavigation: Readonly<Record<
    ApplicationMenuWorkflowId,
    ApplicationCommandCapability
  >>
  focusedEdit: Readonly<Record<
    ApplicationMenuFocusedEditOperationId,
    ApplicationCommandCapability
  >>
  nativeWindow: Readonly<Record<
    ApplicationMenuNativeWindowOperationId,
    ApplicationCommandCapability
  >>
  informational: Readonly<Record<
    ApplicationMenuInformationalOperationId,
    ApplicationCommandCapability
  >>
  exclusiveBoundaries?: Readonly<Partial<Record<
    ApplicationMenuCapabilityBoundaryId,
    ApplicationCommandCapability
  >>>
}>

export type ApplicationMenuProjectionContext = Readonly<{
  generation: number
  platform: ApplicationMenuPlatform
  window: ApplicationMenuWindowState
  sessionId?: string
  workspace: ApplicationMenuWorkspace
  physicalProjectTarget: ApplicationMenuPhysicalProjectTarget | null
  capabilities: ApplicationMenuOwnerCapabilities
}>

export type ApplicationMenuItemProjection = Readonly<{
  itemId: ApplicationMenuItemId
  enabled: boolean
  checked: false
  visible: true
  label?: string
  unavailableReason?: string
}>

export type ApplicationMenuProjection = Readonly<{
  generation: number
  platform: ApplicationMenuPlatform
  windowLabel: string
  sessionId?: string
  workspace: ApplicationMenuWorkspace
  items: readonly ApplicationMenuItemProjection[]
}>
