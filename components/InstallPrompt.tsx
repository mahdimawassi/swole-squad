'use client';

import { useEffect, useState } from 'react';
import {
  currentState,
  enablePush,
  isIOS,
  isAndroid,
  isStandalone,
  registerServiceWorker,
  type PushState,
} from '@/lib/pushClient';
import { INK, ARCHIVO, card, btn } from '@/lib/ui';

const SNOOZE_KEY = 'swole_nudge_snooze';
const SNOOZE_DAYS = 7;

function snoozed(): boolean {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
  } catch {
    // ignore
  }
}

/**
 * Asks people to add the app to their Home Screen and turn reminders on.
 *
 * Order matters. On iPhone, push notifications only work once the app has been
 * added to the Home Screen, so we never ask for permission before that. On
 * Android and desktop push works straight from the browser, so we skip ahead.
 *
 * It also waits until someone is actually using the app (they are in at least
 * one challenge) rather than ambushing a first-time visitor, and a dismissal
 * is remembered for a week.
 */
export default function InstallPrompt({ token, active }: { token: string; active: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [show, setShow] = useState(false);
  const [howTo, setHowTo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      registerServiceWorker();
      const s = await currentState();
      if (!alive) return;
      setState(s);
      // Nothing to nag about if it is already on, blocked, or unsupported.
      const worthShowing = s === 'needs-install' || s === 'ready';
      setShow(active && worthShowing && !snoozed());
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  if (!show || !state) return null;

  const ios = isIOS();
  const android = isAndroid();
  const installed = isStandalone();

  async function turnOn() {
    setBusy(true);
    setNote(null);
    const result = await enablePush(token);
    setNote(result.message);
    if (result.ok) {
      setState('on');
      setTimeout(() => setShow(false), 1800);
    }
    setBusy(false);
  }

  function dismiss() {
    snooze();
    setShow(false);
  }

  // --- iPhone, still in a browser tab: it has to go on the Home Screen first ---
  if (state === 'needs-install') {
    return (
      <div style={{ ...card, background: '#FFF3B0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontSize: 26 }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: ARCHIVO, fontSize: 16 }}>NEVER MISS A DAY</div>
            <p style={{ fontWeight: 600, fontSize: 13, margin: '4px 0 0' }}>
              Add Swole Squad to your Home Screen and we can nudge you if you forget to log. The icon opens
              straight into your own squad, no signing in. Takes about ten seconds.
            </p>
          </div>
          <button onClick={dismiss} aria-label="Dismiss" style={xStyle}>
            ×
          </button>
        </div>

        {howTo ? (
          <ol style={{ margin: '14px 0 0', paddingLeft: 20, fontWeight: 600, fontSize: 13, lineHeight: 1.7 }}>
            <li>
              Stay on <b>this page</b>, then tap <b>Share</b> <span style={{ fontSize: 15 }}>⬆️</span> at the
              bottom of Safari
            </li>
            <li>
              Scroll down and tap <b>Add to Home Screen</b>
            </li>
            <li>
              Tap <b>Add</b>, then open Swole Squad from your new icon
            </li>
            <li>Tap the bell to switch reminders on</li>
          </ol>
        ) : (
          <button
            onClick={() => setHowTo(true)}
            className="nb"
            style={btn('#FF5DA2', { width: '100%', color: '#fff', marginTop: 14, fontSize: 15 })}
          >
            SHOW ME HOW
          </button>
        )}

        {howTo && (
          <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 0, marginTop: 10 }}>
            Safari only, so if you are in Chrome open this page in Safari first. Adding it from this page is what
            links the icon to your account.
          </p>
        )}
      </div>
    );
  }

  // --- Can subscribe right now (Android, desktop, or an installed iPhone app) ---
  return (
    <div style={{ ...card, background: '#FFF3B0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 26 }}>🔔</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: ARCHIVO, fontSize: 16 }}>TURN ON REMINDERS</div>
          <p style={{ fontWeight: 600, fontSize: 13, margin: '4px 0 0' }}>
            A single nudge around midday if you have not logged yet. No spam, and you can switch it off any
            time.
          </p>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" style={xStyle}>
          ×
        </button>
      </div>

      {note && <div style={{ fontWeight: 800, fontSize: 13, marginTop: 12 }}>{note}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={turnOn}
          disabled={busy}
          className="nb"
          style={btn('#37C871', { flex: 1, color: '#fff', fontSize: 15, opacity: busy ? 0.6 : 1 })}
        >
          {busy ? 'TURNING ON…' : 'YES, REMIND ME'}
        </button>
        <button onClick={dismiss} className="nb" style={btn('#fff', { fontSize: 15 })}>
          Not now
        </button>
      </div>

      {!ios && !installed && (
        <div style={{ marginTop: 12, borderTop: `2px solid rgba(20,20,20,.15)`, paddingTop: 10 }}>
          {howTo ? (
            <ol style={{ margin: 0, paddingLeft: 20, fontWeight: 600, fontSize: 13, lineHeight: 1.7 }}>
              <li>
                Stay on <b>this page</b>, then tap the <b>⋮</b> menu at the top right of Chrome
              </li>
              <li>
                Tap <b>{android ? 'Add to Home screen' : 'Install'}</b>, then confirm
              </li>
              <li>Open Swole Squad from the new icon and it will remember you</li>
            </ol>
          ) : (
            <button
              onClick={() => setHowTo(true)}
              style={{
                background: 'none',
                border: 'none',
                fontWeight: 700,
                fontSize: 12,
                textDecoration: 'underline',
                cursor: 'pointer',
                color: INK,
                opacity: 0.75,
                fontFamily: 'inherit',
                padding: 0,
              }}
            >
              Want the icon on your home screen too?
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const xStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  fontWeight: 900,
  cursor: 'pointer',
  lineHeight: 1,
  color: INK,
  padding: 0,
  flexShrink: 0,
};
