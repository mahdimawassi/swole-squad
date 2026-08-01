'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Bell from './Bell';
import { ARCHIVO, INK, pill } from '@/lib/ui';

// One header everywhere. The logo always goes home (your hub if we know you),
// and a back arrow appears on every page that is not home.
export default function Header({
  badge,
  sub,
  back,
  badgeHref,
  bell,
}: {
  badge?: string;
  sub?: string;
  back?: string | boolean;
  badgeHref?: string;
  bell?: { token: string; unread: number };
}) {
  const router = useRouter();
  const [home, setHome] = useState('/');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('swole_me');
      if (raw) {
        const m = JSON.parse(raw);
        if (m?.token) setHome(`/me/${m.token}`);
      }
    } catch {
      // ignore
    }
  }, []);

  const backHref = typeof back === 'string' ? back : back ? home : null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {backHref && (
          <button
            onClick={() => router.push(backHref)}
            className="nb"
            aria-label="Back"
            style={{
              background: '#fff',
              border: `3px solid ${INK}`,
              borderRadius: 12,
              boxShadow: `3px 3px 0 ${INK}`,
              width: 42,
              height: 42,
              fontSize: 19,
              fontWeight: 900,
              cursor: 'pointer',
              flexShrink: 0,
              lineHeight: 1,
              color: INK,
            }}
          >
            ←
          </button>
        )}
        <button
          onClick={() => router.push(home)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: ARCHIVO,
            fontSize: 21,
            letterSpacing: 0.5,
            color: INK,
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          🏋️ SWOLE SQUAD
        </button>
        {bell && <Bell token={bell.token} unread={bell.unread} />}
        {badge &&
          (badgeHref ? (
            <button
              onClick={() => router.push(badgeHref)}
              className="nb"
              style={{
                ...pill,
                flexShrink: 0,
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                border: `2px solid ${INK}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {badge} ⚙️
            </button>
          ) : (
            <div style={{ ...pill, flexShrink: 0, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {badge}
            </div>
          ))}
      </div>
      {sub && <div style={{ fontWeight: 700, fontSize: 13, opacity: 0.75, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
