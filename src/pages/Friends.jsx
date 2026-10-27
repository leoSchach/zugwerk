import { useEffect, useState } from 'react';
import { LogIn, Shuffle, Users } from 'lucide-react';
import { useAuth, rememberReturn } from '../auth.jsx';
import { REASONS, TIME_CONTROLS, createGame, listMyGames, timeLabel } from '../online/games.js';

const COLORS = [
  { id: 'white', label: 'Weiß', piece: '♔' },
  { id: 'random', label: 'Zufall', icon: Shuffle },
  { id: 'black', label: 'Schwarz', piece: '♚' },
];

export default function Friends() {
  const auth = useAuth();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Gegen Freunde spielen</h1>
        <p>Erstelle eine Partie und schick deinem Freund den Link – gespielt wird live.</p>
      </header>

      {!auth.enabled ? (
        <div className="card auth-card">
          <p className="muted">Online-Partien brauchen Benutzerkonten, die auf dieser Seite noch nicht eingerichtet sind.</p>
        </div>
      ) : !auth.ready ? (
        <p className="muted">Lädt …</p>
      ) : !auth.user ? (
        <div className="card auth-card">
          <h2>Bitte melde dich an</h2>
          <p className="muted">Damit dein Freund weiß, gegen wen er spielt, brauchen beide ein (kostenloses) Konto.</p>
          <a className="btn btn-primary btn-large" href="#/konto" onClick={() => rememberReturn('#/freunde')}>
            <LogIn size={18} /> Anmelden oder registrieren
          </a>
        </div>
      ) : (
        <div className="friends-layout">
          <CreateGame />
          <MyGames userId={auth.user.id} />
        </div>
      )}
    </div>
  );
}

function CreateGame() {
  const auth = useAuth();
  const [color, setColor] = useState('random');
  const [timeControl, setTimeControl] = useState('10+0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const myColor = color === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : color;
      const id = await createGame({ userId: auth.user.id, username: auth.username, color: myColor, timeControl });
      window.location.hash = `#/partie/${id}`;
    } catch (e) {
      setError('Die Partie konnte nicht erstellt werden: ' + e.message);
      setBusy(false);
    }
  }

  return (
    <div className="card create-game">
      <h2 className="card-title">
        <Users size={20} /> Neue Partie
      </h2>

      <p className="label">Ich spiele mit</p>
      <div className="segmented">
        {COLORS.map((c) => (
          <button key={c.id} className={color === c.id ? 'active' : ''} onClick={() => setColor(c.id)}>
            {c.piece ? <span className="seg-piece">{c.piece}</span> : <c.icon size={18} />}
            {c.label}
          </button>
        ))}
      </div>

      <p className="label">Bedenkzeit</p>
      <div className="time-grid">
        {TIME_CONTROLS.map((t) => (
          <button
            key={t.id}
            className={`time-option ${timeControl === t.id ? 'active' : ''}`}
            onClick={() => setTimeControl(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-primary btn-large" onClick={create} disabled={busy}>
        {busy ? 'Wird erstellt …' : 'Partie erstellen & Link teilen'}
      </button>
    </div>
  );
}

function MyGames({ userId }) {
  const [games, setGames] = useState(null);

  useEffect(() => {
    listMyGames(userId)
      .then(setGames)
      .catch(() => setGames([]));
  }, [userId]);

  if (!games) return <div className="card my-games muted">Partien werden geladen …</div>;

  return (
    <div className="card my-games">
      <h2 className="card-title">Meine Partien</h2>
      {games.length === 0 && <p className="muted">Noch keine Partien. Erstelle links deine erste!</p>}
      <div className="game-rows">
        {games.map((g) => {
          const myColor = g.white_id === userId ? 'w' : 'b';
          const opponent = (myColor === 'w' ? g.black_name : g.white_name) ?? 'Wartet auf Gegner';
          const myTurn = g.status === 'active' && (g.moves.length % 2 === 0 ? 'w' : 'b') === myColor;
          let status;
          if (g.status === 'waiting') status = 'Einladung offen';
          else if (g.status === 'active') status = myTurn ? 'Du bist am Zug' : 'Gegner am Zug';
          else if (g.result === '1/2-1/2') status = `Remis ${REASONS[g.reason] ?? ''}`;
          else status = (g.result === '1-0') === (myColor === 'w') ? 'Gewonnen' : 'Verloren';

          return (
            <a key={g.id} className={`game-row ${myTurn ? 'my-turn' : ''}`} href={`#/partie/${g.id}`}>
              <span className={`turn-dot ${myColor === 'w' ? 'white' : 'black'}`} />
              <span className="game-row-main">
                <strong>{opponent}</strong>
                <span className="muted small">
                  {timeLabel(g)} · {Math.ceil(g.moves.length / 2)} Züge
                </span>
              </span>
              <span className={`game-row-status ${g.status}`}>{status}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
