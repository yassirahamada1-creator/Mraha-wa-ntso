// Moteur de règles pur du Mraha wa Tso / Mraha wa Ntso (aucune dépendance UI)

export type PlayerId = 0 | 1; // 0 = J1 (bas), 1 = J2 (haut)
export type LoopDir = 1 | -1; // +1 = sens circuit avant, -1 = sens inverse
export type GamePhase = 1 | 2; // 1 = Phase 1 (réserves > 0), 2 = Phase 2 (réserves vides)

export interface MrahaRuleConfig {
  maxNdrazi: number | null; // Défaut: 15 (null = désactivé)
  skipStartOnLoop: boolean; // Défaut: false (case de départ non sautée sur boucle >= 16 graines)
  allowReserveInIntactNyumba: boolean; // Défaut: true (capture avec graine de réserve dans nyumba intacte autorisée)
  allowFreeDirOnPhase1Capture: boolean; // Défaut: true (sens libre si capture immédiate sans sens préalable en phase 1)
  nyumbaSoloTakeTwo: boolean; // Défaut: true (si nyumba est seule case non vide en phase 1, on sème 2 graines)
}

export const DEFAULT_RULE_CONFIG: MrahaRuleConfig = {
  maxNdrazi: 15,
  skipStartOnLoop: false,
  allowReserveInIntactNyumba: true,
  allowFreeDirOnPhase1Capture: true,
  nyumbaSoloTakeTwo: true,
};

export interface Coord {
  row: number; // 0 = J2 ext, 1 = J2 int, 2 = J1 int, 3 = J1 ext
  col: number; // 0..7 (correspond aux colonnes 1..8 vues de J1)
}

export interface MoveStep {
  type: 'place_reserve' | 'pickup' | 'drop' | 'capture' | 'relay';
  row: number;
  col: number;
  hand: number;
  capturedCount?: number;
  capturedFromRow?: number;
  capturedFromCol?: number;
  board: number[][];
  reserves: [number, number];
  player: PlayerId;
}

export interface PendingNyumbaChoice {
  player: PlayerId;
  row: number;
  col: number;
  loopDir: LoopDir;
  isCaptureMode: boolean;
  capturedInTurn: number;
  relaysInTurn: number;
  startRow: number;
  startCol: number;
  startLoopDir: LoopDir;
  usedReserve: boolean;
}

export interface PendingErrorUndo {
  player: PlayerId;
  boardBeforeMove: number[][];
  reservesBeforeMove: [number, number];
  nyumbaIntactBeforeMove: [boolean, boolean];
  capturesBeforeMove: [number, number];
  longestRelayBeforeMove: [number, number];
  turnCountBeforeMove: number;
  firstLoopDir: LoopDir;
}

export interface HistoryEntry {
  turnNumber: number;
  player: PlayerId;
  phase: GamePhase;
  row: number;
  col: number; // 0..7 (affiché col+1)
  loopDir: LoopDir;
  kind: 'capture' | 'ndrazi' | 'trakatra';
  capturedCount: number;
  relaysCount: number;
  usedErrorRight?: boolean;
}

export interface GameStateSnapshot {
  config: MrahaRuleConfig;
  board: number[][];
  reserves: [number, number];
  nyumbaIntact: [boolean, boolean];
  currentTurn: PlayerId;
  captures: [number, number];
  turnCount: number;
  longestRelay: [number, number];
  pendingNyumbaChoice: PendingNyumbaChoice | null;
  pendingErrorUndo: PendingErrorUndo | null;
  forcedRetryDir: LoopDir | null; // Oblige le joueur à rejouer en sens inverse après "Droit à l'erreur"
  usedErrorRightThisTurn: boolean;
  winner: PlayerId | null;
  winReason: string | null;
  lastMove: HistoryEntry | null;
  history: HistoryEntry[];
}

export interface LegalMove {
  row: number;
  col: number;
  loopDir: LoopDir;
  kind: 'capture' | 'ndrazi' | 'trakatra';
  totalCaptures: number;
  relayCount: number;
  resultingState: GameStateSnapshot;
}

export interface MovePreviewInfo {
  pathCoords: Coord[];
  landingCoord: Coord | null;
  captureCols: number[];
  totalCaptures: number;
  relayCount: number;
}

// Circuit de J1 (bas) : sens +1 = interne col 1->8 (0..7), puis externe col 8->1 (7..0)
const RING_0: Coord[] = [
  { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
  { row: 2, col: 4 }, { row: 2, col: 5 }, { row: 2, col: 6 }, { row: 2, col: 7 },
  { row: 3, col: 7 }, { row: 3, col: 6 }, { row: 3, col: 5 }, { row: 3, col: 4 },
  { row: 3, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 0 },
];

// Circuit de J2 (haut) : sens +1 = interne de gauche à droite vue de J2 (col 8->1, donc colIdx 7..0), puis externe (0..7)
const RING_1: Coord[] = [
  { row: 1, col: 7 }, { row: 1, col: 6 }, { row: 1, col: 5 }, { row: 1, col: 4 },
  { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
  { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
  { row: 0, col: 4 }, { row: 0, col: 5 }, { row: 0, col: 6 }, { row: 0, col: 7 },
];

export function getRing(player: PlayerId): Coord[] {
  return player === 0 ? RING_0 : RING_1;
}

export function getInnerRow(player: PlayerId): number {
  return player === 0 ? 2 : 1;
}

export function getOuterRow(player: PlayerId): number {
  return player === 0 ? 3 : 0;
}

export function getNyumbaCoord(player: PlayerId): Coord {
  // J1 : colonne 5 (index 4), J2 : colonne 4 (index 3)
  return player === 0 ? { row: 2, col: 4 } : { row: 1, col: 3 };
}

export function isNyumbaCoord(player: PlayerId, row: number, col: number): boolean {
  const n = getNyumbaCoord(player);
  return n.row === row && n.col === col;
}

export function cloneBoard(board: number[][]): number[][] {
  return board.map((r) => [...r]);
}

export function createInitialGameState(
  startingPlayer: PlayerId = 0,
  config: Partial<MrahaRuleConfig> = {}
): GameStateSnapshot {
  const mergedConfig: MrahaRuleConfig = { ...DEFAULT_RULE_CONFIG, ...config };
  return {
    config: mergedConfig,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0], // row 0: J2 externe
      [0, 2, 2, 6, 0, 0, 0, 0], // row 1: J2 interne (col 4 = 6, col 3 = 2, col 2 = 2 en base 1)
      [0, 0, 0, 0, 6, 2, 2, 0], // row 2: J1 interne (col 5 = 6, col 6 = 2, col 7 = 2 en base 1)
      [0, 0, 0, 0, 0, 0, 0, 0], // row 3: J1 externe
    ],
    reserves: [22, 22],
    nyumbaIntact: [true, true],
    currentTurn: startingPlayer,
    captures: [0, 0],
    turnCount: 0,
    longestRelay: [0, 0],
    pendingNyumbaChoice: null,
    pendingErrorUndo: null,
    forcedRetryDir: null,
    usedErrorRightThisTurn: false,
    winner: null,
    winReason: null,
    lastMove: null,
    history: [],
  };
}

export function getGamePhase(state: GameStateSnapshot): GamePhase {
  return state.reserves[0] === 0 && state.reserves[1] === 0 ? 2 : 1;
}

export function getPlayerBoardSeeds(board: number[][], player: PlayerId): number {
  const r1 = getInnerRow(player);
  const r2 = getOuterRow(player);
  let total = 0;
  for (let c = 0; c < 8; c++) {
    total += board[r1][c] + board[r2][c];
  }
  return total;
}

export function getPlayerTotalSeeds(
  board: number[][],
  player: PlayerId,
  reserves: [number, number]
): number {
  return getPlayerBoardSeeds(board, player) + reserves[player];
}

export function getInnerRowSeeds(board: number[][], player: PlayerId): number {
  const r = getInnerRow(player);
  let total = 0;
  for (let c = 0; c < 8; c++) {
    total += board[r][c];
  }
  return total;
}

export function getTotalGameSeeds(state: GameStateSnapshot): number {
  return (
    getPlayerTotalSeeds(state.board, 0, state.reserves) +
    getPlayerTotalSeeds(state.board, 1, state.reserves)
  );
}

export function isPitOwnedBy(player: PlayerId, row: number): boolean {
  return player === 0 ? row === 2 || row === 3 : row === 0 || row === 1;
}

export function isBiFullPit(board: number[][], player: PlayerId, row: number, col: number): boolean {
  const innerRow = getInnerRow(player);
  if (row !== innerRow) return false;
  const oppInnerRow = getInnerRow(player === 0 ? 1 : 0);
  return board[innerRow][col] >= 1 && board[oppInnerRow][col] >= 1;
}

// Vérifie si le premier semis en Phase 2 déclenche une prise (NDRAZI)
export function doesPhase2MoveCapture(
  board: number[][],
  player: PlayerId,
  startRow: number,
  startCol: number,
  loopDir: LoopDir,
  config: MrahaRuleConfig
): boolean {
  const hand = board[startRow][startCol];
  if (hand < 2) return false;
  if (config.maxNdrazi !== null && hand > config.maxNdrazi) return false;

  const ring = getRing(player);
  const innerRow = getInnerRow(player);
  const oppInnerRow = getInnerRow(player === 0 ? 1 : 0);

  const ringCounts = ring.map((p) => board[p.row][p.col]);
  const startIdx = ring.findIndex((p) => p.row === startRow && p.col === startCol);
  ringCounts[startIdx] = 0;

  let idx = startIdx;
  for (let i = 0; i < hand; i++) {
    idx = loopDir === 1 ? (idx + 1) % 16 : (idx + 15) % 16;
    if (config.skipStartOnLoop && idx === startIdx) {
      idx = loopDir === 1 ? (idx + 1) % 16 : (idx + 15) % 16;
    }
    ringCounts[idx] += 1;
  }

  const dest = ring[idx];
  if (dest.row !== innerRow) return false;

  // La case d'arrivée devait être non vide avant la dernière graine (donc >= 2 maintenant) ET face non vide
  return ringCounts[idx] >= 2 && board[oppInnerRow][dest.col] >= 1;
}

export function hasMandatoryCaptureInTurn(state: GameStateSnapshot, player: PlayerId): boolean {
  if (state.winner !== null) return false;
  const phase = getGamePhase(state);
  const innerRow = getInnerRow(player);
  const oppInnerRow = getInnerRow(player === 0 ? 1 : 0);

  if (phase === 1) {
    if (state.reserves[player] <= 0) return false;
    for (let c = 0; c < 8; c++) {
      if (state.turnCount === 0 && isNyumbaCoord(player, innerRow, c)) continue;
      if (
        !state.config.allowReserveInIntactNyumba &&
        state.nyumbaIntact[player] &&
        isNyumbaCoord(player, innerRow, c)
      ) {
        continue;
      }
      if (state.board[innerRow][c] >= 1 && state.board[oppInnerRow][c] >= 1) {
        return true;
      }
    }
    return false;
  }

  // Phase 2 : Ndrazi
  const rows = [innerRow, getOuterRow(player)];
  for (const r of rows) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] < 2) continue;
      for (const dir of [1, -1] as LoopDir[]) {
        if (doesPhase2MoveCapture(state.board, player, r, c, dir, state.config)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function getAllowedLoopDirsForPit(
  state: GameStateSnapshot,
  player: PlayerId,
  row: number,
  col: number
): LoopDir[] {
  if (
    state.winner !== null ||
    state.currentTurn !== player ||
    state.pendingNyumbaChoice !== null ||
    state.pendingErrorUndo !== null
  ) {
    return [];
  }
  if (!isPitOwnedBy(player, row) || col < 0 || col > 7) return [];
  if (state.board[row][col] < 1) return [];

  const phase = getGamePhase(state);
  const innerRow = getInnerRow(player);
  const outerRow = getOuterRow(player);
  const mandatory = hasMandatoryCaptureInTurn(state, player);

  if (phase === 1) {
    // 1er coup de la partie : Nyumba interdite
    if (state.turnCount === 0 && isNyumbaCoord(player, row, col)) {
      return [];
    }

    if (mandatory) {
      if (!isBiFullPit(state.board, player, row, col)) return [];
      if (
        !state.config.allowReserveInIntactNyumba &&
        state.nyumbaIntact[player] &&
        isNyumbaCoord(player, row, col)
      ) {
        return [];
      }
      const ring = getRing(player);
      const pos = ring.findIndex((p) => p.row === row && p.col === col);
      if (pos <= 1) return [1];
      if (pos >= 6) return [-1];
      return state.config.allowFreeDirOnPhase1Capture ? [1, -1] : [1];
    }

    // Phase 1 Trakatra : priorité à la rangée interne ; externe autorisée seulement si interne vide
    const innerSeeds = getInnerRowSeeds(state.board, player);
    if (innerSeeds > 0) {
      if (row !== innerRow) return [];
      if (state.nyumbaIntact[player] && isNyumbaCoord(player, row, col)) {
        // Interdit sauf si c'est la SEULE case non vide de la rangée interne
        let otherNonEmpty = false;
        for (let c = 0; c < 8; c++) {
          if (c !== col && state.board[innerRow][c] >= 1) {
            otherNonEmpty = true;
            break;
          }
        }
        if (otherNonEmpty) return [];
      }
      return [1, -1];
    } else {
      if (row !== outerRow) return [];
      return [1, -1];
    }
  }

  // Phase 2
  if (mandatory) {
    const dirs: LoopDir[] = [];
    if (doesPhase2MoveCapture(state.board, player, row, col, 1, state.config)) dirs.push(1);
    if (doesPhase2MoveCapture(state.board, player, row, col, -1, state.config)) dirs.push(-1);
    return dirs;
  }

  // Phase 2 Trakatra : jamais un singleton (1 graine)
  if (state.board[row][col] < 2) return [];

  // Priorité rangée interne (>= 2 graines) si disponible
  let hasInnerMulti = false;
  for (let c = 0; c < 8; c++) {
    if (state.board[innerRow][c] >= 2) {
      hasInnerMulti = true;
      break;
    }
  }

  if (hasInnerMulti && row !== innerRow) {
    return [];
  }

  // Si "Droit à l'erreur" vient d'être utilisé, seul le sens inverse est autorisé
  if (state.forcedRetryDir !== null) {
    return [state.forcedRetryDir];
  }

  return [1, -1];
}

export function explainIllegalPit(
  state: GameStateSnapshot,
  player: PlayerId,
  row: number,
  col: number
): string | null {
  if (state.winner !== null) return 'La partie est terminée (Kamu).';
  if (state.currentTurn !== player) return "Ce n'est pas votre tour.";
  if (state.pendingNyumbaChoice) return 'Choisissez d’abord de vous arrêter ou de continuer depuis votre Nyumba.';
  if (state.pendingErrorUndo) return 'Validez votre coup ou utilisez le Droit à l’erreur.';
  if (!isPitOwnedBy(player, row)) return 'Cette case appartient au camp adverse.';
  if (state.board[row][col] === 0) return 'Cette case (ngama) est vide.';

  if (getAllowedLoopDirsForPit(state, player, row, col).length > 0) return null;

  const phase = getGamePhase(state);
  const innerRow = getInnerRow(player);
  const mandatory = hasMandatoryCaptureInTurn(state, player);

  if (phase === 1) {
    if (state.turnCount === 0 && isNyumbaCoord(player, row, col)) {
      return 'Au 1er coup de la partie, il est interdit de commencer par votre Nyumba.';
    }
    if (mandatory) {
      return 'Une prise est obligatoire : vous devez choisir une case bi-pleine de votre rangée interne.';
    }
    if (getInnerRowSeeds(state.board, player) > 0 && row !== innerRow) {
      return 'En phase 1, vous devez jouer en priorité dans votre rangée interne tant qu’elle n’est pas vide.';
    }
    if (state.nyumbaIntact[player] && isNyumbaCoord(player, row, col)) {
      return 'Votre Nyumba intacte est protégée tant qu’il reste une autre case non vide dans votre rangée interne.';
    }
  } else {
    if (mandatory) {
      if (state.board[row][col] === 1) {
        return 'Un seul ntso (1 graine) ne peut pas déclencher un ndrazi : il faut au minimum 2 graines.';
      }
      return state.config.maxNdrazi !== null
        ? `Un ndrazi (prise) est obligatoire avec une case de 2 à ${state.config.maxNdrazi} graines.`
        : 'Un ndrazi (prise) est obligatoire avec une case d’au moins 2 graines.';
    }
    if (state.board[row][col] === 1) {
      return 'Impossible de commencer un trakatra avec une case d’une seule graine (gumwen / singleton).';
    }
    if (row !== innerRow) {
      return 'Pour un trakatra, vous devez jouer en priorité une case à 2 graines ou plus de votre rangée interne.';
    }
  }

  return 'Coup interdit sur cette case.';
}

export function canPlayPit(
  state: GameStateSnapshot,
  player: PlayerId,
  row: number,
  col: number
): boolean {
  return getAllowedLoopDirsForPit(state, player, row, col).length > 0;
}

export function hasAnyLegalMove(state: GameStateSnapshot, player: PlayerId): boolean {
  if (state.pendingNyumbaChoice && state.pendingNyumbaChoice.player === player) return true;
  if (state.pendingErrorUndo && state.pendingErrorUndo.player === player) return true;
  const r1 = getInnerRow(player);
  const r2 = getOuterRow(player);
  for (const r of [r1, r2]) {
    for (let c = 0; c < 8; c++) {
      if (getAllowedLoopDirsForPit(state, player, r, c).length > 0) {
        return true;
      }
    }
  }
  return false;
}

function finalizeTurnState(params: {
  board: number[][];
  reserves: [number, number];
  nyumbaIntact: [boolean, boolean];
  player: PlayerId;
  prevState: GameStateSnapshot;
  isCaptureMode: boolean;
  capturedInTurn: number;
  relaysInTurn: number;
  startRow: number;
  startCol: number;
  startLoopDir: LoopDir;
  usedReserve: boolean;
  offerErrorRight: boolean;
}): GameStateSnapshot {
  const {
    board,
    reserves,
    nyumbaIntact,
    player,
    prevState,
    isCaptureMode,
    capturedInTurn,
    relaysInTurn,
    startRow,
    startCol,
    startLoopDir,
    usedReserve,
    offerErrorRight,
  } = params;

  const opponent: PlayerId = player === 0 ? 1 : 0;
  const phasePlayed = getGamePhase(prevState);

  for (const p of [0, 1] as PlayerId[]) {
    const nCoord = getNyumbaCoord(p);
    if (nyumbaIntact[p] && board[nCoord.row][nCoord.col] === 0) {
      nyumbaIntact[p] = false;
    }
  }

  const newCaptures: [number, number] = [...prevState.captures] as [number, number];
  newCaptures[player] += capturedInTurn;

  const newLongestRelay: [number, number] = [...prevState.longestRelay] as [number, number];
  if (relaysInTurn > newLongestRelay[player]) {
    newLongestRelay[player] = relaysInTurn;
  }

  const moveEntry: HistoryEntry = {
    turnNumber: prevState.turnCount + 1,
    player,
    phase: phasePlayed,
    row: startRow,
    col: startCol,
    loopDir: startLoopDir,
    kind: isCaptureMode ? (phasePlayed === 2 ? 'ndrazi' : 'capture') : 'trakatra',
    capturedCount: capturedInTurn,
    relaysCount: relaysInTurn,
    usedErrorRight: prevState.usedErrorRightThisTurn,
  };

  // Vérification immédiate de fin de partie (KAMU)
  let winner: PlayerId | null = null;
  let winReason: string | null = null;

  if (getInnerRowSeeds(board, opponent) === 0) {
    winner = player;
    winReason = 'Rangée interne adverse vidée (Kamu !)';
  } else if (getInnerRowSeeds(board, player) === 0) {
    winner = opponent;
    winReason = 'Rangée interne du joueur vidée (Kamu !)';
  }

  // Si trakatra en phase 2 et Droit à l'erreur non encore utilisé (et partie non terminée)
  if (
    winner === null &&
    offerErrorRight &&
    phasePlayed === 2 &&
    !isCaptureMode &&
    !prevState.usedErrorRightThisTurn
  ) {
    return {
      config: prevState.config,
      board,
      reserves,
      nyumbaIntact,
      currentTurn: player,
      captures: newCaptures,
      turnCount: prevState.turnCount + 1,
      longestRelay: newLongestRelay,
      pendingNyumbaChoice: null,
      pendingErrorUndo: {
        player,
        boardBeforeMove: cloneBoard(prevState.board),
        reservesBeforeMove: [...prevState.reserves] as [number, number],
        nyumbaIntactBeforeMove: [...prevState.nyumbaIntact] as [boolean, boolean],
        capturesBeforeMove: [...prevState.captures] as [number, number],
        longestRelayBeforeMove: [...prevState.longestRelay] as [number, number],
        turnCountBeforeMove: prevState.turnCount,
        firstLoopDir: startLoopDir,
      },
      forcedRetryDir: null,
      usedErrorRightThisTurn: false,
      winner: null,
      winReason: null,
      lastMove: moveEntry,
      history: [moveEntry, ...prevState.history].slice(0, 60),
    };
  }

  const candidateNext: GameStateSnapshot = {
    config: prevState.config,
    board,
    reserves,
    nyumbaIntact,
    currentTurn: opponent,
    captures: newCaptures,
    turnCount: prevState.turnCount + 1,
    longestRelay: newLongestRelay,
    pendingNyumbaChoice: null,
    pendingErrorUndo: null,
    forcedRetryDir: null,
    usedErrorRightThisTurn: false,
    winner: null,
    winReason: null,
    lastMove: moveEntry,
    history: [moveEntry, ...prevState.history].slice(0, 60),
  };

  if (winner === null && !hasAnyLegalMove(candidateNext, opponent)) {
    winner = player;
    winReason =
      getGamePhase(candidateNext) === 2
        ? 'Adversaire bloqué ou uniquement des singletons (Kamu !)'
        : 'Adversaire bloqué (Kamu !)';
  }

  return {
    ...candidateNext,
    currentTurn: winner !== null ? player : opponent,
    winner,
    winReason,
  };
}

function runSowingLoop(params: {
  board: number[][];
  reserves: [number, number];
  nyumbaIntact: [boolean, boolean];
  player: PlayerId;
  startRingIdx: number;
  startHand: number;
  startDir: LoopDir;
  startOriginIdx: number | null; // pour SKIP_START_ON_LOOP sur boucle >= 16 graines
  isCaptureMode: boolean;
  initialCapturedInTurn: number;
  initialRelaysInTurn: number;
  startRow: number;
  startCol: number;
  startLoopDir: LoopDir;
  usedReserve: boolean;
  prevState: GameStateSnapshot;
  recordSteps: boolean;
  allowInteractivePauses: boolean;
  steps: MoveStep[];
}): GameStateSnapshot {
  const {
    board,
    reserves,
    nyumbaIntact,
    player,
    isCaptureMode,
    startRow,
    startCol,
    startLoopDir,
    usedReserve,
    prevState,
    recordSteps,
    allowInteractivePauses,
    steps,
  } = params;

  const config = prevState.config;
  const phase = getGamePhase(prevState);
  const ring = getRing(player);
  const innerRow = getInnerRow(player);
  const opponent: PlayerId = player === 0 ? 1 : 0;
  const oppInnerRow = getInnerRow(opponent);
  const nyumba = getNyumbaCoord(player);
  const oppNyumba = getNyumbaCoord(opponent);

  let ringIdx = params.startRingIdx;
  let hand = params.startHand;
  let dir = params.startDir;
  let originIdx = params.startOriginIdx;
  let capturedInTurn = params.initialCapturedInTurn;
  let relaysInTurn = params.initialRelaysInTurn;

  let totalIterations = 0;
  const MAX_ITERATIONS = 320;

  while (hand > 0 && totalIterations < MAX_ITERATIONS) {
    totalIterations++;
    ringIdx = dir === 1 ? (ringIdx + 1) % 16 : (ringIdx + 15) % 16;
    if (config.skipStartOnLoop && originIdx !== null && ringIdx === originIdx) {
      ringIdx = dir === 1 ? (ringIdx + 1) % 16 : (ringIdx + 15) % 16;
    }

    const { row: r, col: c } = ring[ringIdx];
    board[r][c] += 1;
    hand -= 1;

    if (recordSteps) {
      steps.push({
        type: 'drop',
        row: r,
        col: c,
        hand,
        board: cloneBoard(board),
        reserves: [...reserves] as [number, number],
        player,
      });
    }

    if (hand === 0) {
      const wasOccupied = board[r][c] >= 2;
      if (!wasOccupied) {
        // Dernière graine dans une case VIDE -> fin du tour
        break;
      }

      // Case non vide : vérifie capture si mode capture
      if (isCaptureMode && r === innerRow && board[oppInnerRow][c] >= 1) {
        const oppSeeds = board[oppInnerRow][c];
        board[oppInnerRow][c] = 0;
        if (oppNyumba.row === oppInnerRow && oppNyumba.col === c) {
          nyumbaIntact[opponent] = false;
        }

        hand = oppSeeds;
        capturedInTurn += oppSeeds;

        if (recordSteps) {
          steps.push({
            type: 'capture',
            row: r,
            col: c,
            hand,
            capturedCount: oppSeeds,
            capturedFromRow: oppInnerRow,
            capturedFromCol: c,
            board: cloneBoard(board),
            reserves: [...reserves] as [number, number],
            player,
          });
        }

        // Vérification immédiate : si la rangée interne adverse vient d'être vidée -> KAMU immédiat !
        if (getInnerRowSeeds(board, opponent) === 0) {
          const targetCorner = ringIdx <= 1 ? 0 : ringIdx >= 6 ? 7 : dir === 1 ? 0 : 7;
          const cornerCoord = ring[targetCorner];
          board[cornerCoord.row][cornerCoord.col] += hand;
          hand = 0;
          break;
        }

        // Coin & sens des graines capturées (section 5)
        if (ringIdx <= 1) {
          dir = 1;
          ringIdx = 15; // prochaine case semée = ring[0] (le coin)
        } else if (ringIdx >= 6) {
          dir = -1;
          ringIdx = 8; // prochaine case semée = ring[7] (le coin)
        } else {
          if (dir === 1) {
            ringIdx = 15;
          } else {
            ringIdx = 8;
          }
        }
        originIdx = null;
      } else {
        // Règle 6.4 : en phase 1, si la dernière graine tombe dans sa propre nyumba intacte,
        // le joueur n'est PAS obligé de continuer (il peut s'arrêter ou continuer en la ramassant)
        if (phase === 1 && nyumbaIntact[player] && r === nyumba.row && c === nyumba.col) {
          if (allowInteractivePauses) {
            return {
              config,
              board,
              reserves,
              nyumbaIntact,
              currentTurn: player,
              captures: prevState.captures,
              turnCount: prevState.turnCount,
              longestRelay: prevState.longestRelay,
              pendingNyumbaChoice: {
                player,
                row: r,
                col: c,
                loopDir: dir,
                isCaptureMode,
                capturedInTurn,
                relaysInTurn,
                startRow,
                startCol,
                startLoopDir,
                usedReserve,
              },
              pendingErrorUndo: null,
              forcedRetryDir: null,
              usedErrorRightThisTurn: prevState.usedErrorRightThisTurn,
              winner: null,
              winReason: null,
              lastMove: prevState.lastMove,
              history: prevState.history,
            };
          } else {
            // Par défaut en mode non-interactif (aperçu/simulation rapide), on s'arrête pour préserver la nyumba
            break;
          }
        }

        // Relais : on ramasse tout et on continue dans le même sens
        relaysInTurn += 1;
        hand = board[r][c];
        board[r][c] = 0;
        if (r === nyumba.row && c === nyumba.col) {
          nyumbaIntact[player] = false;
        }
        originIdx = ringIdx;

        if (recordSteps) {
          steps.push({
            type: 'relay',
            row: r,
            col: c,
            hand,
            board: cloneBoard(board),
            reserves: [...reserves] as [number, number],
            player,
          });
        }
      }
    }
  }

  if (hand > 0) {
    const fallbackCoord = ring[ringIdx];
    board[fallbackCoord.row][fallbackCoord.col] += hand;
  }

  return finalizeTurnState({
    board,
    reserves,
    nyumbaIntact,
    player,
    prevState,
    isCaptureMode,
    capturedInTurn,
    relaysInTurn,
    startRow,
    startCol,
    startLoopDir,
    usedReserve,
    offerErrorRight: allowInteractivePauses,
  });
}

export function executeMove(
  state: GameStateSnapshot,
  player: PlayerId,
  startRow: number,
  startCol: number,
  initialLoopDir: LoopDir,
  recordSteps: boolean = true,
  allowInteractivePauses: boolean = true
): { nextState: GameStateSnapshot; steps: MoveStep[] } {
  const allowedDirs = getAllowedLoopDirsForPit(state, player, startRow, startCol);
  if (!allowedDirs.includes(initialLoopDir)) {
    throw new Error(
      explainIllegalPit(state, player, startRow, startCol) ||
        'Coup invalide selon les règles du Mraha wa Tso.'
    );
  }

  const phase = getGamePhase(state);
  const ring = getRing(player);
  const opponent: PlayerId = player === 0 ? 1 : 0;
  const oppInnerRow = getInnerRow(opponent);
  const nyumba = getNyumbaCoord(player);
  const oppNyumba = getNyumbaCoord(opponent);

  const board = cloneBoard(state.board);
  const reserves: [number, number] = [...state.reserves] as [number, number];
  const nyumbaIntact: [boolean, boolean] = [...state.nyumbaIntact] as [boolean, boolean];
  const steps: MoveStep[] = [];

  const isCaptureMode = hasMandatoryCaptureInTurn(state, player);

  let ringIdx = ring.findIndex((p) => p.row === startRow && p.col === startCol);
  let originIdx: number | null = ringIdx;
  let dir: LoopDir = initialLoopDir;
  let hand = 0;
  let capturedInTurn = 0;

  if (phase === 1) {
    reserves[player] -= 1;
    board[startRow][startCol] += 1;

    if (recordSteps) {
      steps.push({
        type: 'place_reserve',
        row: startRow,
        col: startCol,
        hand: 1,
        board: cloneBoard(board),
        reserves: [...reserves] as [number, number],
        player,
      });
    }

    if (isCaptureMode) {
      // Phase 1 capture immédiate : le contenu de la case bi-pleine reste en place (+1 réserve), on sème la case adverse !
      const oppSeeds = board[oppInnerRow][startCol];
      board[oppInnerRow][startCol] = 0;
      if (oppNyumba.row === oppInnerRow && oppNyumba.col === startCol) {
        nyumbaIntact[opponent] = false;
      }

      hand = oppSeeds;
      capturedInTurn += oppSeeds;

      if (recordSteps) {
        steps.push({
          type: 'capture',
          row: startRow,
          col: startCol,
          hand,
          capturedCount: oppSeeds,
          capturedFromRow: oppInnerRow,
          capturedFromCol: startCol,
          board: cloneBoard(board),
          reserves: [...reserves] as [number, number],
          player,
        });
      }

      // Si la rangée interne adverse est déjà vidée immédiatement -> KAMU !
      if (getInnerRowSeeds(board, opponent) === 0) {
        const targetCorner = ringIdx <= 1 ? 0 : ringIdx >= 6 ? 7 : dir === 1 ? 0 : 7;
        const cornerCoord = ring[targetCorner];
        board[cornerCoord.row][cornerCoord.col] += hand;
        hand = 0;
        const nextState = finalizeTurnState({
          board,
          reserves,
          nyumbaIntact,
          player,
          prevState: state,
          isCaptureMode: true,
          capturedInTurn,
          relaysInTurn: 0,
          startRow,
          startCol,
          startLoopDir: initialLoopDir,
          usedReserve: true,
          offerErrorRight: allowInteractivePauses,
        });
        return { nextState, steps };
      }

      if (ringIdx <= 1) {
        dir = 1;
        ringIdx = 15;
      } else if (ringIdx >= 6) {
        dir = -1;
        ringIdx = 8;
      } else {
        if (dir === 1) {
          ringIdx = 15;
        } else {
          ringIdx = 8;
        }
      }
      originIdx = null;
    } else {
      // Phase 1 Trakatra
      if (
        nyumbaIntact[player] &&
        startRow === nyumba.row &&
        startCol === nyumba.col &&
        state.config.nyumbaSoloTakeTwo
      ) {
        // Règle 6.4 : seule case non vide -> on joue comme s'il n'y avait que 2 graines (la nyumba conserve le reste)
        hand = Math.min(2, board[startRow][startCol]);
        board[startRow][startCol] -= hand;
        originIdx = null;
      } else {
        hand = board[startRow][startCol];
        board[startRow][startCol] = 0;
        if (startRow === nyumba.row && startCol === nyumba.col) {
          nyumbaIntact[player] = false;
        }
      }

      if (recordSteps) {
        steps.push({
          type: 'pickup',
          row: startRow,
          col: startCol,
          hand,
          board: cloneBoard(board),
          reserves: [...reserves] as [number, number],
          player,
        });
      }
    }
  } else {
    // Phase 2
    hand = board[startRow][startCol];
    board[startRow][startCol] = 0;
    if (startRow === nyumba.row && startCol === nyumba.col) {
      nyumbaIntact[player] = false;
    }

    if (recordSteps) {
      steps.push({
        type: 'pickup',
        row: startRow,
        col: startCol,
        hand,
        board: cloneBoard(board),
        reserves: [...reserves] as [number, number],
        player,
      });
    }
  }

  const nextState = runSowingLoop({
    board,
    reserves,
    nyumbaIntact,
    player,
    startRingIdx: ringIdx,
    startHand: hand,
    startDir: dir,
    startOriginIdx: originIdx,
    isCaptureMode,
    initialCapturedInTurn: capturedInTurn,
    initialRelaysInTurn: 0,
    startRow,
    startCol,
    startLoopDir: initialLoopDir,
    usedReserve: phase === 1,
    prevState: state,
    recordSteps,
    allowInteractivePauses,
    steps,
  });

  return { nextState, steps };
}

export function resolveNyumbaChoice(
  state: GameStateSnapshot,
  choice: 'stop' | 'continue',
  recordSteps: boolean = true,
  allowInteractivePauses: boolean = true
): { nextState: GameStateSnapshot; steps: MoveStep[] } {
  if (!state.pendingNyumbaChoice) {
    throw new Error('Aucun choix Nyumba en attente.');
  }

  const pending = state.pendingNyumbaChoice;
  const board = cloneBoard(state.board);
  const reserves: [number, number] = [...state.reserves] as [number, number];
  const nyumbaIntact: [boolean, boolean] = [...state.nyumbaIntact] as [boolean, boolean];
  const steps: MoveStep[] = [];

  if (choice === 'stop') {
    const nextState = finalizeTurnState({
      board,
      reserves,
      nyumbaIntact,
      player: pending.player,
      prevState: state,
      isCaptureMode: pending.isCaptureMode,
      capturedInTurn: pending.capturedInTurn,
      relaysInTurn: pending.relaysInTurn,
      startRow: pending.startRow,
      startCol: pending.startCol,
      startLoopDir: pending.startLoopDir,
      usedReserve: pending.usedReserve,
      offerErrorRight: false,
    });
    return { nextState, steps };
  }

  // Continuer : on ramasse la nyumba (elle perd son statut intact) et on poursuit dans le même sens
  const ring = getRing(pending.player);
  const ringIdx = ring.findIndex((p) => p.row === pending.row && p.col === pending.col);
  const hand = board[pending.row][pending.col];
  board[pending.row][pending.col] = 0;
  nyumbaIntact[pending.player] = false;

  if (recordSteps) {
    steps.push({
      type: 'relay',
      row: pending.row,
      col: pending.col,
      hand,
      board: cloneBoard(board),
      reserves: [...reserves] as [number, number],
      player: pending.player,
    });
  }

  const nextState = runSowingLoop({
    board,
    reserves,
    nyumbaIntact,
    player: pending.player,
    startRingIdx: ringIdx,
    startHand: hand,
    startDir: pending.loopDir,
    startOriginIdx: ringIdx,
    isCaptureMode: pending.isCaptureMode,
    initialCapturedInTurn: pending.capturedInTurn,
    initialRelaysInTurn: pending.relaysInTurn + 1,
    startRow: pending.startRow,
    startCol: pending.startCol,
    startLoopDir: pending.startLoopDir,
    usedReserve: pending.usedReserve,
    prevState: state,
    recordSteps,
    allowInteractivePauses,
    steps,
  });

  return { nextState, steps };
}

// Section 7.3 : Droit à l'erreur (annulation d'un trakatra en Phase 2, obligation de rejouer en sens inverse)
export function applyErrorRightUndo(state: GameStateSnapshot): GameStateSnapshot {
  if (!state.pendingErrorUndo) {
    throw new Error('Le droit à l’erreur n’est pas disponible pour ce coup.');
  }

  const undo = state.pendingErrorUndo;
  const reverseDir: LoopDir = undo.firstLoopDir === 1 ? -1 : 1;

  return {
    config: state.config,
    board: cloneBoard(undo.boardBeforeMove),
    reserves: [...undo.reservesBeforeMove] as [number, number],
    nyumbaIntact: [...undo.nyumbaIntactBeforeMove] as [boolean, boolean],
    currentTurn: undo.player,
    captures: [...undo.capturesBeforeMove] as [number, number],
    turnCount: undo.turnCountBeforeMove,
    longestRelay: [...undo.longestRelayBeforeMove] as [number, number],
    pendingNyumbaChoice: null,
    pendingErrorUndo: null,
    forcedRetryDir: reverseDir,
    usedErrorRightThisTurn: true,
    winner: null,
    winReason: null,
    lastMove: state.history.length > 1 ? state.history[1] : null,
    history: state.history.slice(1),
  };
}

export function confirmTurnAfterTrakatra(state: GameStateSnapshot): GameStateSnapshot {
  if (!state.pendingErrorUndo) {
    return state;
  }

  const player = state.pendingErrorUndo.player;
  const opponent: PlayerId = player === 0 ? 1 : 0;

  const candidateNext: GameStateSnapshot = {
    ...state,
    currentTurn: opponent,
    pendingErrorUndo: null,
    forcedRetryDir: null,
    usedErrorRightThisTurn: false,
  };

  if (!hasAnyLegalMove(candidateNext, opponent)) {
    return {
      ...candidateNext,
      currentTurn: player,
      winner: player,
      winReason: 'Adversaire bloqué ou uniquement des singletons (Kamu !)',
    };
  }

  return candidateNext;
}

export function previewMovePath(
  state: GameStateSnapshot,
  player: PlayerId,
  row: number,
  col: number,
  loopDir: LoopDir
): MovePreviewInfo {
  const { nextState, steps } = executeMove(state, player, row, col, loopDir, true, false);
  const pathCoords: Coord[] = [];
  const captureCols: number[] = [];
  let landingCoord: Coord | null = null;

  for (const s of steps) {
    if (s.type === 'drop') {
      pathCoords.push({ row: s.row, col: s.col });
      landingCoord = { row: s.row, col: s.col };
    } else if (s.type === 'capture' && s.capturedFromCol !== undefined) {
      captureCols.push(s.capturedFromCol);
    }
  }

  return {
    pathCoords,
    landingCoord,
    captureCols,
    totalCaptures: nextState.captures[player] - state.captures[player],
    relayCount: nextState.lastMove?.relaysCount ?? 0,
  };
}

export function getLegalMoves(
  state: GameStateSnapshot,
  player: PlayerId = state.currentTurn
): LegalMove[] {
  if (
    state.winner !== null ||
    state.currentTurn !== player ||
    state.pendingNyumbaChoice !== null ||
    state.pendingErrorUndo !== null
  ) {
    return [];
  }

  const moves: LegalMove[] = [];
  const phase = getGamePhase(state);
  const mandatory = hasMandatoryCaptureInTurn(state, player);
  const rows = [getInnerRow(player), getOuterRow(player)];

  for (const row of rows) {
    for (let col = 0; col < 8; col++) {
      const dirs = getAllowedLoopDirsForPit(state, player, row, col);
      for (const loopDir of dirs) {
        const { nextState } = executeMove(state, player, row, col, loopDir, false, false);
        const totalCaptures = nextState.captures[player] - state.captures[player];
        const relayCount = nextState.lastMove?.relaysCount ?? 0;
        moves.push({
          row,
          col,
          loopDir,
          kind: mandatory ? (phase === 2 ? 'ndrazi' : 'capture') : 'trakatra',
          totalCaptures,
          relayCount,
          resultingState: nextState,
        });
      }
    }
  }

  return moves;
}
