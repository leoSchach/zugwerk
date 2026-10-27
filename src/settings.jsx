import { createContext, useContext, useEffect, useState } from 'react';
import { SYNCED_KEYS, loadLocal, saveLocal } from './storage.js';

// Vorgefertigte Brettfarben: [helles Feld, dunkles Feld]
export const BOARD_THEMES = [
  { id: 'braun', name: 'Klassisch', light: '#f0d9b5', dark: '#b58863' },
  { id: 'gruen', name: 'Turnier', light: '#eeeed2', dark: '#769656' },
  { id: 'blau', name: 'Eis', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'lila', name: 'Lavendel', light: '#e8e0f0', dark: '#9b7fb8' },
  { id: 'grau', name: 'Stein', light: '#d9d9d9', dark: '#8a8a8a' },
  { id: 'koralle', name: 'Koralle', light: '#f5e1d6', dark: '#d2806a' },
  { id: 'nacht', name: 'Nacht', light: '#9aa5b1', dark: '#4b5563' },
  { id: 'mint', name: 'Minze', light: '#e6f2ea', dark: '#5fa883' },
];

export const DEFAULT_SETTINGS = {
  themeId: 'braun',
  customLight: '#f3e7d3',
  customDark: '#a26e4b',
  coordinates: true,
  animation: true,
  showDests: true,
  notation: 'de', // 'de' = S, L, T, D, K  |  'en' = N, B, R, Q, K
};

function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...loadLocal(SYNCED_KEYS.settings) };
}

export function boardColors(settings) {
  if (settings.themeId === 'eigene') {
    return { light: settings.customLight, dark: settings.customDark };
  }
  return BOARD_THEMES.find((t) => t.id === settings.themeId) ?? BOARD_THEMES[0];
}

// Baut das Schachbrettmuster als SVG-Bild für den CSS-Hintergrund
export function boardImage(light, dark) {
  let squares = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2) squares += `<rect x='${col}' y='${row}' width='1' height='1' fill='${dark}'/>`;
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' shape-rendering='crispEdges'><rect width='8' height='8' fill='${light}'/>${squares}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    saveLocal(SYNCED_KEYS.settings, settings);

    // Brettfarben als CSS-Variablen setzen, styles.css benutzt sie
    const { light, dark } = boardColors(settings);
    const root = document.documentElement.style;
    root.setProperty('--board-light', light);
    root.setProperty('--board-dark', dark);
    root.setProperty('--board-image', boardImage(light, dark));
  }, [settings]);

  function updateSettings(changes) {
    setSettings((old) => ({ ...old, ...changes }));
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
