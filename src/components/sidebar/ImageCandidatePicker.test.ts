import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const picker = read('./ImageCandidatePicker.tsx')
const webArtwork = read('./artwork/WebArtworkCandidateControls.tsx')
const steamArtwork = read('./artwork/SteamArtworkControls.tsx')
const localScreenshots = read('./artwork/LocalScreenshotControls.tsx')
const editorImages = read('../editor/EditorImageSourceControls.tsx')
const editorLogos = read('../editor/EditorLogoCandidateControls.tsx')
const caseImages = read('../caseInsert/CaseInsertImageSourceControls.tsx')
const caseLogos = read('../caseInsert/CaseInsertLogoSlotControls.tsx')
const discImages = read('./artwork/ArtworkImageSourceControls.tsx')
const discLogos = read('./branding/LogoAssetControls.tsx')

test('all current candidate families still consume the one shared picker owner', () => {
  assert.match(picker, /export function ImageCandidatePreviewPicker/)
  for (const source of [webArtwork, steamArtwork, localScreenshots, editorLogos]) {
    assert.match(source, /ImageCandidatePreviewPicker/)
  }
  assert.equal(
    (editorImages.match(/<ImageCandidatePreviewPicker/g) ?? []).length,
    3,
  )
  assert.match(caseImages, /EditorImageSourceControls/)
  assert.match(discImages, /EditorImageSourceControls/)
  assert.match(caseLogos, /EditorLogoAssetControls/)
  assert.match(discLogos, /EditorLogoAssetControls/)
})

test('picker keeps candidate meaning in consumers and owns only modal mechanics', () => {
  assert.match(picker, /await onSelect\(itemId\)/)
  assert.match(picker, /data-image-candidate-selected=/)
  assert.match(picker, /aria-modal="true"/)
  assert.match(picker, /getImageCandidatePickerTabTarget/)
  assert.match(picker, /restoreImageCandidatePickerFocus/)
  for (const forbidden of [
    'candidate.score',
    'sort(',
    'project.',
    'setProject',
    'dispatch(',
    'invoke(',
  ]) {
    assert.equal(picker.includes(forbidden), false, forbidden)
  }
})
