import { useEffect, useState } from 'react';
import { Flag, RefreshCw, Swords, Trophy, X } from 'lucide-react';
import type { LeaderboardEntry, PresenceStatus, ReportTarget } from '../types/app';
import { ProfileAvatar } from '../utils/avatars';

interface LeaderboardModalProps {
  playerName: string;
  onChallengePlayer: (entry: LeaderboardEntry) => void;
  onReportPlayer: (target: ReportTarget) => void;
  onClose: () => void;
}

function getPresenceMeta(status?: PresenceStatus): {
  label: string;
  dotClass: string;
  textClass: string;
} {
  if (status === 'online') {
    return {
      label: 'En ligne',
      dotClass: 'bg-[#2DD4BF]',
      textClass: 'text-[#2DD4BF]',
    };
  }
  if (status === 'in-game') {
    return {
      label: 'En partie',
      dotClass: 'bg-[#F2B441]',
      textClass: 'text-[#F2B441]',
    };
  }
  return {
    label: 'Hors ligne',
    dotClass: 'bg-[#6F787D]',
    textClass: 'text-[#8F969A]',
  };
}

export function LeaderboardModal({
  playerName,
  onChallengePlayer,
  onReportPlayer,
  onClose,
}: LeaderboardModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?player=${encodeURIComponent(playerName)}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setPlayers(data.byRating || []);
      setMe(data.me || null);
      setMyRank(data.myRank || null);
    } catch {
      setError('Impossible de charger le classement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [playerName]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
    >
      <div className="animate-sheet-up flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#F5F1E8]/12 bg-[#181E22] text-[#F5F1E8] shadow-2xl sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#F5F1E8]/10 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-[#E5A93C]" />
            <h2 id="leaderboard-title" className="font-display text-lg font-bold">
              Classement
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchLeaderboard}
              className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl text-[#A8A295] hover:bg-[#F5F1E8]/10 hover:text-[#F5F1E8]"
              aria-label="Actualiser"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl text-[#A8A295] hover:bg-[#F5F1E8]/10 hover:text-[#F5F1E8]"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {me && myRank && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F5F1E8]/10 bg-[#21282D] px-5 py-2.5 text-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="font-mono-nums font-bold text-[#E5A93C]">#{myRank}</span>
              <ProfileAvatar avatarId={me.avatarId} pseudo={me.name} size="xs" highlight />
              <span className="truncate font-semibold text-[#F5F1E8]">{me.name}</span>
            </div>
            <div className="font-mono-nums shrink-0 text-xs font-bold text-[#F5F1E8]">
              {me.rating} ELO · <span className="text-[#2FB380]">{me.wins}V</span> / {me.losses}D
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="py-10 text-center text-sm text-[#A8A295]">Chargement…</div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-400">{error}</div>
          ) : players.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#A8A295]">Aucun joueur</div>
          ) : (
            <div className="space-y-1.5">
              {players.map((entry, idx) => {
                const isSelf = entry.name.toLowerCase() === playerName.trim().toLowerCase();
                const presence = getPresenceMeta(entry.presenceStatus);
                const canChallenge = !isSelf && entry.presenceStatus === 'online';

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 ${
                      isSelf
                        ? 'border-[#E5A93C]/45 bg-[#E5A93C]/10'
                        : 'border-[#F5F1E8]/8 bg-[#12171A]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="font-mono-nums w-7 shrink-0 text-xs font-extrabold text-[#E5A93C]">
                        #{idx + 1}
                      </span>
                      <ProfileAvatar avatarId={entry.avatarId} pseudo={entry.name} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-[#F5F1E8]">
                            {entry.name}
                          </span>
                          <span className="font-mono-nums shrink-0 text-xs font-extrabold text-[#E5A93C]">
                            {entry.rating}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className={`h-2 w-2 rounded-full ${presence.dotClass}`} />
                          <span className={presence.textClass}>{presence.label}</span>
                          <span className="text-[#6F787D]">·</span>
                          <span className="font-mono-nums text-[#A8A295]">
                            {entry.wins}V / {entry.losses}D
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {canChallenge && (
                        <button
                          type="button"
                          onClick={() => onChallengePlayer(entry)}
                          className="flex min-h-[36px] items-center gap-1 rounded-xl bg-[#2DD4BF] px-2.5 text-xs font-extrabold text-[#0A2623] transition-transform active:scale-95"
                          aria-label={`Défier ${entry.name} en 1v1`}
                        >
                          <Swords className="h-3.5 w-3.5" />
                          <span>1v1</span>
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() =>
                            onReportPlayer({
                              targetPseudo: entry.name,
                              context: 'leaderboard',
                            })
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#F5F1E8]/10 bg-[#1B2226] text-[#9BA3A8] hover:border-red-400/40 hover:text-red-300"
                          aria-label={`Signaler ${entry.name}`}
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
