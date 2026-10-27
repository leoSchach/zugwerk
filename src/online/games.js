import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase.js';

// Spielmodi nach Bedenkzeit – jede Kategorie hat eine eigene Elo-Wertung
export const MODES = {
  bullet: { label: 'Bullet', emoji: '⚡' },
  blitz: { label: 'Blitz', emoji: '🔥' },
  rapid: { label: 'Schnellschach', emoji: '⏱️' },
  classical: { label: 'Klassisch', emoji: '⏳' },
};

export const START_RATING = 1200;

// Bedenkzeiten zur Auswahl, nach Modus gruppiert: Grundzeit in Sekunden, Zuschlag pro Zug
export const TIME_CONTROLS = [
  { id: '1+0', initial: 60, increment: 0 },
  { id: '1+1', initial: 60, increment: 1 },
  { id: '2+1', initial: 120, increment: 1 },
  { id: '3+0', initial: 180, increment: 0 },
  { id: '3+2', initial: 180, increment: 2 },
  { id: '5+0', initial: 300, increment: 0 },
  { id: '5+3', initial: 300, increment: 3 },
  { id: '10+0', initial: 600, increment: 0 },
  { id: '10+5', initial: 600, increment: 5 },
  { id: '15+10', initial: 900, increment: 10 },
  { id: '30+0', initial: 1800, increment: 0 },
  { id: '30+20', initial: 1800, increment: 20 },
  { id: 'none', initial: null, increment: 0 },
].map((tc) => ({ ...tc, mode: modeOf(tc.initial, tc.increment), label: tcLabel(tc.initial, tc.increment) }));

// Gleiche Einteilung wie in der Datenbank (supabase/ratings.sql): Grundzeit + 40 × Zuschlag
export function modeOf(initial, increment) {
  if (!initial) return null;
  const estimate = initial + 40 * increment;
  if (estimate < 180) return 'bullet';
  if (estimate < 480) return 'blitz';
  if (estimate < 1500) return 'rapid';
  return 'classical';
}

function tcLabel(initial, increment) {
  if (!initial) return 'Ohne Uhr';
  return `${initial / 60} | ${increment}`;
}

export function timeLabel(game) {
  if (!game.time_initial) return 'Ohne Uhr';
  const mode = MODES[modeOf(game.time_initial, game.time_increment)];
  return `${mode.emoji} ${mode.label} ${tcLabel(game.time_initial, game.time_increment)}`;
}

// Elo-Änderung für ein Ergebnis (1 = Sieg, 0.5 = Remis, 0 = Niederlage) – wie in der Datenbank
export function ratingDelta(my, opponent, score) {
  const k = my.games < 20 ? 40 : 20;
  const expected = 1 / (1 + 10 ** ((opponent.rating - my.rating) / 400));
  return Math.round(k * (score - expected));
}

// Wertungen von Spielern in einem Modus: { [userId]: { rating, games, ... } }
export async function fetchRatings(userIds, mode) {
  const ids = userIds.filter(Boolean);
  const result = Object.fromEntries(ids.map((id) => [id, { rating: START_RATING, games: 0 }]));
  if (!mode || ids.length === 0) return result;
  const { data } = await supabase.from('ratings').select('*').eq('mode', mode).in('user_id', ids);
  for (const row of data ?? []) result[row.user_id] = row;
  return result;
}

// Alle Wertungen eines Spielers: { bullet: {...}, blitz: {...}, ... }
export async function fetchMyRatings(userId) {
  const { data } = await supabase.from('ratings').select('*').eq('user_id', userId);
  return Object.fromEntries((data ?? []).map((row) => [row.mode, row]));
}

export const REASONS = {
  checkmate: 'durch Schachmatt',
  resign: 'durch Aufgabe',
  timeout: 'durch Zeitüberschreitung',
  stalemate: 'durch Patt',
  agreement: 'durch Einigung',
  repetition: 'durch dreifache Stellungswiederholung',
  insufficient: 'wegen zu wenig Material',
  fifty: 'durch die 50-Züge-Regel',
};

export function gameLink(id) {
  return `${window.location.origin}${window.location.pathname}#/partie/${id}`;
}

// Neue Partie anlegen; gibt die ID zurück
export async function createGame({ userId, username, color, timeControl, rated }) {
  const tc = TIME_CONTROLS.find((t) => t.id === timeControl) ?? TIME_CONTROLS[0];
  const ms = tc.initial ? tc.initial * 1000 : null;
  const row = {
    rated: Boolean(rated && tc.initial),
    white_id: color === 'white' ? userId : null,
    black_id: color === 'black' ? userId : null,
    white_name: color === 'white' ? username : null,
    black_name: color === 'black' ? username : null,
    time_initial: tc.initial,
    time_increment: tc.increment,
    white_ms: ms,
    black_ms: ms,
  };
  const { data, error } = await supabase.from('games').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function listMyGames(userId) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .or(`white_id.eq.${userId},black_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .limit(15);
  if (error) throw error;
  return data;
}

// Aktionen laufen über Datenbank-Funktionen (siehe supabase/games.sql)
export const actions = {
  join: (id) => supabase.rpc('join_game', { p_game: id }),
  move: (id, san, ply, result = null, reason = null) =>
    supabase.rpc('make_move', { p_game: id, p_san: san, p_ply: ply, p_result: result, p_reason: reason }),
  claimTimeout: (id) => supabase.rpc('claim_timeout', { p_game: id }),
  resign: (id) => supabase.rpc('resign_game', { p_game: id }),
  offerDraw: (id) => supabase.rpc('offer_draw', { p_game: id }),
  declineDraw: (id) => supabase.rpc('decline_draw', { p_game: id }),
  rematch: (id) => supabase.rpc('rematch', { p_game: id }),
  cancel: (id) => supabase.from('games').delete().eq('id', id),
};

// Lädt eine Partie und hält sie per Realtime aktuell.
// Gibt { game, error, serverOffset } zurück; game ist null, solange sie lädt.
export function useOnlineGame(id) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [deleted, setDeleted] = useState(false);
  const [serverOffset, setServerOffset] = useState(0); // Serverzeit minus eigene Uhrzeit
  const latest = useRef(null);

  useEffect(() => {
    if (!supabase || !id) return;
    let active = true;

    async function load() {
      const { data, error: loadError } = await supabase.from('games').select('*').eq('id', id).maybeSingle();
      if (!active) return;
      if (loadError) setError(loadError.message);
      else if (!data) setDeleted(true);
      else accept(data);
    }

    // Nur neuere Stände übernehmen (Realtime und Neuladen können sich überholen)
    function accept(row) {
      const current = latest.current;
      if (current && new Date(row.updated_at) < new Date(current.updated_at)) return;
      latest.current = row;
      setGame(row);
    }

    async function syncClock() {
      const before = Date.now();
      const { data } = await supabase.rpc('server_now');
      const after = Date.now();
      if (active && data) setServerOffset(new Date(data).getTime() - (before + after) / 2);
    }

    load();
    syncClock();

    const channel = supabase
      .channel(`partie-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` }, (payload) =>
        accept(payload.new),
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'games', filter: `id=eq.${id}` }, () =>
        setDeleted(true),
      )
      .subscribe();

    // Falls die Verbindung kurz weg war (z. B. Handy im Standby): beim Zurückkehren neu laden
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [id]);

  return { game, error, deleted, serverOffset };
}

// Restzeit einer Farbe ('w' oder 'b') in Millisekunden, oder null ohne Uhr
export function remainingMs(game, color, now) {
  if (!game.time_initial) return null;
  const stored = color === 'w' ? game.white_ms : game.black_ms;
  const ply = game.moves.length;
  const toMove = ply % 2 === 0 ? 'w' : 'b';
  // Die Uhr läuft erst, wenn beide Seiten einmal gezogen haben
  if (game.status !== 'active' || ply < 2 || toMove !== color) return stored;
  return stored - (now - new Date(game.last_move_at).getTime());
}

export function formatClock(ms) {
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  if (total < 10000) return `${minutes}:${String(seconds).padStart(2, '0')}.${Math.floor((total % 1000) / 100)}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
