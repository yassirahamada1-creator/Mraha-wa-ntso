import { useEffect, useState } from 'react';

const CUSTOM_PHOTO_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]{16,250000}$/i;

export function isCustomPhotoAvatar(raw?: string | null): boolean {
  if (!raw || typeof raw !== 'string') return false;
  return CUSTOM_PHOTO_REGEX.test(raw.trim());
}

/**
 * Retourne la photo importée si valide, sinon undefined (= cercle initiale style WhatsApp).
 */
export function resolveAvatarId(raw?: string | null): string | undefined {
  if (raw && typeof raw === 'string') {
    const trimmed = raw.trim();
    if (isCustomPhotoAvatar(trimmed)) {
      return trimmed;
    }
  }
  return undefined;
}

const WHATSAPP_BG_PALETTE = [
  '#008069', // Vert WhatsApp
  '#0F766E', // Sarcelle profond
  '#1D4ED8', // Bleu royal
  '#6D28D9', // Violet profond
  '#B45309', // Ambre doré
  '#BE123C', // Framboise
  '#0E7490', // Cyan lagon
  '#4D7C0F', // Olive chaud
] as const;

export function getWhatsAppAvatarStyle(pseudo?: string | null): {
  initial: string;
  bgColor: string;
} {
  const clean = (pseudo || '').trim();
  const initial = clean ? clean.charAt(0).toUpperCase() : 'J';
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % WHATSAPP_BG_PALETTE.length;
  return {
    initial,
    bgColor: WHATSAPP_BG_PALETTE[idx],
  };
}

export async function processAvatarPhotoFile(file: File): Promise<string> {
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Veuillez sélectionner un fichier image (JPG, PNG ou WebP).');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image trop lourde (maximum 15 Mo).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Impossible de lire cette image.'));
      el.src = objectUrl;
    });

    const targetSize = 192;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Traitement image indisponible.');
    }

    const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const sx = Math.max(0, ((img.naturalWidth || img.width) - minSide) / 2);
    const sy = Math.max(0, ((img.naturalHeight || img.height) - minSide) / 2);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    if (!isCustomPhotoAvatar(dataUrl)) {
      throw new Error('La photo optimisée dépasse la taille autorisée.');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 rounded-full text-[11px]',
  sm: 'h-8 w-8 rounded-full text-sm',
  md: 'h-11 w-11 rounded-full text-base',
  lg: 'h-16 w-16 rounded-full text-2xl',
  xl: 'h-20 w-20 rounded-full text-3xl',
};

export function ProfileAvatar({
  avatarId,
  pseudo,
  name,
  size = 'md',
  className = '',
  highlight = false,
}: {
  avatarId?: string | null;
  pseudo?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
  highlight?: boolean;
}) {
  const customPhoto = isCustomPhotoAvatar(avatarId);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarId]);

  const displayName = pseudo || name || 'Joueur';
  const { initial, bgColor } = getWhatsAppAvatarStyle(displayName);
  const ringColor = highlight ? '#F2B441' : 'rgba(255,247,232,0.28)';
  const showPhoto = customPhoto && !imgFailed;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none font-extrabold text-white ${SIZE_CLASS[size]} ${className}`}
      style={{
        backgroundColor: showPhoto ? '#1B120C' : bgColor,
        boxShadow: highlight
          ? `0 0 0 2px ${ringColor}, 0 0 12px rgba(242,180,65,0.32)`
          : `inset 0 0 0 1.5px ${ringColor}`,
      }}
      title={displayName}
    >
      {showPhoto ? (
        <img
          src={avatarId!.trim()}
          alt={displayName}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <span aria-hidden="true" className="leading-none tracking-tight">
          {initial}
        </span>
      )}
    </span>
  );
}

export const ComorianAvatar = ProfileAvatar;
