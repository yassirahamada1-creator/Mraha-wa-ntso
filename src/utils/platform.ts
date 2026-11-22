export type PlatformKind = 'ios' | 'android';

export function detectPlatform(): PlatformKind {
  if (typeof window === 'undefined') return 'android';

  try {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('platform')?.trim().toLowerCase();
    if (forced === 'ios') return 'ios';
    if (forced === 'android') return 'android';
  } catch {
    // ignore URL parse issues
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isTouchMac =
    typeof navigator !== 'undefined' &&
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1;

  if (/iphone|ipad|ipod/.test(ua) || isTouchMac) {
    return 'ios';
  }
  return 'android';
}

export function applyPlatformAttributes(platform: PlatformKind): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.platform = platform;
}
