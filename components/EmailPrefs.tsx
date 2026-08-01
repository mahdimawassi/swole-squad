'use client';

import { useState } from 'react';
import Header from './Header';
import type { User } from '@/lib/types';
import { INK, ARCHIVO, PAGE, card, btn } from '@/lib/ui';

export default function EmailPrefs({ user }: { user: User }) {
  const [reminders, setReminders] = useState(user.email_reminders === true);
  const [activity, setActivity] = useState(user.email_activity === true);
  const [unsubscribed, setUnsubscribed] = useState(user.email_unsubscribed === true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save(patch: Record<string, boolean>, message: string) {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/email-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: user.secret_token, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) setNote(data?.error || 'Could not save.');
      else setNote(message);
    } catch {
      setNote('Network error.');
    } finally {
      setBusy(false);
    }
  }

  function toggleReminders() {
    const next = !reminders;
    setReminders(next);
    if (next) setUnsubscribed(false);
    save({ email_reminders: next, ...(next ? { email_unsubscribed: false } : {}) }, next ? 'Reminders on.' : 'Reminders off.');
  }

  function toggleActivity() {
    const next = !activity;
    setActivity(next);
    if (next) setUnsubscribed(false);
    save({ email_activity: next, ...(next ? { email_unsubscribed: false } : {}) }, next ? 'Updates on.' : 'Updates off.');
  }

  function unsubscribeAll() {
    setUnsubscribed(true);
    setReminders(false);
    setActivity(false);
    save({ email_unsubscribed: true }, 'Unsubscribed from everything except your access link.');
  }

  return (
    <main style={PAGE}>
      <Header badge="EMAIL" back={`/me/${user.secret_token}/profile`} />

      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 19 }}>EMAIL PREFERENCES</div>
        <p style={{ fontWeight: 600, fontSize: 13, margin: '6px 0 0' }}>
          Everything here is off unless you switch it on. We&rsquo;d rather send too little than too much.
        </p>
        {user.email && (
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginTop: 8 }}>Sending to {user.email}</div>
        )}
      </div>

      <Row
        title="Daily reminder"
        body="One nudge around midday if you have not logged yet. Only sent for challenges that are actually running, and skipped entirely if you have phone notifications on."
        on={reminders}
        onToggle={toggleReminders}
        busy={busy}
      />

      <Row
        title="Challenge updates"
        body="Occasional notes like someone joining a challenge you created, or a challenge wrapping up with the final standings."
        on={activity}
        onToggle={toggleActivity}
        busy={busy}
      />

      <div style={{ ...card, background: '#FFF9E8', padding: 14 }}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 14, marginBottom: 4 }}>🔑 YOUR ACCESS LINK</div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>
          Always sent, and not something we can switch off. It is the only way back into your account if you lose
          your link, so turning it off would lock you out.
        </div>
      </div>

      {note && <div style={{ color: '#1E7F45', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{note}</div>}

      {!unsubscribed ? (
        <button
          onClick={unsubscribeAll}
          disabled={busy}
          className="nb"
          style={btn('#fff', { width: '100%', color: '#C21F3A', fontSize: 15 })}
        >
          Unsubscribe from everything
        </button>
      ) : (
        <div style={{ ...card, textAlign: 'center', background: '#FFD9E2', padding: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>
            You&rsquo;re unsubscribed. Flip either switch above to start receiving that type again.
          </div>
        </div>
      )}
    </main>
  );
}

function Row({
  title,
  body,
  on,
  onToggle,
  busy,
}: {
  title: string;
  body: string;
  on: boolean;
  onToggle: () => void;
  busy: boolean;
}) {
  return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.75, marginTop: 3 }}>{body}</div>
      </div>
      <button
        onClick={onToggle}
        disabled={busy}
        aria-label={`Toggle ${title}`}
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
    </div>
  );
}
