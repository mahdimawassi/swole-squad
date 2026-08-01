'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import { RARITY_META, type Item } from '@/lib/items';
import { INK, ARCHIVO, card, btn } from '@/lib/ui';

type Phase = 'idle' | 'shaking' | 'revealed';

export default function BoxOpener({
  token,
  boxes,
  avatarColor,
  avatarStyle,
}: {
  token: string;
  boxes: { id: string; source: string }[];
  avatarColor: string;
  avatarStyle?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [item, setItem] = useState<Item | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [opened, setOpened] = useState(0);

  const remaining = boxes.length - opened;
  if (remaining <= 0 && phase !== 'revealed') return null;

  async function open() {
    if (phase !== 'idle') return;
    const box = boxes[opened];
    if (!box) return;

    setErr(null);
    setPhase('shaking');

    // Fire the request immediately, but hold the reveal until the shake has had
    // time to land. Anticipation is most of the fun.
    const request = fetch('/api/box', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, box_id: box.id }),
    }).then((r) => r.json());

    const [data] = await Promise.all([request, new Promise((r) => setTimeout(r, 1150))]);

    if (!data?.ok) {
      setErr(data?.error || 'Could not open it.');
      setPhase('idle');
      return;
    }
    setItem(data.item as Item);
    setPhase('revealed');
    setOpened((n) => n + 1);
  }

  function next() {
    setItem(null);
    setPhase('idle');
    router.refresh();
  }

  const rarity = item ? RARITY_META[item.rarity] : null;

  return (
    <div style={{ ...card, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {phase !== 'revealed' && (
        <>
          <div style={{ fontFamily: ARCHIVO, fontSize: 17 }}>
            {remaining} {remaining === 1 ? 'BOX' : 'BOXES'} TO OPEN
          </div>
          <p style={{ fontWeight: 600, fontSize: 13, margin: '6px 0 10px' }}>
            Earned from your badges. Something in here goes on your guy.
          </p>

          <button
            onClick={open}
            disabled={phase === 'shaking'}
            aria-label="Open box"
            style={{
              background: 'none',
              border: 'none',
              cursor: phase === 'shaking' ? 'default' : 'pointer',
              padding: 0,
              margin: '4px auto 10px',
              display: 'block',
            }}
          >
            <div className={phase === 'shaking' ? 'box-shaking' : 'box-idle'}>
              <BoxArt />
            </div>
          </button>

          {phase === 'shaking' && <div className="box-flash" style={flashStyle} />}

          {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13 }}>{err}</div>}

          {phase === 'idle' && (
            <button onClick={open} className="nb" style={btn('#FF5DA2', { width: '100%', color: '#fff', fontSize: 17 })}>
              OPEN IT 🎁
            </button>
          )}
        </>
      )}

      {phase === 'revealed' && item && rarity && (
        <div style={{ position: 'relative' }}>
          {/* rays behind anything better than common */}
          {item.rarity !== 'common' && (
            <svg
              className="reveal-rays"
              viewBox="0 0 200 200"
              style={{ position: 'absolute', top: -30, left: '50%', marginLeft: -140, width: 280, height: 280, opacity: 0.35 }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <path
                  key={i}
                  d="M 100 100 L 92 0 L 108 0 Z"
                  fill={rarity.glow}
                  transform={`rotate(${i * 30} 100 100)`}
                />
              ))}
            </svg>
          )}

          {item.rarity === 'legendary' && <Confetti />}

          <div className="reveal-item" style={{ position: 'relative' }}>
            <div style={{ fontSize: 62, lineHeight: 1.1 }}>{item.emoji}</div>
          </div>

          <div className="reveal-text" style={{ position: 'relative' }}>
            <div
              style={{
                display: 'inline-block',
                background: rarity.color,
                color: '#fff',
                border: `3px solid ${INK}`,
                borderRadius: 999,
                padding: '4px 14px',
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: 1,
                marginTop: 6,
                boxShadow: `3px 3px 0 ${INK}`,
              }}
            >
              {rarity.label.toUpperCase()}
            </div>
            <div style={{ fontFamily: ARCHIVO, fontSize: 22, marginTop: 10 }}>{item.name}</div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <SwoleGuy
                total={72}
                totalGoal={100}
                color={avatarColor}
                size={130}
                style={avatarStyle}
                equipped={{ [item.slot]: item.key }}
              />
            </div>

            <button onClick={next} className="nb" style={btn('#37C871', { width: '100%', color: '#fff', fontSize: 16, marginTop: 6 })}>
              {remaining > 0 ? `NICE — ${remaining} MORE TO OPEN` : 'ADD IT TO MY COLLECTION'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BoxArt() {
  return (
    <svg viewBox="0 0 120 110" width="128" height="118" style={{ display: 'block' }}>
      <rect x="14" y="42" width="92" height="60" rx="8" fill="#FF5DA2" stroke={INK} strokeWidth="4" />
      <rect x="8" y="26" width="104" height="26" rx="7" fill="#FF8AC0" stroke={INK} strokeWidth="4" />
      <rect x="52" y="26" width="16" height="76" fill="#FFD54A" stroke={INK} strokeWidth="3" />
      <path d="M 60 26 q -22 -22 -30 -6 q -4 10 30 6 z" fill="#FFD54A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M 60 26 q 22 -22 30 -6 q 4 10 -30 6 z" fill="#FFD54A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function Confetti() {
  const colors = ['#FF5DA2', '#4D7CFF', '#37C871', '#FFD54A', '#9B6DFF'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={{
            left: `${(i * 4.6) % 96}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 7) * 0.09}s`,
          }}
        />
      ))}
    </div>
  );
}

const flashStyle: React.CSSProperties = {
  position: 'absolute',
  top: '38%',
  left: '50%',
  width: 140,
  height: 140,
  marginLeft: -70,
  marginTop: -70,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #fff 0%, #FFD54A 45%, transparent 70%)',
  pointerEvents: 'none',
};
