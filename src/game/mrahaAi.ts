import {
  getGamePhase,
  getInnerRow,
  getInnerRowSeeds,
  getLegalMoves,
  getOuterRow,
  getPlayerBoardSeeds,
  getPlayerTotalSeeds,
  hasMandatoryCaptureInTurn,
  isBiFullPit,
  resolveNyumbaChoice,
  type GameStateSnapshot,
  type LegalMove,
  type PlayerId,
} from './mrahaEngine.ts';

export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type BotTier = 'debutant' | 'intermediaire' | 'avance' | 'maitre';

export const BOT_TIER_LABELS: Record<BotTier, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
  maitre: 'Maître',
};

export interface MrahaBotDef {
  id: string;
  name: string;
  elo: number;
  tier: BotTier;
  tagline: string;
  searchDepth: number;
  timeBudgetMs: number;
  topPoolSize: number;
  blunderRate: number;
  evalNoise: number;
}

export const DEFAULT_BOT_ID = 'nour';

export const BOT_ROSTER: MrahaBotDef[] = [
  // Niveau Débutant (400 - 650)
  {
    id: 'nour',
    name: 'Nour',
    elo: 400,
    tier: 'debutant',
    tagline: 'Premiers coups',
    searchDepth: 1,
    timeBudgetMs: 25,
    topPoolSize: 8,
    blunderRate: 0.78,
    evalNoise: 55,
  },
  {
    id: 'yasmine',
    name: 'Yasmine',
    elo: 520,
    tier: 'debutant',
    tagline: 'Apprentie',
    searchDepth: 1,
    timeBudgetMs: 30,
    topPoolSize: 6,
    blunderRate: 0.48,
    evalNoise: 28,
  },
  {
    id: 'salim',
    name: 'Salim',
    elo: 650,
    tier: 'debutant',
    tagline: 'Curieux',
    searchDepth: 1,
    timeBudgetMs: 40,
    topPoolSize: 4,
    blunderRate: 0.24,
    evalNoise: 14,
  },

  // Niveau Intermédiaire (800 - 1100)
  {
    id: 'farida',
    name: 'Farida',
    elo: 800,
    tier: 'intermediaire',
    tagline: 'Méthodique',
    searchDepth: 1,
    timeBudgetMs: 50,
    topPoolSize: 2,
    blunderRate: 0.06,
    evalNoise: 4,
  },
  {
    id: 'kenza',
    name: 'Kenza',
    elo: 950,
    tier: 'intermediaire',
    tagline: 'Tacticienne',
    searchDepth: 2,
    timeBudgetMs: 85,
    topPoolSize: 4,
    blunderRate: 0.28,
    evalNoise: 14,
  },
  {
    id: 'tariq',
    name: 'Tariq',
    elo: 1100,
    tier: 'intermediaire',
    tagline: 'Opportuniste',
    searchDepth: 2,
    timeBudgetMs: 110,
    topPoolSize: 3,
    blunderRate: 0.14,
    evalNoise: 6,
  },

  // Niveau Avancé (1250 - 1550)
  {
    id: 'karim',
    name: 'Karim',
    elo: 1250,
    tier: 'avance',
    tagline: 'Calculateur',
    searchDepth: 2,
    timeBudgetMs: 140,
    topPoolSize: 2,
    blunderRate: 0.05,
    evalNoise: 2,
  },
  {
    id: 'nadia',
    name: 'Nadia',
    elo: 1400,
    tier: 'avance',
    tagline: 'Stratège',
    searchDepth: 2,
    timeBudgetMs: 180,
    topPoolSize: 1,
    blunderRate: 0,
    evalNoise: 0,
  },
  {
    id: 'idriss',
    name: 'Idriss',
    elo: 1550,
    tier: 'avance',
    tagline: 'Solide',
    searchDepth: 4,
    timeBudgetMs: 320,
    topPoolSize: 3,
    blunderRate: 0.18,
    evalNoise: 8,
  },

  // Niveau Maître (1700 - 2050)
  {
    id: 'aicha',
    name: 'Aïcha',
    elo: 1700,
    tier: 'maitre',
    tagline: 'Maîtresse',
    searchDepth: 4,
    timeBudgetMs: 420,
    topPoolSize: 2,
    blunderRate: 0.07,
    evalNoise: 2.5,
  },
  {
    id: 'zaki',
    name: 'Zaki',
    elo: 1850,
    tier: 'maitre',
    tagline: 'Expert',
    searchDepth: 4,
    timeBudgetMs: 580,
    topPoolSize: 2,
    blunderRate: 0.02,
    evalNoise: 0,
  },
  {
    id: 'mfundi',
    name: 'Mfundi',
    elo: 2050,
    tier: 'maitre',
    tagline: 'Grand Maître',
    searchDepth: 4,
    timeBudgetMs: 900,
    topPoolSize: 1,
    blunderRate: 0,
    evalNoise: 0,
  },
];

const LEGACY_DIFFICULTY_TO_BOT_ID: Record<AiDifficulty, string> = {
  easy: 'nour',
  medium: 'kenza',
  hard: 'aicha',
};

export function getBotById(botIdOrDiff?: string | null): MrahaBotDef {
  if (botIdOrDiff) {
    const clean = botIdOrDiff.trim().toLowerCase();
    const direct = BOT_ROSTER.find((b) => b.id === clean);
    if (direct) return direct;
    if (clean in LEGACY_DIFFICULTY_TO_BOT_ID) {
      const mappedId = LEGACY_DIFFICULTY_TO_BOT_ID[clean as AiDifficulty];
      return BOT_ROSTER.find((b) => b.id === mappedId) || BOT_ROSTER[0];
    }
  }
  return BOT_ROSTER[0];
}

export function isBotUnlocked(botId: string, defeatedBotIds: string[]): boolean {
  const idx = BOT_ROSTER.findIndex((b) => b.id === botId);
  if (idx <= 0) return true;
  const prevBot = BOT_ROSTER[idx - 1];
  return defeatedBotIds.includes(prevBot.id);
}

export function getBotUnlockHint(botId: string): string | null {
  const idx = BOT_ROSTER.findIndex((b) => b.id === botId);
  if (idx <= 0) return null;
  const prev = BOT_ROSTER[idx - 1];
  return `Battez ${prev.name} (${prev.elo})`;
}

export function getNextUnlockedBot(
  currentBotId: string,
  defeatedBotIds: string[]
): MrahaBotDef | null {
  const idx = BOT_ROSTER.findIndex((b) => b.id === currentBotId);
  if (idx < 0 || idx + 1 >= BOT_ROSTER.length) return null;
  const next = BOT_ROSTER[idx + 1];
  return isBotUnlocked(next.id, defeatedBotIds) ? next : null;
}

/**
 * Heuristique d'évaluation stratégique du Mraha wa Tso (calibrée par tournoi) :
 * - Contrôle de la rangée interne & danger immédiat de Kamuv
 * - Mobilité réelle (cases >= 2 graines en rangée interne vs singletons vulnérables)
 * - Captures / menaces bi-pleines et équilibre matériel (éviter l'accumulation excessive en Phase 2)
 * - Protection tactique de la Nyumba intacte en Phase 1
 * - Tempo et disponibilité de ndrazi
 */
export function evaluateBoard(state: GameStateSnapshot, aiPlayer: PlayerId): number {
  const opp: PlayerId = aiPlayer === 0 ? 1 : 0;

  if (state.winner === aiPlayer) return 100000 - state.turnCount;
  if (state.winner === opp) return -100000 + state.turnCount;

  const phase = getGamePhase(state);
  const aiInnerRow = getInnerRow(aiPlayer);
  const oppInnerRow = getInnerRow(opp);
  const aiOuterRow = getOuterRow(aiPlayer);
  const oppOuterRow = getOuterRow(opp);

  const aiTotal = getPlayerTotalSeeds(state.board, aiPlayer, state.reserves);
  const oppTotal = getPlayerTotalSeeds(state.board, opp, state.reserves);
  const aiInner = getInnerRowSeeds(state.board, aiPlayer);
  const oppInner = getInnerRowSeeds(state.board, opp);

  let score = 0;

  // 1. Contrôle de la rangée interne & danger de Kamuv
  score += (aiInner - oppInner) * 19;
  if (aiInner <= 4) score -= (5 - aiInner) * 52;
  if (oppInner <= 4) score += (5 - oppInner) * 52;

  // 2. Avantage matériel calibré (en Phase 2, éviter d'engorger le camp adverse ou le sien > 46)
  const totalDiff = aiTotal - oppTotal;
  score += totalDiff * 9.5;
  if (phase === 2 && aiTotal > 46) {
    score -= (aiTotal - 46) * 11;
  }

  // 3. Nyumba intacte (bouclier en Phase 1, flexibilité en Phase 2)
  if (state.nyumbaIntact[aiPlayer]) {
    const nyumbaCol = aiPlayer === 0 ? 4 : 3;
    const nyumbaSeeds = state.board[aiInnerRow][nyumbaCol];
    score += phase === 1 ? 26 + Math.min(18, nyumbaSeeds * 1.5) : 12;
  }
  if (state.nyumbaIntact[opp]) {
    const oppNyumbaCol = opp === 0 ? 4 : 3;
    const oppNyumbaSeeds = state.board[oppInnerRow][oppNyumbaCol];
    score -= phase === 1 ? 26 + Math.min(18, oppNyumbaSeeds * 1.5) : 12;
  }

  // 4. Mobilité, singletons et menaces de capture bi-pleines
  let aiInnerMulti = 0;
  let oppInnerMulti = 0;
  let aiOuterMulti = 0;
  let oppOuterMulti = 0;
  let aiSingletons = 0;
  let oppSingletons = 0;

  for (let c = 0; c < 8; c++) {
    const aiPit = state.board[aiInnerRow][c];
    const oppPit = state.board[oppInnerRow][c];
    const aiOut = state.board[aiOuterRow][c];
    const oppOut = state.board[oppOuterRow][c];

    if (aiPit >= 2) aiInnerMulti++;
    else if (aiPit === 1) aiSingletons++;

    if (oppPit >= 2) oppInnerMulti++;
    else if (oppPit === 1) oppSingletons++;

    if (aiOut >= 2) aiOuterMulti++;
    if (oppOut >= 2) oppOuterMulti++;

    // Menace directe sur un gros tas adverse
    if (aiPit >= 1 && oppPit >= 4) {
      score += Math.min(24, oppPit * 2.7);
    }
    if (oppPit >= 1 && aiPit >= 4) {
      score -= Math.min(26, aiPit * 2.9);
    }

    // Pénalité si ma grosse case interne est exposée à une prise bi-pleine
    if (isBiFullPit(state.board, opp, oppInnerRow, c) && aiPit >= 3) {
      score -= aiPit * 1.8;
    }

    // Bonus d'attaque sur les coins (kotso col 0, 1, 6, 7) qui relancent fort
    if (isBiFullPit(state.board, aiPlayer, aiInnerRow, c) && (c <= 1 || c >= 6)) {
      score += Math.min(12, oppPit * 1.5);
    }
  }

  score += (aiInnerMulti - oppInnerMulti) * 14;
  score += (aiOuterMulti - oppOuterMulti) * 5;
  score -= (aiSingletons - oppSingletons) * 6;

  // 5. Capture forcée au trait
  if (state.currentTurn === aiPlayer && hasMandatoryCaptureInTurn(state, aiPlayer)) {
    score += 18;
  } else if (state.currentTurn === opp && hasMandatoryCaptureInTurn(state, opp)) {
    score -= 20;
  }

  // 6. Présence globale sur le tablier
  const aiBoard = getPlayerBoardSeeds(state.board, aiPlayer);
  const oppBoard = getPlayerBoardSeeds(state.board, opp);
  score += (aiBoard - oppBoard) * 4.5;

  return score;
}

function stateHash(state: GameStateSnapshot): string {
  const b = state.board;
  return (
    `${state.currentTurn}|${state.reserves[0]},${state.reserves[1]}|` +
    `${state.nyumbaIntact[0] ? 1 : 0}${state.nyumbaIntact[1] ? 1 : 0}|` +
    `${b[0].join(',')};${b[1].join(',')};${b[2].join(',')};${b[3].join(',')}`
  );
}

function orderMoves(moves: LegalMove[], turnPlayer: PlayerId): LegalMove[] {
  return [...moves].sort((a, b) => {
    const aWin = a.resultingState.winner === turnPlayer ? 1 : 0;
    const bWin = b.resultingState.winner === turnPlayer ? 1 : 0;
    if (bWin !== aWin) return bWin - aWin;

    const aLose =
      a.resultingState.winner !== null && a.resultingState.winner !== turnPlayer ? 1 : 0;
    const bLose =
      b.resultingState.winner !== null && b.resultingState.winner !== turnPlayer ? 1 : 0;
    if (aLose !== bLose) return aLose - bLose;

    if (b.totalCaptures !== a.totalCaptures) return b.totalCaptures - a.totalCaptures;
    return b.relayCount - a.relayCount;
  });
}

interface TTEntry {
  depth: number;
  score: number;
  flag: 'exact' | 'lower' | 'upper';
}

interface SearchContext {
  maximizingPlayer: PlayerId;
  tt: Map<string, TTEntry>;
  deadlineMs: number;
  nodes: number;
  aborted: boolean;
}

function alphabeta(
  state: GameStateSnapshot,
  depth: number,
  alpha: number,
  beta: number,
  ctx: SearchContext
): number {
  ctx.nodes += 1;
  if ((ctx.nodes & 63) === 0 && Date.now() >= ctx.deadlineMs) {
    ctx.aborted = true;
    return evaluateBoard(state, ctx.maximizingPlayer);
  }

  if (depth === 0 || state.winner !== null) {
    return evaluateBoard(state, ctx.maximizingPlayer);
  }

  const key = stateHash(state);
  const origAlpha = alpha;
  const origBeta = beta;
  const cached = ctx.tt.get(key);
  if (cached && cached.depth >= depth) {
    if (cached.flag === 'exact') return cached.score;
    if (cached.flag === 'lower' && cached.score > alpha) alpha = cached.score;
    else if (cached.flag === 'upper' && cached.score < beta) beta = cached.score;
    if (alpha >= beta) return cached.score;
  }

  const turnPlayer = state.currentTurn;
  const rawMoves = getLegalMoves(state, turnPlayer);
  if (rawMoves.length === 0) {
    return evaluateBoard(state, ctx.maximizingPlayer);
  }

  const moves = orderMoves(rawMoves, turnPlayer);
  let best: number;

  if (turnPlayer === ctx.maximizingPlayer) {
    best = -Infinity;
    for (const move of moves) {
      const val = alphabeta(move.resultingState, depth - 1, alpha, beta, ctx);
      if (ctx.aborted) return best === -Infinity ? val : best;
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
  } else {
    best = Infinity;
    for (const move of moves) {
      const val = alphabeta(move.resultingState, depth - 1, alpha, beta, ctx);
      if (ctx.aborted) return best === Infinity ? val : best;
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
  }

  if (ctx.tt.size < 18000) {
    let flag: TTEntry['flag'] = 'exact';
    if (best <= origAlpha) flag = 'upper';
    else if (best >= origBeta) flag = 'lower';
    ctx.tt.set(key, { depth, score: best, flag });
  }

  return best;
}

export function chooseMoveForBot(
  state: GameStateSnapshot,
  aiPlayer: PlayerId,
  botIdOrDiff: string
): LegalMove | null {
  const moves = getLegalMoves(state, aiPlayer);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const bot = getBotById(botIdOrDiff);
  let ordered = orderMoves(moves, aiPlayer);

  // Coup gagnant immédiat pour les bots non débutants
  if (bot.elo >= 650 && ordered[0].resultingState.winner === aiPlayer) {
    return ordered[0];
  }

  const ctx: SearchContext = {
    maximizingPlayer: aiPlayer,
    tt: new Map<string, TTEntry>(),
    deadlineMs: Date.now() + bot.timeBudgetMs,
    nodes: 0,
    aborted: false,
  };

  let scored = ordered.map((move) => ({
    move,
    score: evaluateBoard(move.resultingState, aiPlayer),
  }));

  // Approfondissement itératif par profondeur paire (2, puis 4) pour éviter l'effet d'horizon impair
  const targetMaxDepth = Math.max(1, bot.searchDepth);
  const depthSteps =
    targetMaxDepth === 1
      ? [1]
      : targetMaxDepth === 2
      ? [2]
      : targetMaxDepth <= 4
      ? [2, 4]
      : [2, 4, 6];

  for (const d of depthSteps) {
    ctx.aborted = false;
    const nextScored: Array<{ move: LegalMove; score: number }> = [];

    for (const item of scored) {
      const s = alphabeta(item.move.resultingState, d - 1, -Infinity, Infinity, ctx);
      if (ctx.aborted) break;
      nextScored.push({ move: item.move, score: s });
    }

    if (!ctx.aborted && nextScored.length === scored.length) {
      nextScored.sort((a, b) => b.score - a.score);
      scored = nextScored;
      ordered = nextScored.map((n) => n.move);
      if (scored[0].score >= 90000) break; // Kamuv forcé trouvé
    } else {
      break;
    }

    if (Date.now() >= ctx.deadlineMs) break;
  }

  // Bruit d'évaluation léger pour les bots intermédiaires/débutants
  if (bot.evalNoise > 0) {
    scored = scored
      .map((s) => ({
        move: s.move,
        score: s.score + (Math.random() * 2 - 1) * bot.evalNoise,
      }))
      .sort((a, b) => b.score - a.score);
  }

  // Erreur humaine réaliste selon l'ELO du bot
  if (bot.blunderRate > 0 && scored.length > 1 && Math.random() < bot.blunderRate) {
    const poolEnd = Math.min(scored.length, bot.topPoolSize);
    const pickIdx = Math.floor(Math.random() * poolEnd);
    return scored[pickIdx].move;
  }

  const bestScore = scored[0].score;
  const tied = scored.filter((item) => Math.abs(item.score - bestScore) < 1e-6);
  return tied[Math.floor(Math.random() * tied.length)].move;
}

export function chooseAiMove(
  state: GameStateSnapshot,
  aiPlayer: PlayerId,
  difficultyOrBotId: AiDifficulty | string
): LegalMove | null {
  return chooseMoveForBot(state, aiPlayer, difficultyOrBotId);
}

export function chooseAiNyumbaDecision(
  state: GameStateSnapshot,
  aiPlayer: PlayerId,
  botId?: string
): 'stop' | 'continue' {
  if (!state.pendingNyumbaChoice || state.pendingNyumbaChoice.player !== aiPlayer) {
    return 'stop';
  }
  const bot = getBotById(botId);
  if (bot.elo <= 520 && Math.random() < 0.45) {
    return Math.random() < 0.5 ? 'stop' : 'continue';
  }

  const { nextState: stopState } = resolveNyumbaChoice(state, 'stop', false, false);
  const { nextState: contState } = resolveNyumbaChoice(state, 'continue', false, false);

  const ctx: SearchContext = {
    maximizingPlayer: aiPlayer,
    tt: new Map<string, TTEntry>(),
    deadlineMs: Date.now() + Math.min(180, bot.timeBudgetMs),
    nodes: 0,
    aborted: false,
  };

  const depth = Math.min(3, bot.searchDepth);
  const stopScore = alphabeta(stopState, depth, -Infinity, Infinity, ctx);
  ctx.aborted = false;
  ctx.deadlineMs = Date.now() + Math.min(180, bot.timeBudgetMs);
  const contScore = alphabeta(contState, depth, -Infinity, Infinity, ctx);

  return contScore > stopScore + 6 ? 'continue' : 'stop';
}
