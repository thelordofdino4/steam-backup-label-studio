import assert from 'node:assert/strict'
import test from 'node:test'

import type { DiscTextLayout } from '../../discText/types.ts'
import { getDefaultDiscTextPointSize } from '../../discText/pointSize.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
} from '../../discText/renderLayout.ts'
import { createDefaultDiscTextStyles } from '../../discText/styles.ts'
import { discTemplates } from '../../templates/discTemplates.ts'
import { CLASSIC_TOP_TITLE_DISC_PRESET } from '../builtins/classicTopTitleDiscPreset.ts'
import type {
  DiscPresetOwnerPlacementContext,
} from '../discPresetPlacementAdapters.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../discPresetResolution.ts'
import {
  DISC_GAME_TITLE_TEXT_PRESET_ADAPTER,
  DISC_LEGAL_TEXT_PRESET_ADAPTER,
  getDiscTextPresetPosition,
} from './discTextPresetAdapters.ts'

const template = createDiscPresetTemplateResolutionInput(
  discTemplates.standardPrintableDisc,
)
const resolution = resolveDiscPresetDefinition({
  definition: CLASSIC_TOP_TITLE_DISC_PRESET,
  template,
})

if (resolution.status === 'rejected') {
  throw new Error('Classic fixture must resolve.')
}

const baseLayout: DiscTextLayout = {
  x: 4,
  y: 5,
  width: 40,
  scale: 1.2,
  fontSizePt: 16,
  align: 'left',
  mode: 'curved',
  arcDegrees: 110,
  arcSide: 'top',
  avoidVisualElements: true,
}
const textStyles = createDefaultDiscTextStyles()
const titleStyle = textStyles.title
const legalStyle = textStyles.copyright
const measureText = (text: string, font: string) => {
  const fontSize = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 1)
  return Array.from(text).length * fontSize * 0.55
}

function getContext<TTarget extends 'game-title.text' | 'legal.copyright'>(
  target: TTarget,
  _key: TTarget extends 'game-title.text' ? 'title' : 'copyright',
  enabled = false,
): DiscPresetOwnerPlacementContext<TTarget> {
  const slot = resolution.preset.slots.find((candidate) =>
    candidate.placements.some((placement) => placement.target === target))
  const placement = slot?.placements.find(
    (candidate) => candidate.target === target,
  )
  if (!slot || !placement) throw new Error(`Missing ${target} fixture.`)

  const ownerState = target === 'legal.copyright'
    ? {
        key: 'copyright' as const,
        enabled,
        content: Object.freeze({ plainText: 'Copyright content' }),
        layout: baseLayout,
        style: legalStyle,
        template: discTemplates.standardPrintableDisc,
      }
    : {
        key: 'title' as const,
        enabled,
        content: Object.freeze({ plainText: 'Portal 2' }),
        layout: baseLayout,
        style: titleStyle,
        template: discTemplates.standardPrintableDisc,
      }

  return {
    slot,
    placement: placement as DiscPresetOwnerPlacementContext<TTarget>['placement'],
    ownerState: ownerState as
      DiscPresetOwnerPlacementContext<TTarget>['ownerState'],
    services: {
      textMeasurement: { measureText },
    },
    template,
  }
}

test('converts Disc center-relative text coordinates through one helper', () => {
  assert.deepEqual(getDiscTextPresetPosition({
    centerXPercent: 50,
    centerYPercent: 12,
    widthPercent: 20,
    heightPercent: 10,
  }), { x: 0, y: 12 })
  assert.deepEqual(getDiscTextPresetPosition({
    centerXPercent: 21,
    centerYPercent: 22,
    widthPercent: 20,
    heightPercent: 10,
  }), { x: -29, y: 22 })
  assert.deepEqual(getDiscTextPresetPosition({
    centerXPercent: 79,
    centerYPercent: 32,
    widthPercent: 20,
    heightPercent: 10,
  }), { x: 29, y: 32 })
})

test('applies dormant measured Title geometry at the template default size', () => {
  const owner = {
    key: 'title',
    enabled: false,
    value: 'Preserved title',
    htmlSource: '<b>Preserved title</b>',
    valueSource: 'manual',
    style: { color: '#ff00ff', fontFamily: 'Example' },
    layout: baseLayout,
  }
  const before = JSON.stringify(owner)
  const context = getContext('game-title.text', 'title')
  const result = DISC_GAME_TITLE_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      key: 'title',
      enabled: owner.enabled,
      content: { plainText: owner.value },
      layout: owner.layout,
      style: titleStyle,
      template: discTemplates.standardPrintableDisc,
    },
  })

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.updates, [{
    kind: 'disc-text-layout',
    slotId: 'disc:guided:game-title:primary',
    target: 'game-title.text',
    key: 'title',
    layout: {
      x: 0,
      y: 19.5,
      width: 62,
      fontSizePt: getDefaultDiscTextPointSize(
        'title',
        1,
        discTemplates.standardPrintableDisc,
        'straight',
      ),
      align: 'center',
      mode: 'straight',
      avoidVisualElements: false,
    },
  }])
  assert.equal('enabled' in (result.updates[0]?.layout ?? {}), false)
  assert.equal(JSON.stringify(owner), before)
})

test('fits enabled Title content below its template default without patching the shared slot', () => {
  const context = getContext('game-title.text', 'title', true)
  const preferredPointSize = getDefaultDiscTextPointSize(
    'title',
    1,
    discTemplates.standardPrintableDisc,
    'straight',
  )
  const short = DISC_GAME_TITLE_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      ...context.ownerState!,
      content: { plainText: 'Portal 2' },
    },
  })
  const long = DISC_GAME_TITLE_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      ...context.ownerState!,
      content: {
        plainText:
          'The Unreasonably Elaborate Adventures of a Very Determined Archivist',
      },
    },
  })

  assert.equal(short.status, 'applied')
  assert.equal(short.updates[0]?.layout.fontSizePt, preferredPointSize)
  assert.equal(short.resolvedSlotPatch, undefined)
  assert.equal(long.status, 'applied')
  assert.ok((long.updates[0]?.layout.fontSizePt ?? 0) < preferredPointSize)
  assert.ok((long.updates[0]?.layout.fontSizePt ?? 0) >= 8)
  assert.ok(long.warnings.some(({ kind }) => kind === 'text-fit-adjusted'))
  assert.equal(long.resolvedSlotPatch, undefined)
})

test('impossible Title content leaves the shared Title slot unpatched', () => {
  const context = getContext('game-title.text', 'title', true)
  const result = DISC_GAME_TITLE_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      ...context.ownerState!,
      content: {
        plainText: Array.from(
          { length: 20 },
          (_, index) => `Title line ${index + 1}`,
        ).join('\n'),
      },
    },
  })

  assert.equal(result.status, 'partial')
  assert.deepEqual(result.updates, [])
  assert.equal(result.resolvedSlotPatch, undefined)
  assert.deepEqual(result.warnings, [{
    kind: 'text-fit-impossible',
    slotId: 'disc:guided:game-title:primary',
    target: 'game-title.text',
  }])
})

test('disabled Legal content receives dormant measured placement', () => {
  const owner = {
    key: 'copyright',
    enabled: false,
    value: 'Copyright content',
    htmlSource: '<i>Copyright content</i>',
    valueSource: 'metadata',
    layout: baseLayout,
  }
  const before = JSON.stringify(owner)
  const context = getContext('legal.copyright', 'copyright')
  const result = DISC_LEGAL_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      key: 'copyright',
      enabled: owner.enabled,
      content: { plainText: owner.value },
      layout: owner.layout,
      style: legalStyle,
      template: discTemplates.standardPrintableDisc,
    },
  })

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.updates[0], {
    kind: 'disc-text-layout',
    slotId: 'disc:guided:legal-text:copyright',
    target: 'legal.copyright',
    key: 'copyright',
    layout: {
      x: 0,
      y: 85,
      width: 46,
      fontSizePt: 7,
      align: 'center',
      mode: 'straight',
      avoidVisualElements: false,
    },
  })
  assert.deepEqual(result.resolvedSlotPatch, {
    slotId: 'disc:guided:legal-text:copyright',
    resolvedContentRegion: {
      centerXPercent: 50,
      centerYPercent: 85,
      widthPercent: 46,
      heightPercent: 8,
    },
    resolvedActionRegion: {
      centerXPercent: 50,
      centerYPercent: 85,
      widthPercent: 46,
      heightPercent: 8,
    },
    status: 'resolved',
  })
  assert.deepEqual(result.warnings, [])
  assert.equal(JSON.stringify(owner), before)
})

test('Legal preset fitting contains every rendered box and paint effect in its resolved rectangle', () => {
  const context = getContext('legal.copyright', 'copyright', true)
  const decoratedStyle = {
    ...legalStyle,
    backgroundEnabled: true,
    backgroundPadding: 3,
    borderEnabled: true,
  }
  const content = 'Copyright content'
  const result = DISC_LEGAL_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      ...context.ownerState!,
      content: { plainText: content },
      style: decoratedStyle,
    },
  })

  assert.equal(result.status, 'applied')
  const update = result.updates[0]
  assert.equal(update?.kind, 'disc-text-layout')
  if (!update || update.kind !== 'disc-text-layout') return
  assert.ok((update.layout.fontSizePt ?? 7) < 7)

  const fittedLayout: DiscTextLayout = {
    ...baseLayout,
    ...update.layout,
  }
  const bounds = getStraightDiscTextVisualBounds(
    getStraightDiscTextRenderLayout(
      'copyright',
      content,
      fittedLayout,
      measureText,
      { copyright: decoratedStyle },
      { template: discTemplates.standardPrintableDisc },
    ),
    measureText,
    { includeRenderedBox: true, includeRenderedPaint: true },
  )
  const region = context.slot.resolvedContentRegion

  assert.ok(bounds.centerX - bounds.halfWidth >=
    region.centerXPercent - region.widthPercent / 2 - 0.000001)
  assert.ok(bounds.centerX + bounds.halfWidth <=
    region.centerXPercent + region.widthPercent / 2 + 0.000001)
  assert.ok(bounds.centerY - bounds.halfHeight >=
    region.centerYPercent - region.heightPercent / 2 - 0.000001)
  assert.ok(bounds.centerY + bounds.halfHeight <=
    region.centerYPercent + region.heightPercent / 2 + 0.000001)
})

test('impossible enabled Legal content produces no false owner update', () => {
  const context = getContext('legal.copyright', 'copyright', true)
  const result = DISC_LEGAL_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      key: 'copyright',
      enabled: true,
      content: {
        plainText: Array.from(
          { length: 24 },
          (_, index) => `Legal line ${index + 1}`,
        ).join('\n'),
      },
      layout: baseLayout,
      style: legalStyle,
      template: discTemplates.standardPrintableDisc,
    },
  })

  assert.equal(result.status, 'partial')
  assert.deepEqual(result.updates, [])
  assert.deepEqual(result.resolvedSlotPatch, {
    slotId: 'disc:guided:legal-text:copyright',
    status: 'unsupported',
  })
  assert.deepEqual(result.warnings, [{
    kind: 'text-fit-impossible',
    slotId: 'disc:guided:legal-text:copyright',
    target: 'legal.copyright',
  }])
})

test('honors explicit font size and rejects curved or mismatched owners', () => {
  const context = getContext('game-title.text', 'title', true)
  const explicitSize = DISC_GAME_TITLE_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    placement: { ...context.placement, fit: 'fixed', fontSizePt: 22 },
  })
  const curved = DISC_GAME_TITLE_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    placement: { ...context.placement, mode: 'curved' } as
      typeof context.placement,
  })
  const wrongOwner = DISC_GAME_TITLE_TEXT_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      key: 'copyright',
      enabled: false,
      layout: baseLayout,
    } as typeof context.ownerState,
  })

  assert.equal(explicitSize.updates[0]?.layout.fontSizePt, 22)
  assert.equal(curved.status, 'unsupported')
  assert.equal(
    'reason' in curved.warnings[0]! && curved.warnings[0].reason,
    'unsupported-text-mode',
  )
  assert.equal(wrongOwner.status, 'unsupported')
})
