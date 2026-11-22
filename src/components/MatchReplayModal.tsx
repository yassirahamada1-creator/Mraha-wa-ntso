import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  History,
  Home,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react';
import { isNyumbaCoord } from '../game/mrahaEngine';
import { analyzeSavedMove, formatDuration, getDifficultyLabel } from '../game/mrahaHelpers';
import type { BoardThemeId, SavedMatchRecord } from '../types/app';
import { getBoardTheme } from '../utils/themes';
import { SeedCluster } from './SeedCluster';

interface MatchReplayModalProps {
  matches: SavedMatchRecord[];
  themeId: BoardThemeId;
  onClose: () => void;
}

export function MatchReplayModal({ matches, themeId, onClose }: MatchReplayModalProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    matches.length > 0 ? matches[0].id : null
  );
  const [moveIdx, setMoveIdx] = useState<number>(0);
  const [autoPlaying, setAutoPlaying] = useState(false);

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) || null,
    [matches, selectedMatchId]
  );

  const theme = getBoardTheme(themeId);

  useEffect(() => {
    setMoveIdx(0);
    setAutoPlaying(false);
  }, [selectedMatchId]);

  useEffect(() => {
    if (!autoPlaying || !selectedMatch) return;
    if (moveIdx >= selectedMatch.moves.length) {
      setAutoPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setMoveIdx((idx) => Math.min(selectedMatch.moves.length, idx + 1));
    }, 1050);
    return () => window.clearTimeout(timer);
  }, [autoPlaying, moveIdx, selectedMatch]);

  const activeMove =
    selectedMatch && moveIdx > 0 ? selectedMatch.moves[moveIdx - 1] : null;
  const currentState = selectedMatch
    ? moveIdx === 0 && selectedMatch.moves.length > 0
      ? selectedMatch.moves[0].stateBefore
      : activeMove
      ? activeMove.stateAfter
      : null
    : null;

  const analysis = useMemo(() => {
    if (!activeMove) return null;
    return analyzeSavedMove(activeMove);
  }, [activeMove]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="replay-title"
    >
      <div className="flex max-h-[93%] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/30 bg-[#2A190F] text-[#FFF7E8] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#FFF7E8]/10 bg-[#22140C] px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-[#F2B441]" />
            <div>
              <h2 id="replay-title" className="font-display text-lg font-bold sm:text-xl">
                Historique, Rejeu & Analyse
              </h2>
              <p className="text-xs text-[#D8C7AE]">
                Revoyez vos parties coup par coup avec l’avis du Maître
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#D8C7AE] hover:bg-[#FFF7E8]/10"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {matches.length === 0 ? (
            <div className="rounded-2xl border border-[#FFF7E8]/10 bg-[#1D110A] p-8 text-center text-sm text-[#D8C7AE]">
              Aucune partie complète enregistrée pour le moment. Terminez un match Solo ou Duo pour
              débloquer le rejeu et l’analyse des coups !
            </div>
          ) : (
            <>
              {/* Liste sélecteur des parties */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {matches.map((m) => {
                  const active = m.id === selectedMatchId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMatchId(m.id)}
                      className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs ${
                        active
                          ? 'border-[#F2B441] bg-[#462916] text-[#FFF7E8]'
                          : 'border-[#FFF7E8]/12 bg-[#1D110A] text-[#D8C7AE] hover:border-[#F2B441]/45'
                      }`}
                    >
                      <div className="font-bold">
                        {m.player0Name} vs {m.player1Name}
                      </div>
                      <div className="mt-0.5 text-[11px] opacity-85">
                        {m.mode === 'solo'
                          ? getDifficultyLabel(m.botId || m.difficulty || 'nour')
                          : m.mode === 'duo-online'
                          ? '1v1 En ligne'
                          : 'Duo'}{' '}
                        · {m.turnCount} coups · {formatDuration(m.durationSeconds)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedMatch && currentState && (
                <div className="space-y-3">
                  {/* Info match */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#FFF7E8]/12 bg-[#1D110A] px-3.5 py-2.5 text-xs">
                    <div>
                      <span className="font-bold text-[#F2B441]">
                        Vainqueur :{' '}
                        {selectedMatch.winner === 0
                          ? selectedMatch.player0Name
                          : selectedMatch.player1Name}
                      </span>{' '}
                      <span className="text-[#D8C7AE]">· {selectedMatch.winReason}</span>
                    </div>
                    <div className="font-mono-nums text-[#64EBB6]">
                      Coup {moveIdx} / {selectedMatch.moves.length}
                    </div>
                  </div>

                  {/* Mini plateau 4×8 de rejeu */}
                  <div className="rounded-2xl border-2 border-[#8B5632] bg-[#5C361E] p-2 shadow-inner">
                    <div className="space-y-1">
                      {[0, 1, 2, 3].map((r) => (
                        <div
                          key={r}
                          className={`grid grid-cols-8 gap-1 rounded-xl p-1 ${
                            r === 1 || r === 2 ? theme.innerRowClass : theme.outerRowClass
                          }`}
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
                            const count = currentState.board[r][c];
                            const rowOwner = r <= 1 ? 1 : 0;
                            const isNyumba = isNyumbaCoord(rowOwner, r, c);
                            const isPlayedFrom =
                              activeMove?.row === r && activeMove?.col === c;
                            return (
                              <div
                                key={`${r}-${c}`}
                                className={`relative flex aspect-square items-center justify-center ${
                                  isNyumba ? 'rounded-lg' : 'rounded-full'
                                } ${
                                  isPlayedFrom
                                    ? 'bg-[#633B12] ring-2 ring-[#FFD15C]'
                                    : r >= 2
                                    ? theme.pitBasePlayerClass
                                    : theme.pitBaseOppClass
                                }`}
                                style={!isPlayedFrom ? { background: theme.cupRadialBg } : undefined}
                              >
                                <SeedCluster
                                  count={count}
                                  largeSeeds={false}
                                  seedGradientClass={theme.seedGradientClass}
                                  compact
                                />
                                {isNyumba && (
                                  <Home className="pointer-events-none absolute left-0.5 top-0.5 h-2.5 w-2.5 text-[#F2B441]/80" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contrôles de lecture */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setAutoPlaying(false);
                        setMoveIdx(0);
                      }}
                      disabled={moveIdx === 0}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#FFF7E8]/15 bg-[#1D110A] disabled:opacity-40"
                      aria-label="Début"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setAutoPlaying(false);
                        setMoveIdx((i) => Math.max(0, i - 1));
                      }}
                      disabled={moveIdx === 0}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#FFF7E8]/15 bg-[#1D110A] disabled:opacity-40"
                      aria-label="Coup précédent"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setAutoPlaying((v) => !v)}
                      className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#F2B441] px-4 text-xs font-bold text-[#241409]"
                    >
                      {autoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {autoPlaying ? 'Pause' : 'Lecture'}
                    </button>
                    <button
                      onClick={() => {
                        setAutoPlaying(false);
                        setMoveIdx((i) => Math.min(selectedMatch.moves.length, i + 1));
                      }}
                      disabled={moveIdx >= selectedMatch.moves.length}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#FFF7E8]/15 bg-[#1D110A] disabled:opacity-40"
                      aria-label="Coup suivant"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setAutoPlaying(false);
                        setMoveIdx(selectedMatch.moves.length);
                      }}
                      disabled={moveIdx >= selectedMatch.moves.length}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#FFF7E8]/15 bg-[#1D110A] disabled:opacity-40"
                      aria-label="Fin"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Analyse du coup courant */}
                  {activeMove && analysis ? (
                    <div className="rounded-xl border border-[#F2B441]/30 bg-[#1D110A] p-3.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#FFF7E8]">
                          Coup #{activeMove.turnNumber} ·{' '}
                          {activeMove.player === 0
                            ? selectedMatch.player0Name
                            : selectedMatch.player1Name}{' '}
                          (col. {activeMove.col + 1})
                        </span>
                        <span
                          className={`rounded-lg px-2 py-0.5 font-bold ${
                            analysis.quality === 'optimal'
                              ? 'bg-[#2ED193]/20 text-[#64EBB6]'
                              : analysis.quality === 'improvable'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-[#F2B441]/20 text-[#FFD275]'
                          }`}
                        >
                          <Sparkles className="mr-1 inline h-3 w-3" />
                          {analysis.badge}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[#D8C7AE]">{analysis.comment}</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3.5 text-xs text-[#D8C7AE]">
                      Position de départ (10 tso sur le plateau + 22 en réserve). Appuyez sur
                      Lecture ou Suivant pour analyser chaque coup.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-[#FFF7E8]/10 bg-[#22140C] px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">
          <button
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
