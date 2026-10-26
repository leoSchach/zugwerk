import { useEffect, useState } from 'react';
import { THEME_FILTERS } from './themes.js';

// Puzzle-Fortschritt: Wertung, Serie und welche Puzzles schon gespielt wurden.
// Wird im Browser gespeichert (localStorage).
const STORAGE_KEY = 'zugwerk-puzzles';

const START_PROGRESS = {
  rating: 1000,
  solved: 0,
  failed: 0,
  streak: 0,
  bestStreak: 0,
  recent: [], // die letzten 20 Ergebnisse: { id, result }
  seen: [], // IDs gespielter Puzzles
};

function loadProgress() {
  try {
    return { ...START_PROGRESS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return START_PROGRESS;
  }
}

// Elo-Berechnung wie im Schach: Ein schweres Puzzle zu lösen bringt mehr Punkte.
// result: 'solved' (gelöst), 'hint' (mit Hinweis gelöst, zählt nicht), 'failed' (Fehler gemacht)
export function ratingChange(playerRating, puzzleRating, result, gamesPlayed) {
  if (result === 'hint') return 0;
  const k = gamesPlayed < 20 ? 40 : 20; // am Anfang schneller anpassen
  const expected = 1 / (1 + 10 ** ((puzzleRating - playerRating) / 400));
  const score = result === 'solved' ? 1 : 0;
  return Math.round(k * (score - expected));
}

export function usePuzzleProgress() {
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Speichern nicht möglich – Fortschritt gilt nur bis zum Neuladen
    }
  }, [progress]);

  // Speichert ein Ergebnis und gibt die Änderung der Wertung zurück
  function recordResult(puzzle, result) {
    const played = progress.solved + progress.failed;
    const delta = ratingChange(progress.rating, puzzle.rating, result, played);
    const success = result !== 'failed';
    const streak = success ? progress.streak + 1 : 0;

    setProgress({
      rating: progress.rating + delta,
      solved: progress.solved + (success ? 1 : 0),
      failed: progress.failed + (success ? 0 : 1),
      streak,
      bestStreak: Math.max(progress.bestStreak, streak),
      recent: [...progress.recent, { id: puzzle.id, result }].slice(-20),
      seen: [...progress.seen, puzzle.id].slice(-3000),
    });
    return delta;
  }

  function resetProgress() {
    setProgress(START_PROGRESS);
  }

  return { progress, recordResult, resetProgress };
}

// Sucht ein ungespieltes Puzzle, dessen Schwierigkeit zur Wertung passt
export function pickPuzzle(puzzles, progress, themeId, currentId) {
  const filter = THEME_FILTERS.find((f) => f.id === themeId);
  let pool = puzzles.filter((p) => p.id !== currentId);
  if (filter && filter.themes.length) {
    pool = pool.filter((p) => filter.themes.some((t) => p.themes.includes(t)));
  }

  const seen = new Set(progress.seen);
  const unseen = pool.filter((p) => !seen.has(p.id));
  if (unseen.length) pool = unseen;

  // Erst ±100 um die eigene Wertung suchen, dann den Bereich vergrößern
  for (let range = 100; range <= 3000; range += 100) {
    const candidates = pool.filter((p) => Math.abs(p.rating - progress.rating) <= range);
    if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
