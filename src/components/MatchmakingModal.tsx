import { Globe, Loader2, Trophy, X } from 'lucide-react';
import type { ConnectionStatus, MatchmakingQueueStatus } from '../types/app';
import { ProfileAvatar } from '../utils/avatars';

interface MatchmakingModalProps {
  playerPseudo: string;
  playerAvatarId?: string;
  queueStatus: MatchmakingQueueStatus | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
  onCancel: () => void;
}

function formatWaitTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MatchmakingModal({
  playerPseudo,
  playerAvatarId,
  queueStatus,
  connectionStatus,
  error,
  onCancel,
}: MatchmakingModalProps) {
  const myRating = queueStatus?.myRating ?? 1200;
  const tol = queueStatus?.tolerance ?? 100;
  const minElo = Math.max(400, myRating - tol);
  const maxElo = myRating + tol;
  const elapsed = queueStatus?.elapsedSec ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/82 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="matchmaking-title"
    >
      <div className="animate-sheet-up flex w-full max-w-sm flex-col overflow-hidden rounded-t-3xl border border-[#2DD4BF]/40 bg-[#141A1C] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#FFF7E8]/10 bg-[#0F1416] px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#2DD4BF]" />
            <h2 id="matchmaking-title" className="font-display text-base font-bold">
              1v1 en ligne
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#D8C7AE] hover:bg-[#FFF7E8]/10"
            aria-label="Annuler"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
            <ProfileAvatar
              avatarId={playerAvatarId}
              pseudo={playerPseudo}
              size="xl"
              highlight
            />
          </div>

          <div>
            <div className="text-lg font-extrabold text-[#FFF7E8]">{playerPseudo}</div>
            <div className="font-mono-nums mt-0.5 inline-flex items-center gap-1.5 text-sm font-black text-[#F2B441]">
              <Trophy className="h-4 w-4" />
              <span>{myRating} ELO</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#FFF7E8]/10 bg-[#0F1416] p-3.5 text-xs">
            <div className="flex items-center justify-center gap-2 font-bold text-[#2DD4BF]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {connectionStatus === 'reconnecting' ? 'Connexion…' : 'Recherche…'}
              </span>
            </div>

            <div className="font-mono-nums mt-2 flex items-center justify-between text-[#D8C7AE]">
              <span>
                {tol >= 2000 ? 'Tous niveaux' : `${minElo} – ${maxElo}`}
              </span>
              <span className="font-bold text-[#FFF7E8]">{formatWaitTime(elapsed)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-amber-400/45 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="min-h-[46px] w-full rounded-2xl border border-[#FFF7E8]/15 bg-[#1B2225] text-sm font-bold text-[#EBDCC3] hover:border-[#F2B441]/40"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
