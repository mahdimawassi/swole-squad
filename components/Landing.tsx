'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import Header from './Header';
import { INK, ARCHIVO, PAGE, card, btn } from '@/lib/ui';

export default function Landing() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

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
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <main style={PAGE}>
        <Header />
        <div style={{ ...card, textAlign: 'center', fontWeight: 700 }}>One sec…</div>
      </main>
    );
  }

  return (
    <main style={PAGE}>
      <Header />

      <div style={{ ...card, textAlign: 'center', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <SwoleGuy total={0} totalGoal={100} color="#4D7CFF" size={78} />
          <SwoleGuy total={45} totalGoal={100} color="#FF8A3D" size={78} />
          <SwoleGuy total={100} totalGoal={100} color="#FF5DA2" size={78} />
        </div>
        <div style={{ fontFamily: ARCHIVO, fontSize: 25, lineHeight: 1.1, marginTop: 6 }}>
          PICK A GOAL.
          <br />
          GET RIDICULOUS.
        </div>
        <p style={{ fontWeight: 500, fontSize: 14, marginTop: 10, marginBottom: 0 }}>
          Push-ups, pull-ups, kilometres, whatever. Log it every day with your friends and watch your guy go from
          twig to absolute unit.
        </p>
      </div>

      <button
        onClick={() => router.push('/new')}
        className="nb"
        style={btn('#FF5DA2', { width: '100%', color: '#fff', fontSize: 19, marginBottom: 12, padding: '18px 16px' })}
      >
        🚀 START A CHALLENGE
      </button>

      <button
        onClick={() => router.push('/join')}
        className="nb"
        style={btn('#fff', { width: '100%', fontSize: 19, padding: '18px 16px' })}
      >
        🎟️ JOIN WITH A CODE
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, opacity: 0.7, marginTop: 18 }}>
        No passwords, ever. We email you one link and that&rsquo;s your way in.
      </p>

      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <button
          onClick={() => router.push('/link')}
          style={{
            background: 'none',
            border: 'none',
            textDecoration: 'underline',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            color: INK,
            fontFamily: 'inherit',
          }}
        >
          Lost your link? Email it to me
        </button>
      </div>
    </main>
  );
}
