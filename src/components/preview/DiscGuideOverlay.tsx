export type DiscGuideOverlayProps = {
  innerPrintableBoundaryPercent: number
  printableInsetPercent: number
  safeInsetPercent: number
  physicalCenterHolePercent: number
}

export function DiscGuideOverlay({
  innerPrintableBoundaryPercent,
  printableInsetPercent,
  safeInsetPercent,
  physicalCenterHolePercent,
}: DiscGuideOverlayProps) {
  return (
    <>
      <div
        className="hub-no-print-zone"
        style={{ width: `${innerPrintableBoundaryPercent}%` }}
      />
      <div
        className="printable-zone"
        style={{ inset: `${printableInsetPercent}%` }}
      />
      <div className="safe-zone" style={{ inset: `${safeInsetPercent}%` }} />
      <div
        className="inner-print-boundary"
        style={{ width: `${innerPrintableBoundaryPercent}%` }}
      />
      <div
        className="center-hole"
        style={{ width: `${physicalCenterHolePercent}%` }}
      />
    </>
  )
}
