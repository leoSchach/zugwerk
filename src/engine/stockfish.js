// Kleine Hülle um die Stockfish-Engine.
// Stockfish läuft als Web Worker und spricht das UCI-Protokoll:
// Wir schicken Text-Befehle ("position ...", "go ...") und bekommen
// Textzeilen zurück, z. B. "info depth 12 score cp 35 pv e2e4 ..." und "bestmove e2e4".

const ENGINE_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`;

// Liest eine "info"-Zeile: Bewertung und Hauptvariante einer Suchlinie
function parseInfo(line) {
  if (!line.startsWith('info ') || !line.includes(' pv ')) return null;
  if (line.includes('lowerbound') || line.includes('upperbound')) return null;
  const score = line.match(/ score (cp|mate) (-?\d+)/);
  if (!score) return null;
  return {
    multipv: Number(line.match(/ multipv (\d+)/)?.[1] ?? 1),
    depth: Number(line.match(/ depth (\d+)/)?.[1] ?? 0),
    // Bewertung aus Sicht der Seite, die am Zug ist
    cp: score[1] === 'cp' ? Number(score[2]) : null,
    mate: score[1] === 'mate' ? Number(score[2]) : null,
    pv: line.split(' pv ')[1].trim().split(' '),
  };
}

export function createEngine() {
  const worker = new Worker(ENGINE_URL);

  let pending = 0; // gestartete Suchen, für die noch kein "bestmove" kam
  let toIgnore = 0; // abgebrochene Suchen, deren "bestmove" wir verwerfen
  let current = null; // { resolve, lines } der laufenden Suche

  worker.onmessage = (event) => {
    const line = typeof event.data === 'string' ? event.data : '';

    const info = parseInfo(line);
    if (info && current && toIgnore === 0) {
      current.lines[info.multipv - 1] = info;
      return;
    }

    const match = line.match(/^bestmove (\S+)/);
    if (!match) return;

    pending--;
    if (toIgnore > 0) {
      toIgnore--;
      return;
    }
    const search = current;
    current = null;
    search?.resolve({ bestmove: match[1], lines: search.lines.filter(Boolean) });
  };

  worker.postMessage('uci');
  worker.postMessage('isready');

  function stop() {
    current = null;
    if (pending > toIgnore) {
      toIgnore = pending;
      worker.postMessage('stop');
    }
  }

  // Startet eine Suche. `limit` begrenzt sie, z. B. "depth 12" oder "movetime 500".
  function search(fen, limit) {
    stop();
    return new Promise((resolve) => {
      current = { resolve, lines: [] };
      pending++;
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go ${limit}`);
    });
  }

  return {
    // Stärke von 0 (sehr schwach) bis 20 (volle Stärke)
    setSkill(level) {
      worker.postMessage(`setoption name Skill Level value ${level}`);
    },

    // Wie viele Zugvarianten gleichzeitig bewertet werden
    setMultiPv(count) {
      worker.postMessage(`setoption name MultiPV value ${count}`);
    },

    newGame() {
      stop();
      worker.postMessage('ucinewgame');
    },

    // Liefert den besten Zug im UCI-Format, z. B. "e2e4" oder "e7e8q"
    async bestMove(fen, limit) {
      const result = await search(fen, limit);
      return result.bestmove;
    },

    // Liefert die besten Varianten mit Bewertung:
    // [{ cp, mate, pv: ["e2e4", ...] }, ...] – die beste zuerst
    async analyse(fen, limit) {
      const result = await search(fen, limit);
      return result.lines;
    },

    stop,

    terminate() {
      worker.terminate();
    },
  };
}
