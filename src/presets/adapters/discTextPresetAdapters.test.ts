import assert from 'node:assert/strict'
import test from 'node:test'

import type { DiscTextLayout } from '../../discText/types.ts'
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
const legalStyle = createDefaultDiscTextStyles().copyright
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
        layout: baseLayout,
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

test('applies straight title geometry without enabling or fitting content', () => {
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
      layout: owner.layout,
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
      align: 'center',
      mode: 'straight',
    },
  }])
  assert.equal('enabled' in (result.updates[0]?.layout ?? {}), false)
  assert.equal('fontSizePt' in (result.updates[0]?.layout ?? {}), false)
  assert.equal(JSON.stringify(owner), before)
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
