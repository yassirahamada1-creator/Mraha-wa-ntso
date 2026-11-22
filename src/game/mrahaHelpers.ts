import {
  getGamePhase,
  getInnerRow,
  getLegalMoves,
  getRing,
  previewMovePath,
  type GameStateSnapshot,
  type LoopDir,
  type PlayerId,
} from './mrahaEngine.ts';
import {
  chooseAiMove,
  getBotById,
  type AiDifficulty,
} from './mrahaAi.ts';
import type {
  AutosavedMatch,
  DailyChallengeInfo,
  ProgressionState,
  SavedMatchMove,
  SavedMatchRecord,
} from '../types/app.ts';

export const DIFFICULTY_NAMES: Record<AiDifficulty, string> = {
  easy: 'Nour (400)',
  medium: 'Kenza (1000)',
  hard: 'Aïcha (1600)',
};

export function getDifficultyLabel(d: AiDifficulty | string): string {
  const bot = getBotById(d);
  return `${bot.name} (${bot.elo})`;
}

export interface CulturalAchievement {
  id: string;
  title: string;
  subtitle: string;
  description: string;
}

export const CULTURAL_ACHIEVEMENTS: CulturalAchievement[] = [
  {
    id: 'first_sowing',
    title: 'Premier Semis',
    subtitle: 'U-raha wa kwanza',
    description: 'Terminer votre toute première partie de Mraha wa Tso.',
  },
  {
    id: 'nyumba_guardian',
    title: 'Gardien de la Nyumba',
    subtitle: 'Munia ya nyumba',
    description: 'Remporter une victoire en conservant votre Nyumba intacte.',
  },
  {
    id: 'ndrazi_hunter',
    title: 'Chasseur de Ndrazi',
    subtitle: 'Mfuma wa ndrazi',
    description: 'Capturer au moins 20 tso au fil de vos parties.',
  },
  {
    id: 'relay_king',
    title: 'Roi du Relais',
    subtitle: 'Mzee wa kuregea',
    description: 'Enchaîner un coup avec au moins 4 relais successifs.',
  },
  {
    id: 'archipelago_streak',
    title: 'Fierté de l’Archipel',
    subtitle: 'Ndzima ya masiwa',
    description: 'Enchaîner 3 victoires consécutives.',
  },
  {
    id: 'puzzle_star',
    title: 'Étoile du Tablier',
    subtitle: 'Nyora ya bao',
    description: 'Résoudre au moins 5 puzzles et défis tactiques.',
  },
  {
    id: 'island_strategist',
    title: 'Stratège du Tablier',
    subtitle: 'Mhandisi wa bao',
    description: 'Remporter 10 victoires au total.',
  },
  {
    id: 'master_of_tso',
    title: 'Maître du Tso',
    subtitle: 'Mfundi Mkuu',
    description: 'Battre un bot ≥ 1600 ELO ou obtenir les 10 étoiles des puzzles.',
  },
];

/**
 * Détecte les cases de la rangée interne du joueur `player` actuellement menacées
 * par une prise adverse immédiate au prochain tour adverse.
 */
export function getThreatenedPitsForPlayer(
  state: GameStateSnapshot,
  player: PlayerId
): Set<string> {
  const threatened = new Set<string>();
  if (state.winner !== null) return threatened;

  const opp: PlayerId = player === 0 ? 1 : 0;
  const playerInnerRow = getInnerRow(player);

  const hypotheticalOppState: GameStateSnapshot = {
    ...state,
    currentTurn: opp,
    pendingNyumbaChoice: null,
    pendingErrorUndo: null,
    forcedRetryDir: null,
  };

  const oppMoves = getLegalMoves(hypotheticalOppState, opp);
  for (const move of oppMoves) {
    if (move.totalCaptures <= 0) continue;
    const preview = previewMovePath(
      hypotheticalOppState,
      opp,
      move.row,
      move.col,
      move.loopDir
    );
    for (const col of preview.captureCols) {
      if (state.board[playerInnerRow][col] > 0) {
        threatened.add(`${playerInnerRow}-${col}`);
      }
    }
  }

  return threatened;
}

export interface SmartHintResult {
  row: number;
  col: number;
  loopDir: LoopDir;
  totalCaptures: number;
  explanation: string;
}

export function getSmartHint(
  state: GameStateSnapshot,
  player: PlayerId
): SmartHintResult | null {
  const move = chooseAiMove(state, player, 'mfundi');
  if (!move) return null;

  const ring = getRing(player);
  const startIdx = ring.findIndex((p) => p.row === move.row && p.col === move.col);
  const nextPos = ring[(startIdx + (move.loopDir === 1 ? 1 : 15)) % 16];
  const isCornerStart = getGamePhase(state) === 1 && move.totalCaptures > 0;

  let dirWord = '';
  if (isCornerStart) {
    dirWord = move.loopDir === 1 ? 'depuis le coin gauche' : 'depuis le coin droit';
  } else if (nextPos.row === move.row) {
    dirWord = nextPos.col > move.col ? 'vers la droite' : 'vers la gauche';
  } else {
    dirWord = move.col === 0 ? 'en tournant à gauche' : 'en tournant à droite';
  }

  let explanation = '';
  if (move.totalCaptures > 0) {
    explanation = `Conseil : joue cette case ${dirWord} pour capturer ${move.totalCaptures} graine${
      move.totalCaptures > 1 ? 's' : ''
    } !`;
  } else if (move.relayCount >= 2) {
    explanation = `Conseil : joue cette case ${dirWord} pour enchaîner ${move.relayCount} relais et préparer une prise.`;
  } else {
    explanation = `Conseil : joue cette case ${dirWord} pour protéger ta rangée interne.`;
  }

  return {
    row: move.row,
    col: move.col,
    loopDir: move.loopDir,
    totalCaptures: move.totalCaptures,
    explanation,
  };
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyChallenge(progression: ProgressionState): DailyChallengeInfo {
  const dateKey = getTodayDateKey();
  const hash = dateKey.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const pool: Omit<DailyChallengeInfo, 'dateKey' | 'completed'>[] = [
    {
      id: 'daily_win',
      title: 'Défi du jour : Remporter une partie',
      description: 'Gagne un duel contre un bot ou en ligne.',
      targetType: 'win_any',
    },
    {
      id: 'daily_captures',
      title: 'Défi du jour : Chasseur de Tso',
      description: 'Réalise au moins 6 captures dans une même partie.',
      targetType: 'captures_6',
    },
    {
      id: 'daily_star',
      title: 'Défi du jour : Puzzle tactique',
      description: 'Résous un puzzle « Gagne en 1 ou 2 coups ».',
      targetType: 'challenge_star',
    },
  ];
  const chosen = pool[hash % pool.length];
  return {
    ...chosen,
    dateKey,
    completed: progression.dailyCompletedDate === dateKey,
  };
}

const DEFAULT_PROGRESSION: ProgressionState = {
  completedGames: 0,
  wins: 0,
  streakDays: 0,
  lastPlayDate: null,
  solvedChallengeIds: [],
  dailyCompletedDate: null,
  unlockedAchievements: [],
  currentWinStreak: 0,
  bestWinStreak: 0,
  totalCaptures: 0,
  bestRelay: 0,
  winsVsHard: 0,
  defeatedBotIds: [],
  keptNyumbaWins: 0,
  completedInteractiveTutorial: false,
};

export function evaluateAchievements(prog: ProgressionState): string[] {
  const set = new Set<string>(prog.unlockedAchievements);
  if (prog.completedGames >= 1) set.add('first_sowing');
  if (prog.keptNyumbaWins >= 1) set.add('nyumba_guardian');
  if (prog.totalCaptures >= 20) set.add('ndrazi_hunter');
  if (prog.bestRelay >= 4) set.add('relay_king');
  if (prog.bestWinStreak >= 3) set.add('archipelago_streak');
  if (prog.solvedChallengeIds.length >= 5) set.add('puzzle_star');
  if (prog.wins >= 10) set.add('island_strategist');
  if (
    prog.winsVsHard >= 1 ||
    prog.defeatedBotIds.includes('aicha') ||
    prog.defeatedBotIds.includes('zaki') ||
    prog.defeatedBotIds.includes('mfundi') ||
    prog.solvedChallengeIds.length >= 10
  ) {
    set.add('master_of_tso');
  }
  return Array.from(set);
}

export function loadProgression(): ProgressionState {
  try {
    const raw = localStorage.getItem('mraha_progression');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressionState>;
      const merged: ProgressionState = {
        ...DEFAULT_PROGRESSION,
        ...parsed,
        solvedChallengeIds: Array.isArray(parsed.solvedChallengeIds)
          ? parsed.solvedChallengeIds
          : [],
        unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
          ? parsed.unlockedAchievements
          : [],
        defeatedBotIds: Array.isArray(parsed.defeatedBotIds)
          ? parsed.defeatedBotIds
          : [],
      };
      merged.unlockedAchievements = evaluateAchievements(merged);
      return merged;
    }
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_PROGRESSION };
}

export function saveProgression(next: ProgressionState): void {
  try {
    localStorage.setItem('mraha_progression', JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export function recordGameProgression(
  prev: ProgressionState,
  didWin: boolean,
  captures: number,
  options?: {
    longestRelay?: number;
    difficulty?: AiDifficulty;
    botId?: string;
    isSolo?: boolean;
    keptNyumbaIntact?: boolean;
  }
): { next: ProgressionState; newlyUnlocked: CulturalAchievement[] } {
  const today = getTodayDateKey();
  const daily = getDailyChallenge(prev);

  let streakDays = prev.streakDays;
  if (prev.lastPlayDate !== today) {
    if (prev.lastPlayDate) {
      const prevDate = new Date(`${prev.lastPlayDate}T00:00:00`);
      const curDate = new Date(`${today}T00:00:00`);
      const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / 86400000);
      streakDays = diffDays === 1 ? Math.max(1, prev.streakDays + 1) : 1;
    } else {
      streakDays = 1;
    }
  }

  let dailyCompletedDate = prev.dailyCompletedDate;
  if (dailyCompletedDate !== today) {
    if (daily.targetType === 'win_any' && didWin) dailyCompletedDate = today;
    if (daily.targetType === 'captures_6' && captures >= 6) dailyCompletedDate = today;
  }

  const currentWinStreak = didWin ? prev.currentWinStreak + 1 : 0;
  const bestWinStreak = Math.max(prev.bestWinStreak, currentWinStreak);
  const bestRelay = Math.max(prev.bestRelay, options?.longestRelay ?? 0);
  const resolvedBotId = options?.botId || (options?.difficulty ? getBotById(options.difficulty).id : undefined);
  const defeatedBotIds =
    didWin && options?.isSolo && resolvedBotId && !prev.defeatedBotIds.includes(resolvedBotId)
      ? [...prev.defeatedBotIds, resolvedBotId]
      : prev.defeatedBotIds;

  const isMasterBot =
    ['aicha', 'zaki', 'mfundi'].includes(resolvedBotId || '') || options?.difficulty === 'hard';
  const winsVsHard =
    prev.winsVsHard + (didWin && options?.isSolo && isMasterBot ? 1 : 0);
  const keptNyumbaWins =
    prev.keptNyumbaWins + (didWin && options?.keptNyumbaIntact ? 1 : 0);

  const draft: ProgressionState = {
    ...prev,
    completedGames: prev.completedGames + 1,
    wins: prev.wins + (didWin ? 1 : 0),
    streakDays,
    lastPlayDate: today,
    dailyCompletedDate,
    currentWinStreak,
    bestWinStreak,
    totalCaptures: prev.totalCaptures + Math.max(0, captures),
    bestRelay,
    winsVsHard,
    defeatedBotIds,
    keptNyumbaWins,
  };

  const nextAchievements = evaluateAchievements(draft);
  const newlyUnlocked = CULTURAL_ACHIEVEMENTS.filter(
    (a) => nextAchievements.includes(a.id) && !prev.unlockedAchievements.includes(a.id)
  );
  const next: ProgressionState = {
    ...draft,
    unlockedAchievements: nextAchievements,
  };
  saveProgression(next);
  return { next, newlyUnlocked };
}

const MATCH_HISTORY_KEY = 'mraha_match_history';
const AUTOSAVE_KEY = 'mraha_autosave_match';

export function loadLocalMatchHistory(): SavedMatchRecord[] {
  try {
    const raw = localStorage.getItem(MATCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedMatchRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalMatchHistory(record: SavedMatchRecord): SavedMatchRecord[] {
  const existing = loadLocalMatchHistory().filter((r) => r.id !== record.id);
  const updated = [record, ...existing].slice(0, 25);
  try {
    localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore quota errors
  }
  return updated;
}

export function loadAutosavedMatch(): AutosavedMatch | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutosavedMatch;
    if (!parsed || !parsed.gameState || parsed.gameState.winner !== null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAutosavedMatch(snapshot: AutosavedMatch): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors
  }
}

export function clearAutosavedMatch(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
}

export interface MoveAnalysisResult {
  quality: 'optimal' | 'good' | 'improvable';
  badge: string;
  comment: string;
}

export function analyzeSavedMove(move: SavedMatchMove): MoveAnalysisResult {
  if (move.capturedInTurn > 0) {
    return {
      quality: 'optimal',
      badge: `Prise (${move.capturedInTurn} tso)`,
      comment: `Excellente prise de ${move.capturedInTurn} graine${
        move.capturedInTurn > 1 ? 's' : ''
      } avec ${move.relaysInTurn} relais.`,
    };
  }

  const best = chooseAiMove(move.stateBefore, move.player, 'hard');
  if (!best) {
    return {
      quality: 'good',
      badge: 'Coup unique',
      comment: 'Seule option disponible dans cette position.',
    };
  }

  if (best.row === move.row && best.col === move.col && best.loopDir === move.loopDir) {
    return {
      quality: 'optimal',
      badge: 'Coup optimal',
      comment:
        move.relaysInTurn >= 2
          ? `Meilleur coup tactique avec ${move.relaysInTurn} relais enchaînés.`
          : 'Meilleur placement recommandé par le Maître.',
    };
  }

  if (best.totalCaptures > 0) {
    return {
      quality: 'improvable',
      badge: 'Prise manquée',
      comment: `Une capture de ${best.totalCaptures} tso était possible depuis col. ${best.col + 1}.`,
    };
  }

  return {
    quality: 'good',
    badge: move.relaysInTurn >= 2 ? `Relais (${move.relaysInTurn})` : 'Placement sûr',
    comment:
      best.relayCount > move.relaysInTurn + 1
        ? `Bon coup, mais la col. ${best.col + 1} offrait un relais de ${best.relayCount}.`
        : 'Coup solide pour contrôler la rangée interne.',
  };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}
