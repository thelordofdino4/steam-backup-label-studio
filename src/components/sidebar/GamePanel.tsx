import { getRatingMetadataForSystemChange, getRatingValuesForSystem } from '../../project/projectMetadata'
import type { GameRatingSystem, ProjectMetadata } from '../../project/projectTypes'
import type { SteamMetadataAssistanceState } from '../../hooks/useSteamMetadataAssistance'
import type { SteamImportedGame, SteamSearchResult } from '../../steam/steamApi'
import type { LegalTextCandidate, RatingBoardCandidate } from '../../steam/steamMetadataCandidates'
import { MetadataAssistanceControls } from './MetadataAssistanceControls'

export type GamePanelProps = {
  manualGameTitle: string
  setManualGameTitle: (value: string) => void
  projectMetadata: ProjectMetadata
  handleProjectMetadataChange: (field: keyof ProjectMetadata, value: string) => void
  handleProjectMetadataFieldsChange: (fields: Partial<ProjectMetadata>) => void
  gameSearchQuery: string
  setGameSearchQuery: (value: string) => void
  handleSteamSearch: () => void | Promise<void>
  steamSearchResults: SteamSearchResult[]
  handleSteamImport: (appId: number) => void | Promise<void>
  selectedSteamGame: SteamImportedGame | null
  isSteamSearchLoading: boolean
  isSteamImportLoading: boolean
  metadataAssistance: SteamMetadataAssistanceState
  canFindMetadataCandidates: boolean
  handleFindMetadataCandidates: () => void | Promise<void>
  handleApplyRatingCandidate: (candidate: RatingBoardCandidate) => void
  handleApplyLegalCandidate: (candidate: LegalTextCandidate) => void
  handleCopyLegalCandidate: (candidate: LegalTextCandidate) => void | Promise<void>
}

export function GamePanel({
  manualGameTitle,
  setManualGameTitle,
  projectMetadata,
  handleProjectMetadataChange,
  handleProjectMetadataFieldsChange,
  gameSearchQuery,
  setGameSearchQuery,
  handleSteamSearch,
  steamSearchResults,
  handleSteamImport,
  selectedSteamGame,
  isSteamSearchLoading,
  isSteamImportLoading,
  metadataAssistance,
  canFindMetadataCandidates,
  handleFindMetadataCandidates,
  handleApplyRatingCandidate,
  handleApplyLegalCandidate,
  handleCopyLegalCandidate,
}: GamePanelProps) {
  const getSuggestedRatingForSystem = (system: GameRatingSystem) =>
    metadataAssistance.ratingCandidates.find(
      (candidate) =>
        candidate.canApply &&
        candidate.applyKind === 'rating' &&
        candidate.ratingSystem === system,
    )

  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Game</summary>
      <div className="panel-content">
      <label className="field-label spacing-top" htmlFor="game-search">
        Steam search
      </label>
      <p className="hint">
        Selecting a Steam game imports available Steam metadata and artwork where possible. Imported details may still need manual review.
      </p>
      <input
        id="game-search"
        type="search"
        placeholder="Search by title or App ID"
        value={gameSearchQuery}
        onChange={(event) => setGameSearchQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            void handleSteamSearch()
          }
        }}
      />
      <button
        className="secondary-button"
        type="button"
        disabled={isSteamSearchLoading}
        onClick={handleSteamSearch}
      >
        {isSteamSearchLoading ? 'Searching...' : 'Search Steam'}
      </button>

      <div className="search-results">
        {steamSearchResults.map((game) => (
          <button
            className="search-result-button"
            key={game.appId}
            type="button"
            disabled={isSteamImportLoading}
            onClick={() => handleSteamImport(game.appId)}
          >
            <strong>{game.title}</strong>
            <span>
              App ID {game.appId}
              {game.price ? ` · ${game.price}` : ''}
            </span>
          </button>
        ))}
      </div>

      {selectedSteamGame && (
        <div className="selected-game-card">
          <h3>{selectedSteamGame.title}</h3>
          {selectedSteamGame.shortDescription && (
            <p>{selectedSteamGame.shortDescription}</p>
          )}
          <dl className="template-metrics">
            <div>
              <dt>App ID</dt>
              <dd>{selectedSteamGame.appId}</dd>
            </div>
            <div>
              <dt>Developer</dt>
              <dd>{selectedSteamGame.developer.join(', ') || 'Unknown'}</dd>
            </div>
            <div>
              <dt>Publisher</dt>
              <dd>{selectedSteamGame.publisher.join(', ') || 'Unknown'}</dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>{selectedSteamGame.releaseDate ?? 'Unknown'}</dd>
            </div>
          </dl>

          {selectedSteamGame.artwork.length > 0 && (
            <p className="hint">
              Imported Steam artwork is available in the Artwork panel.
            </p>
          )}

        </div>
      )}


      <details className="metadata-details spacing-top">
        <summary className="panel-summary">Additional metadata</summary>
        <div className="panel-content">
      <label className="field-label" htmlFor="game-title">
        Label title
      </label>
      <input
        id="game-title"
        type="text"
        value={manualGameTitle}
        onChange={(event) => {
          setManualGameTitle(event.target.value)
          handleProjectMetadataChange('title', event.target.value)
        }}
      />

      <label className="field-label spacing-top" htmlFor="game-subtitle">
        Subtitle / edition
      </label>
      <input
        id="game-subtitle"
        type="text"
        value={projectMetadata.subtitle}
        onChange={(event) => handleProjectMetadataChange('subtitle', event.target.value)}
      />

      <label className="field-label spacing-top" htmlFor="game-metadata-app-id">
        Steam App ID
      </label>
      <input
        id="game-metadata-app-id"
        type="text"
        value={projectMetadata.steamAppId}
        onChange={(event) => handleProjectMetadataChange('steamAppId', event.target.value)}
      />

      <label className="field-label spacing-top" htmlFor="game-metadata-developer">
        Developer
      </label>
      <input
        id="game-metadata-developer"
        type="text"
        value={projectMetadata.developer}
        onChange={(event) => handleProjectMetadataChange('developer', event.target.value)}
      />

      <label className="field-label spacing-top" htmlFor="game-metadata-publisher">
        Publisher
      </label>
      <input
        id="game-metadata-publisher"
        type="text"
        value={projectMetadata.publisher}
        onChange={(event) => handleProjectMetadataChange('publisher', event.target.value)}
      />

      <label className="field-label spacing-top" htmlFor="game-metadata-release-date">
        Release date
      </label>
      <input
        id="game-metadata-release-date"
        type="text"
        value={projectMetadata.releaseDate}
        onChange={(event) => handleProjectMetadataChange('releaseDate', event.target.value)}
      />

      <label className="field-label spacing-top" htmlFor="game-metadata-backup-date">
        Backup date
      </label>
      <input
        id="game-metadata-backup-date"
        type="date"
        value={projectMetadata.backupDate}
        onChange={(event) => handleProjectMetadataChange('backupDate', event.target.value)}
      />

      <label className="field-label spacing-top" htmlFor="game-metadata-disc-number">
        Disc number
      </label>
      <div className="metadata-disc-row">
        <input
          id="game-metadata-disc-number"
          type="text"
          value={projectMetadata.discNumber}
          onChange={(event) => handleProjectMetadataChange('discNumber', event.target.value)}
          placeholder="1"
        />
        <span className="metadata-disc-separator">of</span>
        <input
          aria-label="Disc total"
          type="text"
          value={projectMetadata.discTotal}
          onChange={(event) => handleProjectMetadataChange('discTotal', event.target.value)}
          placeholder="1"
        />
      </div>

      <label className="field-label spacing-top" htmlFor="game-metadata-rating-system">
        Rating system
      </label>
      <select
        id="game-metadata-rating-system"
        value={projectMetadata.ratingSystem}
        onChange={(event) => {
          const nextSystem = event.target.value as GameRatingSystem
          const suggestedRating = getSuggestedRatingForSystem(nextSystem)

          if (suggestedRating) {
            handleApplyRatingCandidate(suggestedRating)
            return
          }

          const nextMetadata = getRatingMetadataForSystemChange(projectMetadata, nextSystem)

          handleProjectMetadataFieldsChange(nextMetadata)
        }}
      >
        <option value="none">None</option>
        <option value="ESRB">ESRB</option>
        <option value="PEGI">PEGI</option>
        <option value="custom">Custom</option>
      </select>
      {projectMetadata.ratingSystem === 'none' && (
        <p className="hint">
          None is valid for unrated labels. Rating badge artwork will not render until a rating system and value are selected.
        </p>
      )}

      {projectMetadata.ratingSystem !== 'none' && (
        <>
          <label className="field-label spacing-top" htmlFor="game-metadata-rating-value">
            Rating value
          </label>

          {projectMetadata.ratingSystem === 'custom' ? (
            <input
              id="game-metadata-rating-value"
              type="text"
              value={projectMetadata.ratingValue}
              onChange={(event) =>
                handleProjectMetadataChange('ratingValue', event.target.value)
              }
              placeholder="Custom rating label..."
            />
          ) : (
            <select
              id="game-metadata-rating-value"
              value={projectMetadata.ratingValue}
              onChange={(event) =>
                handleProjectMetadataChange('ratingValue', event.target.value)
              }
            >
              {getRatingValuesForSystem(projectMetadata.ratingSystem).map((value) => (
                <option key={value} value={value}>
                  {projectMetadata.ratingSystem === 'PEGI' ? `PEGI ${value}` : value}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      <div className="spacing-top">
        <MetadataAssistanceControls
          metadataAssistance={metadataAssistance}
          canFindMetadataCandidates={canFindMetadataCandidates}
          handleFindMetadataCandidates={handleFindMetadataCandidates}
          handleApplyRatingCandidate={handleApplyRatingCandidate}
          handleApplyLegalCandidate={handleApplyLegalCandidate}
          handleCopyLegalCandidate={handleCopyLegalCandidate}
        />
      </div>

      <label className="field-label spacing-top" htmlFor="game-metadata-install-notes">
        Install notes
      </label>
      <textarea
        id="game-metadata-install-notes"
        value={projectMetadata.installNotes}
        onChange={(event) => handleProjectMetadataChange('installNotes', event.target.value)}
        rows={3}
      />

      <label className="field-label spacing-top" htmlFor="game-metadata-copyright">
        Copyright / legal text
      </label>
      <textarea
        id="game-metadata-copyright"
        value={projectMetadata.copyrightText}
        onChange={(event) => handleProjectMetadataChange('copyrightText', event.target.value)}
        rows={3}
      />


          <p className="hint">
            Rating and legal candidates are suggestions only. Keep or edit manual values when Steam data is missing or uncertain.
          </p>
        </div>
      </details>

      </div>
    </details>
  )
}
