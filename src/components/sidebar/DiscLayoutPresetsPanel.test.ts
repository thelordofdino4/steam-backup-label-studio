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
  assert.match(
    panelSource,
    /<EditorPanel detailsRef=\{detailsRef\} title="Layout Presets">/,
  )
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

test('Guided progress renders removed and completed canonical view models', () => {
  assert.match(panelSource, />Guided progress</)
  assert.match(panelSource, /guidedProgress\.removedItems\.length > 0/)
  assert.match(panelSource, />Removed layout items</)
  assert.match(panelSource, /guidedProgress\.removedItems\.map\(\(item\) =>/)
  assert.match(panelSource, />\s*Include again\s*<\/button>/)
  assert.match(panelSource, /guidedProgress\.completedItems\.length > 0/)
  assert.match(panelSource, />Completed layout items</)
  assert.match(panelSource, /guidedProgress\.completedItems\.map\(\(item\) =>/)
  assert.equal((panelSource.match(/className="disc-guided-progress-group"/g) ?? []).length, 2)
  assert.match(panelSource, /<span>\{item\.label\}<\/span>/)
  assert.match(
    panelSource,
    /aria-label=\{`Include \$\{item\.label\} in the layout again`\}/,
  )
  assert.match(
    panelSource,
    /aria-label=\{`Show \$\{item\.label\} guide again`\}/,
  )
  assert.match(panelSource, />\s*Show guide again\s*<\/button>/)
  assert.match(panelSource, /aria-label="Reset guided progress"/)
  assert.match(panelSource, />\s*Reset guided progress\s*<\/button>/)
  assert.doesNotMatch(panelSource, /Restore all|Restore all preset items/)
  assert.doesNotMatch(panelSource, /disc:guided:/)
  assert.doesNotMatch(panelSource, /Game Info Logos|Company Logos/)
})

test('progress focus uses cross-section canonical order and stable fallbacks', () => {
  assert.match(panelSource, /progressActions\.findIndex/)
  assert.match(panelSource, /slice\(currentIndex \+ 1\)/)
  assert.match(panelSource, /slice\(0, currentIndex\)[\s\S]*?\.reverse\(\)/)
  assert.match(panelSource, /progressButtonRefs\.current\.get\(actionKey\)/)
  assert.match(
    panelSource,
    /nextProgressButton \?\?[\s\S]*?resetProgressButtonRef\.current \?\?[\s\S]*?presetSelectRef\.current/,
  )
  assert.match(panelSource, /pendingProgressFocusRef\.current = \[\]/)
  assert.doesNotMatch(panelSource, /querySelector|\.click\(\)|setTimeout|MutationObserver/)
  assert.match(panelStyles, /\.disc-guided-progress-button:focus-visible/)
  assert.match(panelStyles, /\.disc-guided-progress-reset:focus-visible/)
})

test('guided progress actions use native keyboard-accessible buttons and smoke hooks', () => {
  assert.match(panelSource, /data-guided-progress-kind="removed"/)
  assert.match(panelSource, /data-guided-progress-kind="completed"/)
  assert.match(panelSource, /data-guided-progress-slot-id=\{item\.slotId\}/)
  assert.match(panelSource, /data-smoke-id="disc-guided-progress-reset"/)
  assert.equal((panelSource.match(/type="button"/g) ?? []).length >= 4, true)
  assert.doesNotMatch(panelSource, /onKeyDown|onKeyUp|preventDefault|stopPropagation/)
})

test('Disc Layout Presets sits after setup controls and before semantic roles', () => {
  assertSourceOrder(appSource, [
    '<DiscSteamBrandingControls',
    '<DiscLayoutPresetsPanel',
    '{discRoleSectionItems.map',
  ])
  assert.match(
    appSource,
    /<DiscLayoutPresetsPanel[\s\S]*?guidedProgress=\{discGuidedPlaceholderPreview\.progressItems\}[\s\S]*?onApplyPreset=\{handleApplyDiscRolePreset\}[\s\S]*?onIncludeGuidedSlot=\{discGuidedPlaceholderPreview\.includeSlot\}[\s\S]*?onShowGuidedSlotAgain=\{discGuidedPlaceholderPreview\.showSlotAgain\}[\s\S]*?onResetGuidedProgress=\{discGuidedPlaceholderPreview\.resetProgress\}/,
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

test('progress UI stays isolated from workflow decisions, persistence, owners, and output', () => {
  for (const forbidden of [
    'restoreDiscGuidedSlot',
    'restoreAllDiscGuidedSlots',
    'restoreCompletedDiscGuidedSlot',
    'resetDiscGuidedProgress',
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
