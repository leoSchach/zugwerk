import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartLine, Flag, RotateCcw, Shuffle, Undo2, Users } from 'lucide-react';
import Board from '../components/Board.jsx';
import Avatar from '../components/Avatar.jsx';
import { needsPromotion, usePromotion } from '../components/Promotion.jsx';
import MoveList from '../components/MoveList.jsx';
import { BOTS } from '../bots.js';
import { createEngine } from '../engine/stockfish.js';
import { openInAnalysis } from '../analysis/analyseGame.js';
import { findOpening, useOpeningBook } from '../openings/book.js';
import { useChessGame } from '../hooks/useChessGame.js';
import { colorName, gameOverText, legalDests } from '../chess-utils.js';

const COLOR_CHOICES = [
  { id: 'white', label: 'Weiß', piece: '♔' },
  { id: 'random', label: 'Zufall', icon: Shuffle },
  { id: 'black', label: 'Schwarz', piece: '♚' },
];

export default function PlayBots() {
  const [botId, setBotId] = useState('sam');
  const [colorChoice, setColorChoice] = useState('white');
  const [match, setMatch] = useState(null);

  const bot = BOTS.find((b) => b.id === botId);

  function startMatch() {
    const playerColor =
      colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : colorChoice;
    setMatch({ id: Date.now(), bot, playerColor });
  }

  if (match) {
    return (
      <BotGame
        key={match.id}
        bot={match.bot}
        playerColor={match.playerColor}
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

function resultFor(game, playerColor, resigned) {
  if (resigned) return { outcome: 'loss', text: 'Du hast aufgegeben.' };
  if (game.isCheckmate()) {
    return game.turn() === playerColor[0]
      ? { outcome: 'loss', text: 'Schachmatt – du hast verloren.' }
      : { outcome: 'win', text: 'Schachmatt – du hast gewonnen!' };
  }
  const draw = gameOverText(game);
  return draw ? { outcome: 'draw', text: draw } : null;
}

const BOT_REACTIONS = {
  win: 'Gut gespielt! Das hast du dir verdient.',
  loss: 'Danke für die Partie! Revanche?',
  draw: 'Unentschieden – wir sind wohl gleich stark.',
};

function BotGame({ bot, playerColor, onRematch, onExit }) {
  const { game, fen, history, lastMove, move, undo } = useChessGame();
  const [thinking, setThinking] = useState(false);
  const [resigned, setResigned] = useState(false);
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
  const result = resultFor(game, playerColor, resigned);
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
          </div>
          <Board config={boardConfig} onMove={handlePlayerMove} overlay={promotion.dialog} />
          <div className="player-bar">
            <Avatar piece={playerColor === 'white' ? '♙' : '♟'} color="#5c5a57" size={36} />
            <span className="player-name">Du</span>
          </div>
        </div>

        <aside className="card game-panel">
          <div className="speech">{result ? BOT_REACTIONS[result.outcome] : bot.greeting}</div>

          {result ? (
            <div className={`result result-${result.outcome}`}>{result.text}</div>
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
            <button
              className="btn btn-analyse"
              onClick={() =>
                openInAnalysis(
                  game,
                  playerColor === 'white' ? 'Du' : bot.name,
                  playerColor === 'white' ? bot.name : 'Du',
                )
              }
            >
              <ChartLine size={18} /> Partie analysieren
            </button>
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
                <button className="btn" onClick={takeBack} disabled={history.length === 0}>
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
