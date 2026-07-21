'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import { computeStats, getSwole, challengeDay, todayStr, clamp } from '@/lib/challenge';
import type { Participant, Challenge, LogRow } from '@/lib/types';
import { INK, ARCHIVO, card, btn, barOuter } from '@/lib/ui';

export default function Dashboard({
  token,
  me,
  challenge,
  squad,
  logs,
}: {
  token: string;
  me: Participant;
  challenge: Challenge;
  squad: Participant[];
  logs: LogRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'me' | 'squad'>('me');
  const [today, setToday] = useState<string>('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [flexing, setFlexing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set the day only on the client to avoid any server/client hydration mismatch.
  useEffect(() => {
    setToday(todayStr());
  }, []);

  const totalGoal = challenge.daily_goal * challenge.duration_days;

  // Props are the source of truth. Everything below is derived on each render.
  const stats = useMemo(() => computeStats(squad, logs, today), [squad, logs, today]);
  const ranked = useMemo(() => [...stats].sort((a, b) => b.total - a.total), [stats]);
  const mine =
    stats.find((s) => s.participant.id === me.id) ?? { participant: me, total: 0, today: 0, streak: 0 };
  const myRank = ranked.findIndex((s) => s.participant.id === me.id) + 1;
  const groupTotal = stats.reduce((sum, s) => sum + s.total, 0);
  const level = getSwole(mine.total, totalGoal);

  const cDay = today ? challengeDay(challenge.start_date, today) : 0;
  const daysToShowdown = Math.max(0, challenge.duration_days - cDay);
  const notStarted = today ? cDay < 1 : false;
  const finished = today ? cDay > challenge.duration_days : false;

  let showdownHeadline = '⚡ THE SHOWDOWN AWAITS';
  if (today) {
    if (notStarted) {
      const d = 1 - cDay;
      showdownHeadline = `⏳ STARTS IN ${d} DAY${d === 1 ? '' : 'S'}`;
    } else if (finished) {
      showdownHeadline = '🏆 CHALLENGE COMPLETE';
    } else if (daysToShowdown === 0) {
      showdownHeadline = '⚡ SHOWDOWN DAY — NOW';
    } else {
      showdownHeadline = `⚡ ${daysToShowdown} DAY${daysToShowdown === 1 ? '' : 'S'} TO THE SHOWDOWN`;
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2300);
  }

  async function logReps(n: number) {
    if (busy) return;
    const reps = Math.floor(n);
    if (!Number.isFinite(reps) || reps <= 0) {
      showToast('Enter a real number 💪');
      return;
    }
    const day = today || todayStr();
    const oldTier = getSwole(mine.total, totalGoal).tier;
    const next = getSwole(mine.total + reps, totalGoal);
    setBusy(true);
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reps, day }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Could not save.');
        setBusy(false);
        return;
      }
      setInput('');
      setFlexing(true);
      setTimeout(() => setFlexing(false), 560);
      showToast(next.tier > oldTier ? `💪 LEVEL UP — ${next.title.toUpperCase()}!` : `🔥 +${reps} logged. Keep going.`);
      router.refresh();
    } catch {
      showToast('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard blocked; ignore
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/join/${challenge.invite_code}`;
  const myLink = `${origin}/me/${token}`;

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '18px 14px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 24, letterSpacing: 0.5 }}>🏋️ SWOLE SQUAD</div>
        <div style={{ background: INK, color: '#FFE066', padding: '5px 11px', borderRadius: 999, fontWeight: 800, fontSize: 11, letterSpacing: 0.5 }}>
          {challenge.name.toUpperCase()} · {challenge.daily_goal}/DAY
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {(['me', 'squad'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="nb"
            style={btn(tab === k ? '#4D7CFF' : '#fff', { flex: 1, color: tab === k ? '#fff' : INK })}
          >
            {k === 'me' ? 'MY GAINS' : 'THE SQUAD'}
          </button>
        ))}
      </div>

      {tab === 'me' && (
        <>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SwoleGuy total={mine.total} totalGoal={totalGoal} color={me.avatar_color} size={190} flexing={flexing} />
            </div>
            <div style={{ fontFamily: ARCHIVO, fontSize: 24, marginTop: 6 }}>{me.name.toUpperCase()}</div>
            <div
              style={{
                display: 'inline-block',
                background: me.avatar_color,
                border: `3px solid ${INK}`,
                borderRadius: 999,
                padding: '5px 16px',
                fontWeight: 900,
                marginTop: 8,
                boxShadow: `3px 3px 0 ${INK}`,
              }}
            >
              {level.title}
            </div>
            <div style={{ margin: '16px 0 6px' }}>
              <Bar pct={level.pct} color={me.avatar_color} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>
              {mine.total.toLocaleString()} / {totalGoal.toLocaleString()} lifetime reps to SWOLE GOD
            </div>
          </div>

          <div style={card}>
            <div style={{ fontFamily: ARCHIVO, fontSize: 16, marginBottom: 4 }}>HOW MANY TODAY?</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              {today
                ? `${mine.today.toLocaleString()} / ${challenge.daily_goal} today${
                    mine.today >= challenge.daily_goal ? ' — goal smashed ✅' : ''
                  }`
                : 'Loading today…'}
            </div>
            <div style={{ marginBottom: 14 }}>
              <Bar pct={today ? (mine.today / challenge.daily_goal) * 100 : 0} color="#37C871" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[10, 25, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => logReps(n)}
                  disabled={busy}
                  className="nb"
                  style={btn('#FFD54A', { flex: 1, padding: '11px 0', opacity: busy ? 0.6 : 1 })}
                >
                  +{n}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = parseInt(input, 10);
                    if (!Number.isNaN(v)) logReps(v);
                  }
                }}
                type="number"
                inputMode="numeric"
                placeholder="custom #"
                style={{
                  flex: 1,
                  border: `3px solid ${INK}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 16,
                  fontWeight: 700,
                  background: '#FFF9E8',
                }}
              />
              <button
                onClick={() => {
                  const v = parseInt(input, 10);
                  if (Number.isNaN(v)) {
                    showToast('Enter a number 💪');
                    return;
                  }
                  logReps(v);
                }}
                disabled={busy}
                className="nb"
                style={btn('#FF5DA2', { color: '#fff', opacity: busy ? 0.6 : 1 })}
              >
                LOG IT
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <Stat emoji="🔥" label="STREAK" value={today ? String(mine.streak) : '—'} />
            <Stat emoji="🏆" label="RANK" value={`#${myRank || 1}`} />
            <Stat emoji="⏰" label="TO D-DAY" value={today ? String(daysToShowdown) : '—'} />
          </div>

          <div style={card}>
            <div style={{ fontFamily: ARCHIVO, fontSize: 16, marginBottom: 12 }}>YOUR {challenge.duration_days}-DAY GLOW-UP</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
              {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
                const dayLabel = i === 0 ? 1 : Math.round(frac * challenge.duration_days);
                return (
                  <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <SwoleGuy total={Math.round(frac * totalGoal)} totalGoal={totalGoal} color={me.avatar_color} size={60} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, marginTop: 2 }}>Day {dayLabel}</div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.75, marginTop: 12, marginBottom: 0, textAlign: 'center' }}>
              Log every day and that&rsquo;s where you end up. Future you is watching.
            </p>
          </div>

          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 12 }}>YOUR PRIVATE LINK</div>
              <div style={{ fontSize: 12, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {myLink}
              </div>
            </div>
            <button onClick={() => copy(myLink, 'link')} className="nb" style={btn('#fff', { padding: '9px 12px', fontSize: 13 })}>
              {copied === 'link' ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div
            style={{
              background: INK,
              color: '#FFE066',
              border: `3px solid ${INK}`,
              borderRadius: 20,
              boxShadow: '6px 6px 0 #B98F00',
              padding: 18,
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: ARCHIVO, fontSize: 22 }}>{showdownHeadline}</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 6, color: '#fff' }}>
              {challenge.daily_goal} push-ups. One shot. Everyone watching.
            </div>
          </div>
        </>
      )}

      {tab === 'squad' && (
        <>
          <div style={{ ...card, textAlign: 'center', paddingTop: 14, paddingBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>The pack has cranked out</div>
            <div style={{ fontFamily: ARCHIVO, fontSize: 34, lineHeight: 1.1 }}>{groupTotal.toLocaleString()}</div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>reps and counting 💪</div>
          </div>

          {ranked.map((s, i) => {
            const isMe = s.participant.id === me.id;
            const lv = getSwole(s.total, totalGoal);
            return (
              <div
                key={s.participant.id}
                style={{ ...card, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, background: isMe ? '#FFF3B0' : '#fff' }}
              >
                <div style={{ fontFamily: ARCHIVO, fontSize: 20, width: 34, textAlign: 'center' }}>{i === 0 ? '👑' : `#${i + 1}`}</div>
                <div style={{ width: 54, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  <SwoleGuy total={s.total} totalGoal={totalGoal} color={s.participant.avatar_color} size={54} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: ARCHIVO, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.participant.name}
                    {isMe ? ' (you)' : ''}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>
                    {lv.title} · 🔥{today ? s.streak : 0}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: ARCHIVO, fontSize: 17 }}>{s.total.toLocaleString()}</div>
                  <div style={{ fontSize: 11, fontWeight: 800 }}>{today ? (s.today > 0 ? '✅ today' : '⏳ pending') : ''}</div>
                </div>
              </div>
            );
          })}

          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 12 }}>INVITE A FRIEND</div>
              <div style={{ fontSize: 12, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inviteUrl}
              </div>
            </div>
            <button
              onClick={() => copy(inviteUrl, 'invite')}
              className="nb"
              style={btn('#FF5DA2', { color: '#fff', padding: '9px 12px', fontSize: 13 })}
            >
              {copied === 'invite' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </>
      )}

      {toast && (
        <div
          className="toast"
          style={{
            position: 'fixed',
            bottom: 22,
            left: '50%',
            background: INK,
            color: '#FFE066',
            padding: '13px 22px',
            borderRadius: 14,
            fontFamily: ARCHIVO,
            fontSize: 15,
            boxShadow: '4px 4px 0 #B98F00',
            border: `3px solid ${INK}`,
            whiteSpace: 'nowrap',
            zIndex: 50,
            maxWidth: '90vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={barOuter}>
      <div style={{ height: '100%', width: `${clamp(pct, 0, 100)}%`, background: color, transition: 'width .45s ease' }} />
    </div>
  );
}

function Stat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', background: '#FFF9E8', border: `2px solid ${INK}`, borderRadius: 12, padding: '8px 4px' }}>
      <div style={{ fontSize: 22, fontFamily: ARCHIVO, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 800, marginTop: 3 }}>
        {emoji} {label}
      </div>
    </div>
  );
}
