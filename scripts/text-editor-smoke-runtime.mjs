import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright'

export function requestText(url, timeoutMs = 2_000) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        resolve({
          body,
          statusCode: response.statusCode ?? 0,
        })
      })
    })

    request.on('error', () => resolve(null))
    request.setTimeout(timeoutMs, () => {
      request.destroy()
      resolve(null)
    })
  })
}

export async function isTextEditorSmokeAppServing(baseUrl) {
  const response = await requestText(baseUrl)

  return Boolean(
    response?.statusCode &&
      response.statusCode >= 200 &&
      response.statusCode < 500 &&
      response.body.includes('<div id="root">'),
  )
}

export async function waitForTextEditorSmokeApp({
  baseUrl,
  fail,
  isAppServing = isTextEditorSmokeAppServing,
  startupTimeoutMs,
}) {
  const start = Date.now()

  while (Date.now() - start < startupTimeoutMs) {
    if (await isAppServing(baseUrl)) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  fail(`Vite did not serve ${baseUrl} within ${startupTimeoutMs}ms.`)
}

export async function ensureTextEditorSmokeViteRuntime({
  baseUrl,
  fail,
  isAppServing = isTextEditorSmokeAppServing,
  log,
  port,
  repoRoot,
  startupTimeoutMs,
}) {
  if (await isAppServing(baseUrl)) {
    log(`Reusing existing app runtime at ${baseUrl}`)
    return null
  }

  const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!fs.existsSync(viteBin)) {
    fail(`Cannot find local Vite binary at ${viteBin}. Run npm install first.`)
  }

  log(`Starting Vite at ${baseUrl}`)
  const viteProcess = spawn(
    process.execPath,
    [
      viteBin,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  viteProcess.stdout.on('data', (chunk) => {
    process.stdout.write(chunk)
  })
  viteProcess.stderr.on('data', (chunk) => {
    process.stderr.write(chunk)
  })
  viteProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      log(`Vite exited with code ${code}`)
    }
  })

  await waitForTextEditorSmokeApp({
    baseUrl,
    fail,
    isAppServing,
    startupTimeoutMs,
  })

  return viteProcess
}

export function findTextEditorSmokeBrowserExecutable(
  browserCandidates,
  existsSync = fs.existsSync,
) {
  return browserCandidates.find((candidate) => existsSync(candidate)) ?? null
}

export async function launchTextEditorSmokeBrowser({
  args = ['--disable-gpu'],
  browserCandidates,
  chromiumLauncher = chromium,
  existsSync = fs.existsSync,
  log,
}) {
  const executablePath = findTextEditorSmokeBrowserExecutable(
    browserCandidates,
    existsSync,
  )
  const options = {
    headless: true,
    args,
  }

  if (executablePath) {
    log(`Using browser executable ${executablePath}`)
    return chromiumLauncher.launch({ ...options, executablePath })
  }

  log('Using Playwright bundled Chromium')
  return chromiumLauncher.launch(options)
}

export function stopTextEditorSmokeViteRuntime(viteProcess) {
  if (viteProcess) {
    viteProcess.kill()
  }
}
