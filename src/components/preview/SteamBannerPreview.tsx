import type { CSSProperties } from 'react'
import type { SteamLogoPlacement } from '../../discText'
import type { BackgroundImageSize, SteamBannerColors, SteamBannerLockupLayout } from '../../project/projectTypes'
import {
  getSteamBannerBandLayout,
  getSteamBannerLockupAspectRatio,
  getSteamBannerLockupRect,
  type SteamBannerRect,
} from '../../steamBannerLayout'

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

export type SteamBannerPreviewProps = {
  steamLogoPlacement: SteamLogoPlacement
  steamBannerColors: SteamBannerColors
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
}

export function SteamBannerPreview({
  steamLogoPlacement,
  steamBannerColors,
  steamBannerLockupImageUrl,
  steamBannerLockupImageSize,
  steamBannerLockupLayout,
}: SteamBannerPreviewProps) {
  const bandLayout = getSteamBannerBandLayout(steamLogoPlacement)
  const lockupAspectRatio = getSteamBannerLockupAspectRatio(steamBannerLockupImageSize)
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
            aria-label="Steam"
            style={lockupRect ? getLockupRectStyle(lockupRect) : undefined}
          >
            {steamBannerLockupImageUrl ? (
              <img
                src={steamBannerLockupImageUrl}
                alt="Steam banner lockup"
                draggable={false}
              />
            ) : (
              <span>STEAM</span>
            )}
          </div>
        </div>
      )}
    </>
  )
}
