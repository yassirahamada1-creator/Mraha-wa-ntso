import { memo } from 'react';
import type { BoardThemeConfig } from '../utils/themes';

interface SeedClusterProps {
  count: number;
  largeSeeds: boolean;
  seedGradientClass: string;
  compact?: boolean;
  pitSize?: number;
  previewCount?: number | null;
}

// Maximum 5 decorative tso seeds arranged around the periphery behind the centered numeral
const DECOR_POSITIONS: Record<number, Array<{ x: number; y: number; r: number }>> = {
  1: [{ x: -24, y: -22, r: -14 }],
  2: [
    { x: -25, y: -20, r: -18 },
    { x: 25, y: 20, r: 16 },
  ],
  3: [
    { x: 0, y: -27, r: 8 },
    { x: -26, y: 18, r: -14 },
    { x: 26, y: 18, r: 16 },
  ],
  4: [
    { x: -25, y: -22, r: -12 },
    { x: 25, y: -22, r: 14 },
    { x: -25, y: 22, r: 16 },
    { x: 25, y: 22, r: -14 },
  ],
  5: [
    { x: -26, y: -22, r: -10 },
    { x: 26, y: -22, r: 12 },
    { x: -26, y: 22, r: 15 },
    { x: 26, y: 22, r: -12 },
    { x: 0, y: -29, r: 5 },
  ],
};

export const SeedCluster = memo(function SeedCluster({
  count,
  largeSeeds,
  compact = false,
  pitSize,
  previewCount = null,
}: SeedClusterProps) {
  const showPreview = previewCount !== null && previewCount !== count;

  if (count <= 0 && !showPreview) return null;

  const decorCount = Math.min(5, Math.max(0, count));
  const decorItems = decorCount > 0 ? DECOR_POSITIONS[decorCount] || DECOR_POSITIONS[5] : [];

  const seedDim = pitSize
    ? Math.max(7, Math.round(pitSize * (compact ? 0.16 : 0.19)))
    : compact
    ? 8
    : 10;

  const fontPx = pitSize
    ? Math.max(compact ? 16 : 20, Math.round(pitSize * (largeSeeds ? 0.54 : 0.48)))
    : compact
    ? 16
    : 20;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
      {/* Décor discret : max 5 graines derrière le chiffre */}
      {decorItems.length > 0 && (
        <div className="pointer-events-none absolute inset-[12%] opacity-60">
          {decorItems.map((pos, idx) => (
            <span
              key={idx}
              style={{
                width: `${Math.round(seedDim * 1.18)}px`,
                height: `${seedDim}px`,
                left: `calc(50% + ${pos.x}%)`,
                top: `calc(50% + ${pos.y}%)`,
                transform: `translate(-50%, -50%) rotate(${pos.r}deg)`,
                background:
                  'radial-gradient(circle at 32% 28%, #FAF7E8 0%, #CBD4AE 44%, #808D66 78%, #4F593D 100%)',
              }}
              className="absolute rounded-[54%_46%_49%_51%/50%_52%_48%_50%] shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
            />
          ))}
        </div>
      )}

      {/* Chiffre central exact (ou aperçu net du nouveau total sans flèche superflue) */}
      {showPreview ? (
        <span
          key={`prev-${count}-${previewCount}`}
          style={{
            fontSize: `${fontPx}px`,
            WebkitTextStroke: '0.6px rgba(94, 234, 212, 0.35)',
          }}
          className="animate-num-bounce font-mono-nums pit-number-stroke relative z-10 font-black leading-none tracking-tight text-[#5EEAD4]"
        >
          {previewCount}
        </span>
      ) : (
        <span
          key={`cnt-${count}`}
          style={{
            fontSize: `${fontPx}px`,
            WebkitTextStroke: '0.6px rgba(255, 247, 232, 0.35)',
          }}
          className={`animate-num-bounce font-mono-nums pit-number-stroke relative z-10 font-black leading-none tracking-tight ${
            largeSeeds ? 'text-[#FFFFFF]' : 'text-[#FFFDF7]'
          }`}
        >
          {count}
        </span>
      )}
    </div>
  );
});

interface ReserveBowlProps {
  count: number;
  theme: BoardThemeConfig;
  active?: boolean;
  largeText?: boolean;
  label: string;
  compact?: boolean;
}

export const ReserveBowl = memo(function ReserveBowl({
  count,
  theme,
  active = false,
  largeText = false,
  label,
  compact = false,
}: ReserveBowlProps) {
  const visibleDots = Math.min(count, 5);

  return (
    <div
      className={`flex items-center gap-1.5 rounded-xl border transition-all ${
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1'
      } ${
        active
          ? 'scale-105 border-[#2DD4BF] bg-[#0F3D39]/90 ring-1 ring-[#2DD4BF]/60'
          : largeText
          ? 'border-[#FFFFFF]/70 bg-[#120A05]'
          : 'border-[#FFF7E8]/14 bg-[#19100A]/90'
      }`}
      aria-label={`${label} : ${count}`}
    >
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-full border border-[#D99B38]/45 bg-[#2A180D] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] ${
          compact ? 'h-5 w-5' : 'h-6 w-6'
        }`}
      >
        {Array.from({ length: visibleDots }).map((_, i) => {
          const angle = (i / Math.max(1, visibleDots)) * Math.PI * 2;
          const rad = i === 0 && visibleDots > 3 ? 0 : 4.2;
          const dx = Math.cos(angle) * rad;
          const dy = Math.sin(angle) * rad;
          return (
            <span
              key={i}
              style={{ transform: `translate(${dx}px, ${dy}px)` }}
              className={`absolute h-1.5 w-1.5 rounded-full bg-gradient-to-br ${theme.seedGradientClass}`}
            />
          );
        })}
      </div>
      <div className="flex items-baseline gap-1 leading-none">
        <span className="text-[10px] font-medium text-[#D8C7AE] sm:text-xs">{label}</span>
        <span
          className={`font-mono-nums font-extrabold ${
            largeText ? 'text-base text-[#7CFFCA]' : 'text-sm text-[#2DD4BF] sm:text-base'
          }`}
        >
          {count}
        </span>
      </div>
    </div>
  );
});
