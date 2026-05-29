import type { SteamMetadataAssistanceState } from '../../hooks/useSteamMetadataAssistance'
import type {
  LegalTextCandidate,
  RatingBoardCandidate,
  SteamMetadataCandidateSourceStatus,
} from '../../steam/steamMetadataCandidates'

export type MetadataAssistanceControlsProps = {
  metadataAssistance: SteamMetadataAssistanceState
  canFindMetadataCandidates: boolean
  handleFindMetadataCandidates: () => void | Promise<void>
  handleApplyRatingCandidate: (candidate: RatingBoardCandidate) => void
  handleApplyLegalCandidate: (candidate: LegalTextCandidate) => void
  handleCopyLegalCandidate: (candidate: LegalTextCandidate) => void | Promise<void>
}

function formatSourceStatus(status: SteamMetadataCandidateSourceStatus) {
  if (status.status === 'unavailable') {
    return `${status.label}: unavailable${status.detail ? ` - ${status.detail}` : ''}`
  }

  if (status.status === 'error') {
    return `${status.label}: blocked or unavailable${status.detail ? ` - ${status.detail}` : ''}`
  }

  const ratingCount = status.ratingCandidateCount ?? 0
  const legalCount = status.legalCandidateCount ?? 0

  return `${status.label}: ${ratingCount} rating candidate${ratingCount === 1 ? '' : 's'}, ${legalCount} legal candidate${legalCount === 1 ? '' : 's'}`
}

function formatRatingCandidateTitle(candidate: RatingBoardCandidate) {
  return `${candidate.boardLabel} ${candidate.displayRating}`
}

function formatRatingApplyLabel(candidate: RatingBoardCandidate) {
  if (candidate.applyKind === 'none') return 'Use no rating'
  if (candidate.ratingSystem === 'custom') return 'Use as custom rating'

  return `Use ${candidate.ratingSystem} ${candidate.ratingValue}`
}

function formatRatingMeta(candidate: RatingBoardCandidate) {
  const applyLabel = candidate.applyKind === 'custom'
    ? 'custom label'
    : candidate.applyKind === 'none'
      ? 'no badge value'
      : candidate.ratingSystem

  return `${candidate.sourceLabel} - ${candidate.confidence} confidence - ${applyLabel}`
}

function CandidateReasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null

  return <span className="metadata-candidate-reasons">{reasons.slice(0, 3).join(', ')}</span>
}

function RatingCandidateRow({
  candidate,
  handleApplyRatingCandidate,
}: {
  candidate: RatingBoardCandidate
  handleApplyRatingCandidate: (candidate: RatingBoardCandidate) => void
}) {
  return (
    <div className="metadata-candidate-row">
      <div className="metadata-candidate-details">
        <span className="metadata-candidate-title">{formatRatingCandidateTitle(candidate)}</span>
        <span className="metadata-candidate-meta">{formatRatingMeta(candidate)}</span>
        {candidate.descriptors.length > 0 && (
          <span className="metadata-candidate-meta">
            Descriptors: {candidate.descriptors.slice(0, 5).join(', ')}
          </span>
        )}
        <CandidateReasons reasons={candidate.reasons} />
      </div>

      {candidate.canApply ? (
        <button
          className="secondary-button metadata-candidate-action"
          type="button"
          onClick={() => handleApplyRatingCandidate(candidate)}
        >
          {formatRatingApplyLabel(candidate)}
        </button>
      ) : (
        <span className="metadata-candidate-meta">Informational only</span>
      )}
    </div>
  )
}

function LegalCandidateRow({
  candidate,
  handleApplyLegalCandidate,
  handleCopyLegalCandidate,
}: {
  candidate: LegalTextCandidate
  handleApplyLegalCandidate: (candidate: LegalTextCandidate) => void
  handleCopyLegalCandidate: (candidate: LegalTextCandidate) => void | Promise<void>
}) {
  return (
    <div className="metadata-candidate-row">
      <div className="metadata-candidate-details">
        <span className="metadata-candidate-title">
          {candidate.sourceLabel} legal snippet
        </span>
        <span className="metadata-candidate-meta">
          {candidate.confidence} confidence
        </span>
        <p className="metadata-legal-snippet">{candidate.text}</p>
        <CandidateReasons reasons={candidate.reasons} />
      </div>
      <div className="metadata-candidate-actions">
        <button
          className="secondary-button metadata-candidate-action"
          type="button"
          onClick={() => handleApplyLegalCandidate(candidate)}
        >
          Apply to legal text
        </button>
        <button
          className="secondary-button metadata-candidate-action"
          type="button"
          onClick={() => void handleCopyLegalCandidate(candidate)}
        >
          Copy text
        </button>
      </div>
    </div>
  )
}

export function MetadataAssistanceControls({
  metadataAssistance,
  canFindMetadataCandidates,
  handleFindMetadataCandidates,
  handleApplyRatingCandidate,
  handleApplyLegalCandidate,
  handleCopyLegalCandidate,
}: MetadataAssistanceControlsProps) {
  const hasSearched = Boolean(metadataAssistance.lastSearchedLabel)
  const supportedRatingCount = metadataAssistance.ratingCandidates.filter(
    (candidate) => candidate.ratingSystem === 'ESRB' || candidate.ratingSystem === 'PEGI',
  ).length
  const otherRatingCount = metadataAssistance.ratingCandidates.length - supportedRatingCount

  return (
    <div className="metadata-assistance">
      <button
        className="secondary-button"
        type="button"
        disabled={!canFindMetadataCandidates || metadataAssistance.isLoading}
        onClick={handleFindMetadataCandidates}
      >
        {metadataAssistance.isLoading ? 'Finding rating/legal candidates...' : 'Find rating/legal candidates'}
      </button>

      {!canFindMetadataCandidates && (
        <p className="hint">
          Import a Steam game or enter a numeric Steam App ID to search candidates. Manual fields remain available.
        </p>
      )}

      {metadataAssistance.error ? (
        <p className="hint metadata-assistance-error">{metadataAssistance.error}</p>
      ) : null}

      {metadataAssistance.sourceStatuses.length > 0 && (
        <div className="metadata-source-status-list">
          {metadataAssistance.sourceStatuses.map((status) => (
            <p className="hint metadata-source-status" key={`${status.source}-${status.label}-${status.status}`}>
              {formatSourceStatus(status)}
            </p>
          ))}
        </div>
      )}

      {metadataAssistance.ratingCandidates.length > 0 && (
        <div className="metadata-candidate-list">
          <span className="field-label">Rating candidates</span>
          {supportedRatingCount === 0 && otherRatingCount > 0 && (
            <p className="hint">
              No ESRB or PEGI rating was found. Other regional boards can be applied only as custom labels.
            </p>
          )}
          {metadataAssistance.ratingCandidates.map((candidate) => (
            <RatingCandidateRow
              candidate={candidate}
              handleApplyRatingCandidate={handleApplyRatingCandidate}
              key={candidate.id}
            />
          ))}
        </div>
      )}

      {hasSearched &&
        !metadataAssistance.isLoading &&
        metadataAssistance.ratingCandidates.length === 0 &&
        !metadataAssistance.error && (
          <p className="hint">
            No rating candidates were found. Leave rating as None, or choose ESRB, PEGI, or Custom manually if you have a verified value.
          </p>
        )}

      {metadataAssistance.legalCandidates.length > 0 && (
        <div className="metadata-candidate-list">
          <span className="field-label">Copyright/legal candidates</span>
          {metadataAssistance.legalCandidates.map((candidate) => (
            <LegalCandidateRow
              candidate={candidate}
              handleApplyLegalCandidate={handleApplyLegalCandidate}
              handleCopyLegalCandidate={handleCopyLegalCandidate}
              key={candidate.id}
            />
          ))}
        </div>
      )}

      {hasSearched &&
        !metadataAssistance.isLoading &&
        metadataAssistance.legalCandidates.length === 0 &&
        !metadataAssistance.error && (
          <p className="hint">
            No legal snippet was found. The copyright/legal text field below remains editable.
          </p>
        )}
    </div>
  )
}
