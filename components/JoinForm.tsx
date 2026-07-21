'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import { AVATAR_COLORS } from '@/lib/challenge';
import { INK, ARCHIVO, card, btn } from '@/lib/ui';

export default function JoinForm({
  code,
  challengeName,
  dailyGoal,
  durationDays,
}: {
  code: string;
  challengeName: string;
  dailyGoal: number;
  durationDays: number;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pick, setPick] = useState(AVATAR_COLORS[0].hex);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [existing, setExisting] = useState<string | null>(null);
  const totalGoal = dailyGoal * durationDays;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('swole_me');
      if (raw) {
        const m = JSON.parse(raw);
        if (m?.code === code && m?.token) setExisting(m.token);
      }
    } catch {
      // ignore unreadable storage
    }
  }, [code]);

  async function join() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, avatar_color: pick }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Could not join. Try again.');
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem('swole_me', JSON.stringify({ token: data.token, code, name: name.trim() }));
      } catch {
        // ignore
      }
      router.push(`/me/${data.token}`);
    } catch {
      setErr('Network error. Try again.');
      setBusy(false);
    }
  }

  const canJoin = name.trim().length > 0 && !busy;

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '18px 14px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 24, letterSpacing: 0.5 }}>🏋️ SWOLE SQUAD</div>
        <div style={{ background: INK, color: '#FFE066', padding: '5px 11px', borderRadius: 999, fontWeight: 800, fontSize: 11 }}>
          {challengeName.toUpperCase()}
        </div>
      </div>

      <div style={card}>
        {existing && (
          <div
            style={{
              background: '#FFF3B0',
              border: `3px solid ${INK}`,
              borderRadius: 14,
              padding: 12,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>Looks like you&rsquo;re already in this squad.</div>
            <button
              onClick={() => router.push(`/me/${existing}`)}
              className="nb"
              style={btn('#4D7CFF', { color: '#fff', padding: '9px 12px', fontSize: 13 })}
            >
              My gains →
            </button>
          </div>
        )}

        <div style={{ fontFamily: ARCHIVO, fontSize: 22, lineHeight: 1.1 }}>YOU&rsquo;RE IN THE HOT SEAT</div>
        <p style={{ fontWeight: 500, marginTop: 8, marginBottom: 18 }}>
          Someone roped you into <b>{challengeName}</b>: {dailyGoal} push-ups a day for {durationDays} days. On the final
          day the whole squad bangs out {dailyGoal} in one shot, in person. Pick a name and a color and let&rsquo;s go.
        </p>

        <label style={{ fontWeight: 800, fontSize: 13 }}>WHAT DO WE CALL YOU?</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') join();
          }}
          placeholder="e.g. Push-up Pete"
          maxLength={40}
          style={{
            width: '100%',
            border: `3px solid ${INK}`,
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 18,
            fontWeight: 700,
            background: '#FFF9E8',
            marginTop: 6,
            marginBottom: 16,
          }}
        />

        <label style={{ fontWeight: 800, fontSize: 13 }}>YOUR COLORS</label>
        <div style={{ display: 'flex', gap: 10, margin: '8px 0 18px', flexWrap: 'wrap' }}>
          {AVATAR_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => setPick(c.hex)}
              className="nb"
              aria-label={c.name}
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: c.hex,
                border: `3px solid ${INK}`,
                cursor: 'pointer',
                boxShadow: pick === c.hex ? `0 0 0 3px #FFE066, 0 0 0 6px ${INK}` : `3px 3px 0 ${INK}`,
                transform: pick === c.hex ? 'scale(1.06)' : 'none',
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: '#FFF9E8',
            border: `3px solid ${INK}`,
            borderRadius: 16,
            padding: 12,
            marginBottom: 18,
          }}
        >
          <SwoleGuy total={0} totalGoal={totalGoal} color={pick} size={110} />
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            <div style={{ fontFamily: ARCHIVO, fontSize: 15 }}>DAY 1 YOU.</div>
            Fragile. Untested. Full of potential. This guy grows every single time you log.
          </div>
        </div>

        {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <button
          onClick={join}
          disabled={!canJoin}
          className="nb"
          style={btn('#FF5DA2', {
            width: '100%',
            fontSize: 18,
            color: '#fff',
            opacity: canJoin ? 1 : 0.5,
            cursor: canJoin ? 'pointer' : 'not-allowed',
          })}
        >
          {busy ? 'JOINING…' : 'JOIN THE SQUAD 💥'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, opacity: 0.7, marginTop: 12, marginBottom: 0 }}>
          No password. We save your spot with a private link you can bookmark.
        </p>
      </div>
    </main>
  );
}
