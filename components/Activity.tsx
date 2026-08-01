'use client';

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

export default function Activity({ token, notes }: { token: string; notes: Note[] }) {
  const router = useRouter();

  return (
    <main style={PAGE}>
      <Header badge="ACTIVITY" back={`/me/${token}`} />

      {notes.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: 26 }}>
          <div style={{ fontSize: 34 }}>🔔</div>
          <div style={{ fontFamily: ARCHIVO, fontSize: 17, marginTop: 6 }}>NOTHING YET</div>
          <p style={{ fontWeight: 600, fontSize: 13, margin: '6px 0 0' }}>
            Reactions from your squad, badges you unlock and people joining your challenges will show up here.
          </p>
        </div>
      )}

      {notes.map((n) => {
        // Stored relative so the same row works for whoever is looking at it.
        const href = n.url ? `/me/${token}${n.url}` : null;
        const fresh = !n.read_at;
        return (
          <button
            key={n.id}
            onClick={() => href && router.push(href)}
            className="nb"
            disabled={!href}
            style={{
              ...card,
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              textAlign: 'left',
              cursor: href ? 'pointer' : 'default',
              fontFamily: 'inherit',
              background: fresh ? '#FFF3B0' : '#fff',
              padding: 14,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 24, lineHeight: 1.1 }}>{n.icon ?? '🔔'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: ARCHIVO, fontSize: 14, lineHeight: 1.25 }}>{n.title}</div>
              {n.body && (
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.75, marginTop: 3 }}>{n.body}</div>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.55, marginTop: 4 }}>{ago(n.created_at)}</div>
            </div>
            {fresh && (
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: '#FF5DA2',
                  border: `2px solid ${INK}`,
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
            )}
          </button>
        );
      })}

      <button
        onClick={() => router.push(`/me/${token}/profile`)}
        className="nb"
        style={btn('#fff', { width: '100%', fontSize: 14, marginTop: 6 })}
      >
        ⚙️ Notification settings
      </button>
    </main>
  );
}
