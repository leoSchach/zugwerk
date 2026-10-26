import { useEffect, useState } from 'react';

// Deutsche Namen der Eröffnungsfamilien. Der Teil nach dem ":" (die Variante)
// bleibt englisch, so wie er in der Lichess-Datenbank steht.
const GERMAN_FAMILIES = {
  'Sicilian Defense': 'Sizilianische Verteidigung',
  'Ruy Lopez': 'Spanische Partie',
  'French Defense': 'Französische Verteidigung',
  "Queen's Gambit Declined": 'Abgelehntes Damengambit',
  "Queen's Gambit Accepted": 'Angenommenes Damengambit',
  "Queen's Gambit": 'Damengambit',
  'Italian Game': 'Italienische Partie',
  'English Opening': 'Englische Eröffnung',
  "King's Gambit Accepted": 'Angenommenes Königsgambit',
  "King's Gambit Declined": 'Abgelehntes Königsgambit',
  "King's Gambit": 'Königsgambit',
  "King's Indian Defense": 'Königsindische Verteidigung',
  "King's Indian Attack": 'Königsindischer Angriff',
  'Caro-Kann Defense': 'Caro-Kann-Verteidigung',
  'Nimzo-Indian Defense': 'Nimzowitsch-Indische Verteidigung',
  "Queen's Pawn Game": 'Damenbauernspiel',
  "King's Pawn Game": 'Königsbauernspiel',
  'Semi-Slav Defense': 'Halbslawische Verteidigung',
  'Slav Defense': 'Slawische Verteidigung',
  'Dutch Defense': 'Holländische Verteidigung',
  'Benoni Defense': 'Benoni-Verteidigung',
  'Grünfeld Defense': 'Grünfeld-Indische Verteidigung',
  "Queen's Indian Defense": 'Damenindische Verteidigung',
  'Alekhine Defense': 'Aljechin-Verteidigung',
  'Indian Defense': 'Indische Verteidigung',
  'Scotch Game': 'Schottische Partie',
  "Petrov's Defense": 'Russische Verteidigung',
  'Four Knights Game': 'Vierspringerspiel',
  'Two Knights Defense': 'Zweispringerspiel im Nachzug',
  'Three Knights Opening': 'Dreispringerspiel',
  'Scandinavian Defense': 'Skandinavische Verteidigung',
  'Philidor Defense': 'Philidor-Verteidigung',
  'Réti Opening': 'Réti-Eröffnung',
  "Bishop's Opening": 'Läuferspiel',
  'Vienna Game': 'Wiener Partie',
  'Modern Defense': 'Moderne Verteidigung',
  'Catalan Opening': 'Katalanische Eröffnung',
  'Bird Opening': 'Bird-Eröffnung',
  'Pirc Defense': 'Pirc-Verteidigung',
  'Tarrasch Defense': 'Tarrasch-Verteidigung',
  'Polish Opening': 'Polnische Eröffnung',
  'Bogo-Indian Defense': 'Bogoljubow-Indische Verteidigung',
  'Center Game': 'Mittelgambit',
  'Latvian Gambit': 'Lettisches Gambit',
  'Old Indian Defense': 'Altindische Verteidigung',
  'Trompowsky Attack': 'Trompowsky-Angriff',
  'Benko Gambit': 'Wolga-Gambit',
  'Englund Gambit': 'Englund-Gambit',
  'Owen Defense': 'Owen-Verteidigung',
  'Danish Gambit': 'Nordisches Gambit',
  'Budapest Defense': 'Budapester Gambit',
  'London System': 'Londoner System',
  'Torre Attack': 'Torre-Angriff',
  'Hungarian Opening': 'Ungarische Eröffnung',
  'Ponziani Opening': 'Ponziani-Eröffnung',
  'Elephant Gambit': 'Elefantengambit',
  'Nimzowitsch Defense': 'Nimzowitsch-Verteidigung',
};

export function germanName(name) {
  const [family, ...rest] = name.split(':');
  // Längste passende Familie zuerst (z. B. "Queen's Gambit Declined" vor "Queen's Gambit")
  const match = Object.keys(GERMAN_FAMILIES)
    .filter((f) => family === f || family.startsWith(f + ','))
    .sort((a, b) => b.length - a.length)[0];
  const translated = match ? GERMAN_FAMILIES[match] + family.slice(match.length) : family;
  return rest.length ? `${translated}:${rest.join(':')}` : translated;
}

// Stellung ohne Zugzähler – so lassen sich gleiche Stellungen über
// verschiedene Zugfolgen erkennen (Zugumstellung)
export function positionKey(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

let bookPromise = null;

// Lädt die Datenbank einmal und merkt sie sich
export function loadBook() {
  bookPromise ??= fetch(`${import.meta.env.BASE_URL}openings/openings.json`)
    .then((response) => response.json())
    .then((rows) => {
      const list = rows.map(([eco, name, moves, position]) => ({
        eco,
        name: germanName(name),
        original: name,
        moves,
        position,
      }));
      const byPosition = new Map(list.map((o) => [o.position, o]));
      return { list, byPosition };
    });
  return bookPromise;
}

export function useOpeningBook() {
  const [book, setBook] = useState(null);
  useEffect(() => {
    let active = true;
    loadBook()
      .then((b) => active && setBook(b))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return book;
}

// Die zuletzt erkannte Eröffnung einer Zugfolge (verbose history von chess.js)
export function findOpening(book, history) {
  if (!book) return null;
  let found = null;
  for (const move of history) {
    const opening = book.byPosition.get(positionKey(move.after));
    if (opening) found = opening;
  }
  return found;
}
