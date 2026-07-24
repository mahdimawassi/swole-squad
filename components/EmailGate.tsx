'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isEmail } from '@/lib/challenge';
import { INK, ARCHIVO, btn, input } from '@/lib/ui';

// Shown to anyone still on a profile without an email (everyone who joined
// before email was required). Dismissible so nobody is locked out mid-challenge,
// but it comes back on the next visit until they add one.
export default function EmailGate({ token, name }: { token: string; name: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  async function save() {
    const clean = email.trim().toLowerCase();
    if (!isEmail(clean) || busy) {
      setErr('That email looks off.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Could not save that.');
        setBusy(false);
        return;
      }
      try {
        const raw = localStorage.getItem('swole_me');
        const m = raw ? JSON.parse(raw) : {};
        localStorage.setItem('swole_me', JSON.stringify({ ...m, token, email: clean }));
      } catch {
        // ignore
      }
      setDone(true);
      router.refresh();
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,20,.55)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          border: `3px solid ${INK}`,
          borderRadius: 20,
          boxShadow: `6px 6px 0 ${INK}`,
          padding: 22,
          width: '100%',
          maxWidth: 380,
        }}
      >
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>📬</div>
            <div style={{ fontFamily: ARCHIVO, fontSize: 19, margin: '8px 0' }}>SORTED</div>
            <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 18px' }}>
              We sent your access link to <b>{email.trim().toLowerCase()}</b>. Keep that email and you can never
              lose your spot.
            </p>
            <button onClick={() => setHidden(true)} className="nb" style={btn('#37C871', { width: '100%', color: '#fff' })}>
              GOT IT
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 36, textAlign: 'center' }}>🔑</div>
            <div style={{ fontFamily: ARCHIVO, fontSize: 20, textAlign: 'center', margin: '6px 0 8px' }}>
              ADD YOUR EMAIL
            </div>
            <p style={{ fontWeight: 600, fontSize: 14, marginTop: 0, marginBottom: 16, textAlign: 'center' }}>
              {name}, right now your spot only exists in this browser. Add an email and we&rsquo;ll send you a
              link that works on any phone or laptop.
            </p>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
              }}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              style={{ ...input, marginBottom: 12 }}
            />
            {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <button
              onClick={save}
              disabled={busy}
              className="nb"
              style={btn('#FF5DA2', { width: '100%', color: '#fff', fontSize: 17, opacity: busy ? 0.6 : 1 })}
            >
              {busy ? 'SAVING…' : 'SEND ME MY LINK'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={() => setHidden(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  opacity: 0.65,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  color: INK,
                  fontFamily: 'inherit',
                }}
              >
                Not right now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
