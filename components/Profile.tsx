'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy, { AVATAR_STYLES } from './SwoleGuy';
import Header from './Header';
import { AVATAR_COLORS, isEmail } from '@/lib/challenge';
import type { User } from '@/lib/types';
import { INK, ARCHIVO, PAGE, card, btn, input, label } from '@/lib/ui';

export default function Profile({ user, challengeCount }: { user: User; challengeCount: number }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? '');
  const [color, setColor] = useState(user.avatar_color);
  const [avatarStyle, setAvatarStyle] = useState(user.avatar_style ?? 'classic');
  const [remindersOff, setRemindersOff] = useState(user.reminders_opt_out === true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const dirty =
    name.trim() !== user.name ||
    email.trim().toLowerCase() !== (user.email ?? '') ||
    color !== user.avatar_color ||
    avatarStyle !== (user.avatar_style ?? 'classic') ||
    remindersOff !== (user.reminders_opt_out === true);
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
          avatar_style: avatarStyle,
          reminders_opt_out: remindersOff,
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
          <SwoleGuy total={60} totalGoal={100} color={color} size={110} style={avatarStyle} />
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

        <label style={label}>CHARACTER</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {AVATAR_STYLES.map((st) => (
            <button
              key={st.key}
              onClick={() => setAvatarStyle(st.key)}
              className="nb"
              aria-label={st.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '8px 6px 4px',
                width: 74,
                background: avatarStyle === st.key ? '#FFF3B0' : '#fff',
                border: `3px solid ${INK}`,
                borderRadius: 14,
                boxShadow: avatarStyle === st.key ? 'none' : `4px 4px 0 ${INK}`,
                transform: avatarStyle === st.key ? 'translate(4px,4px)' : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <SwoleGuy total={55} totalGoal={100} color={color} size={48} style={st.key} />
              <span style={{ fontSize: 11, fontWeight: 800 }}>{st.label}</span>
            </button>
          ))}
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

      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: ARCHIVO, fontSize: 15 }}>DAILY REMINDERS</div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.75, marginTop: 2 }}>
            A midday nudge if you have not logged yet. Email only.
          </div>
        </div>
        <button
          onClick={() => setRemindersOff((v) => !v)}
          aria-label="Toggle reminders"
          className="nb"
          style={{
            width: 62,
            height: 34,
            borderRadius: 999,
            border: `3px solid ${INK}`,
            background: remindersOff ? '#EFE6C6' : '#37C871',
            position: 'relative',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: `3px 3px 0 ${INK}`,
          }}
        >
          <span style={{ position: 'absolute', top: 2, left: remindersOff ? 2 : 30, width: 24, height: 24, borderRadius: 999, background: '#fff', border: `2px solid ${INK}`, transition: 'left .15s ease' }} />
        </button>
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
