import { Check, Eye, Languages, Palette, RotateCcw } from 'lucide-react';
import Board from '../components/Board.jsx';
import { BOARD_THEMES, useSettings } from '../settings.jsx';

const PREVIEW_CONFIG = {
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  viewOnly: true,
  lastMove: ['b8', 'c6'],
};

// Kleines 4×4-Muster als Vorschau einer Brettfarbe
function ThemeSwatch({ light, dark }) {
  return (
    <span className="swatch">
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          style={{ background: (Math.floor(i / 4) + i) % 2 ? dark : light }}
        />
      ))}
    </span>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {description && <span className="muted small">{description}</span>}
      </span>
      <input
        type="checkbox"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Einstellungen</h1>
        <p>Änderungen werden sofort gespeichert.</p>
      </header>

      <div className="settings-layout">
        <div className="settings-main">
          <section className="card">
            <h2 className="card-title">
              <Palette size={20} /> Brettfarben
            </h2>
            <div className="theme-grid">
              {BOARD_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  className={`theme-option ${settings.themeId === theme.id ? 'selected' : ''}`}
                  onClick={() => updateSettings({ themeId: theme.id })}
                >
                  <ThemeSwatch light={theme.light} dark={theme.dark} />
                  <span>{theme.name}</span>
                  {settings.themeId === theme.id && <Check className="theme-check" size={16} />}
                </button>
              ))}
              <button
                className={`theme-option ${settings.themeId === 'eigene' ? 'selected' : ''}`}
                onClick={() => updateSettings({ themeId: 'eigene' })}
              >
                <ThemeSwatch light={settings.customLight} dark={settings.customDark} />
                <span>Eigene</span>
                {settings.themeId === 'eigene' && <Check className="theme-check" size={16} />}
              </button>
            </div>

            {settings.themeId === 'eigene' && (
              <div className="custom-colors">
                <label className="color-field">
                  <input
                    type="color"
                    value={settings.customLight}
                    onChange={(e) => updateSettings({ customLight: e.target.value })}
                  />
                  Helle Felder
                </label>
                <label className="color-field">
                  <input
                    type="color"
                    value={settings.customDark}
                    onChange={(e) => updateSettings({ customDark: e.target.value })}
                  />
                  Dunkle Felder
                </label>
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">
              <Eye size={20} /> Anzeige
            </h2>
            <Toggle
              label="Koordinaten"
              description="Buchstaben und Zahlen am Brettrand"
              checked={settings.coordinates}
              onChange={(coordinates) => updateSettings({ coordinates })}
            />
            <Toggle
              label="Animationen"
              description="Figuren gleiten beim Ziehen"
              checked={settings.animation}
              onChange={(animation) => updateSettings({ animation })}
            />
            <Toggle
              label="Mögliche Züge anzeigen"
              description="Punkte auf den Feldern, auf die eine Figur ziehen kann"
              checked={settings.showDests}
              onChange={(showDests) => updateSettings({ showDests })}
            />
          </section>

          <section className="card">
            <h2 className="card-title">
              <Languages size={20} /> Notation
            </h2>
            <div className="segmented">
              <button
                className={settings.notation === 'de' ? 'active' : ''}
                onClick={() => updateSettings({ notation: 'de' })}
              >
                Deutsch <code>Sf3</code>
              </button>
              <button
                className={settings.notation === 'en' ? 'active' : ''}
                onClick={() => updateSettings({ notation: 'en' })}
              >
                Englisch <code>Nf3</code>
              </button>
            </div>
          </section>

          <button className="btn" onClick={resetSettings}>
            <RotateCcw size={18} /> Auf Standard zurücksetzen
          </button>
        </div>

        <aside className="settings-preview">
          <p className="label">Vorschau</p>
          <Board config={PREVIEW_CONFIG} />
        </aside>
      </div>
    </div>
  );
}
