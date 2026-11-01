import assert from 'node:assert/strict'
import test from 'node:test'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import { legacyImageFormatWarning } from './legacyImageFormatWarning.ts'

test('legacy format warning inspects retained registered images without changing the project', () => {
  const disc = createBlankDiscSavedProject()
  assert.equal(legacyImageFormatWarning(disc), '')
  disc.background.note = 'data:image/svg+xml,<svg/>'
  assert.equal(legacyImageFormatWarning(disc), '')
  disc.background.enabled = false
  disc.background.imageDataUrl = 'data:image/svg+xml,<svg/>'
  const before = JSON.stringify(disc)
  assert.match(legacyImageFormatWarning(disc), /contains SVG/)
  assert.equal(JSON.stringify(disc), before)
  disc.background.imageDataUrl = 'data:image/png;base64,AA=='
  assert.equal(legacyImageFormatWarning(disc), '')
})

test('legacy Case retained image receives the same warning across the closed slot owners', () => {
  const project = createBlankJewelCaseSavedProject('Legacy Case')
  project.caseInsert.templates.cover.background.imageDataUrl = 'data:image/avif;base64,AA=='
  assert.match(legacyImageFormatWarning(project), /cannot be saved as \.sbls/)
})
