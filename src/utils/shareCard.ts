export interface ShareCardPayload {
  playerName: string;
  island: string;
  opponentName: string;
  modeLabel: string;
  isWinner: boolean;
  playerSeeds: number;
  opponentSeeds: number;
  captures: number;
  longestRelay: number;
  turnCount?: number;
  durationSeconds?: number;
  eloRating?: number;
  eloDelta?: number;
  winReason?: string | null;
}

function formatDurationCompact(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
}

export function generateScoreCardDataUrl(payload: ShareCardPayload): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Warm mahogany & volcanic basalt background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
  bgGrad.addColorStop(0, '#1C1009');
  bgGrad.addColorStop(0.55, '#2A180D');
  bgGrad.addColorStop(1, '#180E08');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 630);

  // Subtle decorative warm glow on right
  const glow = ctx.createRadialGradient(950, 220, 40, 950, 220, 440);
  glow.addColorStop(0, 'rgba(242, 180, 65, 0.18)');
  glow.addColorStop(1, 'rgba(242, 180, 65, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 630);

  // Chiromani geometric border strip top & bottom
  ctx.fillStyle = '#8E1C24';
  ctx.fillRect(28, 28, 1144, 12);
  ctx.fillRect(28, 590, 1144, 12);

  // Outer frame border
  ctx.strokeStyle = 'rgba(242, 180, 65, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, 1144, 574);

  // Decorative 4x8 mini board silhouette on right side
  const boardX = 760;
  const boardY = 125;
  const pitStepX = 46;
  const pitStepY = 50;
  ctx.fillStyle = '#4A2B18';
  ctx.beginPath();
  ctx.roundRect(boardX - 24, boardY - 24, 384, 210, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242, 180, 65, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      const px = boardX + c * pitStepX + 16;
      const py = boardY + r * pitStepY + 16;
      ctx.fillStyle = '#241208';
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();

      const dotCount = r >= 2 ? 3 : 2;
      for (let d = 0; d < dotCount; d++) {
        ctx.fillStyle = r >= 2 ? '#F2B441' : '#9CA884';
        ctx.beginPath();
        ctx.arc(px + (d - 1) * 6, py + ((d % 2) - 0.5) * 4, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Brand lockup top left
  ctx.fillStyle = '#F2B441';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('MRAHA WA TSO', 72, 92);

  // Main result title
  ctx.fillStyle = '#FFF7E8';
  ctx.font = '700 54px "Fraunces", Georgia, serif';
  const headline = payload.isWinner ? 'Kamuv ! Victoire' : 'Partie Terminée';
  ctx.fillText(headline, 72, 162);

  // Subtitle: player & opponent
  ctx.fillStyle = '#EBDCC3';
  ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${payload.playerName}  vs  ${payload.opponentName}`,
    72,
    210
  );

  ctx.fillStyle = '#D8C7AE';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  const modeInfo = payload.winReason
    ? `${payload.modeLabel}  ·  ${payload.winReason}`
    : payload.modeLabel;
  ctx.fillText(modeInfo, 72, 246);

  // Divider line
  ctx.strokeStyle = 'rgba(255, 247, 232, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, 282);
  ctx.lineTo(680, 282);
  ctx.stroke();

  // Stats Row
  const metrics: Array<{ label: string; value: string }> = [
    { label: 'SCORE GRAINES', value: `${payload.playerSeeds} – ${payload.opponentSeeds}` },
    { label: 'PRISES', value: `${payload.captures}` },
    { label: 'COUPS', value: `${payload.turnCount ?? '—'}` },
  ];
  if (payload.durationSeconds !== undefined) {
    metrics.push({ label: 'DURÉE', value: formatDurationCompact(payload.durationSeconds) });
  } else if (payload.eloRating !== undefined) {
    const deltaStr =
      payload.eloDelta !== undefined
        ? ` (${payload.eloDelta >= 0 ? '+' : ''}${payload.eloDelta})`
        : '';
    metrics.push({ label: 'ELO', value: `${payload.eloRating}${deltaStr}` });
  }

  metrics.forEach((m, idx) => {
    const x = 72 + idx * 258;
    const y = 358;
    ctx.fillStyle = '#C7B8A2';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(m.label, x, y);

    ctx.fillStyle = idx === 0 ? '#F2B441' : '#FFF7E8';
    ctx.font = '700 38px "JetBrains Mono", monospace';
    ctx.fillText(m.value, x, y + 48);
  });

  // Bottom invitation bar
  ctx.fillStyle = 'rgba(242, 180, 65, 0.14)';
  ctx.beginPath();
  ctx.roundRect(72, 484, 1056, 72, 12);
  ctx.fill();

  ctx.fillStyle = '#F2B441';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Défie-moi sur le tablier traditionnel de Mraha wa Tso !', 100, 527);

  ctx.fillStyle = '#EBDCC3';
  ctx.font = '500 18px "JetBrains Mono", monospace';
  const host = typeof window !== 'undefined' ? window.location.host : 'mraha-wa-tso';
  ctx.fillText(host, 810, 527);

  return canvas.toDataURL('image/png');
}

export function buildSocialShareText(payload: ShareCardPayload): string {
  const winnerName = payload.isWinner ? payload.playerName : payload.opponentName;
  const loserName = payload.isWinner ? payload.opponentName : payload.playerName;
  const headline = payload.isWinner
    ? `J’ai gagné contre ${loserName} sur Mraha wa Tso ! (${winnerName} bat ${loserName})`
    : `${winnerName} a battu ${loserName} sur Mraha wa Tso !`;
  return `${headline}\nTélécharge gratuitement le jeu et viens défier tes amis !`;
}

export function getShareLinks(text: string, url: string) {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  const encodedFull = encodeURIComponent(`${text} ${url}`);

  return {
    whatsapp: `https://wa.me/?text=${encodedFull}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };
}
