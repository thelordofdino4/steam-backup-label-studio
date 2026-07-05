import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  CASE_INSERT_NAVIGATION_SURFACES,
  EDITOR_NAVIGATION_WORKSPACES,
  getCaseInsertNavigationRoute,
  getCaseInsertNavigationSurfaceForPane,
  getEditorNavigationShellRoleSections,
} from './editorNavigationShell.ts'

test('app-level workspace routing remains home disc and caseInsert', () => {
  const editorTypesSource = readFileSync(
    'src/editor/editorTypes.ts',
    'utf8',
  )

  assert.match(
    editorTypesSource,
    /export type EditorProjectType = 'disc' \| 'caseInsert'/,
  )
  assert.match(
    editorTypesSource,
    /export type EditorWorkspace = 'home' \| EditorProjectType/,
  )
})

test('editor navigation shell separates workspace editors from case surfaces', () => {
  assert.deepEqual(EDITOR_NAVIGATION_WORKSPACES, [
    { id: 'disc-label', label: 'Disc Label' },
    { id: 'case-insert', label: 'Case Insert' },
  ])
  assert.deepEqual(
    CASE_INSERT_NAVIGATION_SURFACES.map(({ id, label }) => ({ id, label })),
    [
      { id: 'front', label: 'Front' },
      { id: 'back', label: 'Back' },
      { id: 'spine', label: 'Spine' },
    ],
  )
})

test('editor navigation shell defines disc role sections', () => {
  const roleSections = getEditorNavigationShellRoleSections('disc-label')

  assert.deepEqual(
    roleSections.map(({ label }) => label),
    [
      'Game Title',
      'Big Background Image',
      'Game Info Logos',
      'Company Logos',
      'Legal Info',
      'Additional Artwork',
      'Additional Text',
    ],
  )
  assert.deepEqual(
    roleSections.map((section) => Object.keys(section)),
    roleSections.map(() => ['id', 'label']),
  )
})

test('editor navigation shell defines case front role sections', () => {
  assert.deepEqual(
    getEditorNavigationShellRoleSections('front').map(
      ({ label }) => label,
    ),
    [
      'Game Title',
      'Big Background Image',
      'Game Info Logos',
      'Company Logos',
      'Additional Artwork',
      'Additional Text',
    ],
  )
})

test('editor navigation shell defines case back role sections', () => {
  assert.deepEqual(
    getEditorNavigationShellRoleSections('back').map(({ label }) => label),
    [
      'Game Description Text',
      'Feature Bullets / Callouts',
      'Big Background Image',
      'Screenshots',
      'Game Info Logos',
      'Company Logos',
      'System Requirements',
      'Legal Info',
      'Additional Artwork',
      'Additional Text',
    ],
  )
})

test('editor navigation shell defines spine role sections', () => {
  assert.deepEqual(
    getEditorNavigationShellRoleSections('spine').map(({ label }) => label),
    [
      'Steam Logo / Steam Backup Branding',
      'Vertical Game Logo or Game Title',
      'Company Logo',
      'Optional Media Format Type',
      'Spine Background / Color / Artwork',
    ],
  )
})

test('editor navigation shell maps surfaces to existing workspace routes', () => {
  assert.deepEqual(getCaseInsertNavigationRoute('front'), {
    caseInsertPane: 'cover',
    navigationSurfaceId: 'front',
    roleSurfaceId: 'front',
  })
  assert.deepEqual(getCaseInsertNavigationRoute('back'), {
    caseInsertPane: 'tray',
    navigationSurfaceId: 'back',
    roleSurfaceId: 'back',
  })
})

test('spine routes through tray without creating a persisted spine pane', () => {
  const spineRoute = getCaseInsertNavigationRoute('spine')

  assert.deepEqual(spineRoute, {
    caseInsertPane: 'tray',
    navigationSurfaceId: 'spine',
    roleSurfaceId: 'spine',
  })
  assert.notEqual(spineRoute.caseInsertPane, 'spine')
  assert.deepEqual(
    CASE_INSERT_NAVIGATION_SURFACES.map(
      ({ id }) => getCaseInsertNavigationRoute(id).caseInsertPane,
    ),
    ['cover', 'tray', 'tray'],
  )
})

test('case insert pane changes map back to shell surfaces', () => {
  assert.equal(getCaseInsertNavigationSurfaceForPane('cover'), 'front')
  assert.equal(getCaseInsertNavigationSurfaceForPane('tray'), 'back')
})

test('issue 271 shell keeps existing editor controls reachable', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const caseInsertShellSource = readFileSync(
    'src/components/caseInsert/CaseInsertEditorShell.tsx',
    'utf8',
  )

  assert.match(
    appSource,
    /<ExportOptionsPanel[\s\S]*discRoleSectionItems\.map[\s\S]*<EditorNavigationRolePanel[\s\S]*<GamePanel/,
  )
  assert.match(appSource, /<ExportOptionsPanel/)
  assert.match(appSource, /<GamePanel \{\.\.\.gamePanelProps\} \/>/)
  assert.match(appSource, /<TemplatePanel/)
  assert.match(appSource, /<ArtworkPanel/)
  assert.match(appSource, /<BrandingPanel/)
  assert.match(appSource, /<TextPanel/)
  assert.match(caseInsertShellSource, /<CaseInsertSurfaceTabs/)
  assert.match(
    caseInsertShellSource,
    /roleSectionItems\.map[\s\S]*<EditorNavigationRolePanel[\s\S]*sidebarWorkflow\.map\(renderCaseInsertSidebarPanel\)/,
  )
  assert.doesNotMatch(appSource, /<EditorNavigationShell/)
  assert.doesNotMatch(caseInsertShellSource, /<EditorNavigationShell/)
  assert.doesNotMatch(appSource, /EditorNavigationRolePanels/)
  assert.doesNotMatch(caseInsertShellSource, /EditorNavigationRolePanels/)
})

test('issue 272 first disc role migration moves additional artwork controls only', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const artworkPanelSource = readFileSync(
    'src/components/sidebar/ArtworkPanel.tsx',
    'utf8',
  )

  assert.match(
    appSource,
    /import \{ AdditionalArtworkControls \} from '\.\.\/components\/sidebar\/artwork\/AdditionalArtworkControls'/,
  )
  assert.match(
    appSource,
    /const artworkPanelProps: ArtworkPanelProps = \{[\s\S]*projectAdditionalArtwork,[\s\S]*handleRemoveAdditionalArtworkElement,[\s\S]*\}/,
  )
  assert.match(
    appSource,
    /section\.id === 'additional-artwork'[\s\S]*<AdditionalArtworkControls \{\.\.\.artworkPanelProps\} \/>/,
  )
  assert.match(appSource, /<ArtworkPanel \{\.\.\.artworkPanelProps\} \/>/)
  assert.match(artworkPanelSource, /<BackgroundArtworkControls \{\.\.\.props\} \/>/)
  assert.match(artworkPanelSource, /<TitleArtworkControls \{\.\.\.props\} \/>/)
  assert.doesNotMatch(artworkPanelSource, /AdditionalArtworkControls/)
  assert.doesNotMatch(
    artworkPanelSource,
    /<EditorFeaturePanel title="Additional Artwork">/,
  )
})
