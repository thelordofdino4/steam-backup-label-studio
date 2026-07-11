import assert from 'node:assert/strict'
import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(dirname(currentDir)))
const componentPath = 'src/components/editor/EditorPanel.tsx'
const source = readFileSync(join(repoRoot, componentPath), 'utf8')

test('EditorPanel preserves its native details presentation structure', () => {
  assert.match(source, /<details\b/)
  assert.match(source, /<summary ref=\{summaryRef\} className="panel-summary">/)
  assert.match(source, /className=\{getEditorPanelClassName\(\{ kind, spacingTop, className \}\)\}/)
  assert.match(source, /<span className="panel-summary-title">\{title\}<\/span>/)
  assert.match(source, /<span className="panel-summary-actions">\{headerActions\}<\/span>/)
  assert.match(source, /<div className="panel-content">\{children\}<\/div>/)
})

test('EditorPanel exposes optional controlled open and direct ref props', () => {
  assert.match(source, /open\?: boolean/)
  assert.match(source, /onOpenChange\?: \(open: boolean\) => void/)
  assert.match(source, /detailsRef\?: Ref<HTMLDetailsElement>/)
  assert.match(source, /summaryRef\?: Ref<HTMLElement>/)
  assert.match(source, /<details\s+ref=\{detailsRef\}/)
  assert.match(source, /open=\{open\}/)
  assert.match(source, /<summary ref=\{summaryRef\}/)
})

test('native toggle reports the resulting Boolean state without click interception', () => {
  assert.match(
    source,
    /onToggle=\{\(event\) => onOpenChange\?\.\(event\.currentTarget\.open\)\}/,
  )
  assert.doesNotMatch(source, /onClick=/)
  assert.doesNotMatch(source, /preventDefault/)
  assert.doesNotMatch(source, /\.click\(\)/)
})

test('controlled state remains prop-owned and uncontrolled state remains native', () => {
  const parameters = source.match(
    /export function EditorPanel\(\{([\s\S]*?)\}: EditorPanelProps\)/,
  )?.[1]

  assert.ok(parameters)
  assert.match(parameters, /\bopen,/)
  assert.doesNotMatch(parameters, /\bopen\s*=/)
  assert.doesNotMatch(source, /defaultOpen/)
  assert.doesNotMatch(source, /useState|useReducer/)
  assert.doesNotMatch(source, /setTimeout|setInterval|MutationObserver/)
  assert.doesNotMatch(source, /querySelector|getElementById/)
  assert.doesNotMatch(source, /<details[^>]*\bname=/)
})

test('EditorFeaturePanel forwards the controlled and ref contract', () => {
  assert.match(
    source,
    /export function EditorFeaturePanel\(\{[\s\S]*?onOpenChange,[\s\S]*?detailsRef,[\s\S]*?summaryRef,[\s\S]*?\}: EditorFeaturePanelProps\)/,
  )
  assert.match(source, /onOpenChange=\{onOpenChange\}/)
  assert.match(source, /detailsRef=\{detailsRef\}/)
  assert.match(source, /summaryRef=\{summaryRef\}/)
})

test('only navigation-owned panels use the controlled contract', () => {
  const componentFiles = globSync('src/components/**/*.tsx', { cwd: repoRoot })
    .map((path) => path.replaceAll('\\', '/'))
  const callerFiles = componentFiles.filter((path) => {
    if (path === componentPath) return false

    const callerSource = readFileSync(join(repoRoot, path), 'utf8')
    return /<Editor(?:Feature)?Panel\b/.test(callerSource)
  })

  assert.ok(callerFiles.some((path) => path.includes('caseInsert')))
  assert.ok(callerFiles.some((path) => path.includes('sidebar')))
  assert.ok(callerFiles.some((path) => path.includes('EditorNavigationShell')))

  for (const callerFile of callerFiles) {
    const callerSource = readFileSync(join(repoRoot, callerFile), 'utf8')
    const panelTags = callerSource.match(
      /<Editor(?:Feature)?Panel\b[\s\S]*?>/g,
    ) ?? []

    assert.ok(panelTags.length > 0, callerFile)

    for (const panelTag of panelTags) {
      if (callerFile.endsWith('/EditorNavigationShell.tsx')) {
        assert.match(panelTag, /open=\{open\}/)
        assert.match(panelTag, /onOpenChange=\{onOpenChange\}/)
        assert.match(panelTag, /detailsRef=\{detailsRef\}/)
        assert.match(panelTag, /summaryRef=\{summaryRef\}/)
        continue
      }

      if (callerFile.endsWith('/LocalFileArtworkControls.tsx')) {
        assert.match(panelTag, /open=\{open\}/)
        assert.match(panelTag, /onOpenChange=\{onOpenChange\}/)
        assert.doesNotMatch(panelTag, /\b(?:detailsRef|summaryRef)=/)
        continue
      }

      if (callerFile.endsWith('/GameInfoLogoControls.tsx') &&
        panelTag.includes('title="Rating badge"')) {
        assert.match(panelTag, /open=\{ratingPanelOpen\}/)
        assert.match(
          panelTag,
          /onOpenChange=\{onRatingPanelOpenChange\}/,
        )
        assert.doesNotMatch(panelTag, /\b(?:detailsRef|summaryRef)=/)
        continue
      }

      if (callerFile.endsWith('/CompanyLogoControls.tsx') &&
        panelTag.includes('title="Developer / publisher logos"')) {
        assert.match(panelTag, /open=\{panelOpen\}/)
        assert.match(panelTag, /onOpenChange=\{onPanelOpenChange\}/)
        assert.doesNotMatch(panelTag, /\b(?:detailsRef|summaryRef)=/)
        continue
      }

      if (callerFile.endsWith('/EditorImageSourceControls.tsx') &&
        panelTag.includes("EDITOR_IMAGE_SOURCE_PANEL_LABELS['local-file']")) {
        assert.match(panelTag, /open=\{localFilePanelOpen\}/)
        assert.match(
          panelTag,
          /onOpenChange=\{onLocalFilePanelOpenChange\}/,
        )
        assert.doesNotMatch(panelTag, /\b(?:detailsRef|summaryRef)=/)
        continue
      }

      assert.doesNotMatch(
        panelTag,
        /\b(?:open|onOpenChange|detailsRef|summaryRef)=/,
        callerFile,
      )
    }
  }
})

test('EditorPanel remains independent from navigation and application domains', () => {
  const forbiddenDependencies = [
    'editorRoleFocus',
    'guidedPresets',
    'App.tsx',
    'projectSchema',
    'createProjectSnapshot',
    'previewEditableRegistry',
    'previewElementOverlay',
    'render/',
    'export/',
    'caseInsert',
  ]

  for (const forbiddenDependency of forbiddenDependencies) {
    assert.equal(
      source.includes(forbiddenDependency),
      false,
      `unexpected dependency: ${forbiddenDependency}`,
    )
  }
})
