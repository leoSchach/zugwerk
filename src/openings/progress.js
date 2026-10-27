import { useEffect, useState } from 'react';
import { SYNCED_KEYS, loadLocal, saveLocal } from '../storage.js';

// Fortschritt im Eröffnungstrainer (im Browser gespeichert und mit dem Konto synchronisiert):
// { [id]: { learned: true/false, runs: Anzahl Übungsdurchläufe, perfect: davon fehlerfrei } }

// Ab so vielen fehlerfreien Durchläufen gilt eine Eröffnung als gemeistert
export const MASTERY_RUNS = 3;

function loadProgress() {
  return loadLocal(SYNCED_KEYS.openings) ?? {};
}

export function useOpeningProgress() {
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    saveLocal(SYNCED_KEYS.openings, progress);
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
