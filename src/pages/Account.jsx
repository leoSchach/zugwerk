import { useEffect, useState } from 'react';
import { BookOpen, Cloud, CloudOff, Library, LogOut, Puzzle } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { ALL_LESSONS } from '../lessons/content.js';
import { MASTERY_RUNS } from '../openings/progress.js';
import { REPERTOIRE } from '../openings/repertoire.js';
import { SYNCED_KEYS, loadLocal } from '../storage.js';
import { MODES, START_RATING, fetchMyRatings } from '../online/games.js';

export default function Account() {
  const auth = useAuth();

  let content;
  if (!auth.enabled) {
    content = (
      <div className="card auth-card">
        <h2>Konten sind noch nicht eingerichtet</h2>
        <p className="muted">
          Es fehlen die Supabase-Zugangsdaten (VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY). Bis dahin wird
          dein Fortschritt nur in diesem Browser gespeichert.
        </p>
      </div>
    );
  } else if (!auth.ready) {
    content = <p className="muted">Lädt …</p>;
  } else if (auth.recovery) {
    content = <NewPasswordForm />;
  } else if (auth.user) {
    content = <Profile />;
  } else {
    content = <AuthForms />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Konto</h1>
        <p>Mit einem Konto wird dein Fortschritt gespeichert – auf jedem Gerät.</p>
      </header>
      {content}
    </div>
  );
}

function AuthForms() {
  const auth = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  function switchMode(next) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (mode === 'login') {
      const result = await auth.signIn(email.trim(), password);
      setError(result.error);
    } else if (mode === 'register') {
      const result = await auth.signUp(email.trim(), password, username.trim());
      setError(result.error);
      if (result.needsConfirmation) {
        setInfo('Fast geschafft! Wir haben dir eine E-Mail geschickt. Klicke auf den Link darin, um dein Konto zu bestätigen.');
      }
    } else {
      const result = await auth.sendPasswordReset(email.trim());
      setError(result.error);
      if (!result.error) setInfo('Falls es ein Konto mit dieser E-Mail gibt, haben wir dir einen Link zum Zurücksetzen geschickt.');
    }
    setBusy(false);
  }

  return (
    <div className="card auth-card">
      {mode !== 'reset' && (
        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            Anmelden
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>
            Registrieren
          </button>
        </div>
      )}
      {mode === 'reset' && <h2>Passwort zurücksetzen</h2>}

      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && (
          <label>
            <span className="label">Benutzername</span>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
              placeholder="z. B. SpringerSam"
            />
          </label>
        )}
        <label>
          <span className="label">E-Mail</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        {mode !== 'reset' && (
          <label>
            <span className="label">Passwort</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
        )}

        {error && <p className="error-text">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <button className="btn btn-primary btn-large" type="submit" disabled={busy}>
          {busy ? 'Bitte warten …' : mode === 'login' ? 'Anmelden' : mode === 'register' ? 'Konto erstellen' : 'Link schicken'}
        </button>
      </form>

      {mode === 'login' && (
        <button className="link-button" onClick={() => switchMode('reset')}>
          Passwort vergessen?
        </button>
      )}
      {mode === 'reset' && (
        <button className="link-button" onClick={() => switchMode('login')}>
          Zurück zur Anmeldung
        </button>
      )}
    </div>
  );
}

function NewPasswordForm() {
  const auth = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const result = await auth.updatePassword(password);
    setError(result.error);
    setBusy(false);
  }

  return (
    <div className="card auth-card">
      <h2>Neues Passwort festlegen</h2>
      <form className="auth-form" onSubmit={submit}>
        <label>
          <span className="label">Neues Passwort</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-large" type="submit" disabled={busy}>
          Passwort speichern
        </button>
      </form>
    </div>
  );
}

const SYNC_TEXT = {
  idle: 'Verbinde …',
  saving: 'Wird gespeichert …',
  saved: 'Fortschritt in der Cloud gespeichert',
  error: 'Speichern fehlgeschlagen – dein Fortschritt bleibt im Browser erhalten.',
};

function Profile() {
  const auth = useAuth();
  const [ratings, setRatings] = useState(null);

  useEffect(() => {
    fetchMyRatings(auth.user.id).then(setRatings);
  }, [auth.user.id]);
  const puzzles = loadLocal(SYNCED_KEYS.puzzles);
  const lessons = loadLocal(SYNCED_KEYS.lessons) ?? [];
  const openings = loadLocal(SYNCED_KEYS.openings) ?? {};
  const mastered = REPERTOIRE.filter((o) => (openings[o.id]?.perfect ?? 0) >= MASTERY_RUNS).length;

  return (
    <div className="profile">
      <div className="card profile-card">
        <span className="profile-avatar">{auth.username.slice(0, 1).toUpperCase()}</span>
        <div className="profile-info">
          <h2>{auth.username}</h2>
          <p className="muted">{auth.user.email}</p>
          <p className={`sync-state ${auth.syncState}`}>
            {auth.syncState === 'error' ? <CloudOff size={16} /> : <Cloud size={16} />}
            {SYNC_TEXT[auth.syncState]}
          </p>
        </div>
        <button className="btn" onClick={auth.signOut}>
          <LogOut size={18} /> Abmelden
        </button>
      </div>

      <h2 className="section-title">Elo-Wertungen</h2>
      <div className="rating-grid">
        {Object.entries(MODES).map(([mode, info]) => {
          const r = ratings?.[mode];
          return (
            <a key={mode} className="card rating-card" href="#/freunde">
              <span className="rating-mode">
                {info.emoji} {info.label}
              </span>
              <span className="stat-value">{r?.rating ?? START_RATING}</span>
              <span className="muted small">
                {r?.games
                  ? `${r.games} Partien · ${r.wins} S / ${r.draws} R / ${r.losses} N · Bestwert ${r.best}`
                  : 'Noch keine gewertete Partie'}
              </span>
            </a>
          );
        })}
      </div>
      <p className="muted small">
        Wertungen gibt es für gewertete Partien gegen Freunde. Jeder startet bei {START_RATING}; in den ersten 20
        Partien ändert sich die Wertung schneller.
      </p>

      <h2 className="section-title">Lernfortschritt</h2>
      <div className="card-grid">
        <a className="card stat-card" href="#/puzzles">
          <Puzzle size={22} />
          <span className="stat-value">{puzzles?.rating ?? 1000}</span>
          <span className="stat-label">Puzzle-Wertung · {puzzles?.solved ?? 0} gelöst</span>
        </a>
        <a className="card stat-card" href="#/lektionen">
          <BookOpen size={22} />
          <span className="stat-value">
            {lessons.length}/{ALL_LESSONS.length}
          </span>
          <span className="stat-label">Lektionen abgeschlossen</span>
        </a>
        <a className="card stat-card" href="#/eroeffnungen">
          <Library size={22} />
          <span className="stat-value">
            {mastered}/{REPERTOIRE.length}
          </span>
          <span className="stat-label">Eröffnungen gemeistert</span>
        </a>
      </div>
    </div>
  );
}
