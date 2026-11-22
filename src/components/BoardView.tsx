import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  History,
  Lightbulb,
  Menu,
  MessageCircle,
  Palette,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  canPlayPit,
  executeMove,
  getAllowedLoopDirsForPit,
  getGamePhase,
  getLegalMoves,
  getPlayerBoardSeeds,
  getRing,
  hasMandatoryCaptureInTurn,
  isNyumbaCoord,
  isPitOwnedBy,
  previewMovePath,
  type GameStateSnapshot,
  type LoopDir,
  type MoveStep,
  type PlayerId,
} from '../game/mrahaEngine';
import { getSmartHint, type SmartHintResult } from '../game/mrahaHelpers';
import { UI_STRINGS } from '../i18n/translations';
import type {
  AccessibilityPrefs,
  BoardThemeId,
  ConnectionStatus,
  LastMoveHighlight,
  PlayMode,
  UiLanguage,
} from '../types/app';
import { soundEngine } from '../utils/sound';
import { getBoardTheme } from '../utils/themes';
import { ProfileAvatar } from '../utils/avatars';
import { BoardPit } from './BoardPit';
import { ReserveBowl } from './SeedCluster';

interface BoardViewProps {
  mode: PlayMode;
  language: UiLanguage;
  selectedBotLabel?: string;
  onOpenBotSelector?: () => void;
  hiddenNyumbaByPlayer: [boolean, boolean];
  onToggleHideNyumba: (player: PlayerId) => void;
  themeId: BoardThemeId;
  accessibility: AccessibilityPrefs;
  gameState: GameStateSnapshot;
  displayBoard: number[][];
  displayReserves: [number, number];
  activeStep: MoveStep | null;
  telegraphPit: { row: number; col: number } | null;
  lastOpponentMove?: LastMoveHighlight | null;
  isAnimating: boolean;
  isVerifying64: boolean;
  player0Name: string;
  player1Name: string;
  player0AvatarId?: string;
  player1AvatarId?: string;
  localPlayerIndex: PlayerId;
  onlineRoomCode?: string;
  connectionStatus?: ConnectionStatus;
  incomingEmote?: { from: PlayerId; text: string; id: number } | null;
  muted: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onOpenSettings: (initialTab?: 'params' | 'themes' | 'rules') => void;
  onOpenChallenges: () => void;
  onOpenCulture: () => void;
  onOpenStats: () => void;
  onOpenHistoryReplay: () => void;
  onRestartGame: () => void;
  onReturnToMenu: () => void;
  onMakeMove: (row: number, col: number, loopDir: LoopDir) => void;
  onResolveNyumba: (choice: 'stop' | 'continue') => void;
  onUseErrorRight: () => void;
  onConfirmTurn: () => void;
  onSendEmote?: (emote: string) => void;
  onPausedChange?: (paused: boolean) => void;
  onOpenChat: () => void;
  unreadChatCount?: number;
  chatPreviewBanner?: { pseudo: string; text: string } | null;
  onReportOpponent?: () => void;
}

interface DirVectorOption {
  loopDir: LoopDir;
  targetRow: number;
  targetCol: number;
  ux: number;
  uy: number;
  captures: number;
}

interface DragPreviewState {
  row: number;
  col: number;
  allowedDirs: LoopDir[];
  options: DirVectorOption[];
  startX: number;
  startY: number;
  startedAt: number;
  movedMax: number;
  activeDir: LoopDir | null;
  cancelled: boolean;
  longPressPreviewActive: boolean;
}

function getDirOptionsWithVectors(
  state: GameStateSnapshot,
  player: PlayerId,
  row: number,
  col: number,
  flipBoard: boolean
): DirVectorOption[] {
  const allowed = getAllowedLoopDirsForPit(state, player, row, col);
  if (allowed.length === 0) return [];

  const phase = getGamePhase(state);
  const isPhase1Capture = phase === 1 && hasMandatoryCaptureInTurn(state, player);
  const ring = getRing(player);
  const startIdx = ring.findIndex((p) => p.row === row && p.col === col);

  const toVis = (r: number, c: number) =>
    flipBoard ? { vr: 3 - r, vc: 7 - c } : { vr: r, vc: c };

  const curVis = toVis(row, col);

  return allowed.map((dir) => {
    const preview = previewMovePath(state, player, row, col, dir);
    let targetPos = ring[0];

    if (isPhase1Capture) {
      targetPos = dir === 1 ? ring[0] : ring[7];
    } else {
      targetPos = ring[(startIdx + (dir === 1 ? 1 : 15)) % 16];
    }

    const nextVis = toVis(targetPos.row, targetPos.col);
    let dx = nextVis.vc - curVis.vc;
    let dy = nextVis.vr - curVis.vr;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) {
      dx = dir === 1 ? 1 : -1;
      dy = 0;
    } else {
      dx /= len;
      dy /= len;
    }

    return {
      loopDir: dir,
      targetRow: targetPos.row,
      targetCol: targetPos.col,
      ux: dx,
      uy: dy,
      captures: preview.totalCaptures,
    };
  });
}

export function BoardView({
  mode,
  language,
  selectedBotLabel,
  onOpenBotSelector,
  hiddenNyumbaByPlayer,
  onToggleHideNyumba,
  themeId,
  accessibility,
  gameState,
  displayBoard,
  displayReserves,
  activeStep,
  telegraphPit,
  lastOpponentMove,
  isAnimating,
  isVerifying64,
  player0Name,
  player1Name,
  player0AvatarId,
  player1AvatarId,
  localPlayerIndex,
  onlineRoomCode,
  connectionStatus = 'connected',
  incomingEmote,
  muted,
  onToggleMute,
  onOpenRules,
  onOpenSettings,
  onOpenChallenges,
  onOpenCulture,
  onOpenStats,
  onOpenHistoryReplay,
  onRestartGame,
  onReturnToMenu,
  onMakeMove,
  onResolveNyumba,
  onUseErrorRight,
  onConfirmTurn,
  onPausedChange,
  onOpenChat,
  unreadChatCount = 0,
  chatPreviewBanner = null,
  onReportOpponent,
}: BoardViewProps) {
  const strings = UI_STRINGS[language];
  const theme = getBoardTheme(themeId);
  const highContrast = accessibility.largeTextAndSeeds;

  // Mon camp toujours en bas, adversaire toujours en haut
  const flipBoard = mode === 'duo-online' && localPlayerIndex === 1;
  const bottomPlayer: PlayerId = flipBoard ? 1 : 0;
  const topPlayer: PlayerId = flipBoard ? 0 : 1;
  const bottomName = bottomPlayer === 0 ? player0Name : player1Name;
  const topName = topPlayer === 0 ? player0Name : player1Name;
  const bottomAvatarId = bottomPlayer === 0 ? player0AvatarId : player1AvatarId;
  const topAvatarId = topPlayer === 0 ? player0AvatarId : player1AvatarId;

  const boardSlotRef = useRef<HTMLDivElement | null>(null);
  const [slotSize, setSlotSize] = useState<{ w: number; h: number }>({ w: 360, h: 420 });

  useEffect(() => {
    const el = boardSlotRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSlotSize({ w: rect.width, h: rect.height });
      }
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const [selectedPit, setSelectedPit] = useState<{ row: number; col: number } | null>(null);
  const [previewDir, setPreviewDir] = useState<LoopDir | null>(null);
  const [dragState, setDragState] = useState<DragPreviewState | null>(null);
  const dragRef = useRef<DragPreviewState | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  const [showInGameMenu, setShowInGameMenu] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeHint, setActiveHint] = useState<SmartHintResult | null>(null);
  const [hintsLeft, setHintsLeft] = useState<number>(3);

  useEffect(() => {
    onPausedChange?.(isPaused || showInGameMenu);
  }, [isPaused, showInGameMenu, onPausedChange]);

  // Track opponent trail fade key so CSS animation replays cleanly on every opponent move
  const opponentTrailKey = lastOpponentMove
    ? `${gameState.turnCount}-${lastOpponentMove.player}-${lastOpponentMove.fromRow}-${lastOpponentMove.fromCol}`
    : '';

  const bottomBoardSeeds = getPlayerBoardSeeds(displayBoard, bottomPlayer);
  const topBoardSeeds = getPlayerBoardSeeds(displayBoard, topPlayer);

  const canLocalControlCurrentTurn =
    !isAnimating &&
    !isVerifying64 &&
    !isPaused &&
    !telegraphPit &&
    gameState.winner === null &&
    gameState.pendingNyumbaChoice === null &&
    gameState.pendingErrorUndo === null &&
    (mode === 'duo-local' ||
      (mode === 'solo' && gameState.currentTurn === 0) ||
      (mode === 'duo-online' && gameState.currentTurn === localPlayerIndex));

  const isBottomNyumbaPending =
    !isAnimating &&
    gameState.pendingNyumbaChoice !== null &&
    ((mode === 'duo-local' && gameState.pendingNyumbaChoice.player === bottomPlayer) ||
      (mode === 'solo' && gameState.pendingNyumbaChoice.player === 0) ||
      (mode === 'duo-online' && gameState.pendingNyumbaChoice.player === localPlayerIndex));

  const isTopNyumbaPending =
    !isAnimating &&
    mode === 'duo-local' &&
    gameState.pendingNyumbaChoice !== null &&
    gameState.pendingNyumbaChoice.player === topPlayer;

  const isBottomErrorUndoPending =
    !isAnimating &&
    gameState.pendingErrorUndo !== null &&
    ((mode === 'duo-local' && gameState.pendingErrorUndo.player === bottomPlayer) ||
      (mode === 'solo' && gameState.pendingErrorUndo.player === 0) ||
      (mode === 'duo-online' && gameState.pendingErrorUndo.player === localPlayerIndex));

  const isTopErrorUndoPending =
    !isAnimating &&
    mode === 'duo-local' &&
    gameState.pendingErrorUndo !== null &&
    gameState.pendingErrorUndo.player === topPlayer;

  const legalMoves = useMemo(() => {
    if (!canLocalControlCurrentTurn) return [];
    return getLegalMoves(gameState, gameState.currentTurn);
  }, [canLocalControlCurrentTurn, gameState]);

  const playablePitSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of legalMoves) {
      set.add(`${m.row}-${m.col}`);
    }
    return set;
  }, [legalMoves]);

  const capturePitSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of legalMoves) {
      if (m.totalCaptures > 0) set.add(`${m.row}-${m.col}`);
    }
    return set;
  }, [legalMoves]);

  // Pit currently showing direction targets (either selected by tap or being dragged)
  const focusedPit =
    dragState && !dragState.cancelled
      ? { row: dragState.row, col: dragState.col }
      : selectedPit;

  const focusedDirOptions = useMemo(() => {
    if (!focusedPit || !canLocalControlCurrentTurn) return [];
    return getDirOptionsWithVectors(
      gameState,
      gameState.currentTurn,
      focusedPit.row,
      focusedPit.col,
      flipBoard
    );
  }, [focusedPit, canLocalControlCurrentTurn, gameState, flipBoard]);

  const targetDirMap = useMemo(() => {
    const map = new Map<string, DirVectorOption>();
    if (focusedDirOptions.length <= 1) return map;
    for (const opt of focusedDirOptions) {
      map.set(`${opt.targetRow}-${opt.targetCol}`, opt);
    }
    return map;
  }, [focusedDirOptions]);

  // Active Ghost Preview calculation (uniquement après appui long >= 220ms, glissement, ou indice)
  const effectivePreviewDir: LoopDir | null =
    dragState && !dragState.cancelled
      ? dragState.longPressPreviewActive
        ? dragState.activeDir
        : null
      : previewDir && focusedDirOptions.some((o) => o.loopDir === previewDir)
      ? previewDir
      : null;

  const ghostPreview = useMemo(() => {
    if (!focusedPit || effectivePreviewDir === null || !canLocalControlCurrentTurn) {
      return null;
    }
    try {
      const pathInfo = previewMovePath(
        gameState,
        gameState.currentTurn,
        focusedPit.row,
        focusedPit.col,
        effectivePreviewDir
      );
      const { nextState } = executeMove(
        gameState,
        gameState.currentTurn,
        focusedPit.row,
        focusedPit.col,
        effectivePreviewDir,
        false,
        false
      );
      return {
        pathInfo,
        nextBoard: nextState.board,
      };
    } catch {
      return null;
    }
  }, [focusedPit, effectivePreviewDir, canLocalControlCurrentTurn, gameState]);

  useEffect(() => {
    clearLongPressTimer();
    setSelectedPit(null);
    setPreviewDir(null);
    setDragState(null);
    dragRef.current = null;
    setActiveHint(null);
    if (gameState.turnCount === 0) {
      setHintsLeft(3);
      setIsPaused(false);
    }
  }, [gameState.currentTurn, gameState.turnCount, isAnimating, clearLongPressTimer]);

  // Keyboard navigation fallback for desktop users
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedPit) {
          setSelectedPit(null);
          setPreviewDir(null);
        } else if (showHistory) {
          setShowHistory(false);
        } else {
          setShowInGameMenu((v) => !v);
        }
        return;
      }
      if (!canLocalControlCurrentTurn || !selectedPit || focusedDirOptions.length === 0) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const wantedX = e.key === 'ArrowRight' ? 1 : -1;
        const best = [...focusedDirOptions].sort((a, b) => b.ux * wantedX - a.ux * wantedX)[0];
        if (best) {
          e.preventDefault();
          setSelectedPit(null);
          setPreviewDir(null);
          onMakeMove(selectedPit.row, selectedPit.col, best.loopDir);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canLocalControlCurrentTurn, selectedPit, focusedDirOptions, showHistory, onMakeMove]);

  // Compute responsive 4x8 board geometry filling screen cleanly without scroll or overflow
  const visRows = 4;
  const visCols = 8;
  const isVeryNarrow = slotSize.w < 380;
  const gap = isVeryNarrow ? 4 : slotSize.w < 640 ? 6 : 10;
  const framePadX = isVeryNarrow ? 8 : slotSize.w < 640 ? 10 : 16;
  const framePadY = isVeryNarrow ? 10 : slotSize.w < 640 ? 12 : 16;
  const borderWidth = 3;

  const availW = Math.max(240, slotSize.w - 4);
  const availH = Math.max(160, slotSize.h - 4);

  const maxPitW =
    (availW - borderWidth * 2 - framePadX * 2 - gap * (visCols - 1)) / visCols;
  const maxPitH =
    (availH - borderWidth * 2 - framePadY * 2 - gap * (visRows - 1) - 10) / visRows;

  const pitSize = Math.max(24, Math.min(78, Math.floor(Math.min(maxPitW, maxPitH))));
  const gridW = visCols * pitSize + (visCols - 1) * gap;
  const gridH = visRows * pitSize + (visRows - 1) * gap;
  const boardOuterW = gridW + framePadX * 2 + borderWidth * 2;
  const boardOuterH = gridH + framePadY * 2 + borderWidth * 2 + 10;

  const toLogicalCoord = (vr: number, vc: number) =>
    flipBoard ? { row: 3 - vr, col: 7 - vc } : { row: vr, col: vc };

  const handleRequestHint = () => {
    if (!canLocalControlCurrentTurn) return;
    const isUnlimited =
      mode === 'duo-local' || Boolean(selectedBotLabel?.startsWith('Nour'));
    if (!isUnlimited && hintsLeft <= 0) return;
    const hint = getSmartHint(gameState, gameState.currentTurn);
    if (!hint) return;
    if (!isUnlimited) setHintsLeft((n) => Math.max(0, n - 1));
    setActiveHint(hint);
    setSelectedPit({ row: hint.row, col: hint.col });
    setPreviewDir(hint.loopDir);
  };

  const commitMove = (row: number, col: number, dir: LoopDir) => {
    clearLongPressTimer();
    setSelectedPit(null);
    setPreviewDir(null);
    setDragState(null);
    dragRef.current = null;
    setActiveHint(null);
    onMakeMove(row, col, dir);
  };

  // Pointer-based press-and-hold ghost preview + drag-to-choose / drag-away-to-cancel
  // Stored via ref so BoardPit receives stable callbacks across 60fps animations
  const pointerActionsRef = useRef<{
    onDown: (e: React.PointerEvent<HTMLButtonElement>, row: number, col: number) => void;
    onMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
    onUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
    onCancel: () => void;
  }>({
    onDown: () => {},
    onMove: () => {},
    onUp: () => {},
    onCancel: () => {},
  });

  pointerActionsRef.current = {
    onDown: (e, row, col) => {
      soundEngine.unlock();
      if (!canLocalControlCurrentTurn) return;

      if (selectedPit && targetDirMap.size > 0) {
        const targetOpt = targetDirMap.get(`${row}-${col}`);
        if (targetOpt) {
          e.preventDefault();
          commitMove(selectedPit.row, selectedPit.col, targetOpt.loopDir);
          return;
        }
        if (selectedPit.row === row && selectedPit.col === col) {
          setSelectedPit(null);
          setPreviewDir(null);
          return;
        }
      }

      if (!canPlayPit(gameState, gameState.currentTurn, row, col)) {
        setSelectedPit(null);
        setPreviewDir(null);
        return;
      }

      const options = getDirOptionsWithVectors(
        gameState,
        gameState.currentTurn,
        row,
        col,
        flipBoard
      );
      if (options.length === 0) return;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore on unsupported inputs
      }

      clearLongPressTimer();
      const initial: DragPreviewState = {
        row,
        col,
        allowedDirs: options.map((o) => o.loopDir),
        options,
        startX: e.clientX,
        startY: e.clientY,
        startedAt: Date.now(),
        movedMax: 0,
        activeDir: options[0].loopDir,
        cancelled: false,
        longPressPreviewActive: false,
      };

      dragRef.current = initial;
      setDragState(initial);
      setSelectedPit({ row, col });
      setPreviewDir(null);
      setActiveHint(null);

      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        const latest = dragRef.current;
        if (!latest || latest.startedAt !== initial.startedAt || latest.cancelled) return;
        const activated: DragPreviewState = {
          ...latest,
          longPressPreviewActive: true,
        };
        dragRef.current = activated;
        setDragState(activated);
        if (activated.activeDir !== null) {
          setPreviewDir(activated.activeDir);
        }
      }, 220);
    },
    onMove: (e) => {
      const current = dragRef.current;
      if (!current) return;

      const dx = e.clientX - current.startX;
      const dy = e.clientY - current.startY;
      const dist = Math.hypot(dx, dy);
      const movedMax = Math.max(current.movedMax, dist);

      const cancelThreshold =
        current.allowedDirs.length === 1
          ? Math.max(36, pitSize * 0.92)
          : Math.max(72, pitSize * 1.85);
      const verticalEscape =
        current.allowedDirs.length > 1 && Math.abs(dy) > Math.max(52, pitSize * 1.25);

      const cancelled = dist > cancelThreshold || verticalEscape;
      let activeDir = current.activeDir;

      if (!cancelled && current.options.length > 1 && dist >= 10) {
        let bestScore = -Infinity;
        for (const opt of current.options) {
          const score = dx * opt.ux + dy * opt.uy;
          if (score > bestScore) {
            bestScore = score;
            activeDir = opt.loopDir;
          }
        }
      }

      const nextPreviewActive =
        !cancelled && (current.longPressPreviewActive || movedMax >= 12);
      if (nextPreviewActive && longPressTimerRef.current !== null) {
        clearLongPressTimer();
      }
      if (cancelled) {
        clearLongPressTimer();
      }

      current.movedMax = movedMax;
      if (
        activeDir !== current.activeDir ||
        cancelled !== current.cancelled ||
        nextPreviewActive !== current.longPressPreviewActive
      ) {
        const next: DragPreviewState = {
          ...current,
          activeDir,
          cancelled,
          longPressPreviewActive: nextPreviewActive,
        };
        dragRef.current = next;
        setDragState(next);
        if (nextPreviewActive && !cancelled && activeDir !== null) {
          setPreviewDir(activeDir);
        } else if (cancelled) {
          setPreviewDir(null);
        }
      }
    },
    onUp: (e) => {
      clearLongPressTimer();
      const current = dragRef.current;
      if (!current) return;

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }

      dragRef.current = null;
      setDragState(null);

      if (current.cancelled) {
        setSelectedPit(null);
        setPreviewDir(null);
        return;
      }

      const elapsed = Date.now() - current.startedAt;
      if (current.allowedDirs.length === 1 && current.activeDir !== null) {
        commitMove(current.row, current.col, current.activeDir);
        return;
      }

      if (current.allowedDirs.length > 1 && current.activeDir !== null) {
        if (current.movedMax >= 12 || elapsed >= 240) {
          commitMove(current.row, current.col, current.activeDir);
        } else {
          setSelectedPit({ row: current.row, col: current.col });
          setPreviewDir(null);
        }
      }
    },
    onCancel: () => {
      clearLongPressTimer();
      dragRef.current = null;
      setDragState(null);
      setSelectedPit(null);
      setPreviewDir(null);
    },
  };

  const handlePitPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, row: number, col: number) => {
      pointerActionsRef.current.onDown(e, row, col);
    },
    []
  );
  const handlePitPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    pointerActionsRef.current.onMove(e);
  }, []);
  const handlePitPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    pointerActionsRef.current.onUp(e);
  }, []);
  const handlePitPointerCancel = useCallback(() => {
    pointerActionsRef.current.onCancel();
  }, []);

  const isTopActive = gameState.currentTurn === topPlayer && gameState.winner === null;
  const isBottomActive = gameState.currentTurn === bottomPlayer && gameState.winner === null;
  const isReserveDroppingBottom =
    isAnimating && activeStep?.type === 'place_reserve' && activeStep.player === bottomPlayer;
  const isReserveDroppingTop =
    isAnimating && activeStep?.type === 'place_reserve' && activeStep.player === topPlayer;

  const isUnlimitedHints =
    mode === 'duo-local' || Boolean(selectedBotLabel?.startsWith('Nour'));
  const myControllablePlayer: PlayerId = mode === 'duo-online' ? localPlayerIndex : 0;

  const isPhase1Now = getGamePhase(gameState) === 1;
  const isFocusedCapture =
    focusedPit !== null && capturePitSet.has(`${focusedPit.row}-${focusedPit.col}`);
  const showTapTargets = !(dragState && !dragState.cancelled) && ghostPreview === null;

  const sortedTapDirOptions = useMemo(() => {
    if (!selectedPit || dragState || focusedDirOptions.length !== 2 || !canLocalControlCurrentTurn) {
      return null;
    }
    const sorted = [...focusedDirOptions].sort((a, b) => a.ux - b.ux);
    return {
      screenLeft: sorted[0],
      screenRight: sorted[1],
    };
  }, [selectedPit, dragState, focusedDirOptions, canLocalControlCurrentTurn]);

  return (
    <div
      className={`safe-area-shell flex h-[100dvh] w-full select-none flex-col overflow-hidden bg-gradient-to-b ${theme.bgGradient} text-[#FFF7E8] touch-manipulation`}
    >
      {/* HEADER MINIMAL : Menu à gauche, point statut en ligne au centre si besoin, Son à droite */}
      <header className="relative z-30 flex h-12 shrink-0 items-center justify-between px-3 sm:h-14 sm:px-5">
        <button
          type="button"
          onClick={() => setShowInGameMenu(true)}
          className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border border-[#FFF7E8]/12 bg-[#23150D]/90 text-[#FFF7E8] transition-colors active:scale-95 hover:border-[#F2B441]/55"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          {mode === 'duo-online' && (
            <div className="flex items-center gap-1.5 rounded-full bg-[#1C110A]/85 px-2.5 py-1 ring-1 ring-[#FFF7E8]/10">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-[#2DD4BF] shadow-[0_0_8px_#2DD4BF]'
                    : 'animate-pulse bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]'
                }`}
                aria-label={connectionStatus}
              />
              {onlineRoomCode && (
                <span className="font-mono-nums text-xs font-bold tracking-wider text-[#F2B441]">
                  {onlineRoomCode}
                </span>
              )}
            </div>
          )}

          {mode === 'duo-local' && (
            <div className="flex rotate-180 items-center gap-2">
              {isTopNyumbaPending ? (
                <>
                  <button
                    type="button"
                    onClick={() => onResolveNyumba('stop')}
                    className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-2xl bg-[#2DD4BF] px-3 text-[#0A2623] shadow-lg active:scale-95"
                    aria-label="Garder la Nyumba"
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveNyumba('continue')}
                    className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-2xl bg-[#F2B441] px-3 text-[#231408] shadow-lg active:scale-95"
                    aria-label="Continuer le semis"
                  >
                    <Play className="h-5 w-5" />
                  </button>
                </>
              ) : isTopErrorUndoPending ? (
                <>
                  <button
                    type="button"
                    onClick={onUseErrorRight}
                    className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-2xl bg-[#F2B441] px-3 text-[#231408] shadow-lg active:scale-95"
                    aria-label="Annuler (Droit à l'erreur)"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmTurn}
                    className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-2xl bg-[#2DD4BF] px-3 text-[#0A2623] shadow-lg active:scale-95"
                    aria-label="Valider le tour"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </>
              ) : sortedTapDirOptions && gameState.currentTurn === topPlayer ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      commitMove(
                        selectedPit!.row,
                        selectedPit!.col,
                        sortedTapDirOptions.screenRight.loopDir
                      )
                    }
                    className={`flex min-h-[44px] min-w-[52px] items-center justify-center rounded-2xl px-3 shadow-lg active:scale-95 ${
                      isFocusedCapture
                        ? 'bg-[#F2B441] text-[#231408]'
                        : 'bg-[#2DD4BF] text-[#0A2623]'
                    }`}
                    aria-label="Jouer à gauche"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPit(null);
                      setPreviewDir(null);
                    }}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#FFF7E8]/20 bg-[#23150D]/90 text-[#EBDCC3] active:scale-95"
                    aria-label="Annuler la sélection"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      commitMove(
                        selectedPit!.row,
                        selectedPit!.col,
                        sortedTapDirOptions.screenLeft.loopDir
                      )
                    }
                    className={`flex min-h-[44px] min-w-[52px] items-center justify-center rounded-2xl px-3 shadow-lg active:scale-95 ${
                      isFocusedCapture
                        ? 'bg-[#F2B441] text-[#231408]'
                        : 'bg-[#2DD4BF] text-[#0A2623]'
                    }`}
                    aria-label="Jouer à droite"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleHideNyumba(topPlayer)}
                  className={`relative flex min-h-[44px] min-w-[48px] items-center justify-center rounded-2xl border transition-transform active:scale-95 ${
                    hiddenNyumbaByPlayer[topPlayer]
                      ? 'border-[#2DD4BF]/75 bg-[#0F3D39] text-[#2DD4BF]'
                      : 'border-[#FFF7E8]/15 bg-[#23150D]/90 text-[#D8C7AE]'
                  }`}
                  aria-label={`${strings.menu.hideNyumba} — ${topName}`}
                >
                  {hiddenNyumbaByPlayer[topPlayer] ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                  <span className="font-mono-nums absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#2DD4BF] px-1 text-[10px] font-black text-[#082420]">
                    2
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border border-[#FFF7E8]/12 bg-[#23150D]/90 text-[#FFF7E8] transition-colors active:scale-95 hover:border-[#F2B441]/55"
          aria-label={muted ? 'Son activé' : 'Son coupé'}
        >
          {muted ? <VolumeX className="h-5 w-5 text-[#D8C7AE]" /> : <Volume2 className="h-5 w-5 text-[#F2B441]" />}
        </button>
      </header>

      {/* CORPS DE PARTIE : Zéro débordement, zéro texte superflu */}
      <main className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-between gap-1.5 px-2.5 pb-2 pt-0.5 sm:px-5 sm:pb-3">
        {/* PANNEAU ADVERSAIRE (1 seule ligne : Avatar actif + Nom + Réserve / Prises / Tablier ; tourné vers J2 en 1vs1 local) */}
        <div
          className={`relative z-20 flex w-full shrink-0 items-center justify-between gap-2 rounded-2xl border px-3 py-1.5 transition-all ${
            mode === 'duo-local' ? 'rotate-180' : ''
          } ${
            highContrast
              ? 'border-[#FFFFFF]/80 bg-[#0D0906]'
              : isTopActive
              ? 'border-[#2DD4BF]/70 bg-[#0F3135]/90 shadow-[0_0_18px_rgba(45,212,191,0.18)]'
              : 'border-[#FFF7E8]/12 bg-[#1D120C]/90'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <ProfileAvatar
              avatarId={topAvatarId}
              pseudo={topName}
              size="xs"
              highlight={isTopActive}
            />
            <span className="truncate text-sm font-bold text-[#FFF7E8] sm:text-base">
              {topName}
            </span>
            {mode === 'duo-online' && onReportOpponent && (
              <button
                type="button"
                onClick={onReportOpponent}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#B8ABA0] hover:bg-red-500/15 hover:text-red-300"
                aria-label={`Signaler ${topName}`}
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            )}
            {incomingEmote && incomingEmote.from === topPlayer && (
              <span className="text-xs font-bold text-[#2DD4BF]">{incomingEmote.text}</span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ReserveBowl
              count={displayReserves[topPlayer]}
              theme={theme}
              active={isReserveDroppingTop}
              largeText={highContrast}
              compact
              label={strings.hud.reserve}
            />
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-[#B8ABA0] sm:text-xs">{strings.hud.captures}</span>
              <span className="font-mono-nums text-sm font-extrabold text-[#FFF7E8] sm:text-base">
                {gameState.captures[topPlayer]}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-[#B8ABA0] sm:text-xs">{strings.hud.board}</span>
              <span className="font-mono-nums text-sm font-extrabold text-[#2DD4BF] sm:text-base">
                {hiddenNyumbaByPlayer[topPlayer] && gameState.nyumbaIntact[topPlayer]
                  ? '?'
                  : topBoardSeeds}
              </span>
            </div>
          </div>
        </div>

        {/* PLATEAU CENTRAL 4×8 (centré, zéro bouton à l'intérieur, séparation chaude/froide) */}
        <div
          ref={boardSlotRef}
          className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
        >
          <div
            className={`relative flex flex-col items-center justify-center overflow-hidden rounded-[22px] shadow-[0_20px_48px_rgba(0,0,0,0.68),inset_0_2px_4px_rgba(255,220,165,0.35),inset_0_-6px_12px_rgba(12,6,2,0.7)] sm:rounded-[28px] ${
              highContrast ? 'border-[#FFFFFF] bg-[#140B06]' : theme.boardFrameClass
            }`}
            style={{
              width: `${boardOuterW}px`,
              height: `${boardOuterH}px`,
              borderWidth: `${borderWidth}px`,
              paddingLeft: `${framePadX}px`,
              paddingRight: `${framePadX}px`,
              paddingTop: `${framePadY}px`,
              paddingBottom: `${framePadY}px`,
              ...(theme.useWoodPhoto && !highContrast
                ? {
                    backgroundImage:
                      'url(/src/assets/images/mraha_board_wood_1795019536089.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : {}),
            }}
          >
            {!highContrast && (
              <div className={`pointer-events-none absolute inset-0 ${theme.boardOverlayColor}`} />
            )}

            <div
              className="relative shrink-0"
              style={{ width: `${gridW}px`, height: `${gridH + 10}px` }}
            >
              {/* Camp du haut (Adversaire — teinte froide douce, sans bordure superflue) */}
              <div
                className={`pointer-events-none absolute left-0 right-0 top-0 h-[calc(50%-4px)] rounded-xl border-transparent transition-opacity ${
                  theme.campOppClass
                } ${isTopActive ? 'opacity-95' : 'opacity-60'}`}
              />

              {/* Camp du bas (Moi — teinte chaude douce, sans bordure superflue) */}
              <div
                className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[calc(50%-4px)] rounded-xl border-transparent transition-opacity ${
                  theme.campPlayerClass
                } ${isBottomActive ? 'opacity-95' : 'opacity-60'}`}
              />

              {/* Séparation discrète entre les deux camps */}
              <div
                className={`pointer-events-none absolute left-4 right-4 top-1/2 z-10 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r opacity-75 ${theme.dividerClass}`}
              />

              {/* Grille des 32 cases */}
              <div
                className="relative z-10 grid"
                style={{
                  width: `${gridW}px`,
                  height: `${gridH + 10}px`,
                  gridTemplateColumns: `repeat(${visCols}, ${pitSize}px)`,
                  gridTemplateRows: `repeat(${visRows}, ${pitSize}px)`,
                  rowGap: `${gap + 3}px`,
                  columnGap: `${gap}px`,
                  alignContent: 'space-between',
                }}
              >
                {Array.from({ length: visRows }).map((_, vr) =>
                  Array.from({ length: visCols }).map((__, vc) => {
                    const { row, col } = toLogicalCoord(vr, vc);
                    const rowOwner: PlayerId = row <= 1 ? 1 : 0;
                    const key = `${row}-${col}`;
                    const count = displayBoard[row][col];

                    const isPlayable = focusedPit === null && playablePitSet.has(key);
                    const isCapturePit = isPlayable && capturePitSet.has(key);
                    const isFocused = focusedPit?.row === row && focusedPit?.col === col;
                    const isHintPit = activeHint?.row === row && activeHint?.col === col;

                    const isNyumba = isNyumbaCoord(rowOwner, row, col);
                    const isNyumbaIntact = isNyumba && gameState.nyumbaIntact[rowOwner];
                    const isNyumbaConcealed =
                      hiddenNyumbaByPlayer[rowOwner] && isNyumbaIntact && !isVerifying64;

                    const isStepTarget =
                      isAnimating && activeStep?.row === row && activeStep?.col === col;
                    const isTelegraphed =
                      !isAnimating && telegraphPit?.row === row && telegraphPit?.col === col;
                    const isCaptureVictim =
                      isAnimating &&
                      activeStep?.type === 'capture' &&
                      activeStep.capturedFromRow === row &&
                      activeStep.capturedFromCol === col;
                    const isCaptureEmitter =
                      isAnimating &&
                      activeStep?.type === 'capture' &&
                      activeStep.row === row &&
                      activeStep.col === col;

                    const isLastOppPit =
                      !isAnimating &&
                      focusedPit === null &&
                      Boolean(
                        lastOpponentMove &&
                          lastOpponentMove.landingRow === row &&
                          lastOpponentMove.landingCol === col
                      );

                    const isPreviewLanding =
                      ghostPreview?.pathInfo.landingCoord?.row === row &&
                      ghostPreview?.pathInfo.landingCoord?.col === col;
                    const isPhase1FocusedCaptureTarget =
                      isPhase1Now &&
                      isFocusedCapture &&
                      focusedPit !== null &&
                      row === (gameState.currentTurn === 0 ? 1 : 2) &&
                      col === focusedPit.col;

                    const isPreviewCaptureTarget =
                      isPhase1FocusedCaptureTarget ||
                      (ghostPreview !== null &&
                        row === (gameState.currentTurn === 0 ? 1 : 2) &&
                        ghostPreview.pathInfo.captureCols.includes(col));

                    const previewNextCount =
                      ghostPreview &&
                      (isPreviewLanding || isFocused || isPreviewCaptureTarget) &&
                      !isNyumbaConcealed
                        ? ghostPreview.nextBoard[row][col]
                        : null;

                    const targetOpt = showTapTargets ? targetDirMap.get(key) : undefined;
                    const isTargetOpt = Boolean(targetOpt);
                    const targetOptChevron: 'left' | 'right' | null = targetOpt
                      ? targetOpt.ux >= 0
                        ? 'right'
                        : 'left'
                      : null;
                    const isCancelledDrag = Boolean(
                      dragState?.cancelled && dragState.row === row && dragState.col === col
                    );

                    const shouldDim =
                      canLocalControlCurrentTurn &&
                      (focusedPit !== null
                        ? !isFocused &&
                          !isTargetOpt &&
                          !isPreviewLanding &&
                          !isPreviewCaptureTarget
                        : !isPlayable);

                    return (
                      <BoardPit
                        key={key}
                        row={row}
                        col={col}
                        pitSize={pitSize}
                        count={count}
                        previewNextCount={previewNextCount}
                        largeSeeds={highContrast}
                        seedGradientClass={theme.seedGradientClass}
                        cupRadialBg={theme.cupRadialBg}
                        pitBaseClass={
                          isPitOwnedBy(bottomPlayer, row)
                            ? theme.pitBasePlayerClass
                            : theme.pitBaseOppClass
                        }
                        rotateOpposite={mode === 'duo-local' && rowOwner === topPlayer}
                        isPlayable={isPlayable}
                        isCapturePit={isCapturePit}
                        isFocused={isFocused}
                        isHintPit={isHintPit}
                        isTelegraphed={isTelegraphed}
                        isStepTarget={isStepTarget}
                        isCaptureVictim={isCaptureVictim}
                        isCaptureEmitter={isCaptureEmitter}
                        isLastOppPit={isLastOppPit}
                        isPreviewLanding={isPreviewLanding}
                        isPreviewCaptureTarget={isPreviewCaptureTarget}
                        isTargetOpt={isTargetOpt}
                        isTargetOptCapture={isFocusedCapture}
                        targetOptChevron={targetOptChevron}
                        isCancelledDrag={isCancelledDrag}
                        shouldDim={shouldDim}
                        isNyumba={isNyumba}
                        isNyumbaIntact={isNyumbaIntact}
                        isNyumbaConcealed={isNyumbaConcealed}
                        opponentTrailKey={opponentTrailKey}
                        onPitPointerDown={handlePitPointerDown}
                        onPitPointerMove={handlePitPointerMove}
                        onPitPointerUp={handlePitPointerUp}
                        onPitPointerCancel={handlePitPointerCancel}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Overlay de pause en partie (sans décaler le plateau ni le menu) */}
            {isPaused && !showInGameMenu && gameState.winner === null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#120C08]/78 backdrop-blur-[2px]">
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-[#F2B441] px-7 text-base font-extrabold text-[#1E1109] shadow-2xl transition-transform active:scale-95 hover:bg-[#FFD06B]"
                >
                  <Play className="h-5 w-5 fill-[#1E1109]" />
                  <span>{strings.menu.resume}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PANNEAU JOUEUR (1 seule ligne : Avatar actif + Nom + Réserve / Prises / Tablier) */}
        <div
          className={`relative z-20 flex w-full shrink-0 items-center justify-between gap-2 rounded-2xl border px-3 py-1.5 transition-all ${
            highContrast
              ? 'border-[#FFFFFF]/80 bg-[#0D0906]'
              : isBottomActive
              ? 'border-[#F2B441]/80 bg-[#3B2313]/95 shadow-[0_0_20px_rgba(242,180,65,0.22)]'
              : 'border-[#FFF7E8]/12 bg-[#1D120C]/90'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <ProfileAvatar
              avatarId={bottomAvatarId}
              pseudo={bottomName}
              size="xs"
              highlight={isBottomActive}
            />
            <span className="truncate text-sm font-bold text-[#FFF7E8] sm:text-base">
              {bottomName}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ReserveBowl
              count={displayReserves[bottomPlayer]}
              theme={theme}
              active={isReserveDroppingBottom}
              largeText={highContrast}
              compact
              label={strings.hud.reserve}
            />
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-[#B8ABA0] sm:text-xs">{strings.hud.captures}</span>
              <span className="font-mono-nums text-sm font-extrabold text-[#FFF7E8] sm:text-base">
                {gameState.captures[bottomPlayer]}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-[#B8ABA0] sm:text-xs">{strings.hud.board}</span>
              <span className="font-mono-nums text-sm font-extrabold text-[#F2B441] sm:text-base">
                {hiddenNyumbaByPlayer[bottomPlayer] && gameState.nyumbaIntact[bottomPlayer]
                  ? '?'
                  : bottomBoardSeeds}
              </span>
            </div>
          </div>
        </div>

        {/* ZONE DU POUCE EN BAS : Icônes uniquement (Indice, Annuler, Cacher Nyumba J1, Validation/Nyumba) */}
        <div className="flex h-12 w-full shrink-0 items-center justify-center gap-3 px-2">
          {isBottomNyumbaPending ? (
            <>
              <button
                type="button"
                onClick={() => onResolveNyumba('stop')}
                className="flex min-h-[48px] min-w-[64px] items-center justify-center rounded-2xl bg-[#2DD4BF] px-4 text-[#0A2623] shadow-lg active:scale-95"
                aria-label="Garder la Nyumba"
              >
                <ShieldCheck className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => onResolveNyumba('continue')}
                className="flex min-h-[48px] min-w-[64px] items-center justify-center rounded-2xl bg-[#F2B441] px-4 text-[#231408] shadow-lg active:scale-95"
                aria-label="Continuer le semis"
              >
                <Play className="h-6 w-6" />
              </button>
            </>
          ) : isBottomErrorUndoPending ? (
            <>
              <button
                type="button"
                onClick={onUseErrorRight}
                className="flex min-h-[48px] min-w-[64px] items-center justify-center rounded-2xl bg-[#F2B441] px-4 text-[#231408] shadow-lg active:scale-95"
                aria-label="Annuler (Droit à l'erreur)"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onConfirmTurn}
                className="flex min-h-[48px] min-w-[64px] items-center justify-center rounded-2xl bg-[#2DD4BF] px-4 text-[#0A2623] shadow-lg active:scale-95"
                aria-label="Valider le tour"
              >
                <Check className="h-6 w-6" />
              </button>
            </>
          ) : sortedTapDirOptions && gameState.currentTurn === bottomPlayer ? (
            <>
              <button
                type="button"
                onClick={() =>
                  commitMove(
                    selectedPit!.row,
                    selectedPit!.col,
                    sortedTapDirOptions.screenLeft.loopDir
                  )
                }
                className={`flex min-h-[48px] min-w-[64px] items-center justify-center rounded-2xl px-4 shadow-lg active:scale-95 ${
                  isFocusedCapture
                    ? 'bg-[#F2B441] text-[#231408]'
                    : 'bg-[#2DD4BF] text-[#0A2623]'
                }`}
                aria-label="Jouer à gauche"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPit(null);
                  setPreviewDir(null);
                }}
                className="flex min-h-[48px] min-w-[52px] items-center justify-center rounded-2xl border border-[#FFF7E8]/15 bg-[#23150D]/90 text-[#EBDCC3] transition-transform active:scale-95"
                aria-label="Annuler la sélection"
              >
                <RotateCcw className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  commitMove(
                    selectedPit!.row,
                    selectedPit!.col,
                    sortedTapDirOptions.screenRight.loopDir
                  )
                }
                className={`flex min-h-[48px] min-w-[64px] items-center justify-center rounded-2xl px-4 shadow-lg active:scale-95 ${
                  isFocusedCapture
                    ? 'bg-[#F2B441] text-[#231408]'
                    : 'bg-[#2DD4BF] text-[#0A2623]'
                }`}
                aria-label="Jouer à droite"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRequestHint}
                disabled={!canLocalControlCurrentTurn || (!isUnlimitedHints && hintsLeft <= 0)}
                className="relative flex min-h-[48px] min-w-[52px] items-center justify-center rounded-2xl border border-[#F2B441]/35 bg-[#23150D]/90 text-[#F2B441] transition-transform active:scale-95 disabled:opacity-35"
                aria-label="Indice"
              >
                <Lightbulb className="h-5 w-5" />
                {!isUnlimitedHints && (
                  <span className="font-mono-nums absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F2B441] px-1 text-[11px] font-black text-[#1E1109]">
                    {hintsLeft}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedPit) {
                    setSelectedPit(null);
                    setPreviewDir(null);
                  }
                }}
                disabled={!selectedPit}
                className="flex min-h-[48px] min-w-[52px] items-center justify-center rounded-2xl border border-[#FFF7E8]/15 bg-[#23150D]/90 text-[#EBDCC3] transition-transform active:scale-95 disabled:opacity-30"
                aria-label="Annuler la sélection"
              >
                <RotateCcw className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  onToggleHideNyumba(mode === 'duo-local' ? bottomPlayer : myControllablePlayer)
                }
                className={`relative flex min-h-[48px] min-w-[52px] items-center justify-center rounded-2xl border transition-transform active:scale-95 ${
                  hiddenNyumbaByPlayer[mode === 'duo-local' ? bottomPlayer : myControllablePlayer]
                    ? 'border-[#F2B441]/70 bg-[#4A2E14] text-[#F2B441]'
                    : 'border-[#FFF7E8]/15 bg-[#23150D]/90 text-[#D8C7AE]'
                }`}
                aria-label={
                  mode === 'duo-local'
                    ? `${strings.menu.hideNyumba} — ${bottomName}`
                    : strings.menu.hideNyumba
                }
              >
                {hiddenNyumbaByPlayer[mode === 'duo-local' ? bottomPlayer : myControllablePlayer] ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
                {mode === 'duo-local' && (
                  <span className="font-mono-nums absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F2B441] px-1 text-[10px] font-black text-[#1E1109]">
                    1
                  </span>
                )}
              </button>
              {mode !== 'duo-online' && (
                <button
                  type="button"
                  onClick={() => setIsPaused((v) => !v)}
                  className={`flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border transition-transform active:scale-95 ${
                    isPaused
                      ? 'border-[#F2B441] bg-[#F2B441] text-[#1E1109]'
                      : 'border-[#FFF7E8]/15 bg-[#23150D]/90 text-[#D8C7AE]'
                  }`}
                  aria-label={isPaused ? strings.menu.resume : 'Pause'}
                >
                  {isPaused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5" />}
                </button>
              )}

              <button
                type="button"
                onClick={onOpenChat}
                className="relative flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border border-[#2DD4BF]/35 bg-[#0F2625]/92 text-[#2DD4BF] transition-transform active:scale-95"
                aria-label="Chat en direct"
              >
                <MessageCircle className="h-5 w-5" />
                {unreadChatCount > 0 && (
                  <span className="font-mono-nums absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F2B441] px-1 text-[11px] font-black text-[#1E1109]">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </main>

      {/* MENU EN PARTIE COMPACT */}
      {showInGameMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[88dvh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/30 bg-[#1F140D] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#FFF7E8] shadow-2xl sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between pb-3">
              <h2 className="font-display text-xl font-bold">{strings.appTitle}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowInGameMenu(false);
                  setIsPaused(false);
                }}
                className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-[#D8C7AE]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowInGameMenu(false);
                setIsPaused(false);
              }}
              className="mb-2 min-h-[48px] w-full shrink-0 rounded-xl bg-[#F2B441] text-sm font-bold text-[#241409]"
            >
              {strings.menu.resume}
            </button>

            <div className="flex-1 space-y-2 overflow-y-auto py-1">

              {mode === 'solo' && selectedBotLabel && (
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onOpenBotSelector?.();
                  }}
                  className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-[#F2B441]/35 bg-[#140C07] px-4 text-xs font-bold text-[#F2B441]"
                >
                  <span>Adversaire : {selectedBotLabel}</span>
                  <span className="text-[#FFF7E8]">Changer</span>
                </button>
              )}

              {mode === 'duo-local' ? (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleHideNyumba(0)}
                    className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-4 text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2.5">
                      {hiddenNyumbaByPlayer[0] ? (
                        <EyeOff className="h-4 w-4 text-[#F2B441]" />
                      ) : (
                        <Eye className="h-4 w-4 text-[#D8C7AE]" />
                      )}
                      {strings.menu.hideNyumba} ({player0Name})
                    </span>
                    <span className="text-xs font-bold text-[#F2B441]">
                      {hiddenNyumbaByPlayer[0] ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleHideNyumba(1)}
                    className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-4 text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2.5">
                      {hiddenNyumbaByPlayer[1] ? (
                        <EyeOff className="h-4 w-4 text-[#2DD4BF]" />
                      ) : (
                        <Eye className="h-4 w-4 text-[#D8C7AE]" />
                      )}
                      {strings.menu.hideNyumba} ({player1Name})
                    </span>
                    <span className="text-xs font-bold text-[#2DD4BF]">
                      {hiddenNyumbaByPlayer[1] ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleHideNyumba(myControllablePlayer)}
                  className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-4 text-sm font-semibold"
                >
                  <span className="flex items-center gap-2.5">
                    {hiddenNyumbaByPlayer[myControllablePlayer] ? (
                      <EyeOff className="h-4 w-4 text-[#F2B441]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#D8C7AE]" />
                    )}
                    {strings.menu.hideNyumba}
                  </span>
                  <span className="text-xs font-bold text-[#2DD4BF]">
                    {hiddenNyumbaByPlayer[myControllablePlayer] ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onOpenRules();
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-3 text-xs font-semibold whitespace-nowrap"
                >
                  <BookOpen className="h-4 w-4 text-[#F2B441]" />
                  {strings.menu.rules}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onOpenChallenges();
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#F2B441]/35 bg-[#140C07] px-3 text-xs font-bold text-[#F2B441] whitespace-nowrap"
                >
                  <Sparkles className="h-4 w-4" />
                  {strings.menu.puzzles}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onOpenSettings('themes');
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-3 text-xs font-semibold whitespace-nowrap"
                >
                  <Palette className="h-4 w-4 text-[#2DD4BF]" />
                  Thèmes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onOpenChat();
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#2DD4BF]/35 bg-[#140C07] px-3 text-xs font-bold text-[#2DD4BF] whitespace-nowrap"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onOpenSettings('params');
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-3 text-xs font-semibold whitespace-nowrap"
                >
                  <Sliders className="h-4 w-4 text-[#F2B441]" />
                  {strings.menu.settings}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    setShowHistory(true);
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-3 text-xs font-semibold whitespace-nowrap"
                >
                  <History className="h-4 w-4 text-[#2DD4BF]" />
                  {gameState.history.length}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onOpenStats();
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-3 text-xs font-semibold whitespace-nowrap"
                >
                  <Award className="h-4 w-4 text-[#F2B441]" />
                  Stats
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onOpenCulture();
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-3 text-xs font-semibold whitespace-nowrap"
                >
                  <BookOpen className="h-4 w-4 text-[#2DD4BF]" />
                  Culture
                </button>
              </div>

              {mode !== 'duo-online' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onRestartGame();
                  }}
                  className="min-h-[48px] w-full rounded-xl border border-[#FFF7E8]/12 bg-[#140C07] px-4 text-left text-sm font-semibold"
                >
                  {strings.menu.restart}
                </button>
              )}

              {mode === 'duo-online' && onReportOpponent && (
                <button
                  type="button"
                  onClick={() => {
                    setShowInGameMenu(false);
                    onReportOpponent();
                  }}
                  className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-red-400/25 bg-[#140C07] px-4 text-left text-sm font-semibold text-red-200"
                >
                  <Flag className="h-4 w-4 text-red-400" />
                  Signaler l’adversaire
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowInGameMenu(false);
                  onReturnToMenu();
                }}
                className="min-h-[48px] w-full rounded-xl border border-red-400/35 bg-red-500/15 px-4 text-left text-sm font-semibold text-red-200"
              >
                {strings.menu.quit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIQUE COMPACT */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/30 bg-[#1F140D] pb-[env(safe-area-inset-bottom)] text-[#FFF7E8] shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#FFF7E8]/10 px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F2B441]">
                <History className="h-4 w-4" />
                {gameState.history.length}
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-[#D8C7AE]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
              {gameState.history.map((h) => (
                <div
                  key={`${h.turnNumber}-${h.player}-${h.col}`}
                  className="flex items-center justify-between rounded-xl border border-[#FFF7E8]/10 bg-[#140C07] px-3 py-2"
                >
                  <div>
                    <span className="font-mono-nums font-bold text-[#F2B441]">
                      #{h.turnNumber}
                    </span>{' '}
                    <span className="font-semibold">
                      {h.player === 0 ? player0Name : player1Name}
                    </span>
                  </div>
                  <div className="font-mono-nums text-xs">
                    {h.capturedCount > 0 ? (
                      <span className="font-bold text-[#2DD4BF]">
                        {h.capturedCount} {strings.hud.captures}
                      </span>
                    ) : (
                      <span className="text-[#D8C7AE]">{h.kind}</span>
                    )}
                  </div>
                </div>
              ))}
              {gameState.history.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowHistory(false);
                    onOpenHistoryReplay();
                  }}
                  className="min-h-[48px] w-full rounded-xl border border-[#2DD4BF]/35 bg-[#140C07] text-xs font-bold text-[#2DD4BF]"
                >
                  Rejeu
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
