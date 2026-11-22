import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ImagePlus,
  LogIn,
  LogOut,
  Trash2,
  Trophy,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { AuthAccount } from '../types/app';
import {
  isCustomPhotoAvatar,
  processAvatarPhotoFile,
  ProfileAvatar,
  resolveAvatarId,
} from '../utils/avatars';

interface AccountModalProps {
  currentAccount: AuthAccount | null;
  currentPseudo: string;
  currentAvatarId?: string;
  onOpenPhotoModal: () => void;
  onAuthSuccess: (token: string, account: AuthAccount) => void;
  onLogout: () => void;
  onClose: () => void;
}

export function AccountModal({
  currentAccount,
  currentPseudo,
  currentAvatarId,
  onOpenPhotoModal,
  onAuthSuccess,
  onLogout,
  onClose,
}: AccountModalProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [pseudo, setPseudo] = useState(currentPseudo === 'Joueur' ? '' : currentPseudo);
  const [password, setPassword] = useState('');
  const [signupPhoto, setSignupPhoto] = useState<string>(
    () => resolveAvatarId(currentAvatarId) || ''
  );
  const [photoBusy, setPhotoBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loggedAvatarValue = resolveAvatarId(currentAccount?.avatarId || currentAvatarId);
  const signupIsPhoto = isCustomPhotoAvatar(signupPhoto);
  const previewPseudo = pseudo.trim() || 'Joueur';

  const handleContinueToPhotoStep = () => {
    setError(null);
    const cleanPseudo = pseudo.trim();
    if (cleanPseudo.length < 3 || cleanPseudo.length > 20) {
      setError('Le pseudo doit contenir entre 3 et 20 caractères.');
      return;
    }
    if (password.length < 4) {
      setError('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }
    setRegisterStep(2);
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setPhotoBusy(true);
    try {
      const processed = await processAvatarPhotoFile(file);
      setSignupPhoto(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger cette photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanPseudo = pseudo.trim();
    if (cleanPseudo.length < 3 || cleanPseudo.length > 20) {
      setError('Le pseudo doit contenir entre 3 et 20 caractères.');
      return;
    }
    if (password.length < 4) {
      setError('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    if (mode === 'register' && registerStep === 1) {
      setRegisterStep(2);
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'register'
          ? { pseudo: cleanPseudo, password, avatarId: signupPhoto }
          : { pseudo: cleanPseudo, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        token?: string;
        account?: AuthAccount;
        error?: string;
      };

      if (!res.ok || !data.token || !data.account) {
        setError(data.error || 'Opération impossible.');
        return;
      }

      onAuthSuccess(data.token, data.account);
      onClose();
    } catch {
      setError('Serveur inaccessible pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="animate-sheet-up flex max-h-[95dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/35 bg-[#1F140D] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        <div className="flex justify-center bg-[#170E09] pt-2 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[#FFF7E8]/20" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-[#FFF7E8]/10 bg-[#170E09] px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2">
            {currentAccount ? (
              <UserCheck className="h-5 w-5 text-[#2DD4BF]" />
            ) : (
              <UserPlus className="h-5 w-5 text-[#F2B441]" />
            )}
            <h2 id="account-modal-title" className="font-display text-base font-bold sm:text-lg">
              {currentAccount
                ? 'Mon profil joueur'
                : mode === 'register'
                ? registerStep === 1
                  ? 'Créer votre compte'
                  : 'Photo de profil'
                : 'Connexion'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#D8C7AE] transition-transform active:scale-95 hover:bg-[#FFF7E8]/10"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          {currentAccount ? (
            <div className="space-y-3.5">
              <div className="rounded-2xl border border-[#2DD4BF]/35 bg-[#122625] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={onOpenPhotoModal}
                      className="relative shrink-0 rounded-full transition-transform active:scale-95"
                      aria-label="Mettre ou changer ma photo"
                    >
                      <ProfileAvatar
                        avatarId={loggedAvatarValue}
                        pseudo={currentAccount.pseudo}
                        size="lg"
                        highlight
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#122625] bg-[#F2B441] text-[#1C1007] shadow">
                        <Camera className="h-3 w-3" />
                      </span>
                    </button>

                    <div className="min-w-0">
                      <div className="truncate text-lg font-extrabold text-[#FFF7E8]">
                        {currentAccount.pseudo}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1F140D] px-3 py-1.5 text-sm font-black text-[#F2B441]">
                    <Trophy className="h-4 w-4" />
                    <span className="font-mono-nums">{currentAccount.rating}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenPhotoModal}
                  className="mt-3 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#F2B441]/40 bg-[#1F140D]/80 px-3 text-xs font-bold text-[#F2B441] hover:border-[#F2B441]"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span>Photo de profil</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#140C07] p-2.5">
                  <div className="text-[11px] text-[#B8ABA0]">Parties</div>
                  <div className="font-mono-nums text-lg font-black text-[#FFF7E8]">
                    {currentAccount.gamesPlayed}
                  </div>
                </div>
                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#140C07] p-2.5">
                  <div className="text-[11px] text-[#B8ABA0]">Victoires</div>
                  <div className="font-mono-nums text-lg font-black text-[#2DD4BF]">
                    {currentAccount.wins}
                  </div>
                </div>
                <div className="rounded-xl border border-[#FFF7E8]/10 bg-[#140C07] p-2.5">
                  <div className="text-[11px] text-[#B8ABA0]">Défaites</div>
                  <div className="font-mono-nums text-lg font-black text-[#F2B441]">
                    {currentAccount.losses}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-red-400/35 bg-red-500/15 px-4 text-sm font-bold text-red-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Se déconnecter</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Switch Créer / Se connecter */}
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#140C07] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setRegisterStep(1);
                    setError(null);
                  }}
                  className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-extrabold ${
                    mode === 'register'
                      ? 'bg-[#F2B441] text-[#1C1007]'
                      : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Créer un compte</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-extrabold ${
                    mode === 'login'
                      ? 'bg-[#2DD4BF] text-[#0A2623]'
                      : 'text-[#D8C7AE] hover:text-[#FFF7E8]'
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Se connecter</span>
                </button>
              </div>

              {mode === 'register' && (
                <div className="flex items-center gap-2 px-1">
                  <div
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      registerStep >= 1 ? 'bg-[#F2B441]' : 'bg-[#FFF7E8]/10'
                    }`}
                  />
                  <div
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      registerStep === 2 ? 'bg-[#F2B441]' : 'bg-[#FFF7E8]/10'
                    }`}
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-amber-400/45 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100">
                  {error}
                </div>
              )}

              {mode === 'register' && registerStep === 2 ? (
                <div className="space-y-3.5 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelected}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#F2B441]/25 bg-[#160E09] px-4 py-4">
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => fileInputRef.current?.click()}
                      className="relative rounded-full transition-transform active:scale-95"
                      aria-label="Importer une photo"
                    >
                      <ProfileAvatar
                        avatarId={signupPhoto}
                        pseudo={previewPseudo}
                        size="xl"
                        highlight
                      />
                      <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#160E09] bg-[#F2B441] text-[#1C1007] shadow">
                        <Camera className="h-3.5 w-3.5" />
                      </span>
                    </button>

                    <div className="text-base font-extrabold text-[#FFF7E8]">{previewPseudo}</div>

                    <div className="mt-1 flex w-full gap-2">
                      <button
                        type="button"
                        disabled={photoBusy}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#2DD4BF]/50 bg-[#0F2D2E] px-3 text-xs font-extrabold text-[#2DD4BF]"
                      >
                        <ImagePlus className="h-4 w-4" />
                        <span>{photoBusy ? 'Chargement…' : 'Ajouter une photo'}</span>
                      </button>

                      {signupIsPhoto && (
                        <button
                          type="button"
                          onClick={() => setSignupPhoto('')}
                          className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-[#FFF7E8]/15 bg-[#1F140D] text-[#D8C7AE]"
                          aria-label="Retirer la photo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setRegisterStep(1);
                      }}
                      className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border border-[#FFF7E8]/15 bg-[#140C07] px-4 text-xs font-bold text-[#D8C7AE]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Retour</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading || photoBusy}
                      className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#F2B441] px-5 text-sm font-extrabold text-[#1C1007] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
                    >
                      <Check className="h-4 w-4 stroke-[2.5]" />
                      <span>{loading ? 'Création…' : 'Terminer'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="account-pseudo" className="block text-xs font-bold text-[#F2B441]">
                      Pseudo
                    </label>
                    <input
                      id="account-pseudo"
                      type="text"
                      value={pseudo}
                      onChange={(e) => setPseudo(e.target.value)}
                      maxLength={20}
                      autoComplete="username"
                      placeholder="Pseudo"
                      className="min-h-[46px] w-full rounded-xl border border-[#FFF7E8]/15 bg-[#140C07] px-3.5 text-sm font-semibold text-[#FFF7E8] placeholder:text-[#8E7C6B] focus:border-[#F2B441] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="account-password" className="block text-xs font-bold text-[#F2B441]">
                      Mot de passe
                    </label>
                    <input
                      id="account-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      maxLength={64}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder="Mot de passe"
                      className="min-h-[46px] w-full rounded-xl border border-[#FFF7E8]/15 bg-[#140C07] px-3.5 text-sm font-semibold text-[#FFF7E8] placeholder:text-[#8E7C6B] focus:border-[#F2B441] focus:outline-none"
                    />
                  </div>

                  {mode === 'register' ? (
                    <button
                      type="button"
                      onClick={handleContinueToPhotoStep}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#F2B441] px-5 text-sm font-extrabold text-[#1C1007] shadow-lg transition-transform active:scale-[0.98]"
                    >
                      <span>Continuer</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-[#2DD4BF] px-5 text-sm font-extrabold text-[#0A2623] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? 'Connexion…' : 'Se connecter'}
                    </button>
                  )}
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
