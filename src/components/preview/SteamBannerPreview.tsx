import type { CSSProperties } from 'react'
import type { SteamLogoPlacement } from '../../discText/index'
import type { BackgroundImageSize, SteamBannerColors, SteamBannerLockupLayout } from '../../project/projectTypes'
import {
  getSteamBannerBandLayout,
  getSteamBannerLockupAspectRatio,
  getSteamBannerLockupRect,
  type SteamBannerRect,
} from '../../branding/steamBannerLayout'
import {
  getSteamBannerFallbackTextFontSizeForHeight,
  normalizeSteamBannerFallbackText,
  shouldRenderSteamBannerTextFallback,
} from '../../branding/steamBannerDefaults'
import { ContentBoundedImage } from './ContentBoundedImage'

function getSteamBannerStyle(colors: SteamBannerColors): CSSProperties {
  return {
    inset: 0,
    bottom: 'auto',
    height: '100%',
    '--steam-banner-gradient-start': colors.gradientStart,
    '--steam-banner-gradient-end': colors.gradientEnd,
    '--steam-banner-accent': colors.accent,
  } as CSSProperties
}

function getRectStyle(rect: SteamBannerRect): CSSProperties {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    bottom: 'auto',
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  }
}

function getLockupRectStyle(rect: SteamBannerRect): CSSProperties {
  return {
    ...getRectStyle(rect),
    position: 'absolute',
    maxWidth: 'none',
    transform: 'none',
  }
}

function getTextLockupStyle(text: string, rect: SteamBannerRect | null): CSSProperties {
  return {
    fontSize: `${getSteamBannerFallbackTextFontSizeForHeight(
      text,
      (rect?.height ?? 0) * 100,
      1,
    )}cqw`,
  }
}

export type SteamBannerPreviewProps = {
  steamLogoPlacement: SteamLogoPlacement
  steamBannerColors: SteamBannerColors
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerUseTextFallback: boolean
  steamBannerFallbackText: string
}

export function SteamBannerPreview({
  steamLogoPlacement,
  steamBannerColors,
  steamBannerLockupImageUrl,
  steamBannerLockupImageSize,
  steamBannerLockupLayout,
  steamBannerUseTextFallback,
  steamBannerFallbackText,
}: SteamBannerPreviewProps) {
  const bandLayout = getSteamBannerBandLayout(steamLogoPlacement)
  const shouldShowTextFallback = shouldRenderSteamBannerTextFallback(
    steamBannerUseTextFallback,
    steamBannerLockupImageUrl,
  )
  const fallbackText = normalizeSteamBannerFallbackText(steamBannerFallbackText)
  const lockupAspectRatio = getSteamBannerLockupAspectRatio(
    shouldShowTextFallback ? null : steamBannerLockupImageSize,
  )
  const lockupRect = getSteamBannerLockupRect(
    steamLogoPlacement,
    steamBannerLockupLayout,
    lockupAspectRatio,
  )

  return (
    <>
      {bandLayout && (
        <div
          className={`steam-brand-banner ${steamLogoPlacement}`}
          style={getSteamBannerStyle(steamBannerColors)}
          aria-label="Steam brand banner"
        >
          <div
            className="steam-brand-banner-main"
            style={getRectStyle(bandLayout.mainBand)}
          />
          <div
            className="steam-brand-banner-accent"
            style={getRectStyle(bandLayout.accentBand)}
          />
          <div
            className="steam-brand-lockup"
            aria-label={fallbackText}
            style={lockupRect ? getLockupRectStyle(lockupRect) : undefined}
          >
            {!shouldShowTextFallback && steamBannerLockupImageUrl ? (
              <ContentBoundedImage
                src={steamBannerLockupImageUrl}
                alt="Steam banner lockup"
                imageSize={steamBannerLockupImageSize}
                draggable={false}
              />
            ) : (
              <span
                className="steam-brand-lockup-text"
                style={getTextLockupStyle(fallbackText, lockupRect)}
              >
                {fallbackText}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  )
}
