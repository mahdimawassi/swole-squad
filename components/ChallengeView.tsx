'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import Header from './Header';
import { usePrefetch } from './Nav';
import Reactions from './Reactions';
import {
  computeStats,
  getSwole,
  REACTION_EMOJIS,
  totalGoalFor,
  dailyTarget,
  goalLabel,
  emojiFor,
  phaseOf,
  challengeDay,
  paceFor,
  metToday,
  needsYouToday,
  quickAddsFor,
  todayStr,
  addDays,
  prettyDate,
  daysBetween,
  fmt,
  clamp,
} from '@/lib/challenge';
import type { User, Challenge, Member, LogRow, ReactionSummary } from '@/lib/types';
import { INK, ARCHIVO, PAGE, card, btn, barOuter, input } from '@/lib/ui';
import { detectPlatform } from '@/lib/social';
import { shareText, inviteMessage, braggingMessage, standingsMessage, nudgeMessage } from '@/lib/share';

export default function ChallengeView({
  user,
  challenge,
  members,
  logs,
  reactions,
  myParticipantId,
}: {
  user: User;
  challenge: Challenge;
  members: Member[];
  logs: LogRow[];
  reactions: Record<string, ReactionSummary>;
  myParticipantId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'me' | 'squad'>('me');
  const [today, setToday] = useState('');
  const [day, setDay] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [flexing, setFlexing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = todayStr();
    setToday(t);
    setDay(t);
  }, []);

  const goal = totalGoalFor(challenge);
  const target = dailyTarget(challenge);
  const isAdmin = challenge.created_by === user.id;
  const quicks = quickAddsFor(challenge);

  const stats = useMemo(() => computeStats(members, logs, today), [members, logs, today]);
  const ranked = useMemo(() => [...stats].sort((a, b) => b.total - a.total), [stats]);

  // Reaction pills show ids; turn them into names using the member list we have.
  const nameFor = (userId: string) =>
    userId === user.id ? 'You' : (members.find((m) => m.user_id === userId)?.name ?? 'Someone');
  const mine = stats.find((s) => s.member.participant_id === myParticipantId);
  const myTotal = mine?.total ?? 0;
  const myRank = ranked.findIndex((s) => s.member.participant_id === myParticipantId) + 1;
  const squadTotal = stats.reduce((sum, s) => sum + s.total, 0);
  const level = getSwole(myTotal, goal);
  const phase = today ? phaseOf(challenge, today) : 'active';
  const cDay = today ? clamp(challengeDay(challenge, today), 0, challenge.duration_days) : 0;
  const pace = today ? paceFor(challenge, myTotal, today) : null;

  // Amount already logged on whichever day is selected (drives the edit field).
  const selectedLogged = useMemo(() => {
    const row = logs.find((l) => l.participant_id === myParticipantId && l.day_date === day);
    return row ? Number(row.amount) || 0 : 0;
  }, [logs, myParticipantId, day]);

  // Backfill window: last 7 days, clipped to the challenge itself.
  const dayOptions = useMemo(() => {
    if (!today) return [];
    const out: { value: string; label: string }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = addDays(today, -i);
      if (daysBetween(challenge.start_date, d) < 0) break;
      if (daysBetween(d, challenge.end_date) < 0) continue;
      out.push({ value: d, label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : prettyDate(d) });
    }
    return out;
  }, [today, challenge.start_date, challenge.end_date]);

  function showToast(msg: string) {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2400);
  }

  async function log(value: number, mode: 'add' | 'set') {
    if (busy) return;
    if (!Number.isFinite(value) || (mode === 'add' && value <= 0) || value < 0) {
      showToast('Enter a real number 💪');
      return;
    }
    setBusy(true);
    const before = getSwole(myTotal, goal).tier;
    const projected = mode === 'add' ? myTotal + value : myTotal - selectedLogged + value;
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: user.secret_token,
          challenge_id: challenge.id,
          amount: value,
          day: day || todayStr(),
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Could not save.');
        setBusy(false);
        return;
      }
      setAmount('');
      setFlexing(true);
      setTimeout(() => setFlexing(false), 560);
      const after = getSwole(projected, goal);
      if (mode === 'set' && value === 0) showToast('Cleared that day.');
      else if (after.tier > before) showToast(`💪 LEVEL UP — ${after.title.toUpperCase()}!`);
      else showToast(mode === 'set' ? `✏️ Set to ${fmt(value)}.` : `🔥 +${fmt(value)} ${challenge.unit_label}.`);
      router.refresh();
    } catch {
      showToast('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(participantId: string, name: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: user.secret_token, challenge_id: challenge.id, participant_id: participantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Could not remove.');
      } else {
        showToast(`${name} is out.`);
        router.refresh();
      }
    } catch {
      showToast('Network error.');
    } finally {
      setConfirmRemove(null);
      setBusy(false);
    }
  }

  // Non-creators leave; the creator deletes. Leaving keeps your entries in case
  // you rejoin. Deleting removes the challenge and everyone's history with it.
  async function exitChallenge() {
    if (busy) return;
    setBusy(true);
    try {
      const res = isAdmin
        ? await fetch('/api/challenge', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: user.secret_token, challenge_id: challenge.id }),
          })
        : await fetch('/api/participant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: user.secret_token, challenge_id: challenge.id, action: 'leave' }),
          });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Could not do that.');
        setBusy(false);
        setConfirmExit(false);
        return;
      }
      router.push(`/me/${user.secret_token}`);
    } catch {
      showToast('Network error.');
      setBusy(false);
      setConfirmExit(false);
    }
  }

  // Returns the reaction's new on/off state so the pill can reconcile itself.
  async function react(toUserId: string, emoji: string): Promise<boolean> {
    try {
      const res = await fetch('/api/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: user.secret_token, challenge_id: challenge.id, to_user: toUserId, emoji }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Could not react.');
        return false;
      }
      // Refresh quietly in the background; the pill already moved.
      router.refresh();
      return data.on === true;
    } catch {
      showToast('Network error.');
      return false;
    }
  }

  // Start the same challenge again with the same crew. This is the answer to a
  // challenge ending and everyone quietly drifting away.
  async function runItBack() {
    if (rematching) return;
    setRematching(true);
    try {
      const res = await fetch('/api/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: user.secret_token, challenge_id: challenge.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Could not start it.');
        setRematching(false);
        return;
      }
      router.push(`/me/${user.secret_token}?new=${data.invite_code}`);
    } catch {
      showToast('Network error.');
      setRematching(false);
    }
  }

  async function share(text: string) {
    if (sharing) return;
    setSharing(true);
    const result = await shareText(text);
    if (result === 'copied') showToast('Copied. Paste it in your group 📋');
    else if (result === 'failed') showToast('Could not share.');
    setSharing(false);
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/join/${challenge.invite_code}`;
  const groupPlatform = detectPlatform(challenge.group_chat_url);

  const shareRows = ranked.map((r) => ({
    name: r.member.name,
    total: r.total,
    doneToday: metToday(challenge, r.today, r.total),
  }));
  const slackers = today
    ? ranked.filter((r) => needsYouToday(challenge, r.today, r.total, today)).map((r) => r.member.name)
    : [];

  usePrefetch([`/me/${user.secret_token}`, `/me/${user.secret_token}/profile`]);

  let headline = `⚡ ${challenge.duration_days - cDay} DAYS LEFT`;
  if (today) {
    if (phase === 'upcoming') {
      const d = 1 - challengeDay(challenge, today);
      headline = `⏳ STARTS IN ${d} DAY${d === 1 ? '' : 'S'}`;
    } else if (phase === 'done') {
      headline = '🏆 CHALLENGE COMPLETE';
    } else if (cDay === challenge.duration_days) {
      headline = '⚡ FINAL DAY — GO';
    }
  }

  return (
    <main style={PAGE}>
      <Header
        badge={`${emojiFor(challenge.activity)} ${goalLabel(challenge).toUpperCase()}`}
        back={`/me/${user.secret_token}`}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div
          style={{
            fontFamily: ARCHIVO,
            fontSize: 20,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {challenge.name}
        </div>
        {isAdmin && (
          <button
            onClick={() => router.push(`/me/${user.secret_token}/c/${challenge.id}/admin`)}
            className="nb"
            aria-label="Challenge settings"
            style={btn('#fff', { padding: '9px 12px', fontSize: 15 })}
          >
            ⚙️
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {([
          ['me', 'MY GAINS'],
          ['squad', `THE SQUAD (${members.length})`],
        ] as const).map(([k, labelText]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="nb"
            style={btn(tab === k ? '#4D7CFF' : '#fff', { flex: 1, color: tab === k ? '#fff' : INK })}
          >
            {labelText}
          </button>
        ))}
      </div>

      {tab === 'me' && (
        <>
          {phase === 'done' && (
            <div style={{ ...card, background: '#FFF3B0', textAlign: 'center' }}>
              <div style={{ fontSize: 34 }}>🏁</div>
              <div style={{ fontFamily: ARCHIVO, fontSize: 20, marginTop: 2 }}>THAT&rsquo;S A WRAP</div>
              <p style={{ fontWeight: 600, fontSize: 13, margin: '6px 0 12px' }}>
                {ranked[0] ? `${ranked[0].member.name} took it with ${fmt(ranked[0].total)} ${challenge.unit_label}.` : 'Challenge complete.'}
                {myRank ? ` You finished #${myRank}.` : ''}
              </p>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                {ranked.slice(0, 3).map((r, i) => (
                  <div
                    key={r.member.participant_id}
                    style={{
                      background: '#fff',
                      border: `2px solid ${INK}`,
                      borderRadius: 12,
                      padding: '8px 12px',
                      minWidth: 92,
                    }}
                  >
                    <div style={{ fontSize: 18 }}>{['🥇', '🥈', '🥉'][i]}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.member.name}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>{fmt(r.total)}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={runItBack}
                  disabled={rematching}
                  className="nb"
                  style={btn('#37C871', { flex: 1, color: '#fff', fontSize: 15, opacity: rematching ? 0.6 : 1 })}
                >
                  {rematching ? 'STARTING…' : '🔁 RUN IT BACK'}
                </button>
                <button
                  onClick={() => share(standingsMessage(challenge, shareRows, inviteUrl))}
                  disabled={sharing}
                  className="nb"
                  style={btn('#fff', { flex: 1, fontSize: 15 })}
                >
                  📣 Share results
                </button>
              </div>
            </div>
          )}

          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SwoleGuy
                total={myTotal}
                totalGoal={goal}
                color={user.avatar_color}
                size={185}
                flexing={flexing}
                style={user.avatar_style}
                equipped={user.equipped}
              />
            </div>
            <div style={{ fontFamily: ARCHIVO, fontSize: 23, marginTop: 6 }}>{user.name.toUpperCase()}</div>
            <div
              style={{
                display: 'inline-block',
                background: user.avatar_color,
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
              <Bar pct={level.pct} color={user.avatar_color} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>
              {fmt(myTotal)} / {fmt(goal)} {challenge.unit_label} to MAXED OUT
            </div>
          </div>

          {today && pace && phase === 'active' && pace.status === 'behind' && (
            <div style={{ ...card, padding: 12, textAlign: 'center', background: '#FFD9E2' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                😬 Behind pace. {fmt(pace.perDay)} {challenge.unit_label}/day gets you there.
              </div>
            </div>
          )}

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: ARCHIVO, fontSize: 16 }}>LOG IT</div>
              {dayOptions.length > 1 && (
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  style={{
                    border: `3px solid ${INK}`,
                    borderRadius: 10,
                    padding: '6px 8px',
                    fontWeight: 800,
                    fontSize: 13,
                    background: day === today ? '#fff' : '#FFD54A',
                    fontFamily: 'inherit',
                    color: INK,
                  }}
                >
                  {dayOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
              {today
                ? `${fmt(selectedLogged)} / ${fmt(target)} ${challenge.unit_label}${
                    selectedLogged >= target ? ' — nailed it ✅' : ''
                  }`
                : 'Loading…'}
            </div>
            <div style={{ marginBottom: 14 }}>
              <Bar pct={today ? (selectedLogged / Math.max(target, 0.01)) * 100 : 0} color="#37C871" />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {quicks.map((n) => (
                <button
                  key={n}
                  onClick={() => log(n, 'add')}
                  disabled={busy}
                  className="nb"
                  style={btn('#FFD54A', { flex: 1, padding: '11px 0', opacity: busy ? 0.6 : 1, fontSize: 15 })}
                >
                  +{fmt(n)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') log(Number(amount), 'add');
                }}
                type="number"
                inputMode="decimal"
                placeholder={`custom ${challenge.unit_label}`}
                style={{ ...input, flex: 1 }}
              />
              <button
                onClick={() => log(Number(amount), 'add')}
                disabled={busy}
                className="nb"
                style={btn('#FF5DA2', { color: '#fff', opacity: busy ? 0.6 : 1 })}
              >
                ADD
              </button>
            </div>

            {selectedLogged > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.75, flex: 1 }}>Wrong number?</div>
                <button
                  onClick={() => {
                    const v = Number(amount);
                    if (!amount || !Number.isFinite(v)) {
                      showToast('Type the correct total first.');
                      return;
                    }
                    log(v, 'set');
                  }}
                  disabled={busy}
                  className="nb"
                  style={btn('#fff', { padding: '8px 12px', fontSize: 13 })}
                >
                  Set exact
                </button>
                <button
                  onClick={() => log(0, 'set')}
                  disabled={busy}
                  className="nb"
                  style={btn('#fff', { padding: '8px 12px', fontSize: 13 })}
                >
                  Clear day
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              fontSize: 13,
              fontWeight: 800,
              marginTop: -6,
              marginBottom: 16,
              opacity: 0.8,
            }}
          >
            <span>🔥 {today ? (mine?.streak ?? 0) : '—'}</span>
            <span>🏆 #{myRank || 1}</span>
            <span>
              📅 {today ? `${cDay}/${challenge.duration_days}` : '—'}
            </span>
          </div>

          <div style={{ ...card, padding: showGlow ? 14 : 10 }}>
            <button
              onClick={() => setShowGlow((v) => !v)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: INK,
                padding: 0,
              }}
            >
              <span style={{ fontFamily: ARCHIVO, fontSize: 14, flex: 1, textAlign: 'left' }}>YOUR GLOW-UP</span>
              <span style={{ fontSize: 14, fontWeight: 900 }}>{showGlow ? '−' : '+'}</span>
            </button>
            {showGlow && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginTop: 12 }}>
                {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
                  <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <SwoleGuy total={frac * goal} totalGoal={goal} color={user.avatar_color} size={58} style={user.avatar_style} equipped={user.equipped} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, marginTop: 2 }}>{Math.round(frac * 100)}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(phase !== 'active' || challenge.duration_days - cDay <= 7) && (
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
            <div style={{ fontFamily: ARCHIVO, fontSize: 21 }}>{headline}</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 6, color: '#fff' }}>
              {fmt(challenge.goal_amount)} {challenge.unit_label}
              {challenge.goal_mode === 'daily' ? ' a day. No excuses.' : ' total. However you get there.'}
            </div>
          </div>
          )}
        </>
      )}

      {tab === 'squad' && (
        <>
          <div style={{ ...card, textAlign: 'center', paddingTop: 14, paddingBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Combined damage</div>
            <div style={{ fontFamily: ARCHIVO, fontSize: 33, lineHeight: 1.1 }}>{fmt(squadTotal)}</div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{challenge.unit_label} and counting 💪</div>
          </div>

          {ranked.map((s, i) => {
            const isMe = s.member.participant_id === myParticipantId;
            const lv = getSwole(s.total, goal);
            const canRemove = isAdmin && !isMe;
            return (
              <div
                key={s.member.participant_id}
                style={{ ...card, padding: 12, marginBottom: 12, background: isMe ? '#FFF3B0' : '#fff' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: ARCHIVO, fontSize: 19, width: 32, textAlign: 'center' }}>
                    {i === 0 ? '👑' : `#${i + 1}`}
                  </div>
                  <SwoleGuy
                    total={s.total}
                    totalGoal={goal}
                    color={s.member.avatar_color}
                    size={52}
                    style={s.member.avatar_style}
                    equipped={s.member.equipped}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.member.name}
                      {isMe ? ' (you)' : ''}
                      {challenge.created_by === s.member.user_id ? ' 👑' : ''}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>
                      {lv.title} · 🔥{today ? s.streak : 0}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: ARCHIVO, fontSize: 16 }}>{fmt(s.total)}</div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>{today ? (s.today > 0 ? '✅' : '⏳') : ''}</div>
                  </div>
                </div>

                <Reactions
                  summary={reactions[s.member.user_id]}
                  nameFor={nameFor}
                  meId={user.id}
                  onReact={(emoji) => react(s.member.user_id, emoji)}
                />

                {canRemove && (
                  <div style={{ marginTop: 10, textAlign: 'right' }}>
                    {confirmRemove === s.member.participant_id ? (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Remove {s.member.name}?</span>
                        <button
                          onClick={() => removeMember(s.member.participant_id, s.member.name)}
                          disabled={busy}
                          className="nb"
                          style={btn('#C21F3A', { color: '#fff', padding: '6px 10px', fontSize: 12 })}
                        >
                          Yes
                        </button>
                        <button onClick={() => setConfirmRemove(null)} className="nb" style={btn('#fff', { padding: '6px 10px', fontSize: 12 })}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(s.member.participant_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 700,
                          opacity: 0.6,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          color: INK,
                          fontFamily: 'inherit',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {groupPlatform && challenge.group_chat_url && (
            <a
              href={challenge.group_chat_url}
              target="_blank"
              rel="noopener noreferrer"
              className="nb"
              style={{
                ...card,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textDecoration: 'none',
                color: INK,
                background: '#fff',
              }}
            >
              <div style={{ fontSize: 26 }}>{groupPlatform.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: ARCHIVO, fontSize: 15 }}>JOIN THE GROUP CHAT</div>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>
                  The squad talks on {groupPlatform.label}
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>→</div>
            </a>
          )}

          <button
            onClick={() => setShareOpen(true)}
            className="nb"
            style={btn('#FF5DA2', { width: '100%', color: '#fff', fontSize: 16, marginBottom: 16 })}
          >
            📣 SHARE TO THE GROUP
          </button>

          <div style={{ ...card, borderColor: '#C21F3A', boxShadow: '6px 6px 0 #C21F3A' }}>
            <div style={{ fontFamily: ARCHIVO, fontSize: 15, marginBottom: 6 }}>
              {isAdmin ? 'DELETE THIS CHALLENGE' : 'LEAVE THIS CHALLENGE'}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginTop: 0, marginBottom: 12 }}>
              {isAdmin
                ? 'Wipes the challenge for everyone, along with every entry logged in it. This cannot be undone.'
                : 'You drop off the leaderboard. Your entries are kept, so rejoining with the code brings them back.'}
            </p>
            {confirmExit ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={exitChallenge}
                  disabled={busy}
                  className="nb"
                  style={btn('#C21F3A', { flex: 1, color: '#fff', fontSize: 14, opacity: busy ? 0.6 : 1 })}
                >
                  {busy ? '…' : isAdmin ? 'Yes, delete it all' : 'Yes, I am out'}
                </button>
                <button onClick={() => setConfirmExit(false)} className="nb" style={btn('#fff', { flex: 1, fontSize: 14 })}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmExit(true)}
                className="nb"
                style={btn('#fff', { width: '100%', fontSize: 14, color: '#C21F3A' })}
              >
                {isAdmin ? '🗑️ Delete challenge' : '🚪 Leave challenge'}
              </button>
            )}
          </div>
        </>
      )}

      {shareOpen && (
        <div
          onClick={() => setShareOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,20,20,.55)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              border: `3px solid ${INK}`,
              borderRadius: '20px 20px 0 0',
              padding: 20,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <div style={{ fontFamily: ARCHIVO, fontSize: 17, marginBottom: 4 }}>SHARE TO THE GROUP</div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 14 }}>
              We write it, you pick where it goes.
            </div>

            {[
              { key: 'standings', label: '🏆 The standings', build: () => standingsMessage(challenge, shareRows, inviteUrl) },
              {
                key: 'progress',
                label: '💪 My progress',
                build: () =>
                  braggingMessage(
                    challenge,
                    { name: user.name, total: myTotal, rank: myRank || 1, streak: mine?.streak ?? 0, title: level.title },
                    inviteUrl,
                  ),
              },
              {
                key: 'nudge',
                label: `👀 Nudge whoever's slacking${slackers.length ? ` (${slackers.length})` : ''}`,
                build: () => nudgeMessage(challenge, slackers, inviteUrl),
              },
              { key: 'invite', label: '➕ Invite someone', build: () => inviteMessage(challenge, inviteUrl), locked: challenge.sharing_enabled === false },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  share(opt.build());
                  setShareOpen(false);
                }}
                disabled={sharing || opt.locked}
                className="nb"
                style={btn('#fff', {
                  width: '100%',
                  fontSize: 15,
                  marginBottom: 8,
                  textAlign: 'left',
                  opacity: opt.locked ? 0.45 : 1,
                })}
              >
                {opt.label}
              </button>
            ))}

            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginTop: 14,
                paddingTop: 14,
                borderTop: `2px solid rgba(20,20,20,.15)`,
              }}
            >
              <div
                style={{
                  flex: 1,
                  fontFamily: ARCHIVO,
                  fontSize: 18,
                  letterSpacing: 3,
                  textAlign: 'center',
                  background: '#FFF9E8',
                  border: `3px solid ${INK}`,
                  borderRadius: 12,
                  padding: '8px 4px',
                  opacity: challenge.sharing_enabled === false ? 0.45 : 1,
                }}
              >
                {challenge.invite_code}
              </div>
              <button
                onClick={() => copy(inviteUrl, 'invite')}
                disabled={challenge.sharing_enabled === false}
                className="nb"
                style={btn('#4D7CFF', { color: '#fff', padding: '11px 14px', fontSize: 13 })}
              >
                {copied === 'invite' ? '✅' : 'Copy link'}
              </button>
            </div>

            {challenge.sharing_enabled === false && (
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, textAlign: 'center', marginTop: 10 }}>
                🔒 Sharing is off, so nobody new can join.
              </div>
            )}

            <button onClick={() => setShareOpen(false)} className="nb" style={btn('#fff', { width: '100%', marginTop: 14 })}>
              Close
            </button>
          </div>
        </div>
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
      <div style={{ fontSize: 20, fontFamily: ARCHIVO, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 800, marginTop: 3 }}>
        {emoji} {label}
      </div>
    </div>
  );
}
