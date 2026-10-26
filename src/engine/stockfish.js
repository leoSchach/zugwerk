// Kleine Hülle um die Stockfish-Engine.
// Stockfish läuft als Web Worker und spricht das UCI-Protokoll:
// Wir schicken Text-Befehle ("position ...", "go ...") und bekommen
// Textzeilen zurück, z. B. "bestmove e2e4".

const ENGINE_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`;

export function createEngine() {
  const worker = new Worker(ENGINE_URL);

  let pending = 0; // gestartete Suchen, für die noch kein "bestmove" kam
  let toIgnore = 0; // abgebrochene Suchen, deren "bestmove" wir verwerfen
  let resolveBest = null;

  worker.onmessage = (event) => {
    const line = typeof event.data === 'string' ? event.data : '';
    const match = line.match(/^bestmove (\S+)/);
    if (!match) return;

    pending--;
    if (toIgnore > 0) {
      toIgnore--;
      return;
    }
    const resolve = resolveBest;
    resolveBest = null;
    resolve?.(match[1]);
  };

  worker.postMessage('uci');
  worker.postMessage('isready');

  function stop() {
    resolveBest = null;
    if (pending > toIgnore) {
      toIgnore = pending;
      worker.postMessage('stop');
    }
  }

  return {
    // Stärke von 0 (sehr schwach) bis 20 (volle Stärke)
    setSkill(level) {
      worker.postMessage(`setoption name Skill Level value ${level}`);
    },

    // Liefert den besten Zug im UCI-Format, z. B. "e2e4" oder "e7e8q"
    bestMove(fen, movetimeMs) {
      stop();
      return new Promise((resolve) => {
        resolveBest = resolve;
        pending++;
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go movetime ${movetimeMs}`);
      });
    },

    stop,

    terminate() {
      worker.terminate();
    },
  };
}
