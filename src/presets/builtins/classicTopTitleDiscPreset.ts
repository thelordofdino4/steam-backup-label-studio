import {
  parseDiscPresetDefinition,
  type DiscPresetDefinitionV1,
} from '../discPresetDefinition.ts'

export const CLASSIC_TOP_TITLE_DISC_PRESET_ID =
  'builtin:disc-preset:classic-top-title' as const

const CLASSIC_TOP_TITLE_DISC_PRESET_SOURCE = {
  kind: 'sbls/disc-preset',
  formatVersion: 1,
  id: CLASSIC_TOP_TITLE_DISC_PRESET_ID,
  revision: 1,
  name: 'Classic Top Title',
  description:
    'Places the game title at the top with supporting marks, logos, and legal text below.',
  surface: 'disc',
  compatibility: {
    mode: 'any-disc-template',
    onConflict: 'resolve',
  },
  slots: [
    {
      id: 'disc:guided:game-title:primary',
      contentRegion: {
        centerXPercent: 50,
        centerYPercent: 19.5,
        widthPercent: 62,
        heightPercent: 16,
      },
      visualLayer: 'foreground',
      placements: [
        {
          kind: 'point',
          target: 'game-title.artwork',
          size: { mode: 'fixed-scale', scale: 1 },
        },
        {
          kind: 'text',
          target: 'game-title.text',
          mode: 'straight',
          align: 'center',
          fit: 'region',
        },
      ],
    },
    {
      id: 'disc:guided:background-image:primary',
      contentRegion: {
        centerXPercent: 50,
        centerYPercent: 50,
        widthPercent: 92,
        heightPercent: 92,
      },
      actionRegion: {
        centerXPercent: 50,
        centerYPercent: 34,
        widthPercent: 34,
        heightPercent: 8,
      },
      visualLayer: 'background',
      placements: [
        {
          kind: 'background',
          target: 'background.primary',
          fit: 'cover',
          scale: 1,
        },
      ],
    },
    {
      id: 'disc:guided:rating-badge:primary',
      contentRegion: {
        centerXPercent: 79,
        centerYPercent: 62,
        widthPercent: 20,
        heightPercent: 14,
      },
      visualLayer: 'foreground',
      placements: [
        {
          kind: 'point',
          target: 'rating.primary',
          size: { mode: 'fixed-scale', scale: 0.75 },
        },
      ],
    },
    {
      id: 'disc:guided:media-format-mark:primary',
      contentRegion: {
        centerXPercent: 80,
        centerYPercent: 76,
        widthPercent: 22,
        heightPercent: 9,
      },
      visualLayer: 'foreground',
      placements: [
        {
          kind: 'point',
          target: 'media-format.primary',
          size: { mode: 'fixed-scale', scale: 0.7 },
        },
      ],
    },
    {
      id: 'disc:guided:operating-system-marks:group',
      contentRegion: {
        centerXPercent: 50,
        centerYPercent: 73,
        widthPercent: 28,
        heightPercent: 10,
      },
      visualLayer: 'foreground',
      placements: [
        {
          kind: 'group',
          target: 'operating-system-marks.enabled',
        },
      ],
    },
    {
      id: 'disc:guided:developer-logo:primary',
      contentRegion: {
        centerXPercent: 21,
        centerYPercent: 62,
        widthPercent: 26,
        heightPercent: 9,
      },
      visualLayer: 'foreground',
      placements: [
        {
          kind: 'point',
          target: 'developer-logo.primary',
          size: { mode: 'fixed-scale', scale: 0.7 },
        },
      ],
    },
    {
      id: 'disc:guided:publisher-logo:primary',
      contentRegion: {
        centerXPercent: 21,
        centerYPercent: 74,
        widthPercent: 26,
        heightPercent: 9,
      },
      visualLayer: 'foreground',
      placements: [
        {
          kind: 'point',
          target: 'publisher-logo.primary',
          size: { mode: 'fixed-scale', scale: 0.7 },
        },
      ],
    },
    {
      id: 'disc:guided:legal-text:copyright',
      contentRegion: {
        centerXPercent: 50,
        centerYPercent: 85,
        widthPercent: 46,
        heightPercent: 8,
      },
      visualLayer: 'foreground',
      placements: [
        {
          kind: 'text',
          target: 'legal.copyright',
          mode: 'straight',
          align: 'center',
          fit: 'region',
        },
      ],
    },
  ],
} as const

const parsedClassicTopTitle = parseDiscPresetDefinition(
  CLASSIC_TOP_TITLE_DISC_PRESET_SOURCE,
)

if (!parsedClassicTopTitle.ok) {
  throw new Error(
    `Invalid built-in Classic Top Title Disc preset at ${parsedClassicTopTitle.error.path}.`,
  )
}

export const CLASSIC_TOP_TITLE_DISC_PRESET: DiscPresetDefinitionV1 =
  parsedClassicTopTitle.value
