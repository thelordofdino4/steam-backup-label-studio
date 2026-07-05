import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  EDITOR_NAVIGATION_SHELL_SMOKE_IDS,
  getCaseInsertNavigationSurfaceTabItems,
  getCaseInsertNavigationSurfaceTabSmokeId,
  getEditorNavigationShellRoleSectionItems,
  getEditorNavigationShellRoleSectionSmokeId,
} from './editorNavigationShellViewModel.ts'

test('editor navigation shell view model exposes stable smoke ids', () => {
  assert.deepEqual(EDITOR_NAVIGATION_SHELL_SMOKE_IDS, {
    caseInsertSurfaceTabs: 'case-insert-surface-tabs',
  })
  assert.equal(
    getCaseInsertNavigationSurfaceTabSmokeId('front'),
    'case-insert-surface-tab-front',
  )
  assert.equal(
    getEditorNavigationShellRoleSectionSmokeId('disc-label', 'game-title'),
    'editor-role-section-disc-label-game-title',
  )
})

test('case insert surface tab items mark only the active surface', () => {
  const surfaceItems = getCaseInsertNavigationSurfaceTabItems('spine')

  assert.deepEqual(
    surfaceItems.map(({ id, label, active, smokeId }) => ({
      id,
      label,
      active,
      smokeId,
    })),
    [
      {
        id: 'front',
        label: 'Front',
        active: false,
        smokeId: 'case-insert-surface-tab-front',
      },
      {
        id: 'back',
        label: 'Back',
        active: false,
        smokeId: 'case-insert-surface-tab-back',
      },
      {
        id: 'spine',
        label: 'Spine',
        active: true,
        smokeId: 'case-insert-surface-tab-spine',
      },
    ],
  )
})

test('editor navigation shell role section items follow the active surface', () => {
  assert.deepEqual(
    getEditorNavigationShellRoleSectionItems('back').map(
      ({ id, label, smokeId }) => ({
        id,
        label,
        smokeId,
      }),
    ),
    [
      {
        id: 'game-description-text',
        label: 'Game Description Text',
        smokeId: 'editor-role-section-back-game-description-text',
      },
      {
        id: 'feature-bullets-callouts',
        label: 'Feature Bullets / Callouts',
        smokeId: 'editor-role-section-back-feature-bullets-callouts',
      },
      {
        id: 'big-background-image',
        label: 'Big Background Image',
        smokeId: 'editor-role-section-back-big-background-image',
      },
      {
        id: 'screenshots',
        label: 'Screenshots',
        smokeId: 'editor-role-section-back-screenshots',
      },
      {
        id: 'game-info-logos',
        label: 'Game Info Logos',
        smokeId: 'editor-role-section-back-game-info-logos',
      },
      {
        id: 'company-logos',
        label: 'Company Logos',
        smokeId: 'editor-role-section-back-company-logos',
      },
      {
        id: 'system-requirements',
        label: 'System Requirements',
        smokeId: 'editor-role-section-back-system-requirements',
      },
      {
        id: 'legal-info',
        label: 'Legal Info',
        smokeId: 'editor-role-section-back-legal-info',
      },
      {
        id: 'additional-artwork',
        label: 'Additional Artwork',
        smokeId: 'editor-role-section-back-additional-artwork',
      },
      {
        id: 'additional-text',
        label: 'Additional Text',
        smokeId: 'editor-role-section-back-additional-text',
      },
    ],
  )
})

test('editor navigation shell renders role sections as top-level panels', () => {
  const shellSource = readFileSync(
    'src/components/editor/EditorNavigationShell.tsx',
    'utf8',
  )

  assert.match(shellSource, /import \{ EditorPanel \}/)
  assert.match(shellSource, /children\?: ReactNode/)
  assert.match(shellSource, /export function EditorNavigationRolePanel/)
  assert.match(shellSource, /<EditorPanel title=\{label\}>/)
  assert.match(shellSource, /children \?\?/)
  assert.match(shellSource, /className="hint"/)
  assert.match(shellSource, /Controls move here in #272\/#274\./)
  assert.doesNotMatch(shellSource, /export function EditorNavigationRolePanels/)
  assert.doesNotMatch(shellSource, /roleSectionItems\.map/)
  assert.doesNotMatch(shellSource, /editor-role-placeholder-panel/)
  assert.doesNotMatch(shellSource, /editor-role-placeholder-text/)
  assert.doesNotMatch(shellSource, /<EditorPanel[^>]*className=/)
  assert.doesNotMatch(shellSource, /<section/)
  assert.doesNotMatch(shellSource, /kind="feature"/)
  assert.doesNotMatch(shellSource, /editor-navigation-shell-content/)
  assert.doesNotMatch(shellSource, /editor-role-section-scaffold/)
  assert.doesNotMatch(shellSource, /editor-role-section-panels/)
  assert.doesNotMatch(shellSource, /editor-role-section-list/)
  assert.doesNotMatch(shellSource, /editor-role-section-item/)
})
