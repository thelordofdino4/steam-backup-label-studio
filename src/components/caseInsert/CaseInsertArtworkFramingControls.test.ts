import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createDefaultCaseInsertImageSlot,
} from '../../caseInsert/defaults.ts'
import {
  getCaseInsertArtworkFramingViewModel,
} from '../../caseInsert/artworkViewportFraming.ts'

const componentSource = readFileSync(
  'src/components/caseInsert/CaseInsertArtworkFramingControls.tsx',
  'utf8',
)
const templateSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateImageSlotControls.tsx',
  'utf8',
)
const spineSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineImageSlotControls.tsx',
  'utf8',
)
const templateHookSource = readFileSync(
  'src/hooks/useCaseInsertTemplateEditor.ts',
  'utf8',
)
const spineHookSource = readFileSync(
  'src/hooks/useJewelCaseSpineEditor.ts',
  'utf8',
)

test('shared framing controls expose exact native fit and accessible numeric controls', () => {
  assert.match(componentSource, /<fieldset/)
  assert.match(componentSource, /<legend>Image framing<\/legend>/)
  assert.match(componentSource, /<select/)
  assert.match(componentSource, /<option value="contain">Contain/)
  assert.match(componentSource, /<option value="cover">Cover/)
  assert.match(componentSource, /<option value="crop">Crop/)
  assert.match(componentSource, /label="Horizontal focus"/)
  assert.match(componentSource, /label="Vertical focus"/)
  assert.match(componentSource, /label="Zoom"/)
  assert.match(componentSource, /inputValidationMode="reject"/)
  assert.match(componentSource, /role="alert"/)
  assert.match(componentSource, /model\.showFocalPosition/)
  assert.match(componentSource, /model\.showZoom/)
  assert.doesNotMatch(componentSource, /querySelector|MutationObserver|setTimeout/)
})

test('template and Spine repeated artwork use one owner-backed framing component', () => {
  const templatePrimaryControls = templateSource.slice(
    templateSource.indexOf('export function PrimaryImageSlotControls'),
    templateSource.indexOf('function GroupedImageSlotControls'),
  )
  const spinePrimaryControls = spineSource.slice(
    spineSource.indexOf('export function SpineImageSlotControls'),
    spineSource.indexOf('export function SpineGroupedImageSlotControls'),
  )
  assert.doesNotMatch(templatePrimaryControls, /CaseInsertArtworkFramingControls/)
  assert.doesNotMatch(spinePrimaryControls, /CaseInsertArtworkFramingControls/)
  assert.equal(
    templateSource.match(/<CaseInsertArtworkFramingControls/g)?.length,
    1,
  )
  assert.equal(
    spineSource.match(/<CaseInsertArtworkFramingControls/g)?.length,
    1,
  )
  assert.match(
    templateSource,
    /slotKey === 'artworkSlots'[\s\S]*<CaseInsertArtworkFramingControls/,
  )
  assert.match(templateSource, /owner=\{paneId\}/)
  assert.match(
    templateSource,
    /actions\.handleGroupedArtworkFramingChange\([\s\S]*paneId,[\s\S]*slot\.id/,
  )
  assert.match(
    spineSource,
    /slotKey === 'artworkSlots'[\s\S]*<CaseInsertArtworkFramingControls/,
  )
  assert.match(
    spineSource,
    /owner=\{side === 'left' \? 'leftSpine' : 'rightSpine'\}/,
  )
  assert.match(
    spineSource,
    /actions\.handleSpineGroupedArtworkFramingChange\([\s\S]*side,[\s\S]*slot\.id/,
  )
  assert.doesNotMatch(templateSource, /CaseInsertArtworkFramingControls[\s\S]*slotKey="logoSlots"/)
  assert.doesNotMatch(spineSource, /CaseInsertArtworkFramingControls[\s\S]*slotKey="markSlots"/)
})

test('framing adapters route through immutable owner transitions without preset commands', () => {
  assert.match(templateHookSource, /transitionCaseInsertArtworkFraming/)
  assert.match(templateHookSource, /paneId,[\s\S]*slotId,[\s\S]*change/)
  assert.match(spineHookSource, /transitionJewelCaseSpineArtworkFraming/)
  for (const source of [componentSource, templateHookSource, spineHookSource]) {
    assert.doesNotMatch(
      source,
      /case\.layoutPreset\.(apply|reapply|detach)|CASE_INSERT_PRESET_CATALOG/,
    )
  }
  assert.doesNotMatch(
    componentSource,
    /widthPercent|heightPercent|visibleSourceRect|resolveCaseInsertArtworkViewportRenderArtifact/,
  )
})

test('template artwork source adapters preserve explicit slot and group enablement', () => {
  const pickerSourcePath = templateHookSource.slice(
    templateHookSource.indexOf('async function applyGroupedImageSlotSource'),
    templateHookSource.indexOf('async function handleImageSlotUpload'),
  )
  const uploadSourcePath = templateHookSource.slice(
    templateHookSource.indexOf('async function handleGroupedImageSlotUpload'),
    templateHookSource.indexOf('async function handleUseGroupedImageSlotSteamArtwork'),
  )

  for (const sourcePath of [pickerSourcePath, uploadSourcePath]) {
    assert.match(sourcePath, /setCaseInsertTemplateGroupedSlotImageSource/)
    assert.doesNotMatch(sourcePath, /enableAdditionalArtwork/)
  }
})

function framingSlot(
  options: Readonly<{
    fit: 'contain' | 'cover' | 'crop'
    source: boolean
    coordinateBasis?: 'frontSafe' | 'backPanelSafe'
  }>,
) {
  const slot = createDefaultCaseInsertImageSlot(
    'tray-artwork-1',
    'Screenshot 1',
    { enabled: true, fit: options.fit },
  )
  slot.imageDataUrl = options.source
    ? 'data:image/png;base64,AA=='
    : null
  slot.imageSize = options.source ? { width: 1600, height: 900 } : null
  slot.reservedArtworkViewport = {
    kind: 'sbls/case-insert-artwork-viewport',
    formatVersion: 1,
    templateId: 'jewelCase',
    templateRevision: null,
    coordinateBasis: options.coordinateBasis ?? 'backPanelSafe',
    widthPercent: 26,
    heightPercent: 16,
    focalPosition: { xPercent: 43, yPercent: 57 },
    zoom: 1.4,
  }
  return slot
}

test('eligible empty and populated screenshot slots project framing controls', () => {
  for (const source of [false, true]) {
    const model = getCaseInsertArtworkFramingViewModel(
      framingSlot({ fit: 'cover', source }),
      'tray',
    )
    assert.ok(model)
    assert.equal(model?.fit, 'cover')
    assert.equal(model?.showFocalPosition, false)
    assert.equal(model?.showZoom, false)
  }
  assert.match(componentSource, /<option value="contain">Contain/)
  assert.match(componentSource, /<option value="cover">Cover/)
  assert.match(componentSource, /<option value="crop">Crop/)
})

test('Crop with a source projects focal and Zoom controls while retaining all Fit options', () => {
  const model = getCaseInsertArtworkFramingViewModel(
    framingSlot({ fit: 'crop', source: true }),
    'tray',
  )

  assert.ok(model)
  assert.equal(model?.fit, 'crop')
  assert.equal(model?.showFocalPosition, true)
  assert.equal(model?.showZoom, true)
  assert.match(componentSource, /model\.showFocalPosition/)
  assert.match(componentSource, /model\.showZoom/)
  assert.match(componentSource, /label="Horizontal focus"/)
  assert.match(componentSource, /label="Vertical focus"/)
  assert.match(componentSource, /label="Zoom"/)
})

test('legacy and owner-incompatible slots fail closed without framing controls', () => {
  const legacy = createDefaultCaseInsertImageSlot(
    'tray-artwork-legacy',
    'Legacy artwork',
    { enabled: true, fit: 'cover' },
  )
  assert.equal(getCaseInsertArtworkFramingViewModel(legacy, 'tray'), null)
  assert.equal(getCaseInsertArtworkFramingViewModel(
    framingSlot({
      fit: 'crop',
      source: true,
      coordinateBasis: 'frontSafe',
    }),
    'tray',
  ), null)
})

test('template screenshot framing precedes status and Border controls', () => {
  const framingIndex = templateSource.indexOf(
    '<CaseInsertArtworkFramingControls',
  )
  const statusIndex = templateSource.indexOf(
    '<CaseInsertImageSlotStatusCard',
    framingIndex,
  )
  const borderIndex = templateSource.indexOf(
    '<EditorArtworkFrameControls',
    framingIndex,
  )

  assert.ok(framingIndex >= 0)
  assert.ok(statusIndex > framingIndex)
  assert.ok(borderIndex > statusIndex)
})
