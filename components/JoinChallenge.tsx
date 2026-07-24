'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import Header from './Header';
import { AVATAR_COLORS, goalLabel, emojiFor, totalGoalFor, prettyDate, fmt, isEmail } from '@/lib/challenge';
import type { Challenge } from '@/lib/types';
import { INK, ARCHIVO, PAGE, card, btn, input, label } from '@/lib/ui';

export default function JoinChallenge({ challenge, squadSize }: { challenge: Challenge; squadSize: number }) {
  const router = useRouter();
  const [known, setKnown] = useState<{ token: string; name: string } | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState(AVATAR_COLORS[0].hex);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const goal = totalGoalFor(challenge);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('swole_me');
      if (raw) {
        const m = JSON.parse(raw);
        if (m?.token && m?.name) {
          setKnown({ token: m.token, name: m.name });
          setName(m.name);
          if (m.email) setEmail(m.email);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const newUserReady = name.trim().length > 0 && isEmail(email);

  async function join(useToken: boolean) {
    if (busy) return;
    if (!useToken && !newUserReady) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: challenge.invite_code,
          token: useToken ? known?.token : undefined,
          name: name.trim(),
          email: email.trim(),
          avatar_color: color,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Could not join.');
        setBusy(false);
        return;
      }
      if (data.emailed) {
        setSent(data.masked || 'your inbox');
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem(
          'swole_me',
          JSON.stringify({ token: data.token, name: name.trim() || known?.name, email: email.trim() }),
        );
      } catch {
        // ignore
      }
      router.push(`/me/${data.token}`);
    } catch {
      setErr('Network error. Try again.');
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <main style={PAGE}>
        <Header back />
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 42 }}>📬</div>
          <div style={{ fontFamily: ARCHIVO, fontSize: 20, margin: '8px 0' }}>CHECK YOUR EMAIL</div>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
            That email is already in the squad, so we sent your access link to <b>{sent}</b>. Open it and you&rsquo;re
            in.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={PAGE}>
      <Header badge={`${squadSize} IN`} back />

      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontSize: 34 }}>{emojiFor(challenge.activity)}</div>
        <div style={{ fontFamily: ARCHIVO, fontSize: 22, lineHeight: 1.15, marginTop: 4 }}>
          {challenge.name.toUpperCase()}
        </div>
        <div
          style={{
            display: 'inline-block',
            background: '#FFD54A',
            border: `3px solid ${INK}`,
            borderRadius: 999,
            padding: '5px 14px',
            fontWeight: 900,
            fontSize: 14,
            marginTop: 10,
            boxShadow: `3px 3px 0 ${INK}`,
          }}
        >
          {goalLabel(challenge)}
        </div>
        <p style={{ fontWeight: 600, fontSize: 13, marginTop: 12, marginBottom: 0 }}>
          {challenge.duration_days} days · {prettyDate(challenge.start_date)} to {prettyDate(challenge.end_date)}
          <br />
          {fmt(goal)} {challenge.unit_label} gets you to SWOLE GOD.
        </p>
      </div>

      {known ? (
        <>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <SwoleGuy total={0} totalGoal={goal} color={color} size={80} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: ARCHIVO, fontSize: 17 }}>WELCOME BACK, {known.name.toUpperCase()}</div>
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>One tap and you&rsquo;re in this one too.</div>
            </div>
          </div>
          {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button
            onClick={() => join(true)}
            disabled={busy}
            className="nb"
            style={btn('#FF5DA2', { width: '100%', color: '#fff', fontSize: 18, opacity: busy ? 0.6 : 1 })}
          >
            {busy ? 'JOINING…' : `JOIN AS ${known.name.toUpperCase()} 💥`}
          </button>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button
              onClick={() => setKnown(null)}
              style={{ background: 'none', border: 'none', fontWeight: 700, fontSize: 13, textDecoration: 'underline', cursor: 'pointer', color: INK, fontFamily: 'inherit' }}
            >
              Not you? Join as someone else
            </button>
          </div>
        </>
      ) : (
        <div style={card}>
          <label style={label}>WHAT DO WE CALL YOU?</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push-up Pete"
            maxLength={40}
            style={{ ...input, marginBottom: 14 }}
          />

          <label style={label}>EMAIL</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={120}
            style={{ ...input, marginBottom: 6 }}
          />
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 16 }}>
            We email you a link so you can get back in from any phone or laptop. This is how we know it is you.
          </div>

          <label style={label}>YOUR COLORS</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className="nb"
                aria-label={c.name}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  background: c.hex,
                  border: `3px solid ${INK}`,
                  cursor: 'pointer',
                  boxShadow: color === c.hex ? `0 0 0 3px #FFE066, 0 0 0 6px ${INK}` : `3px 3px 0 ${INK}`,
                }}
              />
            ))}
            <div style={{ marginLeft: 'auto' }}>
              <SwoleGuy total={0} totalGoal={goal} color={color} size={62} />
            </div>
          </div>

          {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}

          <button
            onClick={() => join(false)}
            disabled={!newUserReady || busy}
            className="nb"
            style={btn('#FF5DA2', {
              width: '100%',
              color: '#fff',
              fontSize: 18,
              opacity: newUserReady && !busy ? 1 : 0.5,
              cursor: newUserReady && !busy ? 'pointer' : 'not-allowed',
            })}
          >
            {busy ? 'JOINING…' : 'JOIN THE SQUAD 💥'}
          </button>
        </div>
      )}
    </main>
  );
}
