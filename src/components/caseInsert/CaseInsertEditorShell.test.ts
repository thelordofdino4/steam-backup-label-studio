import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  getCaseInsertNavigationSurfaceTabItems,
} from '../editor/editorNavigationShellViewModel.ts'

const shellSource = readFileSync(
  'src/components/caseInsert/CaseInsertEditorShell.tsx',
  'utf8',
)
const templateBrandingPath =
  'src/components/caseInsert/CaseInsertTemplateBrandingControls.tsx'
const spineBrandingSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineBrandingControls.tsx',
  'utf8',
)
const templateCompanyLogoSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateCompanyLogoControls.tsx',
  'utf8',
)
const templateBackgroundArtworkSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateBackgroundArtworkControls.tsx',
  'utf8',
)
const spineBackgroundArtworkSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineBackgroundArtworkControls.tsx',
  'utf8',
)
const templateAdditionalArtworkSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateAdditionalArtworkControls.tsx',
  'utf8',
)
const templateGameTitlePath =
  'src/components/caseInsert/CaseInsertTemplateGameTitleControls.tsx'
const templateGameTitleSource = readFileSync(templateGameTitlePath, 'utf8')
const spineAdditionalArtworkSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineAdditionalArtworkControls.tsx',
  'utf8',
)
const spineGameTitlePath =
  'src/components/caseInsert/CaseInsertSpineGameTitleControls.tsx'
const spineGameTitleSource = readFileSync(spineGameTitlePath, 'utf8')
const templateAdditionalTextSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateAdditionalTextControls.tsx',
  'utf8',
)
const spineAdditionalTextSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineAdditionalTextControls.tsx',
  'utf8',
)
const spineCompanyLogoSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineCompanyLogoControls.tsx',
  'utf8',
)
const templateGameInfoLogoSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateGameInfoLogoControls.tsx',
  'utf8',
)
const templateTextSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateTextControls.tsx',
  'utf8',
)
const spineTextSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineTextControls.tsx',
  'utf8',
)
const templateLegalInfoSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateLegalInfoControls.tsx',
  'utf8',
)
const templateGameDescriptionTextSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateGameDescriptionTextControls.tsx',
  'utf8',
)
const templateFeatureBulletsSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateFeatureBulletsControls.tsx',
  'utf8',
)
const templateSystemRequirementsSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateSystemRequirementsControls.tsx',
  'utf8',
)
const templateScreenshotsSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateScreenshotsControls.tsx',
  'utf8',
)
const spineLegalInfoSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineLegalInfoControls.tsx',
  'utf8',
)
const spineOptionalMediaFormatTypeSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineOptionalMediaFormatTypeControls.tsx',
  'utf8',
)
const templateSteamBrandingSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateSteamBrandingControls.tsx',
  'utf8',
)
const spineSteamBrandingSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineSteamBrandingControls.tsx',
  'utf8',
)
const spineImageSlotControlsSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineImageSlotControls.tsx',
  'utf8',
)

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

function collectSourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry)
    const stats = statSync(path)

    if (stats.isDirectory()) {
      return collectSourceFiles(path)
    }

    return /\.(ts|tsx)$/.test(path) && !/\.test\.(ts|tsx)$/.test(path)
      ? [path.replaceAll('\\', '/')]
      : []
  })
}

test('case insert editor shell passes supported surfaces from active template pane', () => {
  assert.match(
    shellSource,
    /getCaseInsertSupportedNavigationSurfacesForPane/,
  )
  assert.match(
    shellSource,
    /const supportedNavigationSurfaces =\s*getCaseInsertSupportedNavigationSurfacesForPane\(activeTemplatePane\)/,
  )
  assert.match(
    shellSource,
    /<CaseInsertSurfaceTabs[\s\S]*supportedSurfaceIds=\{supportedNavigationSurfaces\}/,
  )
})

test('case insert editor shell support model hides cover tabs and shows tray tabs', () => {
  const coverItems = getCaseInsertNavigationSurfaceTabItems('front', [
    'front',
  ])
  const trayItems = getCaseInsertNavigationSurfaceTabItems('spine', [
    'back',
    'spine',
  ])

  assert.equal(coverItems.length, 1)
  assert.deepEqual(
    trayItems.map(({ id, label, active }) => ({ id, label, active })),
    [
      { id: 'back', label: 'Back', active: false },
      { id: 'spine', label: 'Spine', active: true },
    ],
  )
  assert.equal(trayItems.some(({ id }) => id === 'front'), false)
})

test('case insert editor shell renders setup panels before roles and legacy panels', () => {
  assert.match(shellSource, /getCaseInsertSidebarSetupPanels/)
  assert.match(shellSource, /getCaseInsertSidebarLegacyPanels/)
  assert.match(
    shellSource,
    /const setupSidebarPanels =\s*getCaseInsertSidebarSetupPanels\(activeTemplatePane\)/,
  )
  assert.match(
    shellSource,
    /const legacySidebarPanels =\s*getCaseInsertSidebarLegacyPanels\(activeTemplatePane\)/,
  )
  assertSourceOrder(shellSource, [
    '<CaseInsertSurfaceTabs',
    '{setupSidebarPanels.map(renderCaseInsertSidebarPanel)}',
    '{renderCaseInsertSteamBrandingPanel()}',
    '{roleSectionItems.map',
    '{legacySidebarPanels.map(renderCaseInsertSidebarPanel)}',
  ])
})

test('case insert Background Image roles own template and spine background controls', () => {
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateBackgroundArtworkControls,\s*\} from '\.\/CaseInsertTemplateBackgroundArtworkControls'/,
  )
  assert.match(
    shellSource,
    /import \{\s*CaseInsertSpineBackgroundArtworkControls,\s*\} from '\.\/CaseInsertSpineBackgroundArtworkControls'/,
  )
  assert.match(
    shellSource,
    /section\.id === 'background-artwork'[\s\S]*<CaseInsertTemplateBackgroundArtworkControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'spine-background-artwork'[\s\S]*<CaseInsertSpineBackgroundArtworkControls/,
  )

  assert.match(templateBackgroundArtworkSource, /PrimaryImageSlotControls/)
  assert.match(templateBackgroundArtworkSource, /slotKey="background"/)
  assert.match(
    templateBackgroundArtworkSource,
    /slot=\{templateState\.background\}/,
  )
  assert.match(templateBackgroundArtworkSource, /isBackground/)
  assert.match(templateBackgroundArtworkSource, /actions=\{actions\}/)

  assert.match(spineBackgroundArtworkSource, /CaseInsertSpineControlSections/)
  assert.match(spineBackgroundArtworkSource, /SpineImageSlotControls/)
  assert.match(spineBackgroundArtworkSource, /slotKey="background"/)
  assert.match(spineBackgroundArtworkSource, /slot=\{state\.background\}/)
  assert.match(spineBackgroundArtworkSource, /isBackground/)
  assert.match(spineBackgroundArtworkSource, /actions=\{actions\}/)

  assert.equal(
    existsSync('src/components/caseInsert/CaseInsertTemplateArtworkControls.tsx'),
    false,
  )
  assert.equal(
    existsSync('src/components/caseInsert/CaseInsertSpineArtworkControls.tsx'),
    false,
  )
})

test('case insert Additional Artwork roles own front and spine artwork slots', () => {
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateAdditionalArtworkControls,\s*\} from '\.\/CaseInsertTemplateAdditionalArtworkControls'/,
  )
  assert.match(
    shellSource,
    /import \{\s*CaseInsertSpineAdditionalArtworkControls,\s*\} from '\.\/CaseInsertSpineAdditionalArtworkControls'/,
  )
  assert.match(
    shellSource,
    /section\.id === 'additional-artwork' &&\s*activeNavigationSurface === 'front'[\s\S]*<CaseInsertTemplateAdditionalArtworkControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'additional-artwork' &&\s*activeNavigationSurface === 'spine'[\s\S]*<CaseInsertSpineAdditionalArtworkControls/,
  )

  assert.match(templateAdditionalArtworkSource, /if \(paneId !== 'cover'\)/)
  assert.match(templateAdditionalArtworkSource, /GroupedImageSlotSection/)
  assert.match(templateAdditionalArtworkSource, /slotKey="artworkSlots"/)
  assert.match(
    templateAdditionalArtworkSource,
    /templateState\.additionalArtworkEnabled/,
  )
  assert.match(
    templateAdditionalArtworkSource,
    /actions\.handleAdditionalArtworkEnabledChange\(paneId, enabled\)/,
  )
  assert.match(
    templateAdditionalArtworkSource,
    /slots=\{templateState\.artworkSlots\}/,
  )

  assert.match(spineAdditionalArtworkSource, /CaseInsertSpineControlSections/)
  assert.match(spineAdditionalArtworkSource, /SpineGroupedImageSlotSection/)
  assert.match(spineAdditionalArtworkSource, /state\.additionalArtworkEnabled/)
  assert.match(
    spineAdditionalArtworkSource,
    /slots=\{state\.artworkSlots\}/,
  )
  assert.match(spineAdditionalArtworkSource, /actions=\{actions\}/)
  assert.match(
    spineImageSlotControlsSource,
    /actions\.handleSpineAdditionalArtworkEnabledChange\(side, enabled\)/,
  )

  assert.equal(
    existsSync('src/components/caseInsert/CaseInsertTemplateArtworkControls.tsx'),
    false,
  )
  assert.equal(
    existsSync('src/components/caseInsert/CaseInsertSpineArtworkControls.tsx'),
    false,
  )
})

test('case insert Company Logos roles own template and spine logo controls', () => {
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateCompanyLogoControls,\s*\} from '\.\/CaseInsertTemplateCompanyLogoControls'/,
  )
  assert.match(
    shellSource,
    /import \{\s*CaseInsertSpineCompanyLogoControls,\s*\} from '\.\/CaseInsertSpineCompanyLogoControls'/,
  )
  assert.match(
    shellSource,
    /section\.id === 'company-logos'[\s\S]*<CaseInsertTemplateCompanyLogoControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'company-logo'[\s\S]*<CaseInsertSpineCompanyLogoControls/,
  )

  assert.equal(existsSync(templateBrandingPath), false)
  assert.doesNotMatch(spineBrandingSource, /CaseInsertLogoSlotControls/)
  assert.doesNotMatch(spineBrandingSource, /Developer \/ publisher logos/)

  assert.match(templateCompanyLogoSource, /CaseInsertLogoSlotControls/)
  assert.match(templateCompanyLogoSource, /logoKey="developer"/)
  assert.match(templateCompanyLogoSource, /logoKey="publisher"/)
  assert.match(templateCompanyLogoSource, /Additional developer logos/)
  assert.match(templateCompanyLogoSource, /Additional publisher logos/)
  assert.match(templateCompanyLogoSource, /Unassigned additional logos/)
  assert.match(
    templateCompanyLogoSource,
    /<EditorFeaturePanel title="Developer \/ publisher logos" variant="branding">/,
  )

  assert.match(spineCompanyLogoSource, /CaseInsertSpineControlSections/)
  assert.match(spineCompanyLogoSource, /CaseInsertLogoSlotControls/)
  assert.match(spineCompanyLogoSource, /logoKey="developer"/)
  assert.match(spineCompanyLogoSource, /logoKey="publisher"/)
  assert.match(spineCompanyLogoSource, /Additional developer logos/)
  assert.match(spineCompanyLogoSource, /Additional publisher logos/)
  assert.match(spineCompanyLogoSource, /Unassigned additional logos/)
  assert.match(
    spineCompanyLogoSource,
    /<EditorFeaturePanel title="Developer \/ publisher logos" variant="branding">/,
  )
})

test('case insert Game Info Logos and spine media format roles own mark controls', () => {
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateGameInfoLogoControls,\s*\} from '\.\/CaseInsertTemplateGameInfoLogoControls'/,
  )
  assert.match(
    shellSource,
    /import \{\s*CaseInsertSpineOptionalMediaFormatTypeControls,\s*\} from '\.\/CaseInsertSpineOptionalMediaFormatTypeControls'/,
  )
  assert.match(
    shellSource,
    /section\.id === 'game-info-logos'[\s\S]*<CaseInsertTemplateGameInfoLogoControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'optional-media-format-type'[\s\S]*<CaseInsertSpineOptionalMediaFormatTypeControls/,
  )

  assert.equal(existsSync(templateBrandingPath), false)

  assert.match(templateGameInfoLogoSource, /CASE_INSERT_MARK_BRANDING_SECTIONS/)
  assert.match(templateGameInfoLogoSource, /CaseInsertRatingBadgeSetupControls/)
  assert.match(templateGameInfoLogoSource, /CaseInsertMediaMarkSetupControls/)
  assert.match(templateGameInfoLogoSource, /CaseInsertPlatformMarkSetupControls/)
  assert.match(templateGameInfoLogoSource, /CaseInsertTechnicalMarkSetupControls/)
  assert.match(templateGameInfoLogoSource, /title=\{section\.title\}/)

  assert.doesNotMatch(spineBrandingSource, /CaseInsertMediaMarkSetupControls/)
  assert.match(
    spineBrandingSource,
    /section\) => section\.markKind !== 'media'/,
  )
  assert.doesNotMatch(spineBrandingSource, /CaseInsertSteamBannerControls/)
  assert.match(spineBrandingSource, /CaseInsertRatingBadgeSetupControls/)
  assert.match(spineBrandingSource, /CaseInsertPlatformMarkSetupControls/)
  assert.match(spineBrandingSource, /CaseInsertTechnicalMarkSetupControls/)

  assert.match(
    spineOptionalMediaFormatTypeSource,
    /CaseInsertMediaMarkSetupControls/,
  )
  assert.match(
    spineOptionalMediaFormatTypeSource,
    /<EditorFeaturePanel title="Media format mark" variant="branding">/,
  )
  assert.match(
    spineOptionalMediaFormatTypeSource,
    /getEnabledCaseInsertMarkSlotForKind\(\s*state\.markSlots,\s*'media',\s*\)/,
  )
  assert.match(spineOptionalMediaFormatTypeSource, /CaseInsertSpineControlSections/)
})

test('case insert Game Title roles own template and spine visual title controls', () => {
  assert.match(
    shellSource,
    /CaseInsertTemplateGameTitleControls/,
  )
  assert.match(
    shellSource,
    /CaseInsertSpineGameTitleControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'game-title'[\s\S]*<CaseInsertTemplateGameTitleControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'vertical-game-logo-title'[\s\S]*<CaseInsertSpineGameTitleControls/,
  )
  assert.equal(
    existsSync(templateGameTitlePath),
    true,
  )
  assert.equal(
    existsSync(spineGameTitlePath),
    true,
  )

  assert.match(templateGameTitleSource, /CaseInsertTitleArtworkControls/)
  assert.match(templateGameTitleSource, /templateState\.titleArtwork/)
  assert.match(templateGameTitleSource, /handleRestoreTitleArtworkDefault/)
  assert.match(templateGameTitleSource, /getTemplatePrimaryImagePlacementFields/)
  assert.match(templateGameTitleSource, /CASE_INSERT_ARTWORK_SECTION_LABELS\.gameLogo/)

  assert.match(spineGameTitleSource, /CaseInsertSpineControlSections/)
  assert.match(spineGameTitleSource, /CaseInsertTitleArtworkControls/)
  assert.match(spineGameTitleSource, /state\.titleArtwork/)
  assert.match(spineGameTitleSource, /handleRestoreSpineTitleArtworkDefault/)

  assert.equal(
    existsSync('src/components/caseInsert/CaseInsertTemplateArtworkControls.tsx'),
    false,
  )
  assert.equal(
    existsSync('src/components/caseInsert/CaseInsertSpineArtworkControls.tsx'),
    false,
  )

  assert.match(templateTextSource, /templateState\.textBlocks/)
  assert.match(templateTextSource, /templateState\.textLists/)
  assert.match(spineTextSource, /<SpineTitleControls/)
})

test('case insert Legal Info roles own template and spine copyright text controls', () => {
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateLegalInfoControls,\s*\} from '\.\/CaseInsertTemplateLegalInfoControls'/,
  )
  assert.match(
    shellSource,
    /import \{\s*CaseInsertSpineLegalInfoControls,\s*\} from '\.\/CaseInsertSpineLegalInfoControls'/,
  )
  assert.match(
    shellSource,
    /section\.id === 'legal-info' &&\s*activeNavigationSurface === 'spine'[\s\S]*<CaseInsertSpineLegalInfoControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'legal-info'[\s\S]*<CaseInsertTemplateLegalInfoControls/,
  )

  assert.match(templateLegalInfoSource, /CaseInsertTemplateTextControls/)
  assert.match(templateLegalInfoSource, /includeTextLists=\{false\}/)
  assert.match(templateLegalInfoSource, /textBlockFilter=\{isCaseInsertLegalTextBlock\}/)
  assert.match(spineLegalInfoSource, /CaseInsertSpineTextControls/)
  assert.match(spineLegalInfoSource, /includeTitle=\{false\}/)
  assert.match(spineLegalInfoSource, /textBlockFilter=\{isCaseInsertLegalTextBlock\}/)

  assert.match(
    templateTextSource,
    /textBlockFilter = \(textBlock\) =>\s*!isCaseInsertLegalTextBlock\(textBlock\) &&\s*!isCaseInsertBackRoleTextBlock\(textBlock\) &&\s*!isCaseInsertAdditionalTextBlock\(textBlock\)/,
  )
  assert.match(
    templateTextSource,
    /textListFilter = \(textList\) => !isCaseInsertFeatureBulletsTextList\(textList\)/,
  )
  assert.match(
    templateTextSource,
    /templateState\.textBlocks\.filter\(textBlockFilter\)/,
  )
  assert.match(
    templateTextSource,
    /templateState\.textLists\.filter\(textListFilter\)\.map/,
  )
  assert.match(
    spineTextSource,
    /textBlockFilter = \(textBlock\) =>\s*!isCaseInsertLegalTextBlock\(textBlock\) &&\s*!isCaseInsertAdditionalTextBlock\(textBlock\)/,
  )
  assert.match(
    spineTextSource,
    /state\.textBlocks\.filter\(textBlockFilter\)/,
  )
  assert.match(spineTextSource, /includeTitle = true/)
  assert.match(spineTextSource, /<SpineTitleControls/)
})

test('case insert Additional Text roles own template and spine additional text rows', () => {
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateAdditionalTextControls,\s*\} from '\.\/CaseInsertTemplateAdditionalTextControls'/,
  )
  assert.match(
    shellSource,
    /import \{\s*CaseInsertSpineAdditionalTextControls,\s*\} from '\.\/CaseInsertSpineAdditionalTextControls'/,
  )
  assert.match(
    shellSource,
    /section\.id === 'additional-text' &&\s*activeNavigationSurface === 'spine'[\s\S]*<CaseInsertSpineAdditionalTextControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'additional-text'[\s\S]*<CaseInsertTemplateAdditionalTextControls/,
  )

  assert.match(templateAdditionalTextSource, /CaseInsertTemplateTextControls/)
  assert.match(templateAdditionalTextSource, /includeTextLists=\{false\}/)
  assert.match(
    templateAdditionalTextSource,
    /textBlockFilter=\{isCaseInsertAdditionalTextBlock\}/,
  )
  assert.match(spineAdditionalTextSource, /CaseInsertSpineTextControls/)
  assert.match(spineAdditionalTextSource, /includeTitle=\{false\}/)
  assert.match(
    spineAdditionalTextSource,
    /textBlockFilter=\{isCaseInsertAdditionalTextBlock\}/,
  )

  assert.match(templateTextSource, /isCaseInsertAdditionalTextBlock/)
  assert.match(
    templateTextSource,
    /textBlockFilter = \(textBlock\) =>\s*!isCaseInsertLegalTextBlock\(textBlock\) &&\s*!isCaseInsertBackRoleTextBlock\(textBlock\) &&\s*!isCaseInsertAdditionalTextBlock\(textBlock\)/,
  )
  assert.match(
    templateTextSource,
    /templateState\.textBlocks\.filter\(textBlockFilter\)/,
  )
  assert.match(spineTextSource, /isCaseInsertAdditionalTextBlock/)
  assert.match(
    spineTextSource,
    /textBlockFilter = \(textBlock\) =>\s*!isCaseInsertLegalTextBlock\(textBlock\) &&\s*!isCaseInsertAdditionalTextBlock\(textBlock\)/,
  )
  assert.match(
    spineTextSource,
    /state\.textBlocks\.filter\(textBlockFilter\)/,
  )
  assert.match(spineTextSource, /includeTitle = true/)
  assert.match(spineTextSource, /<SpineTitleControls/)
})

test('case insert Back text roles own description feature and requirements rows', () => {
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateGameDescriptionTextControls,\s*\} from '\.\/CaseInsertTemplateGameDescriptionTextControls'/,
  )
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateFeatureBulletsControls,\s*\} from '\.\/CaseInsertTemplateFeatureBulletsControls'/,
  )
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateSystemRequirementsControls,\s*\} from '\.\/CaseInsertTemplateSystemRequirementsControls'/,
  )
  assert.match(
    shellSource,
    /section\.id === 'game-description-text'[\s\S]*<CaseInsertTemplateGameDescriptionTextControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'feature-bullets-callouts'[\s\S]*<CaseInsertTemplateFeatureBulletsControls/,
  )
  assert.match(
    shellSource,
    /section\.id === 'system-requirements'[\s\S]*<CaseInsertTemplateSystemRequirementsControls/,
  )

  assert.match(
    templateGameDescriptionTextSource,
    /CaseInsertTemplateTextControls/,
  )
  assert.match(
    templateGameDescriptionTextSource,
    /includeTextLists=\{false\}/,
  )
  assert.match(
    templateGameDescriptionTextSource,
    /textBlockFilter=\{isCaseInsertGameDescriptionTextBlock\}/,
  )

  assert.match(templateFeatureBulletsSource, /CaseInsertTemplateTextControls/)
  assert.match(templateFeatureBulletsSource, /textBlockFilter=\{\(\) => false\}/)
  assert.match(
    templateFeatureBulletsSource,
    /textListFilter=\{isCaseInsertFeatureBulletsTextList\}/,
  )

  assert.match(
    templateSystemRequirementsSource,
    /CaseInsertTemplateTextControls/,
  )
  assert.match(
    templateSystemRequirementsSource,
    /includeTextLists=\{false\}/,
  )
  assert.match(
    templateSystemRequirementsSource,
    /textBlockFilter=\{isCaseInsertSystemRequirementsTextBlock\}/,
  )

  assert.match(templateTextSource, /isCaseInsertBackRoleTextBlock/)
  assert.match(templateTextSource, /isCaseInsertFeatureBulletsTextList/)
  assert.match(templateTextSource, /textListFilter/)
})

test('case insert Back Screenshots role owns tray artwork slots without schema churn', () => {
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateScreenshotsControls,\s*\} from '\.\/CaseInsertTemplateScreenshotsControls'/,
  )
  assert.match(
    shellSource,
    /section\.id === 'screenshots'[\s\S]*<CaseInsertTemplateScreenshotsControls/,
  )

  assert.match(templateScreenshotsSource, /if \(paneId !== 'tray'\)/)
  assert.match(templateScreenshotsSource, /GroupedImageSlotSection/)
  assert.match(templateScreenshotsSource, /title="Screenshots"/)
  assert.match(templateScreenshotsSource, /templateState\.additionalArtworkEnabled/)
  assert.match(
    templateScreenshotsSource,
    /actions\.handleAdditionalArtworkEnabledChange\(paneId, enabled\)/,
  )
  assert.match(templateScreenshotsSource, /slotKey="artworkSlots"/)
  assert.match(templateScreenshotsSource, /slots=\{templateState\.artworkSlots\}/)
  assert.doesNotMatch(templateScreenshotsSource, /screenshotSlots/)

  assert.equal(
    existsSync('src/components/caseInsert/CaseInsertTemplateArtworkControls.tsx'),
    false,
  )
  assert.equal(
    existsSync('src/components/caseInsert/CaseInsertSpineArtworkControls.tsx'),
    false,
  )

  const productionScreenshotSlotFiles = collectSourceFiles('src')
    .filter((path) => readFileSync(path, 'utf8').includes('screenshotSlots'))

  assert.deepEqual(productionScreenshotSlotFiles, [
    'src/caseInsert/normalization.ts',
  ])
})

test('case insert Steam Branding setup owns visible cover and spine controls only', () => {
  assert.match(
    shellSource,
    /import \{\s*CaseInsertTemplateSteamBrandingControls,\s*\} from '\.\/CaseInsertTemplateSteamBrandingControls'/,
  )
  assert.match(
    shellSource,
    /import \{\s*CaseInsertSpineSteamBrandingControls,\s*\} from '\.\/CaseInsertSpineSteamBrandingControls'/,
  )
  assert.match(shellSource, /function renderCaseInsertSteamBrandingPanel/)
  assert.match(
    shellSource,
    /activeNavigationSurface === 'front' && activeTemplatePane === 'cover'[\s\S]*<EditorPanel title="Steam Branding">[\s\S]*<CaseInsertTemplateSteamBrandingControls/,
  )
  assert.match(
    shellSource,
    /activeNavigationSurface === 'spine'[\s\S]*<EditorPanel title="Steam Branding">[\s\S]*<CaseInsertSpineSteamBrandingControls/,
  )
  assert.doesNotMatch(
    shellSource,
    /activeNavigationSurface === 'back'[\s\S]*<EditorPanel title="Steam Branding">/,
  )
  assertSourceOrder(shellSource, [
    '{setupSidebarPanels.map(renderCaseInsertSidebarPanel)}',
    '{renderCaseInsertSteamBrandingPanel()}',
    '{roleSectionItems.map',
  ])

  assert.equal(existsSync(templateBrandingPath), false)
  assert.match(templateSteamBrandingSource, /if \(paneId !== 'cover'\)/)
  assert.match(templateSteamBrandingSource, /CaseInsertSteamBannerControls/)
  assert.match(templateSteamBrandingSource, /targetKind="cover"/)
  assert.doesNotMatch(templateSteamBrandingSource, /targetKind="tray"/)

  assert.match(spineSteamBrandingSource, /CaseInsertSpineControlSections/)
  assert.match(spineSteamBrandingSource, /CaseInsertSteamBannerControls/)
  assert.match(spineSteamBrandingSource, /targetKind="spine"/)
  assert.doesNotMatch(spineBrandingSource, /CaseInsertSteamBannerControls/)
  assert.match(spineBrandingSource, /CaseInsertRatingBadgeSetupControls/)
  assert.match(spineBrandingSource, /CaseInsertPlatformMarkSetupControls/)
  assert.match(spineBrandingSource, /CaseInsertTechnicalMarkSetupControls/)
})
