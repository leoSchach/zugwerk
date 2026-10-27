import { createClient } from '@supabase/supabase-js';

// Zugangsdaten kommen aus der Datei .env.local (bzw. den Einstellungen bei Vercel).
// Der "anon"-Key ist öffentlich – geschützt wird alles durch die Regeln in supabase/schema.sql.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ohne Zugangsdaten läuft die Seite einfach ohne Konten weiter
export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { flowType: 'pkce' } }) : null;
