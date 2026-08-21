import assert from 'node:assert/strict'
import test from 'node:test'
import { APPLICATION_LIFECYCLE_COMMAND_IDS } from '../lifecycle/applicationCommandTypes.ts'
import {
  APPLICATION_MENU_DESCRIPTOR_REGISTRY,
  APPLICATION_MENU_ITEMS,
  APPLICATION_MENU_SUBMENUS,
  createApplicationMenuPlatformDescriptor,
  resolveApplicationMenuWorkflowDestination,
  validateApplicationMenuDescriptorRegistry,
  validateApplicationMenuPlatformDescriptor,
  type ApplicationMenuDescriptorRegistryCandidate,
  type ApplicationMenuPlatformDescriptorCandidate,
} from './applicationMenuRegistry.ts'
import {
  APPLICATION_MENU_ITEM_IDS,
  APPLICATION_MENU_RESERVED_ITEM_IDS,
  APPLICATION_MENU_SUBMENU_IDS,
  type ApplicationMenuItemId,
  type ApplicationMenuPlatformDescriptor,
} from './applicationMenuTypes.ts'

const EXPECTED_ITEM_IDS = [
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
  'menu.tools.case-layout-presets',
  'menu.tools.export-options',
  'menu.window.minimize',
  'menu.window.toggle-maximize',
  'menu.window.toggle-fullscreen',
  'menu.help.documentation',
  'menu.help.about',
] as const

function descriptorCandidate(): ApplicationMenuDescriptorRegistryCandidate {
  return {
    submenus: APPLICATION_MENU_SUBMENUS.map((submenu) => ({ ...submenu })),
    items: APPLICATION_MENU_ITEMS.map((item) => ({
      kind: item.kind,
      id: item.id,
      parentMenuId: item.parentMenuId,
      order: item.order,
      group: item.group,
      semanticClass: item.semanticClass,
      semanticTarget: item.semanticTarget,
    })),
  }
}

function item(itemId: ApplicationMenuItemId) {
  const descriptor = APPLICATION_MENU_ITEMS.find((entry) => entry.id === itemId)
  assert.ok(descriptor)
  return descriptor
}

function entryTokens(
  descriptor: ApplicationMenuPlatformDescriptor,
  menuId: string,
) {
  const menu = descriptor.productMenus.find((candidate) => candidate.id === menuId)
  assert.ok(menu)
  return menu.entries.map((entry) => entry.kind === 'item'
    ? entry.itemId
    : `separator:${entry.afterGroup}->${entry.beforeGroup}`)
}

test('the immutable registry has exactly five ordered product menus and the first-release catalog', () => {
  assert.deepEqual(APPLICATION_MENU_SUBMENU_IDS, [
    'menu.file', 'menu.edit', 'menu.tools', 'menu.window', 'menu.help',
  ])
  assert.deepEqual(
    APPLICATION_MENU_SUBMENUS.map(({ id, label, order }) => ({ id, label, order })),
    [
      { id: 'menu.file', label: 'File', order: 1 },
      { id: 'menu.edit', label: 'Edit', order: 2 },
      { id: 'menu.tools', label: 'Tools', order: 3 },
      { id: 'menu.window', label: 'Window', order: 4 },
      { id: 'menu.help', label: 'Help', order: 5 },
    ],
  )
  assert.deepEqual(APPLICATION_MENU_ITEM_IDS, EXPECTED_ITEM_IDS)
  assert.deepEqual(APPLICATION_MENU_ITEMS.map((entry) => entry.id), EXPECTED_ITEM_IDS)
  assert.deepEqual(APPLICATION_MENU_RESERVED_ITEM_IDS, ['menu.help.report-issue'])
  assert.equal(
    APPLICATION_MENU_ITEMS.some((entry) => entry.id === 'menu.help.report-issue'),
    false,
  )
  assert.equal(new Set(APPLICATION_MENU_ITEM_IDS).size, EXPECTED_ITEM_IDS.length)
  assert.ok(Object.isFrozen(APPLICATION_MENU_DESCRIPTOR_REGISTRY))
  assert.ok(Object.isFrozen(APPLICATION_MENU_ITEMS))
})

test('parent, numeric order, group, and derived separators match the contract', () => {
  const identities = APPLICATION_MENU_ITEMS.map((entry) => ({
    id: entry.id,
    parent: entry.parentMenuId,
    order: entry.order,
    group: entry.group,
  }))
  assert.deepEqual(identities.slice(0, 11).map(({ order, group }) => ({ order, group })), [
    { order: 10, group: 'file-create' },
    { order: 20, group: 'file-create' },
    { order: 30, group: 'file-create' },
    { order: 50, group: 'file-save' },
    { order: 60, group: 'file-save' },
    { order: 80, group: 'file-export' },
    { order: 100, group: 'file-session' },
    { order: 110, group: 'file-session' },
    { order: 120, group: 'file-session' },
    { order: 140, group: 'file-termination' },
    { order: 150, group: 'file-termination' },
  ])
  assert.ok(identities.slice(0, 11).every(({ parent }) => parent === 'menu.file'))

  const windows = createApplicationMenuPlatformDescriptor('windows')
  assert.deepEqual(entryTokens(windows, 'menu.file'), [
    'menu.file.new-disc',
    'menu.file.new-case',
    'menu.file.open',
    'separator:file-create->file-save',
    'menu.file.save',
    'menu.file.save-as',
    'separator:file-save->file-export',
    'menu.file.export-png',
    'separator:file-export->file-session',
    'menu.file.return-home',
    'menu.file.resume-project',
    'menu.file.close-project',
    'separator:file-session->file-termination',
    'menu.file.close-window',
    'menu.file.quit',
  ])
  assert.deepEqual(entryTokens(windows, 'menu.edit'), [
    'menu.edit.undo',
    'menu.edit.redo',
    'separator:edit-history->edit-transfer',
    'menu.edit.cut',
    'menu.edit.copy',
    'menu.edit.paste',
    'menu.edit.select-all',
  ])
  assert.deepEqual(entryTokens(windows, 'menu.tools'), [
    'menu.tools.game',
    'separator:tools-game->tools-disc',
    'menu.tools.disc-template',
    'menu.tools.disc-layout-presets',
    'separator:tools-disc->tools-case',
    'menu.tools.case-layout-presets',
    'separator:tools-case->tools-export',
    'menu.tools.export-options',
  ])
  assert.deepEqual(entryTokens(windows, 'menu.window'), [
    'menu.window.minimize',
    'menu.window.toggle-maximize',
    'separator:window-size->window-fullscreen',
    'menu.window.toggle-fullscreen',
  ])
  assert.deepEqual(entryTokens(windows, 'menu.help'), [
    'menu.help.documentation',
    'separator:help-primary->help-about',
    'menu.help.about',
  ])
  assert.ok(windows.productMenus.flatMap((menu) => menu.entries)
    .filter((entry) => entry.kind === 'separator')
    .every((entry) => !('semanticTarget' in entry) && !('itemId' in entry)))
})

test('every first-release presentation ID maps exactly once to its semantic owner', () => {
  const lifecycleMappings = Object.fromEntries(APPLICATION_MENU_ITEMS
    .filter((entry) => entry.semanticTarget.kind === 'lifecycle-command')
    .map((entry) => [entry.id, entry.semanticTarget.commandId]))
  assert.deepEqual(lifecycleMappings, {
    'menu.file.new-disc': 'project.new-disc',
    'menu.file.new-case': 'project.new-case',
    'menu.file.open': 'project.open',
    'menu.file.save': 'project.save',
    'menu.file.save-as': 'project.save-as',
    'menu.file.return-home': 'workspace.return-home',
    'menu.file.resume-project': 'project.resume',
    'menu.file.close-project': 'project.close',
    'menu.file.close-window': 'application.close-window',
    'menu.file.quit': 'application.quit',
  })
  assert.deepEqual(item('menu.file.export-png').semanticTarget, {
    kind: 'domain-command', commandId: 'export.png',
  })
  assert.notDeepEqual(
    item('menu.file.export-png').semanticTarget,
    item('menu.tools.export-options').semanticTarget,
  )

  const editTargets = APPLICATION_MENU_ITEMS
    .filter((entry) => entry.parentMenuId === 'menu.edit')
    .map((entry) => entry.semanticTarget)
  assert.deepEqual(editTargets.map((target) => target.kind),
    Array(6).fill('focused-edit'))
  assert.deepEqual(editTargets.map((target) =>
    target.kind === 'focused-edit' ? target.operationId : null), [
    'focused-edit.undo',
    'focused-edit.redo',
    'focused-edit.cut',
    'focused-edit.copy',
    'focused-edit.paste',
    'focused-edit.select-all',
  ])
  assert.ok(editTargets.every((target) =>
    !JSON.stringify(target).includes('history.')))

  assert.ok(APPLICATION_MENU_ITEMS
    .filter((entry) => entry.parentMenuId === 'menu.tools')
    .every((entry) => entry.semanticTarget.kind === 'workflow-navigation'))
  assert.ok(APPLICATION_MENU_ITEMS
    .filter((entry) => entry.parentMenuId === 'menu.window')
    .every((entry) => entry.semanticTarget.kind === 'native-window'))
  assert.ok(APPLICATION_MENU_ITEMS
    .filter((entry) => entry.parentMenuId === 'menu.help')
    .every((entry) => entry.semanticTarget.kind === 'informational'))

  const lifecycleIds = new Set<string>(APPLICATION_LIFECYCLE_COMMAND_IDS)
  assert.ok(APPLICATION_MENU_ITEM_IDS.every((menuId) => !lifecycleIds.has(menuId)))
})

test('workflow targets resolve exact owner-backed destinations without mutation operations', () => {
  const game = item('menu.tools.game').semanticTarget
  const discTemplate = item('menu.tools.disc-template').semanticTarget
  const presets = item('menu.tools.disc-layout-presets').semanticTarget
  const casePresets = item('menu.tools.case-layout-presets').semanticTarget
  const exportOptions = item('menu.tools.export-options').semanticTarget
  assert.equal(game.kind, 'workflow-navigation')
  assert.equal(discTemplate.kind, 'workflow-navigation')
  assert.equal(presets.kind, 'workflow-navigation')
  assert.equal(casePresets.kind, 'workflow-navigation')
  assert.equal(exportOptions.kind, 'workflow-navigation')
  if (
    game.kind !== 'workflow-navigation' ||
    discTemplate.kind !== 'workflow-navigation' ||
    presets.kind !== 'workflow-navigation' ||
    casePresets.kind !== 'workflow-navigation' ||
    exportOptions.kind !== 'workflow-navigation'
  ) return

  assert.deepEqual(resolveApplicationMenuWorkflowDestination(game, 'case-cover'), {
    kind: 'domain-area',
    workspaceId: 'workspace.case',
    surfaceId: 'surface.case.front',
    areaId: 'area.game',
    ownerId: 'owner.game.search',
    controlId: 'control.game.query',
  })
  assert.equal(resolveApplicationMenuWorkflowDestination(discTemplate, 'case-cover'), null)
  assert.equal(resolveApplicationMenuWorkflowDestination(presets, 'case-tray'), null)
  assert.deepEqual(
    resolveApplicationMenuWorkflowDestination(casePresets, 'case-tray'),
    {
      kind: 'domain-area',
      workspaceId: 'workspace.case',
      surfaceId: 'surface.case.back',
      areaId: 'area.layout-presets.case',
      ownerId: 'owner.case-layout-presets',
      controlId: 'control.case-layout-presets.selector',
    },
  )
  assert.equal(resolveApplicationMenuWorkflowDestination(casePresets, 'disc'), null)
  assert.equal(
    resolveApplicationMenuWorkflowDestination(casePresets, 'case-spine')
      ?.controlId,
    'control.case-layout-presets.selector',
  )
  assert.deepEqual(resolveApplicationMenuWorkflowDestination(exportOptions, 'disc'), {
    kind: 'domain-area',
    workspaceId: 'workspace.disc',
    surfaceId: 'surface.disc',
    areaId: 'area.export',
    ownerId: 'owner.export.disc-guides',
    controlId: 'control.export.disc.center-hole',
  })
  assert.equal(
    resolveApplicationMenuWorkflowDestination(
      exportOptions,
      'case-spine-right',
    )?.controlId,
    'control.export.case.tray-trim',
  )
  assert.equal(
    resolveApplicationMenuWorkflowDestination(
      game,
      'case-spine',
    )?.controlId,
    'control.game.query',
  )
  assert.equal(
    resolveApplicationMenuWorkflowDestination(
      exportOptions,
      'case-spine',
    )?.controlId,
    'control.export.case.tray-trim',
  )
  assert.doesNotMatch(
    JSON.stringify([game, discTemplate, presets, casePresets, exportOptions]),
    /control\.[^"]*\.apply|control\.game\.search|control\.game\.results|export\.png/,
  )
})

test('Windows, Linux, and macOS projections preserve logical order and exact platform differences', () => {
  const windows = createApplicationMenuPlatformDescriptor('windows')
  const linux = createApplicationMenuPlatformDescriptor('linux')
  const macos = createApplicationMenuPlatformDescriptor('macos')
  for (const descriptor of [windows, linux, macos]) {
    assert.deepEqual(
      descriptor.productMenus.map((menu) => menu.id),
      ['menu.file', 'menu.edit', 'menu.tools', 'menu.window', 'menu.help'],
    )
    assert.deepEqual(descriptor.items.map((entry) => entry.itemId), EXPECTED_ITEM_IDS)
    assert.ok(descriptor.items.every((entry) => entry.checked === false))
    assert.ok(descriptor.items.every((entry) => entry.visible === true))
    assert.equal(
      descriptor.items.some((entry) => entry.itemId === 'menu.help.report-issue'),
      false,
    )
  }

  const get = (descriptor: ApplicationMenuPlatformDescriptor, id: ApplicationMenuItemId) => {
    const found = descriptor.items.find((entry) => entry.itemId === id)
    assert.ok(found)
    return found
  }
  assert.equal(get(windows, 'menu.edit.redo').accelerator, 'Ctrl+Y')
  assert.equal(get(linux, 'menu.edit.redo').accelerator, 'Ctrl+Y')
  assert.equal(get(macos, 'menu.edit.redo').accelerator, 'Command+Shift+Z')
  assert.equal(get(windows, 'menu.window.toggle-fullscreen').accelerator, 'F11')
  assert.equal(get(linux, 'menu.window.toggle-fullscreen').accelerator, 'F11')
  assert.equal(
    get(macos, 'menu.window.toggle-fullscreen').accelerator,
    'Control+Command+F',
  )
  assert.equal(get(windows, 'menu.window.minimize').accelerator, null)
  assert.equal(get(macos, 'menu.window.minimize').accelerator, 'Command+M')
  for (const descriptor of [windows, linux, macos]) {
    assert.equal(
      get(descriptor, 'menu.tools.case-layout-presets').label,
      'Case Layout Presets…',
    )
    assert.equal(
      get(descriptor, 'menu.tools.case-layout-presets').accelerator,
      null,
    )
  }
  assert.equal(get(windows, 'menu.window.toggle-maximize').label, 'Maximize')
  assert.equal(get(linux, 'menu.window.toggle-maximize').label, 'Maximize')
  assert.equal(get(macos, 'menu.window.toggle-maximize').label, 'Zoom')
  assert.equal(get(windows, 'menu.file.quit').placement, 'product-submenu')
  assert.equal(get(linux, 'menu.help.about').placement, 'product-submenu')
  assert.equal(get(macos, 'menu.file.quit').placement, 'macos-application-menu')
  assert.equal(get(macos, 'menu.help.about').placement, 'macos-application-menu')
  assert.deepEqual(
    macos.applicationMenuEntries.flatMap((entry) =>
      entry.kind === 'item' ? [entry.itemId] : []),
    ['menu.help.about', 'menu.file.quit'],
  )
  assert.deepEqual(entryTokens(macos, 'menu.help'), ['menu.help.documentation'])
})

test('central validation rejects malformed catalogs and platform ordering', () => {
  const duplicateSubmenu = descriptorCandidate()
  assert.throws(() => validateApplicationMenuDescriptorRegistry({
    ...duplicateSubmenu,
    submenus: [...duplicateSubmenu.submenus, duplicateSubmenu.submenus[0]],
  }), /Duplicate submenu ID/)

  const missing = descriptorCandidate()
  assert.throws(() => validateApplicationMenuDescriptorRegistry({
    ...missing,
    items: missing.items.slice(1),
  }), /catalog mismatch/)

  const duplicateItem = descriptorCandidate()
  assert.throws(() => validateApplicationMenuDescriptorRegistry({
    ...duplicateItem,
    items: [...duplicateItem.items, duplicateItem.items[0]],
  }), /Duplicate item ID/)

  const unknownParent = descriptorCandidate()
  const parentItems = [...unknownParent.items]
  const parentFirst = parentItems[0]
  assert.equal(parentFirst.kind, 'item')
  if (parentFirst.kind === 'item') {
    parentItems[0] = { ...parentFirst, parentMenuId: 'menu.unknown' }
  }
  assert.throws(() => validateApplicationMenuDescriptorRegistry({
    ...unknownParent, items: parentItems,
  }), /Unknown parent/)

  const duplicateOrder = descriptorCandidate()
  const orderItems = [...duplicateOrder.items]
  assert.equal(orderItems[1].kind, 'item')
  if (orderItems[1].kind === 'item') {
    orderItems[1] = { ...orderItems[1], order: 10 }
  }
  assert.throws(() => validateApplicationMenuDescriptorRegistry({
    ...duplicateOrder, items: orderItems,
  }), /Duplicate item order/)

  const invalidGroup = descriptorCandidate()
  const groupItems = [...invalidGroup.items]
  assert.equal(groupItems[5].kind, 'item')
  if (groupItems[5].kind === 'item') {
    groupItems[5] = { ...groupItems[5], group: 'file-create' }
  }
  assert.throws(() => validateApplicationMenuDescriptorRegistry({
    ...invalidGroup, items: groupItems,
  }), /non-contiguous group/)

  const unsupported = descriptorCandidate()
  const classItems = [...unsupported.items]
  assert.equal(classItems[0].kind, 'item')
  if (classItems[0].kind === 'item') {
    classItems[0] = { ...classItems[0], semanticClass: 'sidebar-callback' }
  }
  assert.throws(() => validateApplicationMenuDescriptorRegistry({
    ...unsupported, items: classItems,
  }), /Unsupported semantic class/)

  const noTarget = descriptorCandidate()
  const targetItems = [...noTarget.items]
  assert.equal(targetItems[0].kind, 'item')
  if (targetItems[0].kind === 'item') {
    const source = targetItems[0]
    targetItems[0] = {
      kind: source.kind,
      id: source.id,
      parentMenuId: source.parentMenuId,
      order: source.order,
      group: source.group,
      semanticClass: source.semanticClass,
    }
  }
  assert.throws(() => validateApplicationMenuDescriptorRegistry({
    ...noTarget, items: targetItems,
  }), /no supported semantic target/)

  const separatorTarget = descriptorCandidate()
  assert.throws(() => validateApplicationMenuDescriptorRegistry({
    ...separatorTarget,
    items: [
      { kind: 'separator', semanticTarget: { kind: 'lifecycle-command' } },
      ...separatorTarget.items.slice(1),
    ],
  }), /separator must not have a semantic target/)

  const windows = createApplicationMenuPlatformDescriptor('windows')
  const reversed: ApplicationMenuPlatformDescriptorCandidate = {
    ...windows,
    items: windows.items.toReversed(),
  }
  assert.throws(
    () => validateApplicationMenuPlatformDescriptor(reversed),
    /item order differs from the contract/i,
  )

  const reportIssue: ApplicationMenuPlatformDescriptorCandidate = {
    ...windows,
    items: [
      ...windows.items,
      { kind: 'item', itemId: 'menu.help.report-issue' },
    ],
  }
  assert.throws(
    () => validateApplicationMenuPlatformDescriptor(reportIssue),
    /Report an Issue must be omitted/,
  )

  const firstMenu = windows.productMenus[0]
  const separatorIndex = firstMenu.entries.findIndex(
    (entry) => entry.kind === 'separator',
  )
  assert.notEqual(separatorIndex, -1)
  const invalidEntries = [...firstMenu.entries]
  invalidEntries[separatorIndex] = {
    ...invalidEntries[separatorIndex],
    semanticTarget: { kind: 'lifecycle-command' },
  }
  const separatorWithTarget: ApplicationMenuPlatformDescriptorCandidate = {
    ...windows,
    productMenus: [
      { ...firstMenu, entries: invalidEntries },
      ...windows.productMenus.slice(1),
    ],
  }
  assert.throws(
    () => validateApplicationMenuPlatformDescriptor(separatorWithTarget),
    /platform separator must not have a semantic target/i,
  )
})

test('the catalog contains no contextual or sidebar-specific presentation IDs', () => {
  const joined = APPLICATION_MENU_ITEM_IDS.join('\n')
  assert.doesNotMatch(
    joined,
    /ribbon|preview|guide-legend|design-check|sidebar|context-menu/,
  )
})
