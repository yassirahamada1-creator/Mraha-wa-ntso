import { memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import { SeedCluster } from './SeedCluster';

export interface BoardPitProps {
  row: number;
  col: number;
  pitSize: number;
  count: number;
  previewNextCount: number | null;
  largeSeeds: boolean;
  seedGradientClass: string;
  cupRadialBg: string;
  pitBaseClass: string;
  rotateOpposite: boolean;
  isPlayable: boolean;
  isCapturePit: boolean;
  isFocused: boolean;
  isHintPit: boolean;
  isTelegraphed: boolean;
  isStepTarget: boolean;
  isCaptureVictim: boolean;
  isCaptureEmitter: boolean;
  isLastOppPit: boolean;
  isPreviewLanding: boolean;
  isPreviewCaptureTarget: boolean;
  isTargetOpt: boolean;
  isTargetOptCapture?: boolean;
  targetOptChevron?: 'left' | 'right' | null;
  isCancelledDrag: boolean;
  shouldDim: boolean;
  isNyumba: boolean;
  isNyumbaIntact: boolean;
  isNyumbaConcealed: boolean;
  opponentTrailKey: string;
  onPitPointerDown: (e: React.PointerEvent<HTMLButtonElement>, row: number, col: number) => void;
  onPitPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPitPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPitPointerCancel: () => void;
}

export const BoardPit = memo(function BoardPit({
  row,
  col,
  pitSize,
  count,
  previewNextCount,
  largeSeeds,
  seedGradientClass,
  cupRadialBg,
  pitBaseClass,
  rotateOpposite,
  isPlayable,
  isCapturePit,
  isFocused,
  isHintPit,
  isTelegraphed,
  isStepTarget,
  isCaptureVictim,
  isCaptureEmitter,
  isLastOppPit,
  isPreviewLanding,
  isPreviewCaptureTarget,
  isTargetOpt,
  isTargetOptCapture = false,
  targetOptChevron = null,
  isCancelledDrag,
  shouldDim,
  isNyumba,
  isNyumbaIntact,
  isNyumbaConcealed,
  opponentTrailKey,
  onPitPointerDown,
  onPitPointerMove,
  onPitPointerUp,
  onPitPointerCancel,
}: BoardPitProps) {
  const buttonStyle = useMemo(
    () => ({
      width: `${pitSize}px`,
      height: `${pitSize}px`,
      touchAction: 'none' as const,
      background:
        isCaptureVictim || isPreviewCaptureTarget
          ? '#5E330E'
          : isPreviewLanding
          ? '#0C3834'
          : isFocused && !isCancelledDrag
          ? '#5A3E1E'
          : isStepTarget
          ? '#523315'
          : cupRadialBg,
    }),
    [
      pitSize,
      isCaptureVictim,
      isPreviewCaptureTarget,
      isPreviewLanding,
      isFocused,
      isCancelledDrag,
      isStepTarget,
      cupRadialBg,
    ]
  );

  const stateClass =
    isFocused && !isCancelledDrag
      ? 'scale-[1.08] ring-[3px] ring-[#FFFFFF] shadow-[0_0_16px_rgba(255,247,232,0.45)]'
      : isPreviewLanding
      ? 'scale-[1.06] ring-[3px] ring-[#2DD4BF] shadow-[0_0_14px_rgba(45,212,191,0.4)]'
      : isTargetOpt
      ? isTargetOptCapture
        ? 'cursor-pointer ring-[3px] ring-[#F2B441] scale-[1.05]'
        : 'cursor-pointer ring-[3px] ring-[#2DD4BF] scale-[1.05]'
      : isHintPit
      ? 'animate-pit-active scale-[1.05] ring-[3px] ring-[#F2B441]'
      : isTelegraphed
      ? 'scale-105 ring-2 ring-[#FFF7E8]/75'
      : isStepTarget
      ? 'scale-105 ring-[3px] ring-[#F2B441]'
      : isCaptureVictim || isPreviewCaptureTarget
      ? 'scale-95 ring-[3px] ring-[#F2B441]'
      : isPlayable
      ? isCapturePit
        ? 'animate-pit-active cursor-pointer ring-[2.5px] ring-[#F2B441]'
        : 'cursor-pointer ring-[1.5px] ring-[#2DD4BF]/50'
      : pitBaseClass;

  return (
    <button
      type="button"
      onPointerDown={(e) => onPitPointerDown(e, row, col)}
      onPointerMove={onPitPointerMove}
      onPointerUp={onPitPointerUp}
      onPointerCancel={onPitPointerCancel}
      style={buttonStyle}
      aria-label={`${isNyumba ? 'Nyumba, ' : ''}${isNyumbaConcealed ? '?' : `${count} tso`}`}
      className={`relative flex items-center justify-center rounded-full transition-transform duration-75 will-change-transform ${stateClass} ${
        shouldDim ? 'opacity-45' : 'opacity-100'
      } shadow-[inset_0_5px_12px_rgba(0,0,0,0.64),inset_0_-2px_4px_rgba(255,215,155,0.14)]`}
    >
      {/* Trace lumineuse dernier coup adverse */}
      {isLastOppPit && (
        <span
          key={`opp-${opponentTrailKey}-${row}-${col}`}
          className="animate-opponent-trail pointer-events-none absolute inset-0 z-20 rounded-full ring-2 ring-[#FFF7E8]/60"
          aria-hidden="true"
        />
      )}

      {/* Éclat de capture */}
      {(isCaptureVictim || isCaptureEmitter) && (
        <span
          className="animate-capture-burst pointer-events-none absolute inset-0 z-30 rounded-full border-4 border-[#F2B441]"
          aria-hidden="true"
        />
      )}

      {/* Contenu de la case orienté vers le joueur concerné en 1vs1 local */}
      <div
        className={`pointer-events-none relative flex h-full w-full items-center justify-center ${
          rotateOpposite ? 'rotate-180' : ''
        }`}
      >
        {/* Motif gravé Nyumba (aucune légende texte) */}
        {isNyumba && (
          <svg
            viewBox="0 0 40 40"
            className="pointer-events-none absolute inset-[3px] z-0 h-[calc(100%-6px)] w-[calc(100%-6px)]"
            aria-hidden="true"
          >
            <polygon
              points="20,3 35,14 30,35 10,35 5,14"
              fill="none"
              stroke={isNyumbaIntact ? '#F2B441' : 'rgba(255,247,232,0.28)'}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Couvercle caché OU SeedCluster (max 5 décor + chiffre >= 20px) */}
        {isNyumbaConcealed ? (
          <div className="pointer-events-none flex h-[62%] w-[62%] items-center justify-center rounded-full bg-[#3A2111]/90 ring-1 ring-[#F2B441]/60">
            <EyeOff className="h-4 w-4 text-[#F2B441]" />
          </div>
        ) : (
          <SeedCluster
            count={count}
            largeSeeds={largeSeeds}
            seedGradientClass={seedGradientClass}
            pitSize={pitSize}
            previewCount={previewNextCount}
          />
        )}

        {/* Indicateur discret de direction (< ou >) sur les cibles de choix de sens */}
        {isTargetOpt && targetOptChevron && (
          <span
            className={`pointer-events-none absolute z-20 flex items-center justify-center rounded-full ${
              isTargetOptCapture ? 'text-[#F2B441]' : 'text-[#2DD4BF]'
            } ${
              count === 0
                ? 'inset-0'
                : 'bottom-0.5 right-0.5 h-4 w-4 bg-[#1B120C]/90'
            }`}
            aria-hidden="true"
          >
            {targetOptChevron === 'right' ? (
              <ChevronRight className={count === 0 ? 'h-5 w-5 stroke-[2.6]' : 'h-3 w-3 stroke-[2.8]'} />
            ) : (
              <ChevronLeft className={count === 0 ? 'h-5 w-5 stroke-[2.6]' : 'h-3 w-3 stroke-[2.8]'} />
            )}
          </span>
        )}
      </div>
    </button>
  );
});
