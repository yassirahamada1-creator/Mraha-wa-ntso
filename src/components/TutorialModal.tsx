import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Lock,
  RotateCcw,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import {
  applyErrorRightUndo,
  canPlayPit,
  confirmTurnAfterTrakatra,
  createInitialGameState,
  DEFAULT_RULE_CONFIG,
  executeMove,
  getAllowedLoopDirsForPit,
  isNyumbaCoord,
  resolveNyumbaChoice,
  type GameStateSnapshot,
  type LoopDir,
} from '../game/mrahaEngine';
import { chooseAiMove, chooseAiNyumbaDecision } from '../game/mrahaAi';
import { UI_STRINGS } from '../i18n/translations';
import { soundEngine } from '../utils/sound';
import { SeedCluster } from './SeedCluster';
import { getBoardTheme } from '../utils/themes';
import type { BoardThemeId, UiLanguage } from '../types/app';

interface TutorialModalProps {
  initialMode?: 'tutorial' | 'puzzles';
  language?: UiLanguage;
  solvedChallengeIds: number[];
  onSolveChallenge: (challengeId: number) => void;
  onCompleteTutorial?: () => void;
  onClose: () => void;
  onStartGuidedPractice?: () => void;
  themeId?: BoardThemeId;
}

interface VisualTutorialStep {
  id: number;
  labelKey: 'stepHold' | 'stepSlide' | 'stepCapture' | 'stepNyumba';
  targetPit: { row: number; col: number };
  gesture: 'hold' | 'slide-right' | 'slide-left';
  buildState: () => GameStateSnapshot;
  isDone: (state: GameStateSnapshot) => boolean;
}

interface ChallengeDef {
  id: number;
  title: string;
  goal: string;
  requireErrorRight?: boolean;
  twoMovePuzzle?: boolean;
  buildState: () => GameStateSnapshot;
  isSolved: (state: GameStateSnapshot, usedErrorRight: boolean, movesPlayed: number) => boolean;
}

function makeCustomState(
  board: number[][],
  reserves: [number, number],
  nyumbaIntact: [boolean, boolean],
  turnCount: number
): GameStateSnapshot {
  const base = createInitialGameState(0, DEFAULT_RULE_CONFIG);
  return {
    ...base,
    board: board.map((r) => [...r]),
    reserves: [...reserves] as [number, number],
    nyumbaIntact: [...nyumbaIntact] as [boolean, boolean],
    turnCount,
    currentTurn: 0,
  };
}

// 4 étapes purement visuelles jouées sur mini-plateau avec main animée (zéro écran de texte)
const VISUAL_TUTORIAL_STEPS: VisualTutorialStep[] = [
  {
    id: 1,
    labelKey: 'stepHold',
    targetPit: { row: 2, col: 5 },
    gesture: 'slide-right',
    buildState: () => createInitialGameState(0, DEFAULT_RULE_CONFIG),
    isDone: (s) => s.turnCount >= 1 && s.pendingErrorUndo === null,
  },
  {
    id: 2,
    labelKey: 'stepSlide',
    targetPit: { row: 2, col: 5 },
    gesture: 'slide-left',
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 4, 0],
          [0, 0, 0, 0, 0, 2, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [0, 0],
        [false, false],
        40
      ),
    isDone: (s) => s.turnCount >= 41 && s.pendingErrorUndo === null,
  },
  {
    id: 3,
    labelKey: 'stepCapture',
    targetPit: { row: 2, col: 6 },
    gesture: 'hold',
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 2, 0, 6, 0, 0, 5, 0],
          [0, 0, 0, 0, 6, 0, 2, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [18, 18],
        [true, true],
        4
      ),
    isDone: (s) => s.captures[0] >= 5,
  },
  {
    id: 4,
    labelKey: 'stepNyumba',
    targetPit: { row: 2, col: 6 },
    gesture: 'slide-left',
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 3, 3, 6, 0, 0, 0, 0],
          [0, 0, 0, 0, 6, 0, 1, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [15, 15],
        [true, true],
        6
      ),
    isDone: (s) => s.turnCount >= 7 && s.nyumbaIntact[0] === true,
  },
];

const CHALLENGES: ChallengeDef[] = [
  {
    id: 1,
    title: '1. La Boucle',
    goal: 'Joue une case droite de la Nyumba.',
    buildState: () => createInitialGameState(0, DEFAULT_RULE_CONFIG),
    isSolved: (s) => s.turnCount >= 1 && s.pendingErrorUndo === null,
  },
  {
    id: 2,
    title: '2. Ouverture',
    goal: 'Démarre sans toucher la Nyumba.',
    buildState: () => createInitialGameState(0, DEFAULT_RULE_CONFIG),
    isSolved: (s) => s.turnCount >= 1 && s.pendingErrorUndo === null,
  },
  {
    id: 3,
    title: '3. Prise Phase 1',
    goal: 'Prends les 5 graines d’en face.',
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 2, 0, 6, 0, 0, 5, 0],
          [0, 0, 0, 0, 6, 0, 2, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [18, 18],
        [true, true],
        4
      ),
    isSolved: (s) => s.captures[0] >= 5,
  },
  {
    id: 4,
    title: '4. Munia',
    goal: 'Garde ta Nyumba intacte.',
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 3, 3, 6, 0, 0, 0, 0],
          [0, 0, 0, 0, 6, 0, 1, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [15, 15],
        [true, true],
        6
      ),
    isSolved: (s) => s.turnCount >= 7 && s.nyumbaIntact[0] === true,
  },
  {
    id: 5,
    title: '5. Ndrazi',
    goal: 'Capture dès le premier semis.',
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 5, 0, 0, 0, 0],
          [0, 2, 0, 2, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [0, 0],
        [false, false],
        44
      ),
    isSolved: (s) => s.captures[0] >= 5,
  },
  {
    id: 6,
    title: '6. Trakatra',
    goal: 'Joue la rangée interne (sans singleton).',
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 4, 0],
          [0, 0, 1, 0, 0, 2, 0, 0],
          [0, 0, 0, 0, 3, 0, 0, 0],
        ],
        [0, 0],
        [false, false],
        44
      ),
    isSolved: (s) => s.turnCount >= 45 && s.pendingErrorUndo === null,
  },
  {
    id: 7,
    title: '7. Droit à l’erreur',
    goal: 'Annule puis rejoue dans l’autre sens.',
    requireErrorRight: true,
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 4, 0],
          [0, 0, 0, 0, 3, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [0, 0],
        [false, false],
        44
      ),
    isSolved: (s, usedErr) => usedErr && s.turnCount >= 45 && s.pendingErrorUndo === null,
  },
  {
    id: 8,
    title: '8. Kamuv !',
    goal: 'Vide la rangée interne adverse.',
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 4, 0, 0, 0],
          [0, 0, 5, 0, 0, 0, 0, 0],
          [2, 0, 3, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [0, 0],
        [false, false],
        50
      ),
    isSolved: (s) => s.winner === 0,
  },
  {
    id: 9,
    title: '9. Relais',
    goal: 'Enchaîne au moins 1 relais.',
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 4, 0],
          [0, 0, 0, 0, 2, 1, 2, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [0, 0],
        [false, false],
        45
      ),
    isSolved: (s) => s.longestRelay[0] >= 1 && s.turnCount >= 46 && s.pendingErrorUndo === null,
  },
  {
    id: 10,
    title: '10. Gagne en 2 coups',
    goal: 'Prépare le piège puis Kamuv !',
    twoMovePuzzle: true,
    buildState: () =>
      makeCustomState(
        [
          [0, 0, 0, 2, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 1],
          [0, 2, 0, 0, 0, 1, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        [1, 0],
        [false, false],
        40
      ),
    isSolved: (s, _err, movesPlayed) => s.winner === 0 && movesPlayed <= 2,
  },
];

function AnimatedHandIcon({ gesture }: { gesture: 'hold' | 'slide-right' | 'slide-left' }) {
  return (
    <div
      className={`pointer-events-none absolute -bottom-5 left-1/2 z-40 -translate-x-1/2 ${
        gesture === 'hold' ? 'animate-hand-hold' : 'animate-hand-slide'
      }`}
      style={
        gesture === 'slide-left'
          ? { animationDirection: 'reverse' }
          : undefined
      }
      aria-hidden="true"
    >
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
        <circle cx="15" cy="9" r="6" fill="rgba(242,180,65,0.28)" />
        <path
          d="M14 6 C14 4.3 16.5 4.3 16.5 6 V16.5 C17.4 15.8 19 16 19.5 17.2 C20.4 16.6 22 16.8 22.5 18 C23.4 17.5 25 18 25.2 19.5 L25.4 24.5 C25.4 28.4 22.3 31.5 18.4 31.5 H16.2 C13.6 31.5 11.4 30.2 10.1 28.1 L7.6 23.6 C6.9 22.4 7.7 20.9 9 20.9 C9.8 20.9 10.6 21.3 11.1 22 L14 25.5 V6 Z"
          fill="#FFF7E8"
          stroke="#1C1007"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function TutorialModal({
  initialMode = 'tutorial',
  language = 'fr',
  solvedChallengeIds,
  onSolveChallenge,
  onCompleteTutorial,
  onClose,
  onStartGuidedPractice,
  themeId = 'mahogany',
}: TutorialModalProps) {
  const strings = UI_STRINGS[language];
  const [mode, setMode] = useState<'tutorial' | 'puzzles'>(initialMode);

  // 4-step visual tutorial state
  const [tutIdx, setTutIdx] = useState(0);
  const [tutCompletedSteps, setTutCompletedSteps] = useState<number[]>([]);
  const [tutState, setTutState] = useState<GameStateSnapshot>(() =>
    VISUAL_TUTORIAL_STEPS[0].buildState()
  );

  // Puzzles state
  const firstUnsolvedIdx = useMemo(() => {
    const idx = CHALLENGES.findIndex((c) => !solvedChallengeIds.includes(c.id));
    return idx === -1 ? 0 : idx;
  }, [solvedChallengeIds]);
  const [stepIndex, setStepIndex] = useState<number>(firstUnsolvedIdx);
  const [puzzleState, setPuzzleState] = useState<GameStateSnapshot>(() =>
    CHALLENGES[firstUnsolvedIdx].buildState()
  );
  const [movesPlayedInPuzzle, setMovesPlayedInPuzzle] = useState(0);

  const [selectedPit, setSelectedPit] = useState<{ row: number; col: number } | null>(null);
  const [usedErrorRightInAttempt, setUsedErrorRightInAttempt] = useState(false);
  const [justSolved, setJustSolved] = useState(false);

  const theme = getBoardTheme(themeId);
  const tutStep = VISUAL_TUTORIAL_STEPS[tutIdx];
  const challenge = CHALLENGES[stepIndex];

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const activeBoardState = mode === 'tutorial' ? tutState : puzzleState;

  const maxUnlockedIdx = useMemo(() => {
    let unlocked = 0;
    for (let i = 0; i < CHALLENGES.length; i++) {
      if (solvedChallengeIds.includes(CHALLENGES[i].id)) {
        unlocked = Math.min(CHALLENGES.length - 1, i + 1);
      } else {
        break;
      }
    }
    return unlocked;
  }, [solvedChallengeIds]);

  const loadTutStep = (idx: number) => {
    setTutIdx(idx);
    setTutState(VISUAL_TUTORIAL_STEPS[idx].buildState());
    setSelectedPit(null);
    setJustSolved(false);
  };

  const loadChallenge = (idx: number) => {
    setStepIndex(idx);
    setPuzzleState(CHALLENGES[idx].buildState());
    setMovesPlayedInPuzzle(0);
    setSelectedPit(null);
    setUsedErrorRightInAttempt(false);
    setJustSolved(false);
  };

  const evaluateCompletion = (
    nextState: GameStateSnapshot,
    errRightUsed: boolean,
    nextMovesPlayed: number
  ) => {
    if (mode === 'tutorial') {
      if (tutStep.isDone(nextState)) {
        soundEngine.playVictory();
        setJustSolved(true);
        const nextCompleted = tutCompletedSteps.includes(tutStep.id)
          ? tutCompletedSteps
          : [...tutCompletedSteps, tutStep.id];
        setTutCompletedSteps(nextCompleted);
        if (tutIdx === VISUAL_TUTORIAL_STEPS.length - 1) {
          onCompleteTutorial?.();
        }
        return true;
      }
      return false;
    }

    if (challenge.isSolved(nextState, errRightUsed, nextMovesPlayed)) {
      soundEngine.playVictory();
      setJustSolved(true);
      onSolveChallenge(challenge.id);
      return true;
    }
    return false;
  };

  const runOpponentAutoReplyForTwoMovePuzzle = (afterP1State: GameStateSnapshot) => {
    let s = afterP1State;
    if (s.pendingNyumbaChoice && s.pendingNyumbaChoice.player === 1) {
      const dec = chooseAiNyumbaDecision(s, 1);
      s = resolveNyumbaChoice(s, dec, false, false).nextState;
    }
    if (s.winner === null && s.currentTurn === 1) {
      const oppMove = chooseAiMove(s, 1, 'hard');
      if (oppMove) {
        s = executeMove(s, 1, oppMove.row, oppMove.col, oppMove.loopDir, false, false).nextState;
        if (s.pendingNyumbaChoice && s.pendingNyumbaChoice.player === 1) {
          const dec = chooseAiNyumbaDecision(s, 1);
          s = resolveNyumbaChoice(s, dec, false, false).nextState;
        }
        if (s.pendingErrorUndo && s.pendingErrorUndo.player === 1) {
          s = confirmTurnAfterTrakatra(s);
        }
      }
    }
    return s;
  };

  const handlePlayDir = (row: number, col: number, loopDir: LoopDir) => {
    const current = activeBoardState;
    const { nextState } = executeMove(current, 0, row, col, loopDir, false, true);
    setSelectedPit(null);

    if (nextState.captures[0] > current.captures[0]) {
      soundEngine.playCapture();
    } else {
      soundEngine.playSeedDrop(0);
    }

    let resolvedState = nextState;
    if (resolvedState.pendingErrorUndo && (mode === 'tutorial' || !challenge.requireErrorRight)) {
      resolvedState = confirmTurnAfterTrakatra(resolvedState);
    }

    const nextMovesPlayed = movesPlayedInPuzzle + 1;

    if (mode === 'tutorial') {
      setTutState(resolvedState);
      if (!resolvedState.pendingNyumbaChoice) {
        evaluateCompletion(resolvedState, false, nextMovesPlayed);
      }
      return;
    }

    if (challenge.twoMovePuzzle && nextMovesPlayed === 1 && resolvedState.winner === null) {
      const afterOpp = runOpponentAutoReplyForTwoMovePuzzle(resolvedState);
      setMovesPlayedInPuzzle(1);
      setPuzzleState(afterOpp);
      return;
    }

    setMovesPlayedInPuzzle(nextMovesPlayed);
    setPuzzleState(resolvedState);
    if (!resolvedState.pendingNyumbaChoice && !resolvedState.pendingErrorUndo) {
      evaluateCompletion(resolvedState, usedErrorRightInAttempt, nextMovesPlayed);
    }
  };

  const handleTapPit = (row: number, col: number) => {
    const current = activeBoardState;
    if (justSolved || current.pendingNyumbaChoice || current.pendingErrorUndo) return;
    if (!canPlayPit(current, 0, row, col)) {
      setSelectedPit(null);
      return;
    }
    const dirs = getAllowedLoopDirsForPit(current, 0, row, col);
    if (dirs.length === 1) {
      handlePlayDir(row, col, dirs[0]);
      return;
    }
    setSelectedPit(selectedPit?.row === row && selectedPit?.col === col ? null : { row, col });
  };

  const isTutStepDone = mode === 'tutorial' && (justSolved || tutCompletedSteps.includes(tutStep.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/82 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92%] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/30 bg-[#1B120C] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        {/* Header minimal */}
        <div className="flex items-center justify-between border-b border-[#FFF7E8]/10 px-4 py-3">
          {mode === 'tutorial' ? (
            <div className="flex items-center gap-2">
              {VISUAL_TUTORIAL_STEPS.map((st, idx) => {
                const done = tutCompletedSteps.includes(st.id);
                const active = idx === tutIdx;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => loadTutStep(idx)}
                    className={`font-mono-nums flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition-transform duration-150 ${
                      active
                        ? 'scale-105 bg-[#F2B441] text-[#1C1007]'
                        : done
                        ? 'bg-[#2DD4BF]/25 text-[#2DD4BF] ring-1 ring-[#2DD4BF]'
                        : 'bg-[#2B1B11] text-[#D8C7AE]'
                    }`}
                  >
                    {done && !active ? <Check className="h-4 w-4" /> : idx + 1}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto pr-2">
              {CHALLENGES.map((c, idx) => {
                const solved = solvedChallengeIds.includes(c.id);
                const unlocked = idx <= maxUnlockedIdx || solved;
                const active = idx === stepIndex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => loadChallenge(idx)}
                    className={`font-mono-nums flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      active
                        ? 'bg-[#F2B441] text-[#1C1007]'
                        : solved
                        ? 'bg-[#2DD4BF]/20 text-[#2DD4BF]'
                        : unlocked
                        ? 'bg-[#2B1B11] text-[#FFF7E8]'
                        : 'bg-[#140C07] text-[#6B5D50]'
                    }`}
                  >
                    {unlocked ? (
                      solved && !active ? <Star className="h-3.5 w-3.5 fill-current" /> : idx + 1
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-2xl text-[#D8C7AE] hover:bg-[#FFF7E8]/10"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Badge 1-mot en mode Tutoriel ou court titre en mode Puzzle */}
        <div className="flex items-center justify-between px-5 pt-3">
          {mode === 'tutorial' ? (
            <span className="font-display text-lg font-bold text-[#F2B441]">
              {strings.tutorial[tutStep.labelKey]}
            </span>
          ) : (
            <div>
              <div className="font-display text-base font-bold text-[#F2B441]">{challenge.title}</div>
              <div className="text-xs text-[#D8C7AE]">{challenge.goal}</div>
            </div>
          )}

          {justSolved && (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2DD4BF] text-[#0A2623]">
              <Check className="h-5 w-5 stroke-[3]" />
            </span>
          )}
        </div>

        {/* Mini-plateau 4x8 avec main animée */}
        <div className="px-4 py-4">
          <div className="relative rounded-2xl border-2 border-[#D99B38]/60 bg-[#4A2B16] p-2.5 shadow-inner">
            <div className="space-y-1.5">
              {/* Camp adversaire */}
              <div className="space-y-1 rounded-xl border border-[#2DD4BF]/30 bg-[#0B393E]/35 p-1">
                {[0, 1].map((r) => (
                  <div key={r} className="grid grid-cols-8 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
                      const count = activeBoardState.board[r][c];
                      const isNyumba = isNyumbaCoord(1, r, c);
                      return (
                        <div
                          key={`${r}-${c}`}
                          className="relative flex aspect-square w-full items-center justify-center rounded-full ring-1 ring-[#2DD4BF]/25"
                          style={{ background: theme.cupRadialBg }}
                        >
                          <SeedCluster
                            count={count}
                            largeSeeds={false}
                            seedGradientClass={theme.seedGradientClass}
                            compact
                            pitSize={34}
                          />
                          {isNyumba && (
                            <span className="pointer-events-none absolute inset-1 rounded-full border border-[#F2B441]/55" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Camp joueur */}
              <div className="space-y-1 rounded-xl border border-[#F2B441]/35 bg-[#D99B38]/12 p-1">
                {[2, 3].map((r) => (
                  <div key={r} className="grid grid-cols-8 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
                      const count = activeBoardState.board[r][c];
                      const playable = !justSolved && canPlayPit(activeBoardState, 0, r, c);
                      const isNyumba = isNyumbaCoord(0, r, c);
                      const isSel = selectedPit?.row === r && selectedPit?.col === c;
                      const showHand =
                        mode === 'tutorial' &&
                        !justSolved &&
                        !isSel &&
                        !activeBoardState.pendingNyumbaChoice &&
                        tutStep.targetPit.row === r &&
                        tutStep.targetPit.col === c;

                      return (
                        <div key={`${r}-${c}`} className="relative">
                          {isSel && (
                            <div className="absolute -top-12 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-[#F2B441] bg-[#1B120C] p-1 shadow-xl">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayDir(r, c, r >= 2 ? -1 : 1);
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DD4BF] text-[#0A2623] font-black"
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayDir(r, c, r >= 2 ? 1 : -1);
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2B441] text-[#1C1007] font-black"
                              >
                                →
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleTapPit(r, c)}
                            style={{ background: theme.cupRadialBg }}
                            className={`pit-cell relative flex aspect-square w-full items-center justify-center rounded-full transition-transform duration-150 ${
                              isSel
                                ? 'scale-105 ring-[3px] ring-[#F2B441]'
                                : showHand
                                ? 'ring-[3px] ring-[#F2B441]'
                                : playable
                                ? 'ring-2 ring-[#2DD4BF]'
                                : 'opacity-65 ring-1 ring-[#F2B441]/25'
                            }`}
                          >
                            <SeedCluster
                              count={count}
                              largeSeeds={false}
                              seedGradientClass={theme.seedGradientClass}
                              compact
                              pitSize={34}
                            />
                            {isNyumba && (
                              <span className="pointer-events-none absolute inset-1 rounded-full border border-[#F2B441]/70" />
                            )}
                          </button>

                          {showHand && <AnimatedHandIcon gesture={tutStep.gesture} />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Boutons icônes si Nyumba ou Droit à l'erreur en attente */}
          {activeBoardState.pendingNyumbaChoice && (
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const { nextState } = resolveNyumbaChoice(activeBoardState, 'stop', false, false);
                  if (mode === 'tutorial') setTutState(nextState);
                  else setPuzzleState(nextState);
                  evaluateCompletion(nextState, usedErrorRightInAttempt, movesPlayedInPuzzle);
                }}
                className="flex min-h-[48px] min-w-[72px] items-center justify-center rounded-2xl bg-[#2DD4BF] px-5 text-[#0A2623] shadow-lg"
                aria-label="Garder Nyumba"
              >
                <ShieldCheck className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const { nextState } = resolveNyumbaChoice(
                    activeBoardState,
                    'continue',
                    false,
                    false
                  );
                  if (mode === 'tutorial') setTutState(nextState);
                  else setPuzzleState(nextState);
                  evaluateCompletion(nextState, usedErrorRightInAttempt, movesPlayedInPuzzle);
                }}
                className="flex min-h-[48px] min-w-[72px] items-center justify-center rounded-2xl bg-[#F2B441] px-5 text-[#1C1007] shadow-lg"
                aria-label="Continuer"
              >
                <ArrowRight className="h-6 w-6" />
              </button>
            </div>
          )}

          {mode === 'puzzles' && puzzleState.pendingErrorUndo && challenge.requireErrorRight && (
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const restored = applyErrorRightUndo(puzzleState);
                  soundEngine.playPickup();
                  setPuzzleState(restored);
                  setUsedErrorRightInAttempt(true);
                }}
                className="flex min-h-[48px] min-w-[72px] items-center justify-center rounded-2xl bg-[#F2B441] px-5 text-[#1C1007]"
                aria-label="Inverser"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = confirmTurnAfterTrakatra(puzzleState);
                  setPuzzleState(next);
                  evaluateCompletion(next, usedErrorRightInAttempt, movesPlayedInPuzzle);
                }}
                className="flex min-h-[48px] min-w-[72px] items-center justify-center rounded-2xl bg-[#2DD4BF] px-5 text-[#0A2623]"
                aria-label="Valider"
              >
                <Check className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>

        {/* Footer : Réessayer + Suivant / Jouer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#FFF7E8]/10 px-4 py-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => (mode === 'tutorial' ? loadTutStep(tutIdx) : loadChallenge(stepIndex))}
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border border-[#FFF7E8]/15 bg-[#120C08] text-[#D8C7AE]"
            aria-label="Réessayer"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          {mode === 'tutorial' ? (
            tutIdx < VISUAL_TUTORIAL_STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!isTutStepDone}
                onClick={() => loadTutStep(tutIdx + 1)}
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2DD4BF] px-5 text-sm font-extrabold text-[#0A2623] disabled:opacity-35"
              >
                <span>{strings.tutorial.next}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onCompleteTutorial?.();
                  onClose();
                  onStartGuidedPractice?.();
                }}
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#F2B441] px-5 text-sm font-extrabold text-[#1C1007]"
              >
                <span>{strings.tutorial.playNow}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )
          ) : stepIndex < CHALLENGES.length - 1 ? (
            <button
              type="button"
              disabled={!justSolved && !solvedChallengeIds.includes(challenge.id)}
              onClick={() => loadChallenge(stepIndex + 1)}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#F2B441] px-5 text-sm font-extrabold text-[#1C1007] disabled:opacity-35"
            >
              <span>{strings.tutorial.next}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartGuidedPractice?.();
              }}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2DD4BF] px-5 text-sm font-extrabold text-[#0A2623]"
            >
              <span>{strings.tutorial.playNow}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
