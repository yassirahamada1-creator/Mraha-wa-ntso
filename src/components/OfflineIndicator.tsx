import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-50 flex items-center gap-2 rounded-xl border border-[#F2B441]/50 bg-[#2B180D]/95 px-3 py-1.5 text-xs font-semibold text-[#FFD275] shadow-lg"
      role="status"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-[#F2B441]" />
      <span>Mode hors ligne · Solo & Duo disponibles</span>
    </div>
  );
}
