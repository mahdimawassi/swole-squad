'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import Header from './Header';
import BoxOpener from './BoxOpener';
import { BADGES, BADGE_BY_KEY, nextVolumeGoal, type LifetimeStats } from '@/lib/badges';
import { ITEMS, ITEM_BY_KEY, RARITY_META, SLOT_META, RARITY_ORDER, type Slot } from '@/lib/items';
import { fmt } from '@/lib/challenge';
import type { User } from '@/lib/types';
import { INK, ARCHIVO, PAGE, card, btn, barOuter } from '@/lib/ui';

export default function Collection({
  user,
  stats,
  earned,
  owned,
  boxes,
}: {
  user: User;
  stats: LifetimeStats;
  earned: { badge_key: string; earned_at: string }[];
  owned: string[];
  boxes: { id: string; source: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'badges' | 'items'>('badges');
  const [equipped, setEquipped] = useState<Record<string, string>>(user.equipped ?? {});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const earnedKeys = new Set(earned.map((e) => e.badge_key));
  const ownedSet = new Set(owned);

  // Hidden badges stay secret until unlocked, which is what makes them fun.
  const visibleBadges = BADGES.filter((b) => !b.hidden || earnedKeys.has(b.key));
  const hiddenLeft = BADGES.filter((b) => b.hidden && !earnedKeys.has(b.key)).length;

  async function equip(slot: Slot, itemKey: string | null) {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const prev = equipped;
    const optimistic = { ...equipped };
    if (itemKey) optimistic[slot] = itemKey;
    else delete optimistic[slot];
    setEquipped(optimistic);
    try {
      const res = await fetch('/api/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: user.secret_token, slot, item_key: itemKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEquipped(prev);
        setNote(data?.error || 'Could not change that.');
      } else {
        router.refresh();
      }
    } catch {
      setEquipped(prev);
      setNote('Network error.');
    } finally {
      setBusy(false);
    }
  }

  const reps = stats.totalsByUnit['reps'] ?? 0;
  const km = stats.totalsByUnit['km'] ?? 0;
  const nextReps = nextVolumeGoal('reps', reps);
  const nextKm = km > 0 ? nextVolumeGoal('km', km) : null;

  return (
    <main style={PAGE}>
      <Header badge="COLLECTION" back={`/me/${user.secret_token}`} />

      {/* the avatar, wearing whatever is equipped */}
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SwoleGuy
            total={Math.min(reps + km * 30, 3000)}
            totalGoal={3000}
            color={user.avatar_color}
            size={170}
            style={user.avatar_style}
            equipped={equipped}
          />
        </div>
        <div style={{ fontFamily: ARCHIVO, fontSize: 21, marginTop: 4 }}>{user.name.toUpperCase()}</div>
        <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.7, marginTop: 2 }}>
          {earned.length} of {BADGES.length} badges · {owned.length} of {ITEMS.length} items
        </div>
      </div>

      {boxes.length > 0 && (
        <BoxOpener token={user.secret_token} boxes={boxes} avatarColor={user.avatar_color} avatarStyle={user.avatar_style} />
      )}

      {/* lifetime numbers */}
      <div style={{ ...card, padding: 14 }}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 15, marginBottom: 10 }}>ALL TIME</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Stat label="Best streak" value={`${stats.bestStreak}d`} emoji="🔥" />
          <Stat label="Days logged" value={String(stats.daysLogged)} emoji="📅" />
          <Stat label="Finished" value={String(stats.challengesCompleted)} emoji="🏁" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {Object.entries(stats.totalsByUnit).map(([unit, total]) => (
            <Stat key={unit} label={unit} value={fmt(total)} emoji="💪" />
          ))}
        </div>

        {nextReps && reps > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
              {fmt(nextReps.at - reps)} reps to “{nextReps.name}”
            </div>
            <div style={barOuter}>
              <div style={{ height: '100%', width: `${Math.min(100, (reps / nextReps.at) * 100)}%`, background: '#FF5DA2' }} />
            </div>
          </div>
        )}
        {nextKm && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
              {fmt(nextKm.at - km)} km to “{nextKm.name}”
            </div>
            <div style={barOuter}>
              <div style={{ height: '100%', width: `${Math.min(100, (km / nextKm.at) * 100)}%`, background: '#4D7CFF' }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {([['badges', `BADGES (${earned.length})`], ['items', `ITEMS (${owned.length})`]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="nb"
            style={btn(tab === k ? '#4D7CFF' : '#fff', { flex: 1, color: tab === k ? '#fff' : INK, fontSize: 14 })}
          >
            {l}
          </button>
        ))}
      </div>

      {note && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{note}</div>}

      {tab === 'badges' && (
        <>
          <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 10 }}>
            {visibleBadges.map((b) => {
              const got = earnedKeys.has(b.key);
              return (
                <div
                  key={b.key}
                  title={b.description}
                  style={{
                    textAlign: 'center',
                    padding: '10px 4px',
                    borderRadius: 12,
                    border: `2px solid ${got ? INK : 'rgba(20,20,20,.2)'}`,
                    background: got ? '#FFF3B0' : '#FAF7EC',
                    opacity: got ? 1 : 0.55,
                  }}
                >
                  <div style={{ fontSize: 26, filter: got ? 'none' : 'grayscale(1)' }}>{b.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, marginTop: 3, lineHeight: 1.2 }}>{b.name}</div>
                </div>
              );
            })}
          </div>
          {hiddenLeft > 0 && (
            <div style={{ ...card, textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 22 }}>🕵️</div>
              <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>
                {hiddenLeft} secret {hiddenLeft === 1 ? 'badge' : 'badges'} left to discover
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginTop: 2 }}>
                No hints. You will know when you get one.
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'items' && (
        <>
          {(Object.keys(SLOT_META) as Slot[]).map((slot) => {
            const slotItems = ITEMS.filter((i) => i.slot === slot).sort(
              (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
            );
            const wearing = equipped[slot];
            return (
              <div key={slot} style={{ ...card, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontFamily: ARCHIVO, fontSize: 14, flex: 1 }}>
                    {SLOT_META[slot].emoji} {SLOT_META[slot].label.toUpperCase()}
                  </div>
                  {wearing && (
                    <button
                      onClick={() => equip(slot, null)}
                      disabled={busy}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        color: INK,
                        opacity: 0.7,
                        fontFamily: 'inherit',
                      }}
                    >
                      Take off
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {slotItems.map((item) => {
                    const have = ownedSet.has(item.key);
                    const on = wearing === item.key;
                    const meta = RARITY_META[item.rarity];
                    return (
                      <button
                        key={item.key}
                        onClick={() => have && equip(slot, on ? null : item.key)}
                        disabled={!have || busy}
                        title={have ? `${item.name} · ${meta.label}` : 'Locked'}
                        className={have ? 'rx-pill' : undefined}
                        style={{
                          width: 66,
                          padding: '8px 2px 6px',
                          borderRadius: 12,
                          border: `3px solid ${on ? INK : have ? meta.color : 'rgba(20,20,20,.18)'}`,
                          background: on ? '#FFF3B0' : have ? '#fff' : '#FAF7EC',
                          cursor: have ? 'pointer' : 'not-allowed',
                          fontFamily: 'inherit',
                          color: INK,
                          opacity: have ? 1 : 0.5,
                        }}
                      >
                        <div style={{ fontSize: 22, filter: have ? 'none' : 'grayscale(1) opacity(.6)' }}>
                          {have ? item.emoji : '🔒'}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 800, marginTop: 3, lineHeight: 1.15 }}>
                          {have ? item.name : '???'}
                        </div>
                        <div style={{ fontSize: 8, fontWeight: 800, color: meta.color, marginTop: 1 }}>
                          {meta.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
            Items only come from boxes, and boxes only come from badges. Nothing here is for sale.
          </p>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div
      style={{
        flex: '1 1 30%',
        textAlign: 'center',
        background: '#FFF9E8',
        border: `2px solid ${INK}`,
        borderRadius: 12,
        padding: '8px 4px',
        minWidth: 80,
      }}
    >
      <div style={{ fontFamily: ARCHIVO, fontSize: 17, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 800, marginTop: 3 }}>
        {emoji} {label}
      </div>
    </div>
  );
}
