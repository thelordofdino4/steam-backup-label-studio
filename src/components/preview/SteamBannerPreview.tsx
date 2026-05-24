import type { CSSProperties } from 'react'
import type { SteamLogoPlacement } from '../../discText'

const BOTTOM_STEAM_LOCKUP_PREVIEW_STYLE: CSSProperties = {
  width: '27.27%',
  height: '58.75%',
  transform: 'translateY(-9%)',
}

export type SteamBannerPreviewProps = {
  steamLogoPlacement: SteamLogoPlacement
  steamBannerStyle: CSSProperties
  steamBannerLockupImageUrl: string | null
}

export function SteamBannerPreview({
  steamLogoPlacement,
  steamBannerStyle,
  steamBannerLockupImageUrl,
}: SteamBannerPreviewProps) {
  return (
    <>
      {steamLogoPlacement !== 'none' && (
        <div
          className={`steam-brand-banner ${steamLogoPlacement}`}
          style={steamBannerStyle}
          aria-label="Steam brand banner"
        >
          {steamLogoPlacement === 'bottom' && <div className="steam-brand-banner-accent" />}
          <div className="steam-brand-banner-main">
            <div
              className="steam-brand-lockup"
              aria-label="Steam"
              style={
                steamLogoPlacement === 'bottom'
                  ? BOTTOM_STEAM_LOCKUP_PREVIEW_STYLE
                  : undefined
              }
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
