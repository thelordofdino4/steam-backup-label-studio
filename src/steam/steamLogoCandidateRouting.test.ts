import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCandidateRouting,
  getCandidateRoutingSignals,
  isNonLogoSteamCreatorMetadataImage,
} from './steamLogoCandidateRouting.ts'

test('routes logo-like Steam avatar candidates to branding', () => {
  const routing = getCandidateRouting(
    {
      sourceKind: 'steam-avatar',
      sourcePageUrl: 'https://store.steampowered.com/curator/valve',
    },
    'png',
    'valve avatar',
    'valve avatar',
  )

  assert.equal(routing.targetWorkflow, 'branding-logo')
  assert.equal(routing.contentKind, 'logo')
  assert.deepEqual(routing.routingReasons, ['Logo-like image routed to Branding'])
})

test('routes non-logo Steam metadata images to artwork', () => {
  const routing = getCandidateRouting(
    {
      sourceKind: 'steam-meta-image',
      sourcePageUrl: 'https://store.steampowered.com/app/230410/Warframe/',
    },
    'png',
    'warframe hero background',
    'warframe hero background',
  )

  assert.equal(routing.targetWorkflow, 'artwork')
  assert.equal(routing.contentKind, 'artwork')
  assert.deepEqual(routing.routingReasons, ['Artwork-like image routed to Artwork'])
})

test('identifies generic Steam creator metadata images before candidate creation', () => {
  const seed = {
    sourceKind: 'steam-meta-image' as const,
    sourcePageUrl: 'https://store.steampowered.com/developer/digitalextremes',
  }
  const { isLogoLike } = getCandidateRoutingSignals(
    seed,
    'jpg',
    'share 1980x1080',
    'share 1980x1080',
  )

  assert.equal(isLogoLike, false)
  assert.equal(isNonLogoSteamCreatorMetadataImage(seed, isLogoLike), true)
})

test('routes official non-logo and jpg metadata images to artwork', () => {
  const routing = getCandidateRouting(
    {
      sourceKind: 'official-meta-image',
      sourcePageUrl: 'https://www.example.com/',
    },
    'jpg',
    'social share hero',
    'social share hero',
  )

  assert.equal(routing.targetWorkflow, 'artwork')
  assert.equal(routing.contentKind, 'artwork')
  assert.deepEqual(routing.routingReasons, ['Artwork-like image routed to Artwork'])
})
