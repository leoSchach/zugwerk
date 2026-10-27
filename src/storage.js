// Speichern im Browser (localStorage) – und, wenn jemand angemeldet ist,
// zusätzlich in der Cloud (Supabase). So bleibt die Seite auch ohne Konto nutzbar.

// Diese Einträge gehören zum Fortschritt und werden mit dem Konto synchronisiert
export const SYNCED_KEYS = {
  settings: 'zugwerk-einstellungen',
  puzzles: 'zugwerk-puzzles',
  openings: 'zugwerk-eroeffnungen',
  lessons: 'zugwerk-lektionen',
};

export function loadLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

let uploadListener = null;

export function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Speichern nicht möglich (z. B. privater Modus) – dann eben nur bis zum Neuladen
  }
  uploadListener?.();
}

// Wird von auth.jsx gesetzt, solange jemand angemeldet ist
export function onLocalSave(listener) {
  uploadListener = listener;
}

// Der gesamte Fortschritt als ein Objekt: { settings, puzzles, openings, lessons }
export function collectProgress() {
  return Object.fromEntries(
    Object.entries(SYNCED_KEYS).map(([name, key]) => [name, loadLocal(key)]),
  );
}

export function writeProgress(progress) {
  for (const [name, key] of Object.entries(SYNCED_KEYS)) {
    if (progress[name] != null) saveLocal(key, progress[name]);
  }
}

// Führt den Fortschritt aus dem Browser und aus der Cloud zusammen,
// damit beim ersten Anmelden auf einem neuen Gerät nichts verloren geht.
export function mergeProgress(local, cloud) {
  if (!cloud) return local;

  const played = (p) => (p ? p.solved + p.failed : -1);
  const puzzles = played(local.puzzles) > played(cloud.puzzles) ? local.puzzles : cloud.puzzles;

  const lessons = [...new Set([...(cloud.lessons ?? []), ...(local.lessons ?? [])])];

  const openings = { ...cloud.openings };
  for (const [id, mine] of Object.entries(local.openings ?? {})) {
    const theirs = openings[id] ?? { learned: false, runs: 0, perfect: 0 };
    openings[id] = {
      learned: mine.learned || theirs.learned,
      runs: Math.max(mine.runs, theirs.runs),
      perfect: Math.max(mine.perfect, theirs.perfect),
    };
  }

  return {
    settings: cloud.settings ?? local.settings,
    puzzles: puzzles ?? null,
    openings,
    lessons,
  };
}
