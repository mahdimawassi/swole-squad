'use client';

import { useRouter } from 'next/navigation';
import { INK } from '@/lib/ui';

// The unread dot in the header. Deliberately a plain link rather than a dropdown:
// on a phone a full page is easier to read than a cramped popover.
export default function Bell({ token, unread }: { token: string; unread: number }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/me/${token}/activity`)}
      aria-label={unread > 0 ? `${unread} new notifications` : 'Notifications'}
      className="nb"
      style={{
        position: 'relative',
        width: 42,
        height: 42,
        borderRadius: 12,
        background: unread > 0 ? '#FFD54A' : '#fff',
        border: `3px solid ${INK}`,
        boxShadow: `3px 3px 0 ${INK}`,
        cursor: 'pointer',
        flexShrink: 0,
        fontSize: 18,
        lineHeight: 1,
        padding: 0,
        color: INK,
      }}
    >
      🔔
      {unread > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -7,
            right: -7,
            minWidth: 20,
            height: 20,
            padding: '0 5px',
            borderRadius: 999,
            background: '#FF5DA2',
            color: '#fff',
            border: `2px solid ${INK}`,
            fontSize: 11,
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
