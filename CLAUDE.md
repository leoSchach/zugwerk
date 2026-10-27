# Zugwerk – Hinweise für Claude

Kostenlose Schach-Lernseite (Alternative zu chess.com Premium). Live: https://zugwerk.vercel.app
Repository: https://github.com/leoSchach/zugwerk (öffentlich)

## Arbeitsweise mit dem Nutzer

- Der Nutzer schreibt Deutsch und ist Programmier-Anfänger: auf Deutsch antworten, einfach erklären,
  konkrete Schritte und Befehle nennen.
- Wichtige Erkenntnisse und Entscheidungen hier in der CLAUDE.md festhalten und das Memory nutzen.
- **Ein Push auf `main` geht sofort live** (Vercel baut automatisch). Größere Änderungen vorher absprechen.
- Commits nutzen die GitHub-noreply-Adresse (`git config user.email` ist im Repo gesetzt) – so lassen,
  der Nutzer will seine echte E-Mail nicht öffentlich haben.
- Niemals Secrets committen. `.env.local` (Supabase-URL + publishable Key) ist in `.gitignore`.

## Technik

- Vite + React 19 (JavaScript, kein TypeScript), keine Router-Bibliothek: Hash-Routing in `src/App.jsx`
  (`#/seite` bzw. `#/partie/<id>`), Seiten in `src/pages/`.
- Brett: `chessground` (Lichess, GPL) über `src/components/Board.jsx`; Regeln: `chess.js`;
  Engine: Stockfish 19 lite single-threaded als Web Worker (`src/engine/stockfish.js`).
  `scripts/copy-stockfish.js` kopiert die Engine bei `npm install` nach `public/stockfish/` (gitignored).
- Icons: `lucide-react`. Design: alles in `src/styles.css` (dunkles Theme, CSS-Variablen, Brettfarben
  über `--board-light/--board-dark/--board-image`).
- UI-Texte und Code-Kommentare auf Deutsch. Züge intern in englischer SAN (chess.js), Anzeige über
  `formatSan()` je nach Einstellung deutsch (S, L, T, D) oder englisch.

## Befehle

- `npm run dev` – Entwicklungsserver auf http://localhost:5173
- `npm run build` – Produktions-Build (Warnung "chunks larger than 500 kB" ist bekannt und harmlos)

## Wichtige Bereiche

| Bereich | Dateien |
|---|---|
| Bots + Bot-Partien (mit optionaler Uhr, ungewertet) | `src/bots.js`, `src/pages/PlayBots.jsx` |
| Freies Brett | `src/pages/FreeBoard.jsx` |
| Puzzles (Lichess-DB, CC0, ~5.900 Stück, eigene Wertung) | `public/puzzles/puzzles.json`, `src/puzzles/`, `scripts/build-puzzles.js` |
| Analyse (Zugbewertung Brillant … Patzer, Buchzüge) | `src/analysis/`, `src/pages/Analysis.jsx`, `src/components/GameReview.jsx` |
| Eröffnungen (Trainer, Lexikon, Lichess chess-openings CC0) | `src/openings/`, `public/openings/openings.json`, `scripts/build-openings.js` |
| Lektionen (20 Stück, Aufgaben mit Stockfish geprüft) | `src/lessons/content.js`, `src/lessons/steps.jsx`, `src/pages/Lessons.jsx` |
| Konten + Cloud-Sync des Fortschritts | `src/auth.jsx`, `src/supabase.js`, `src/storage.js`, `src/pages/Account.jsx` |
| Online gegen Freunde (Realtime) | `src/online/games.js`, `src/pages/Friends.jsx`, `src/pages/FriendGame.jsx` |

- Analysen laufen über einen gemeinsamen Job-Speicher (`analysePgn` in `src/analysis/analyseGame.js`),
  damit die Analyse-Seite eine nach der Partie gestartete Analyse ohne Neuberechnung übernimmt.
- Fortschritt (Einstellungen, Puzzles, Eröffnungen, Lektionen) immer über `saveLocal/loadLocal`
  aus `src/storage.js` speichern, nicht direkt `localStorage` – sonst fehlt der Cloud-Sync.
- Vergleiche von Fortschritt mit `sameProgress()` (Postgres-jsonb sortiert Schlüssel um; ein
  naiver `JSON.stringify`-Vergleich hat früher eine Endlos-Neulade-Schleife verursacht).

## Supabase (Projekt `dmesnfkdxijaogpftnla`, Region Frankfurt)

- Anmeldung: E-Mail + Passwort, PKCE-Flow, E-Mail-Bestätigung aktiv.
- SQL-Dateien in `supabase/` muss **der Nutzer** im Supabase SQL Editor ausführen (Claude hat keinen
  Admin-Zugang). Reihenfolge: `schema.sql` → `games.sql` → `ratings.sql` → `ratings-start-400.sql`.
- **Code, der neue Tabellen/Spalten braucht, erst pushen, nachdem der Nutzer das SQL ausgeführt hat.**
- Neue Tabellen brauchen ein explizites `grant … to authenticated` (wird in neuen Projekten nicht
  automatisch vergeben) plus RLS-Policies.
- Online-Partien: Züge, Uhr (Serverzeit), Aufgabe, Remis, Revanche nur über `security definer`-Funktionen
  (`make_move`, `claim_timeout`, …); direktes Update der Tabelle `games` ist verboten.
- Elo pro Modus (bullet/blitz/rapid/classical, Einteilung: Grundzeit + 40 × Zuschlag), Start **400**,
  Untergrenze 100, K = 40 in den ersten 20 Partien, danach 20. Berechnung im Trigger
  `games_apply_rating`; `START_RATING` in `src/online/games.js` muss dazu passen.
- Prüfen ohne Login: REST mit dem publishable Key aus `.env.local`, z. B. `rpc/server_now`.

## Vercel

- Env-Variablen `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` sind gesetzt (als "Config", nicht geheim).
- Der Bot-Schutz von Vercel blockiert automatisierte Abrufe der Live-Seite (curl/Headless-Chrome).
  Deploy-Status stattdessen prüfen mit:
  `gh api repos/leoSchach/zugwerk/commits/<sha>/statuses --jq '.[0].state'`

## Testen

- UI-Tests mit `puppeteer-core` + installiertem Google Chrome gegen `http://localhost:5173`
  (Testskripte im Scratchpad, nicht im Repo). Funktionen, die zwei angemeldete Konten brauchen
  (Online-Partien, Elo), kann Claude nicht selbst testen – der Nutzer testet sie.
- Schach-Inhalte (Lektionen, Eröffnungen) mit chess.js auf Legalität und mit Stockfish (npm-Paket,
  läuft auch in Node) auf Richtigkeit prüfen.
