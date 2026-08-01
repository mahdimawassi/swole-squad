'use client';

// Browser-side push helpers. Kept separate from lib/push.ts, which is server only.

export type PushState =
  | 'unsupported'   // browser cannot do web push at all
  | 'needs-install' // iPhone: must be on the Home Screen before push is allowed
  | 'ready'         // can ask for permission
  | 'denied'        // user said no; only they can undo it in settings
  | 'on';           // subscribed

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Macintosh, so check for touch as well.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
}

// Running from the Home Screen icon rather than a browser tab.
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function currentState(): Promise<PushState> {
  if (!pushSupported()) {
    // On iPhone the APIs only appear once the app is on the Home Screen.
    return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) return 'on';
  } catch {
    // fall through
  }
  return 'ready';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

// Asks permission, subscribes, and stores it against the user. Returns a
// message suitable for showing the person, or null on success.
export async function enablePush(token: string): Promise<{ ok: boolean; message: string }> {
  if (!pushSupported()) {
    return { ok: false, message: 'This browser cannot do notifications.' };
  }

  const keyRes = await fetch('/api/push');
  const keyData = await keyRes.json();
  if (!keyData?.enabled || !keyData?.key) {
    return { ok: false, message: 'Notifications are not set up on this site yet.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      message:
        permission === 'denied'
          ? 'Notifications are blocked. You can re-enable them in your browser settings.'
          : 'Maybe next time.',
    };
  }

  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker());
  if (!reg) return { ok: false, message: 'Could not start notifications.' };
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.key) as BufferSource,
    });
  }

  const res = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      subscription: sub.toJSON(),
      user_agent: navigator.userAgent,
    }),
  });

  if (!res.ok) return { ok: false, message: 'Could not save your reminder settings.' };
  return { ok: true, message: 'Reminders are on 🔔' };
}

export async function disablePush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return true;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch('/api/push', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    return true;
  } catch {
    return false;
  }
}
