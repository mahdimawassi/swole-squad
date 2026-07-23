'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import Header from './Header';
import { PRESETS, AVATAR_COLORS, todayStr, addDays, prettyDate, fmt } from '@/lib/challenge';
import type { GoalMode } from '@/lib/types';
import { INK, ARCHIVO, PAGE, card, btn, chip, input, label } from '@/lib/ui';

const LENGTHS = [7, 14, 30, 60];

export default function CreateChallenge() {
  const router = useRouter();
  const [preset, setPreset] = useState(PRESETS[0]);
  const [customActivity, setCustomActivity] = useState('');
  const [customUnit, setCustomUnit] = useState('reps');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<GoalMode>('daily');
  const [amount, setAmount] = useState(String(PRESETS[0].dailyDefault));
  const [lengthMode, setLengthMode] = useState<'days' | 'date'>('days');
  const [days, setDays] = useState(30);
  const [endDate, setEndDate] = useState('');
  const [start, setStart] = useState('');
  const [myName, setMyName] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState(AVATAR_COLORS[0].hex);
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
        if (m?.name) setMyName(m.name);
        if (m?.email) setEmail(m.email);
      }
    } catch {
      // ignore
    }
  }, []);

  const isCustom = preset.key === 'custom';
  const activity = isCustom ? customActivity.trim() : preset.activity;
  const unit = isCustom ? customUnit.trim() || 'reps' : preset.unit;

  const computedDays = useMemo(() => {
    if (lengthMode === 'days') return days;
    if (!start || !endDate) return 0;
    const diff = (Date.parse(endDate) - Date.parse(start)) / 86400000;
    return Math.floor(diff) + 1;
  }, [lengthMode, days, start, endDate]);

  const computedEnd = lengthMode === 'days' && start ? addDays(start, days - 1) : endDate;

  function choosePreset(p: typeof PRESETS[number]) {
    setPreset(p);
    setAmount(String(mode === 'daily' ? p.dailyDefault : p.totalDefault));
    if (!isCustom || !name) setName('');
  }

  function switchMode(m: GoalMode) {
    setMode(m);
    setAmount(String(m === 'daily' ? preset.dailyDefault : preset.totalDefault));
  }

  const amountNum = Number(amount);
  const valid =
    activity.length > 0 &&
    myName.trim().length > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    computedDays >= 1 &&
    computedDays <= 365;

  const previewTotal = mode === 'daily' ? amountNum * computedDays : amountNum;

  async function create() {
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || `${computedDays}-Day ${activity} Challenge`,
          activity,
          unit_label: unit,
          goal_mode: mode,
          goal_amount: amountNum,
          start_date: start,
          duration_days: computedDays,
          creator: { name: myName.trim(), email: email.trim(), avatar_color: color },
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
    } catch {
      setErr('Network error. Try again.');
      setBusy(false);
    }
  }

  return (
    <main style={PAGE}>
      <Header badge="NEW CHALLENGE" />

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
          <div style={{ fontWeight: 800, fontSize: 15, minWidth: 78 }}>
            {unit} {mode === 'daily' ? '/ day' : 'total'}
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 16 }}>
          {mode === 'daily'
            ? 'Everyone hits this number every single day.'
            : 'Everyone races to this number by the end. Pace is up to them.'}
        </div>

        <label style={label}>HOW LONG?</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {LENGTHS.map((d) => (
            <button
              key={d}
              onClick={() => {
                setLengthMode('days');
                setDays(d);
              }}
              className="nb"
              style={chip(lengthMode === 'days' && days === d)}
            >
              {d} days
            </button>
          ))}
          <button onClick={() => setLengthMode('date')} className="nb" style={chip(lengthMode === 'date')}>
            📅 End date
          </button>
        </div>
        {lengthMode === 'date' && (
          <input
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            type="date"
            min={start}
            style={{ ...input, marginBottom: 10 }}
          />
        )}

        <label style={label}>STARTS</label>
        <input value={start} onChange={(e) => setStart(e.target.value)} type="date" style={{ ...input, marginBottom: 10 }} />

        <div
          style={{
            background: '#FFF3B0',
            border: `3px solid ${INK}`,
            borderRadius: 14,
            padding: 12,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {computedDays >= 1 && computedDays <= 365 ? (
            <>
              {computedDays} days, {start ? prettyDate(start) : '?'} to {computedEnd ? prettyDate(computedEnd) : '?'}.
              <br />
              Max swole at <b>{fmt(previewTotal)} {unit}</b> lifetime.
            </>
          ) : (
            <span style={{ color: '#C21F3A' }}>Pick a length between 1 and 365 days.</span>
          )}
        </div>
      </div>

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
          placeholder="you@email.com (optional)"
          type="email"
          maxLength={120}
          style={{ ...input, marginBottom: 6 }}
        />
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 14 }}>
          Only used to email you your access link so you can never lose it.
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
            <SwoleGuy total={0} totalGoal={100} color={color} size={64} />
          </div>
        </div>
      </div>

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

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', color: INK, fontFamily: 'inherit' }}
        >
          Never mind
        </button>
      </div>
      <div style={{ fontFamily: ARCHIVO, fontSize: 0 }} />
    </main>
  );
}
