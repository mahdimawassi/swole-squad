'use client';

import { useEffect, useState } from 'react';
import {
  currentState,
  enablePush,
  disablePush,
  isIOS,
  registerServiceWorker,
  type PushState,
} from '@/lib/pushClient';
import { INK, ARCHIVO, card, btn } from '@/lib/ui';

// The permanent home for notification settings, so people can turn them on or
// off later without waiting for the prompt to reappear.
export default function NotificationSettings({ token }: { token: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [howTo, setHowTo] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    currentState().then(setState);
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    if (state === 'on') {
      const ok = await disablePush();
      setState(ok ? 'ready' : 'on');
      setNote(ok ? 'Reminders off.' : 'Could not turn them off.');
    } else {
      const result = await enablePush(token);
      setNote(result.message);
      if (result.ok) setState('on');
      else if (result.message.includes('blocked')) setState('denied');
    }
    setBusy(false);
  }

  const on = state === 'on';

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: ARCHIVO, fontSize: 15 }}>PHONE NOTIFICATIONS</div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.75, marginTop: 2 }}>
            {state === null && 'Checking…'}
            {state === 'on' && 'On for this device. You will get a midday nudge if you have not logged.'}
            {state === 'ready' && 'Off. Turn them on to get a nudge instead of an email.'}
            {state === 'denied' &&
              'Blocked by your browser. Re-allow notifications for this site in your browser settings.'}
            {state === 'unsupported' && 'This browser cannot do notifications. You will get emails instead.'}
            {state === 'needs-install' &&
              'Add Swole Squad to your Home Screen first, then notifications become available.'}
          </div>
        </div>

        {(state === 'on' || state === 'ready') && (
          <button
            onClick={toggle}
            disabled={busy}
            aria-label="Toggle notifications"
            className="nb"
            style={{
              width: 62,
              height: 34,
              borderRadius: 999,
              border: `3px solid ${INK}`,
              background: on ? '#37C871' : '#EFE6C6',
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: `3px 3px 0 ${INK}`,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: on ? 30 : 2,
                width: 24,
                height: 24,
                borderRadius: 999,
                background: '#fff',
                border: `2px solid ${INK}`,
                transition: 'left .15s ease',
              }}
            />
          </button>
        )}
      </div>

      {state === 'needs-install' && (
        <>
          {howTo ? (
            <ol style={{ margin: '12px 0 0', paddingLeft: 20, fontWeight: 600, fontSize: 13, lineHeight: 1.7 }}>
              <li>
                In Safari, tap <b>Share</b> ⬆️
              </li>
              <li>
                Tap <b>Add to Home Screen</b>
              </li>
              <li>Open Swole Squad from the new icon</li>
              <li>Come back here and switch this on</li>
            </ol>
          ) : (
            <button
              onClick={() => setHowTo(true)}
              className="nb"
              style={btn('#fff', { width: '100%', marginTop: 12, fontSize: 14 })}
            >
              How do I do that?
            </button>
          )}
        </>
      )}

      {note && <div style={{ fontWeight: 800, fontSize: 13, marginTop: 10 }}>{note}</div>}

      {isIOS() && state === 'on' && (
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.65, marginTop: 8 }}>
          Notifications work per device, so switch them on separately on your other phones or laptops.
        </div>
      )}
    </div>
  );
}
