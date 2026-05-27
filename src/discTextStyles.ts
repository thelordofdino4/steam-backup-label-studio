import type { DiscTextKey } from './discText'

export type DiscTextRenderStyle = {
  fontSizePercent: number
  fontWeight: number
  color: string
  maxLines: number
}

export const DISC_TEXT_RENDER_STYLES: Record<DiscTextKey, DiscTextRenderStyle> = {
  title: { fontSizePercent: 3.6, fontWeight: 900, color: '#f9fafb', maxLines: 2 },
  subtitle: { fontSizePercent: 2.2, fontWeight: 800, color: '#f9fafb', maxLines: 1 },
  discNumber: { fontSizePercent: 1.9, fontWeight: 800, color: '#f9fafb', maxLines: 1 },
  backupDate: { fontSizePercent: 1.55, fontWeight: 700, color: '#e5e7eb', maxLines: 1 },
  appId: { fontSizePercent: 1.45, fontWeight: 700, color: '#d1d5db', maxLines: 1 },
  developer: { fontSizePercent: 1.45, fontWeight: 700, color: '#e5e7eb', maxLines: 1 },
  publisher: { fontSizePercent: 1.45, fontWeight: 700, color: '#e5e7eb', maxLines: 1 },
  installNotes: { fontSizePercent: 1.45, fontWeight: 700, color: '#f9fafb', maxLines: 2 },
  customNote: { fontSizePercent: 1.45, fontWeight: 700, color: '#f9fafb', maxLines: 2 },
  copyright: { fontSizePercent: 1.08, fontWeight: 650, color: '#d1d5db', maxLines: 3 },
}
