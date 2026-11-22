import { useState } from 'react';
import { CheckCircle2, Flag, X } from 'lucide-react';
import type { ReportReason, ReportTarget } from '../types/app';

interface ReportModalProps {
  target: ReportTarget;
  reporterPseudo: string;
  onClose: () => void;
}

const REASONS: Array<{ id: ReportReason; label: string }> = [
  { id: 'insultes', label: 'Insultes / Propos déplacés' },
  { id: 'triche', label: 'Triche / Logiciel' },
  { id: 'anti-jeu', label: 'Anti-jeu / Abandon abusif' },
  { id: 'spam', label: 'Spam / Flood' },
  { id: 'pseudo', label: 'Pseudo inapproprié' },
];

export function ReportModal({ target, reporterPseudo, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('insultes');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || sent) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterPseudo,
          targetPseudo: target.targetPseudo,
          reason,
          context: target.context,
          roomCode: target.roomCode || '',
          messageExcerpt: target.messageExcerpt || '',
          details: details.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || 'Impossible d’envoyer le signalement.');
        return;
      }
      setSent(true);
    } catch {
      setError('Serveur inaccessible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="animate-sheet-up flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-red-400/30 bg-[#1B120D] text-[#FFF7E8] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#FFF7E8]/10 bg-[#140D09] px-5 py-3">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-400" />
            <h2 id="report-modal-title" className="font-display text-base font-bold">
              Signaler {target.targetPseudo}
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

        {sent ? (
          <div className="flex flex-col items-center gap-3 px-5 py-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2DD4BF]/15 text-[#2DD4BF] ring-1 ring-[#2DD4BF]/40">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="text-base font-bold text-[#FFF7E8]">Signalement envoyé</p>
            <p className="text-xs text-[#B8ABA0]">
              Merci, notre modération examinera ce signalement.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 min-h-[46px] w-full rounded-2xl bg-[#F2B441] text-sm font-extrabold text-[#1C1007]"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {target.messageExcerpt && (
              <div className="truncate rounded-xl border border-[#FFF7E8]/10 bg-[#120C08] px-3 py-2 text-xs text-[#D8C7AE]">
                « {target.messageExcerpt} »
              </div>
            )}

            <div className="grid grid-cols-1 gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={`flex min-h-[40px] items-center justify-between rounded-xl border px-3 text-left text-xs font-semibold transition-colors ${
                    reason === r.id
                      ? 'border-red-400/70 bg-red-500/15 text-[#FFF7E8]'
                      : 'border-[#FFF7E8]/12 bg-[#120C08] text-[#D8C7AE] hover:border-[#FFF7E8]/25'
                  }`}
                >
                  <span>{r.label}</span>
                  <span
                    className={`h-3.5 w-3.5 rounded-full border ${
                      reason === r.id ? 'border-red-400 bg-red-400' : 'border-[#FFF7E8]/25'
                    }`}
                  />
                </button>
              ))}
            </div>

            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={240}
              placeholder="Précision (facultatif)"
              className="min-h-[42px] w-full rounded-xl border border-[#FFF7E8]/12 bg-[#120C08] px-3 text-xs text-[#FFF7E8] placeholder:text-[#8A7E72] focus:border-[#F2B441] focus:outline-none"
            />

            {error && <p className="text-xs font-semibold text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-extrabold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <Flag className="h-4 w-4" />
              <span>{submitting ? 'Envoi…' : 'Envoyer le signalement'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
