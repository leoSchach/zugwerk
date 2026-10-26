import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import { useSettings } from '../settings.jsx';

// Das Schachbrett. Wir benutzen "chessground", das Brett von Lichess.
// `config` wird bei jeder Änderung an chessground weitergegeben,
// `onMove(from, to)` wird aufgerufen, wenn der Spieler einen Zug macht.
export default function Board({ config, onMove }) {
  const { settings } = useSettings();
  const elementRef = useRef(null);
  const apiRef = useRef(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Brett-Einstellungen des Nutzers mit der Konfiguration der Seite kombinieren
  const fullConfig = {
    ...config,
    animation: { enabled: settings.animation },
    movable: { ...config.movable, showDests: settings.showDests },
  };
  const configRef = useRef(fullConfig);
  configRef.current = fullConfig;

  // Koordinaten lassen sich nur beim Erstellen festlegen,
  // deshalb wird das Brett neu aufgebaut, wenn sich die Einstellung ändert.
  useEffect(() => {
    apiRef.current = Chessground(elementRef.current, {
      coordinates: settings.coordinates,
      premovable: { enabled: false },
      movable: {
        free: false,
        events: { after: (from, to) => onMoveRef.current?.(from, to) },
      },
    });
    apiRef.current.set(configRef.current);
    return () => apiRef.current.destroy();
  }, [settings.coordinates]);

  useEffect(() => {
    apiRef.current?.set(configRef.current);
  }, [config, settings.animation, settings.showDests]);

  return <div ref={elementRef} className="board" />;
}
