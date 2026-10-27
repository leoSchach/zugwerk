import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Check, Copy, Flag, Handshake, LogIn, RotateCcw, Share2, X } from 'lucide-react';
import Board from '../components/Board.jsx';
import MoveList from '../components/MoveList.jsx';
import { needsPromotion, usePromotion } from '../components/Promotion.jsx';
import { useAuth, rememberReturn } from '../auth.jsx';
import { colorName, legalDests } from '../chess-utils.js';
import GameReview from '../components/GameReview.jsx';
import GameOverOverlay from '../components/GameOverOverlay.jsx';
import ResultBanner from '../components/ResultBanner.jsx';
import { findOpening, useOpeningBook } from '../openings/book.js';
import {
  MODES,
  REASONS,
  actions,
  fetchRatings,
  formatClock,
  gameLink,
  ratingDelta,
  remainingMs,
  timeLabel,
  useOnlineGame,
} from '../online/games.js';

// Ergebnis eines Zugs, falls er die Partie beendet
function endOf(chess) {
  if (chess.isCheckmate()) return { result: chess.turn() === 'w' ? '0-1' : '1-0', reason: 'checkmate' };
  if (chess.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'insufficient' };
  if (chess.isThreefoldRepetition()) return { result: '1/2-1/2', reason: 'repetition' };
  if (chess.isDraw()) return { result: '1/2-1/2', reason: 'fifty' };
  return null;
}

export default function FriendGame({ param: id }) {
  const auth = useAuth();
  const { game, error, deleted, serverOffset } = useOnlineGame(auth.user ? id : null);

  if (!auth.enabled) return <Message title="Online-Partien sind hier nicht eingerichtet." />;
  if (!auth.ready) return <Message title="Lädt …" />;
  if (!auth.user) {
    return (
      <Message title="Du wurdest zu einer Partie eingeladen!" text="Melde dich an oder registriere dich kostenlos, um mitzuspielen.">
        <a className="btn btn-primary btn-large" href="#/konto" onClick={() => rememberReturn(`#/partie/${id}`)}>
          <LogIn size={18} /> Anmelden und mitspielen
        </a>
      </Message>
    );
  }
  if (deleted) return <Message title="Diese Partie gibt es nicht (mehr)." text="Vielleicht wurde die Einladung zurückgezogen." back />;
  if (error) return <Message title="Die Partie konnte nicht geladen werden." text={error} back />;
  if (!game) return <Message title="Partie wird geladen …" />;

  if (game.status === 'waiting') return <Waiting game={game} />;
  return <LiveGame game={game} serverOffset={serverOffset} />;
}

function Message({ title, text, children, back }) {
  return (
    <div className="page">
      <div className="card auth-card friend-message">
        <h2>{title}</h2>
        {text && <p className="muted">{text}</p>}
        {children}
        {back && (
          <a className="btn" href="#/freunde">
            Zu meinen Partien
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------- Einladung: warten bzw. annehmen ----------------
function Waiting({ game }) {
  const auth = useAuth();
  const isCreator = game.created_by === auth.user.id;
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const link = gameLink(game.id);
  const creatorName = game.white_name ?? game.black_name;
  const youPlay = game.white_id ? 'Schwarz' : 'Weiß';

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    try {
      await navigator.share({ title: 'Schach auf Zugwerk', text: `${creatorName} fordert dich zu einer Partie heraus!`, url: link });
    } catch {
      // abgebrochen – egal
    }
  }

  async function join() {
    setBusy(true);
    const { error: joinError } = await actions.join(game.id);
    if (joinError) {
      setError(joinError.message);
      setBusy(false);
    }
    // Bei Erfolg kommt die aktive Partie per Realtime
  }

  async function cancel() {
    await actions.cancel(game.id);
    window.location.hash = '#/freunde';
  }

  if (!isCreator) {
    return (
      <Message
        title={`${creatorName} fordert dich heraus!`}
        text={`${timeLabel(game)}${game.rated ? ' · gewertet' : ''} · Du spielst ${youPlay}.`}
      >
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-large" onClick={join} disabled={busy}>
          {busy ? 'Einen Moment …' : 'Annehmen & spielen'}
        </button>
      </Message>
    );
  }

  return (
    <div className="page">
      <div className="card auth-card friend-message">
        <h2>Warte auf deinen Freund …</h2>
        <p className="muted">
          Schick ihm diesen Link. Sobald er ihn öffnet und annimmt, geht die Partie los.
          <br />
          {timeLabel(game)}
          {game.rated ? ' · gewertet' : ''} · Du spielst {game.white_id ? 'Weiß' : 'Schwarz'}.
        </p>
        <div className="fen-row">
          <code className="fen">{link}</code>
          <button className="icon-btn small" onClick={copy} title="Link kopieren">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <div className="input-actions">
          {navigator.share && (
            <button className="btn btn-primary" onClick={share}>
              <Share2 size={18} /> Teilen
            </button>
          )}
          <button className="btn btn-primary" onClick={copy}>
            <Copy size={18} /> {copied ? 'Kopiert!' : 'Link kopieren'}
          </button>
          <button className="btn" onClick={cancel}>
            <X size={18} /> Einladung zurückziehen
          </button>
        </div>
        <div className="waiting-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

// ---------------- Laufende oder beendete Partie ----------------
function LiveGame({ game, serverOffset }) {
  const auth = useAuth();
  const book = useOpeningBook();
  const me = game.white_id === auth.user.id ? 'w' : game.black_id === auth.user.id ? 'b' : null;
  const orientation = me === 'b' ? 'black' : 'white';
  const promotion = usePromotion(orientation);

  // Eigener Zug, der noch nicht vom Server bestätigt ist
  const [pending, setPending] = useState(null); // { san, ply }
  const [actionError, setActionError] = useState(null);
  const [now, setNow] = useState(() => Date.now() + serverOffset);
  const timeoutClaimed = useRef(false);
  const [ratings, setRatings] = useState(null);
  // Großes Ergebnisfenster nur, wenn die Partie gerade erst geendet hat – nicht beim späteren Ansehen
  const [endedRecently] = useState(
    () => game.status === 'active' || Date.now() + serverOffset - new Date(game.updated_at).getTime() < 120000,
  );

  // Aktuelle Wertungen beider Spieler (nach Spielende neu, dann stimmt auch die Änderung)
  useEffect(() => {
    if (!game.rated) return;
    fetchRatings([game.white_id, game.black_id], game.mode).then(setRatings);
  }, [game.rated, game.white_id, game.black_id, game.mode, game.status]);

  // Bestätigt der Server den Zug (oder ist die Partie weiter), ist der wartende Zug erledigt
  useEffect(() => {
    if (pending && game.moves.length > pending.ply) setPending(null);
  }, [game.moves.length]);

  const moves = pending && game.moves.length === pending.ply ? [...game.moves, pending.san] : game.moves;

  const chess = useMemo(() => {
    const c = new Chess();
    for (const san of moves) c.move(san);
    return c;
  }, [moves.join(' ')]);

  const history = chess.history({ verbose: true });
  const last = history[history.length - 1];
  const active = game.status === 'active';
  const myTurn = active && me && chess.turn() === me && !pending;
  const opening = useMemo(() => findOpening(book, history), [book, moves.length]);

  // Uhr: zehnmal pro Sekunde neu zeichnen, solange sie läuft
  useEffect(() => {
    if (!active || !game.time_initial) return;
    const timer = setInterval(() => setNow(Date.now() + serverOffset), 100);
    return () => clearInterval(timer);
  }, [active, game.time_initial, serverOffset]);

  const clocks = { w: remainingMs(game, 'w', now), b: remainingMs(game, 'b', now) };

  // Ist eine Uhr abgelaufen, lassen wir den Server das prüfen und die Partie beenden
  const toMove = game.moves.length % 2 === 0 ? 'w' : 'b';
  useEffect(() => {
    if (!active || !me || clocks[toMove] === null || clocks[toMove] > 0 || timeoutClaimed.current) return;
    timeoutClaimed.current = true;
    actions.claimTimeout(game.id).then(() => {
      timeoutClaimed.current = false;
    });
  });

  async function handleMove(from, to) {
    const piece = needsPromotion(chess, from, to) ? await promotion.ask(to, orientation) : undefined;
    // Ganze Partie nachspielen – die Remis-Regeln (Stellungswiederholung) brauchen den Verlauf
    const full = new Chess();
    for (const san of moves) full.move(san);
    let played;
    try {
      played = full.move({ from, to, promotion: piece });
    } catch {
      return;
    }
    const ply = game.moves.length;
    const end = endOf(full);
    setPending({ san: played.san, ply });
    setActionError(null);
    const { error } = await actions.move(game.id, played.san, ply, end?.result ?? null, end?.reason ?? null);
    if (error) {
      setPending(null);
      setActionError(error.message);
    }
  }

  async function run(action) {
    setActionError(null);
    const { error } = await action(game.id);
    if (error) setActionError(error.message);
  }

  async function rematch() {
    const { data, error } = await actions.rematch(game.id);
    if (error) setActionError(error.message);
    else window.location.hash = `#/partie/${data}`;
  }

  const boardConfig = useMemo(
    () => ({
      fen: chess.fen(),
      orientation,
      turnColor: colorName(chess.turn()),
      lastMove: last ? [last.from, last.to] : undefined,
      check: chess.inCheck(),
      movable: { color: myTurn ? orientation : undefined, dests: myTurn ? legalDests(chess) : new Map() },
    }),
    [chess, orientation, myTurn],
  );

  const names = { w: game.white_name ?? 'Weiß', b: game.black_name ?? 'Schwarz' };
  const ids = { w: game.white_id, b: game.black_id };

  // Wertung neben dem Namen: nach der Partie mit Änderung, sonst die aktuelle
  function ratingInfo(color) {
    if (!game.rated) return null;
    const before = color === 'w' ? game.white_rating : game.black_rating;
    const change = color === 'w' ? game.white_change : game.black_change;
    if (before != null) return { rating: before + change, change };
    const current = ratings?.[ids[color]];
    return current ? { rating: current.rating } : null;
  }

  // Vorschau: so viele Punkte gibt es für Sieg, Remis und Niederlage
  let stakes = null;
  if (game.rated && active && me && ratings) {
    const mine = ratings[ids[me]];
    const theirs = ratings[ids[me === 'w' ? 'b' : 'w']];
    if (mine && theirs) {
      stakes = [1, 0.5, 0].map((score) => ratingDelta(mine, theirs, score));
    }
  }
  const myRating = me ? ratingInfo(me) : null;
  const modeName = game.mode ? MODES[game.mode].label : '';
  const top = orientation === 'white' ? 'b' : 'w';
  const bottom = top === 'w' ? 'b' : 'w';
  const opponentOffersDraw = active && me && game.draw_offer && game.draw_offer !== me;
  const iOfferedDraw = active && me && game.draw_offer === me;

  // Ergebnis aus deiner Sicht (Zuschauer sehen es neutral)
  let result = null;
  if (game.status === 'finished') {
    const reason = REASONS[game.reason] ?? '';
    const reasonText = reason.charAt(0).toUpperCase() + reason.slice(1);
    if (game.result === '1/2-1/2') result = { outcome: 'draw', title: 'Remis', subtitle: reasonText };
    else {
      const winner = game.result === '1-0' ? 'w' : 'b';
      const loser = winner === 'w' ? 'b' : 'w';
      if (!me) result = { outcome: 'draw', title: `${names[winner]} gewinnt`, subtitle: reasonText };
      else if (winner === me) result = { outcome: 'win', title: 'Du hast gewonnen!', subtitle: `${reasonText} gegen ${names[loser]}` };
      else result = { outcome: 'loss', title: 'Verloren', subtitle: reasonText };
    }
  }

  const rematchButton = me && (game.rematch_id ? (
    <a className="btn btn-primary" href={`#/partie/${game.rematch_id}`}>
      <RotateCcw size={18} /> Zur Revanche
    </a>
  ) : (
    <button className="btn btn-primary" onClick={rematch}>
      <RotateCcw size={18} /> Revanche
    </button>
  ));

  return (
    <div className="page game-page">
      <div className="game-layout">
        <div className="board-column">
          <PlayerBar name={names[top]} rating={ratingInfo(top)} ms={clocks[top]} running={active && chess.turn() === top} />
          <Board
            config={boardConfig}
            onMove={handleMove}
            overlay={
              promotion.dialog ??
              (result && endedRecently && (
                <GameOverOverlay
                  outcome={result.outcome}
                  title={result.title}
                  subtitle={result.subtitle}
                  extra={
                    myRating?.change != null && (
                      <p className="overlay-rating">
                        {modeName}-Wertung: <strong>{myRating.rating}</strong>{' '}
                        <RatingChange change={myRating.change} />
                      </p>
                    )
                  }
                >
                  {rematchButton}
                </GameOverOverlay>
              ))
            }
          />
          <PlayerBar
            name={names[bottom]}
            rating={ratingInfo(bottom)}
            ms={clocks[bottom]}
            running={active && chess.turn() === bottom}
            you={me === bottom}
          />
        </div>

        <aside className="card game-panel">
          {result ? (
            <ResultBanner outcome={result.outcome} title={result.title} subtitle={result.subtitle} />
          ) : (
            <p className="status">
              <span className={`turn-dot ${colorName(chess.turn())}`} />
              {chess.inCheck() && 'Schach! '}
              {!me ? 'Du schaust zu' : myTurn ? 'Du bist am Zug' : pending ? 'Zug wird gesendet …' : `${names[chess.turn()]} ist am Zug`}
            </p>
          )}

          <p className="muted small">
            {timeLabel(game)}
            {game.rated ? ' · gewertet' : ' · ungewertet'}
            {opening && ` · ${opening.eco} ${opening.name}`}
          </p>

          {stakes && (
            <p className="stakes">
              Sieg <RatingChange change={stakes[0]} /> · Remis <RatingChange change={stakes[1]} /> · Niederlage{' '}
              <RatingChange change={stakes[2]} />
            </p>
          )}

          {opponentOffersDraw && (
            <div className="draw-offer">
              <span>
                <Handshake size={18} /> {names[game.draw_offer]} bietet Remis an.
              </span>
              <div className="panel-actions">
                <button className="btn btn-primary" onClick={() => run(actions.offerDraw)}>
                  Annehmen
                </button>
                <button className="btn" onClick={() => run(actions.declineDraw)}>
                  Ablehnen
                </button>
              </div>
            </div>
          )}

          <MoveList history={moves} />

          {actionError && <p className="error-text">{actionError}</p>}

          {active && me && (
            <div className="panel-actions">
              <button className="btn" onClick={() => run(actions.offerDraw)} disabled={iOfferedDraw || opponentOffersDraw}>
                <Handshake size={18} /> {iOfferedDraw ? 'Remis angeboten' : 'Remis anbieten'}
              </button>
              <ResignButton onResign={() => run(actions.resign)} />
            </div>
          )}

          {game.status === 'finished' && (
            <>
              {rematchButton}
              {moves.length > 0 && <GameReview game={chess} white={names.w} black={names.b} me={me} result={game.result} />}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function RatingChange({ change }) {
  return (
    <span className={`rating-change ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>
      {change > 0 ? `+${change}` : change}
    </span>
  );
}

function PlayerBar({ name, rating, ms, running, you }) {
  return (
    <div className="player-bar">
      <span className="avatar online-avatar" style={{ width: 36, height: 36, fontSize: 16 }}>
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="player-name">{name}</span>
      {rating && (
        <span className="player-elo">
          ({rating.rating}
          {rating.change != null && (
            <>
              {' '}
              <RatingChange change={rating.change} />
            </>
          )}
          )
        </span>
      )}
      {you && <span className="player-elo">· du</span>}
      {ms !== null && (
        <span className={`clock ${running ? 'running' : ''} ${ms < 20000 ? 'low' : ''}`}>{formatClock(ms)}</span>
      )}
    </div>
  );
}

// Aufgeben mit Rückfrage, damit man nicht aus Versehen verliert
function ResignButton({ onResign }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <button
        className="btn btn-danger"
        onClick={() => {
          setConfirm(false);
          onResign();
        }}
        onBlur={() => setConfirm(false)}
        autoFocus
      >
        <Flag size={18} /> Wirklich aufgeben?
      </button>
    );
  }
  return (
    <button className="btn btn-danger" onClick={() => setConfirm(true)}>
      <Flag size={18} /> Aufgeben
    </button>
  );
}
