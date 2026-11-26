import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const staleCurrentMarkers = [
  /License not chosen yet\./i,
  /Guide Legend (?:is still|remains) in the sidebar today/i,
  /while `README\.md` says a license has not been chosen/i,
  /implementing the later dirty-aware replacement guard/i,
  /future dirty integration, replacement guards, and Resume/i,
]

// This intentionally checks repository Markdown conventions, not a full Markdown
// grammar. External URLs and heading anchors require a separate review.
export function checkMarkdown(file, source, targetExists = existsSync) {
  const errors = []
  const lines = source.split(/\r?\n/)
  let fence = null
  let tableColumns = null
  const cells = line => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/)
  const isSeparator = line => /^\s*\|/.test(line ?? '')
    && cells(line).every(cell => /^\s*:?-{3,}:?\s*$/.test(cell))

  lines.forEach((line, index) => {
    const fail = message => errors.push(`${file}:${index + 1}: ${message}`)
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (fence) {
      if (marker && marker[1][0] === fence.kind
          && marker[1].length >= fence.length && !marker[2].trim()) fence = null
      return
    }
    if (marker) {
      fence = { kind: marker[1][0], length: marker[1].length, line: index + 1 }
      tableColumns = null
      return
    }
    for (const pattern of staleCurrentMarkers) {
      if (pattern.test(line)) fail('known stale current-state claim')
    }
    if (/^\s*\|/.test(line)) {
      if (isSeparator(lines[index + 1])) tableColumns = cells(line).length
      if (tableColumns !== null && cells(line).length !== tableColumns) {
        fail(`table has ${cells(line).length} cells; expected ${tableColumns}`)
      }
    } else tableColumns = null

    for (const match of line.matchAll(/!?\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)) {
      const raw = match[1] ?? match[2]
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(raw)) continue
      let target
      try { target = decodeURIComponent(raw.split(/[?#]/, 1)[0]) }
      catch { fail(`invalid local link encoding: ${raw}`); continue }
      if (target && !targetExists(resolve(dirname(file), target))) {
        fail(`missing local link target: ${raw}`)
      }
    }
  })
  if (fence) errors.push(`${file}:${fence.line}: unclosed ${fence.kind} fence`)
  return errors
}

export function checkDocumentation(root) {
  const docs = join(root, 'docs')
  const historical = new Set(['ISSUE_271_ROLE_NAVIGATION_SHELL.md', 'PROJECT_PACKAGE_FORMAT_DECISION.md', 'refactor-audit-working-log.md'])
  const active = [join(root, 'README.md'), ...readdirSync(docs)
    .filter(name => name.endsWith('.md') && !historical.has(name))
    .map(name => join(docs, name))]
  const history = [...historical].map(name => join(docs, name))
    .concat(readdirSync(join(docs, 'archive')).filter(name => name.endsWith('.md'))
      .map(name => join(docs, 'archive', name)))
  const errors = active.flatMap(file => checkMarkdown(file, readFileSync(file, 'utf8')))
  for (const file of history) {
    const heading = readFileSync(file, 'utf8').split(/\r?\n/).slice(0, 12).join('\n')
    if (!/(?:historical|archive)/i.test(heading)) errors.push(`${file}: missing historical/archive classification`)
  }
  return { errors, activeCount: active.length, historicalCount: history.length }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = checkDocumentation(resolve(dirname(fileURLToPath(import.meta.url)), '..'))
  for (const error of result.errors) console.error(error)
  console.log(`Documentation: ${result.activeCount} active files, ${result.historicalCount} historical labels, ${result.errors.length} errors`)
  process.exitCode = result.errors.length ? 1 : 0
}
