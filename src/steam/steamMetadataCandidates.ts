import type { GameRatingSystem, ProjectMetadata } from '../project/projectTypes'
import {
  normalizeEsrbRatingValue,
  normalizePegiRatingValue,
} from '../project/projectMetadata.ts'
import {
  fetchSteamPageHtml,
  importSteamApp,
  type SteamImportedGame,
} from './steamApi.ts'

export type SteamMetadataCandidateConfidence = 'high' | 'medium' | 'low'
export type SteamMetadataCandidateSource = 'steam-appdetails' | 'steam-page'
export type RatingCandidateApplyKind = 'rating' | 'custom' | 'none' | 'informational'

export type RatingBoardCandidate = {
  id: string
  boardId: string
  boardLabel: string
  rawRating: string
  displayRating: string
  ratingSystem: GameRatingSystem
  ratingValue: string
  applyKind: RatingCandidateApplyKind
  canApply: boolean
  confidence: SteamMetadataCandidateConfidence
  source: SteamMetadataCandidateSource
  sourceLabel: string
  sourceUrl: string | null
  descriptors: string[]
  reasons: string[]
}

export type LegalTextCandidate = {
  id: string
  text: string
  confidence: SteamMetadataCandidateConfidence
  source: SteamMetadataCandidateSource
  sourceLabel: string
  sourceUrl: string | null
  reasons: string[]
}

export type SteamMetadataCandidateSourceStatus = {
  source: SteamMetadataCandidateSource
  label: string
  status: 'searched' | 'unavailable' | 'error'
  ratingCandidateCount?: number
  legalCandidateCount?: number
  detail?: string
}

export type SteamMetadataCandidateDiscoveryResult = {
  ratingCandidates: RatingBoardCandidate[]
  legalCandidates: LegalTextCandidate[]
  sourceStatuses: SteamMetadataCandidateSourceStatus[]
}

export type SteamMetadataCandidateDiscoveryInput = {
  selectedSteamGame: SteamImportedGame | null
  projectMetadata: ProjectMetadata
}

type RatingCandidateSeed = {
  boardId: string
  rawRating: string
  descriptors?: string[]
  source: SteamMetadataCandidateSource
  sourceLabel: string
  sourceUrl: string | null
  reasons: string[]
  confidence?: SteamMetadataCandidateConfidence
  allowUnknownSupportedRating?: boolean
}

const SUPPORTED_RATING_BOARDS = new Set(['esrb', 'pegi'])
const BOARD_LABELS: Record<string, string> = {
  esrb: 'ESRB',
  pegi: 'PEGI',
  usk: 'USK',
  oflc: 'ACB/OFLC',
  nzoflc: 'NZOFLC',
  kgrb: 'GRAC',
  dejus: 'ClassInd',
  mda: 'MDA',
  fpb: 'FPB',
  csrr: 'CSRR',
  crl: 'CRL',
  igrs: 'IGRS',
  steam_germany: 'Steam Germany',
}
const MAX_LEGAL_CANDIDATES = 8
const MAX_AUTO_APPLY_LEGAL_TEXT_LENGTH = 650
const LEGAL_TERMS = [
  'copyright',
  '©',
  '(c)',
  'all rights reserved',
  'trademark',
  'registered trademark',
  'developed by',
  'published by',
]
const LEGAL_REJECT_TERMS = [
  'privacy policy',
  'steam subscriber agreement',
  'refunds',
  'cookie preferences',
  'accessibility',
  'valvesoftware.com/legal',
]
const AUTO_APPLY_LEGAL_REJECT_TERMS = [
  'internet connection',
  'user agreement',
  'privacy and cookie policy',
  'privacy cookie policy',
  'privacy & cookie policy',
  'account required',
  'steam account',
  'ea account',
  'in-game purchases',
  'online features',
  'retire online',
]

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&copy;/gi, '©')
    .replace(/&#169;/g, '©')
}

function stripScriptsAndStyles(value: string) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function getTagAttributes(tag: string) {
  const attributes: Record<string, string> = {}
  const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(tag)) !== null) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[3] ?? match[4] ?? match[5] ?? '')
  }

  return attributes
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9+©]+/g, ' ').trim()
}

function normalizeId(value: string) {
  return normalizeForMatch(value).replace(/\s+/g, '-').slice(0, 80)
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function splitDescriptors(value: string | undefined) {
  if (!value) return []

  return uniqueStrings(value.split(/\r?\n|;|,/))
}

function parseSteamAppId(value: string) {
  const trimmed = value.trim()

  if (!/^\d+$/.test(trimmed)) return null

  const appId = Number(trimmed)
  return Number.isSafeInteger(appId) && appId > 0 ? appId : null
}

function getBoardLabel(boardId: string) {
  return BOARD_LABELS[boardId] ?? boardId.toUpperCase().replace(/_/g, ' ')
}

function normalizeEsrbRating(value: string) {
  return normalizeEsrbRatingValue(value)
}

function normalizePegiRating(value: string) {
  return normalizePegiRatingValue(value)
}

function isUnratedValue(value: string) {
  const normalized = normalizeForMatch(value)

  return /\b(unrated|not rated|not yet rated|nr|none|no rating)\b/.test(normalized)
}

function getSupportedRatingValue(boardId: string, rawRating: string) {
  if (boardId === 'esrb') return normalizeEsrbRating(rawRating)
  if (boardId === 'pegi') return normalizePegiRating(rawRating)

  return null
}

function createRatingCandidate({
  boardId,
  rawRating,
  descriptors = [],
  source,
  sourceLabel,
  sourceUrl,
  reasons,
  confidence,
  allowUnknownSupportedRating = true,
}: RatingCandidateSeed): RatingBoardCandidate | null {
  const normalizedBoardId = boardId.trim().toLowerCase()
  const trimmedRating = rawRating.trim()

  if (!normalizedBoardId || !trimmedRating) return null

  const boardLabel = getBoardLabel(normalizedBoardId)
  const isSupportedBoard = SUPPORTED_RATING_BOARDS.has(normalizedBoardId)
  const supportedRatingValue = getSupportedRatingValue(normalizedBoardId, trimmedRating)
  const displayRating = supportedRatingValue ?? trimmedRating.toUpperCase()
  const baseConfidence = confidence ?? (source === 'steam-appdetails' ? 'medium' : 'low')

  if (trimmedRating.toLowerCase() === 'banned') {
    return {
      id: `rating-${source}-${normalizeId(normalizedBoardId)}-banned`,
      boardId: normalizedBoardId,
      boardLabel,
      rawRating: trimmedRating,
      displayRating: 'Banned',
      ratingSystem: 'none',
      ratingValue: '',
      applyKind: 'informational',
      canApply: false,
      confidence: 'low',
      source,
      sourceLabel,
      sourceUrl,
      descriptors,
      reasons: [...reasons, 'Steam reported this regional entry as banned, so no badge value is suggested.'],
    }
  }

  if (isUnratedValue(trimmedRating)) {
    return {
      id: `rating-${source}-${normalizeId(normalizedBoardId)}-unrated`,
      boardId: normalizedBoardId,
      boardLabel,
      rawRating: trimmedRating,
      displayRating: 'Unrated',
      ratingSystem: 'none',
      ratingValue: '',
      applyKind: 'none',
      canApply: true,
      confidence: source === 'steam-appdetails' ? 'high' : 'medium',
      source,
      sourceLabel,
      sourceUrl,
      descriptors,
      reasons: [...reasons, `${boardLabel} data indicates no rated badge value.`],
    }
  }

  if (isSupportedBoard && supportedRatingValue) {
    return {
      id: `rating-${source}-${normalizeId(normalizedBoardId)}-${normalizeId(supportedRatingValue)}`,
      boardId: normalizedBoardId,
      boardLabel,
      rawRating: trimmedRating,
      displayRating: supportedRatingValue,
      ratingSystem: boardLabel as GameRatingSystem,
      ratingValue: supportedRatingValue,
      applyKind: 'rating',
      canApply: true,
      confidence: source === 'steam-appdetails' ? 'high' : 'medium',
      source,
      sourceLabel,
      sourceUrl,
      descriptors,
      reasons: [...reasons, `Maps to an existing ${boardLabel} metadata value.`],
    }
  }

  if (isSupportedBoard && !allowUnknownSupportedRating) {
    return null
  }

  return {
    id: `rating-${source}-${normalizeId(normalizedBoardId)}-${normalizeId(trimmedRating)}`,
    boardId: normalizedBoardId,
    boardLabel,
    rawRating: trimmedRating,
    displayRating,
    ratingSystem: 'custom',
    ratingValue: `${boardLabel} ${displayRating}`,
    applyKind: isSupportedBoard ? 'custom' : 'custom',
    canApply: true,
    confidence: baseConfidence,
    source,
    sourceLabel,
    sourceUrl,
    descriptors,
    reasons: [
      ...reasons,
      isSupportedBoard
        ? `${boardLabel} value was found but does not match the built-in value list.`
        : `${boardLabel} is not a built-in rating badge system, so it can only be applied as a custom label.`,
    ],
  }
}

function createLegalCandidate(
  text: string,
  source: SteamMetadataCandidateSource,
  sourceLabel: string,
  sourceUrl: string | null,
  reasons: string[],
): LegalTextCandidate | null {
  const normalizedText = stripTags(text)

  if (!isLikelyLegalText(normalizedText)) return null

  return {
    id: `legal-${source}-${normalizeId(normalizedText)}`,
    text: normalizedText,
    confidence: source === 'steam-appdetails' ? 'high' : 'medium',
    source,
    sourceLabel,
    sourceUrl,
    reasons,
  }
}

function isLikelyLegalText(text: string) {
  const normalized = normalizeForMatch(text)

  if (text.length < 20 || text.length > 1800) return false
  if (LEGAL_REJECT_TERMS.some((term) => normalized.includes(term))) return false

  return LEGAL_TERMS.some((term) => normalized.includes(normalizeForMatch(term)))
}

function dedupeRatingCandidates(candidates: RatingBoardCandidate[]) {
  const byKey = new Map<string, RatingBoardCandidate>()

  candidates.forEach((candidate) => {
    const key = [
      candidate.boardId,
      candidate.ratingSystem,
      candidate.ratingValue,
      candidate.displayRating,
      candidate.applyKind,
    ].join('|')
    const existing = byKey.get(key)

    if (!existing || getRatingCandidateRank(candidate) > getRatingCandidateRank(existing)) {
      byKey.set(key, candidate)
    }
  })

  return [...byKey.values()].sort((left, right) => {
    const leftBoardRank = left.boardId === 'esrb' ? 0 : left.boardId === 'pegi' ? 1 : 2
    const rightBoardRank = right.boardId === 'esrb' ? 0 : right.boardId === 'pegi' ? 1 : 2

    return (
      leftBoardRank - rightBoardRank ||
      getRatingCandidateRank(right) - getRatingCandidateRank(left) ||
      left.boardLabel.localeCompare(right.boardLabel) ||
      left.displayRating.localeCompare(right.displayRating)
    )
  })
}

function getRatingCandidateRank(candidate: RatingBoardCandidate) {
  const sourceRank = candidate.source === 'steam-appdetails' ? 4 : 0
  const confidenceRank = candidate.confidence === 'high' ? 3 : candidate.confidence === 'medium' ? 2 : 1
  const supportedRank = candidate.ratingSystem === 'ESRB' || candidate.ratingSystem === 'PEGI' ? 3 : 0

  return sourceRank + confidenceRank + supportedRank
}

function dedupeLegalCandidates(candidates: LegalTextCandidate[]) {
  const byText = new Map<string, LegalTextCandidate>()

  candidates.forEach((candidate) => {
    const key = normalizeForMatch(candidate.text)
    const existing = byText.get(key)

    if (!existing || getLegalCandidateRank(candidate) > getLegalCandidateRank(existing)) {
      byText.set(key, candidate)
    }
  })

  return [...byText.values()].slice(0, MAX_LEGAL_CANDIDATES)
}

function getLegalCandidateRank(candidate: LegalTextCandidate) {
  return (candidate.source === 'steam-appdetails' ? 3 : 0) +
    (candidate.confidence === 'high' ? 2 : candidate.confidence === 'medium' ? 1 : 0)
}

function getStructuredRatingCandidates(game: SteamImportedGame) {
  const ratings = game.ratings ?? {}
  const candidates: RatingBoardCandidate[] = []

  Object.entries(ratings).forEach(([boardId, boardData]) => {
    const rating = typeof boardData.rating === 'string' ? boardData.rating : ''
    const candidate = createRatingCandidate({
      boardId,
      rawRating: rating,
      descriptors: splitDescriptors(boardData.descriptors),
      source: 'steam-appdetails',
      sourceLabel: 'Steam appdetails',
      sourceUrl: game.storeUrl,
      reasons: [`Steam appdetails includes ${getBoardLabel(boardId)} rating data.`],
      confidence: SUPPORTED_RATING_BOARDS.has(boardId) ? 'high' : 'medium',
    })

    if (candidate) candidates.push(candidate)
  })

  return candidates
}

function getStructuredLegalCandidates(game: SteamImportedGame) {
  const candidate = game.legalNotice
    ? createLegalCandidate(
        game.legalNotice,
        'steam-appdetails',
        'Steam appdetails',
        game.storeUrl,
        ['Steam appdetails includes a legal notice field.'],
      )
    : null

  return candidate ? [candidate] : []
}

function getCandidateCountDetail(
  ratingCandidates: RatingBoardCandidate[],
  legalCandidates: LegalTextCandidate[],
) {
  const pieces = [
    `${ratingCandidates.length} rating candidate${ratingCandidates.length === 1 ? '' : 's'}`,
    `${legalCandidates.length} legal candidate${legalCandidates.length === 1 ? '' : 's'}`,
  ]

  return pieces.join(', ')
}

export function buildSteamMetadataCandidatesFromImportedGame(
  game: SteamImportedGame,
): SteamMetadataCandidateDiscoveryResult {
  const ratingCandidates = getStructuredRatingCandidates(game)
  const legalCandidates = getStructuredLegalCandidates(game)

  return {
    ratingCandidates: dedupeRatingCandidates(ratingCandidates),
    legalCandidates: dedupeLegalCandidates(legalCandidates),
    sourceStatuses: [
      {
        source: 'steam-appdetails',
        label: 'Steam appdetails',
        status: 'searched',
        ratingCandidateCount: ratingCandidates.length,
        legalCandidateCount: legalCandidates.length,
        detail: getCandidateCountDetail(ratingCandidates, legalCandidates),
      },
    ],
  }
}

export function getAutoApplyRatingCandidate(
  candidates: RatingBoardCandidate[],
): RatingBoardCandidate | null {
  return candidates.find(
    (candidate) =>
      candidate.canApply &&
      candidate.applyKind === 'rating' &&
      candidate.ratingSystem === 'ESRB' &&
      candidate.confidence === 'high',
  ) ?? null
}

export function getAutoApplyLegalTextCandidate(
  candidates: LegalTextCandidate[],
): LegalTextCandidate | null {
  return candidates.find(
    (candidate) =>
      candidate.confidence === 'high' &&
      candidate.text.length <= MAX_AUTO_APPLY_LEGAL_TEXT_LENGTH &&
      !AUTO_APPLY_LEGAL_REJECT_TERMS.some((term) =>
        normalizeForMatch(candidate.text).includes(normalizeForMatch(term)),
      ),
  ) ?? null
}

function extractRatingMentionsFromText(
  text: string,
  sourceLabel: string,
  sourceUrl: string | null,
) {
  const candidates: RatingBoardCandidate[] = []
  const ratingTextPattern = /\b(ESRB|PEGI)\b(?:\s*(?:rating|rated)?\s*[:-]?\s*)([a-zA-Z0-9+ ]{1,36})/gi
  const fileNamePattern = /(?:^|[^a-z0-9])(esrb|pegi)[\s_-]+([a-z0-9+]{1,8})(?:[^a-z0-9+]|$)/gi
  let match: RegExpExecArray | null

  while ((match = ratingTextPattern.exec(text)) !== null) {
    const candidate = createRatingCandidate({
      boardId: match[1],
      rawRating: match[2],
      source: 'steam-page',
      sourceLabel,
      sourceUrl,
      reasons: ['Steam page HTML mentions this rating board and value.'],
      confidence: 'medium',
      allowUnknownSupportedRating: false,
    })

    if (candidate) candidates.push(candidate)
  }

  while ((match = fileNamePattern.exec(text)) !== null) {
    const candidate = createRatingCandidate({
      boardId: match[1],
      rawRating: match[2],
      source: 'steam-page',
      sourceLabel,
      sourceUrl,
      reasons: ['Steam page image metadata or filename mentions this rating board and value.'],
      confidence: 'medium',
      allowUnknownSupportedRating: false,
    })

    if (candidate) candidates.push(candidate)
  }

  return candidates
}

export function parseSteamRatingCandidatesFromHtml(
  html: string,
  sourcePageUrl: string,
) {
  const candidates: RatingBoardCandidate[] = []
  const cleanHtml = stripScriptsAndStyles(html)
  const imageTagPattern = /<img\b[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = imageTagPattern.exec(cleanHtml)) !== null) {
    const attrs = getTagAttributes(match[0])
    const context = [
      attrs.alt,
      attrs.title,
      attrs.src,
      attrs.class,
      attrs.id,
    ].filter(Boolean).join(' ')

    candidates.push(
      ...extractRatingMentionsFromText(context, 'Steam store page', sourcePageUrl),
    )
  }

  candidates.push(
    ...extractRatingMentionsFromText(
      stripTags(cleanHtml),
      'Steam store page',
      sourcePageUrl,
    ),
  )

  return dedupeRatingCandidates(candidates)
}

function extractLegalElements(html: string) {
  const cleanHtml = stripScriptsAndStyles(html)
  const candidates: string[] = []
  const elementPattern = /<([a-zA-Z][a-zA-Z0-9:-]*)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  const paragraphPattern = /<(?:p|div|li)\b[^>]*>([\s\S]*?)<\/(?:p|div|li)>/gi
  let match: RegExpExecArray | null

  while ((match = elementPattern.exec(cleanHtml)) !== null) {
    const attrs = getTagAttributes(match[0])
    const identity = normalizeForMatch([attrs.class, attrs.id, attrs.itemprop].filter(Boolean).join(' '))

    if (/\b(legal|copyright|trademark|game area legal|legal notice)\b/.test(identity)) {
      candidates.push(match[3])
    }
  }

  while ((match = paragraphPattern.exec(cleanHtml)) !== null) {
    const text = stripTags(match[1])

    if (isLikelyLegalText(text)) candidates.push(text)
  }

  return uniqueStrings(candidates)
}

export function parseSteamLegalTextCandidatesFromHtml(
  html: string,
  sourcePageUrl: string,
) {
  return dedupeLegalCandidates(
    extractLegalElements(html)
      .map((text) =>
        createLegalCandidate(
          text,
          'steam-page',
          'Steam store page',
          sourcePageUrl,
          ['Steam store page HTML includes a likely legal/copyright snippet.'],
        ),
      )
      .filter((candidate): candidate is LegalTextCandidate => Boolean(candidate)),
  )
}

export function parseSteamMetadataCandidatesFromHtml(
  html: string,
  sourcePageUrl: string,
): Pick<SteamMetadataCandidateDiscoveryResult, 'ratingCandidates' | 'legalCandidates'> {
  return {
    ratingCandidates: parseSteamRatingCandidatesFromHtml(html, sourcePageUrl),
    legalCandidates: parseSteamLegalTextCandidatesFromHtml(html, sourcePageUrl),
  }
}

function mergeDiscoveryResults(
  results: SteamMetadataCandidateDiscoveryResult[],
): SteamMetadataCandidateDiscoveryResult {
  return {
    ratingCandidates: dedupeRatingCandidates(
      results.flatMap((result) => result.ratingCandidates),
    ),
    legalCandidates: dedupeLegalCandidates(
      results.flatMap((result) => result.legalCandidates),
    ),
    sourceStatuses: results.flatMap((result) => result.sourceStatuses),
  }
}

function getStoreUrl(
  selectedSteamGame: SteamImportedGame | null,
  projectMetadata: ProjectMetadata,
) {
  if (selectedSteamGame?.storeUrl) {
    return selectedSteamGame.storeUrl
  }

  const appId = parseSteamAppId(projectMetadata.steamAppId)
  return appId ? `https://store.steampowered.com/app/${appId}` : null
}

function getSteamStoreUrlWithLocale(url: string) {
  try {
    const parsedUrl = new URL(url)
    parsedUrl.searchParams.set('l', 'english')
    parsedUrl.searchParams.set('cc', 'us')
    return parsedUrl.toString()
  } catch {
    return url
  }
}

function createUnavailableAppdetailsStatus(): SteamMetadataCandidateSourceStatus {
  return {
    source: 'steam-appdetails',
    label: 'Steam appdetails',
    status: 'unavailable',
    detail: 'Import a Steam game or enter a numeric Steam App ID to search metadata candidates.',
  }
}

function createHtmlSourceStatus(
  status: SteamMetadataCandidateSourceStatus['status'],
  ratingCandidateCount = 0,
  legalCandidateCount = 0,
  detail?: string,
): SteamMetadataCandidateSourceStatus {
  return {
    source: 'steam-page',
    label: 'Steam store page',
    status,
    ratingCandidateCount,
    legalCandidateCount,
    detail,
  }
}

export async function discoverSteamMetadataCandidates({
  selectedSteamGame,
  projectMetadata,
}: SteamMetadataCandidateDiscoveryInput): Promise<SteamMetadataCandidateDiscoveryResult> {
  const results: SteamMetadataCandidateDiscoveryResult[] = []
  const appId = parseSteamAppId(projectMetadata.steamAppId)
  let game = selectedSteamGame

  if (!game && appId) {
    try {
      game = await importSteamApp(appId)
    } catch (error) {
      results.push({
        ratingCandidates: [],
        legalCandidates: [],
        sourceStatuses: [
          {
            source: 'steam-appdetails',
            label: 'Steam appdetails',
            status: 'error',
            detail: error instanceof Error ? error.message : String(error),
          },
        ],
      })
    }
  }

  if (game) {
    results.push(buildSteamMetadataCandidatesFromImportedGame(game))
  } else if (!appId) {
    results.push({
      ratingCandidates: [],
      legalCandidates: [],
      sourceStatuses: [createUnavailableAppdetailsStatus()],
    })
  }

  const storeUrl = getStoreUrl(game, projectMetadata)

  if (storeUrl) {
    const localizedStoreUrl = getSteamStoreUrlWithLocale(storeUrl)

    try {
      const html = await fetchSteamPageHtml(localizedStoreUrl)
      const parsedHtml = parseSteamMetadataCandidatesFromHtml(html, localizedStoreUrl)

      results.push({
        ...parsedHtml,
        sourceStatuses: [
          createHtmlSourceStatus(
            'searched',
            parsedHtml.ratingCandidates.length,
            parsedHtml.legalCandidates.length,
            getCandidateCountDetail(
              parsedHtml.ratingCandidates,
              parsedHtml.legalCandidates,
            ),
          ),
        ],
      })
    } catch (error) {
      results.push({
        ratingCandidates: [],
        legalCandidates: [],
        sourceStatuses: [
          createHtmlSourceStatus(
            'error',
            0,
            0,
            error instanceof Error ? error.message : String(error),
          ),
        ],
      })
    }
  } else {
    results.push({
      ratingCandidates: [],
      legalCandidates: [],
      sourceStatuses: [
        createHtmlSourceStatus(
          'unavailable',
          0,
          0,
          'No Steam store URL or numeric App ID is available.',
        ),
      ],
    })
  }

  return mergeDiscoveryResults(results)
}
