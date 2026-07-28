'use client';

import { useEffect, useRef, useState } from 'react';
import { REACTION_EMOJIS } from '@/lib/challenge';
import type { ReactionSummary } from '@/lib/types';
import { INK } from '@/lib/ui';

// "2h ago" style freshness, since reactions only live 24 hours.
function ago(iso: string): string {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default function Reactions({
  summary,
  nameFor,
  meId,
  onReact,
}: {
  summary: ReactionSummary | undefined;
  nameFor: (userId: string) => string;
  meId: string;
  onReact: (emoji: string) => Promise<boolean>;
}) {
  // Optimistic overlay. A tap updates the pill instantly and the server catches
  // up behind it, so the row never feels like it is waiting on the network.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [picker, setPicker] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);

  // Close the picker / detail when tapping elsewhere.
  useEffect(() => {
    if (!picker && !detail) return;
    function onDoc(e: MouseEvent | TouchEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) {
        setPicker(false);
        setDetail(null);
      }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [picker, detail]);

  // Merge the server state with any taps that have not landed yet.
  const view = REACTION_EMOJIS.map((emoji) => {
    const cell = summary?.[emoji];
    const serverMine = cell?.mine ?? false;
    const override = pending[emoji];
    const mine = override === undefined ? serverMine : override;
    let count = cell?.count ?? 0;
    if (override !== undefined && override !== serverMine) count += override ? 1 : -1;
    const who = (cell?.who ?? []).filter((id) => (override === false ? id !== meId : true));
    const names = who.map(nameFor);
    if (override === true && !serverMine) names.unshift('You');
    return { emoji, count: Math.max(0, count), mine, names, latest: cell?.latest };
  }).filter((r) => r.count > 0);

  async function tap(emoji: string) {
    const current = view.find((v) => v.emoji === emoji)?.mine ?? false;
    setPending((p) => ({ ...p, [emoji]: !current })); // instant
    setPicker(false);
    const nowOn = await onReact(emoji);
    // Reconcile with what the server actually did.
    setPending((p) => ({ ...p, [emoji]: nowOn }));
  }

  const shown = detail ? view.find((v) => v.emoji === detail) : null;

  return (
    <div ref={wrap} style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {view.map((r) => (
          <button
            key={r.emoji}
            onClick={() => setDetail(detail === r.emoji ? null : r.emoji)}
            className="rx-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: r.mine ? '#FFE9A6' : '#fff',
              border: `2px solid ${r.mine ? INK : 'rgba(20,20,20,.28)'}`,
              borderRadius: 999,
              padding: '4px 10px 4px 8px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: INK,
              lineHeight: 1.2,
            }}
            aria-label={`${r.emoji} from ${joinNames(r.names)}`}
          >
            <span style={{ fontSize: 15 }}>{r.emoji}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.count}</span>
          </button>
        ))}

        <button
          onClick={() => {
            setPicker((v) => !v);
            setDetail(null);
          }}
          className="rx-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            background: picker ? '#FFE9A6' : '#fff',
            border: `2px solid rgba(20,20,20,.28)`,
            borderRadius: 999,
            padding: '4px 11px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            color: INK,
            fontFamily: 'inherit',
            lineHeight: 1.2,
          }}
          aria-label="Add a reaction"
        >
          <span style={{ fontSize: 14, opacity: 0.75 }}>☺</span>
          <span style={{ fontSize: 15, opacity: 0.55, fontWeight: 900 }}>+</span>
        </button>
      </div>

      {picker && (
        <div
          className="rx-picker"
          style={{
            display: 'inline-flex',
            gap: 2,
            marginTop: 8,
            background: '#fff',
            border: `3px solid ${INK}`,
            borderRadius: 999,
            boxShadow: `4px 4px 0 ${INK}`,
            padding: '5px 8px',
          }}
        >
          {REACTION_EMOJIS.map((emoji, i) => (
            <button
              key={emoji}
              onClick={() => tap(emoji)}
              className="rx-emoji"
              style={{
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                padding: '4px 6px',
                lineHeight: 1,
                animationDelay: `${i * 28}ms`,
              }}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {shown && (
        <div
          style={{
            marginTop: 8,
            background: '#FFF9E8',
            border: `2px solid ${INK}`,
            borderRadius: 12,
            padding: '8px 11px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: 14, marginRight: 6 }}>{shown.emoji}</span>
          {joinNames(shown.names)}
          {shown.latest && (
            <span style={{ opacity: 0.6, fontWeight: 600 }}> · {ago(shown.latest)}</span>
          )}
          <div style={{ opacity: 0.55, fontWeight: 600, marginTop: 3, fontSize: 11 }}>
            Reactions fade after 24 hours.
          </div>
        </div>
      )}
    </div>
  );
}
