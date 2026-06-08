import type { CSSProperties } from 'react'
import {
  normalizeSteamBannerFallbackText,
  shouldRenderSteamBannerTextFallback,
} from '../../branding/steamBannerDefaults'
import {
  getJewelCaseSteamBannerVisualLayout,
  type JewelCaseSteamBannerTarget,
} from '../../layout/jewelCaseSteamBannerLayout'
import type {
  CaseInsertPreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import type {
  JewelCasePixelRect,
} from '../../layout/jewelCaseLayout'
import type {
  ProjectCaseInsertSteamBanner,
} from '../../project/projectTypes'

type CaseInsertSteamBannerPreviewLayerProps = {
  banner: ProjectCaseInsertSteamBanner
  layout: CaseInsertPreviewLayout
  target: JewelCaseSteamBannerTarget
}

function getRectStyle(rect: JewelCasePixelRect, layout: CaseInsertPreviewLayout) {
  return {
    left: `${rect.x / layout.width * 100}%`,
    top: `${rect.y / layout.height * 100}%`,
    width: `${rect.width / layout.width * 100}%`,
    height: `${rect.height / layout.height * 100}%`,
  }
}

function getLockupStyle(
  rect: JewelCasePixelRect,
  layout: CaseInsertPreviewLayout,
  rotationDegrees: number,
) {
  return {
    left: `${(rect.x + rect.width / 2) / layout.width * 100}%`,
    top: `${(rect.y + rect.height / 2) / layout.height * 100}%`,
    width: `${rect.width / layout.width * 100}%`,
    height: `${rect.height / layout.height * 100}%`,
    transform: `translate(-50%, -50%) rotate(${rotationDegrees}deg)`,
  }
}

function getTextLockupStyle(
  text: string,
  rect: JewelCasePixelRect,
  layout: CaseInsertPreviewLayout,
): CSSProperties {
  const scale = Math.min(1, 7 / Math.max(text.length, 1))

  return {
    fontSize: `${rect.height / layout.width * 100 * 0.74 * scale}cqw`,
  }
}

export function CaseInsertSteamBannerPreviewLayer({
  banner,
  layout,
  target,
}: CaseInsertSteamBannerPreviewLayerProps) {
  const bannerLayout = getJewelCaseSteamBannerVisualLayout(
    banner,
    target,
    layout,
  )

  if (!bannerLayout) {
    return null
  }

  const shouldShowTextFallback = shouldRenderSteamBannerTextFallback(
    banner.useTextFallback,
    banner.lockupImageDataUrl,
  )
  const fallbackText = normalizeSteamBannerFallbackText(banner.fallbackText)
  const shouldTintBuiltInSpineIcon =
    target.kind === 'spine' &&
    !shouldShowTextFallback &&
    banner.lockupImageSource?.source === 'built-in'

  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      <div
        className="case-insert-steam-banner-main"
        style={{
          ...getRectStyle(bannerLayout.mainBand, layout),
          '--case-insert-steam-banner-gradient-start':
            banner.colors.gradientStart,
          '--case-insert-steam-banner-gradient-end':
            banner.colors.gradientEnd,
        } as CSSProperties}
      />
      <div
        className="case-insert-steam-banner-accent"
        style={{
          ...getRectStyle(bannerLayout.accentBand, layout),
          '--case-insert-steam-banner-accent': banner.colors.accent,
        } as CSSProperties}
      />
      <div
        className="case-insert-steam-banner-lockup"
        style={getLockupStyle(
          bannerLayout.lockupRect,
          layout,
          bannerLayout.lockupRotationDegrees,
        )}
      >
        {!shouldShowTextFallback && banner.lockupImageDataUrl ? (
          <img
            src={banner.lockupImageDataUrl}
            alt=""
            className={
              shouldTintBuiltInSpineIcon
                ? 'case-insert-steam-banner-lockup-image--white'
                : undefined
            }
            draggable={false}
          />
        ) : (
          <span
            className="case-insert-steam-banner-lockup-text"
            style={getTextLockupStyle(
              fallbackText,
              bannerLayout.lockupRect,
              layout,
            )}
          >
            {fallbackText}
          </span>
        )}
      </div>
    </div>
  )
}
