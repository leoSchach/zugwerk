// Alle Lektionen. Jede Lektion besteht aus Schritten:
//
//   { type: 'text',  text, fen?, arrows?: [[von, nach]], highlight?: [felder] }
//       Erklärung mit Brett.
//   { type: 'stars', text, piece, start, stars: [felder], enemies?: { feld: figur } }
//       Eine weiße Figur sammelt Sterne. piece: 'R','B','Q','K','N','P'.
//       enemies: schwarze Figuren, die im Weg stehen und geschlagen werden können.
//   { type: 'move',  text, fen, solution: [...], mate?: true, success? }
//       Finde den richtigen Zug. solution wechselt zwischen deinen Zügen und den
//       Antworten des Gegners. Ein eigener Zug kann eine Liste erlaubter Züge sein.
//       mate: true – beim letzten Zug zählt jedes Matt.
//   { type: 'play',  text, fen, goal: 'mate' | 'promote' }
//       Spiele gegen Stockfish, bis das Ziel erreicht ist.
//
// Züge in englischer Notation (für chess.js), Texte mit deutscher Notation.

export const CHAPTERS = [
  {
    id: 'figuren',
    title: 'Die Figuren',
    description: 'Wie zieht welche Figur? Sammle die Sterne ein.',
    lessons: [
      {
        id: 'turm',
        title: 'Der Turm',
        steps: [
          {
            type: 'text',
            text: 'Der Turm zieht gerade – waagerecht oder senkrecht, so weit er will. Er kann aber nicht über andere Figuren springen.',
            fen: '8/8/8/8/3R4/8/8/8 w - - 0 1',
            arrows: [['d4', 'd8'], ['d4', 'h4'], ['d4', 'd1'], ['d4', 'a4']],
          },
          { type: 'stars', text: 'Sammle beide Sterne ein.', piece: 'R', start: 'a1', stars: ['a5', 'e5'] },
          { type: 'stars', text: 'Jetzt drei Sterne. Plane deinen Weg!', piece: 'R', start: 'a1', stars: ['a8', 'h8', 'h1'] },
          {
            type: 'stars',
            text: 'Die schwarzen Figuren stehen im Weg. Du kannst sie schlagen, indem du auf ihr Feld ziehst.',
            piece: 'R',
            start: 'b2',
            stars: ['b7', 'g7', 'g2'],
            enemies: { b5: 'p', e7: 'n' },
          },
        ],
      },
      {
        id: 'laeufer',
        title: 'Der Läufer',
        steps: [
          {
            type: 'text',
            text: 'Der Läufer zieht schräg (diagonal), so weit er will. Er bleibt dabei immer auf derselben Feldfarbe.',
            fen: '8/8/8/8/3B4/8/8/8 w - - 0 1',
            arrows: [['d4', 'h8'], ['d4', 'a7'], ['d4', 'a1'], ['d4', 'g1']],
          },
          { type: 'stars', text: 'Sammle beide Sterne ein.', piece: 'B', start: 'c1', stars: ['e3', 'g5'] },
          { type: 'stars', text: 'Drei Sterne – alle auf hellen Feldern.', piece: 'B', start: 'f1', stars: ['a6', 'c8', 'h3'] },
        ],
      },
      {
        id: 'dame',
        title: 'Die Dame',
        steps: [
          {
            type: 'text',
            text: 'Die Dame ist die stärkste Figur: Sie zieht wie Turm und Läufer zusammen – gerade und schräg.',
            fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1',
            arrows: [['d4', 'd8'], ['d4', 'h8'], ['d4', 'h4'], ['d4', 'g1'], ['d4', 'd1'], ['d4', 'a1'], ['d4', 'a4'], ['d4', 'a7']],
          },
          { type: 'stars', text: 'Sammle alle Sterne ein.', piece: 'Q', start: 'd1', stars: ['d5', 'h5', 'e8'] },
          { type: 'stars', text: 'Schaffst du es in vier Zügen?', piece: 'Q', start: 'a1', stars: ['h8', 'h1', 'a8', 'd5'] },
        ],
      },
      {
        id: 'koenig',
        title: 'Der König',
        steps: [
          {
            type: 'text',
            text: 'Der König ist die wichtigste Figur, aber er zieht nur ein Feld weit – in jede Richtung. Wird er mattgesetzt, ist die Partie verloren.',
            fen: '8/8/8/8/3K4/8/8/8 w - - 0 1',
            highlight: ['c5', 'd5', 'e5', 'c4', 'e4', 'c3', 'd3', 'e3'],
          },
          { type: 'stars', text: 'Sammle die Sterne ein – Schritt für Schritt.', piece: 'K', start: 'e1', stars: ['d2', 'e3', 'f4'] },
          { type: 'stars', text: 'Ein längerer Weg.', piece: 'K', start: 'a1', stars: ['b3', 'c5', 'e6'] },
        ],
      },
      {
        id: 'springer',
        title: 'Der Springer',
        steps: [
          {
            type: 'text',
            text: 'Der Springer zieht wie ein „L“: zwei Felder gerade und dann eins zur Seite. Als einzige Figur kann er über andere springen.',
            fen: '8/8/8/8/3N4/8/8/8 w - - 0 1',
            highlight: ['c6', 'e6', 'f5', 'f3', 'e2', 'c2', 'b3', 'b5'],
          },
          { type: 'stars', text: 'Sammle die Sterne ein.', piece: 'N', start: 'b1', stars: ['c3', 'd5', 'f6'] },
          { type: 'stars', text: 'Der Springer springt über die Figuren.', piece: 'N', start: 'g1', stars: ['f3', 'g5', 'h7'], enemies: { f2: 'p', g2: 'p', g4: 'p' } },
        ],
      },
      {
        id: 'bauer',
        title: 'Der Bauer',
        steps: [
          {
            type: 'text',
            text: 'Der Bauer zieht ein Feld nach vorne – beim ersten Zug darf er auch zwei Felder gehen. Schlagen kann er aber nur schräg nach vorne.',
            fen: '8/8/8/3p4/8/8/4P3/8 w - - 0 1',
            arrows: [['e2', 'e3'], ['e2', 'e4']],
          },
          { type: 'stars', text: 'Zieh den Bauern nach vorne. Tipp: Beim ersten Zug geht es zwei Felder weit.', piece: 'P', start: 'e2', stars: ['e4', 'e5'] },
          {
            type: 'stars',
            text: 'Vorne ist der Weg versperrt. Schlage schräg, um voranzukommen!',
            piece: 'P',
            start: 'c2',
            stars: ['d3', 'e4', 'e5'],
            enemies: { c3: 'p', d3: 'n', d4: 'p', e4: 'b' },
          },
          {
            type: 'text',
            text: 'Erreicht ein Bauer die letzte Reihe, wird er umgewandelt – meist in eine Dame. Aus einem kleinen Bauern wird so die stärkste Figur!',
            fen: '8/4P3/8/8/8/8/8/8 w - - 0 1',
            arrows: [['e7', 'e8']],
          },
          { type: 'stars', text: 'Bring den Bauern zur letzten Reihe und sammle dann mit der neuen Dame den letzten Stern.', piece: 'P', start: 'g5', stars: ['g8', 'a2'] },
        ],
      },
    ],
  },
  {
    id: 'regeln',
    title: 'Die Regeln',
    description: 'Schach, Matt, Patt und die Sonderzüge.',
    lessons: [
      {
        id: 'schach-matt',
        title: 'Schach und Matt',
        steps: [
          {
            type: 'text',
            text: 'Wird der König angegriffen, steht er im „Schach“. Du musst das Schach sofort abwehren – auf eine von drei Arten: den König wegziehen, eine Figur dazwischenstellen oder den Angreifer schlagen.',
            fen: '4k3/8/8/4r3/8/3N4/8/4K3 w - - 0 1',
            arrows: [['e5', 'e1']],
          },
          {
            type: 'move',
            text: 'Dein König steht im Schach. Wehre es ab, indem du den Turm schlägst!',
            fen: '4k3/8/8/4r3/8/3N4/8/4K3 w - - 0 1',
            solution: ['Nxe5'],
            success: 'Richtig! Der Springer schlägt den Turm – das beste Mittel gegen das Schach.',
          },
          {
            type: 'text',
            text: 'Kann das Schach auf keine Art abgewehrt werden, ist der König „schachmatt“ – und die Partie ist vorbei. Hier hat Schwarz verloren: Die Dame gibt Schach, und der König kann nirgends hin.',
            fen: '7k/6Q1/5K2/8/8/8/8/8 b - - 0 1',
            highlight: ['h8'],
          },
          {
            type: 'move',
            text: 'Setze den schwarzen König matt – mit einem einzigen Zug!',
            fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1',
            solution: ['Qg7#'],
            mate: true,
            success: 'Schachmatt! Die Dame wird vom König gedeckt, deshalb kann sie nicht geschlagen werden.',
          },
        ],
      },
      {
        id: 'sonderzuege',
        title: 'Rochade, En passant, Umwandlung',
        steps: [
          {
            type: 'text',
            text: 'Bei der Rochade ziehen König und Turm gleichzeitig: Der König geht zwei Felder zum Turm, der Turm springt über ihn. Das geht nur, wenn beide noch nicht gezogen haben, kein Feld dazwischen besetzt ist und der König nicht durch Schach zieht.',
            fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
            arrows: [['e1', 'g1'], ['h1', 'f1']],
          },
          {
            type: 'move',
            text: 'Mach die kurze Rochade: Zieh den König zwei Felder nach rechts.',
            fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
            solution: ['O-O'],
            success: 'Perfekt! Dein König steht jetzt sicher in der Ecke, und der Turm ist im Spiel.',
          },
          {
            type: 'text',
            text: 'En passant („im Vorbeigehen“): Zieht ein Bauer zwei Felder vor und landet direkt neben einem gegnerischen Bauern, darf dieser ihn schlagen, als wäre er nur ein Feld gegangen. Das geht aber nur sofort im nächsten Zug!',
            fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',
            arrows: [['e5', 'd6']],
          },
          {
            type: 'move',
            text: 'Schwarz hat gerade d7–d5 gespielt. Schlage den Bauern en passant!',
            fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',
            solution: ['exd6'],
            success: 'Genau! Dein Bauer landet auf d6 und der schwarze Bauer verschwindet.',
          },
          {
            type: 'move',
            text: 'Bring den Bauern zur letzten Reihe und wandle ihn in eine Dame um.',
            fen: '8/1P6/8/8/8/8/k7/4K3 w - - 0 1',
            solution: ['b8=Q'],
            success: 'Aus dem Bauern ist eine Dame geworden!',
          },
        ],
      },
      {
        id: 'patt',
        title: 'Patt und Remis',
        steps: [
          {
            type: 'text',
            text: 'Vorsicht: Ist der Spieler am Zug nicht im Schach, hat aber keinen einzigen legalen Zug, ist das „Patt“. Die Partie endet unentschieden (Remis) – auch wenn du viel mehr Figuren hast!',
            fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
            highlight: ['g8', 'g7', 'h7'],
          },
          {
            type: 'text',
            text: 'Weitere Remis-Regeln: dreimal dieselbe Stellung, 50 Züge ohne Bauernzug und ohne Schlagen, oder zu wenig Material zum Mattsetzen (z. B. nur noch die beiden Könige).',
          },
          {
            type: 'move',
            text: 'Setze matt – aber pass auf, dass du nicht aus Versehen patt setzt!',
            fen: '7k/4Q3/6K1/8/8/8/8/8 w - - 0 1',
            solution: ['Qe8#'],
            mate: true,
            success: 'Matt! Mit Df7 wäre es übrigens Patt gewesen.',
          },
        ],
      },
    ],
  },
  {
    id: 'taktik',
    title: 'Taktik',
    description: 'Gabel, Fesselung, Spieß und Abzug – so gewinnst du Material.',
    lessons: [
      {
        id: 'gabel',
        title: 'Die Gabel',
        steps: [
          {
            type: 'text',
            text: 'Bei einer Gabel greift eine Figur zwei gegnerische Figuren gleichzeitig an. Der Gegner kann nur eine retten. Besonders gut gabeln Springer.',
            fen: '4k3/2N5/8/3q4/8/8/8/4K3 b - - 0 1',
            arrows: [['c7', 'e8'], ['c7', 'd5']],
          },
          {
            type: 'move',
            text: 'Finde die Springergabel gegen König und Dame!',
            fen: '4k3/pp4pp/8/1N1q4/8/8/PP4PP/4K3 w - - 0 1',
            solution: ['Nc7+', 'Kd7', 'Nxd5'],
            success: 'Gabel! Der König muss ausweichen und die Dame geht verloren.',
          },
          {
            type: 'move',
            text: 'Auch die Dame kann gabeln. Greif König und Turm gleichzeitig an!',
            fen: 'r5k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
            solution: ['Qd5+'],
            success: 'Richtig! Nach dem Königszug schlägt die Dame den Turm auf a8.',
          },
          {
            type: 'move',
            text: 'Sogar ein Bauer kann gabeln. Finde den Zug!',
            fen: '6k1/pp3ppp/2n1b3/8/3P4/8/PP3PPP/3R2K1 w - - 0 1',
            solution: ['d5'],
            success: 'Bauerngabel! Springer und Läufer sind angegriffen – eine Figur geht verloren.',
          },
        ],
      },
      {
        id: 'fesselung',
        title: 'Die Fesselung',
        steps: [
          {
            type: 'text',
            text: 'Bei einer Fesselung steht eine Figur vor einer wertvolleren. Zieht sie weg, wird die Figur dahinter geschlagen. Steht dahinter der König, darf die gefesselte Figur gar nicht ziehen.',
            fen: '4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1',
            arrows: [['b5', 'e8']],
            highlight: ['c6'],
          },
          {
            type: 'move',
            text: 'Fessle die schwarze Dame an ihren König!',
            fen: '6k1/5qpp/8/8/8/1P6/4BPPP/6K1 w - - 0 1',
            solution: ['Bc4'],
            success: 'Die Dame ist gefesselt. Schlägt sie den Läufer, nimmt der Bauer b3 sie.',
          },
          {
            type: 'move',
            text: 'Auch ein Turm kann fesseln. Finde den Zug!',
            fen: '4k3/pp4pp/4q3/8/8/8/PP3KPP/1N1R4 w - - 0 1',
            solution: ['Re1'],
            success: 'Die Dame steht gefesselt auf der e-Linie. Schlägt sie den Turm, nimmt dein König sie – und du bleibst mit dem Springer im Vorteil.',
          },
        ],
      },
      {
        id: 'spiess',
        title: 'Der Spieß',
        steps: [
          {
            type: 'text',
            text: 'Der Spieß ist eine umgekehrte Fesselung: Die wertvollere Figur steht vorne. Sie muss ausweichen – und die Figur dahinter wird geschlagen.',
            fen: '8/R2k3r/8/8/8/8/8/4K3 b - - 0 1',
            arrows: [['a7', 'h7']],
          },
          {
            type: 'move',
            text: 'Spieße König und Turm auf!',
            fen: '8/3k3r/8/8/8/8/8/R3K3 w - - 0 1',
            solution: ['Ra7+'],
            success: 'Der König muss weg, dann schlägt dein Turm den Turm auf h7.',
          },
          {
            type: 'move',
            text: 'Jetzt mit dem Läufer: Gib Schach und gewinne die Dame!',
            fen: '6q1/pp5p/4k3/8/8/8/PP5P/4KB2 w - - 0 1',
            solution: ['Bc4+'],
            success: 'Spieß! Nach dem Königszug fällt die Dame auf g8.',
          },
        ],
      },
      {
        id: 'abzug',
        title: 'Der Abzugsangriff',
        steps: [
          {
            type: 'text',
            text: 'Beim Abzugsangriff zieht eine Figur weg und gibt dabei die Linie für eine andere frei. So entstehen zwei Angriffe auf einmal – besonders stark, wenn der freigelegte Angriff Schach gibt.',
            fen: '4k3/3q4/8/8/4N3/8/8/4RK2 w - - 0 1',
            arrows: [['e1', 'e8']],
            highlight: ['e4'],
          },
          {
            type: 'move',
            text: 'Zieh den Springer mit Abzugsschach weg – am besten so, dass er selbst auch Schach gibt und dabei die Dame angreift!',
            fen: '4k3/3q4/8/8/4N3/8/8/4RK2 w - - 0 1',
            solution: ['Nf6+'],
            success: 'Doppelschach! Gegen zwei Schachs hilft nur ein Königszug – danach schlägt der Springer die Dame. (Nach Sc5+ hätte Schwarz die Dame dazwischenstellen können.)',
          },
        ],
      },
    ],
  },
  {
    id: 'mattbilder',
    title: 'Mattbilder',
    description: 'Typische Mattmuster, die in jeder Partie vorkommen können.',
    lessons: [
      {
        id: 'grundreihe',
        title: 'Grundreihenmatt',
        steps: [
          {
            type: 'text',
            text: 'Hat der König nach der Rochade keine Luft, weil seine eigenen Bauern davor stehen, kann ein Turm oder die Dame ihn auf der Grundreihe mattsetzen.',
            fen: '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
            highlight: ['g8'],
          },
          {
            type: 'move',
            text: 'Setze matt in einem Zug!',
            fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
            solution: ['Rd8#'],
            mate: true,
            success: 'Grundreihenmatt! Ein Bauernzug wie …h6 hätte dem König Luft gegeben.',
          },
          {
            type: 'move',
            text: 'Schwarz verteidigt die Grundreihe. Lenke den Verteidiger ab – Matt in zwei Zügen!',
            fen: '2rr2k1/5ppp/8/8/8/8/3Q1PPP/3R2K1 w - - 0 1',
            solution: ['Qxd8+', 'Rxd8', 'Rxd8#'],
            mate: true,
            success: 'Damenopfer und Matt! Der Turm c8 musste zurückschlagen und konnte die Grundreihe nicht mehr halten.',
          },
        ],
      },
      {
        id: 'ersticktes-matt',
        title: 'Ersticktes Matt',
        steps: [
          {
            type: 'text',
            text: 'Beim erstickten Matt ist der König von seinen eigenen Figuren eingesperrt. Ein Springer setzt ihn matt – er kann ja über alles hinwegspringen.',
            fen: '6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1',
            highlight: ['h8'],
          },
          {
            type: 'move',
            text: 'Setze mit dem Springer matt!',
            fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
            solution: ['Nf7#'],
            mate: true,
            success: 'Ersticktes Matt!',
          },
          {
            type: 'move',
            text: 'Das berühmte Damenopfer: Matt in zwei Zügen!',
            fen: '4r2k/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1',
            solution: ['Qg8+', 'Rxg8', 'Nf7#'],
            mate: true,
            success: 'Wunderschön! Der Turm musste die Dame schlagen und hat damit selbst das letzte Fluchtfeld blockiert.',
          },
        ],
      },
      {
        id: 'schaefermatt',
        title: 'Schäfermatt abwehren',
        steps: [
          {
            type: 'text',
            text: 'Das Schäfermatt ist eine Falle für Anfänger: Dame und Läufer greifen gemeinsam f7 an. Wer nicht aufpasst, ist nach vier Zügen matt.',
            fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
            highlight: ['f7'],
          },
          {
            type: 'move',
            text: 'Du spielst Schwarz. Weiß droht Dxf7 matt. Wehre die Drohung ab!',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
            solution: [['g6', 'Qe7', 'Qf6']],
            success: 'Gut verteidigt! Nach …g6 muss die weiße Dame weichen, und du entwickelst dich mit Tempo.',
          },
        ],
      },
    ],
  },
  {
    id: 'endspiel',
    title: 'Endspiel',
    description: 'Mattsetzen mit wenig Material und Bauern umwandeln.',
    lessons: [
      {
        id: 'damenmatt',
        title: 'Matt mit der Dame',
        steps: [
          {
            type: 'text',
            text: 'Mit König und Dame kannst du jeden König mattsetzen. Der Plan: Treibe den König mit der Dame an den Rand (halte einen Springerzug Abstand) und hole dann deinen König zur Hilfe.',
            fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
          },
          {
            type: 'text',
            text: 'Achtung Patt! Wenn der gegnerische König keinen Zug mehr hat, aber nicht im Schach steht, ist es Remis. Lass ihm immer ein Feld, bis du mattsetzen kannst.',
            fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
          },
          {
            type: 'play',
            text: 'Setze den schwarzen König matt. Stockfish verteidigt sich!',
            fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
            goal: 'mate',
          },
        ],
      },
      {
        id: 'turmmatt',
        title: 'Matt mit dem Turm',
        steps: [
          {
            type: 'text',
            text: 'Auch König und Turm reichen zum Matt. Der Turm sperrt den König Reihe für Reihe ein, dein König hilft dabei. Am Ende steht dein König dem anderen gegenüber und der Turm gibt Matt am Rand.',
            fen: '4k3/R7/4K3/8/8/8/8/8 w - - 0 1',
            arrows: [['a7', 'a8']],
          },
          {
            type: 'play',
            text: 'Setze mit König und Turm matt!',
            fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
            goal: 'mate',
          },
        ],
      },
      {
        id: 'bauernendspiel',
        title: 'Bauer zur Dame',
        steps: [
          {
            type: 'text',
            text: 'Im Bauernendspiel ist die Opposition wichtig: Stehen sich die Könige mit einem Feld Abstand gegenüber, muss der Spieler am Zug ausweichen. Steht dein König vor dem Bauern auf der 6. Reihe, gewinnst du immer.',
            fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
            highlight: ['e6', 'e8'],
          },
          {
            type: 'play',
            text: 'Bring den Bauern zur Dame. Stockfish versucht, dich aufzuhalten!',
            fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
            goal: 'promote',
          },
        ],
      },
    ],
  },
  {
    id: 'eroeffnung',
    title: 'Eröffnungsprinzipien',
    description: 'Drei goldene Regeln für einen guten Start in die Partie.',
    lessons: [
      {
        id: 'prinzipien',
        title: 'Die drei goldenen Regeln',
        steps: [
          {
            type: 'text',
            text: 'Regel 1: Besetze das Zentrum. Die Felder d4, e4, d5 und e5 sind die wichtigsten – von dort aus wirken deine Figuren am stärksten.',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            highlight: ['d4', 'e4', 'd5', 'e5'],
          },
          {
            type: 'move',
            text: 'Spiele einen Zug, der das Zentrum besetzt.',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            solution: [['e4', 'd4']],
            success: 'Sehr gut! Ein Bauer im Zentrum und freie Bahn für deine Figuren.',
          },
          {
            type: 'text',
            text: 'Regel 2: Entwickle deine Figuren – Springer und Läufer zuerst, Richtung Zentrum. Zieh nicht dieselbe Figur mehrmals und hol die Dame nicht zu früh heraus.',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            arrows: [['g1', 'f3'], ['b1', 'c3'], ['f1', 'c4']],
          },
          {
            type: 'move',
            text: 'Entwickle eine Leichtfigur (Springer oder Läufer) Richtung Zentrum.',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            solution: [['Nf3', 'Nc3', 'Bc4', 'Bb5']],
            success: 'Genau so! Jede entwickelte Figur macht deine Stellung stärker.',
          },
          {
            type: 'text',
            text: 'Regel 3: Bring deinen König in Sicherheit – am besten früh rochieren. Ein König in der Mitte wird schnell angegriffen.',
            fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5',
            highlight: ['e1'],
          },
          {
            type: 'move',
            text: 'Bring deinen König in Sicherheit!',
            fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5',
            solution: ['O-O'],
            success: 'Rochiert! Jetzt kennst du die drei goldenen Regeln der Eröffnung.',
          },
        ],
      },
    ],
  },
];

export const ALL_LESSONS = CHAPTERS.flatMap((chapter) =>
  chapter.lessons.map((lesson) => ({ ...lesson, chapterId: chapter.id, chapterTitle: chapter.title })),
);
