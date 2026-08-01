'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import { INK, ARCHIVO, PAGE, card, btn } from '@/lib/ui';

type Note = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  icon: string | null;
  read_at: string | null;
  created_at: string;
};

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function Activity({ token, notes: initial }: { token: string; notes: Note[] }) {
  const router = useRouter();
  // Local copy so a dismissed item leaves the screen straight away rather than
  // sitting there until the next page load.
  const [notes, setNotes] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    setNotes((list) => list.filter((n) => n.id !== id));
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, id }),
      });
      router.refresh();
    } catch {
      // it is already gone from view; nothing useful to say
    }
  }

  async function clearAll() {
    if (busy) return;
    setBusy(true);
    setNotes([]);
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, all: true }),
      });
      router.refresh();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  // Tapping the row takes you there and clears it on the way out.
  function open(n: Note) {
    const href = n.url ? `/me/${token}${n.url}` : null;
    remove(n.id);
    if (href) router.push(href);
  }

  return (
    <main style={PAGE}>
      <Header badge="ACTIVITY" back={`/me/${token}`} />

      {notes.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 26 }}>
          <div style={{ fontSize: 34 }}>🔔</div>
          <div style={{ fontFamily: ARCHIVO, fontSize: 17, marginTop: 6 }}>ALL CLEAR</div>
          <p style={{ fontWeight: 600, fontSize: 13, margin: '6px 0 0' }}>
            Reactions, badges and new squad members will show up here.
          </p>
        </div>
      ) : (
        <>
          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                ...card,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                marginBottom: 10,
                background: n.read_at ? '#fff' : '#FFF3B0',
              }}
            >
              <button
                onClick={() => open(n)}
                className="rx-pill"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 11,
                  flex: 1,
                  minWidth: 0,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: INK,
                }}
              >
                <span style={{ fontSize: 23, lineHeight: 1.1 }}>{n.icon ?? '🔔'}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: ARCHIVO, fontSize: 14, lineHeight: 1.25 }}>
                    {n.title}
                  </span>
                  {n.body && (
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, opacity: 0.75, marginTop: 2 }}>
                      {n.body}
                    </span>
                  )}
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.55, marginTop: 3 }}>
                    {ago(n.created_at)}
                  </span>
                </span>
              </button>

              <button
                onClick={() => remove(n.id)}
                aria-label="Dismiss"
                className="rx-pill"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 19,
                  fontWeight: 900,
                  cursor: 'pointer',
                  color: INK,
                  opacity: 0.45,
                  padding: '2px 4px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={clearAll}
            disabled={busy}
            className="nb"
            style={btn('#fff', { width: '100%', fontSize: 14, opacity: busy ? 0.6 : 1 })}
          >
            Clear all
          </button>
        </>
      )}
    </main>
  );
}
