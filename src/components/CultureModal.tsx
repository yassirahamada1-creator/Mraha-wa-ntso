import { Compass, X, Sparkles, BookOpen } from 'lucide-react';

interface CultureModalProps {
  onClose: () => void;
}

const LEXICON = [
  { term: 'Mraha wa Tso', desc: 'Nom comorien et mahorais du jeu de bao traditionnel à 4 rangées.' },
  { term: 'Tso / Tsotsoro', desc: 'Graine grise polie de Caesalpinia bonduc (œil-de-chat).' },
  { term: 'Bao', desc: 'Le tablier en bois sculpté de 4×8 cuvettes (32 cases).' },
  { term: 'Ngama', desc: 'Une case ou cuvette creusée dans le tablier.' },
  { term: 'Nyumba', desc: '« La maison » : case carrée centrale protégeant 6 graines au départ.' },
  { term: 'Kotso', desc: 'Les cases de coin (col. 1 ou 8) d’où repartent les captures.' },
  { term: 'Ndrazi', desc: 'Tas de graines permettant une prise immédiate et obligatoire.' },
  { term: 'U-trakatra', desc: 'Semis tactique sans prise pour redistribuer son jeu.' },
  { term: 'Gumwen', desc: 'Case ne contenant qu’une seule graine (singleton).' },
  { term: 'Munia', desc: 'Défendre sa rangée interne ou protéger sa Nyumba.' },
  { term: 'Kamuv !', desc: 'Cri de victoire lorsque l’adversaire ne peut plus défendre sa ligne.' },
];

export function CultureModal({ onClose }: CultureModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="culture-title"
    >
      <div className="flex max-h-[92%] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/30 bg-[#2A190F] text-[#FFF7E8] shadow-2xl sm:rounded-2xl">
        {/* Bandeau motif Chiromani */}
        <div className="h-2.5 w-full bg-gradient-to-r from-[#8E1C24] via-[#F2B441] to-[#8E1C24]" />

        <div className="flex items-center justify-between border-b border-[#FFF7E8]/10 bg-[#22140C] px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-[#F2B441]" />
            <div>
              <h2 id="culture-title" className="font-display text-lg font-bold sm:text-xl">
                Origines, Culture & Variantes
              </h2>
              <p className="text-xs text-[#D8C7AE]">
                Patrimoine de Mayotte et de l’Archipel des Comores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#D8C7AE] hover:bg-[#FFF7E8]/10 hover:text-[#FFF7E8]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-[#EBDCC3] sm:px-6">
          <section>
            <h3 className="font-display text-base font-bold text-[#F2B441]">
              Un héritage millénaire de l’Océan Indien
            </h3>
            <p className="mt-1.5">
              Joué sous les vérandas des villages de <strong>Maore (Mayotte)</strong>,{' '}
              <strong>Ngazidja (Grande Comore)</strong>, <strong>Ndzuwani (Anjouan)</strong> et{' '}
              <strong>Mwali (Mohéli)</strong>, le <em>Mraha wa Tso</em> appartient à la grande famille
              swahilie du <em>Bao</em>. Plus qu’un passe-temps, c’est un véritable art oratoire et
              stratégique où les maîtres (<em>Mafundi</em>) calculent parfois des relais de plus de
              vingt cases de mémoire.
            </p>
          </section>

          <section className="rounded-2xl border border-[#F2B441]/25 bg-[#1D110A] p-4">
            <div className="flex items-center gap-2 font-bold text-[#FFD275]">
              <Sparkles className="h-4 w-4" />
              Les graines « tso » & le bois sculpté
            </div>
            <p className="mt-1.5 text-xs text-[#EBDCC3]">
              Sur les îles, les joueurs utilisent les graines lisses et nacrées du{' '}
              <em>Caesalpinia bonduc</em> (appelées <em>tso</em> ou <em>tsotsoro</em>), récoltées le
              long du littoral corallien. Les tabliers traditionnels sont taillés dans du bois de
              jacquier, de takamaka ou d’acajou, parfois posés sur des étoffes <em>chiromani</em>{' '}
              lors des tournois de quartier (<em>shioni</em> ou places publiques).
            </p>
          </section>

          <section>
            <h3 className="font-display text-base font-bold text-[#F2B441]">
              Variantes locales des îles
            </h3>
            <div className="mt-2 space-y-2 text-xs">
              <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3">
                <div className="font-bold text-[#FFF7E8]">Mraha de Maore & Ngazidja</div>
                <p className="mt-0.5 text-[#D8C7AE]">
                  Inclut le célèbre <strong>Droit à l’erreur</strong> après un <em>u-trakatra</em> de
                  Phase 2 (annulation unique pour inverser le sens) et le plafond{' '}
                  <strong>Ndrazi à 15 graines</strong>.
                </p>
              </div>
              <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3">
                <div className="font-bold text-[#FFF7E8]">Jeu de mémoire (Nyumba couverte)</div>
                <p className="mt-0.5 text-[#D8C7AE]">
                  Chez les joueurs chevronnés, un couvercle ou un coquillage cache le contenu de la{' '}
                  <em>Nyumba</em> intacte : chacun doit retenir mentalement combien de graines s’y
                  accumulent ! (Activé par joueur dans notre mode 1vs1.)
                </p>
              </div>
              <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3">
                <div className="font-bold text-[#FFF7E8]">Bao la Kiswahili (Zanzibar / Côte Est)</div>
                <p className="mt-0.5 text-[#D8C7AE]">
                  Cousin direct du Mraha wa Tso, souvent joué sans plafond sur les <em>ndrazi</em> et
                  avec un saut de case de départ sur les boucles complètes (configurable dans nos
                  Paramètres de variantes !).
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 text-[#F2B441]">
              <BookOpen className="h-4 w-4" />
              <h3 className="font-display text-base font-semibold">Lexique Shikomori</h3>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {LEXICON.map((item) => (
                <div
                  key={item.term}
                  className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] px-3 py-2 text-xs"
                >
                  <div className="font-bold text-[#FFD275]">{item.term}</div>
                  <div className="mt-0.5 text-[#D8C7AE]">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>
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
