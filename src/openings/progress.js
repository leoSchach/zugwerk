import { useEffect, useState } from 'react';

// Fortschritt im Eröffnungstrainer, im Browser gespeichert:
// { [id]: { learned: true/false, runs: Anzahl Übungsdurchläufe, perfect: davon fehlerfrei } }
const STORAGE_KEY = 'zugwerk-eroeffnungen';

// Ab so vielen fehlerfreien Durchläufen gilt eine Eröffnung als gemeistert
export const MASTERY_RUNS = 3;

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function useOpeningProgress() {
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Speichern nicht möglich – egal
    }
  }, [progress]);

  function update(id, changes) {
    setProgress((old) => {
      const current = { learned: false, runs: 0, perfect: 0, ...old[id] };
      return { ...old, [id]: { ...current, ...changes(current) } };
    });
  }

  return {
    progressFor: (id) => ({ learned: false, runs: 0, perfect: 0, ...progress[id] }),
    markLearned: (id) => update(id, () => ({ learned: true })),
    recordRun: (id, perfect) =>
      update(id, (p) => ({ runs: p.runs + 1, perfect: p.perfect + (perfect ? 1 : 0) })),
  };
}
