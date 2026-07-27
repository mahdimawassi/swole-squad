'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import Header from './Header';
import EmailGate from './EmailGate';
import { usePrefetch } from './Nav';
import {
  getSwole,
  totalGoalFor,
  dailyTarget,
  goalLabel,
  emojiFor,
  phaseOf,
  challengeDay,
  paceFor,
  metToday,
  goalReached,
  needsYouToday,
  todayStr,
  fmt,
  clamp,
} from '@/lib/challenge';
import type { User, HubEntry } from '@/lib/types';
import { INK, ARCHIVO, card, btn, barOuter } from '@/lib/ui';

export default function Hub({
  user,
  entries,
  justCreated,
}: {
  user: User;
  entries: HubEntry[];
  justCreated?: string;
}) {
  const router = useRouter();
  const [today, setToday] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showBanner, setShowBanner] = useState(Boolean(justCreated));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setToday(todayStr());
    // Opening your link on a new device is what makes it remember you there.
    try {
      localStorage.setItem(
        'swole_me',
        JSON.stringify({ token: user.secret_token, name: user.name, email: user.email ?? '' }),
      );
    } catch {
      // ignore
    }
  }, [user]);

  function showToast(msg: string) {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2300);
  }

  const sorted = useMemo(() => {
    if (!today) return entries;
    const rank = (e: HubEntry) => {
      const ph = phaseOf(e.challenge, today);
      if (needsYouToday(e.challenge, e.today, e.total, today)) return 0; // still owes today
      if (ph === 'active') return 1;
      if (ph === 'upcoming') return 2;
      return 3;
    };
    return [...entries].sort((a, b) => rank(a) - rank(b));
  }, [entries, today]);

  const needsToday = today
    ? entries.filter((e) => needsYouToday(e.challenge, e.today, e.total, today)).length
    : 0;

  const newChallenge = justCreated
    ? entries.find((e) => e.challenge.invite_code === justCreated)
    : undefined;

  async function quickLog(e: HubEntry) {
    if (busyId) return;
    const amount = dailyTarget(e.challenge);
    setBusyId(e.challenge.id);
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: user.secret_token,
          challenge_id: e.challenge.id,
          amount,
          day: today || todayStr(),
          mode: 'add',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Could not save.');
        setBusyId(null);
        return;
      }
      const goal = totalGoalFor(e.challenge);
      const before = getSwole(e.total, goal).tier;
      const after = getSwole(e.total + amount, goal);
      showToast(
        after.tier > before
          ? `💪 LEVEL UP — ${after.title.toUpperCase()}!`
          : `🔥 +${fmt(amount)} ${e.challenge.unit_label} logged.`,
      );
      router.refresh();
    } catch {
      showToast('Network error.');
    } finally {
      setBusyId(null);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  usePrefetch([
    '/new',
    '/join',
    `/me/${user.secret_token}/profile`,
    ...entries.map((e) => `/me/${user.secret_token}/c/${e.challenge.id}`),
  ]);

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '18px 14px 110px' }}>
      {!user.email && <EmailGate token={user.secret_token} name={user.name} />}

      <Header
        badge={user.name.toUpperCase()}
        badgeHref={`/me/${user.secret_token}/profile`}
        sub={
          needsToday > 0
            ? `${needsToday} challenge${needsToday === 1 ? '' : 's'} still need you today 👀`
            : entries.length > 0
              ? 'All caught up. Look at you.'
              : undefined
        }
      />

      {showBanner && justCreated && (
        <div style={{ ...card, background: '#FFF3B0', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: ARCHIVO, fontSize: 17 }}>🎉 CHALLENGE CREATED</div>
              <p style={{ fontWeight: 600, fontSize: 13, margin: '6px 0 0' }}>
                Share this code so your crew can jump in.
              </p>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              aria-label="Dismiss"
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                fontWeight: 900,
                cursor: 'pointer',
                lineHeight: 1,
                color: INK,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
          <div
            style={{
              fontFamily: ARCHIVO,
              fontSize: 30,
              letterSpacing: 4,
              background: '#fff',
              border: `3px solid ${INK}`,
              borderRadius: 14,
              padding: '10px 8px',
              margin: '12px 0 10px',
              textAlign: 'center',
            }}
          >
            {justCreated}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${origin}/join/${justCreated}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                } catch {
                  // ignore
                }
              }}
              className="nb"
              style={btn('#FF5DA2', { color: '#fff', flex: 1, fontSize: 15 })}
            >
              {copied ? 'COPIED ✅' : 'COPY LINK'}
            </button>
            {newChallenge && (
              <button
                onClick={() => router.push(`/me/${user.secret_token}/c/${newChallenge.challenge.id}`)}
                className="nb"
                style={btn('#fff', { flex: 1, fontSize: 15 })}
              >
                Open it →
              </button>
            )}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SwoleGuy total={0} totalGoal={100} color={user.avatar_color} size={110} style={user.avatar_style} />
          </div>
          <div style={{ fontFamily: ARCHIVO, fontSize: 19, marginTop: 6 }}>NOTHING GOING ON</div>
          <p style={{ fontWeight: 600, fontSize: 13, marginTop: 6, marginBottom: 0 }}>
            You&rsquo;re not in any challenges yet. Start one or punch in a code below.
          </p>
        </div>
      )}

      {sorted.map((e) => {
        const c = e.challenge;
        const goal = totalGoalFor(c);
        const lv = getSwole(e.total, goal);
        const ph = today ? phaseOf(c, today) : 'active';
        const day = today ? clamp(challengeDay(c, today), 0, c.duration_days) : 0;
        const pace = today ? paceFor(c, e.total, today) : null;
        const finishedGoal = goalReached(c, e.total);
        const doneToday = metToday(c, e.today, e.total);
        const target = dailyTarget(c);
        const open = () => router.push(`/me/${user.secret_token}/c/${c.id}`);

        return (
          <div key={c.id} style={{ ...card, padding: 14 }}>
            <div
              onClick={open}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') open();
              }}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 22 }}>{emojiFor(c.activity)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: ARCHIVO,
                      fontSize: 16,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>
                    {goalLabel(c)} · {e.squadSize} in
                  </div>
                </div>
                {today && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      background: doneToday ? '#37C871' : ph === 'active' ? '#FFD54A' : '#EFE6C6',
                      border: `2px solid ${INK}`,
                      borderRadius: 999,
                      padding: '4px 9px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ph === 'upcoming'
                      ? 'SOON'
                      : ph === 'done'
                        ? 'DONE'
                        : finishedGoal
                          ? '🏆 GOAL MET'
                          : doneToday
                            ? '✅ TODAY'
                            : `DAY ${day}`}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <SwoleGuy total={e.total} totalGoal={goal} color={user.avatar_color} size={62} style={user.avatar_style} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                    <span>{lv.title}</span>
                    <span>#{e.rank}</span>
                  </div>
                  <div style={barOuter}>
                    <div
                      style={{
                        height: '100%',
                        width: `${lv.pct}%`,
                        background: user.avatar_color,
                        transition: 'width .45s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, marginTop: 4 }}>
                    {fmt(e.total)} / {fmt(goal)} {c.unit_label}
                    {e.streak > 0 && today ? ` · 🔥${e.streak}` : ''}
                  </div>
                </div>
              </div>

              {today && pace && ph === 'active' && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    marginTop: 10,
                    padding: '6px 10px',
                    borderRadius: 10,
                    background:
                      pace.status === 'behind' ? '#FFD9E2' : pace.status === 'ahead' ? '#D9F7E5' : '#FFF3B0',
                    border: `2px solid ${INK}`,
                  }}
                >
                  {pace.status === 'behind'
                    ? `😬 Behind pace. ${fmt(pace.perDay)} ${c.unit_label}/day to catch up.`
                    : pace.status === 'ahead'
                      ? '😎 Ahead of pace. Show-off.'
                      : `🎯 On pace. Keep at ${fmt(pace.perDay)} ${c.unit_label}/day.`}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {ph === 'active' && !finishedGoal && (
                <button
                  onClick={() => quickLog(e)}
                  disabled={busyId === c.id}
                  className="nb"
                  style={btn(doneToday ? '#FFD54A' : '#37C871', {
                    flex: 1,
                    color: doneToday ? INK : '#fff',
                    fontSize: 15,
                    opacity: busyId === c.id ? 0.6 : 1,
                  })}
                >
                  {busyId === c.id ? '…' : doneToday ? `Add more (+${fmt(target)})` : `+${fmt(target)} ${c.unit_label}`}
                </button>
              )}
              <button onClick={open} className="nb" style={btn('#fff', { flex: ph === 'active' && !finishedGoal ? 0.8 : 1, fontSize: 15 })}>
                Open →
              </button>
            </div>
          </div>
        );
      })}

      <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, opacity: 0.65, marginTop: 18 }}>
        Bookmark this page. It&rsquo;s your key, and it works on any device.
      </p>

      {/* Always reachable, however many challenges are stacked above. */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFE066',
          borderTop: `3px solid ${INK}`,
          padding: '12px 14px',
          zIndex: 40,
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', gap: 10 }}>
          <button onClick={() => router.push('/new')} className="nb" style={btn('#FF5DA2', { flex: 1, color: '#fff', fontSize: 15 })}>
            🚀 New
          </button>
          <button onClick={() => router.push('/join')} className="nb" style={btn('#4D7CFF', { flex: 1, color: '#fff', fontSize: 15 })}>
            🎟️ Join
          </button>
        </div>
      </div>

      {toast && (
        <div
          className="toast"
          style={{
            position: 'fixed',
            bottom: 92,
            left: '50%',
            background: INK,
            color: '#FFE066',
            padding: '13px 22px',
            borderRadius: 14,
            fontFamily: ARCHIVO,
            fontSize: 15,
            boxShadow: '4px 4px 0 #B98F00',
            border: `3px solid ${INK}`,
            zIndex: 50,
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}
