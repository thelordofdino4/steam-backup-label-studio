import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const panelSource = readFileSync(
  'src/components/sidebar/DiscLayoutPresetsPanel.tsx',
  'utf8',
)
const appSource = readFileSync('src/app/App.tsx', 'utf8')
const caseInsertSource = readFileSync(
  'src/components/caseInsert/CaseInsertEditorShell.tsx',
  'utf8',
)
const panelStyles = readFileSync('src/styles/app-panels.css', 'utf8')

function assertSourceOrder(source: string, snippets: readonly string[]) {
  const positions = snippets.map((snippet) => {
    const position = source.indexOf(snippet)
    assert.notEqual(position, -1, `Expected source to contain ${snippet}`)
    return position
  })

  positions.forEach((position, index) => {
    if (index > 0) {
      assert.ok(position > positions[index - 1])
    }
  })
}

test('Disc Layout Presets uses the workflow panel shell and explicit apply', () => {
  assert.match(panelSource, /import \{ EditorPanel \}/)
  assert.match(panelSource, /<EditorPanel title="Layout Presets">/)
  assert.match(panelSource, /useState\(''\)/)
  assert.match(panelSource, /<option value="">Choose a preset<\/option>/)
  assert.match(panelSource, /value=\{selectedPresetId\}/)
  assert.match(
    panelSource,
    /onChange=\{\(event\) => setSelectedPresetId\(event\.target\.value\)\}/,
  )
  assert.match(panelSource, /disabled=\{!selectedPreset\}/)
  assert.match(panelSource, /onClick=\{handleApplyPreset\}/)
  assert.match(panelSource, /setSelectedPresetId\(''\)/)
  assert.match(panelSource, />\s*Apply preset\s*<\/button>/)
  assert.doesNotMatch(panelSource, /active preset/i)
  assert.doesNotMatch(panelSource, /linked preset/i)
})

test('Removed layout items render only from canonical restore view models', () => {
  assert.match(panelSource, /guidedRestoreItems\.length > 0/)
  assert.match(panelSource, />Removed layout items</)
  assert.match(panelSource, /guidedRestoreItems\.map\(\(item\) =>/)
  assert.match(panelSource, /<span>\{item\.label\}<\/span>/)
  assert.match(panelSource, /aria-label=\{`Restore \$\{item\.label\} to layout`\}/)
  assert.match(panelSource, /aria-label="Restore all layout items"/)
  assert.match(panelSource, />\s*Restore\s*<\/button>/)
  assert.match(panelSource, />\s*Restore all\s*<\/button>/)
  assert.doesNotMatch(panelSource, /Removed preset items|Restore all preset items/)
  assert.doesNotMatch(panelSource, /disc:guided:/)
  assert.doesNotMatch(panelSource, /Game Info Logos|Company Logos/)
})

test('restore focus uses canonical item order and registered refs', () => {
  assert.match(panelSource, /slice\(currentIndex \+ 1\)/)
  assert.match(panelSource, /slice\(0, currentIndex\)[\s\S]*?\.reverse\(\)/)
  assert.match(panelSource, /restoreButtonRefs\.current\.get\(slotId\)/)
  assert.match(panelSource, /nextRestoreButton \?\? presetSelectRef\.current/)
  assert.doesNotMatch(panelSource, /querySelector|\.click\(\)|setTimeout|MutationObserver/)
  assert.match(panelStyles, /\.disc-guided-restore-button:focus-visible/)
})

test('Disc Layout Presets sits after setup controls and before semantic roles', () => {
  assertSourceOrder(appSource, [
    '<DiscSteamBrandingControls',
    '<DiscLayoutPresetsPanel',
    '{discRoleSectionItems.map',
  ])
  assert.match(
    appSource,
    /<DiscLayoutPresetsPanel[\s\S]*?guidedRestoreItems=\{discGuidedPlaceholderPreview\.restoreItems\}[\s\S]*?onApplyPreset=\{handleApplyDiscRolePreset\}[\s\S]*?onRestoreAllGuidedSlots=\{discGuidedPlaceholderPreview\.restoreAllSlots\}[\s\S]*?onRestoreGuidedSlot=\{discGuidedPlaceholderPreview\.restoreSlot\}/,
  )
})

test('App delegates preset decisions to the focused adapter', () => {
  assert.match(appSource, /applyDiscRolePresetToOwners\(\{/)
  assert.match(appSource, /announceStatus\(`Applied \$\{result\.preset\.label\} layout preset\.`\)/)
  assert.doesNotMatch(appSource, /applyDiscRolePresetToState/)
  assert.doesNotMatch(appSource, /getDiscRolePresetUpdatePlan/)
})

test('Case Insert does not expose the Disc Layout Presets panel', () => {
  assert.doesNotMatch(caseInsertSource, /DiscLayoutPresetsPanel/)
  assert.doesNotMatch(caseInsertSource, /Layout Presets/)
})

test('restore UI stays isolated from workflow decisions, persistence, owners, and output', () => {
  for (const forbidden of [
    'restoreDiscGuidedSlot',
    'restoreAllDiscGuidedSlots',
    'projectSchema',
    'restoreSavedDiscGuidedWorkflow',
    'setProject',
    'requestRoleFocus',
    '../render',
    '../export',
    'caseInsert',
  ]) {
    assert.equal(panelSource.includes(forbidden), false, forbidden)
  }
})
