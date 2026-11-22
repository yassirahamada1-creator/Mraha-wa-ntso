import express, { type Request, type Response } from 'express';
import { createServer as createHttpServer } from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
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
  type PlayerId,
} from './src/game/mrahaEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, '.data');
const DB_PATH = path.join(DATA_DIR, 'mraha-db.json');

interface LeaderboardPlayer {
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
}

interface AccountRecord {
  id: string;
  pseudo: string;
  pseudoLower: string;
  island: string;
  avatarId?: string;
  passwordHash: string;
  createdAt: string;
}

interface ChatMessageRecord {
  id: string;
  channel: string;
  pseudo: string;
  island: string;
  avatarId?: string;
  text: string;
  reactions: Record<string, string[]>;
  createdAt: string;
}

interface MatchRecord {
  id: string;
  mode: 'solo' | 'duo-local' | 'duo-online';
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

interface ReportRecord {
  id: string;
  reporterPseudo: string;
  targetPseudo: string;
  reason: 'insultes' | 'triche' | 'spam' | 'anti-jeu' | 'pseudo';
  context: 'chat' | 'match' | 'leaderboard';
  roomCode: string;
  messageExcerpt: string;
  details: string;
  createdAt: string;
}

interface DatabaseSchema {
  players: Record<string, LeaderboardPlayer>;
  accounts: Record<string, AccountRecord>;
  matches: MatchRecord[];
  chatMessages: Record<string, ChatMessageRecord[]>;
  reports: ReportRecord[];
}

interface ActiveSession {
  accountId: string;
  pseudo: string;
  island: string;
  avatarId: string;
  createdAt: number;
}

const activeSessions = new Map<string, ActiveSession>();

const BOT_ELO_MAP: Record<string, number> = {
  nour: 400,
  yasmine: 520,
  salim: 650,
  farida: 800,
  kenza: 950,
  tariq: 1100,
  karim: 1250,
  nadia: 1400,
  idriss: 1550,
  aicha: 1700,
  zaki: 1850,
  mfundi: 2050,
  easy: 400,
  medium: 950,
  hard: 1700,
};

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const emptyDb: DatabaseSchema = {
        players: {},
        accounts: {},
        matches: [],
        chatMessages: {},
        reports: [],
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb, null, 2), 'utf-8');
      return emptyDb;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      players: parsed.players || {},
      accounts: parsed.accounts || {},
      matches: parsed.matches || [],
      chatMessages: parsed.chatMessages || {},
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
  } catch {
    return { players: {}, accounts: {}, matches: [], chatMessages: {}, reports: [] };
  }
}

function saveDatabase(db: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

function normalizePlayerKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 40) || 'joueur';
}

function sanitizePseudo(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ').slice(0, 20);
}

function isValidPseudo(pseudo: string): boolean {
  return /^[a-zA-Z0-9À-ÿ _-]{3,20}$/.test(pseudo);
}

function sanitizeIsland(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, 24);
}

const CUSTOM_PHOTO_DATA_URL_REGEX =
  /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]{16,250000}$/i;

function isValidAvatarInput(raw: unknown): raw is string {
  if (raw === undefined || raw === null) return true;
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (trimmed === '') return true;
  return CUSTOM_PHOTO_DATA_URL_REGEX.test(trimmed);
}

function sanitizeAvatarId(raw: unknown): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (CUSTOM_PHOTO_DATA_URL_REGEX.test(trimmed)) {
      return trimmed;
    }
  }
  return '';
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(keyHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function issueSession(account: AccountRecord): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    accountId: account.id,
    pseudo: account.pseudo,
    island: account.island,
    avatarId: sanitizeAvatarId(account.avatarId),
    createdAt: Date.now(),
  });
  return token;
}

function extractBearerSession(req: Request): { token: string; session: ActiveSession } | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  return { token, session };
}

function computeEloDelta(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  kFactor: number = 32
): number {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(kFactor * (scoreA - expectedA));
}

function getOrCreatePlayer(
  db: DatabaseSchema,
  name: string,
  island: string,
  avatarId?: string
): LeaderboardPlayer {
  const cleanName = name.trim().slice(0, 28) || 'Joueur';
  const key = normalizePlayerKey(cleanName);
  const sanitizedAvatar = typeof avatarId === 'string' ? sanitizeAvatarId(avatarId) : undefined;
  if (!db.players[key]) {
    db.players[key] = {
      id: key,
      name: cleanName,
      island: island.trim().slice(0, 28),
      avatarId: sanitizedAvatar || '',
      rating: 1200,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      totalCaptures: 0,
      bestRelay: 0,
      currentStreak: 0,
      bestStreak: 0,
      updatedAt: new Date().toISOString(),
    };
  } else {
    if (typeof avatarId === 'string' && isValidAvatarInput(avatarId)) {
      db.players[key].avatarId = sanitizeAvatarId(avatarId);
    }
  }
  return db.players[key];
}

function buildPublicAccount(db: DatabaseSchema, account: AccountRecord) {
  const stats = db.players[normalizePlayerKey(account.pseudo)];
  return {
    id: account.id,
    pseudo: account.pseudo,
    island: account.island,
    avatarId: sanitizeAvatarId(account.avatarId),
    rating: stats?.rating ?? 1200,
    wins: stats?.wins ?? 0,
    losses: stats?.losses ?? 0,
    gamesPlayed: stats?.gamesPlayed ?? 0,
    createdAt: account.createdAt,
  };
}

function applyPlayerMatchOutcome(
  player: LeaderboardPlayer,
  didWin: boolean,
  delta: number,
  captures: number,
  bestRelay: number
): void {
  player.rating = Math.max(400, player.rating + delta);
  player.gamesPlayed += 1;
  player.totalCaptures += Math.max(0, captures);
  if (bestRelay > player.bestRelay) player.bestRelay = bestRelay;
  if (didWin) {
    player.wins += 1;
    player.currentStreak += 1;
    if (player.currentStreak > player.bestStreak) {
      player.bestStreak = player.currentStreak;
    }
  } else {
    player.losses += 1;
    player.currentStreak = 0;
  }
  player.updatedAt = new Date().toISOString();
}

function recordRankedMatch(params: {
  mode: 'solo' | 'duo-local' | 'duo-online';
  difficulty?: string;
  botId?: string;
  botElo?: number;
  player0Name: string;
  player0Island: string;
  player0AvatarId?: string;
  player1Name: string;
  player1Island: string;
  player1AvatarId?: string;
  winnerIndex: PlayerId;
  player0Seeds: number;
  player1Seeds: number;
  player0Captures: number;
  player1Captures: number;
  player0BestRelay: number;
  player1BestRelay: number;
  turnCount: number;
  winReason: string;
}): { p0Delta: number; p1Delta: number; p0Rating: number; p1Rating: number } {
  const db = loadDatabase();

  const p0 = getOrCreatePlayer(
    db,
    params.player0Name,
    params.player0Island,
    params.player0AvatarId
  );

  let p0Delta = 0;
  let p1Delta = 0;
  let p1Rating = 1200;

  if (params.mode === 'solo') {
    const key = (params.botId || params.difficulty || 'nour').toLowerCase();
    const numericBotElo = Number(params.botElo);
    const aiRating =
      Number.isFinite(numericBotElo) && numericBotElo >= 300 && numericBotElo <= 2500
        ? Math.round(numericBotElo)
        : BOT_ELO_MAP[key] ?? 400;

    const score0 = params.winnerIndex === 0 ? 1 : 0;
    p0Delta = computeEloDelta(p0.rating, aiRating, score0, 24);
    applyPlayerMatchOutcome(
      p0,
      params.winnerIndex === 0,
      p0Delta,
      params.player0Captures,
      params.player0BestRelay
    );
    p1Rating = aiRating;
  } else if (params.mode === 'duo-online') {
    const p1 = getOrCreatePlayer(
      db,
      params.player1Name,
      params.player1Island,
      params.player1AvatarId
    );
    const score0 = params.winnerIndex === 0 ? 1 : 0;
    p0Delta = computeEloDelta(p0.rating, p1.rating, score0, 32);
    p1Delta = -p0Delta;

    applyPlayerMatchOutcome(
      p0,
      params.winnerIndex === 0,
      p0Delta,
      params.player0Captures,
      params.player0BestRelay
    );
    applyPlayerMatchOutcome(
      p1,
      params.winnerIndex === 1,
      p1Delta,
      params.player1Captures,
      params.player1BestRelay
    );
    p1Rating = p1.rating;
  }

  db.matches.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mode: params.mode,
    difficulty: params.difficulty,
    botId: params.botId,
    player0Name: params.player0Name,
    player0Island: params.player0Island,
    player1Name: params.player1Name,
    player1Island: params.player1Island,
    winnerIndex: params.winnerIndex,
    player0Seeds: params.player0Seeds,
    player1Seeds: params.player1Seeds,
    player0Captures: params.player0Captures,
    player1Captures: params.player1Captures,
    turnCount: params.turnCount,
    winReason: params.winReason,
    createdAt: new Date().toISOString(),
  });

  if (db.matches.length > 100) {
    db.matches = db.matches.slice(0, 100);
  }

  saveDatabase(db);
  return { p0Delta, p1Delta, p0Rating: p0.rating, p1Rating };
}

function sanitizeChannel(raw: unknown): string {
  if (typeof raw !== 'string') return 'global';
  const clean = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  return clean || 'global';
}

function sanitizeChatText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, 280);
}

function sanitizeEmoji(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, 12);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '450kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const body = req.body as {
        pseudo?: unknown;
        password?: unknown;
        island?: unknown;
        avatarId?: unknown;
      };
      const pseudo = sanitizePseudo(body.pseudo);
      const password = typeof body.password === 'string' ? body.password : '';
      const island = sanitizeIsland(body.island);
      if (!isValidAvatarInput(body.avatarId)) {
        res.status(400).json({ error: 'Photo de profil invalide.' });
        return;
      }
      const avatarId = sanitizeAvatarId(body.avatarId);

      if (!isValidPseudo(pseudo)) {
        res.status(400).json({
          error: 'Le pseudo doit contenir entre 3 et 20 caractères (lettres, chiffres, - ou _).',
        });
        return;
      }
      if (password.length < 4 || password.length > 64) {
        res.status(400).json({
          error: 'Le mot de passe doit contenir au moins 4 caractères.',
        });
        return;
      }

      const db = loadDatabase();
      const pseudoLower = pseudo.toLowerCase();
      const existing = Object.values(db.accounts).find((a) => a.pseudoLower === pseudoLower);
      if (existing) {
        res.status(409).json({
          error: 'Ce pseudo est déjà utilisé. Choisissez-en un autre ou connectez-vous.',
        });
        return;
      }

      const id = `acc-${crypto.randomUUID()}`;
      const account: AccountRecord = {
        id,
        pseudo,
        pseudoLower,
        island,
        avatarId,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      db.accounts[id] = account;
      getOrCreatePlayer(db, pseudo, island, avatarId);
      saveDatabase(db);

      const token = issueSession(account);
      res.status(201).json({
        token,
        account: buildPublicAccount(db, account),
      });
    } catch {
      res.status(500).json({ error: 'Impossible de créer le compte.' });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const body = req.body as {
        pseudo?: unknown;
        password?: unknown;
      };
      const pseudo = sanitizePseudo(body.pseudo);
      const password = typeof body.password === 'string' ? body.password : '';

      if (!pseudo || !password) {
        res.status(400).json({ error: 'Veuillez saisir votre pseudo et votre mot de passe.' });
        return;
      }

      const db = loadDatabase();
      const pseudoLower = pseudo.toLowerCase();
      const account = Object.values(db.accounts).find((a) => a.pseudoLower === pseudoLower);
      if (!account || !verifyPassword(password, account.passwordHash)) {
        res.status(401).json({ error: 'Pseudo ou mot de passe incorrect.' });
        return;
      }

      const token = issueSession(account);
      res.json({
        token,
        account: buildPublicAccount(db, account),
      });
    } catch {
      res.status(500).json({ error: 'Connexion impossible pour le moment.' });
    }
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const resolved = extractBearerSession(req);
    if (!resolved) {
      res.status(401).json({ error: 'Non connecté.' });
      return;
    }
    const db = loadDatabase();
    const account = db.accounts[resolved.session.accountId];
    if (!account) {
      activeSessions.delete(resolved.token);
      res.status(401).json({ error: 'Session expirée.' });
      return;
    }
    res.json({ account: buildPublicAccount(db, account) });
  });

  app.patch('/api/auth/avatar', (req: Request, res: Response) => {
    const resolved = extractBearerSession(req);
    if (!resolved) {
      res.status(401).json({ error: 'Veuillez vous connecter pour modifier votre photo.' });
      return;
    }

    const body = req.body as { avatarId?: unknown };
    if (!isValidAvatarInput(body.avatarId)) {
      res.status(400).json({ error: 'Photo sélectionnée invalide.' });
      return;
    }
    const requested = sanitizeAvatarId(body.avatarId);

    const db = loadDatabase();
    const account = db.accounts[resolved.session.accountId];
    if (!account) {
      activeSessions.delete(resolved.token);
      res.status(401).json({ error: 'Session expirée.' });
      return;
    }

    account.avatarId = requested;
    resolved.session.avatarId = requested;
    const playerKey = normalizePlayerKey(account.pseudo);
    if (db.players[playerKey]) {
      db.players[playerKey].avatarId = requested;
    }
    saveDatabase(db);

    res.json({ account: buildPublicAccount(db, account) });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const resolved = extractBearerSession(req);
    if (resolved) {
      activeSessions.delete(resolved.token);
    }
    res.json({ ok: true });
  });

  app.get('/api/chat/messages', (req: Request, res: Response) => {
    const channel = sanitizeChannel(req.query.channel);
    const db = loadDatabase();
    const messages = db.chatMessages[channel] || [];
    res.json({ channel, messages: messages.slice(-80) });
  });

  const VALID_REPORT_REASONS = new Set(['insultes', 'triche', 'spam', 'anti-jeu', 'pseudo']);
  const VALID_REPORT_CONTEXTS = new Set(['chat', 'match', 'leaderboard']);
  const reportRateLimit = new Map<string, number[]>();

  app.post('/api/reports', (req: Request, res: Response) => {
    try {
      const body = req.body as {
        reporterPseudo?: unknown;
        targetPseudo?: unknown;
        reason?: unknown;
        context?: unknown;
        roomCode?: unknown;
        messageExcerpt?: unknown;
        details?: unknown;
      };

      const reporterPseudo = sanitizePseudo(body.reporterPseudo) || 'Joueur';
      const targetPseudo = sanitizePseudo(body.targetPseudo);
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      const context = typeof body.context === 'string' ? body.context.trim() : '';
      const roomCode =
        typeof body.roomCode === 'string'
          ? body.roomCode.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)
          : '';
      const messageExcerpt =
        typeof body.messageExcerpt === 'string' ? body.messageExcerpt.trim().slice(0, 240) : '';
      const details = typeof body.details === 'string' ? body.details.trim().slice(0, 240) : '';

      if (targetPseudo.length < 2) {
        res.status(400).json({ error: 'Joueur signalé invalide.' });
        return;
      }
      if (targetPseudo.toLowerCase() === reporterPseudo.toLowerCase()) {
        res.status(400).json({ error: 'Impossible de vous signaler vous-même.' });
        return;
      }
      if (!VALID_REPORT_REASONS.has(reason) || !VALID_REPORT_CONTEXTS.has(context)) {
        res.status(400).json({ error: 'Motif de signalement invalide.' });
        return;
      }

      const rateKey = `${req.ip || 'local'}:${reporterPseudo.toLowerCase()}`;
      const now = Date.now();
      const recent = (reportRateLimit.get(rateKey) || []).filter((ts) => now - ts < 5 * 60_000);
      if (recent.length >= 5) {
        res.status(429).json({ error: 'Trop de signalements envoyés. Réessayez plus tard.' });
        return;
      }
      recent.push(now);
      reportRateLimit.set(rateKey, recent);

      const db = loadDatabase();
      const record: ReportRecord = {
        id: `rep-${crypto.randomUUID()}`,
        reporterPseudo,
        targetPseudo,
        reason: reason as ReportRecord['reason'],
        context: context as ReportRecord['context'],
        roomCode,
        messageExcerpt,
        details,
        createdAt: new Date().toISOString(),
      };
      db.reports.unshift(record);
      if (db.reports.length > 500) {
        db.reports = db.reports.slice(0, 500);
      }
      saveDatabase(db);

      res.status(201).json({ ok: true, id: record.id });
    } catch {
      res.status(500).json({ error: 'Impossible d’enregistrer le signalement.' });
    }
  });

  app.get('/api/leaderboard', (req, res) => {
    const db = loadDatabase();
    const playerName = typeof req.query.player === 'string' ? req.query.player : '';

    type PresenceLeaderboardEntry = LeaderboardPlayer & {
      presenceStatus: 'online' | 'in-game' | 'offline';
      clientId?: string;
    };

    const mergedMap = new Map<string, PresenceLeaderboardEntry>();
    for (const p of Object.values(db.players)) {
      mergedMap.set(p.id, { ...p, presenceStatus: 'offline' });
    }

    for (const c of mmClients) {
      if (c.ws.readyState !== WebSocket.OPEN) continue;
      const cleanPseudo = sanitizePseudo(c.pseudo);
      if (!cleanPseudo) continue;
      const key = normalizePlayerKey(cleanPseudo);
      const status: 'online' | 'in-game' =
        c.roomCode !== null || c.clientInGame ? 'in-game' : 'online';
      const existing = mergedMap.get(key);
      if (existing) {
        if (existing.presenceStatus === 'offline' || status === 'in-game') {
          existing.presenceStatus = status;
        }
        existing.clientId = c.clientId;
        if (c.avatarId && !existing.avatarId) {
          existing.avatarId = c.avatarId;
        }
      } else {
        mergedMap.set(key, {
          id: key,
          name: cleanPseudo,
          island: '',
          avatarId: c.avatarId || '',
          rating: c.rating || 1200,
          wins: 0,
          losses: 0,
          gamesPlayed: 0,
          totalCaptures: 0,
          bestRelay: 0,
          currentStreak: 0,
          bestStreak: 0,
          updatedAt: new Date().toISOString(),
          presenceStatus: status,
          clientId: c.clientId,
        });
      }
    }

    const allPlayers = Array.from(mergedMap.values());
    const statusWeight = (s: 'online' | 'in-game' | 'offline') =>
      s === 'online' ? 0 : s === 'in-game' ? 1 : 2;

    const byRating = [...allPlayers].sort(
      (a, b) =>
        b.rating - a.rating ||
        b.wins - a.wins ||
        statusWeight(a.presenceStatus) - statusWeight(b.presenceStatus)
    );

    const playerKey = playerName ? normalizePlayerKey(playerName) : '';
    const me = playerKey ? mergedMap.get(playerKey) || null : null;
    const myRank = me ? byRating.findIndex((p) => p.id === me.id) + 1 : null;

    res.json({
      byRating: byRating.slice(0, 80),
      me,
      myRank,
      totalPlayers: allPlayers.length,
    });
  });

  app.post('/api/matches', (req, res) => {
    try {
      const body = req.body as {
        mode?: 'solo' | 'duo-local';
        difficulty?: string;
        botId?: string;
        botElo?: number;
        player0Name?: string;
        player0Island?: string;
        player0AvatarId?: string;
        player1Name?: string;
        player1Island?: string;
        winnerIndex?: PlayerId;
        player0Seeds?: number;
        player1Seeds?: number;
        player0Captures?: number;
        player1Captures?: number;
        player0BestRelay?: number;
        player1BestRelay?: number;
        turnCount?: number;
        winReason?: string;
      };

      if (!body.mode || body.winnerIndex === undefined) {
        res.status(400).json({ error: 'Données de partie incomplètes.' });
        return;
      }

      const result = recordRankedMatch({
        mode: body.mode,
        difficulty: body.difficulty,
        botId: body.botId,
        botElo: body.botElo,
        player0Name: body.player0Name || 'Joueur 1',
        player0Island: body.player0Island || '',
        player0AvatarId: isValidAvatarInput(body.player0AvatarId)
          ? sanitizeAvatarId(body.player0AvatarId)
          : '',
        player1Name: body.player1Name || 'Ordinateur',
        player1Island: body.player1Island || '',
        winnerIndex: body.winnerIndex,
        player0Seeds: Number(body.player0Seeds ?? 0),
        player1Seeds: Number(body.player1Seeds ?? 0),
        player0Captures: Number(body.player0Captures ?? 0),
        player1Captures: Number(body.player1Captures ?? 0),
        player0BestRelay: Number(body.player0BestRelay ?? 0),
        player1BestRelay: Number(body.player1BestRelay ?? 0),
        turnCount: Number(body.turnCount ?? 0),
        winReason: body.winReason || 'Kamuv !',
      });

      res.json({ ok: true, ...result });
    } catch {
      res.status(500).json({ error: 'Impossible d’enregistrer le score.' });
    }
  });

  const httpServer = createHttpServer(app);

  // 1. Real-time WebSocket Chat Server (/ws/chat)
  interface ChatSocketMeta {
    ws: WebSocket;
    channel: string;
    pseudo: string;
    lastSentAt: number;
  }
  const chatClients = new Set<ChatSocketMeta>();
  const chatWss = new WebSocketServer({ noServer: true });

  const broadcastToChannel = (channel: string, event: unknown) => {
    const serialized = JSON.stringify(event);
    for (const client of chatClients) {
      if (client.channel === channel && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    }
  };

  const broadcastPresence = (channel: string) => {
    let onlineCount = 0;
    for (const client of chatClients) {
      if (client.channel === channel && client.ws.readyState === WebSocket.OPEN) {
        onlineCount += 1;
      }
    }
    broadcastToChannel(channel, { type: 'chat:presence', channel, onlineCount });
  };

  chatWss.on('connection', (ws: WebSocket) => {
    const meta: ChatSocketMeta = {
      ws,
      channel: 'global',
      pseudo: 'Joueur',
      lastSentAt: 0,
    };
    chatClients.add(meta);

    ws.on('message', (rawBuf) => {
      try {
        const parsed = JSON.parse(rawBuf.toString('utf-8')) as {
          type?: string;
          channel?: unknown;
          pseudo?: unknown;
          island?: unknown;
          avatarId?: unknown;
          text?: unknown;
          messageId?: unknown;
          emoji?: unknown;
        };

        if (parsed.type === 'chat:join') {
          const prevChannel = meta.channel;
          const nextChannel = sanitizeChannel(parsed.channel);
          meta.channel = nextChannel;
          const nextPseudo = sanitizePseudo(parsed.pseudo);
          if (nextPseudo) meta.pseudo = nextPseudo;

          const db = loadDatabase();
          const history = (db.chatMessages[nextChannel] || []).slice(-80);
          ws.send(
            JSON.stringify({
              type: 'chat:history',
              channel: nextChannel,
              messages: history,
            })
          );
          if (prevChannel !== nextChannel) {
            broadcastPresence(prevChannel);
          }
          broadcastPresence(nextChannel);
          return;
        }

        if (parsed.type === 'chat:send') {
          const now = Date.now();
          if (now - meta.lastSentAt < 350) return;
          meta.lastSentAt = now;

          const channel = sanitizeChannel(parsed.channel || meta.channel);
          const text = sanitizeChatText(parsed.text);
          if (!text) return;

          const pseudo = sanitizePseudo(parsed.pseudo) || meta.pseudo || 'Joueur';
          const island = sanitizeIsland(parsed.island);
          const avatarId = sanitizeAvatarId(parsed.avatarId);
          meta.pseudo = pseudo;

          const msg: ChatMessageRecord = {
            id: `msg-${crypto.randomUUID()}`,
            channel,
            pseudo,
            island,
            avatarId,
            text,
            reactions: {},
            createdAt: new Date().toISOString(),
          };

          const db = loadDatabase();
          const list = db.chatMessages[channel] || [];
          list.push(msg);
          if (list.length > 100) {
            db.chatMessages[channel] = list.slice(-100);
          } else {
            db.chatMessages[channel] = list;
          }
          saveDatabase(db);

          broadcastToChannel(channel, { type: 'chat:message', channel, message: msg });
          return;
        }

        if (parsed.type === 'chat:reaction') {
          const channel = sanitizeChannel(parsed.channel || meta.channel);
          const messageId = typeof parsed.messageId === 'string' ? parsed.messageId : '';
          const emoji = sanitizeEmoji(parsed.emoji);
          const pseudo = sanitizePseudo(parsed.pseudo) || meta.pseudo || 'Joueur';
          if (!messageId || !emoji) return;

          const db = loadDatabase();
          const list = db.chatMessages[channel] || [];
          const target = list.find((m) => m.id === messageId);
          if (!target) return;

          const existingUsers = target.reactions[emoji] || [];
          if (existingUsers.includes(pseudo)) {
            target.reactions[emoji] = existingUsers.filter((u) => u !== pseudo);
            if (target.reactions[emoji].length === 0) {
              delete target.reactions[emoji];
            }
          } else {
            target.reactions[emoji] = [...existingUsers, pseudo];
          }
          saveDatabase(db);

          broadcastToChannel(channel, {
            type: 'chat:reaction_update',
            channel,
            messageId: target.id,
            reactions: target.reactions,
          });
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.on('close', () => {
      chatClients.delete(meta);
      broadcastPresence(meta.channel);
    });
  });

  // 2. Real-time Chess.com-style ELO Matchmaking & Authoritative 1v1 Server (/ws/matchmaking)
  interface OnlineSocketPlayer {
    name: string;
    avatarId: string;
    rating: number;
    connected: boolean;
    rematchReady: boolean;
    nyumbaHidden: boolean;
    disconnectedAt: number | null;
  }

  interface ServerOnlineRoom {
    code: string;
    isPublic: boolean;
    players: [OnlineSocketPlayer, OnlineSocketPlayer];
    clientIds: [string, string];
    sockets: [WebSocket | null, WebSocket | null];
    state: GameStateSnapshot;
    settled: boolean;
  }

  interface MatchmakingSocketMeta {
    ws: WebSocket;
    clientId: string;
    pseudo: string;
    avatarId: string;
    rating: number;
    queuedAt: number | null;
    roomCode: string | null;
    playerIndex: PlayerId | null;
    clientInGame: boolean;
  }

  interface PendingChallenge {
    id: string;
    fromMeta: MatchmakingSocketMeta;
    toClientId: string;
    toKey: string;
    expiresAt: number;
  }

  const mmClients = new Set<MatchmakingSocketMeta>();
  const onlineRooms = new Map<string, ServerOnlineRoom>();
  const pendingChallenges = new Map<string, PendingChallenge>();
  const mmWss = new WebSocketServer({ noServer: true });

  const spawnOnlineRoom = (p0Meta: MatchmakingSocketMeta, p1Meta: MatchmakingSocketMeta) => {
    let code = String(Math.floor(100000 + Math.random() * 900000));
    while (onlineRooms.has(code)) {
      code = String(Math.floor(100000 + Math.random() * 900000));
    }

    const room: ServerOnlineRoom = {
      code,
      isPublic: true,
      clientIds: [p0Meta.clientId, p1Meta.clientId],
      sockets: [p0Meta.ws, p1Meta.ws],
      players: [
        {
          name: p0Meta.pseudo,
          avatarId: p0Meta.avatarId,
          rating: p0Meta.rating,
          connected: true,
          rematchReady: false,
          nyumbaHidden: false,
          disconnectedAt: null,
        },
        {
          name: p1Meta.pseudo,
          avatarId: p1Meta.avatarId,
          rating: p1Meta.rating,
          connected: true,
          rematchReady: false,
          nyumbaHidden: false,
          disconnectedAt: null,
        },
      ],
      // Règles de base officielles pour tout 1v1 en ligne
      state: createInitialGameState(0, DEFAULT_RULE_CONFIG),
      settled: false,
    };

    onlineRooms.set(code, room);

    p0Meta.queuedAt = null;
    p0Meta.roomCode = code;
    p0Meta.playerIndex = 0;

    p1Meta.queuedAt = null;
    p1Meta.roomCode = code;
    p1Meta.playerIndex = 1;

    const snap = toPublicRoomSnapshot(room);
    if (p0Meta.ws.readyState === WebSocket.OPEN) {
      p0Meta.ws.send(JSON.stringify({ type: 'room:ready', room: snap, playerIndex: 0 }));
    }
    if (p1Meta.ws.readyState === WebSocket.OPEN) {
      p1Meta.ws.send(JSON.stringify({ type: 'room:ready', room: snap, playerIndex: 1 }));
    }
  };

  const toPublicRoomSnapshot = (room: ServerOnlineRoom) => ({
    code: room.code,
    isPublic: room.isPublic,
    players: [room.players[0], room.players[1]],
    state: room.state,
  });

  const getEloTolerance = (elapsedSec: number): number => {
    if (elapsedSec < 5) return 100;
    if (elapsedSec < 10) return 250;
    if (elapsedSec < 15) return 500;
    return 2000;
  };

  const settleOnlineRoomIfFinished = (room: ServerOnlineRoom) => {
    if (room.settled || room.state.winner === null) return null;
    room.settled = true;

    const result = recordRankedMatch({
      mode: 'duo-online',
      player0Name: room.players[0].name,
      player0Island: '',
      player0AvatarId: room.players[0].avatarId,
      player1Name: room.players[1].name,
      player1Island: '',
      player1AvatarId: room.players[1].avatarId,
      winnerIndex: room.state.winner,
      player0Seeds: getPlayerTotalSeeds(room.state.board, 0, room.state.reserves),
      player1Seeds: getPlayerTotalSeeds(room.state.board, 1, room.state.reserves),
      player0Captures: room.state.captures[0],
      player1Captures: room.state.captures[1],
      player0BestRelay: room.state.longestRelay[0],
      player1BestRelay: room.state.longestRelay[1],
      turnCount: room.state.turnCount,
      winReason: room.state.winReason || 'Kamuv !',
    });

    room.players[0].rating = result.p0Rating;
    room.players[1].rating = result.p1Rating;
    return result;
  };

  const sendRoomToBoth = (
    room: ServerOnlineRoom,
    eventType: 'room:state' | 'game:moved',
    steps: MoveStep[] = [],
    eloDeltas: { p0Delta: number; p1Delta: number; p0Rating: number; p1Rating: number } | null = null
  ) => {
    const snap = toPublicRoomSnapshot(room);
    ([0, 1] as const).forEach((idx) => {
      const sock = room.sockets[idx];
      if (!sock || sock.readyState !== WebSocket.OPEN) return;
      if (eventType === 'room:state') {
        sock.send(JSON.stringify({ type: 'room:state', room: snap }));
      } else {
        sock.send(
          JSON.stringify({
            type: 'game:moved',
            room: snap,
            playerIndex: idx,
            steps,
            eloDeltas,
          })
        );
      }
    });
  };

  const handlePlayerAbortOrDisconnect = (meta: MatchmakingSocketMeta, reason: string) => {
    const code = meta.roomCode;
    const idx = meta.playerIndex;
    meta.roomCode = null;
    meta.playerIndex = null;
    if (!code || idx === null) return;

    const room = onlineRooms.get(code);
    if (!room) return;

    room.sockets[idx] = null;
    room.players[idx].connected = false;
    room.players[idx].disconnectedAt = Date.now();

    const otherIdx: PlayerId = idx === 0 ? 1 : 0;
    const otherSock = room.sockets[otherIdx];

    if (room.state.winner === null && !room.settled && room.state.turnCount > 0) {
      room.state = {
        ...room.state,
        winner: otherIdx,
        winReason: reason,
        pendingNyumbaChoice: null,
        pendingErrorUndo: null,
      };
      const eloDeltas = settleOnlineRoomIfFinished(room);
      sendRoomToBoth(room, 'game:moved', [], eloDeltas);
    } else {
      sendRoomToBoth(room, 'room:state');
    }

    if (!otherSock || otherSock.readyState !== WebSocket.OPEN) {
      onlineRooms.delete(code);
    }
  };

  // Loop de matchmaking ELO Chess.com + expiration des défis directs 1v1 (toutes les 1s)
  setInterval(() => {
    const now = Date.now();

    for (const [chId, ch] of pendingChallenges.entries()) {
      if (now >= ch.expiresAt) {
        pendingChallenges.delete(chId);
        if (ch.fromMeta.ws.readyState === WebSocket.OPEN) {
          ch.fromMeta.ws.send(
            JSON.stringify({
              type: 'challenge:declined',
              challengeId: chId,
              reason: 'Délai expiré.',
            })
          );
        }
      }
    }

    const queued = Array.from(mmClients).filter(
      (c) => c.ws.readyState === WebSocket.OPEN && c.queuedAt !== null && c.roomCode === null
    );

    if (queued.length === 0) return;

    // 1. Chercher la meilleure paire ELO compatible
    const matchedIndices = new Set<number>();
    const candidatePairs: Array<{ i: number; j: number; diff: number }> = [];

    for (let i = 0; i < queued.length; i++) {
      for (let j = i + 1; j < queued.length; j++) {
        const a = queued[i];
        const b = queued[j];
        if (a.clientId === b.clientId) continue;

        const elapsedA = Math.floor((now - (a.queuedAt ?? now)) / 1000);
        const elapsedB = Math.floor((now - (b.queuedAt ?? now)) / 1000);
        const maxTol = Math.max(getEloTolerance(elapsedA), getEloTolerance(elapsedB));
        const diff = Math.abs(a.rating - b.rating);
        if (diff <= maxTol) {
          candidatePairs.push({ i, j, diff });
        }
      }
    }

    candidatePairs.sort((a, b) => a.diff - b.diff);

    for (const pair of candidatePairs) {
      if (matchedIndices.has(pair.i) || matchedIndices.has(pair.j)) continue;
      matchedIndices.add(pair.i);
      matchedIndices.add(pair.j);

      const first = queued[pair.i];
      const second = queued[pair.j];
      const swap = Math.random() < 0.5;
      const p0Meta = swap ? second : first;
      const p1Meta = swap ? first : second;
      spawnOnlineRoom(p0Meta, p1Meta);
    }

    // 2. Informer les joueurs restants de l'état de leur recherche ELO
    for (let i = 0; i < queued.length; i++) {
      if (matchedIndices.has(i)) continue;
      const c = queued[i];
      const elapsedSec = Math.max(0, Math.floor((now - (c.queuedAt ?? now)) / 1000));
      const tolerance = getEloTolerance(elapsedSec);
      c.ws.send(
        JSON.stringify({
          type: 'queue:waiting',
          elapsedSec,
          tolerance,
          myRating: c.rating,
          queueSize: queued.length - matchedIndices.size,
        })
      );
    }
  }, 1000);

  const syncSocketIdentity = (
    meta: MatchmakingSocketMeta,
    parsed: {
      clientId?: unknown;
      pseudo?: unknown;
      avatarId?: unknown;
      authToken?: unknown;
      inGame?: unknown;
    }
  ) => {
    const token = typeof parsed.authToken === 'string' ? parsed.authToken.trim() : '';
    const session = token ? activeSessions.get(token) : undefined;

    const cleanClientId =
      typeof parsed.clientId === 'string' && parsed.clientId.trim()
        ? parsed.clientId.trim().slice(0, 64)
        : meta.clientId;
    const cleanPseudo = session
      ? session.pseudo
      : sanitizePseudo(parsed.pseudo) || meta.pseudo || 'Joueur';
    const cleanAvatar = session
      ? sanitizeAvatarId(session.avatarId)
      : sanitizeAvatarId(parsed.avatarId);

    const db = loadDatabase();
    const stats = db.players[normalizePlayerKey(cleanPseudo)];

    meta.clientId = cleanClientId;
    meta.pseudo = cleanPseudo;
    meta.avatarId = cleanAvatar;
    meta.rating = stats?.rating ?? 1200;
    if (typeof parsed.inGame === 'boolean') {
      meta.clientInGame = parsed.inGame;
    }
  };

  mmWss.on('connection', (ws: WebSocket) => {
    const meta: MatchmakingSocketMeta = {
      ws,
      clientId: `anon-${crypto.randomUUID()}`,
      pseudo: 'Joueur',
      avatarId: '',
      rating: 1200,
      queuedAt: null,
      roomCode: null,
      playerIndex: null,
      clientInGame: false,
    };
    mmClients.add(meta);

    ws.on('message', (rawBuf) => {
      try {
        const parsed = JSON.parse(rawBuf.toString('utf-8')) as {
          type?: string;
          clientId?: unknown;
          pseudo?: unknown;
          avatarId?: unknown;
          authToken?: unknown;
          inGame?: unknown;
          targetClientId?: unknown;
          targetName?: unknown;
          challengeId?: unknown;
          accept?: unknown;
          row?: unknown;
          col?: unknown;
          loopDir?: unknown;
          nyumbaChoice?: unknown;
          hidden?: unknown;
          emote?: unknown;
        };

        if (parsed.type === 'presence:hello' || parsed.type === 'presence:status') {
          syncSocketIdentity(meta, parsed);
          return;
        }

        if (parsed.type === 'challenge:send') {
          syncSocketIdentity(meta, parsed);
          if (meta.roomCode || meta.clientInGame) {
            ws.send(
              JSON.stringify({
                type: 'challenge:error',
                message: 'Terminez votre partie avant d’envoyer un défi.',
              })
            );
            return;
          }

          const targetClientId =
            typeof parsed.targetClientId === 'string' ? parsed.targetClientId.trim() : '';
          const targetName = sanitizePseudo(parsed.targetName);
          const targetKey = targetName ? normalizePlayerKey(targetName) : '';

          if (!targetClientId && !targetKey) {
            ws.send(JSON.stringify({ type: 'challenge:error', message: 'Joueur introuvable.' }));
            return;
          }

          const target = Array.from(mmClients).find((c) => {
            if (c.ws.readyState !== WebSocket.OPEN) return false;
            if (c === meta || c.clientId === meta.clientId) return false;
            if (targetClientId && c.clientId === targetClientId) return true;
            return Boolean(targetKey && normalizePlayerKey(c.pseudo) === targetKey);
          });

          if (!target) {
            ws.send(
              JSON.stringify({
                type: 'challenge:error',
                message: 'Ce joueur est actuellement hors ligne.',
              })
            );
            return;
          }
          if (target.roomCode !== null || target.clientInGame || target.queuedAt !== null) {
            ws.send(
              JSON.stringify({
                type: 'challenge:error',
                message: `${target.pseudo} est déjà en partie.`,
              })
            );
            return;
          }

          const challengeId = `chl-${crypto.randomUUID()}`;
          const expiresAt = Date.now() + 30_000;
          pendingChallenges.set(challengeId, {
            id: challengeId,
            fromMeta: meta,
            toClientId: target.clientId,
            toKey: normalizePlayerKey(target.pseudo),
            expiresAt,
          });

          target.ws.send(
            JSON.stringify({
              type: 'challenge:incoming',
              challengeId,
              fromClientId: meta.clientId,
              fromName: meta.pseudo,
              fromAvatarId: meta.avatarId,
              fromRating: meta.rating,
              expiresAt,
            })
          );
          ws.send(
            JSON.stringify({
              type: 'challenge:sent',
              challengeId,
              toName: target.pseudo,
            })
          );
          return;
        }

        if (parsed.type === 'challenge:respond') {
          const challengeId =
            typeof parsed.challengeId === 'string' ? parsed.challengeId.trim() : '';
          const accept = Boolean(parsed.accept);
          const ch = pendingChallenges.get(challengeId);
          if (!ch) {
            ws.send(
              JSON.stringify({
                type: 'challenge:error',
                message: 'Ce défi a expiré ou été annulé.',
              })
            );
            return;
          }

          const myKey = normalizePlayerKey(meta.pseudo);
          if (meta.clientId !== ch.toClientId && myKey !== ch.toKey) {
            return;
          }

          pendingChallenges.delete(challengeId);

          if (!accept) {
            if (ch.fromMeta.ws.readyState === WebSocket.OPEN) {
              ch.fromMeta.ws.send(
                JSON.stringify({
                  type: 'challenge:declined',
                  challengeId,
                  reason: `${meta.pseudo} a décliné votre défi.`,
                })
              );
            }
            return;
          }

          if (
            ch.fromMeta.ws.readyState !== WebSocket.OPEN ||
            ch.fromMeta.roomCode !== null ||
            meta.roomCode !== null
          ) {
            ws.send(
              JSON.stringify({
                type: 'challenge:error',
                message: 'Impossible de lancer le duel (adversaire indisponible).',
              })
            );
            return;
          }

          const swap = Math.random() < 0.5;
          spawnOnlineRoom(swap ? meta : ch.fromMeta, swap ? ch.fromMeta : meta);
          return;
        }

        if (parsed.type === 'queue:join') {
          if (meta.roomCode) {
            handlePlayerAbortOrDisconnect(meta, 'Abandon de l’adversaire');
          }

          syncSocketIdentity(meta, parsed);
          meta.queuedAt = Date.now();
          meta.roomCode = null;
          meta.playerIndex = null;

          const queueSize = Array.from(mmClients).filter(
            (c) => c.queuedAt !== null && c.roomCode === null
          ).length;

          ws.send(
            JSON.stringify({
              type: 'queue:waiting',
              elapsedSec: 0,
              tolerance: 100,
              myRating: meta.rating,
              queueSize,
            })
          );
          return;
        }

        if (parsed.type === 'queue:leave') {
          meta.queuedAt = null;
          return;
        }

        if (parsed.type === 'room:leave') {
          meta.queuedAt = null;
          handlePlayerAbortOrDisconnect(meta, 'L’adversaire a quitté la partie');
          return;
        }

        if (!meta.roomCode || meta.playerIndex === null) return;
        const room = onlineRooms.get(meta.roomCode);
        if (!room) return;
        const actorIdx = meta.playerIndex;

        if (parsed.type === 'game:move') {
          if (room.state.winner !== null || room.state.currentTurn !== actorIdx) return;
          const row = Number(parsed.row);
          const col = Number(parsed.col);
          const loopDir = parsed.loopDir === 1 ? 1 : parsed.loopDir === -1 ? -1 : null;
          if (!Number.isInteger(row) || !Number.isInteger(col) || loopDir === null) return;

          const { nextState, steps } = executeMove(
            room.state,
            actorIdx,
            row,
            col,
            loopDir as LoopDir,
            true,
            true
          );
          room.state = nextState;
          const eloDeltas = settleOnlineRoomIfFinished(room);
          sendRoomToBoth(room, 'game:moved', steps, eloDeltas);
          return;
        }

        if (parsed.type === 'game:nyumba') {
          if (room.state.pendingNyumbaChoice?.player !== actorIdx) return;
          const choice = parsed.nyumbaChoice === 'continue' ? 'continue' : 'stop';
          const { nextState, steps } = resolveNyumbaChoice(room.state, choice, true, true);
          room.state = nextState;
          const eloDeltas = settleOnlineRoomIfFinished(room);
          sendRoomToBoth(room, 'game:moved', steps, eloDeltas);
          return;
        }

        if (parsed.type === 'game:error_undo') {
          if (room.state.pendingErrorUndo?.player !== actorIdx) return;
          room.state = applyErrorRightUndo(room.state);
          sendRoomToBoth(room, 'game:moved', [], null);
          return;
        }

        if (parsed.type === 'game:confirm_turn') {
          if (room.state.pendingErrorUndo?.player !== actorIdx) return;
          room.state = confirmTurnAfterTrakatra(room.state);
          const eloDeltas = settleOnlineRoomIfFinished(room);
          sendRoomToBoth(room, 'game:moved', [], eloDeltas);
          return;
        }

        if (parsed.type === 'game:hide_nyumba') {
          const nextHidden =
            typeof parsed.hidden === 'boolean'
              ? parsed.hidden
              : !room.players[actorIdx].nyumbaHidden;
          room.players[actorIdx].nyumbaHidden = nextHidden;
          sendRoomToBoth(room, 'room:state');
          return;
        }

        if (parsed.type === 'game:rematch') {
          room.players[actorIdx].rematchReady = true;
          if (room.players[0].rematchReady && room.players[1].rematchReady) {
            room.players[0].rematchReady = false;
            room.players[1].rematchReady = false;
            room.state = createInitialGameState(0, DEFAULT_RULE_CONFIG);
            room.settled = false;
            const snap = toPublicRoomSnapshot(room);
            ([0, 1] as const).forEach((idx) => {
              const sock = room.sockets[idx];
              if (sock && sock.readyState === WebSocket.OPEN) {
                sock.send(JSON.stringify({ type: 'room:ready', room: snap, playerIndex: idx }));
              }
            });
          } else {
            sendRoomToBoth(room, 'room:state');
          }
          return;
        }

        if (parsed.type === 'game:emote') {
          const emote = sanitizeEmoji(parsed.emote);
          if (!emote) return;
          const payload = JSON.stringify({
            type: 'game:emote',
            fromPlayer: actorIdx,
            emote,
          });
          ([0, 1] as const).forEach((idx) => {
            const sock = room.sockets[idx];
            if (sock && sock.readyState === WebSocket.OPEN) {
              sock.send(payload);
            }
          });
        }
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: err instanceof Error ? err.message : 'Action invalide.',
          })
        );
      }
    });

    ws.on('close', () => {
      mmClients.delete(meta);
      meta.queuedAt = null;
      for (const [chId, ch] of pendingChallenges.entries()) {
        if (ch.fromMeta === meta) {
          pendingChallenges.delete(chId);
        }
      }
      handlePlayerAbortOrDisconnect(meta, 'Connexion adverse perdue');
    });
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const urlPath = (request.url || '').split('?')[0];
    if (urlPath === '/ws/chat') {
      chatWss.handleUpgrade(request, socket, head, (ws) => {
        chatWss.emit('connection', ws, request);
      });
    } else if (urlPath === '/ws/matchmaking') {
      mmWss.handleUpgrade(request, socket, head, (ws) => {
        mmWss.emit('connection', ws, request);
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: {
          server: httpServer,
          path: '/__vite_ws',
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0');
}

startServer();
