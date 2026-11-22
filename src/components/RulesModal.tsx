import { useState } from 'react';
import {
  X,
  BookOpen,
  ArrowRightLeft,
  Sparkles,
  Home,
  RotateCcw,
  Swords,
  AlertTriangle,
  Hand,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Pause,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

type RulesTab = 'controls' | 'phase1' | 'phase2';

export function RulesModal({ onClose }: RulesModalProps) {
  const [tab, setTab] = useState<RulesTab>('controls');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
    >
      <div className="animate-sheet-up relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/30 bg-[#2A190F] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        <div className="flex justify-center bg-[#22140C] pt-2 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[#FFF7E8]/20" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#FFF7E8]/10 bg-[#22140C] px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#F2B441]" />
            <h2 id="rules-title" className="font-display text-base font-bold sm:text-lg">
              Règles & Jouabilité
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#D8C7AE] hover:bg-[#FFF7E8]/10 hover:text-[#FFF7E8]"
            aria-label="Fermer les règles"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3 Onglets pour tout voir sans scroll */}
        <div className="grid shrink-0 grid-cols-3 gap-1.5 border-b border-[#FFF7E8]/10 bg-[#1D110A] p-2">
          <button
            type="button"
            onClick={() => setTab('controls')}
            className={`min-h-[40px] rounded-xl px-2 text-xs font-bold ${
              tab === 'controls'
                ? 'bg-[#F2B441] text-[#241409]'
                : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
            }`}
          >
            Commandes & Flèches
          </button>
          <button
            type="button"
            onClick={() => setTab('phase1')}
            className={`min-h-[40px] rounded-xl px-2 text-xs font-bold ${
              tab === 'phase1'
                ? 'bg-[#F2B441] text-[#241409]'
                : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
            }`}
          >
            Départ & Phase 1
          </button>
          <button
            type="button"
            onClick={() => setTab('phase2')}
            className={`min-h-[40px] rounded-xl px-2 text-xs font-bold ${
              tab === 'phase2'
                ? 'bg-[#F2B441] text-[#241409]'
                : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
            }`}
          >
            Phase 2 & Kamuv
          </button>
        </div>

        {/* Contenu compact par onglet (tient sur un seul écran) */}
        <div className="px-4 py-3.5 text-xs leading-relaxed text-[#EBDCC3] sm:px-6 sm:text-sm">
          {tab === 'controls' && (
            <div className="space-y-3">
              <section className="rounded-2xl border border-[#F2B441]/25 bg-[#1D110A] p-3">
                <h3 className="font-display text-xs font-bold text-[#F2B441] sm:text-sm">
                  Couleurs du tablier
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-[#FFD15C] bg-[#3A1D0B]">
                      <Home className="h-3.5 w-3.5 text-[#FFD15C]" />
                    </span>
                    <span><strong>Nyumba</strong> · 6 graines</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5E330E] ring-2 ring-[#F2B441]">
                      <Swords className="h-3.5 w-3.5 text-[#F2B441]" />
                    </span>
                    <span><strong>Or</strong> · Capture</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 shrink-0 rounded-full bg-[#0C3834] ring-2 ring-[#2DD4BF]" />
                    <span><strong>Turquoise</strong> · Arrivée</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5A3E1E] ring-2 ring-[#FFFFFF]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FFFFFF]" />
                    </span>
                    <span><strong>Blanc</strong> · Sélection</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2 rounded-2xl border border-[#2DD4BF]/25 bg-[#122021] p-3">
                <div className="flex items-center gap-2 text-[#2DD4BF]">
                  <Hand className="h-4 w-4" />
                  <h3 className="font-display text-sm font-semibold">
                    Flèches (&lt; et &gt;) & Gestes
                  </h3>
                </div>

                <ul className="list-disc space-y-1.5 pl-4 text-xs">
                  <li>
                    <strong>Appui simple :</strong> sélectionne la case (contour blanc). Si un seul sens est possible, le coup part aussitôt.
                  </li>
                  <li>
                    <strong>Flèches &lt; et &gt; :</strong> quand les 2 sens sont ouverts, choisissez gauche ou droite sur le plateau ou en bas.
                  </li>
                  <li>
                    <strong>Appui long / glisser :</strong> affiche en direct la <strong>case d’arrivée</strong> (ex. <em>2 → 3</em>) avant de relâcher.
                  </li>
                </ul>

                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-[#D8C7AE]">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#2DD4BF] px-2 py-0.5 font-bold text-[#0A2623]">
                    <ChevronLeft className="h-3 w-3" /> Gauche
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#2DD4BF] px-2 py-0.5 font-bold text-[#0A2623]">
                    Droite <ChevronRight className="h-3 w-3" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#1F140D] px-2 py-0.5">
                    <Lightbulb className="h-3 w-3 text-[#F2B441]" /> Indice
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#1F140D] px-2 py-0.5">
                    <Pause className="h-3 w-3 text-[#F2B441]" /> Pause
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#1F140D] px-2 py-0.5">
                    <EyeOff className="h-3 w-3 text-[#F2B441]" /> Cacher
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#1F140D] px-2 py-0.5">
                    <AlertTriangle className="h-3 w-3 text-amber-300" /> Menace
                  </span>
                </div>
              </section>
            </div>
          )}

          {tab === 'phase1' && (
            <div className="space-y-3">
              <section className="rounded-2xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3.5">
                <div className="flex items-center gap-2 text-[#F2B441]">
                  <Home className="h-4 w-4" />
                  <h3 className="font-display text-sm font-semibold">
                    01. Matériel & Départ (64 tso)
                  </h3>
                </div>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs sm:text-sm">
                  <li><strong>Tablier :</strong> 4 rangées × 8 cases (16 cases par joueur).</li>
                  <li><strong>Placement :</strong> 6 graines dans la <em>Nyumba</em> (carrée), 2 dans les 2 cases à sa droite et <strong>22 en réserve</strong>.</li>
                  <li>Au <strong>1er coup</strong>, on ne commence jamais par sa <em>Nyumba</em>.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3.5">
                <div className="flex items-center gap-2 text-[#F2B441]">
                  <Sparkles className="h-4 w-4" />
                  <h3 className="font-display text-sm font-semibold">
                    02. Phase 1 : Réserve & Prises
                  </h3>
                </div>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs sm:text-sm">
                  <li>Posez <strong>1 graine de votre réserve</strong> sur une case interne.</li>
                  <li><strong>Prise obligatoire :</strong> si elle est <em>bi-pleine</em> (≥ 1 chez vous et ≥ 1 en face), prenez les graines adverses et ressemez depuis un coin (<em>kotso</em>).</li>
                  <li className="flex items-start gap-1.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2DD4BF]" />
                    <span>Si la dernière graine tombe dans votre Nyumba intacte, choisissez de la <strong>garder</strong> ou de <strong>continuer</strong>.</span>
                  </li>
                </ul>
              </section>
            </div>
          )}

          {tab === 'phase2' && (
            <div className="space-y-3">
              <section className="rounded-2xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3.5">
                <div className="flex items-center gap-2 text-[#F2B441]">
                  <ArrowRightLeft className="h-4 w-4" />
                  <h3 className="font-display text-sm font-semibold">
                    03. Phase 2 : Ndrazi & U-trakatra
                  </h3>
                </div>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs sm:text-sm">
                  <li><strong>Ndrazi (prise obligatoire) :</strong> case d’au moins <strong>2 graines</strong> (jamais 1 seul <em>ntso</em>, max 15) dont le 1er semis capture en face.</li>
                  <li><strong>U-trakatra (sans prise) :</strong> interdit de partir d’une case à 1 graine (<em>gumwen</em>). Priorité à la rangée interne.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3.5">
                <div className="flex items-center gap-2 text-[#F2B441]">
                  <RotateCcw className="h-4 w-4" />
                  <h3 className="font-display text-sm font-semibold">
                    04. Droit à l’erreur & Kamuv !
                  </h3>
                </div>
                <p className="mt-2 text-xs sm:text-sm">
                  En Phase 2 après un trakatra, vous pouvez annuler <strong>1 fois par tour</strong> pour rejouer dans l’autre sens. Dès que la rangée interne adverse est vide ou bloquée, c’est <strong>Kamuv !</strong>
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-[#FFF7E8]/10 bg-[#22140C] px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-xl bg-[#F2B441] px-6 text-sm font-bold text-[#241409] hover:bg-[#FFD06B] sm:w-auto"
          >
            Retour au jeu
          </button>
        </div>
      </div>
    </div>
  );
}
