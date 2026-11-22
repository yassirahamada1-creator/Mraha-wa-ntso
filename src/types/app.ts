import type { GameStateSnapshot, LoopDir, PlayerId } from '../game/mrahaEngine';
import type { AiDifficulty } from '../game/mrahaAi';

export type ScreenMode = 'TITLE' | 'PLAYING';
export type PlayMode = 'solo' | 'duo-local' | 'duo-online';
export type GameSpeed = 'slow' | 'x1' | 'x2' | 'instant';
export type StartingPlayerPref = 'p1' | 'p2' | 'random';
export type BoardThemeId = 'mahogany' | 'stone' | 'chiromani' | 'lightwood' | 'ebony' | 'sand';
export type UiLanguage = 'fr';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface PlayerProfile {
  clientId: string;
  name: string;
  island: string;
  avatarId?: string;
  accountId?: string;
}

export interface AuthAccount {
  id: string;
  pseudo: string;
  island: string;
  avatarId?: string;
  rating: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  createdAt: string;
}

export interface ChatMessageItem {
  id: string;
  channel: string;
  pseudo: string;
  island: string;
  avatarId?: string;
  text: string;
  reactions: Record<string, string[]>;
  createdAt: string;
}

export interface OnlinePlayerInfo {
  name: string;
  island?: string;
  avatarId?: string;
  rating: number;
  connected: boolean;
  rematchReady: boolean;
  nyumbaHidden?: boolean;
  disconnectedAt?: number | null;
}

export interface OnlineRoomSnapshot {
  code: string;
  isPublic: boolean;
  players: [OnlinePlayerInfo | null, OnlinePlayerInfo | null];
  state: GameStateSnapshot;
}

export interface MatchmakingQueueStatus {
  elapsedSec: number;
  tolerance: number;
  myRating: number;
  queueSize: number;
}

export interface AccessibilityPrefs {
  largeTextAndSeeds: boolean;
  colorblindMode: boolean;
  vibrationEnabled: boolean;
  showDangerAlerts: boolean;
  guidedRules: boolean;
  ambientSoundEnabled?: boolean;
}

export interface DailyChallengeInfo {
  id: string;
  dateKey: string;
  title: string;
  description: string;
  targetType: 'win_any' | 'captures_6' | 'challenge_star';
  completed: boolean;
}

export interface ProgressionState {
  completedGames: number;
  wins: number;
  streakDays: number;
  lastPlayDate: string | null;
  solvedChallengeIds: number[];
  dailyCompletedDate: string | null;
  unlockedAchievements: string[];
  currentWinStreak: number;
  bestWinStreak: number;
  totalCaptures: number;
  bestRelay: number;
  winsVsHard: number;
  defeatedBotIds: string[];
  keptNyumbaWins: number;
  completedInteractiveTutorial: boolean;
}

export interface LastMoveHighlight {
  player: PlayerId;
  fromRow: number;
  fromCol: number;
  landingRow: number | null;
  landingCol: number | null;
  capturedCols: number[];
}

export interface SavedMatchMove {
  turnNumber: number;
  player: PlayerId;
  row: number;
  col: number;
  loopDir: LoopDir;
  nyumbaChoice?: 'stop' | 'continue';
  usedErrorRight?: boolean;
  stateBefore: GameStateSnapshot;
  stateAfter: GameStateSnapshot;
  capturedInTurn: number;
  relaysInTurn: number;
  kind: string;
}

export interface SavedMatchRecord {
  id: string;
  mode: PlayMode;
  difficulty?: AiDifficulty;
  botId?: string;
  player0Name: string;
  player1Name: string;
  winner: PlayerId;
  winReason: string;
  durationSeconds: number;
  turnCount: number;
  player0Seeds: number;
  player1Seeds: number;
  captures: [number, number];
  longestRelay: [number, number];
  createdAt: string;
  moves: SavedMatchMove[];
}

export interface AutosavedMatch {
  mode: 'solo' | 'duo-local';
  difficulty: AiDifficulty;
  botId?: string;
  player2Name: string;
  gameState: GameStateSnapshot;
  elapsedSeconds: number;
  lastOpponentMove: LastMoveHighlight | null;
  moves: SavedMatchMove[];
  savedAt: string;
}

export type PresenceStatus = 'online' | 'in-game' | 'offline';

export interface IncomingChallenge {
  challengeId: string;
  fromClientId: string;
  fromName: string;
  fromAvatarId?: string;
  fromRating: number;
  expiresAt: number;
}

export type ReportReason = 'insultes' | 'triche' | 'spam' | 'anti-jeu' | 'pseudo';
export type ReportContext = 'chat' | 'match' | 'leaderboard';

export interface ReportTarget {
  targetPseudo: string;
  context: ReportContext;
  roomCode?: string;
  messageExcerpt?: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  island: string;
  avatarId?: string;
  rating: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  totalCaptures: number;
  bestRelay: number;
  currentStreak: number;
  bestStreak: number;
  updatedAt: string;
  presenceStatus?: PresenceStatus;
  clientId?: string;
}

export interface RecentMatchEntry {
  id: string;
  mode: PlayMode;
  difficulty?: string;
  botId?: string;
  player0Name: string;
  player0Island: string;
  player1Name: string;
  player1Island: string;
  winnerIndex: PlayerId;
  player0Seeds: number;
  player1Seeds: number;
  player0Captures: number;
  player1Captures: number;
  turnCount: number;
  winReason: string;
  createdAt: string;
}

export interface MatchConfig {
  mode: PlayMode;
  difficulty: AiDifficulty;
  player1Name: string;
}
