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

test('Disc Layout Presets sits after setup controls and before semantic roles', () => {
  assertSourceOrder(appSource, [
    '<DiscSteamBrandingControls',
    '<DiscLayoutPresetsPanel',
    '{discRoleSectionItems.map',
  ])
  assert.match(
    appSource,
    /<DiscLayoutPresetsPanel onApplyPreset=\{handleApplyDiscRolePreset\} \/>/,
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
