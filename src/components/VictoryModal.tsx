import { useEffect, useState } from 'react';
import { Check, Home, RotateCcw, Share2, ShieldAlert, Trophy, X } from 'lucide-react';
import { UI_STRINGS } from '../i18n/translations';
import type { UiLanguage } from '../types/app';
import {
  buildSocialShareText,
  generateScoreCardDataUrl,
  getShareLinks,
  type ShareCardPayload,
} from '../utils/shareCard';

interface VictoryModalProps {
  language?: UiLanguage;
  payload: ShareCardPayload;
  showElo: boolean;
  unlockedNextBot?: { name: string; elo: number } | null;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  isOnline?: boolean;
  rematchPending?: boolean;
  opponentRematchReady?: boolean;
  isSimulation?: boolean;
  onCloseSimulation?: () => void;
}

export function VictoryModal({
  language = 'fr',
  payload,
  showElo,
  unlockedNextBot = null,
  onPlayAgain,
  onMainMenu,
  isOnline = false,
  rematchPending = false,
  opponentRematchReady = false,
  isSimulation = false,
  onCloseSimulation,
}: VictoryModalProps) {
  const strings = UI_STRINGS[language];
  const [cardDataUrl, setCardDataUrl] = useState<string>('');
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    setCardDataUrl(generateScoreCardDataUrl(payload));
  }, [payload]);

  const shareText = buildSocialShareText(payload);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const links = getShareLinks(shareText, shareUrl);
  const isWin = payload.isWinner;

  const winnerName = isWin ? payload.playerName : payload.opponentName;
  const loserName = isWin ? payload.opponentName : payload.playerName;

  const handleShare = async () => {
    const fullMessage = `${shareText}\n${shareUrl}`;
    if (navigator.share) {
      try {
        if (cardDataUrl) {
          const res = await fetch(cardDataUrl);
          const blob = await res.blob();
          const file = new File([blob], 'mraha-wa-tso.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Mraha wa Tso',
              text: shareText,
              url: shareUrl,
              files: [file],
            });
            return;
          }
        }
        await navigator.share({
          title: 'Mraha wa Tso',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback below
      }
    }

    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      window.open(links.whatsapp, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/82 p-0 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative flex max-h-[92%] w-full max-w-sm flex-col overflow-y-auto rounded-t-3xl border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-[#FFF7E8] shadow-2xl sm:rounded-3xl ${
          isWin
            ? 'border-[#F2B441]/45 bg-[#1B120C]'
            : 'border-red-500/35 bg-[#191112]'
        }`}
      >
        {isSimulation && onCloseSimulation && (
          <button
            type="button"
            onClick={onCloseSimulation}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl text-[#B8ABA0] hover:bg-[#FFF7E8]/10 hover:text-[#FFF7E8]"
            aria-label="Fermer l’aperçu"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Icône distincte Victoire vs Défaite */}
        {isWin ? (
          <div className="animate-num-bounce mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#F2B441]/30 to-[#2DD4BF]/20 ring-2 ring-[#F2B441]/60">
            <Trophy className="h-10 w-10 text-[#F2B441]" />
          </div>
        ) : (
          <div className="animate-num-bounce mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500/25 to-[#2A181B] ring-2 ring-red-400/50">
            <ShieldAlert className="h-10 w-10 text-red-400" />
          </div>
        )}

        <h2
          className={`font-display mt-4 text-3xl font-bold ${
            isWin ? 'text-[#FFF7E8]' : 'text-red-200'
          }`}
        >
          {isWin ? strings.victory.titleWin : strings.victory.titleLose}
        </h2>

        <p className={`mt-1 text-sm font-semibold ${isWin ? 'text-[#2DD4BF]' : 'text-red-300'}`}>
          {isWin ? `${winnerName} bat ${loserName}` : `${winnerName} bat ${loserName}`}
        </p>

        {/* Score compact */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl border border-[#FFF7E8]/10 bg-[#120C08] p-3.5">
          <div>
            <div className="text-[11px] text-[#B8ABA0]">{strings.hud.board}</div>
            <div
              className={`font-mono-nums text-2xl font-black ${
                isWin ? 'text-[#F2B441]' : 'text-red-300'
              }`}
            >
              {payload.playerSeeds} – {payload.opponentSeeds}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#B8ABA0]">{strings.hud.captures}</div>
            <div className="font-mono-nums text-2xl font-black text-[#2DD4BF]">
              {payload.captures}
            </div>
          </div>
        </div>

        {(showElo || isOnline) && payload.eloDelta !== undefined && (
          <div
            className={`font-mono-nums mt-2 text-xs font-bold ${
              payload.eloDelta >= 0 ? 'text-[#2DD4BF]' : 'text-red-300'
            }`}
          >
            ELO {payload.eloRating} ({payload.eloDelta >= 0 ? '+' : ''}
            {payload.eloDelta})
          </div>
        )}

        {unlockedNextBot && isWin && (
          <div className="mt-2.5 rounded-xl border border-[#2DD4BF]/45 bg-[#0F2D2E] px-3 py-2 text-xs font-extrabold text-[#2DD4BF]">
            Bot débloqué : {unlockedNextBot.name} ({unlockedNextBot.elo})
          </div>
        )}

        {/* Boutons Rejouer & Partager */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={isSimulation && onCloseSimulation ? onCloseSimulation : onPlayAgain}
            disabled={isOnline && rematchPending}
            className={`flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-extrabold transition-transform active:scale-[0.98] disabled:opacity-65 ${
              isWin ? 'bg-[#F2B441] text-[#1C1007]' : 'bg-[#2DD4BF] text-[#0A2623]'
            }`}
          >
            <RotateCcw className="h-5 w-5" />
            <span>
              {isSimulation
                ? 'Fermer l’aperçu'
                : isOnline && rematchPending
                ? 'En attente…'
                : isOnline && opponentRematchReady
                ? `${strings.victory.replay} (prêt)`
                : strings.victory.replay}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleShare}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#2DD4BF]/45 bg-[#0F2D2E] px-4 text-sm font-bold text-[#2DD4BF] transition-transform active:scale-[0.98]"
            >
              {copiedShare ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span>{copiedShare ? 'Copié !' : strings.victory.share}</span>
            </button>
            <button
              type="button"
              onClick={isSimulation && onCloseSimulation ? onCloseSimulation : onMainMenu}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#FFF7E8]/15 bg-[#120C08] px-4 text-sm font-bold text-[#EBDCC3] transition-transform active:scale-[0.98]"
            >
              <Home className="h-4 w-4" />
              <span>{strings.victory.home}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
