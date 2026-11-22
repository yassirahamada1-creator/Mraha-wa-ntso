import {
  Award,
  BookOpen,
  Camera,
  ChevronRight,
  Cpu,
  Globe,
  Play,
  Sliders,
  Trash2,
  Trophy,
  User,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BOT_ROSTER, getBotById, isBotUnlocked } from '../game/mrahaAi';
import { UI_STRINGS } from '../i18n/translations';
import type { AuthAccount, AutosavedMatch, ProgressionState } from '../types/app';
import { ProfileAvatar } from '../utils/avatars';

interface TitleScreenProps {
  selectedBotId: string;
  progression: ProgressionState;
  autosavedMatch: AutosavedMatch | null;
  currentAccount: AuthAccount | null;
  playerPseudo: string;
  playerAvatarId?: string;
  playerElo: number;
  onOpenAccount: () => void;
  onOpenPhotoModal: () => void;
  onOpenBotSelector: () => void;
  onStartOnlineMatchmaking: () => void;
  onResumeAutosave: () => void;
  onDiscardAutosave: () => void;
  onStartSolo: () => void;
  onStartDuoLocal: () => void;
  onOpenLeaderboard: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenSettings: (tab?: 'params' | 'themes' | 'rules') => void;
  muted: boolean;
  onToggleMute: () => void;
}

export function TitleScreen({
  selectedBotId,
  progression,
  autosavedMatch,
  currentAccount,
  playerPseudo,
  playerAvatarId,
  playerElo,
  onOpenAccount,
  onOpenPhotoModal,
  onOpenBotSelector,
  onStartOnlineMatchmaking,
  onResumeAutosave,
  onDiscardAutosave,
  onStartSolo,
  onStartDuoLocal,
  onOpenLeaderboard,
  onOpenRules,
  onOpenStats,
  onOpenSettings,
  muted,
  onToggleMute,
}: TitleScreenProps) {
  const strings = UI_STRINGS.fr;
  const activeAvatar = currentAccount?.avatarId || playerAvatarId;
  const displayPseudo = currentAccount?.pseudo || playerPseudo;
  const activeBot = getBotById(selectedBotId);
  const unlockedBotsCount = BOT_ROSTER.filter((b) =>
    isBotUnlocked(b.id, progression.defeatedBotIds)
  ).length;

  return (
    <div className="safe-area-shell relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#120C08] text-[#FFF7E8]">
      {/* Plateau Bao en fond d'accueil */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src="/src/assets/images/mraha_title_backdrop_1795019536542.jpg"
          alt="Tablier de Mraha wa Tso"
          className="h-full w-full object-cover object-center opacity-50 sm:opacity-65"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120C08]/80 via-[#120C08]/65 to-[#120C08]/95" />
      </div>

      {/* Barre du haut */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-4 py-2.5 sm:px-8">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenPhotoModal}
            className="relative flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-2xl border border-[#F2B441]/45 bg-[#1B120C]/92 p-1 transition-transform active:scale-95 hover:border-[#F2B441]"
            aria-label="Photo de profil"
            title="Photo de profil"
          >
            <ProfileAvatar
              avatarId={activeAvatar}
              pseudo={displayPseudo}
              size="sm"
              highlight
            />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#1B120C] bg-[#F2B441] text-[#1C1007]">
              <Camera className="h-2.5 w-2.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenAccount}
            className={`flex min-h-[44px] min-w-0 items-center gap-2 rounded-2xl border px-3 text-xs font-bold transition-colors ${
              currentAccount
                ? 'border-[#2DD4BF]/50 bg-[#0F2D2E]/90 text-[#FFF7E8]'
                : 'border-[#F2B441]/45 bg-[#1B120C]/92 text-[#F2B441] hover:border-[#F2B441]'
            }`}
          >
            {currentAccount ? (
              <UserCheck className="h-4 w-4 shrink-0 text-[#2DD4BF]" />
            ) : (
              <User className="h-4 w-4 shrink-0 text-[#F2B441]" />
            )}
            <span className="max-w-[110px] truncate sm:max-w-[150px]">
              {currentAccount
                ? currentAccount.pseudo
                : playerPseudo !== 'Joueur'
                ? playerPseudo
                : 'Compte'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSettings('params')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#FFF7E8]/12 bg-[#1B120C]/92 text-[#FFF7E8] hover:border-[#F2B441]/55"
            aria-label={strings.menu.settings}
          >
            <Sliders className="h-5 w-5 text-[#F2B441]" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#FFF7E8]/12 bg-[#1B120C]/92 text-[#FFF7E8] hover:border-[#F2B441]/55"
            aria-label={muted ? 'Son activé' : 'Son coupé'}
          >
            {muted ? (
              <VolumeX className="h-5 w-5 text-[#D8C7AE]" />
            ) : (
              <Volume2 className="h-5 w-5 text-[#2DD4BF]" />
            )}
          </button>
        </div>
      </header>

      {/* Centre : Tient 100% sur un écran sans scroll */}
      <main className="relative z-10 mx-auto grid min-h-0 w-full max-w-md flex-1 grid-cols-1 content-center items-center gap-3 px-4 py-1 md:max-w-4xl md:grid-cols-[0.88fr_1.12fr] md:gap-5 md:px-5">
        <div className="space-y-2">
          <div className="text-center md:text-left">
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#FFF7E8] sm:text-5xl">
              {strings.appTitle}
            </h1>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#F2B441]">
              <Trophy className="h-3.5 w-3.5" />
              <span className="font-mono-nums">{playerElo} ELO</span>
            </div>
          </div>

          {/* Emplacement à hauteur fixe pour Reprendre */}
          <div className="flex h-[50px] items-center">
            {autosavedMatch ? (
              <div className="flex w-full items-center gap-2 rounded-2xl border border-[#2DD4BF]/50 bg-[#0D2E2B]/90 p-1">
                <button
                  type="button"
                  onClick={onResumeAutosave}
                  className="flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-[#FFF7E8]"
                >
                  <Play className="h-4 w-4 fill-[#2DD4BF] text-[#2DD4BF]" />
                  <span>{strings.resumeMatch}</span>
                  <span className="font-mono-nums text-xs text-[#2DD4BF]">
                    #{autosavedMatch.gameState.turnCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onDiscardAutosave}
                  className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#D8C7AE] hover:text-amber-300"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="h-full w-full" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Modes de jeu (style Chess.com mobile) */}
        <div className="space-y-2.5">
          {/* 1. 1v1 en ligne */}
          <button
            type="button"
            onClick={onStartOnlineMatchmaking}
            className="flex min-h-[54px] w-full items-center justify-between gap-3 rounded-3xl border border-[#2DD4BF]/55 bg-[#0F2D2E]/95 px-4 text-left text-[#FFF7E8] shadow-2xl transition-transform active:scale-[0.98] hover:border-[#2DD4BF]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#134643] text-[#2DD4BF]">
                <Globe className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-extrabold sm:text-lg">
                  1v1 en ligne
                </span>
                <span className="font-mono-nums block truncate text-[11px] font-semibold text-[#2DD4BF]">
                  {playerElo} ELO
                </span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#2DD4BF]" />
          </button>

          {/* 2. Jouer hors ligne contre un bot ELO progressif */}
          <div className="rounded-3xl border border-[#F2B441]/45 bg-[#1D120C]/92 p-2 shadow-2xl">
            <button
              type="button"
              onClick={onStartSolo}
              className="flex min-h-[50px] w-full items-center justify-between gap-3 rounded-2xl bg-[#F2B441] px-4 text-left text-[#1C1007] transition-transform active:scale-[0.98] hover:bg-[#FFD06B]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Cpu className="h-5 w-5 shrink-0" />
                <span className="truncate text-base font-extrabold sm:text-lg">
                  Jouer vs Bot ({activeBot.name} · {activeBot.elo})
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={onOpenBotSelector}
              className="mt-1.5 flex min-h-[40px] w-full items-center justify-between gap-2 rounded-2xl bg-[#120B07] px-3 py-1 text-left transition-colors hover:bg-[#190F0A]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ProfileAvatar pseudo={activeBot.name} size="xs" highlight />
                <span className="font-mono-nums truncate text-xs font-bold text-[#EBDCC3]">
                  Bots · {unlockedBotsCount}/{BOT_ROSTER.length}
                </span>
              </span>
              <span className="shrink-0 text-xs font-extrabold text-[#F2B441]">
                Changer
              </span>
            </button>
          </div>

          {/* 3. Jouer à deux sur place (hors ligne) */}
          <button
            type="button"
            onClick={onStartDuoLocal}
            className="flex min-h-[50px] w-full items-center justify-between gap-3 rounded-3xl border border-[#FFF7E8]/15 bg-[#1B120C]/92 px-4 text-left text-[#FFF7E8] shadow-xl transition-transform active:scale-[0.98] hover:border-[#F2B441]/45"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2A1B12] text-[#F2B441]">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-base font-extrabold whitespace-nowrap sm:text-lg">
                {strings.playDuo}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#F2B441]" />
          </button>
        </div>
      </main>

      {/* Pied discret */}
      <footer className="relative z-10 flex shrink-0 items-center justify-center gap-2.5 px-4 pb-3 pt-1">
        <button
          type="button"
          onClick={onOpenRules}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-[#FFF7E8]/12 bg-[#1B120C]/92 px-4 text-xs font-bold text-[#F2B441] hover:border-[#F2B441]/55"
          aria-label={strings.menu.rules}
        >
          <BookOpen className="h-4 w-4" />
          <span>{strings.menu.rules}</span>
        </button>
        <button
          type="button"
          onClick={onOpenStats}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#FFF7E8]/12 bg-[#1B120C]/92 text-[#FFF7E8] hover:border-[#F2B441]/55"
          aria-label="Stats"
        >
          <Award className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#FFF7E8]/12 bg-[#1B120C]/92 text-[#F2B441] hover:border-[#F2B441]/55"
          aria-label="Classement ELO"
        >
          <Trophy className="h-5 w-5" />
        </button>
      </footer>
    </div>
  );
}
