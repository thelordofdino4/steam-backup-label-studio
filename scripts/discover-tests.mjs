import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)))
export const testRoots = ['scripts', 'src']
const supportedTest = /\.test\.(?:[cm]?js|[cm]?ts)$/

/** Discover every Node test; unsupported test extensions fail instead of disappearing. */
export function discoverTestFiles(root = repositoryRoot) {
  const files = []
  function visit(relativeDirectory) {
    for (const entry of readdirSync(join(root, relativeDirectory), {
      withFileTypes: true,
    })) {
      const relativePath = `${relativeDirectory}/${entry.name}`
      if (entry.isSymbolicLink()) {
        throw new Error(`Test discovery does not follow symbolic links: ${relativePath}`)
      }
      if (entry.isDirectory()) visit(relativePath)
      else if (/\.test\.[^.]+$/.test(entry.name)) {
        if (!supportedTest.test(entry.name)) {
          throw new Error(`Unsupported Node test extension: ${relativePath}`)
        }
        files.push(relativePath)
      }
    }
  }
  for (const rootDirectory of testRoots) visit(rootDirectory)
  return files.sort()
}
