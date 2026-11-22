import { useEffect, useRef, useState } from 'react';
import { Flag, MessageCircle, Send, SmilePlus, UserPlus, Users, X } from 'lucide-react';
import type { ChatMessageItem, ReportTarget } from '../types/app';
import { ProfileAvatar } from '../utils/avatars';

interface LiveChatDrawerProps {
  messages: ChatMessageItem[];
  onlineCount: number;
  connected: boolean;
  myPseudo: string;
  myAvatarId?: string;
  hasAccount: boolean;
  onSendMessage: (text: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onReportMessage?: (target: ReportTarget) => void;
  onOpenAccount: () => void;
  onClose: () => void;
}

const QUICK_EMOJIS = ['👏', '🔥', '😄', '🤔', '🤝', '😮', '🏆', '❤️'] as const;

const FULL_EMOJI_GRID = [
  '👏',
  '🔥',
  '😄',
  '😂',
  '😎',
  '🤔',
  '😮',
  '😱',
  '🤝',
  '🙏',
  '❤️',
  '💥',
  '⚡',
  '🏆',
  '👑',
  '🥥',
  '🌴',
  '🌊',
  '🎯',
  '👍',
] as const;

function formatClock(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function LiveChatDrawer({
  messages,
  onlineCount,
  connected,
  myPseudo,
  myAvatarId,
  hasAccount,
  onSendMessage,
  onToggleReaction,
  onReportMessage,
  onOpenAccount,
  onClose,
}: LiveChatDrawerProps) {
  const [draft, setDraft] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactingToId, setReactingToId] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean) return;
    onSendMessage(clean);
    setDraft('');
    setShowEmojiPicker(false);
  };

  const handleQuickEmoji = (emoji: string) => {
    if (draft.trim().length > 0) {
      setDraft((prev) => `${prev}${emoji}`);
    } else {
      onSendMessage(emoji);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-chat-title"
    >
      <div className="animate-sheet-up flex h-[82dvh] max-h-[680px] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[#2DD4BF]/35 bg-[#141A1C] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        <div className="flex justify-center bg-[#0F1416] pt-2.5 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[#FFF7E8]/20" />
        </div>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#FFF7E8]/10 bg-[#0F1416] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <ProfileAvatar avatarId={myAvatarId} pseudo={myPseudo} size="sm" highlight />
            <div>
              <h2 id="live-chat-title" className="font-display text-base font-bold sm:text-lg">
                Chat
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-[#B8ABA0]">
                <Users className="h-3 w-3" />
                <span className="font-mono-nums">{onlineCount}</span>
                <span>·</span>
                <span className="font-semibold text-[#FFF7E8]">{myPseudo}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!hasAccount && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAccount();
                }}
                className="flex min-h-[40px] items-center gap-1 rounded-xl border border-[#F2B441]/40 bg-[#2A1C0E] px-2.5 text-xs font-bold text-[#F2B441]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Pseudo</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#D8C7AE] hover:bg-[#FFF7E8]/10"
              aria-label="Fermer le chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[#9FB0B3]">
              <MessageCircle className="h-8 w-8 text-[#2DD4BF]/50" />
              <p>Aucun message</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.pseudo.toLowerCase() === myPseudo.toLowerCase();
              const reactionEntries = Object.entries(msg.reactions || {}).filter(
                ([, users]) => users.length > 0
              );

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-[#9FB0B3]">
                    <ProfileAvatar avatarId={msg.avatarId} pseudo={msg.pseudo} size="xs" />
                    <span className={`font-bold ${isMine ? 'text-[#F2B441]' : 'text-[#2DD4BF]'}`}>
                      {msg.pseudo}
                    </span>
                    <span>·</span>
                    <span className="font-mono-nums">{formatClock(msg.createdAt)}</span>
                    {!isMine && onReportMessage && (
                      <button
                        type="button"
                        onClick={() =>
                          onReportMessage({
                            targetPseudo: msg.pseudo,
                            context: 'chat',
                            roomCode: msg.channel,
                            messageExcerpt: msg.text,
                          })
                        }
                        className="ml-1 rounded p-0.5 text-[#8A9A9D] hover:text-red-400"
                        aria-label={`Signaler ${msg.pseudo}`}
                      >
                        <Flag className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="group relative max-w-[85%]">
                    <button
                      type="button"
                      onClick={() =>
                        setReactingToId((prev) => (prev === msg.id ? null : msg.id))
                      }
                      className={`rounded-2xl px-3.5 py-2 text-left text-sm leading-snug transition-colors ${
                        isMine
                          ? 'bg-[#362211] text-[#FFF7E8] ring-1 ring-[#F2B441]/30'
                          : 'bg-[#1C2528] text-[#FFF7E8] ring-1 ring-[#FFF7E8]/10'
                      }`}
                    >
                      {msg.text}
                    </button>

                    {reactingToId === msg.id && (
                      <div className="mt-1 flex flex-wrap gap-1 rounded-xl border border-[#FFF7E8]/15 bg-[#0F1416] p-1 shadow-xl">
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              onToggleReaction(msg.id, emoji);
                              setReactingToId(null);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-[#FFF7E8]/10 active:scale-90"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {reactionEntries.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {reactionEntries.map(([emoji, users]) => {
                        const iReacted = users.includes(myPseudo);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => onToggleReaction(msg.id, emoji)}
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                              iReacted
                                ? 'border border-[#2DD4BF] bg-[#0F2D2E] text-[#2DD4BF]'
                                : 'border border-[#FFF7E8]/12 bg-[#1B2225] text-[#EBDCC3]'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-mono-nums text-[11px] font-bold">
                              {users.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={scrollEndRef} />
        </div>

        {/* Barre d'émojis rapides style Chess.com */}
        <div className="shrink-0 border-t border-[#FFF7E8]/10 bg-[#0F1416] px-3 pt-2">
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1.5">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleQuickEmoji(emoji)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1C2528] text-lg transition-transform active:scale-90 hover:bg-[#273337]"
                aria-label={`Envoyer ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {showEmojiPicker && (
            <div className="mb-2 grid grid-cols-10 gap-1 rounded-2xl border border-[#FFF7E8]/10 bg-[#182023] p-2">
              {FULL_EMOJI_GRID.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setDraft((prev) => `${prev}${emoji}`)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-[#FFF7E8]/10 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Saisie message */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={`flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border transition-colors ${
                showEmojiPicker
                  ? 'border-[#F2B441] bg-[#362211] text-[#F2B441]'
                  : 'border-[#FFF7E8]/15 bg-[#1C2528] text-[#D8C7AE]'
              }`}
              aria-label="Palette d'emojis"
            >
              <SmilePlus className="h-5 w-5" />
            </button>

            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={280}
              placeholder="Écrire un message…"
              className="min-h-[48px] min-w-0 flex-1 rounded-2xl border border-[#FFF7E8]/15 bg-[#1C2528] px-3.5 text-sm text-[#FFF7E8] placeholder:text-[#8A9A9D] focus:border-[#2DD4BF] focus:outline-none"
            />

            <button
              type="submit"
              disabled={!connected || !draft.trim()}
              className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl bg-[#2DD4BF] text-[#0A2623] transition-transform active:scale-95 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
