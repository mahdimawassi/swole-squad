'use client';

import { useEffect, useState } from 'react';
import {
  isAndroid,
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
export default function NotificationSettings({
  token,
  prefReminders = true,
  prefSocial = true,
}: {
  token: string;
  prefReminders?: boolean;
  prefSocial?: boolean;
}) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [howTo, setHowTo] = useState(false);
  const [reminders, setReminders] = useState(prefReminders);
  const [social, setSocial] = useState(prefSocial);

  async function savePref(patch: Record<string, boolean>) {
    try {
      await fetch('/api/email-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...patch }),
      });
    } catch {
      // ignore
    }
  }

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
            {state === 'unsupported' &&
              (isAndroid()
                ? 'Open the site in Chrome to switch notifications on.'
                : 'This browser cannot do notifications. You will get emails instead.')}
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

      {on && (
        <div style={{ marginTop: 14, borderTop: `2px solid rgba(20,20,20,.15)`, paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, marginBottom: 8 }}>SEND ME</div>
          <MiniToggle
            label="Daily reminder"
            hint="If you have not logged by midday"
            on={reminders}
            onToggle={() => {
              const next = !reminders;
              setReminders(next);
              savePref({ push_reminders: next });
            }}
          />
          <MiniToggle
            label="Squad activity"
            hint="Reactions, badges you unlock, people joining"
            on={social}
            onToggle={() => {
              const next = !social;
              setSocial(next);
              savePref({ push_social: next });
            }}
          />
        </div>
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

function MiniToggle({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>{hint}</div>
      </div>
      <button
        onClick={onToggle}
        aria-label={`Toggle ${label}`}
        className="nb"
        style={{
          width: 48,
          height: 27,
          borderRadius: 999,
          border: `2px solid ${INK}`,
          background: on ? '#37C871' : '#EFE6C6',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 23 : 2,
            width: 19,
            height: 19,
            borderRadius: 999,
            background: '#fff',
            border: `2px solid ${INK}`,
            transition: 'left .15s ease',
          }}
        />
      </button>
    </div>
  );
}
