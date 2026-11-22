import { useState } from 'react';
import { Check, Lock, Play, Trophy, X } from 'lucide-react';
import {
  BOT_ROSTER,
  BOT_TIER_LABELS,
  getBotById,
  isBotUnlocked,
  type BotTier,
} from '../game/mrahaAi';
import { ProfileAvatar } from '../utils/avatars';

interface BotSelectorModalProps {
  selectedBotId: string;
  defeatedBotIds: string[];
  onSelectBot: (botId: string) => void;
  onStartWithBot: (botId: string) => void;
  onClose: () => void;
}

const TIERS: BotTier[] = ['debutant', 'intermediaire', 'avance', 'maitre'];

export function BotSelectorModal({
  selectedBotId,
  defeatedBotIds,
  onSelectBot,
  onStartWithBot,
  onClose,
}: BotSelectorModalProps) {
  const activeBot = getBotById(selectedBotId);
  const [activeTier, setActiveTier] = useState<BotTier>(activeBot.tier);
  const unlockedCount = BOT_ROSTER.filter((b) => isBotUnlocked(b.id, defeatedBotIds)).length;
  const tierBots = BOT_ROSTER.filter((b) => b.tier === activeTier);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bot-selector-title"
    >
      <div className="animate-sheet-up flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/35 bg-[#1F140D] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        <div className="flex justify-center bg-[#170E09] pt-2 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[#FFF7E8]/20" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-[#FFF7E8]/10 bg-[#170E09] px-4 py-3 sm:px-5">
          <h2 id="bot-selector-title" className="font-display text-base font-bold sm:text-lg">
            Bots ({unlockedCount}/{BOT_ROSTER.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#D8C7AE] hover:bg-[#FFF7E8]/10"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4 Niveaux */}
        <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-[#FFF7E8]/10 bg-[#140C07] p-1.5">
          {TIERS.map((tier) => {
            const isSelectedTier = activeTier === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setActiveTier(tier)}
                className={`min-h-[36px] rounded-xl px-1 text-[11px] font-bold transition-colors sm:text-xs ${
                  isSelectedTier
                    ? 'bg-[#F2B441] text-[#1C1007]'
                    : 'text-[#D8C7AE] hover:bg-[#FFF7E8]/8 hover:text-[#FFF7E8]'
                }`}
              >
                {BOT_TIER_LABELS[tier]}
              </button>
            );
          })}
        </div>

        {/* 3 Bots du niveau actif — tient sans scroll */}
        <div className="grid grid-cols-3 gap-2.5 px-4 py-4 sm:px-5">
          {tierBots.map((bot) => {
            const unlocked = isBotUnlocked(bot.id, defeatedBotIds);
            const defeated = defeatedBotIds.includes(bot.id);
            const selected = activeBot.id === bot.id;

            return (
              <button
                key={bot.id}
                type="button"
                disabled={!unlocked}
                onClick={() => onSelectBot(bot.id)}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all ${
                  !unlocked
                    ? 'cursor-not-allowed border-[#FFF7E8]/8 bg-[#140C07]/70 opacity-60'
                    : selected
                    ? 'border-[#F2B441] bg-[#362011] shadow-lg'
                    : 'border-[#FFF7E8]/12 bg-[#140C07] hover:border-[#F2B441]/50 active:scale-[0.98]'
                }`}
              >
                <div className="absolute right-2 top-2">
                  {!unlocked ? (
                    <Lock className="h-3.5 w-3.5 text-[#9B8B7A]" />
                  ) : defeated ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2DD4BF] text-[#0A2623]">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  ) : null}
                </div>

                <ProfileAvatar pseudo={bot.name} size="md" highlight={selected} />

                <div className="min-w-0 w-full">
                  <div className="truncate text-sm font-extrabold text-[#FFF7E8]">{bot.name}</div>
                  <div className="truncate text-[10px] text-[#B8ABA0]">{bot.tagline}</div>
                  <div className="font-mono-nums mt-0.5 inline-flex items-center gap-1 text-xs font-black text-[#F2B441]">
                    <Trophy className="h-3 w-3" />
                    <span>{bot.elo}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-[#FFF7E8]/10 bg-[#170E09] px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-5">
          <button
            type="button"
            onClick={() => onStartWithBot(activeBot.id)}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#F2B441] px-5 text-sm font-extrabold text-[#1C1007] shadow-lg transition-transform active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>
              Jouer · {activeBot.name} ({activeBot.elo})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
