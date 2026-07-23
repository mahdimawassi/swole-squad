'use client';

import { useState } from 'react';
import Header from './Header';
import { ARCHIVO, PAGE, card, btn, input, label } from '@/lib/ui';

export default function LostLink() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Could not send.');
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={PAGE}>
      <Header back="/" />
      <div style={card}>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 42 }}>📬</div>
            <div style={{ fontFamily: ARCHIVO, fontSize: 19, margin: '8px 0' }}>SENT</div>
            <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
              If that email belongs to a squad member, their link is on the way. Check spam if it hides.
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: ARCHIVO, fontSize: 20, marginBottom: 6 }}>LOST YOUR LINK?</div>
            <p style={{ fontWeight: 500, fontSize: 14, marginTop: 0, marginBottom: 16 }}>
              Pop in your email and we&rsquo;ll send it again.
            </p>
            <label style={label}>EMAIL</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              type="email"
              placeholder="you@email.com"
              style={{ ...input, marginBottom: 14 }}
            />
            {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}
            <button
              onClick={send}
              disabled={!email.trim() || busy}
              className="nb"
              style={btn('#4D7CFF', { width: '100%', color: '#fff', fontSize: 17, opacity: email.trim() && !busy ? 1 : 0.5 })}
            >
              {busy ? 'SENDING…' : 'EMAIL MY LINK'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
