import { absolutizeUrl } from './steamLogoCandidateUrls.ts'
import { uniqueStrings } from './steamLogoCandidateSignals.ts'

export type OfficialCssImageSeed = {
  url: string
  sourcePageUrl: string
  label: string
  sourceKind: 'official-css-background'
  selector: string
  context: string
}

export function extractOfficialCssUrls(
  value: string | undefined,
  sourcePageUrl: string,
) {
  if (!value) return []

  const urls: string[] = []
  const urlPattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi
  let match: RegExpExecArray | null

  while ((match = urlPattern.exec(value)) !== null) {
    const url = absolutizeUrl(match[2], sourcePageUrl)
    if (url) urls.push(url)
  }

  return uniqueStrings(urls)
}

export function parseOfficialCssImageSeeds(
  css: string,
  sourcePageUrl: string,
): OfficialCssImageSeed[] {
  const seeds: OfficialCssImageSeed[] = []
  const rulePattern = /([^{}]+)\{([^{}]*url\([^{}]+)\}/gi
  let match: RegExpExecArray | null

  while ((match = rulePattern.exec(css)) !== null) {
    const selector = match[1].replace(/\s+/g, ' ').trim().slice(0, 180)
    const declarationBlock = match[2]

    extractOfficialCssUrls(declarationBlock, sourcePageUrl).forEach((url) => {
      seeds.push({
        url,
        sourcePageUrl,
        label: selector ? `${selector} CSS image` : 'Official stylesheet image',
        sourceKind: 'official-css-background',
        selector: selector || 'stylesheet',
        context: `${selector} { ${declarationBlock} }`,
      })
    })
  }

  if (seeds.length === 0) {
    extractOfficialCssUrls(css, sourcePageUrl).forEach((url) => {
      seeds.push({
        url,
        sourcePageUrl,
        label: 'Official stylesheet image',
        sourceKind: 'official-css-background',
        selector: 'stylesheet',
        context: css.slice(0, 240),
      })
    })
  }

  return seeds
}
