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

function assertSourceOrder(source: string, orderedSnippets: readonly string[]) {
  const positions = orderedSnippets.map((snippet) => {
    const index = source.indexOf(snippet)
    assert.notEqual(index, -1, `Expected source to contain ${snippet}`)
    return index
  })

  positions.forEach((position, index) => {
    if (index === 0) {
      return
    }

    assert.ok(
      position > positions[index - 1],
      `Expected ${orderedSnippets[index - 1]} before ${orderedSnippets[index]}`,
    )
  })
}

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
      'Background Image',
      'Game Title',
      'Game Info Logos',
      'Company Logos',
      'Legal Text',
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
      'Background Image',
      'Game Title',
      'Game Info Logos',
      'Company Logos',
      'Legal Info',
      'Additional Artwork',
      'Additional Text',
    ],
  )
})

test('editor navigation shell defines case back role sections', () => {
  assert.deepEqual(
    getEditorNavigationShellRoleSections('back').map(({ label }) => label),
    [
      'Background Image',
      'Game Title',
      'Screenshots',
      'Game Info Logos',
      'Company Logos',
      'Game Description Text',
      'Feature Bullets / Callouts',
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
      'Background Image',
      'Vertical Game Logo or Game Title',
      'Steam Logo / Steam Backup Branding',
      'Company Logo',
      'Optional Media Format Type',
      'Game Info Logos',
      'Legal Info',
      'Additional Artwork',
      'Additional Text',
    ],
  )
})

test('legal role is present on every surface with visible legal text controls', () => {
  assert.deepEqual(
    {
      'disc-label': getEditorNavigationShellRoleSections('disc-label')
        .filter(({ id }) => id === 'legal-info')
        .map(({ label }) => label),
      front: getEditorNavigationShellRoleSections('front')
        .filter(({ id }) => id === 'legal-info')
        .map(({ label }) => label),
      back: getEditorNavigationShellRoleSections('back')
        .filter(({ id }) => id === 'legal-info')
        .map(({ label }) => label),
      spine: getEditorNavigationShellRoleSections('spine')
        .filter(({ id }) => id === 'legal-info')
        .map(({ label }) => label),
    },
    {
      'disc-label': ['Legal Text'],
      front: ['Legal Info'],
      back: ['Legal Info'],
      spine: ['Legal Info'],
    },
  )
})

test('company logo role is present on every applicable editor surface', () => {
  assert.deepEqual(
    {
      'disc-label': getEditorNavigationShellRoleSections('disc-label')
        .filter(({ id }) => id === 'company-logos')
        .map(({ id }) => id),
      front: getEditorNavigationShellRoleSections('front')
        .filter(({ id }) => id === 'company-logos')
        .map(({ id }) => id),
      back: getEditorNavigationShellRoleSections('back')
        .filter(({ id }) => id === 'company-logos')
        .map(({ id }) => id),
      spine: getEditorNavigationShellRoleSections('spine')
        .filter(({ id }) => id === 'company-logo')
        .map(({ id }) => id),
    },
    {
      'disc-label': ['company-logos'],
      front: ['company-logos'],
      back: ['company-logos'],
      spine: ['company-logo'],
    },
  )
})

test('game info logo role is present on every applicable editor surface', () => {
  assert.deepEqual(
    {
      'disc-label': getEditorNavigationShellRoleSections('disc-label')
        .filter(({ id }) => id === 'game-info-logos')
        .map(({ id }) => id),
      front: getEditorNavigationShellRoleSections('front')
        .filter(({ id }) => id === 'game-info-logos')
        .map(({ id }) => id),
      back: getEditorNavigationShellRoleSections('back')
        .filter(({ id }) => id === 'game-info-logos')
        .map(({ id }) => id),
      spine: getEditorNavigationShellRoleSections('spine')
        .filter(({ id }) => id === 'game-info-logos')
        .map(({ id }) => id),
    },
    {
      'disc-label': ['game-info-logos'],
      front: ['game-info-logos'],
      back: ['game-info-logos'],
      spine: ['game-info-logos'],
    },
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

test('case insert tab clicks route back and spine through tray behavior', () => {
  assert.deepEqual(getCaseInsertNavigationRoute('back'), {
    caseInsertPane: 'tray',
    navigationSurfaceId: 'back',
    roleSurfaceId: 'back',
  })
  assert.deepEqual(getCaseInsertNavigationRoute('spine'), {
    caseInsertPane: 'tray',
    navigationSurfaceId: 'spine',
    roleSurfaceId: 'spine',
  })
})

test('case insert pane changes map back to shell surfaces', () => {
  assert.equal(getCaseInsertNavigationSurfaceForPane('cover'), 'front')
  assert.equal(getCaseInsertNavigationSurfaceForPane('tray'), 'back')
})

test('case insert pane changes normalize shell surface support in App', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')

  assert.match(appSource, /normalizeCaseInsertNavigationSurfaceForPane/)
  assert.match(
    appSource,
    /setActiveCaseInsertNavigationSurface\(\s*normalizeCaseInsertNavigationSurfaceForPane\(\s*paneId,\s*activeCaseInsertNavigationSurface,\s*\),\s*\)/,
  )
})

test('issue 271 shell keeps existing editor controls reachable', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const caseInsertShellSource = readFileSync(
    'src/components/caseInsert/CaseInsertEditorShell.tsx',
    'utf8',
  )

  assert.match(
    appSource,
    /<ProjectPanel[\s\S]*<ExportOptionsPanel[\s\S]*<TemplatePanel[\s\S]*<GamePanel \{\.\.\.gamePanelProps\} \/>[\s\S]*discRoleSectionItems\.map[\s\S]*<EditorNavigationRolePanel/,
  )
  assert.match(appSource, /<ExportOptionsPanel/)
  assert.match(appSource, /<GamePanel \{\.\.\.gamePanelProps\} \/>/)
  assert.match(appSource, /<TemplatePanel/)
  assert.match(appSource, /<DiscSteamBrandingControls/)
  assert.doesNotMatch(appSource, /<BrandingPanel/)
  assert.doesNotMatch(appSource, /<ArtworkPanel/)
  assert.doesNotMatch(appSource, /<TextPanel/)
  assert.match(caseInsertShellSource, /<CaseInsertSurfaceTabs/)
  assertSourceOrder(caseInsertShellSource, [
    '<CaseInsertSurfaceTabs',
    'setupSidebarPanels.map(renderCaseInsertSidebarPanel)',
    'roleSectionItems.map',
  ])
  assert.doesNotMatch(appSource, /<EditorNavigationShell/)
  assert.doesNotMatch(caseInsertShellSource, /<EditorNavigationShell/)
  assert.doesNotMatch(appSource, /EditorNavigationRolePanels/)
  assert.doesNotMatch(caseInsertShellSource, /EditorNavigationRolePanels/)
})

test('issue 272 disc sidebar order keeps setup controls, roles, then legacy panels', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const discRoleLabels = getEditorNavigationShellRoleSections(
    'disc-label',
  ).map(({ label }) => label)

  assertSourceOrder(appSource, [
    '<ProjectPanel',
    '<ExportOptionsPanel',
    '<TemplatePanel',
    '<GamePanel {...gamePanelProps} />',
    '<DiscSteamBrandingControls {...brandingPanelProps} />',
    'discRoleSectionItems.map',
  ])
  assert.deepEqual(discRoleLabels, [
    'Background Image',
    'Game Title',
    'Game Info Logos',
    'Company Logos',
    'Legal Text',
    'Additional Artwork',
    'Additional Text',
  ])
})

test('issue 272 disc legacy Text panel is removed after title text migration', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const programPanelSources = [
    'src/components/sidebar/ProjectPanel.tsx',
    'src/components/sidebar/ExportOptionsPanel.tsx',
    'src/components/sidebar/TemplatePanel.tsx',
    'src/components/sidebar/GamePanel.tsx',
    'src/components/sidebar/branding/DiscSteamBrandingControls.tsx',
  ].map((path) => readFileSync(path, 'utf8'))

  assert.doesNotMatch(appSource, /<TextPanel/)
  assert.doesNotMatch(appSource, /Text — Migrating Soon/)
  programPanelSources.forEach((source) => {
    assert.doesNotMatch(source, /Migrating Soon/)
    assert.doesNotMatch(source, /moved\s+into role panels/)
  })
})

test('issue 272 disc Game Title role owns visual title artwork and title text fallback', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const gameTitleTextSource = readFileSync(
    'src/components/sidebar/text/DiscGameTitleTextControls.tsx',
    'utf8',
  )

  assert.match(
    appSource,
    /import \{ BackgroundArtworkControls \} from '\.\.\/components\/sidebar\/artwork\/BackgroundArtworkControls'/,
  )
  assert.match(
    appSource,
    /import \{ AdditionalArtworkControls \} from '\.\.\/components\/sidebar\/artwork\/AdditionalArtworkControls'/,
  )
  assert.match(
    appSource,
    /import \{ TitleArtworkControls \} from '\.\.\/components\/sidebar\/artwork\/TitleArtworkControls'/,
  )
  assert.match(
    appSource,
    /import \{ DiscGameTitleTextControls \} from '\.\.\/components\/sidebar\/text\/DiscGameTitleTextControls'/,
  )
  assert.match(
    appSource,
    /const artworkPanelProps: ArtworkPanelProps = \{[\s\S]*projectAdditionalArtwork,[\s\S]*handleRemoveAdditionalArtworkElement,[\s\S]*\}/,
  )
  assert.match(
    appSource,
    /section\.id === 'background-artwork'[\s\S]*<BackgroundArtworkControls \{\.\.\.artworkPanelProps\} \/>/,
  )
  assert.match(
    appSource,
    /section\.id === 'game-title'[\s\S]*<TitleArtworkControls \{\.\.\.artworkPanelProps\} \/>[\s\S]*<DiscGameTitleTextControls \{\.\.\.textPanelProps\} \/>/,
  )
  assert.match(
    appSource,
    /section\.id === 'additional-artwork'[\s\S]*<AdditionalArtworkControls \{\.\.\.artworkPanelProps\} \/>/,
  )
  assert.doesNotMatch(appSource, /<ArtworkPanel \{\.\.\.artworkPanelProps\} \/>/)
  assert.match(gameTitleTextSource, /textKey="title"/)
  assert.match(gameTitleTextSource, /<DiscTextControl/)
})

test('issue 272 Legal Text role owns disc copyright text controls only', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const legalTextSource = readFileSync(
    'src/components/sidebar/text/DiscLegalTextControls.tsx',
    'utf8',
  )
  const gamePanelSource = readFileSync(
    'src/components/sidebar/GamePanel.tsx',
    'utf8',
  )

  assert.match(
    appSource,
    /import \{ DiscLegalTextControls \} from '\.\.\/components\/sidebar\/text\/DiscLegalTextControls'/,
  )
  assert.match(
    appSource,
    /section\.id === 'legal-info'[\s\S]*<DiscLegalTextControls \{\.\.\.textPanelProps\} \/>/,
  )
  assert.match(legalTextSource, /textKey="copyright"/)
  assert.match(legalTextSource, /<DiscTextControl/)
  assert.doesNotMatch(appSource, /<TextPanel/)
  assert.match(gamePanelSource, /Copyright \/ legal text/)
  assert.match(gamePanelSource, /projectMetadata\.copyrightText/)
})

test('issue 272 Additional Text role owns disc additional text controls only', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const gameTitleTextSource = readFileSync(
    'src/components/sidebar/text/DiscGameTitleTextControls.tsx',
    'utf8',
  )
  const additionalTextSource = readFileSync(
    'src/components/sidebar/text/DiscAdditionalTextControls.tsx',
    'utf8',
  )
  const gamePanelSource = readFileSync(
    'src/components/sidebar/GamePanel.tsx',
    'utf8',
  )

  assert.match(
    appSource,
    /import \{ DiscAdditionalTextControls \} from '\.\.\/components\/sidebar\/text\/DiscAdditionalTextControls'/,
  )
  assert.match(
    appSource,
    /section\.id === 'additional-text'[\s\S]*<DiscAdditionalTextControls \{\.\.\.textPanelProps\} \/>/,
  )

  for (const textKey of [
    'subtitle',
    'discNumber',
    'backupDate',
    'appId',
    'developer',
    'publisher',
    'installNotes',
    'customNote',
  ]) {
    assert.match(
      additionalTextSource,
      new RegExp(`'${textKey}'`),
      `${textKey} should be owned by DiscAdditionalTextControls`,
    )
  }

  assert.doesNotMatch(additionalTextSource, /'title'/)
  assert.doesNotMatch(additionalTextSource, /'copyright'/)
  assert.match(additionalTextSource, /<DiscTextControl/)
  assert.match(gameTitleTextSource, /textKey="title"/)
  assert.doesNotMatch(gameTitleTextSource, /textKey="copyright"/)

  assert.match(gamePanelSource, /game-subtitle/)
  assert.match(gamePanelSource, /game-metadata-app-id/)
  assert.match(gamePanelSource, /game-metadata-install-notes/)
})

test('issue 272 Company Logos role owns developer and publisher logo controls', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const companyLogoControlsSource = readFileSync(
    'src/components/sidebar/branding/CompanyLogoControls.tsx',
    'utf8',
  )

  assert.match(
    appSource,
    /import \{ CompanyLogoControls \} from '\.\.\/components\/sidebar\/branding\/CompanyLogoControls'/,
  )
  assert.match(
    appSource,
    /const brandingPanelProps: BrandingPanelProps = \{[\s\S]*projectLogoAssets,[\s\S]*handleRemoveAdditionalLogoAsset,[\s\S]*\}/,
  )
  assert.match(
    appSource,
    /section\.id === 'company-logos'[\s\S]*<CompanyLogoControls \{\.\.\.brandingPanelProps\} \/>/,
  )
  assert.doesNotMatch(appSource, /<LogoAssetControls/)
  assert.doesNotMatch(appSource, /<BrandingPanel/)

  assert.match(companyLogoControlsSource, /LogoAssetControls/)
  assert.match(
    companyLogoControlsSource,
    /<EditorFeaturePanel title="Developer \/ publisher logos" variant="branding">/,
  )
  assert.match(companyLogoControlsSource, /logoKey="developer"/)
  assert.match(companyLogoControlsSource, /label="Developer"/)
  assert.match(companyLogoControlsSource, /logoKey="publisher"/)
  assert.match(companyLogoControlsSource, /label="Publisher"/)
})

test('issue 272 Game Info Logos role owns disc mark controls', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const gameInfoLogoControlsSource = readFileSync(
    'src/components/sidebar/branding/GameInfoLogoControls.tsx',
    'utf8',
  )

  assert.match(
    appSource,
    /import \{ GameInfoLogoControls \} from '\.\.\/components\/sidebar\/branding\/GameInfoLogoControls'/,
  )
  assert.match(
    appSource,
    /section\.id === 'game-info-logos'[\s\S]*<GameInfoLogoControls \{\.\.\.brandingPanelProps\} \/>/,
  )
  assert.doesNotMatch(appSource, /<BrandingPanel/)

  assert.match(gameInfoLogoControlsSource, /RatingBadgeControls/)
  assert.match(gameInfoLogoControlsSource, /MediaMarkControls/)
  assert.match(gameInfoLogoControlsSource, /PlatformMarkControls/)
  assert.match(gameInfoLogoControlsSource, /TechnicalMarkControls/)
  assert.match(
    gameInfoLogoControlsSource,
    /<EditorFeaturePanel title="Rating badge" variant="branding">/,
  )
  assert.match(
    gameInfoLogoControlsSource,
    /<EditorFeaturePanel title="Media format mark" variant="branding">/,
  )
  assert.match(
    gameInfoLogoControlsSource,
    /<EditorFeaturePanel title="Operating system marks" variant="branding">/,
  )
  assert.match(
    gameInfoLogoControlsSource,
    /<EditorFeaturePanel title="Technical marks" variant="branding">/,
  )
})

test('issue 272 Steam Branding setup panel owns disc Steam banner controls', () => {
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const discSteamBrandingSource = readFileSync(
    'src/components/sidebar/branding/DiscSteamBrandingControls.tsx',
    'utf8',
  )

  assert.match(
    appSource,
    /import \{ DiscSteamBrandingControls \} from '\.\.\/components\/sidebar\/branding\/DiscSteamBrandingControls'/,
  )
  assertSourceOrder(appSource, [
    '<TemplatePanel',
    '<GamePanel {...gamePanelProps} />',
    '<DiscSteamBrandingControls {...brandingPanelProps} />',
    'discRoleSectionItems.map',
  ])
  assert.doesNotMatch(appSource, /<BrandingPanel/)

  assert.match(
    discSteamBrandingSource,
    /<EditorPanel title="Steam Branding">/,
  )
  assert.match(discSteamBrandingSource, /<SteamBannerControls \{\.\.\.props\} \/>/)
  assert.doesNotMatch(discSteamBrandingSource, /Migrating Soon/)
})
