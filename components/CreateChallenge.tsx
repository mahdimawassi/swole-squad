'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import Header from './Header';
import { PRESETS, AVATAR_COLORS, todayStr, addDays, prettyDate, fmt, isEmail } from '@/lib/challenge';
import type { GoalMode } from '@/lib/types';
import { INK, ARCHIVO, PAGE, card, btn, chip, input, label } from '@/lib/ui';

const LENGTHS = [7, 14, 30, 60, 90];

type Saved = { token: string; name: string; email?: string };

export default function CreateChallenge() {
  const router = useRouter();

  // identity
  const [saved, setSaved] = useState<Saved | null>(null);
  const [editingMe, setEditingMe] = useState(false);
  const [myName, setMyName] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState(AVATAR_COLORS[0].hex);

  // challenge
  const [preset, setPreset] = useState(PRESETS[0]);
  const [customActivity, setCustomActivity] = useState('');
  const [customUnit, setCustomUnit] = useState('reps');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<GoalMode>('daily');
  const [amount, setAmount] = useState(String(PRESETS[0].dailyDefault));
  const [days, setDays] = useState(30);
  const [useEndDate, setUseEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [startToday, setStartToday] = useState(true);
  const [start, setStart] = useState('');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = todayStr();
    setStart(t);
    setEndDate(addDays(t, 29));
    try {
      const raw = localStorage.getItem('swole_me');
      if (raw) {
        const m = JSON.parse(raw);
        if (m?.token && m?.name) {
          setSaved({ token: m.token, name: m.name, email: m.email });
          setMyName(m.name);
          if (m.email) setEmail(m.email);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const isCustom = preset.key === 'custom';
  const activity = isCustom ? customActivity.trim() : preset.activity;
  const unit = isCustom ? customUnit.trim() || 'reps' : preset.unit;
  const effectiveStart = startToday ? todayStr() : start;

  const computedDays = useMemo(() => {
    if (!useEndDate) return days;
    if (!effectiveStart || !endDate) return 0;
    const diff = (Date.parse(endDate) - Date.parse(effectiveStart)) / 86400000;
    return Math.floor(diff) + 1;
  }, [useEndDate, days, effectiveStart, endDate]);

  const computedEnd = useEndDate ? endDate : effectiveStart ? addDays(effectiveStart, days - 1) : '';

  function choosePreset(p: (typeof PRESETS)[number]) {
    setPreset(p);
    setAmount(String(mode === 'daily' ? p.dailyDefault : p.totalDefault));
  }

  function switchMode(m: GoalMode) {
    setMode(m);
    setAmount(String(m === 'daily' ? preset.dailyDefault : preset.totalDefault));
  }

  const amountNum = Number(amount);
  const lengthOk = computedDays >= 1 && computedDays <= 365;
  // Someone we already know is exempt: the in-app prompt collects their email.
  const emailOk = Boolean(saved) || isEmail(email);
  const valid =
    activity.length > 0 &&
    myName.trim().length > 0 &&
    emailOk &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    lengthOk;

  const previewTotal = mode === 'daily' ? amountNum * computedDays : amountNum;
  const autoTitle = activity ? `${computedDays}-Day ${activity} Challenge` : 'New Challenge';

  async function create() {
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: title.trim() || autoTitle,
          activity,
          unit_label: unit,
          goal_mode: mode,
          goal_amount: amountNum,
          start_date: effectiveStart,
          duration_days: computedDays,
          creator: {
            // Sending the saved token is what keeps you as ONE person across
            // every challenge you create. Without it the server has no way to
            // know it is you and makes a new profile each time.
            token: saved?.token,
            name: myName.trim(),
            email: email.trim(),
            avatar_color: color,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Could not create the challenge.');
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem(
          'swole_me',
          JSON.stringify({ token: data.token, name: myName.trim(), email: email.trim() }),
        );
      } catch {
        // ignore
      }
      router.push(`/me/${data.token}?new=${data.invite_code}`);
      router.refresh();
    } catch {
      setErr('Network error. Try again.');
      setBusy(false);
    }
  }

  return (
    <main style={PAGE}>
      <Header badge="NEW" back />

      <div style={card}>
        <label style={label}>WHAT ARE WE DOING?</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => choosePreset(p)} className="nb" style={chip(preset.key === p.key)}>
              {p.emoji} {p.key === 'custom' ? 'Custom' : p.activity}
            </button>
          ))}
        </div>

        {isCustom && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              value={customActivity}
              onChange={(e) => setCustomActivity(e.target.value)}
              placeholder="Burpees"
              maxLength={30}
              style={{ ...input, flex: 2 }}
            />
            <input
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="reps"
              maxLength={12}
              style={{ ...input, flex: 1 }}
            />
          </div>
        )}

        <label style={label}>THE GOAL</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => switchMode('daily')} className="nb" style={chip(mode === 'daily', { flex: 1, textAlign: 'center' })}>
            Every day
          </button>
          <button onClick={() => switchMode('total')} className="nb" style={chip(mode === 'total', { flex: 1, textAlign: 'center' })}>
            Total overall
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputMode="decimal"
            min={1}
            style={{ ...input, flex: 1 }}
          />
          <div style={{ fontWeight: 800, fontSize: 15, minWidth: 80 }}>
            {unit} {mode === 'daily' ? '/ day' : 'total'}
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 18 }}>
          {mode === 'daily'
            ? 'Everyone hits this number every single day.'
            : 'Everyone races to this number by the end. Pace is up to them.'}
        </div>

        <label style={label}>HOW LONG?</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {LENGTHS.map((d) => (
            <button
              key={d}
              onClick={() => {
                setUseEndDate(false);
                setDays(d);
              }}
              className="nb"
              style={chip(!useEndDate && days === d)}
            >
              {d} days
            </button>
          ))}
          <button onClick={() => setUseEndDate(true)} className="nb" style={chip(useEndDate)}>
            📅 Pick a date
          </button>
        </div>
        {useEndDate && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...label, fontSize: 12, opacity: 0.75 }}>ENDS ON</label>
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              type="date"
              min={effectiveStart}
              style={input}
            />
          </div>
        )}

        <label style={label}>WHEN DOES IT START?</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => {
              setStartToday(true);
              setStart(todayStr());
            }}
            className="nb"
            style={chip(startToday, { flex: 1, textAlign: 'center' })}
          >
            Today
          </button>
          <button onClick={() => setStartToday(false)} className="nb" style={chip(!startToday, { flex: 1, textAlign: 'center' })}>
            📅 Later
          </button>
        </div>
        {!startToday && (
          <input
            value={start}
            onChange={(e) => setStart(e.target.value)}
            type="date"
            min={todayStr()}
            style={{ ...input, marginBottom: 12 }}
          />
        )}

        <div
          style={{
            background: lengthOk ? '#FFF3B0' : '#FFD9E2',
            border: `3px solid ${INK}`,
            borderRadius: 14,
            padding: 12,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {lengthOk ? (
            <>
              {computedDays} days, {effectiveStart ? prettyDate(effectiveStart) : '?'} to{' '}
              {computedEnd ? prettyDate(computedEnd) : '?'}.
              <br />
              Max swole at <b>{fmt(previewTotal)} {unit}</b> lifetime.
            </>
          ) : (
            <>That end date does not work. Pick one between 1 and 365 days after the start.</>
          )}
        </div>
      </div>

      <div style={card}>
        <label style={label}>CALL IT SOMETHING (OPTIONAL)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={autoTitle}
          maxLength={60}
          style={input}
        />
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginTop: 6 }}>
          Helps you tell your challenges apart when you have a few going.
        </div>
      </div>

      {saved && !editingMe ? (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
          <SwoleGuy total={0} totalGoal={100} color={color} size={54} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.7 }}>CREATING AS</div>
            <div style={{ fontFamily: ARCHIVO, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {saved.name}
            </div>
          </div>
          <button onClick={() => setEditingMe(true)} className="nb" style={btn('#fff', { padding: '9px 12px', fontSize: 13 })}>
            Change
          </button>
        </div>
      ) : (
        <div style={card}>
          <label style={label}>AND YOU ARE?</label>
          <input
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            style={{ ...input, marginBottom: 12 }}
          />
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
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 14 }}>
            {saved
              ? 'Changing these updates your name, email and colour everywhere.'
              : 'We email you a link so you can get back in from any device. This is how we know it is you.'}
          </div>

          <label style={label}>YOUR COLORS</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
              <SwoleGuy total={0} totalGoal={100} color={color} size={62} />
            </div>
          </div>
        </div>
      )}

      {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <button
        onClick={create}
        disabled={!valid || busy}
        className="nb"
        style={btn('#FF5DA2', {
          width: '100%',
          color: '#fff',
          fontSize: 18,
          opacity: valid && !busy ? 1 : 0.5,
          cursor: valid && !busy ? 'pointer' : 'not-allowed',
        })}
      >
        {busy ? 'BUILDING…' : 'CREATE IT 💥'}
      </button>
    </main>
  );
}
