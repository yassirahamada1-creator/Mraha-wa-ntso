import { useEffect, useState } from 'react';
import { Award, Flame, History, Lock, Shield, Star, X } from 'lucide-react';
import { CULTURAL_ACHIEVEMENTS } from '../game/mrahaHelpers';
import type { LeaderboardEntry, ProgressionState } from '../types/app';
import { ProfileAvatar } from '../utils/avatars';

interface StatsAchievementsModalProps {
  playerName: string;
  playerAvatarId?: string;
  progression: ProgressionState;
  savedMatchesCount: number;
  onOpenHistoryReplay: () => void;
  onClose: () => void;
}

export function StatsAchievementsModal({
  playerName,
  playerAvatarId,
  progression,
  savedMatchesCount,
  onOpenHistoryReplay,
  onClose,
}: StatsAchievementsModalProps) {
  const [tab, setTab] = useState<'summary' | 'badges'>('summary');
  const [eloInfo, setEloInfo] = useState<{ me: LeaderboardEntry | null; rank: number | null }>({
    me: null,
    rank: null,
  });

  useEffect(() => {
    fetch(`/api/leaderboard?player=${encodeURIComponent(playerName)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setEloInfo({ me: data.me || null, rank: data.myRank || null });
        }
      })
      .catch(() => {});
  }, [playerName]);

  const winRate =
    progression.completedGames > 0
      ? Math.round((progression.wins / progression.completedGames) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
    >
      <div className="animate-sheet-up flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/30 bg-[#2A190F] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        <div className="flex justify-center bg-[#22140C] pt-2 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[#FFF7E8]/20" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-[#FFF7E8]/10 bg-[#22140C] px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <ProfileAvatar avatarId={playerAvatarId} pseudo={playerName} size="md" highlight />
            <div>
              <h2 id="stats-title" className="font-display text-base font-bold sm:text-lg">
                Statistiques & Succès
              </h2>
              <p className="text-xs text-[#D8C7AE]">
                {playerName} · {progression.unlockedAchievements.length}/{CULTURAL_ACHIEVEMENTS.length}{' '}
                titres
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#D8C7AE] hover:bg-[#FFF7E8]/10"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2 Onglets pour tenir sur 1 écran */}
        <div className="grid shrink-0 grid-cols-2 gap-1.5 border-b border-[#FFF7E8]/10 bg-[#1D110A] p-2">
          <button
            type="button"
            onClick={() => setTab('summary')}
            className={`min-h-[38px] rounded-xl text-xs font-bold ${
              tab === 'summary'
                ? 'bg-[#F2B441] text-[#241409]'
                : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
            }`}
          >
            Statistiques
          </button>
          <button
            type="button"
            onClick={() => setTab('badges')}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${
              tab === 'badges'
                ? 'bg-[#F2B441] text-[#241409]'
                : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Titres ({progression.unlockedAchievements.length}/{CULTURAL_ACHIEVEMENTS.length})</span>
          </button>
        </div>

        <div className="space-y-3 px-4 py-3.5 sm:px-6">
          {tab === 'summary' ? (
            <>
              <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3">
                  <div className="text-[11px] text-[#D8C7AE]">Parties</div>
                  <div className="font-mono-nums mt-0.5 text-xl font-extrabold text-[#FFF7E8]">
                    {progression.completedGames}
                  </div>
                  <div className="text-[11px] text-[#64EBB6]">
                    {progression.wins}V ({winRate}%)
                  </div>
                </div>

                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3">
                  <div className="text-[11px] text-[#D8C7AE]">Série victoires</div>
                  <div className="font-mono-nums mt-0.5 flex items-center gap-1.5 text-xl font-extrabold text-[#F2B441]">
                    <Flame className="h-4 w-4" />
                    {progression.currentWinStreak}
                  </div>
                  <div className="text-[11px] text-[#D8C7AE]">Record : {progression.bestWinStreak}</div>
                </div>

                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3">
                  <div className="text-[11px] text-[#D8C7AE]">Captures</div>
                  <div className="font-mono-nums mt-0.5 text-xl font-extrabold text-[#FFF7E8]">
                    {progression.totalCaptures}
                  </div>
                  <div className="text-[11px] text-[#D8C7AE]">
                    Relais : ×{progression.bestRelay}
                  </div>
                </div>

                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3">
                  <div className="text-[11px] text-[#D8C7AE]">Classement ELO</div>
                  <div className="font-mono-nums mt-0.5 text-xl font-extrabold text-[#F2B441]">
                    {eloInfo.me ? eloInfo.me.rating : 1200}
                  </div>
                  <div className="text-[11px] text-[#64EBB6]">
                    {eloInfo.rank ? `Rang #${eloInfo.rank}` : 'Non classé'}
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHistoryReplay();
                }}
                className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-[#2ED193]/40 bg-[#2ED193]/15 px-4 text-xs font-bold text-[#64EBB6] hover:bg-[#2ED193]/25 sm:text-sm"
              >
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique, Rejeu & Analyse
                </span>
                <span className="font-mono-nums text-xs">{savedMatchesCount} parties</span>
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {CULTURAL_ACHIEVEMENTS.map((ach) => {
                const unlocked = progression.unlockedAchievements.includes(ach.id);
                const isMaster = ach.id === 'master_of_tso';
                return (
                  <div
                    key={ach.id}
                    className={`flex items-start gap-2 rounded-xl border p-2.5 ${
                      unlocked
                        ? isMaster
                          ? 'border-[#F2B441] bg-[#462916]'
                          : 'border-[#2ED193]/45 bg-[#1C3227]/65'
                        : 'border-[#FFF7E8]/10 bg-[#1D110A] opacity-70'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        unlocked
                          ? isMaster
                            ? 'bg-[#F2B441] text-[#241409]'
                            : 'bg-[#2ED193]/25 text-[#64EBB6]'
                          : 'bg-[#2B190E] text-[#8E7C66]'
                      }`}
                    >
                      {unlocked ? (
                        isMaster ? (
                          <Star className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-[#FFF7E8]">{ach.title}</div>
                      <div className="truncate text-[10px] font-medium text-[#F2B441]">
                        {ach.subtitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#FFF7E8]/10 bg-[#22140C] px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-xl bg-[#F2B441] text-sm font-bold text-[#241409]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
