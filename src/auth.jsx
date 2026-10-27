import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { collectProgress, mergeProgress, onLocalSave, sameProgress, writeProgress } from './storage.js';

const AuthContext = createContext(null);

// Fehlermeldungen von Supabase auf Deutsch
const ERRORS = [
  [/invalid login credentials/i, 'E-Mail oder Passwort ist falsch.'],
  [/email not confirmed/i, 'Bitte bestätige zuerst deine E-Mail-Adresse (Link in der E-Mail).'],
  [/already registered|already been registered/i, 'Diese E-Mail-Adresse ist schon registriert.'],
  [/at least 6 characters|password should be/i, 'Das Passwort muss mindestens 6 Zeichen lang sein.'],
  [/rate limit|security purposes/i, 'Zu viele Versuche – bitte warte kurz und versuche es dann erneut.'],
  [/invalid email|unable to validate email/i, 'Das ist keine gültige E-Mail-Adresse.'],
  [/same as the old|different from the old/i, 'Das neue Passwort muss sich vom alten unterscheiden.'],
];

function translate(error) {
  if (!error) return null;
  const match = ERRORS.find(([pattern]) => pattern.test(error.message));
  return match ? match[1] : error.message;
}

// Nach dem Klick auf einen Link aus einer E-Mail landet man auf der Startseite (ohne #)
const redirectUrl = () => window.location.origin + window.location.pathname;

// Sicherung: höchstens einmal pro Sitzung neu laden, damit nie eine Endlosschleife entsteht
const RELOAD_FLAG = 'zugwerk-sync-reload';

function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    return;
  }
  window.location.reload();
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!supabase);
  const [recovery, setRecovery] = useState(false); // "Passwort vergessen"-Link wurde geöffnet
  const [syncState, setSyncState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true);
        window.location.hash = '#/konto';
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  // Angemeldet: Fortschritt aus Browser und Cloud zusammenführen,
  // danach jede Änderung (kurz verzögert) in die Cloud hochladen.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer = null;

    async function upload() {
      setSyncState('saving');
      const { error } = await supabase
        .from('progress')
        .upsert({ user_id: userId, data: collectProgress(), updated_at: new Date().toISOString() });
      if (!cancelled) setSyncState(error ? 'error' : 'saved');
    }

    async function start() {
      const { data, error } = await supabase.from('progress').select('data').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      if (error) {
        setSyncState('error');
        return;
      }
      const local = collectProgress();
      const merged = mergeProgress(local, data?.data);
      const changed = !sameProgress(merged, local);
      if (changed) writeProgress(merged);
      await upload();
      onLocalSave(() => {
        clearTimeout(timer);
        timer = setTimeout(upload, 1500);
      });
      // Neu laden, damit alle Seiten den zusammengeführten Fortschritt anzeigen
      if (changed && !cancelled) reloadOnce();
    }

    start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      onLocalSave(null);
    };
  }, [userId]);

  async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username }, emailRedirectTo: redirectUrl() },
    });
    return { error: translate(error), needsConfirmation: !error && !data.session };
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: translate(error) };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSyncState('idle');
  }

  async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
    return { error: translate(error) };
  }

  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecovery(false);
    return { error: translate(error) };
  }

  const user = session?.user ?? null;
  const value = {
    enabled: Boolean(supabase),
    ready,
    user,
    username: user?.user_metadata?.username || user?.email?.split('@')[0],
    recovery,
    syncState,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
