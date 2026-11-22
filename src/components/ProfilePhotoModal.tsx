import { useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2, X } from 'lucide-react';
import {
  isCustomPhotoAvatar,
  processAvatarPhotoFile,
  ProfileAvatar,
} from '../utils/avatars';

interface ProfilePhotoModalProps {
  currentAvatarId?: string;
  playerPseudo: string;
  saving?: boolean;
  error?: string | null;
  onSavePhoto: (nextAvatarId: string) => void;
  onClose: () => void;
}

export function ProfilePhotoModal({
  currentAvatarId,
  playerPseudo,
  saving = false,
  error = null,
  onSavePhoto,
  onClose,
}: ProfilePhotoModalProps) {
  const [draftPhoto, setDraftPhoto] = useState<string>(() =>
    isCustomPhotoAvatar(currentAvatarId) ? currentAvatarId!.trim() : ''
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasPhoto = isCustomPhotoAvatar(draftPhoto);
  const displayError = localError || error;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLocalError(null);
    setProcessing(true);
    try {
      const processed = await processAvatarPhotoFile(file);
      setDraftPhoto(processed);
      onSavePhoto(processed);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Impossible de charger cette photo.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-photo-title"
    >
      <div className="animate-sheet-up flex w-full max-w-sm flex-col overflow-hidden rounded-t-3xl border border-[#F2B441]/35 bg-[#1F140D] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        <div className="flex justify-center bg-[#170E09] pt-2 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[#FFF7E8]/20" />
        </div>

        <div className="flex items-center justify-between border-b border-[#FFF7E8]/10 bg-[#170E09] px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[#F2B441]" />
            <h2 id="profile-photo-title" className="font-display text-base font-bold">
              Photo de profil
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#D8C7AE] hover:bg-[#FFF7E8]/10"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <ProfileAvatar
              avatarId={draftPhoto}
              pseudo={playerPseudo}
              size="xl"
              highlight
            />
            <div className="text-base font-extrabold text-[#FFF7E8]">{playerPseudo}</div>
          </div>

          {displayError && (
            <div className="rounded-xl border border-amber-400/45 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100">
              {displayError}
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              disabled={saving || processing}
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#F2B441] px-4 text-sm font-extrabold text-[#1C1007] transition-transform active:scale-[0.98] disabled:opacity-55"
            >
              <ImagePlus className="h-4 w-4" />
              <span>
                {processing || saving
                  ? 'Enregistrement…'
                  : hasPhoto
                  ? 'Changer de photo'
                  : 'Importer une photo'}
              </span>
            </button>

            {hasPhoto && (
              <button
                type="button"
                disabled={saving || processing}
                onClick={() => {
                  setDraftPhoto('');
                  onSavePhoto('');
                }}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-[#FFF7E8]/15 bg-[#140C07] px-4 text-xs font-bold text-[#D8C7AE] hover:text-[#FFF7E8] disabled:opacity-55"
              >
                <Trash2 className="h-4 w-4" />
                <span>Supprimer la photo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
