import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Flag, RotateCcw, Shuffle, Undo2, Users } from 'lucide-react';
import Board from '../components/Board.jsx';
import Avatar from '../components/Avatar.jsx';
import { needsPromotion, usePromotion } from '../components/Promotion.jsx';
import MoveList from '../components/MoveList.jsx';
import { BOTS } from '../bots.js';
import { createEngine } from '../engine/stockfish.js';
import GameReview from '../components/GameReview.jsx';
import GameOverOverlay from '../components/GameOverOverlay.jsx';
import ResultBanner from '../components/ResultBanner.jsx';
import { findOpening, useOpeningBook } from '../openings/book.js';
import { MODES, TIME_CONTROLS, formatClock } from '../online/games.js';
import { useChessGame } from '../hooks/useChessGame.js';
import { colorName, gameOverText, legalDests } from '../chess-utils.js';

const COLOR_CHOICES = [
  { id: 'white', label: 'Weiß', piece: '♔' },
  { id: 'random', label: 'Zufall', icon: Shuffle },
  { id: 'black', label: 'Schwarz', piece: '♚' },
];

// Bedenkzeiten für Bot-Partien (ohne Wertung)
const BOT_TIMES = ['none', '1+0', '3+2', '5+0', '10+0', '15+10'].map((id) => TIME_CONTROLS.find((t) => t.id === id));

export default function PlayBots() {
  const [botId, setBotId] = useState('sam');
  const [colorChoice, setColorChoice] = useState('white');
  const [timeId, setTimeId] = useState('none');
  const [match, setMatch] = useState(null);

  const bot = BOTS.find((b) => b.id === botId);

  function startMatch() {
    const playerColor =
      colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : colorChoice;
    const timeControl = TIME_CONTROLS.find((t) => t.id === timeId);
    setMatch({ id: Date.now(), bot, playerColor, timeControl: timeControl.initial ? timeControl : null });
  }

  if (match) {
    return (
      <BotGame
        key={match.id}
        bot={match.bot}
        playerColor={match.playerColor}
        timeControl={match.timeControl}
        onRematch={() => setMatch({ ...match, id: Date.now() })}
        onExit={() => setMatch(null)}
      />
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Gegen Bots spielen</h1>
        <p>Wähle einen Gegner, der zu deiner Spielstärke passt.</p>
      </header>

      <a className="card friends-banner" href="#/freunde">
        <Users size={22} />
        <span>
          <strong>Lieber gegen echte Menschen?</strong>
          <span className="muted small">Erstelle eine Partie und schick deinem Freund den Link.</span>
        </span>
        <ChevronRight size={20} />
      </a>

      <div className="select-layout">
        <div className="bot-grid">
          {BOTS.map((b) => (
            <button
              key={b.id}
              className={`bot-card ${b.id === botId ? 'selected' : ''}`}
              onClick={() => setBotId(b.id)}
            >
              <Avatar piece={b.piece} color={b.color} size={52} />
              <span className="bot-name">{b.name}</span>
              <span className="bot-elo">ca. {b.elo}</span>
            </button>
          ))}
        </div>

        <aside className="card setup-card">
          <Avatar piece={bot.piece} color={bot.color} size={88} />
          <h2>{bot.name}</h2>
          <p className="bot-elo">Elo ca. {bot.elo}</p>
          <p className="muted">{bot.description}</p>
          <div className="speech">{bot.greeting}</div>

          <p className="label">Ich spiele mit</p>
          <div className="segmented">
            {COLOR_CHOICES.map((c) => (
              <button
                key={c.id}
                className={colorChoice === c.id ? 'active' : ''}
                onClick={() => setColorChoice(c.id)}
              >
                {c.piece ? <span className="seg-piece">{c.piece}</span> : <c.icon size={18} />}
                {c.label}
              </button>
            ))}
          </div>

          <p className="label">Bedenkzeit</p>
          <div className="time-grid">
            {BOT_TIMES.map((t) => (
              <button
                key={t.id}
                className={`time-option ${timeId === t.id ? 'active' : ''}`}
                onClick={() => setTimeId(t.id)}
              >
                {t.mode ? `${MODES[t.mode].emoji} ${t.label}` : t.label}
              </button>
            ))}
          </div>

          <button className="btn btn-primary btn-large" onClick={startMatch}>
            Spielen
          </button>
        </aside>
      </div>
    </div>
  );
}

// Wählt den Zug des Bots: manchmal zufällig, sonst von Stockfish
async function chooseBotMove(bot, game, engine) {
  const start = Date.now();
  let move;
  if (Math.random() < bot.randomness) {
    const moves = game.moves({ verbose: true });
    const m = moves[Math.floor(Math.random() * moves.length)];
    move = { from: m.from, to: m.to, promotion: m.promotion };
  } else {
    const uci = await engine.bestMove(game.fen(), bot.limit);
    move = { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
  }
  // Kurze Mindest-Denkzeit, damit der Bot nicht unnatürlich schnell zieht
  const wait = 450 - (Date.now() - start);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  return move;
}

// Ergebnis aus deiner Sicht: outcome, Überschrift und Erklärung
function resultFor(game, playerColor, resigned, timedOut, bot) {
  if (resigned) return { outcome: 'loss', title: 'Verloren', subtitle: 'Du hast aufgegeben.' };
  if (timedOut) {
    return timedOut === playerColor[0]
      ? { outcome: 'loss', title: 'Verloren', subtitle: 'Deine Zeit ist abgelaufen.' }
      : { outcome: 'win', title: 'Du hast gewonnen!', subtitle: `${bot.name} hat keine Zeit mehr.` };
  }
  if (game.isCheckmate()) {
    return game.turn() === playerColor[0]
      ? { outcome: 'loss', title: 'Verloren', subtitle: `${bot.name} hat dich mattgesetzt.` }
      : { outcome: 'win', title: 'Du hast gewonnen!', subtitle: `Schachmatt gegen ${bot.name}` };
  }
  const draw = gameOverText(game);
  return draw ? { outcome: 'draw', title: 'Remis', subtitle: draw } : null;
}

const BOT_REACTIONS = {
  win: 'Gut gespielt! Das hast du dir verdient.',
  loss: 'Danke für die Partie! Revanche?',
  draw: 'Unentschieden – wir sind wohl gleich stark.',
};

// Schachuhr für Bot-Partien. Läuft nur im Browser und startet, wenn beide einmal gezogen haben.
// Gibt die Restzeiten { w, b } in Millisekunden zurück, oder null ohne Uhr.
function useChessClock(timeControl, ply, stopped) {
  const [clock, setClock] = useState(() =>
    timeControl ? { w: timeControl.initial * 1000, b: timeControl.initial * 1000, since: null } : null,
  );
  const [now, setNow] = useState(() => Date.now());

  // Nach jedem Zug: verbrauchte Zeit abziehen, Zuschlag gutschreiben, Uhr des Gegners starten
  useEffect(() => {
    if (!timeControl || ply === 0) return;
    setClock((c) => {
      const mover = ply % 2 === 1 ? 'w' : 'b';
      const ms = c.since ? c[mover] - (Date.now() - c.since) + timeControl.increment * 1000 : c[mover];
      return { ...c, [mover]: ms, since: ply >= 2 ? Date.now() : null };
    });
  }, [ply]);

  useEffect(() => {
    if (!timeControl || stopped) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [timeControl, stopped]);

  if (!clock) return null;
  const toMove = ply % 2 === 0 ? 'w' : 'b';
  const remaining = (color) => clock[color] - (color === toMove && clock.since ? now - clock.since : 0);
  return { w: remaining('w'), b: remaining('b') };
}

function BotGame({ bot, playerColor, timeControl, onRematch, onExit }) {
  const { game, fen, history, lastMove, move, undo } = useChessGame();
  const [thinking, setThinking] = useState(false);
  const [resigned, setResigned] = useState(false);
  const [timedOut, setTimedOut] = useState(null); // 'w' oder 'b', wessen Zeit abgelaufen ist
  const clocks = useChessClock(timeControl, history.length, resigned || timedOut || game.isGameOver());
  const engineRef = useRef(null);
  const promotion = usePromotion(playerColor);

  useEffect(() => {
    const engine = createEngine();
    engine.setSkill(bot.skill);
    engine.newGame();
    engineRef.current = engine;
    return () => engine.terminate();
  }, [bot]);

  const book = useOpeningBook();
  const opening = useMemo(() => findOpening(book, game.history({ verbose: true })), [book, fen]);
  const result = resultFor(game, playerColor, resigned, timedOut, bot);

  // Zeit abgelaufen?
  const toMove = game.turn();
  useEffect(() => {
    if (clocks && !result && clocks[toMove] <= 0) setTimedOut(toMove);
  });
  const botTurn = !result && game.turn() !== playerColor[0];

  // Wenn der Bot am Zug ist: Zug berechnen und ausführen
  useEffect(() => {
    if (!botTurn) return;
    let cancelled = false;
    setThinking(true);
    chooseBotMove(bot, game, engineRef.current).then((botMove) => {
      if (cancelled) return;
      setThinking(false);
      move(botMove);
    });
    return () => {
      cancelled = true;
      engineRef.current.stop();
      setThinking(false);
    };
  }, [fen, botTurn]);

  async function handlePlayerMove(from, to) {
    const piece = needsPromotion(game, from, to) ? await promotion.ask(to, playerColor) : undefined;
    move({ from, to, promotion: piece });
  }

  function takeBack() {
    // So weit zurück, bis wieder du am Zug bist
    undo();
    if (game.turn() !== playerColor[0]) undo();
  }

  const myTurn = !result && !thinking && game.turn() === playerColor[0];

  const boardConfig = useMemo(
    () => ({
      fen,
      orientation: playerColor,
      turnColor: colorName(game.turn()),
      lastMove,
      check: game.inCheck(),
      movable: {
        color: myTurn ? playerColor : undefined,
        dests: myTurn ? legalDests(game) : new Map(),
      },
    }),
    [fen, playerColor, myTurn],
  );

  return (
    <div className="page game-page">
      <div className="game-layout">
        <div className="board-column">
          <div className="player-bar">
            <Avatar piece={bot.piece} color={bot.color} size={36} />
            <span className="player-name">{bot.name}</span>
            <span className="player-elo">({bot.elo})</span>
            {thinking && <span className="thinking-dots" aria-label="denkt nach" />}
            {clocks && <BotClock ms={clocks[playerColor === 'white' ? 'b' : 'w']} running={!result && toMove !== playerColor[0]} />}
          </div>
          <Board
            config={boardConfig}
            onMove={handlePlayerMove}
            overlay={
              promotion.dialog ??
              (result && (
                <GameOverOverlay outcome={result.outcome} title={result.title} subtitle={result.subtitle}>
                  <button className="btn btn-primary" onClick={onRematch}>
                    <RotateCcw size={18} /> Revanche
                  </button>
                </GameOverOverlay>
              ))
            }
          />
          <div className="player-bar">
            <Avatar piece={playerColor === 'white' ? '♙' : '♟'} color="#5c5a57" size={36} />
            <span className="player-name">Du</span>
            {clocks && <BotClock ms={clocks[playerColor[0]]} running={!result && toMove === playerColor[0]} />}
          </div>
        </div>

        <aside className="card game-panel">
          <div className="speech">{result ? BOT_REACTIONS[result.outcome] : bot.greeting}</div>

          {result ? (
            <ResultBanner outcome={result.outcome} title={result.title} subtitle={result.subtitle} />
          ) : (
            <p className="status">
              {game.inCheck() && 'Schach! '}
              {myTurn ? 'Du bist am Zug.' : `${bot.name} denkt nach …`}
            </p>
          )}

          {opening && (
            <p className="opening-name">
              {opening.eco} · {opening.name}
            </p>
          )}
          <MoveList history={history} />

          {result && history.length > 0 && (
            <GameReview
              game={game}
              white={playerColor === 'white' ? 'Du' : bot.name}
              black={playerColor === 'white' ? bot.name : 'Du'}
              me={playerColor[0]}
              result={
                result.outcome === 'draw'
                  ? '1/2-1/2'
                  : (result.outcome === 'win') === (playerColor === 'white')
                    ? '1-0'
                    : '0-1'
              }
            />
          )}

          <div className="panel-actions">
            {result ? (
              <>
                <button className="btn btn-primary" onClick={onRematch}>
                  <RotateCcw size={18} /> Revanche
                </button>
                <button className="btn" onClick={onExit}>
                  <Users size={18} /> Anderer Bot
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn"
                  onClick={takeBack}
                  disabled={history.length === 0 || Boolean(timeControl)}
                  title={timeControl ? 'Mit Uhr kann man keine Züge zurücknehmen' : undefined}
                >
                  <Undo2 size={18} /> Zurücknehmen
                </button>
                <button className="btn btn-danger" onClick={() => setResigned(true)}>
                  <Flag size={18} /> Aufgeben
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function BotClock({ ms, running }) {
  return <span className={`clock ${running ? 'running' : ''} ${ms < 20000 ? 'low' : ''}`}>{formatClock(ms)}</span>;
}
