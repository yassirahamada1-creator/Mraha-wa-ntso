import type { LoopDir, MoveStep, PlayerId } from '../game/mrahaEngine';
import type {
  ConnectionStatus,
  IncomingChallenge,
  MatchmakingQueueStatus,
  OnlineRoomSnapshot,
} from '../types/app';

export interface OnlineClientHandlers {
  onStatusChange: (status: ConnectionStatus) => void;
  onError: (message: string) => void;
  onQueueUpdate: (status: MatchmakingQueueStatus) => void;
  onRoomReady: (room: OnlineRoomSnapshot, playerIndex: PlayerId) => void;
  onRoomState: (room: OnlineRoomSnapshot) => void;
  onGameMoved: (payload: {
    room: OnlineRoomSnapshot;
    playerIndex: PlayerId;
    steps: MoveStep[];
    eloDeltas?: { p0Delta: number; p1Delta: number; p0Rating: number; p1Rating: number } | null;
  }) => void;
  onEmote: (fromPlayer: PlayerId, emote: string) => void;
  onChallengeIncoming?: (challenge: IncomingChallenge) => void;
  onChallengeSent?: (toName: string) => void;
  onChallengeDeclined?: (reason: string) => void;
  onChallengeError?: (message: string) => void;
}

export class MrahaOnlineClient {
  private ws: WebSocket | null = null;
  private destroyed = false;
  private wantQueue = false;
  private inGamePresence = false;
  private authToken: string | null = null;
  private profile: { clientId: string; name: string; avatarId?: string };
  private handlers: OnlineClientHandlers;

  constructor(
    profile: { clientId: string; name: string; avatarId?: string; authToken?: string | null },
    handlers: OnlineClientHandlers
  ) {
    this.profile = {
      clientId: profile.clientId,
      name: profile.name,
      avatarId: profile.avatarId,
    };
    this.authToken = profile.authToken ?? null;
    this.handlers = handlers;
  }

  public updateProfile(profile: {
    clientId: string;
    name: string;
    avatarId?: string;
    authToken?: string | null;
  }): void {
    this.profile = {
      clientId: profile.clientId,
      name: profile.name,
      avatarId: profile.avatarId,
    };
    this.authToken = profile.authToken ?? null;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'presence:status',
        clientId: this.profile.clientId,
        pseudo: this.profile.name,
        avatarId: this.profile.avatarId || '',
        authToken: this.authToken || '',
        inGame: this.inGamePresence,
      });
    }
  }

  public setInGamePresence(inGame: boolean): void {
    this.inGamePresence = inGame;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'presence:status',
        clientId: this.profile.clientId,
        pseudo: this.profile.name,
        avatarId: this.profile.avatarId || '',
        authToken: this.authToken || '',
        inGame,
      });
    }
  }

  public updateHandlers(handlers: OnlineClientHandlers): void {
    this.handlers = handlers;
  }

  private getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/matchmaking`;
  }

  public connectAndQueue(): void {
    this.destroyed = false;
    this.wantQueue = true;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'queue:join',
        clientId: this.profile.clientId,
        pseudo: this.profile.name,
        avatarId: this.profile.avatarId || '',
        authToken: this.authToken || '',
      });
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.openSocket();
  }

  public connect(): void {
    this.destroyed = false;
    if (!this.ws || this.ws.readyState > WebSocket.OPEN) {
      this.openSocket();
    }
  }

  private openSocket(): void {
    if (this.destroyed || typeof window === 'undefined') return;
    this.handlers.onStatusChange('reconnecting');

    const socket = new WebSocket(this.getWsUrl());
    this.ws = socket;

    socket.onopen = () => {
      if (this.destroyed) {
        socket.close();
        return;
      }
      this.handlers.onStatusChange('connected');
      this.send({
        type: 'presence:hello',
        clientId: this.profile.clientId,
        pseudo: this.profile.name,
        avatarId: this.profile.avatarId || '',
        authToken: this.authToken || '',
        inGame: this.inGamePresence,
      });
      if (this.wantQueue) {
        this.send({
          type: 'queue:join',
          clientId: this.profile.clientId,
          pseudo: this.profile.name,
          avatarId: this.profile.avatarId || '',
          authToken: this.authToken || '',
        });
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          elapsedSec?: number;
          tolerance?: number;
          myRating?: number;
          queueSize?: number;
          room?: OnlineRoomSnapshot;
          playerIndex?: PlayerId;
          steps?: MoveStep[];
          eloDeltas?: {
            p0Delta: number;
            p1Delta: number;
            p0Rating: number;
            p1Rating: number;
          } | null;
          fromPlayer?: PlayerId;
          emote?: string;
          message?: string;
          challengeId?: string;
          fromClientId?: string;
          fromName?: string;
          fromAvatarId?: string;
          fromRating?: number;
          expiresAt?: number;
          toName?: string;
          reason?: string;
        };

        if (data.type === 'queue:waiting') {
          this.handlers.onQueueUpdate({
            elapsedSec: data.elapsedSec ?? 0,
            tolerance: data.tolerance ?? 100,
            myRating: data.myRating ?? 1200,
            queueSize: data.queueSize ?? 1,
          });
          return;
        }

        if (data.type === 'room:ready' && data.room && typeof data.playerIndex === 'number') {
          this.wantQueue = false;
          this.handlers.onRoomReady(data.room, data.playerIndex);
          return;
        }

        if (data.type === 'room:state' && data.room) {
          this.handlers.onRoomState(data.room);
          return;
        }

        if (
          data.type === 'game:moved' &&
          data.room &&
          typeof data.playerIndex === 'number'
        ) {
          this.handlers.onGameMoved({
            room: data.room,
            playerIndex: data.playerIndex,
            steps: data.steps || [],
            eloDeltas: data.eloDeltas ?? null,
          });
          return;
        }

        if (data.type === 'game:emote' && typeof data.fromPlayer === 'number' && data.emote) {
          this.handlers.onEmote(data.fromPlayer, data.emote);
          return;
        }

        if (data.type === 'challenge:incoming' && data.challengeId && data.fromName) {
          this.handlers.onChallengeIncoming?.({
            challengeId: data.challengeId,
            fromClientId: data.fromClientId || '',
            fromName: data.fromName,
            fromAvatarId: data.fromAvatarId || '',
            fromRating: data.fromRating ?? 1200,
            expiresAt: data.expiresAt ?? Date.now() + 30_000,
          });
          return;
        }

        if (data.type === 'challenge:sent' && data.toName) {
          this.handlers.onChallengeSent?.(data.toName);
          return;
        }

        if (data.type === 'challenge:declined') {
          this.handlers.onChallengeDeclined?.(data.reason || 'Défi refusé.');
          return;
        }

        if (data.type === 'challenge:error' && data.message) {
          this.handlers.onChallengeError?.(data.message);
          return;
        }

        if (data.type === 'error' && data.message) {
          this.handlers.onError(data.message);
        }
      } catch {
        // ignore malformed payload
      }
    };

    socket.onclose = () => {
      if (this.ws === socket) {
        this.ws = null;
      }
      this.handlers.onStatusChange('disconnected');
    };

    socket.onerror = () => {
      this.handlers.onError('Connexion au serveur en ligne interrompue.');
    };
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public sendChallenge(targetClientId: string | undefined, targetName: string): void {
    this.connect();
    this.send({
      type: 'challenge:send',
      clientId: this.profile.clientId,
      pseudo: this.profile.name,
      avatarId: this.profile.avatarId || '',
      authToken: this.authToken || '',
      targetClientId: targetClientId || '',
      targetName,
    });
  }

  public respondChallenge(challengeId: string, accept: boolean): void {
    this.send({
      type: 'challenge:respond',
      challengeId,
      accept,
    });
  }

  public leaveMatchmaking(): void {
    this.wantQueue = false;
    this.send({ type: 'queue:leave' });
  }

  public leaveRoom(): void {
    this.wantQueue = false;
    this.send({ type: 'room:leave' });
  }

  public sendMove(_roomCode: string, row: number, col: number, loopDir: LoopDir): void {
    this.send({ type: 'game:move', row, col, loopDir });
  }

  public sendNyumbaChoice(_roomCode: string, nyumbaChoice: 'stop' | 'continue'): void {
    this.send({ type: 'game:nyumba', nyumbaChoice });
  }

  public sendErrorUndo(_roomCode: string): void {
    this.send({ type: 'game:error_undo' });
  }

  public sendConfirmTurn(_roomCode: string): void {
    this.send({ type: 'game:confirm_turn' });
  }

  public sendRematch(_roomCode: string): void {
    this.send({ type: 'game:rematch' });
  }

  public toggleHideNyumba(_roomCode: string, hidden: boolean): void {
    this.send({ type: 'game:hide_nyumba', hidden });
  }

  public sendEmote(_roomCode: string, emote: string): void {
    this.send({ type: 'game:emote', emote });
  }

  public disconnect(): void {
    this.destroyed = true;
    this.wantQueue = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.onStatusChange('disconnected');
  }
}
