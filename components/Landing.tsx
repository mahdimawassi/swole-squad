'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import Header from './Header';
import { usePrefetch } from './Nav';
import { isStandalone } from '@/lib/pushClient';
import { INK, ARCHIVO, PAGE, card, btn } from '@/lib/ui';

export default function Landing() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  // An installed Home Screen app that lands here has no saved identity, which
  // on iPhone usually means it was installed from the wrong page.
  const [installedButLost, setInstalledButLost] = useState(false);

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
    setInstalledButLost(isStandalone());
    setChecking(false);
  }, [router]);

  usePrefetch(['/new', '/join', '/link']);

  if (checking) {
    return (
      <main style={PAGE}>
        <Header />
        <div style={{ ...card, textAlign: 'center', fontWeight: 700 }}>One sec…</div>
      </main>
    );
  }

  if (installedButLost) {
    return (
      <main style={PAGE}>
        <Header />
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🔑</div>
          <div style={{ fontFamily: ARCHIVO, fontSize: 20, margin: '8px 0' }}>ONE LAST STEP</div>
          <p style={{ fontWeight: 600, fontSize: 14, marginTop: 0 }}>
            This app does not know who you are yet. Open your personal Swole Squad link once from here (it is in
            the email we sent you) and it will remember you from then on.
          </p>
          <p style={{ fontWeight: 600, fontSize: 13, opacity: 0.75, marginBottom: 0 }}>
            Do not create a second account, or your history will be split in two.
          </p>
        </div>
        <button
          onClick={() => router.push('/link')}
          className="nb"
          style={btn('#4D7CFF', { width: '100%', color: '#fff', fontSize: 17 })}
        >
          EMAIL ME MY LINK
        </button>
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
