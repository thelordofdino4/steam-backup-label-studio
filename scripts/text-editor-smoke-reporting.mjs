import fs from 'node:fs'
import path from 'node:path'

export function createTextEditorSmokeLogger(prefix) {
  return (message) => {
    console.log(`${prefix} ${message}`)
  }
}

export function fail(message) {
  throw new Error(message)
}

export function slugDiagnosticLabel(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function createTextEditorSmokeReporter({ artifactDir, log }) {
  const results = []

  async function runCheck(page, name, fn) {
    try {
      await fn()
      results.push({ name, status: 'pass' })
      log(`PASS ${name}`)
    } catch (error) {
      fs.mkdirSync(artifactDir, { recursive: true })
      const screenshotPath = path.join(
        artifactDir,
        `${String(results.length + 1).padStart(2, '0')}-${slugDiagnosticLabel(name)}.png`,
      )
      await page.screenshot({ fullPage: true, path: screenshotPath }).catch(() => {})
      results.push({
        error: error instanceof Error ? error.message : String(error),
        name,
        screenshotPath,
        status: 'fail',
      })
      log(`FAIL ${name}`)
    }
  }

  function printSummary() {
    console.log('')
    console.log('Text editor smoke results:')
    for (const result of results) {
      const suffix = result.status === 'fail'
        ? ` - ${result.error} (${result.screenshotPath})`
        : ''
      console.log(`- ${result.status.toUpperCase()} ${result.name}${suffix}`)
    }
  }

  function hasFailures() {
    return results.some((result) => result.status === 'fail')
  }

  return {
    hasFailures,
    printSummary,
    results,
    runCheck,
  }
}
