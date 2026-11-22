import { useState } from 'react';
import {
  X,
  Sliders,
  Volume2,
  VolumeX,
  Gauge,
  ShieldAlert,
  Palette,
  BookOpen,
  Lock,
  Check,
  Home,
  Sparkles,
  ArrowRightLeft,
  RotateCcw,
  Trophy,
  Music,
} from 'lucide-react';
import type { MrahaRuleConfig } from '../game/mrahaEngine';
import type {
  AccessibilityPrefs,
  BoardThemeId,
  GameSpeed,
  ProgressionState,
  StartingPlayerPref,
} from '../types/app';
import { BOARD_THEMES } from '../utils/themes';

export type SettingsTab = 'params' | 'variants' | 'themes' | 'rules';

interface SettingsModalProps {
  initialTab?: SettingsTab;
  speed: GameSpeed;
  onChangeSpeed: (s: GameSpeed) => void;
  muted: boolean;
  onToggleMute: () => void;
  hideNyumba: boolean;
  onToggleHideNyumba: () => void;
  hideNyumbaP2?: boolean;
  onToggleHideNyumbaP2?: () => void;
  startingPlayer: StartingPlayerPref;
  onChangeStartingPlayer: (p: StartingPlayerPref) => void;
  ruleConfig: MrahaRuleConfig;
  onChangeRuleConfig: (cfg: MrahaRuleConfig) => void;
  accessibility: AccessibilityPrefs;
  onChangeAccessibility: (next: AccessibilityPrefs) => void;
  themeId: BoardThemeId;
  onChangeThemeId: (id: BoardThemeId) => void;
  progression: ProgressionState;
  onOpenChallenges?: () => void;
  onOpenRulesModal?: () => void;
  onSimulateVictory?: () => void;
  onSimulateDefeat?: () => void;
  onClose: () => void;
}

interface GameToggleRowProps {
  title: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  accent?: 'gold' | 'teal';
  borderClassName?: string;
}

function GameToggleRow({
  title,
  description,
  checked,
  onToggle,
  accent = 'gold',
  borderClassName,
}: GameToggleRowProps) {
  const trackActiveClass =
    accent === 'teal'
      ? 'border-[#2DD4BF]/70 bg-[#2DD4BF]'
      : 'border-[#F2B441]/80 bg-[#F2B441]';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-xl border bg-[#1D110A] px-3 py-1.5 text-left transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#F2B441] ${
        borderClassName ||
        (checked ? 'border-[#F2B441]/35' : 'border-[#FFF7E8]/10 hover:border-[#FFF7E8]/20')
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-[#FFF7E8]">{title}</div>
        {description && <div className="truncate text-[10px] text-[#D8C7AE]">{description}</div>}
      </div>

      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 ${
          checked ? trackActiveClass : 'border-[#FFF7E8]/15 bg-[#2B1B12]'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full shadow-md transition-transform duration-150 ${
            checked ? 'translate-x-4 bg-[#1C1007]' : 'translate-x-0.5 bg-[#D8C7AE]'
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsModal({
  initialTab = 'params',
  speed,
  onChangeSpeed,
  muted,
  onToggleMute,
  hideNyumba,
  onToggleHideNyumba,
  hideNyumbaP2,
  onToggleHideNyumbaP2,
  startingPlayer,
  onChangeStartingPlayer,
  ruleConfig,
  onChangeRuleConfig,
  accessibility,
  onChangeAccessibility,
  themeId,
  onChangeThemeId,
  progression,
  onOpenChallenges,
  onOpenRulesModal,
  onSimulateVictory,
  onSimulateDefeat,
  onClose,
}: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  const toggleFlag = (key: keyof Omit<MrahaRuleConfig, 'maxNdrazi'>) => {
    onChangeRuleConfig({
      ...ruleConfig,
      [key]: !ruleConfig[key],
    });
  };

  const toggleAccess = (key: keyof AccessibilityPrefs) => {
    onChangeAccessibility({
      ...accessibility,
      [key]: !accessibility[key],
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="animate-sheet-up flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/25 bg-[#2A190F] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        <div className="flex justify-center bg-[#22140C] pt-2 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[#FFF7E8]/20" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#FFF7E8]/10 bg-[#22140C] px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[#F2B441]" />
            <h2 id="settings-title" className="font-display text-base font-bold sm:text-lg">
              Paramètres & Règles
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#D8C7AE] transition-transform active:scale-95 hover:bg-[#FFF7E8]/10 hover:text-[#FFF7E8]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4 Onglets compacts sans besoin de scroll */}
        <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-[#FFF7E8]/10 bg-[#1D110A] p-1.5">
          <button
            type="button"
            onClick={() => setTab('params')}
            className={`flex min-h-[38px] items-center justify-center gap-1 rounded-xl px-1.5 text-[11px] font-bold sm:text-xs ${
              tab === 'params'
                ? 'bg-[#F2B441] text-[#241409]'
                : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Jeu</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('variants')}
            className={`flex min-h-[38px] items-center justify-center gap-1 rounded-xl px-1.5 text-[11px] font-bold sm:text-xs ${
              tab === 'variants'
                ? 'bg-[#F2B441] text-[#241409]'
                : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Variantes</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('themes')}
            className={`flex min-h-[38px] items-center justify-center gap-1 rounded-xl px-1.5 text-[11px] font-bold sm:text-xs ${
              tab === 'themes'
                ? 'bg-[#F2B441] text-[#241409]'
                : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Tabliers</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('rules')}
            className={`flex min-h-[38px] items-center justify-center gap-1 rounded-xl px-1.5 text-[11px] font-bold sm:text-xs ${
              tab === 'rules'
                ? 'bg-[#F2B441] text-[#241409]'
                : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Règles</span>
          </button>
        </div>

        {/* Contenu adapté à 1 écran */}
        <div className="space-y-2 px-4 py-2.5 text-sm sm:px-6">
          {tab === 'params' && (
            <>
              <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#F2B441]">
                    <Gauge className="h-3.5 w-3.5" />
                    Vitesse
                  </div>
                  <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#1D110A] p-1">
                    {(
                      [
                        { id: 'slow', label: 'Lent' },
                        { id: 'x1', label: 'Normal' },
                        { id: 'x2', label: 'Rapide' },
                        { id: 'instant', label: 'Direct' },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onChangeSpeed(s.id)}
                        className={`min-h-[32px] rounded-lg px-1 text-xs font-semibold ${
                          speed === s.id
                            ? 'border border-[#F2B441]/55 bg-[#462916] text-[#F2B441]'
                            : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#F2B441]">
                    {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    Audio
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={onToggleMute}
                      className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold ${
                        !muted
                          ? 'border-[#2ED193]/45 bg-[#2ED193]/15 text-[#64EBB6]'
                          : 'border-[#FFF7E8]/15 bg-[#1D110A] text-[#D8C7AE]'
                      }`}
                    >
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      <span>{muted ? 'Muet' : 'Sons ON'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAccess('ambientSoundEnabled')}
                      className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold ${
                        accessibility.ambientSoundEnabled && !muted
                          ? 'border-[#F2B441]/55 bg-[#462916] text-[#F2B441]'
                          : 'border-[#FFF7E8]/15 bg-[#1D110A] text-[#D8C7AE]'
                      }`}
                    >
                      <Music className="h-4 w-4" />
                      <span>{accessibility.ambientSoundEnabled ? 'Ambiance ON' : 'Ambiance OFF'}</span>
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <GameToggleRow
                  title="Vibrations tactiles"
                  checked={accessibility.vibrationEnabled}
                  onToggle={() => toggleAccess('vibrationEnabled')}
                />
                <GameToggleRow
                  title="Gros chiffres"
                  checked={accessibility.largeTextAndSeeds}
                  onToggle={() => toggleAccess('largeTextAndSeeds')}
                />
                <GameToggleRow
                  title="Mode daltonien"
                  checked={accessibility.colorblindMode}
                  onToggle={() => toggleAccess('colorblindMode')}
                />
                <GameToggleRow
                  title="Règles guidées"
                  checked={accessibility.guidedRules}
                  onToggle={() => toggleAccess('guidedRules')}
                />
                <GameToggleRow
                  title={
                    onToggleHideNyumbaP2
                      ? 'Cacher Nyumba J1'
                      : 'Cacher la Nyumba'
                  }
                  checked={hideNyumba}
                  onToggle={onToggleHideNyumba}
                  borderClassName="border-[#F2B441]/30"
                />
                {onToggleHideNyumbaP2 && (
                  <GameToggleRow
                    title="Cacher Nyumba J2"
                    checked={Boolean(hideNyumbaP2)}
                    onToggle={onToggleHideNyumbaP2}
                    accent="teal"
                    borderClassName="border-[#2DD4BF]/35"
                  />
                )}
              </section>

              <section className="space-y-1.5">
                <div className="text-[11px] font-bold text-[#F2B441]">Qui commence ?</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'p1', label: 'Joueur 1' },
                      { id: 'p2', label: 'Joueur 2 / IA' },
                      { id: 'random', label: 'Aléatoire' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeStartingPlayer(opt.id)}
                      className={`min-h-[38px] rounded-xl border px-2 text-xs font-semibold ${
                        startingPlayer === opt.id
                          ? 'border-[#F2B441] bg-[#F2B441]/18 text-[#F2B441]'
                          : 'border-[#FFF7E8]/12 bg-[#1D110A] text-[#D8C7AE] hover:text-[#FFF7E8]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {onSimulateVictory && onSimulateDefeat && (
                <section className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSimulateVictory();
                    }}
                    className="min-h-[36px] rounded-xl border border-[#F2B441]/35 bg-[#2A1B0F] px-2 text-xs font-bold text-[#F2B441] hover:bg-[#3A2514]"
                  >
                    Simuler Victoire
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSimulateDefeat();
                    }}
                    className="min-h-[36px] rounded-xl border border-red-400/35 bg-[#261416] px-2 text-xs font-bold text-red-300 hover:bg-[#361B1E]"
                  >
                    Simuler Défaite
                  </button>
                </section>
              )}
            </>
          )}

          {tab === 'variants' && (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#FFF7E8] sm:text-sm">
                    Plafond Ndrazi (Phase 2)
                  </div>
                  <div className="text-[11px] text-[#D8C7AE]">
                    Maximum de graines par case pour lancer un ndrazi.
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[15, null].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => onChangeRuleConfig({ ...ruleConfig, maxNdrazi: val })}
                      className={`min-h-[38px] rounded-lg border px-2.5 text-xs font-bold ${
                        ruleConfig.maxNdrazi === val
                          ? 'border-[#F2B441] bg-[#F2B441] text-[#241409]'
                          : 'border-[#FFF7E8]/15 text-[#D8C7AE]'
                      }`}
                    >
                      {val === 15 ? '15' : 'Illimité'}
                    </button>
                  ))}
                </div>
              </div>

              <GameToggleRow
                title="Sauter la case de départ (boucle ≥ 16)"
                description="Au 2e passage d’un tour complet, saute la case de départ."
                checked={ruleConfig.skipStartOnLoop}
                onToggle={() => toggleFlag('skipStartOnLoop')}
              />
              <GameToggleRow
                title="Capture Phase 1 depuis Nyumba intacte"
                description="Autorise le dépôt en Nyumba intacte si bi-pleine."
                checked={ruleConfig.allowReserveInIntactNyumba}
                onToggle={() => toggleFlag('allowReserveInIntactNyumba')}
              />
              <GameToggleRow
                title="Choix du coin sur prise au centre"
                description="En Phase 1 (col. 3–6), choisissez le kotso de départ."
                checked={ruleConfig.allowFreeDirOnPhase1Capture}
                onToggle={() => toggleFlag('allowFreeDirOnPhase1Capture')}
              />
              <GameToggleRow
                title="Exception Nyumba seule en Phase 1"
                description="Si seule la Nyumba intacte est jouable devant, 2 graines."
                checked={ruleConfig.nyumbaSoloTakeTwo}
                onToggle={() => toggleFlag('nyumbaSoloTakeTwo')}
              />
            </section>
          )}

          {tab === 'themes' && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BOARD_THEMES.map((t) => {
                const unlocked = t.isUnlocked(progression);
                const selected = themeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onChangeThemeId(t.id)}
                    className={`flex flex-col justify-between gap-1.5 rounded-2xl border p-2.5 text-left transition-opacity ${
                      selected
                        ? 'border-[#F2B441] bg-[#3C2314] ring-1 ring-[#F2B441]'
                        : unlocked
                        ? 'border-[#FFF7E8]/15 bg-[#1D110A] hover:border-[#F2B441]/55'
                        : 'border-[#FFF7E8]/10 bg-[#160D08] opacity-65'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-[#FFF7E8]">{t.name}</div>
                        <div className="truncate text-[10px] text-[#D8C7AE]">{t.materialTag}</div>
                      </div>
                      {selected ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F2B441] text-[#241409]">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : !unlocked ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2A190F] text-[#D8C7AE]">
                          <Lock className="h-3 w-3" />
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={`flex h-7 items-center justify-around rounded-lg border p-1 ${t.boardFrameClass}`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full ${t.pitBaseOppClass}`} />
                      <span className={`h-3.5 w-3.5 rounded-full ${t.pitBasePlayerClass}`} />
                      <span className={`h-3 w-3 rounded-full bg-gradient-to-br ${t.seedGradientClass}`} />
                    </div>

                    <div className="truncate text-[10px] font-medium text-[#F2B441]">
                      {unlocked ? 'Disponible' : t.unlockHint}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'rules' && (
            <div className="space-y-2.5 text-xs leading-snug text-[#EBDCC3]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#F2B441]">
                    <Home className="h-3.5 w-3.5" /> 01. Départ (64 tso)
                  </div>
                  <p className="mt-1">
                    4×8 cases : 6 graines en <em>Nyumba</em>, 2 dans les 2 cases à droite, 22 en réserve.
                  </p>
                </div>
                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#F2B441]">
                    <Sparkles className="h-3.5 w-3.5" /> 02. Phase 1
                  </div>
                  <p className="mt-1">
                    Posez 1 graine de réserve. Case bi-pleine = prise obligatoire depuis un coin (<em>kotso</em>).
                  </p>
                </div>
                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#F2B441]">
                    <ArrowRightLeft className="h-3.5 w-3.5" /> 03. Phase 2
                  </div>
                  <p className="mt-1">
                    <em>Ndrazi</em> (≥ 2 graines avec prise) obligatoire, sinon <em>u-trakatra</em> libre.
                  </p>
                </div>
                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#1D110A] p-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#F2B441]">
                    <RotateCcw className="h-3.5 w-3.5" /> 04. Kamuv !
                  </div>
                  <p className="mt-1">
                    1 droit à l’erreur après trakatra. Rangée interne adverse vide ou bloquée = victoire.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {onOpenRulesModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRulesModal();
                    }}
                    className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#F2B441]/45 bg-[#F2B441]/15 px-3 text-xs font-bold text-[#F2B441] hover:bg-[#F2B441]/25"
                  >
                    <BookOpen className="h-4 w-4" />
                    Flèches & jouabilité
                  </button>
                )}

                {onOpenChallenges && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChallenges();
                    }}
                    className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#2ED193]/45 bg-[#2ED193]/15 px-3 text-xs font-bold text-[#64EBB6] hover:bg-[#2ED193]/25"
                  >
                    <Trophy className="h-4 w-4" />
                    10 Défis pratiques
                  </button>
                )}
              </div>
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
            Appliquer & Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
