import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fixtureIds, fixtureSizes } from './fixtures.mjs'
import { assertPerformanceOpenStaging } from './persistence.mjs'
if (process.argv.length !== 3) throw new Error('Provide a fresh completed native run directory')
const directory = resolve(process.argv[2])
const results = []
for (const id of fixtureIds) {
  const path = join(directory, id)
  const persisted = JSON.parse(readFileSync(join(path, 'project.json'), 'utf8'))
  const result = await assertPerformanceOpenStaging(readFileSync(join(path, 'native-hydrated.json')),
    persisted, fixtureSizes[id.split('-')[1]])
  results.push({ id, ...result })
}
writeFileSync(join(directory, 'staging-baseline.json'), JSON.stringify({
  formatVersion: 1, boundary: 'actual-native-hydration-through-production-open-staging',
  limitations: ['No WebView transport, native dialog, editor commit or GUI acceptance'], results,
}, null, 2), { flag: 'wx' })
console.log('All six actual native hydrations pass production Open staging, exact assets and Case preset state.')
