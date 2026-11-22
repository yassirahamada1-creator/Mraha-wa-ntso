import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Swords, X } from 'lucide-react';
import {
  applyErrorRightUndo,
  confirmTurnAfterTrakatra,
  createInitialGameState,
  DEFAULT_RULE_CONFIG,
  executeMove,
  getPlayerTotalSeeds,
  resolveNyumbaChoice,
  type GameStateSnapshot,
  type LoopDir,
  type MoveStep,
  type MrahaRuleConfig,
  type PlayerId,
} from './game/mrahaEngine';
import {
  chooseAiMove,
  chooseAiNyumbaDecision,
  DEFAULT_BOT_ID,
  getBotById,
  getNextUnlockedBot,
  isBotUnlocked,
  type AiDifficulty,
} from './game/mrahaAi';
import {
  clearAutosavedMatch,
  getDailyChallenge,
  getDifficultyLabel,
  getTodayDateKey,
  loadAutosavedMatch,
  loadLocalMatchHistory,
  loadProgression,
  recordGameProgression,
  saveAutosavedMatch,
  saveLocalMatchHistory,
  saveProgression,
} from './game/mrahaHelpers';
import { MrahaChatClient } from './network/chatClient';
import { MrahaOnlineClient } from './network/onlineClient';
import type {
  AccessibilityPrefs,
  AuthAccount,
  AutosavedMatch,
  BoardThemeId,
  ChatMessageItem,
  ConnectionStatus,
  GameSpeed,
  IncomingChallenge,
  LastMoveHighlight,
  LeaderboardEntry,
  MatchmakingQueueStatus,
  OnlineRoomSnapshot,
  PlayerProfile,
  PlayMode,
  ProgressionState,
  ReportTarget,
  SavedMatchMove,
  SavedMatchRecord,
  ScreenMode,
  StartingPlayerPref,
  UiLanguage,
} from './types/app';
import { soundEngine } from './utils/sound';
import { getBoardTheme } from './utils/themes';
import { ProfileAvatar, resolveAvatarId } from './utils/avatars';
import { TitleScreen } from './components/TitleScreen';
import { BoardView } from './components/BoardView';
import { TutorialModal } from './components/TutorialModal';
import { SettingsModal, type SettingsTab } from './components/SettingsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { VictoryModal } from './components/VictoryModal';
import { RulesModal } from './components/RulesModal';
import { CultureModal } from './components/CultureModal';
import { StatsAchievementsModal } from './components/StatsAchievementsModal';
import { MatchReplayModal } from './components/MatchReplayModal';
import { AccountModal } from './components/AccountModal';
import { ProfilePhotoModal } from './components/ProfilePhotoModal';
import { BotSelectorModal } from './components/BotSelectorModal';
import { MatchmakingModal } from './components/MatchmakingModal';
import { LiveChatDrawer } from './components/LiveChatDrawer';
import { ReportModal } from './components/ReportModal';
import type { ShareCardPayload } from './utils/shareCard';

const SPEED_CONFIG: Record<
  GameSpeed,
  {
    aiThinkMs: number;
    telegraphMs: number;
    placeReserveMs: number;
    pickupMs: number;
    relayMs: number;
    captureMs: number;
    dropMs: number;
  }
> = {
  slow: {
    aiThinkMs: 1150,
    telegraphMs: 520,
    placeReserveMs: 440,
    pickupMs: 360,
    relayMs: 420,
    captureMs: 680,
    dropMs: 340,
  },
  x1: {
    aiThinkMs: 850,
    telegraphMs: 400,
    placeReserveMs: 340,
    pickupMs: 280,
    relayMs: 340,
    captureMs: 540,
    dropMs: 220,
  },
  x2: {
    aiThinkMs: 420,
    telegraphMs: 190,
    placeReserveMs: 165,
    pickupMs: 135,
    relayMs: 165,
    captureMs: 260,
    dropMs: 105,
  },
  instant: {
    aiThinkMs: 240,
    telegraphMs: 0,
    placeReserveMs: 0,
    pickupMs: 0,
    relayMs: 0,
    captureMs: 0,
    dropMs: 0,
  },
};

const DEFAULT_ACCESSIBILITY: AccessibilityPrefs = {
  largeTextAndSeeds: false,
  colorblindMode: false,
  vibrationEnabled: true,
  showDangerAlerts: true,
  guidedRules: true,
  ambientSoundEnabled: false,
};

function getStoredProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem('mraha_profile');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      if (parsed.clientId && parsed.name) {
        const cleanName = parsed.name === 'Mfundi' ? 'Joueur' : parsed.name;
        const resolvedAvatar = resolveAvatarId(parsed.avatarId);
        const normalized: PlayerProfile = {
          clientId: parsed.clientId,
          name: cleanName,
          island: '',
          avatarId: resolvedAvatar,
          accountId: parsed.accountId,
        };
        if (cleanName !== parsed.name || normalized.avatarId !== parsed.avatarId) {
          localStorage.setItem('mraha_profile', JSON.stringify(normalized));
        }
        return normalized;
      }
    }
  } catch {
    // ignore storage errors
  }
  const fresh: PlayerProfile = {
    clientId: `mrh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Joueur',
    island: '',
    avatarId: undefined,
  };
  try {
    localStorage.setItem('mraha_profile', JSON.stringify(fresh));
  } catch {
    // ignore
  }
  return fresh;
}

function getStoredSelectedBotId(defeatedBotIds: string[]): string {
  try {
    const raw = localStorage.getItem('mraha_selected_bot');
    if (raw) {
      const bot = getBotById(raw);
      if (isBotUnlocked(bot.id, defeatedBotIds)) {
        return bot.id;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_BOT_ID;
}

function getStoredRuleConfig(): MrahaRuleConfig {
  try {
    const raw = localStorage.getItem('mraha_rule_config');
    if (raw) {
      return { ...DEFAULT_RULE_CONFIG, ...(JSON.parse(raw) as Partial<MrahaRuleConfig>) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_RULE_CONFIG };
}

function getStoredSpeed(): GameSpeed {
  try {
    const raw = localStorage.getItem('mraha_speed');
    if (raw === 'slow' || raw === 'x1' || raw === 'x2' || raw === 'instant') {
      return raw;
    }
  } catch {
    // ignore
  }
  return 'x1';
}

function getStoredAccessibility(): AccessibilityPrefs {
  try {
    const raw = localStorage.getItem('mraha_accessibility');
    if (raw) {
      return {
        ...DEFAULT_ACCESSIBILITY,
        ...(JSON.parse(raw) as Partial<AccessibilityPrefs>),
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_ACCESSIBILITY };
}

function getStoredThemeId(prog: ProgressionState): BoardThemeId {
  try {
    const raw = localStorage.getItem('mraha_theme') as BoardThemeId | null;
    if (
      (raw === 'mahogany' ||
        raw === 'stone' ||
        raw === 'chiromani' ||
        raw === 'lightwood' ||
        raw === 'ebony' ||
        raw === 'sand') &&
      getBoardTheme(raw).isUnlocked(prog)
    ) {
      return raw;
    }
  } catch {
    // ignore
  }
  return 'mahogany';
}

function resolveStarter(pref: StartingPlayerPref): PlayerId {
  if (pref === 'p2') return 1;
  if (pref === 'random') return Math.random() < 0.5 ? 0 : 1;
  return 0;
}

function buildLastMoveHighlight(
  player: PlayerId,
  fromRow: number,
  fromCol: number,
  steps: MoveStep[]
): LastMoveHighlight {
  let landingRow: number | null = null;
  let landingCol: number | null = null;
  const capturedColsSet = new Set<number>();

  for (const s of steps) {
    if (s.type === 'drop' || s.type === 'place_reserve') {
      landingRow = s.row;
      landingCol = s.col;
    }
    if (s.type === 'capture' && typeof s.capturedFromCol === 'number') {
      capturedColsSet.add(s.capturedFromCol);
    }
  }

  return {
    player,
    fromRow,
    fromCol,
    landingRow,
    landingCol,
    capturedCols: Array.from(capturedColsSet),
  };
}

function botEloToLegacyDiff(elo: number): AiDifficulty {
  if (elo >= 1400) return 'hard';
  if (elo >= 900) return 'medium';
  return 'easy';
}

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => getStoredProfile());
  const [ruleConfig, setRuleConfig] = useState<MrahaRuleConfig>(() => getStoredRuleConfig());
  const [startingPlayerPref, setStartingPlayerPref] = useState<StartingPlayerPref>('p1');
  const [localHiddenNyumba, setLocalHiddenNyumba] = useState<[boolean, boolean]>(() => {
    try {
      return [localStorage.getItem('mraha_hide_nyumba') === '1', false];
    } catch {
      return [false, false];
    }
  });
  const [progression, setProgression] = useState<ProgressionState>(() => loadProgression());
  const [selectedBotId, setSelectedBotId] = useState<string>(() =>
    getStoredSelectedBotId(loadProgression().defeatedBotIds)
  );
  const [accessibility, setAccessibility] = useState<AccessibilityPrefs>(() =>
    getStoredAccessibility()
  );
  const [themeId, setThemeId] = useState<BoardThemeId>(() => getStoredThemeId(loadProgression()));

  const language: UiLanguage = 'fr';
  const [screen, setScreen] = useState<ScreenMode>('TITLE');
  const [mode, setMode] = useState<PlayMode>('solo');
  const [speed, setSpeed] = useState<GameSpeed>(() => getStoredSpeed());
  const [player2Name] = useState('Joueur 2');

  const activeBot = getBotById(selectedBotId);
  const legacyDifficulty = botEloToLegacyDiff(activeBot.elo);

  // Compte joueur & photo de profil
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authAccount, setAuthAccount] = useState<AuthAccount | null>(null);
  const [playerElo, setPlayerElo] = useState<number>(1200);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showBotSelector, setShowBotSelector] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Chat en direct (WebSocket en jeu uniquement)
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [chatOnlineCount, setChatOnlineCount] = useState(1);
  const [chatConnected, setChatConnected] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatPreviewBanner, setChatPreviewBanner] = useState<{
    pseudo: string;
    text: string;
  } | null>(null);

  const [gameState, setGameState] = useState<GameStateSnapshot>(() =>
    createInitialGameState(0, ruleConfig)
  );
  const [displayBoard, setDisplayBoard] = useState<number[][]>(
    () => createInitialGameState(0, ruleConfig).board
  );
  const [displayReserves, setDisplayReserves] = useState<[number, number]>(
    () => createInitialGameState(0, ruleConfig).reserves
  );
  const [activeStep, setActiveStep] = useState<MoveStep | null>(null);
  const [telegraphPit, setTelegraphPit] = useState<{ row: number; col: number } | null>(null);
  const [lastOpponentMove, setLastOpponentMove] = useState<LastMoveHighlight | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBoardPaused, setIsBoardPaused] = useState(false);

  // Saved Match History, Autosave & Duration Tracking
  const [autosavedMatch, setAutosavedMatch] = useState<AutosavedMatch | null>(() =>
    loadAutosavedMatch()
  );
  const [savedMatchHistory, setSavedMatchHistory] = useState<SavedMatchRecord[]>(() =>
    loadLocalMatchHistory()
  );
  const matchStartTimeRef = useRef<number>(Date.now());
  const baseElapsedSecondsRef = useRef<number>(0);
  const matchMovesRef = useRef<SavedMatchMove[]>([]);
  const [matchDurationSeconds, setMatchDurationSeconds] = useState<number | null>(null);

  // Modales
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [tutorialInitialTab, setTutorialInitialTab] = useState<'tutorial' | 'puzzles'>('puzzles');
  const [showRules, setShowRules] = useState(false);
  const [showCulture, setShowCulture] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('params');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [muted, setMuted] = useState(() => soundEngine.isMuted());

  // ELO feedback & Bot débloqué
  const [eloFeedback, setEloFeedback] = useState<{ rating: number; delta: number } | null>(null);
  const [unlockedNextBot, setUnlockedNextBot] = useState<{ name: string; elo: number } | null>(null);
  const settledMatchKeyRef = useRef<string | null>(null);

  // Matchmaking & Jeu en ligne 1v1 ELO
  const onlineClientRef = useRef<MrahaOnlineClient | null>(null);
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [queueStatus, setQueueStatus] = useState<MatchmakingQueueStatus | null>(null);
  const [matchmakingError, setMatchmakingError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomSnapshot | null>(null);
  const [myOnlineIndex, setMyOnlineIndex] = useState<PlayerId>(0);
  const [incomingEmote, setIncomingEmote] = useState<{
    from: PlayerId;
    text: string;
    id: number;
  } | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<IncomingChallenge | null>(null);
  const [challengeNotice, setChallengeNotice] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [simulatedVictoryPayload, setSimulatedVictoryPayload] = useState<ShareCardPayload | null>(
    null
  );
  const challengeNoticeTimerRef = useRef<number | null>(null);

  const speedRef = useRef<GameSpeed>(speed);
  speedRef.current = speed;
  const gameStateRef = useRef<GameStateSnapshot>(gameState);
  gameStateRef.current = gameState;

  const chatClientRef = useRef<MrahaChatClient | null>(null);
  const showLiveChatRef = useRef(showLiveChat);
  showLiveChatRef.current = showLiveChat;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const myChatPseudo = authAccount?.pseudo || profile.name;
  const myAvatarId = resolveAvatarId(authAccount?.avatarId ?? profile.avatarId);
  const myPseudoRef = useRef(myChatPseudo);
  myPseudoRef.current = myChatPseudo;
  const myAvatarRef = useRef(myAvatarId);
  myAvatarRef.current = myAvatarId;
  const chatBannerTimerRef = useRef<number | null>(null);

  const animationCancelRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const lastDisplayedReservesRef = useRef<[number, number]>([22, 22]);
  const aiTimerRef = useRef<number | null>(null);
  const emoteTimerRef = useRef<number | null>(null);

  // Charger ELO du joueur courant
  useEffect(() => {
    if (authAccount) {
      setPlayerElo(authAccount.rating);
      return;
    }
    fetch(`/api/leaderboard?player=${encodeURIComponent(profile.name)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.me?.rating) setPlayerElo(d.me.rating);
      })
      .catch(() => {});
  }, [authAccount, profile.name]);

  useEffect(() => {
    soundEngine.setVibrationEnabled(accessibility.vibrationEnabled);
    soundEngine.setAmbientEnabled(Boolean(accessibility.ambientSoundEnabled));
  }, [accessibility.vibrationEnabled, accessibility.ambientSoundEnabled]);

  const clearTimers = useCallback(() => {
    animationCancelRef.current = true;
    if (rafIdRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setTelegraphPit(null);
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Chat en direct WebSocket
  useEffect(() => {
    const client = new MrahaChatClient(
      {
        channel: 'global',
        pseudo: myPseudoRef.current,
        island: '',
        avatarId: myAvatarRef.current,
      },
      {
        onHistory: (msgs) => {
          setChatMessages(msgs);
        },
        onMessage: (msg) => {
          setChatMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev.slice(-79), msg]
          );
          if (
            screenRef.current === 'PLAYING' &&
            !showLiveChatRef.current &&
            msg.pseudo !== myPseudoRef.current
          ) {
            setUnreadChatCount((c) => Math.min(99, c + 1));
          }
        },
        onReactionUpdate: (messageId, reactions) => {
          setChatMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
          );
        },
        onPresence: (onlineCount) => {
          setChatOnlineCount(onlineCount);
        },
        onStatusChange: (connected) => {
          setChatConnected(connected);
        },
      }
    );

    chatClientRef.current = client;
    client.connect();

    return () => {
      if (chatBannerTimerRef.current !== null) {
        window.clearTimeout(chatBannerTimerRef.current);
        chatBannerTimerRef.current = null;
      }
      client.disconnect();
      chatClientRef.current = null;
    };
  }, []);

  useEffect(() => {
    chatClientRef.current?.updateIdentity(myChatPseudo, '', myAvatarId);
  }, [myChatPseudo, myAvatarId]);

  useEffect(() => {
    if (screen === 'PLAYING' && mode === 'duo-online' && onlineRoom?.code) {
      chatClientRef.current?.setChannel(`room-${onlineRoom.code}`);
    } else {
      chatClientRef.current?.setChannel('global');
    }
  }, [screen, mode, onlineRoom?.code]);

  const handleOpenLiveChat = () => {
    if (screenRef.current !== 'PLAYING') return;
    setShowLiveChat(true);
    setUnreadChatCount(0);
    setChatPreviewBanner(null);
  };

  const handleOpenPhotoModal = () => {
    setPhotoError(null);
    setShowPhotoModal(true);
  };

  const handleSavePhoto = async (nextPhotoDataUrl: string) => {
    setPhotoError(null);

    if (authToken && authAccount) {
      setPhotoSaving(true);
      try {
        const res = await fetch('/api/auth/avatar', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ avatarId: nextPhotoDataUrl }),
        });
        const data = (await res.json()) as { account?: AuthAccount; error?: string };
        if (!res.ok || !data.account) {
          setPhotoError(data.error || 'Impossible de mettre à jour la photo.');
          return;
        }
        setAuthAccount(data.account);
      } catch {
        setPhotoError('Serveur inaccessible pour le moment.');
        return;
      } finally {
        setPhotoSaving(false);
      }
    }

    const updated: PlayerProfile = {
      ...profile,
      avatarId: resolveAvatarId(nextPhotoDataUrl),
    };
    setProfile(updated);
    try {
      localStorage.setItem('mraha_profile', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setShowPhotoModal(false);
  };

  const handleAuthSuccess = (token: string, account: AuthAccount) => {
    setAuthToken(token);
    setAuthAccount(account);
    setPlayerElo(account.rating);
    const updated: PlayerProfile = {
      ...profile,
      accountId: account.id,
      name: account.pseudo,
      island: '',
      avatarId: resolveAvatarId(account.avatarId),
    };
    setProfile(updated);
    try {
      localStorage.setItem('mraha_profile', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    if (authToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    setAuthToken(null);
    setAuthAccount(null);
  };

  const handleSelectBot = (botId: string) => {
    if (!isBotUnlocked(botId, progression.defeatedBotIds)) return;
    setSelectedBotId(botId);
    try {
      localStorage.setItem('mraha_selected_bot', botId);
    } catch {
      // ignore
    }
  };

  const handleChangeRuleConfig = (cfg: MrahaRuleConfig) => {
    setRuleConfig(cfg);
    try {
      localStorage.setItem('mraha_rule_config', JSON.stringify(cfg));
    } catch {
      // ignore
    }
  };

  const handleChangeSpeed = (next: GameSpeed) => {
    setSpeed(next);
    try {
      localStorage.setItem('mraha_speed', next);
    } catch {
      // ignore
    }
  };

  const handleChangeAccessibility = (next: AccessibilityPrefs) => {
    setAccessibility(next);
    try {
      localStorage.setItem('mraha_accessibility', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleChangeThemeId = (next: BoardThemeId) => {
    setThemeId(next);
    try {
      localStorage.setItem('mraha_theme', next);
    } catch {
      // ignore
    }
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  };

  const handleToggleHideNyumba = (playerIdx: PlayerId = 0) => {
    if (mode === 'duo-online' && onlineRoom) {
      if (playerIdx !== myOnlineIndex) return;
      const currentHidden = Boolean(onlineRoom.players[myOnlineIndex]?.nyumbaHidden);
      onlineClientRef.current?.toggleHideNyumba(onlineRoom.code, !currentHidden);
      return;
    }

    setLocalHiddenNyumba((prev) => {
      const nextHidden = !prev[playerIdx];
      const next: [boolean, boolean] =
        playerIdx === 0 ? [nextHidden, prev[1]] : [prev[0], nextHidden];
      if (playerIdx === 0) {
        try {
          localStorage.setItem('mraha_hide_nyumba', nextHidden ? '1' : '0');
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const handleSolveChallenge = (challengeId: number) => {
    setProgression((prev) => {
      const solved = prev.solvedChallengeIds.includes(challengeId)
        ? prev.solvedChallengeIds
        : [...prev.solvedChallengeIds, challengeId];
      const today = getTodayDateKey();
      const daily = getDailyChallenge(prev);
      const dailyCompletedDate =
        daily.targetType === 'challenge_star' ? today : prev.dailyCompletedDate;
      const next: ProgressionState = {
        ...prev,
        solvedChallengeIds: solved,
        dailyCompletedDate,
      };
      saveProgression(next);
      return next;
    });
  };

  const handleCompleteInteractiveTutorial = () => {
    setProgression((prev) => {
      if (prev.completedInteractiveTutorial) return prev;
      const next: ProgressionState = {
        ...prev,
        completedInteractiveTutorial: true,
      };
      saveProgression(next);
      return next;
    });
  };

  const recordExecutedMove = useCallback(
    (
      stateBefore: GameStateSnapshot,
      stateAfter: GameStateSnapshot,
      player: PlayerId,
      row: number,
      col: number,
      loopDir: LoopDir,
      steps: MoveStep[],
      nyumbaChoice?: 'stop' | 'continue'
    ) => {
      const capturedInTurn = Math.max(
        0,
        stateAfter.captures[player] - stateBefore.captures[player]
      );
      const relaysInTurn = steps.filter((s) => s.type === 'relay').length;
      const kind =
        stateAfter.lastMove?.kind || (capturedInTurn > 0 ? 'capture' : 'trakatra');

      const moveEntry: SavedMatchMove = {
        turnNumber: stateAfter.turnCount,
        player,
        row,
        col,
        loopDir,
        nyumbaChoice,
        usedErrorRight: stateAfter.usedErrorRightThisTurn,
        stateBefore,
        stateAfter,
        capturedInTurn,
        relaysInTurn,
        kind,
      };
      matchMovesRef.current = [...matchMovesRef.current, moveEntry];

      if (steps.length > 0) {
        setLastOpponentMove(buildLastMoveHighlight(player, row, col, steps));
      }
    },
    []
  );

  const playAnimatedSteps = useCallback(
    (
      steps: MoveStep[],
      finalState: GameStateSnapshot,
      forceAnimate = false
    ): Promise<void> => {
      if (rafIdRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      animationCancelRef.current = false;

      if (!forceAnimate && speedRef.current === 'instant') {
        if (steps.some((s) => s.type === 'capture')) {
          soundEngine.playCapture();
        } else if (steps.length > 0) {
          soundEngine.playSeedDrop(0);
        }
        setActiveStep(null);
        setGameState(finalState);
        setDisplayBoard(finalState.board);
        lastDisplayedReservesRef.current = finalState.reserves;
        setDisplayReserves(finalState.reserves);
        if (finalState.winner !== null) {
          soundEngine.playVictory();
        }
        return Promise.resolve();
      }

      if (steps.length === 0) {
        setActiveStep(null);
        setGameState(finalState);
        setDisplayBoard(finalState.board);
        lastDisplayedReservesRef.current = finalState.reserves;
        setDisplayReserves(finalState.reserves);
        if (finalState.winner !== null) {
          soundEngine.playVictory();
        }
        return Promise.resolve();
      }

      setIsAnimating(true);

      const effectiveSpeed: GameSpeed =
        forceAnimate && speedRef.current === 'instant' ? 'x1' : speedRef.current;
      const cfg = SPEED_CONFIG[effectiveSpeed];

      const getStepDuration = (step: MoveStep): number => {
        if (step.type === 'place_reserve') return cfg.placeReserveMs;
        if (step.type === 'pickup') return cfg.pickupMs;
        if (step.type === 'relay') return cfg.relayMs;
        if (step.type === 'capture') return cfg.captureMs;
        return cfg.dropMs;
      };

      return new Promise<void>((resolve) => {
        let stepIndex = 0;
        let dropToneIdx = 0;
        let nextStepAtMs = 0;
        let finishingAtMs: number | null = null;

        const finish = () => {
          rafIdRef.current = null;
          setActiveStep(null);
          setIsAnimating(false);
          if (!animationCancelRef.current) {
            setGameState(finalState);
            setDisplayBoard(finalState.board);
            const prevRes = lastDisplayedReservesRef.current;
            if (
              prevRes[0] !== finalState.reserves[0] ||
              prevRes[1] !== finalState.reserves[1]
            ) {
              lastDisplayedReservesRef.current = finalState.reserves;
              setDisplayReserves(finalState.reserves);
            }
            if (finalState.winner !== null) {
              soundEngine.playVictory();
            }
          }
          resolve();
        };

        const tick = (now: number) => {
          if (animationCancelRef.current) {
            finish();
            return;
          }

          if (finishingAtMs !== null) {
            if (now >= finishingAtMs) {
              finish();
              return;
            }
            rafIdRef.current = window.requestAnimationFrame(tick);
            return;
          }

          if (nextStepAtMs === 0) {
            nextStepAtMs = now;
          }

          if (now >= nextStepAtMs && stepIndex < steps.length) {
            const step = steps[stepIndex];
            stepIndex += 1;

            setActiveStep(step);
            setDisplayBoard(step.board);

            const prevRes = lastDisplayedReservesRef.current;
            if (prevRes[0] !== step.reserves[0] || prevRes[1] !== step.reserves[1]) {
              lastDisplayedReservesRef.current = step.reserves;
              setDisplayReserves(step.reserves);
            }

            if (step.type === 'place_reserve') {
              soundEngine.playSeedDrop(dropToneIdx++);
            } else if (step.type === 'pickup' || step.type === 'relay') {
              dropToneIdx = 0;
              soundEngine.playPickup();
            } else if (step.type === 'capture') {
              soundEngine.playCapture();
            } else {
              soundEngine.playSeedDrop(dropToneIdx++);
            }

            const duration = getStepDuration(step);
            if (stepIndex >= steps.length) {
              finishingAtMs = now + duration;
            } else {
              nextStepAtMs = Math.max(now + 16, nextStepAtMs + duration);
            }
          }

          rafIdRef.current = window.requestAnimationFrame(tick);
        };

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          rafIdRef.current = window.requestAnimationFrame(tick);
        } else {
          finish();
        }
      });
    },
    []
  );

  // Sauvegarde automatique hors ligne pour solo & duo-local
  useEffect(() => {
    if (screen !== 'PLAYING' || mode === 'duo-online' || isAnimating) return;
    if (gameState.winner !== null) {
      clearAutosavedMatch();
      setAutosavedMatch(null);
      return;
    }
    if (gameState.turnCount <= 0) return;

    const elapsedSeconds =
      baseElapsedSecondsRef.current +
      Math.max(0, Math.round((Date.now() - matchStartTimeRef.current) / 1000));

    const snap: AutosavedMatch = {
      mode,
      difficulty: legacyDifficulty,
      botId: activeBot.id,
      player2Name,
      gameState,
      elapsedSeconds,
      lastOpponentMove,
      moves: matchMovesRef.current,
      savedAt: new Date().toISOString(),
    };
    saveAutosavedMatch(snap);
    setAutosavedMatch(snap);
  }, [
    screen,
    mode,
    legacyDifficulty,
    activeBot.id,
    player2Name,
    gameState,
    isAnimating,
    lastOpponentMove,
  ]);

  // Record match progression, local match history & Solo match to ELO leaderboard
  useEffect(() => {
    if (screen !== 'PLAYING' || gameState.winner === null || isAnimating) {
      return;
    }

    const matchKey = `${mode}-${gameState.turnCount}-${gameState.winner}-${gameState.captures.join('-')}`;
    if (settledMatchKeyRef.current === matchKey) return;
    settledMatchKeyRef.current = matchKey;

    clearAutosavedMatch();
    setAutosavedMatch(null);

    const durationSeconds =
      baseElapsedSecondsRef.current +
      Math.max(1, Math.round((Date.now() - matchStartTimeRef.current) / 1000));
    setMatchDurationSeconds(durationSeconds);

    const localIdx: PlayerId = mode === 'duo-online' ? myOnlineIndex : 0;
    const didWin = mode === 'duo-local' ? true : gameState.winner === localIdx;
    const captures =
      mode === 'duo-local' ? gameState.captures[gameState.winner] : gameState.captures[localIdx];

    setProgression((prev) => {
      const wasFirstWinVsCurrentBot =
        didWin && mode === 'solo' && !prev.defeatedBotIds.includes(activeBot.id);
      const { next } = recordGameProgression(prev, didWin, captures, {
        longestRelay: gameState.longestRelay[localIdx],
        difficulty: legacyDifficulty,
        botId: activeBot.id,
        isSolo: mode === 'solo',
        keptNyumbaIntact: gameState.nyumbaIntact[localIdx],
      });
      if (wasFirstWinVsCurrentBot) {
        const nextBot = getNextUnlockedBot(activeBot.id, next.defeatedBotIds);
        if (nextBot) {
          setUnlockedNextBot({ name: nextBot.name, elo: nextBot.elo });
        }
      }
      return next;
    });

    const p0DisplayName =
      mode === 'duo-online' && onlineRoom?.players[0]
        ? onlineRoom.players[0].name
        : myChatPseudo;
    const p1DisplayName =
      mode === 'duo-online' && onlineRoom?.players[1]
        ? onlineRoom.players[1].name
        : mode === 'solo'
        ? `${activeBot.name} (${activeBot.elo})`
        : player2Name.trim() || 'Joueur 2';

    const localRecord: SavedMatchRecord = {
      id: `match-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mode,
      difficulty: mode === 'solo' ? legacyDifficulty : undefined,
      botId: mode === 'solo' ? activeBot.id : undefined,
      player0Name: p0DisplayName,
      player1Name: p1DisplayName,
      winner: gameState.winner,
      winReason: gameState.winReason || 'Kamuv !',
      durationSeconds,
      turnCount: gameState.turnCount,
      player0Seeds: getPlayerTotalSeeds(gameState.board, 0, gameState.reserves),
      player1Seeds: getPlayerTotalSeeds(gameState.board, 1, gameState.reserves),
      captures: [...gameState.captures] as [number, number],
      longestRelay: [...gameState.longestRelay] as [number, number],
      createdAt: new Date().toISOString(),
      moves: matchMovesRef.current,
    };
    setSavedMatchHistory(saveLocalMatchHistory(localRecord));

    if (mode !== 'solo') return;

    const aiTitle = `${activeBot.name} (${activeBot.elo})`;

    fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'solo',
        difficulty: legacyDifficulty,
        botId: activeBot.id,
        botElo: activeBot.elo,
        player0Name: myChatPseudo,
        player0Island: '',
        player0AvatarId: myAvatarId || '',
        player1Name: aiTitle,
        player1Island: '',
        winnerIndex: gameState.winner,
        player0Seeds: getPlayerTotalSeeds(gameState.board, 0, gameState.reserves),
        player1Seeds: getPlayerTotalSeeds(gameState.board, 1, gameState.reserves),
        player0Captures: gameState.captures[0],
        player1Captures: gameState.captures[1],
        player0BestRelay: gameState.longestRelay[0],
        player1BestRelay: gameState.longestRelay[1],
        turnCount: gameState.turnCount,
        winReason: gameState.winReason || 'Kamuv !',
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.p0Rating === 'number') {
          setEloFeedback({ rating: data.p0Rating, delta: data.p0Delta });
          setPlayerElo(data.p0Rating);
        }
      })
      .catch(() => {});
  }, [
    screen,
    mode,
    activeBot.id,
    activeBot.name,
    activeBot.elo,
    legacyDifficulty,
    gameState,
    isAnimating,
    myOnlineIndex,
    onlineRoom,
    player2Name,
    myChatPseudo,
    myAvatarId,
  ]);

  // AI turn execution
  useEffect(() => {
    if (
      screen !== 'PLAYING' ||
      mode !== 'solo' ||
      gameState.winner !== null ||
      gameState.currentTurn !== 1 ||
      isAnimating ||
      isBoardPaused ||
      showSettings ||
      showTutorial ||
      showRules ||
      showCulture ||
      showStats ||
      showReplay ||
      showAccountModal ||
      showPhotoModal ||
      showBotSelector ||
      showLiveChat
    ) {
      return;
    }

    const cfg = SPEED_CONFIG[speedRef.current];

    if (gameState.pendingNyumbaChoice && gameState.pendingNyumbaChoice.player === 1) {
      const pending = gameState.pendingNyumbaChoice;
      aiTimerRef.current = window.setTimeout(() => {
        const decision = chooseAiNyumbaDecision(gameState, 1, activeBot.id);
        const { nextState, steps } = resolveNyumbaChoice(gameState, decision, true, false);
        recordExecutedMove(
          gameState,
          nextState,
          1,
          pending.startRow,
          pending.startCol,
          pending.startLoopDir,
          steps,
          decision
        );
        playAnimatedSteps(steps, nextState);
      }, cfg.aiThinkMs);
      return () => {
        if (aiTimerRef.current !== null) {
          window.clearTimeout(aiTimerRef.current);
          aiTimerRef.current = null;
        }
      };
    }

    aiTimerRef.current = window.setTimeout(() => {
      const move = chooseAiMove(gameState, 1, activeBot.id);
      if (!move) return;

      if (cfg.telegraphMs > 0) {
        setTelegraphPit({ row: move.row, col: move.col });
      }

      aiTimerRef.current = window.setTimeout(() => {
        setTelegraphPit(null);
        const { nextState, steps } = executeMove(
          gameState,
          1,
          move.row,
          move.col,
          move.loopDir,
          true,
          false
        );
        recordExecutedMove(
          gameState,
          nextState,
          1,
          move.row,
          move.col,
          move.loopDir,
          steps
        );
        playAnimatedSteps(steps, nextState);
      }, cfg.telegraphMs);
    }, cfg.aiThinkMs);

    return () => {
      if (aiTimerRef.current !== null) {
        window.clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [
    screen,
    mode,
    gameState,
    activeBot.id,
    isAnimating,
    isBoardPaused,
    showSettings,
    showTutorial,
    showRules,
    showCulture,
    showStats,
    showReplay,
    showAccountModal,
    showPhotoModal,
    showBotSelector,
    showLiveChat,
    playAnimatedSteps,
    recordExecutedMove,
  ]);

  // Persistent Online Matchmaking & Room WebSocket Client
  const ensureOnlineClient = useCallback(() => {
    if (onlineClientRef.current) {
      onlineClientRef.current.updateProfile({
        clientId: profile.clientId,
        name: myChatPseudo,
        avatarId: myAvatarId,
        authToken,
      });
      return onlineClientRef.current;
    }

    const client = new MrahaOnlineClient(
      {
        clientId: profile.clientId,
        name: myChatPseudo,
        avatarId: myAvatarId,
        authToken,
      },
      {
        onStatusChange: setConnectionStatus,
        onError: (msg) => setMatchmakingError(msg),
        onQueueUpdate: (status) => {
          setMatchmakingError(null);
          setQueueStatus(status);
        },
        onRoomReady: (room, playerIndex) => {
          setShowMatchmaking(false);
          setMatchmakingError(null);
          setQueueStatus(null);
          setMyOnlineIndex(playerIndex);
          setOnlineRoom(room);
          setMode('duo-online');
          setScreen('PLAYING');
          setEloFeedback(null);
          setUnlockedNextBot(null);
          setLastOpponentMove(null);
          settledMatchKeyRef.current = null;
          matchStartTimeRef.current = Date.now();
          baseElapsedSecondsRef.current = 0;
          matchMovesRef.current = [];
          setMatchDurationSeconds(null);
          clearTimers();
          setIsAnimating(false);
          setActiveStep(null);
          setIsBoardPaused(false);
          setGameState(room.state);
          setDisplayBoard(room.state.board);
          setDisplayReserves(room.state.reserves);
        },
        onRoomState: (room) => {
          setOnlineRoom(room);
        },
        onGameMoved: ({ room, playerIndex, steps, eloDeltas }) => {
          setOnlineRoom(room);
          setMyOnlineIndex(playerIndex);

          if (eloDeltas) {
            const delta = playerIndex === 0 ? eloDeltas.p0Delta : eloDeltas.p1Delta;
            const rating = playerIndex === 0 ? eloDeltas.p0Rating : eloDeltas.p1Rating;
            setEloFeedback({ rating, delta });
            setPlayerElo(rating);
          }

          const prevState = gameStateRef.current;
          if (room.state.lastMove && steps.length > 0) {
            recordExecutedMove(
              prevState,
              room.state,
              room.state.lastMove.player,
              room.state.lastMove.row,
              room.state.lastMove.col,
              room.state.lastMove.loopDir,
              steps
            );
          }

          if (steps.length > 0) {
            playAnimatedSteps(steps, room.state);
          } else {
            setGameState(room.state);
            setDisplayBoard(room.state.board);
            setDisplayReserves(room.state.reserves);
            if (room.state.winner !== null) {
              soundEngine.playVictory();
            }
          }
        },
        onEmote: (fromPlayer, text) => {
          setIncomingEmote({
            from: fromPlayer,
            text,
            id: Date.now(),
          });
          if (emoteTimerRef.current !== null) {
            window.clearTimeout(emoteTimerRef.current);
          }
          emoteTimerRef.current = window.setTimeout(() => {
            setIncomingEmote(null);
          }, 2600);
        },
        onChallengeIncoming: (challenge) => {
          setIncomingChallenge(challenge);
        },
        onChallengeSent: (toName) => {
          setChallengeNotice(`Défi 1v1 envoyé à ${toName}…`);
          if (challengeNoticeTimerRef.current !== null) {
            window.clearTimeout(challengeNoticeTimerRef.current);
          }
          challengeNoticeTimerRef.current = window.setTimeout(() => {
            setChallengeNotice(null);
          }, 4000);
        },
        onChallengeDeclined: (reason) => {
          setChallengeNotice(reason);
          if (challengeNoticeTimerRef.current !== null) {
            window.clearTimeout(challengeNoticeTimerRef.current);
          }
          challengeNoticeTimerRef.current = window.setTimeout(() => {
            setChallengeNotice(null);
          }, 3500);
        },
        onChallengeError: (message) => {
          setChallengeNotice(message);
          if (challengeNoticeTimerRef.current !== null) {
            window.clearTimeout(challengeNoticeTimerRef.current);
          }
          challengeNoticeTimerRef.current = window.setTimeout(() => {
            setChallengeNotice(null);
          }, 3500);
        },
      }
    );

    onlineClientRef.current = client;
    return client;
  }, [
    profile.clientId,
    myChatPseudo,
    myAvatarId,
    authToken,
    clearTimers,
    playAnimatedSteps,
    recordExecutedMove,
  ]);

  // Maintien de la connexion de présence WebSocket pour statut En ligne / En partie et défis 1v1
  useEffect(() => {
    const client = ensureOnlineClient();
    client.connect();
  }, [ensureOnlineClient]);

  useEffect(() => {
    onlineClientRef.current?.setInGamePresence(screen === 'PLAYING');
  }, [screen]);

  useEffect(() => {
    return () => {
      if (challengeNoticeTimerRef.current !== null) {
        window.clearTimeout(challengeNoticeTimerRef.current);
      }
      onlineClientRef.current?.disconnect();
      onlineClientRef.current = null;
    };
  }, []);

  const handleStartOnlineMatchmaking = () => {
    setMatchmakingError(null);
    setQueueStatus({
      elapsedSec: 0,
      tolerance: 100,
      myRating: playerElo,
      queueSize: 1,
    });
    setShowMatchmaking(true);
    const client = ensureOnlineClient();
    client.connectAndQueue();
  };

  const handleCancelMatchmaking = () => {
    onlineClientRef.current?.leaveMatchmaking();
    setShowMatchmaking(false);
    setQueueStatus(null);
    setMatchmakingError(null);
  };

  const resetLocalMatchTracking = () => {
    matchStartTimeRef.current = Date.now();
    baseElapsedSecondsRef.current = 0;
    matchMovesRef.current = [];
    setMatchDurationSeconds(null);
    setLastOpponentMove(null);
    setEloFeedback(null);
    setUnlockedNextBot(null);
    settledMatchKeyRef.current = null;
    clearAutosavedMatch();
    setAutosavedMatch(null);
  };

  const startSoloGame = (overrideBotId?: string) => {
    clearTimers();
    if (overrideBotId) {
      handleSelectBot(overrideBotId);
    }
    const starter = resolveStarter(startingPlayerPref);
    const fresh = createInitialGameState(starter, ruleConfig);
    resetLocalMatchTracking();
    setMode('solo');
    setGameState(fresh);
    setDisplayBoard(fresh.board);
    setDisplayReserves(fresh.reserves);
    setActiveStep(null);
    setIsAnimating(false);
    setIsBoardPaused(false);
    setScreen('PLAYING');
  };

  const startDuoLocalGame = () => {
    clearTimers();
    const starter = resolveStarter(startingPlayerPref);
    const fresh = createInitialGameState(starter, ruleConfig);
    resetLocalMatchTracking();
    setMode('duo-local');
    setGameState(fresh);
    setDisplayBoard(fresh.board);
    setDisplayReserves(fresh.reserves);
    setActiveStep(null);
    setIsAnimating(false);
    setIsBoardPaused(false);
    setScreen('PLAYING');
  };

  const handleResumeAutosave = () => {
    if (!autosavedMatch) return;
    clearTimers();
    setMode(autosavedMatch.mode);
    if (autosavedMatch.botId && isBotUnlocked(autosavedMatch.botId, progression.defeatedBotIds)) {
      setSelectedBotId(autosavedMatch.botId);
    } else if (autosavedMatch.difficulty) {
      const mapped = getBotById(autosavedMatch.difficulty);
      if (isBotUnlocked(mapped.id, progression.defeatedBotIds)) {
        setSelectedBotId(mapped.id);
      }
    }
    setGameState(autosavedMatch.gameState);
    setDisplayBoard(autosavedMatch.gameState.board);
    setDisplayReserves(autosavedMatch.gameState.reserves);
    setLastOpponentMove(autosavedMatch.lastOpponentMove);
    matchMovesRef.current = autosavedMatch.moves || [];
    baseElapsedSecondsRef.current = autosavedMatch.elapsedSeconds || 0;
    matchStartTimeRef.current = Date.now();
    setMatchDurationSeconds(null);
    setEloFeedback(null);
    setUnlockedNextBot(null);
    settledMatchKeyRef.current = null;
    setActiveStep(null);
    setIsAnimating(false);
    setIsBoardPaused(false);
    setScreen('PLAYING');
  };

  const handleDiscardAutosave = () => {
    clearAutosavedMatch();
    setAutosavedMatch(null);
  };

  const handleMakeMove = (row: number, col: number, loopDir: LoopDir) => {
    if (isAnimating || gameState.winner !== null) return;
    soundEngine.unlock();

    if (mode === 'duo-online') {
      if (!onlineRoom || gameState.currentTurn !== myOnlineIndex) return;
      onlineClientRef.current?.sendMove(onlineRoom.code, row, col, loopDir);
      return;
    }

    const actor = gameState.currentTurn;
    const { nextState, steps } = executeMove(
      gameState,
      actor,
      row,
      col,
      loopDir,
      true,
      true
    );
    recordExecutedMove(gameState, nextState, actor, row, col, loopDir, steps);
    playAnimatedSteps(steps, nextState);
  };

  const handleResolveNyumba = (choice: 'stop' | 'continue') => {
    if (isAnimating || !gameState.pendingNyumbaChoice) return;
    soundEngine.unlock();

    if (mode === 'duo-online') {
      if (!onlineRoom || gameState.pendingNyumbaChoice.player !== myOnlineIndex) return;
      onlineClientRef.current?.sendNyumbaChoice(onlineRoom.code, choice);
      return;
    }

    const pending = gameState.pendingNyumbaChoice;
    const { nextState, steps } = resolveNyumbaChoice(gameState, choice, true, true);
    recordExecutedMove(
      gameState,
      nextState,
      pending.player,
      pending.startRow,
      pending.startCol,
      pending.startLoopDir,
      steps,
      choice
    );
    playAnimatedSteps(steps, nextState);
  };

  const handleUseErrorRight = () => {
    if (isAnimating || !gameState.pendingErrorUndo) return;
    soundEngine.unlock();

    if (mode === 'duo-online') {
      if (!onlineRoom || gameState.pendingErrorUndo.player !== myOnlineIndex) return;
      onlineClientRef.current?.sendErrorUndo(onlineRoom.code);
      return;
    }

    const restored = applyErrorRightUndo(gameState);
    soundEngine.playPickup();
    setGameState(restored);
    setDisplayBoard(restored.board);
    setDisplayReserves(restored.reserves);
  };

  const handleConfirmTurn = () => {
    if (isAnimating || !gameState.pendingErrorUndo) return;

    if (mode === 'duo-online') {
      if (!onlineRoom || gameState.pendingErrorUndo.player !== myOnlineIndex) return;
      onlineClientRef.current?.sendConfirmTurn(onlineRoom.code);
      return;
    }

    const next = confirmTurnAfterTrakatra(gameState);
    setGameState(next);
    if (next.winner !== null) {
      soundEngine.playVictory();
    }
  };

  const handleReturnToMenu = () => {
    clearTimers();
    if (mode === 'duo-online') {
      onlineClientRef.current?.leaveRoom();
      setOnlineRoom(null);
    }
    setIsAnimating(false);
    setIsBoardPaused(false);
    setShowLiveChat(false);
    setChatPreviewBanner(null);
    setUnreadChatCount(0);
    setActiveStep(null);
    setScreen('TITLE');
  };

  const handlePlayAgain = () => {
    if (mode === 'duo-online' && onlineRoom) {
      onlineClientRef.current?.sendRematch(onlineRoom.code);
      return;
    }
    if (mode === 'solo') {
      startSoloGame();
    } else {
      startDuoLocalGame();
    }
  };

  const p0Name =
    mode === 'duo-online' && onlineRoom?.players[0]
      ? `${onlineRoom.players[0].name} (${onlineRoom.players[0].rating})`
      : myChatPseudo;

  const p0Avatar =
    mode === 'duo-online' && onlineRoom?.players[0]
      ? onlineRoom.players[0].avatarId
      : myAvatarId;

  const p1Name =
    mode === 'duo-online' && onlineRoom?.players[1]
      ? `${onlineRoom.players[1].name} (${onlineRoom.players[1].rating})`
      : mode === 'solo'
      ? `${activeBot.name} (${activeBot.elo})`
      : player2Name.trim() || 'Joueur 2';

  const p1Avatar =
    mode === 'duo-online' && onlineRoom?.players[1]
      ? onlineRoom.players[1].avatarId
      : undefined;

  let victoryPayload: ShareCardPayload | null = null;
  if (screen === 'PLAYING' && gameState.winner !== null && !isAnimating) {
    const localIdx: PlayerId = mode === 'duo-online' ? myOnlineIndex : 0;
    const oppIdx: PlayerId = localIdx === 0 ? 1 : 0;
    const isLocalWinner = mode === 'duo-local' ? true : gameState.winner === localIdx;

    const winnerName = gameState.winner === 0 ? p0Name : p1Name;
    const loserName = gameState.winner === 0 ? p1Name : p0Name;

    victoryPayload = {
      playerName: mode === 'duo-local' ? winnerName : localIdx === 0 ? p0Name : p1Name,
      island: '',
      opponentName: mode === 'duo-local' ? loserName : oppIdx === 0 ? p0Name : p1Name,
      modeLabel:
        mode === 'solo'
          ? `Solo vs ${activeBot.name} (${activeBot.elo} ELO)`
          : mode === 'duo-local'
          ? 'Duo Hors Ligne'
          : '1v1 En Ligne (ELO)',
      isWinner: isLocalWinner,
      playerSeeds:
        mode === 'duo-local'
          ? getPlayerTotalSeeds(gameState.board, gameState.winner, gameState.reserves)
          : getPlayerTotalSeeds(gameState.board, localIdx, gameState.reserves),
      opponentSeeds:
        mode === 'duo-local'
          ? getPlayerTotalSeeds(
              gameState.board,
              gameState.winner === 0 ? 1 : 0,
              gameState.reserves
            )
          : getPlayerTotalSeeds(gameState.board, oppIdx, gameState.reserves),
      captures:
        mode === 'duo-local'
          ? gameState.captures[gameState.winner]
          : gameState.captures[localIdx],
      longestRelay:
        mode === 'duo-local'
          ? gameState.longestRelay[gameState.winner]
          : gameState.longestRelay[localIdx],
      turnCount: gameState.turnCount,
      durationSeconds: matchDurationSeconds ?? undefined,
      eloRating: eloFeedback?.rating,
      eloDelta: eloFeedback?.delta,
      winReason: gameState.winReason,
    };
  }

  const localOnlinePlayer = onlineRoom?.players[myOnlineIndex];
  const oppOnlinePlayer = onlineRoom?.players[myOnlineIndex === 0 ? 1 : 0];
  const effectiveHiddenNyumba: [boolean, boolean] =
    mode === 'duo-online' && onlineRoom
      ? [Boolean(onlineRoom.players[0]?.nyumbaHidden), Boolean(onlineRoom.players[1]?.nyumbaHidden)]
      : localHiddenNyumba;

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[#120C08]">

      {screen === 'TITLE' ? (
        <TitleScreen
          selectedBotId={activeBot.id}
          progression={progression}
          autosavedMatch={autosavedMatch}
          currentAccount={authAccount}
          playerPseudo={profile.name}
          playerAvatarId={myAvatarId}
          playerElo={playerElo}
          onOpenAccount={() => setShowAccountModal(true)}
          onOpenPhotoModal={handleOpenPhotoModal}
          onOpenBotSelector={() => setShowBotSelector(true)}
          onStartOnlineMatchmaking={handleStartOnlineMatchmaking}
          onResumeAutosave={handleResumeAutosave}
          onDiscardAutosave={handleDiscardAutosave}
          onStartSolo={() => startSoloGame()}
          onStartDuoLocal={startDuoLocalGame}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenRules={() => setShowRules(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenSettings={(tab = 'params') => {
            setSettingsTab(tab);
            setShowSettings(true);
          }}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      ) : (
        <BoardView
          mode={mode}
          language={language}
          selectedBotLabel={`${activeBot.name} (${activeBot.elo} ELO)`}
          onOpenBotSelector={() => setShowBotSelector(true)}
          hiddenNyumbaByPlayer={effectiveHiddenNyumba}
          onToggleHideNyumba={handleToggleHideNyumba}
          themeId={themeId}
          accessibility={accessibility}
          gameState={gameState}
          displayBoard={displayBoard}
          displayReserves={displayReserves}
          activeStep={activeStep}
          telegraphPit={telegraphPit}
          lastOpponentMove={lastOpponentMove}
          isAnimating={isAnimating}
          isVerifying64={false}
          player0Name={p0Name}
          player1Name={p1Name}
          player0AvatarId={p0Avatar}
          player1AvatarId={p1Avatar}
          localPlayerIndex={mode === 'duo-online' ? myOnlineIndex : 0}
          onlineRoomCode={mode === 'duo-online' ? onlineRoom?.code : undefined}
          connectionStatus={connectionStatus}
          incomingEmote={incomingEmote}
          muted={muted}
          onToggleMute={handleToggleMute}
          onOpenRules={() => setShowRules(true)}
          onOpenSettings={(tab = 'params') => {
            setSettingsTab(tab);
            setShowSettings(true);
          }}
          onOpenChallenges={() => {
            setTutorialInitialTab('puzzles');
            setShowTutorial(true);
          }}
          onOpenCulture={() => setShowCulture(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenHistoryReplay={() => setShowReplay(true)}
          onRestartGame={handlePlayAgain}
          onReturnToMenu={handleReturnToMenu}
          onMakeMove={handleMakeMove}
          onResolveNyumba={handleResolveNyumba}
          onUseErrorRight={handleUseErrorRight}
          onConfirmTurn={handleConfirmTurn}
          onSendEmote={
            mode === 'duo-online' && onlineRoom
              ? (emote) => onlineClientRef.current?.sendEmote(onlineRoom.code, emote)
              : undefined
          }
          onPausedChange={setIsBoardPaused}
          onOpenChat={handleOpenLiveChat}
          unreadChatCount={unreadChatCount}
          chatPreviewBanner={chatPreviewBanner}
          onReportOpponent={
            mode === 'duo-online'
              ? () =>
                  setReportTarget({
                    targetPseudo: oppOnlinePlayer?.name || p1Name,
                    context: 'match',
                    roomCode: onlineRoom?.code,
                  })
              : undefined
          }
        />
      )}

      {(victoryPayload || simulatedVictoryPayload) && (
        <VictoryModal
          language={language}
          payload={(simulatedVictoryPayload || victoryPayload)!}
          showElo={Boolean(simulatedVictoryPayload) || progression.completedGames >= 1 || mode === 'duo-online'}
          unlockedNextBot={simulatedVictoryPayload ? null : unlockedNextBot}
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleReturnToMenu}
          isOnline={!simulatedVictoryPayload && mode === 'duo-online'}
          rematchPending={Boolean(localOnlinePlayer?.rematchReady)}
          opponentRematchReady={Boolean(oppOnlinePlayer?.rematchReady)}
          isSimulation={Boolean(simulatedVictoryPayload)}
          onCloseSimulation={() => setSimulatedVictoryPayload(null)}
        />
      )}

      {showMatchmaking && (
        <MatchmakingModal
          playerPseudo={myChatPseudo}
          playerAvatarId={myAvatarId}
          queueStatus={queueStatus}
          connectionStatus={connectionStatus}
          error={matchmakingError}
          onCancel={handleCancelMatchmaking}
        />
      )}

      {showBotSelector && (
        <BotSelectorModal
          selectedBotId={activeBot.id}
          defeatedBotIds={progression.defeatedBotIds}
          onSelectBot={handleSelectBot}
          onStartWithBot={(botId) => {
            setShowBotSelector(false);
            startSoloGame(botId);
          }}
          onClose={() => setShowBotSelector(false)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          playerName={myChatPseudo}
          onChallengePlayer={(entry: LeaderboardEntry) => {
            setShowLeaderboard(false);
            ensureOnlineClient().sendChallenge(entry.clientId, entry.name);
          }}
          onReportPlayer={(target) => {
            setShowLeaderboard(false);
            setReportTarget(target);
          }}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {showCulture && <CultureModal onClose={() => setShowCulture(false)} />}

      {showStats && (
        <StatsAchievementsModal
          playerName={myChatPseudo}
          playerAvatarId={myAvatarId}
          progression={progression}
          savedMatchesCount={savedMatchHistory.length}
          onOpenHistoryReplay={() => {
            setShowStats(false);
            setShowReplay(true);
          }}
          onClose={() => setShowStats(false)}
        />
      )}

      {showReplay && (
        <MatchReplayModal
          matches={savedMatchHistory}
          themeId={themeId}
          onClose={() => setShowReplay(false)}
        />
      )}

      {showTutorial && (
        <TutorialModal
          initialMode={tutorialInitialTab}
          language={language}
          solvedChallengeIds={progression.solvedChallengeIds}
          onSolveChallenge={handleSolveChallenge}
          onCompleteTutorial={handleCompleteInteractiveTutorial}
          onClose={() => setShowTutorial(false)}
          onStartGuidedPractice={() => {
            setShowTutorial(false);
            startSoloGame(DEFAULT_BOT_ID);
          }}
          themeId={themeId}
        />
      )}

      {showSettings && (
        <SettingsModal
          initialTab={settingsTab}
          speed={speed}
          onChangeSpeed={handleChangeSpeed}
          muted={muted}
          onToggleMute={handleToggleMute}
          hideNyumba={effectiveHiddenNyumba[mode === 'duo-online' ? myOnlineIndex : 0]}
          onToggleHideNyumba={() =>
            handleToggleHideNyumba(mode === 'duo-online' ? myOnlineIndex : 0)
          }
          hideNyumbaP2={mode === 'duo-local' ? effectiveHiddenNyumba[1] : undefined}
          onToggleHideNyumbaP2={
            mode === 'duo-local' ? () => handleToggleHideNyumba(1) : undefined
          }
          startingPlayer={startingPlayerPref}
          onChangeStartingPlayer={setStartingPlayerPref}
          ruleConfig={ruleConfig}
          onChangeRuleConfig={handleChangeRuleConfig}
          accessibility={accessibility}
          onChangeAccessibility={handleChangeAccessibility}
          themeId={themeId}
          onChangeThemeId={handleChangeThemeId}
          progression={progression}
          onOpenChallenges={() => {
            setShowSettings(false);
            setTutorialInitialTab('puzzles');
            setShowTutorial(true);
          }}
          onOpenRulesModal={() => {
            setShowSettings(false);
            setShowRules(true);
          }}
          onSimulateVictory={() =>
            setSimulatedVictoryPayload({
              playerName: myChatPseudo,
              island: '',
              opponentName: 'Mfundi',
              modeLabel: '1v1 En Ligne (Simulation)',
              isWinner: true,
              playerSeeds: 38,
              opponentSeeds: 26,
              captures: 14,
              longestRelay: 4,
              turnCount: 28,
              durationSeconds: 192,
              eloRating: playerElo + 18,
              eloDelta: 18,
              winReason: 'Kamuv !',
            })
          }
          onSimulateDefeat={() =>
            setSimulatedVictoryPayload({
              playerName: myChatPseudo,
              island: '',
              opponentName: 'Mfundi',
              modeLabel: '1v1 En Ligne (Simulation)',
              isWinner: false,
              playerSeeds: 22,
              opponentSeeds: 42,
              captures: 8,
              longestRelay: 2,
              turnCount: 31,
              durationSeconds: 215,
              eloRating: Math.max(400, playerElo - 14),
              eloDelta: -14,
              winReason: 'Kamuv !',
            })
          }
          onClose={() => setShowSettings(false)}
        />
      )}

      {showAccountModal && (
        <AccountModal
          currentAccount={authAccount}
          currentPseudo={profile.name}
          currentAvatarId={myAvatarId}
          onOpenPhotoModal={handleOpenPhotoModal}
          onAuthSuccess={handleAuthSuccess}
          onLogout={handleLogout}
          onClose={() => setShowAccountModal(false)}
        />
      )}

      {showPhotoModal && (
        <ProfilePhotoModal
          currentAvatarId={myAvatarId}
          playerPseudo={myChatPseudo}
          saving={photoSaving}
          error={photoError}
          onSavePhoto={handleSavePhoto}
          onClose={() => setShowPhotoModal(false)}
        />
      )}

      {screen === 'PLAYING' && showLiveChat && (
        <LiveChatDrawer
          messages={chatMessages}
          onlineCount={chatOnlineCount}
          connected={chatConnected}
          myPseudo={myChatPseudo}
          myAvatarId={myAvatarId}
          hasAccount={Boolean(authAccount)}
          onSendMessage={(text) => chatClientRef.current?.sendMessage(text)}
          onToggleReaction={(messageId, emoji) =>
            chatClientRef.current?.toggleReaction(messageId, emoji)
          }
          onReportMessage={(target) => {
            setShowLiveChat(false);
            setReportTarget(target);
          }}
          onOpenAccount={() => {
            setShowLiveChat(false);
            setShowAccountModal(true);
          }}
          onClose={() => setShowLiveChat(false)}
        />
      )}

      {incomingChallenge && (
        <div
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="animate-sheet-up w-full max-w-sm rounded-t-3xl border border-[#2DD4BF]/45 bg-[#121A1D] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2DD4BF]/15 text-[#2DD4BF] ring-1 ring-[#2DD4BF]/40">
              <Swords className="h-6 w-6" />
            </div>
            <h3 className="font-display mt-3 text-lg font-bold">Défi 1v1 · Règles de base</h3>
            <div className="mt-3 flex items-center justify-center gap-2.5 rounded-2xl border border-[#FFF7E8]/10 bg-[#0D1316] px-4 py-2.5">
              <ProfileAvatar
                avatarId={incomingChallenge.fromAvatarId}
                pseudo={incomingChallenge.fromName}
                size="sm"
                highlight
              />
              <div className="text-left">
                <div className="text-sm font-bold text-[#FFF7E8]">{incomingChallenge.fromName}</div>
                <div className="font-mono-nums text-xs font-bold text-[#F2B441]">
                  {incomingChallenge.fromRating} ELO
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onlineClientRef.current?.respondChallenge(incomingChallenge.challengeId, false);
                  setIncomingChallenge(null);
                }}
                className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border border-[#FFF7E8]/15 bg-[#1B2327] text-sm font-bold text-[#D8C7AE]"
              >
                <X className="h-4 w-4" />
                <span>Refuser</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onlineClientRef.current?.respondChallenge(incomingChallenge.challengeId, true);
                  setIncomingChallenge(null);
                }}
                className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-[#2DD4BF] text-sm font-extrabold text-[#0A2623]"
              >
                <Check className="h-4 w-4" />
                <span>Accepter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          target={reportTarget}
          reporterPseudo={myChatPseudo}
          onClose={() => setReportTarget(null)}
        />
      )}

      {challengeNotice && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-[65] -translate-x-1/2 rounded-full border border-[#F2B441]/45 bg-[#1B120C]/95 px-4 py-2 text-xs font-bold text-[#FFF7E8] shadow-xl">
          {challengeNotice}
        </div>
      )}
    </div>
  );
}
