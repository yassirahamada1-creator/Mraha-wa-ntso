import type { ChatMessageItem } from '../types/app';

export interface LiveChatHandlers {
  onHistory: (messages: ChatMessageItem[]) => void;
  onMessage: (message: ChatMessageItem) => void;
  onReactionUpdate: (messageId: string, reactions: Record<string, string[]>) => void;
  onPresence: (onlineCount: number) => void;
  onStatusChange: (connected: boolean) => void;
}

export class MrahaChatClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private destroyed = false;
  private channel: string;
  private pseudo: string;
  private island: string;
  private avatarId: string;
  private handlers: LiveChatHandlers;
  private seenIds = new Set<string>();

  constructor(
    params: { channel: string; pseudo: string; island: string; avatarId?: string },
    handlers: LiveChatHandlers
  ) {
    this.channel = params.channel || 'global';
    this.pseudo = params.pseudo || 'Joueur';
    this.island = params.island || '';
    this.avatarId = params.avatarId || '';
    this.handlers = handlers;
  }

  public updateIdentity(pseudo: string, island: string, avatarId?: string): void {
    this.pseudo = pseudo || 'Joueur';
    this.island = island || '';
    this.avatarId = avatarId || '';
  }

  public setChannel(channel: string): void {
    const clean = channel || 'global';
    if (clean === this.channel && this.ws?.readyState === WebSocket.OPEN) return;
    this.channel = clean;
    this.seenIds.clear();
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'chat:join',
          channel: this.channel,
          pseudo: this.pseudo,
        })
      );
    }
  }

  public connect(): void {
    if (this.destroyed || typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.destroyed) {
          socket.close();
          return;
        }
        this.handlers.onStatusChange(true);
        socket.send(
          JSON.stringify({
            type: 'chat:join',
            channel: this.channel,
            pseudo: this.pseudo,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as {
            type?: string;
            channel?: string;
            messages?: ChatMessageItem[];
            message?: ChatMessageItem;
            messageId?: string;
            reactions?: Record<string, string[]>;
            onlineCount?: number;
          };

          if (data.type === 'chat:history' && Array.isArray(data.messages)) {
            this.seenIds.clear();
            for (const m of data.messages) {
              this.seenIds.add(m.id);
            }
            this.handlers.onHistory(data.messages);
            return;
          }

          if (data.type === 'chat:message' && data.message) {
            if (this.seenIds.has(data.message.id)) return;
            this.seenIds.add(data.message.id);
            this.handlers.onMessage(data.message);
            return;
          }

          if (data.type === 'chat:reaction_update' && data.messageId && data.reactions) {
            this.handlers.onReactionUpdate(data.messageId, data.reactions);
            return;
          }

          if (data.type === 'chat:presence' && typeof data.onlineCount === 'number') {
            this.handlers.onPresence(data.onlineCount);
          }
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        this.handlers.onStatusChange(false);
        this.ws = null;
        if (!this.destroyed && this.reconnectTimer === null) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 2200);
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch {
      this.handlers.onStatusChange(false);
    }
  }

  public sendMessage(text: string): void {
    const clean = text.trim().slice(0, 280);
    if (!clean || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'chat:send',
        channel: this.channel,
        pseudo: this.pseudo,
        island: this.island,
        avatarId: this.avatarId,
        text: clean,
      })
    );
  }

  public toggleReaction(messageId: string, emoji: string): void {
    if (!messageId || !emoji || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'chat:reaction',
        channel: this.channel,
        messageId,
        emoji,
        pseudo: this.pseudo,
      })
    );
  }

  public disconnect(): void {
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.onStatusChange(false);
  }
}
