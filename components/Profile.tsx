'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import Header from './Header';
import { AVATAR_COLORS, isEmail } from '@/lib/challenge';
import type { User } from '@/lib/types';
import { INK, ARCHIVO, PAGE, card, btn, input, label } from '@/lib/ui';

export default function Profile({ user, challengeCount }: { user: User; challengeCount: number }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? '');
  const [color, setColor] = useState(user.avatar_color);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const dirty = name.trim() !== user.name || email.trim().toLowerCase() !== (user.email ?? '') || color !== user.avatar_color;
  const valid = name.trim().length > 0 && isEmail(email);

  async function save() {
    if (!dirty || !valid || busy) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: user.secret_token,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          avatar_color: color,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Could not save your changes.');
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem(
          'swole_me',
          JSON.stringify({ token: user.secret_token, name: name.trim(), email: email.trim().toLowerCase() }),
        );
      } catch {
        // ignore
      }
      setMsg(data.emailed ? 'Saved. We sent your link to the new address.' : 'Saved.');
      router.refresh();
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const myLink = `${origin}/me/${user.secret_token}`;

  return (
    <main style={PAGE}>
      <Header badge="PROFILE" back={`/me/${user.secret_token}`} />

      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SwoleGuy total={0} totalGoal={100} color={color} size={110} />
        </div>
        <div style={{ fontFamily: ARCHIVO, fontSize: 20, marginTop: 4 }}>{name.toUpperCase() || 'YOU'}</div>
        <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.7, marginTop: 4 }}>
          In {challengeCount} challenge{challengeCount === 1 ? '' : 's'}
        </div>
      </div>

      <div style={card}>
        <label style={label}>NAME</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Your name"
          style={{ ...input, marginBottom: 16 }}
        />

        <label style={label}>EMAIL</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={120}
          placeholder="you@email.com"
          style={{ ...input, marginBottom: 6 }}
        />
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 16 }}>
          Change this and we&rsquo;ll send your access link to the new address.
        </div>

        <label style={label}>COLOUR</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginTop: 10 }}>
          Your name and colour are the same in every challenge you are in.
        </div>
      </div>

      {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {msg && <div style={{ color: '#1E7F45', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      <button
        onClick={save}
        disabled={!dirty || !valid || busy}
        className="nb"
        style={btn('#FF5DA2', {
          width: '100%',
          color: '#fff',
          fontSize: 17,
          marginBottom: 16,
          opacity: dirty && valid && !busy ? 1 : 0.5,
          cursor: dirty && valid && !busy ? 'pointer' : 'not-allowed',
        })}
      >
        {busy ? 'SAVING…' : dirty ? 'SAVE CHANGES' : 'NOTHING TO SAVE'}
      </button>

      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 12 }}>YOUR PRIVATE LINK</div>
          <div style={{ fontSize: 12, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {myLink}
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(myLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              // ignore
            }
          }}
          className="nb"
          style={btn('#fff', { padding: '9px 12px', fontSize: 13 })}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.65, textAlign: 'center', marginTop: 0 }}>
        Anyone with that link can log as you, so keep it to yourself.
      </p>
    </main>
  );
}
