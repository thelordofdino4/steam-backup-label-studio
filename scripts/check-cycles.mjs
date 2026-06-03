#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.join(repoRoot, 'src')
const sourceExtensions = ['.ts', '.tsx']

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function walkSourceFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      walkSourceFiles(absolutePath, files)
      continue
    }

    const extension = path.extname(entry.name)
    if (sourceExtensions.includes(extension) && !entry.name.endsWith('.d.ts')) {
      files.push(absolutePath)
    }
  }

  return files
}

function createImportSpecifiers(source) {
  const specifiers = []
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1])
    }
  }

  return specifiers
}

function createResolver(sourceFiles) {
  const normalizedSourceFiles = new Set(sourceFiles.map((filePath) => path.normalize(filePath)))

  return function resolveRelativeImport(fromFile, specifier) {
    if (!specifier.startsWith('.')) {
      return null
    }

    const resolvedPath = path.normalize(path.resolve(path.dirname(fromFile), specifier))
    const hasSourceExtension = sourceExtensions.includes(path.extname(resolvedPath))
    const candidates = hasSourceExtension
      ? [resolvedPath]
      : [
          ...sourceExtensions.map((extension) => `${resolvedPath}${extension}`),
          ...sourceExtensions.map((extension) => path.join(resolvedPath, `index${extension}`)),
        ]

    return candidates.find((candidate) => normalizedSourceFiles.has(path.normalize(candidate))) ?? null
  }
}

function createDependencyGraph(sourceFiles) {
  const resolveRelativeImport = createResolver(sourceFiles)
  const graph = new Map()

  for (const filePath of sourceFiles) {
    const source = fs.readFileSync(filePath, 'utf8')
    const dependencies = new Set()

    for (const specifier of createImportSpecifiers(source)) {
      const dependency = resolveRelativeImport(filePath, specifier)
      if (dependency) {
        dependencies.add(dependency)
      }
    }

    graph.set(filePath, [...dependencies].sort())
  }

  return graph
}

function createCycleKey(cycle) {
  const cycleWithoutRepeatedStart = cycle.slice(0, -1).map(toRepoPath)
  const rotations = cycleWithoutRepeatedStart.map((_, index) =>
    [...cycleWithoutRepeatedStart.slice(index), ...cycleWithoutRepeatedStart.slice(0, index)].join('\0'),
  )

  return rotations.sort()[0]
}

function findCycles(graph) {
  const cycles = []
  const seenCycles = new Set()
  const stack = []
  const stackSet = new Set()

  function visit(filePath) {
    stack.push(filePath)
    stackSet.add(filePath)

    for (const dependency of graph.get(filePath) ?? []) {
      if (stackSet.has(dependency)) {
        const cycleStart = stack.indexOf(dependency)
        const cycle = [...stack.slice(cycleStart), dependency]
        const cycleKey = createCycleKey(cycle)

        if (!seenCycles.has(cycleKey)) {
          seenCycles.add(cycleKey)
          cycles.push(cycle)
        }

        continue
      }

      visit(dependency)
    }

    stackSet.delete(filePath)
    stack.pop()
  }

  for (const filePath of [...graph.keys()].sort()) {
    visit(filePath)
  }

  return cycles
}

if (!fs.existsSync(srcRoot)) {
  console.error(`Source directory not found: ${toRepoPath(srcRoot)}`)
  process.exit(1)
}

const sourceFiles = walkSourceFiles(srcRoot).sort()
const graph = createDependencyGraph(sourceFiles)
const cycles = findCycles(graph)

if (cycles.length > 0) {
  console.error('Dependency cycles detected in src relative imports:')
  console.error('')

  cycles.forEach((cycle, index) => {
    console.error(`${index + 1}. ${cycle.map(toRepoPath).join(' -> ')}`)
  })

  console.error('')
  console.error(`Found ${cycles.length} cycle${cycles.length === 1 ? '' : 's'}.`)
  process.exit(1)
}

console.log(`No dependency cycles found in src TypeScript/TSX relative imports. Checked ${sourceFiles.length} files.`)
