from pathlib import Path
import json

app = Path("src/App.tsx")
text = app.read_text(encoding="utf-8")

text = text.replace(
    "import { mockSteamGames, type MockSteamGame } from './steam/mockSteamGames'\n",
    "",
)

text = text.replace(
    "    selectedMockGame: MockSteamGame | null\n",
    "",
)

text = text.replace(
    "  const [selectedMockGame, setSelectedMockGame] = useState<MockSteamGame | null>(null)\n",
    "",
)

if "  const filteredMockGames = useMemo(() => {" in text:
    start = text.index("  const filteredMockGames = useMemo(() => {")
    end = text.index("\n\n  const backgroundPreviewSize", start)
    text = text[:start] + text[end + 2:]

text = text.replace(
    "        selectedMockGame,\n",
    "",
)

if "  function handleSelectMockGame" in text:
    start = text.index("  function handleSelectMockGame")
    end = text.index("\n\n  async function handleSteamSearch", start)
    text = text[:start] + text[end + 2:]

text = text.replace("    setSelectedMockGame(null)\n", "")
text = text.replace("      setSelectedMockGame(project.game?.selectedMockGame ?? null)\n", "")

text = text.replace(
    '<p className="muted">Issue #11: Physical print geometry</p>',
    '<p className="muted">Pre-alpha disc label editor</p>',
)

if '          <details className="mock-search-details">' in text:
    start = text.index('          <details className="mock-search-details">')
    end = text.index("\n\n          {selectedSteamGame && (", start)
    text = text[:start] + text[end + 2:]

if "          {selectedMockGame && !selectedSteamGame && (" in text:
    start = text.index("          {selectedMockGame && !selectedSteamGame && (")
    end = text.index("\n          </div>\n        </details>", start)
    text = text[:start] + text[end:]

old_legend = """          <ul>
            <li>Outer disc edge</li>
            <li>Outer print boundary</li>
            <li>Inner print boundary</li>
            <li>Physical center hole</li>
            <li>No-print hub ring</li>
            <li>Safe zone</li>
            <li>Steam Backup logo zone</li>
            <li>Background image layer</li>
          </ul>"""

new_legend = """          <div className="guide-legend" aria-label="Disc guide legend">
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-outer" aria-hidden="true" />
              <div>
                <strong>Outer cut edge</strong>
                <p>The physical outside edge of the disc.</p>
              </div>
            </div>
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-print" aria-hidden="true" />
              <div>
                <strong>Printable area</strong>
                <p>The usable printed region between the inner and outer print boundaries.</p>
              </div>
            </div>
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-hub" aria-hidden="true" />
              <div>
                <strong>No-print hub</strong>
                <p>The striped center region between the physical hole and printable boundary.</p>
              </div>
            </div>
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-hole" aria-hidden="true" />
              <div>
                <strong>Physical center hole</strong>
                <p>The actual cut-out center hole that is blanked during export.</p>
              </div>
            </div>
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-safe" aria-hidden="true" />
              <div>
                <strong>Safe zone</strong>
                <p>An advisory boundary for keeping important text and logos away from edge drift.</p>
              </div>
            </div>
          </div>"""

if old_legend not in text:
    raise SystemExit("Guide legend block was not found.")
text = text.replace(old_legend, new_legend)

app.write_text(text, encoding="utf-8")

css = Path("src/App.css")
css_text = css.read_text(encoding="utf-8")

if ".panel-summary::after {" in css_text:
    start = css_text.index(".panel-summary::after {")
    end = css_text.index("\n\n.panel-content {", start)
    replacement = """.panel-summary::after {
  content: "";
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border-left: 3px solid #f97316;
  border-bottom: 3px solid #f97316;
  border-radius: 0 0 0 6px;
  opacity: 0.9;
  transform: rotate(-45deg);
  transition:
    transform 140ms ease,
    opacity 140ms ease;
}

.collapsible-panel[open] > .panel-summary::after {
  transform: rotate(45deg);
  opacity: 1;
}"""
    css_text = css_text[:start] + replacement + css_text[end:]

if ".guide-legend {" not in css_text:
    css_text += """

.guide-legend {
  display: grid;
  gap: 12px;
  margin-top: 4px;
}

.guide-legend-item {
  display: grid;
  grid-template-columns: 30px 1fr;
  align-items: start;
  gap: 10px;
}

.guide-legend-item strong {
  display: block;
  color: #f9fafb;
  font-size: 13px;
  line-height: 1.2;
}

.guide-legend-item p {
  margin-top: 3px;
  color: #9ca3af;
  font-size: 12px;
  line-height: 1.35;
}

.guide-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.85);
}

.guide-swatch-outer {
  border: 2px dashed rgba(239, 68, 68, 0.95);
}

.guide-swatch-print {
  border: 2px dotted rgba(34, 197, 94, 0.95);
}

.guide-swatch-hub {
  border: 2px dotted rgba(34, 197, 94, 0.95);
  background:
    repeating-linear-gradient(
      45deg,
      rgba(17, 24, 39, 0.7) 0,
      rgba(17, 24, 39, 0.7) 4px,
      rgba(107, 114, 128, 0.7) 4px,
      rgba(107, 114, 128, 0.7) 8px
    );
}

.guide-swatch-hole {
  border: 2px solid rgba(17, 24, 39, 0.95);
  background: #20242d;
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.6);
}

.guide-swatch-safe {
  border: 2px dashed rgba(37, 99, 235, 0.95);
}
"""

css.write_text(css_text, encoding="utf-8")

for filename in ["package.json", "package-lock.json"]:
    path = Path(filename)
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        if "version" in data:
            data["version"] = "0.1.0"
        if filename == "package-lock.json":
            packages = data.get("packages", {})
            if "" in packages and isinstance(packages[""], dict):
                packages[""]["version"] = "0.1.0"
        path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")