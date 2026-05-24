import type { SteamImportedGame, SteamSearchResult } from '../../steam/steamApi'

export type GamePanelProps = {
  manualGameTitle: string
  setManualGameTitle: (value: string) => void
  gameSearchQuery: string
  setGameSearchQuery: (value: string) => void
  handleSteamSearch: () => void | Promise<void>
  steamSearchResults: SteamSearchResult[]
  handleSteamImport: (appId: number) => void | Promise<void>
  selectedSteamGame: SteamImportedGame | null
  isSteamSearchLoading: boolean
  isSteamImportLoading: boolean
}

export function GamePanel({
  manualGameTitle,
  setManualGameTitle,
  gameSearchQuery,
  setGameSearchQuery,
  handleSteamSearch,
  steamSearchResults,
  handleSteamImport,
  selectedSteamGame,
  isSteamSearchLoading,
  isSteamImportLoading,
}: GamePanelProps) {
  return (
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Game</summary>
      <div className="panel-content">
      <label className="field-label" htmlFor="game-title">
        Label title
      </label>
      <input
        id="game-title"
        type="text"
        value={manualGameTitle}
        onChange={(event) => setManualGameTitle(event.target.value)}
      />

      <label className="field-label spacing-top" htmlFor="game-search">
        Steam search
      </label>
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

      </div>
    </details>
  )
}
