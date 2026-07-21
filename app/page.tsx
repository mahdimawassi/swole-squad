'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#141414';

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('swole_me');
      if (raw) {
        const m = JSON.parse(raw);
        if (m?.token) {
          router.replace(`/me/${m.token}`);
          return;
        }
      }
    } catch {
      // ignore
    }
    setChecked(true);
  }, [router]);

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '48px 16px' }}>
      <div
        style={{
          background: '#fff',
          border: `3px solid ${INK}`,
          borderRadius: 20,
          boxShadow: `6px 6px 0 ${INK}`,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 46 }}>🏋️</div>
        <h1 style={{ fontFamily: "'Archivo Black', system-ui, sans-serif", fontSize: 24, margin: '10px 0' }}>SWOLE SQUAD</h1>
        <p style={{ fontWeight: 600, margin: 0 }}>
          {checked
            ? 'You need an invite link to join a challenge. Ask whoever runs your squad to send you theirs.'
            : 'One sec…'}
        </p>
      </div>
    </main>
  );
}
