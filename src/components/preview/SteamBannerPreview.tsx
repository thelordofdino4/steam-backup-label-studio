import type { CSSProperties } from 'react'
import type { SteamLogoPlacement } from '../../discText'
import type { SteamBannerColors, SteamBannerLockupLayout } from '../../project/projectTypes'

const BOTTOM_STEAM_LOCKUP_PREVIEW_STYLE: CSSProperties = {
  width: '27.27%',
  height: '58.75%',
}

function getLockupLayoutStyle(
  placement: SteamLogoPlacement,
  layout: SteamBannerLockupLayout,
): CSSProperties {
  const defaultTranslateY = placement === 'bottom' ? -9 : 0

  return {
    ...(placement === 'bottom' ? BOTTOM_STEAM_LOCKUP_PREVIEW_STYLE : {}),
    transform: `translate(${layout.offsetX}%, ${defaultTranslateY + layout.offsetY}%) scale(${layout.scale})`,
  }
}

function getSteamBannerStyle(colors: SteamBannerColors): CSSProperties {
  return {
    '--steam-banner-gradient-start': colors.gradientStart,
    '--steam-banner-gradient-end': colors.gradientEnd,
    '--steam-banner-accent': colors.accent,
  } as CSSProperties
}

export type SteamBannerPreviewProps = {
  steamLogoPlacement: SteamLogoPlacement
  steamBannerColors: SteamBannerColors
  steamBannerLockupImageUrl: string | null
  steamBannerLockupLayout: SteamBannerLockupLayout
}

export function SteamBannerPreview({
  steamLogoPlacement,
  steamBannerColors,
  steamBannerLockupImageUrl,
  steamBannerLockupLayout,
}: SteamBannerPreviewProps) {
  return (
    <>
      {steamLogoPlacement !== 'none' && (
        <div
          className={`steam-brand-banner ${steamLogoPlacement}`}
          style={getSteamBannerStyle(steamBannerColors)}
          aria-label="Steam brand banner"
        >
          {steamLogoPlacement === 'bottom' && <div className="steam-brand-banner-accent" />}
          <div className="steam-brand-banner-main">
            <div
              className="steam-brand-lockup"
              aria-label="Steam"
              style={getLockupLayoutStyle(steamLogoPlacement, steamBannerLockupLayout)}
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
          {steamLogoPlacement === 'top' && <div className="steam-brand-banner-accent" />}
        </div>
      )}
    </>
  )
}
