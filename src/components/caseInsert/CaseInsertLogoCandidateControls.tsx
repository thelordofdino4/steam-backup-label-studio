import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import { LogoCandidateControls } from '../sidebar/branding/LogoCandidateControls'

const CASE_INSERT_LOGO_CANDIDATE_SECTIONS: Array<{
  logoKey: LogoAssetKey
  label: string
}> = [
  { logoKey: 'developer', label: 'Developer' },
  { logoKey: 'publisher', label: 'Publisher' },
]

export type CaseInsertLogoCandidateControlsProps = {
  logoCandidateDiscovery: LogoCandidateDiscoveryState
  handleFindLogoCandidates: (logoKey: LogoAssetKey) => void | Promise<void>
  onUseLogoCandidate: (
    logoKey: LogoAssetKey,
    candidate: RemoteLogoCandidate,
  ) => void | Promise<void>
}

export function CaseInsertLogoCandidateControls({
  logoCandidateDiscovery,
  handleFindLogoCandidates,
  onUseLogoCandidate,
}: CaseInsertLogoCandidateControlsProps) {
  return (
    <div className="case-insert-logo-candidate-group">
      {CASE_INSERT_LOGO_CANDIDATE_SECTIONS.map(({ logoKey, label }) => (
        <div className="logo-asset-card case-insert-logo-candidate-card" key={logoKey}>
          <span className="field-label">{label} logo candidates</span>
          <LogoCandidateControls
            logoKey={logoKey}
            label={label}
            discovery={logoCandidateDiscovery[logoKey]}
            helpText={`Searches the same Steam and official-site logo candidates used by the disc editor. Choosing a candidate adds or replaces the ${label.toLowerCase()} logo slot here; custom upload remains available inside the slot.`}
            handleFindLogoCandidates={handleFindLogoCandidates}
            handleApplyLogoCandidate={(candidate) =>
              onUseLogoCandidate(logoKey, candidate)}
          />
        </div>
      ))}
    </div>
  )
}
