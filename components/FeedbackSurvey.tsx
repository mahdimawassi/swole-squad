'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwoleGuy from './SwoleGuy';
import { getSwole, clamp } from '@/lib/challenge';
import { INK, ARCHIVO, PAGE, card, btn, barOuter, input } from '@/lib/ui';

type Answers = {
  keep_using: number | null;
  disappointment: string | null;
  ease: number | null;
  confusing: string;
  broken: string;
  favorite: string | null;
  next_thing: string;
  other: string;
};

const EMPTY: Answers = {
  keep_using: null,
  disappointment: null,
  ease: null,
  confusing: '',
  broken: '',
  favorite: null,
  next_thing: '',
  other: '',
};

const FAVORITES = [
  { key: 'avatar', label: 'The swole avatar' },
  { key: 'leaderboard', label: 'The leaderboard' },
  { key: 'streaks', label: 'Streaks' },
  { key: 'logging', label: 'One-tap logging' },
  { key: 'pace', label: 'The pace nudges' },
];

// 8 questions. step 0 = intro, 1..8 = questions, 9 = done.
const TOTAL = 8;

export default function FeedbackSurvey() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [token, setToken] = useState<string | undefined>(undefined);
  const [a, setA] = useState<Answers>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('swole_me');
      if (raw) {
        const m = JSON.parse(raw);
        if (m?.name) setName(m.name);
        if (m?.token) setToken(m.token);
      }
    } catch {
      // ignore
    }
  }, []);

  // Avatar and meter fill as they move through the survey.
  const progress = clamp(step / (TOTAL + 1), 0, 1);
  const swoleTotal = progress * 100;
  const level = getSwole(swoleTotal, 100);

  const required: Record<number, boolean> = { 1: true, 2: true, 3: true, 6: true };
  const answered = (s: number): boolean => {
    if (s === 1) return a.keep_using !== null;
    if (s === 2) return a.disappointment !== null;
    if (s === 3) return a.ease !== null;
    if (s === 6) return a.favorite !== null;
    return true;
  };
  const canProceed = !required[step] || answered(step);

  function next() {
    setErr(null);
    if (step < TOTAL) setStep(step + 1);
  }
  function back() {
    setErr(null);
    if (step > 0) setStep(step - 1);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), ...a }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Could not send. Try again.');
        setBusy(false);
        return;
      }
      setStep(TOTAL + 1);
    } catch {
      setErr('Network error. Try again.');
      setBusy(false);
    }
  }

  const home = token ? `/me/${token}` : '/';

  // ---------- done ----------
  if (step === TOTAL + 1) {
    return (
      <main style={PAGE}>
        <div style={{ ...card, textAlign: 'center', marginTop: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SwoleGuy total={100} totalGoal={100} color="#FF5DA2" size={150} flexing />
          </div>
          <div style={{ fontFamily: ARCHIVO, fontSize: 24, marginTop: 6 }}>MAXED OUT</div>
          <p style={{ fontWeight: 600, fontSize: 15, margin: '8px 0 0' }}>
            Feedback logged. This is exactly what makes the app better, so thank you.
          </p>
        </div>
        <button onClick={() => router.push(home)} className="nb" style={btn('#FF5DA2', { width: '100%', color: '#fff', fontSize: 17 })}>
          BACK TO MY GAINS
        </button>
      </main>
    );
  }

  // ---------- intro ----------
  if (step === 0) {
    return (
      <main style={PAGE}>
        <div style={{ ...card, textAlign: 'center', marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SwoleGuy total={8} totalGoal={100} color="#4D7CFF" size={120} />
          </div>
          <div style={{ fontFamily: ARCHIVO, fontSize: 25, lineHeight: 1.1, marginTop: 6 }}>SQUAD DEBRIEF</div>
          <p style={{ fontWeight: 500, fontSize: 15, marginTop: 10, marginBottom: 0 }}>
            8 quick questions, about two minutes. Your answers decide what we build next. The more honest, the
            better.
          </p>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>FIRST, WHO ARE YOU?</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) next();
            }}
            placeholder="Your name"
            maxLength={40}
            style={input}
          />
        </div>

        <button
          onClick={next}
          disabled={!name.trim()}
          className="nb"
          style={btn('#FF5DA2', { width: '100%', color: '#fff', fontSize: 18, opacity: name.trim() ? 1 : 0.5 })}
        >
          LET&rsquo;S GO 💪
        </button>
      </main>
    );
  }

  // ---------- a question ----------
  return (
    <main style={PAGE}>
      {/* avatar + swole meter as the progress indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <SwoleGuy total={swoleTotal} totalGoal={100} color="#FF5DA2" size={64} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
            <span>{level.title}</span>
            <span>
              {step} / {TOTAL}
            </span>
          </div>
          <div style={barOuter}>
            <div style={{ height: '100%', width: `${(step / TOTAL) * 100}%`, background: '#FF5DA2', transition: 'width .4s ease' }} />
          </div>
        </div>
      </div>

      <div style={{ ...card, minHeight: 210 }}>
        {step === 1 && (
          <Scale
            title="How likely are you to keep using Swole Squad?"
            low="Definitely won't"
            high="Definitely will"
            value={a.keep_using}
            onPick={(v) => setA({ ...a, keep_using: v })}
          />
        )}

        {step === 2 && (
          <Choice
            title="How would you feel if you could no longer use it?"
            options={[
              { key: 'very', label: 'Very disappointed' },
              { key: 'somewhat', label: 'Somewhat disappointed' },
              { key: 'not', label: 'Not disappointed' },
            ]}
            value={a.disappointment}
            onPick={(v) => setA({ ...a, disappointment: v })}
          />
        )}

        {step === 3 && (
          <Scale
            title="How easy was it to get started and log your first entry?"
            low="Very hard"
            high="Very easy"
            value={a.ease}
            onPick={(v) => setA({ ...a, ease: v })}
          />
        )}

        {step === 4 && (
          <Text
            title="Was anything confusing or unclear?"
            hint="Leave blank if nothing comes to mind."
            value={a.confusing}
            onChange={(v) => setA({ ...a, confusing: v })}
          />
        )}

        {step === 5 && (
          <Text
            title="Did anything not work or feel broken?"
            hint="Bugs, glitches, things that behaved oddly."
            value={a.broken}
            onChange={(v) => setA({ ...a, broken: v })}
          />
        )}

        {step === 6 && (
          <Choice
            title="Which feature do you value most?"
            options={FAVORITES}
            value={a.favorite}
            onPick={(v) => setA({ ...a, favorite: v })}
          />
        )}

        {step === 7 && (
          <Text
            title="What is the one thing we should add or improve next?"
            hint="Your top pick for the roadmap."
            value={a.next_thing}
            onChange={(v) => setA({ ...a, next_thing: v })}
          />
        )}

        {step === 8 && (
          <Text
            title="Anything else on your mind?"
            hint="Optional. The floor is yours."
            value={a.other}
            onChange={(v) => setA({ ...a, other: v })}
          />
        )}
      </div>

      {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={back} className="nb" style={btn('#fff', { padding: '13px 18px', fontSize: 15 })}>
          ←
        </button>
        {step < TOTAL ? (
          <button
            onClick={next}
            disabled={!canProceed}
            className="nb"
            style={btn(canProceed ? '#4D7CFF' : '#fff', {
              flex: 1,
              color: canProceed ? '#fff' : INK,
              fontSize: 16,
              opacity: canProceed ? 1 : 0.5,
            })}
          >
            {required[step] && !answered(step) ? 'PICK ONE TO CONTINUE' : 'NEXT'}
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={busy}
            className="nb"
            style={btn('#FF5DA2', { flex: 1, color: '#fff', fontSize: 16, opacity: busy ? 0.6 : 1 })}
          >
            {busy ? 'SENDING…' : 'FINISH 🏆'}
          </button>
        )}
      </div>

      {!required[step] && step < TOTAL && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={next}
            style={{ background: 'none', border: 'none', fontWeight: 700, fontSize: 13, opacity: 0.6, textDecoration: 'underline', cursor: 'pointer', color: INK, fontFamily: 'inherit' }}
          >
            Skip this one
          </button>
        </div>
      )}
    </main>
  );
}

function Scale({
  title,
  low,
  high,
  value,
  onPick,
}: {
  title: string;
  low: string;
  high: string;
  value: number | null;
  onPick: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ fontFamily: ARCHIVO, fontSize: 19, lineHeight: 1.2, marginBottom: 18 }}>{title}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onPick(n)}
            className="nb"
            style={{
              flex: 1,
              aspectRatio: '1 / 1',
              background: value === n ? '#FF5DA2' : '#fff',
              color: value === n ? '#fff' : INK,
              border: `3px solid ${INK}`,
              borderRadius: 14,
              boxShadow: value === n ? 'none' : `4px 4px 0 ${INK}`,
              transform: value === n ? 'translate(4px,4px)' : 'none',
              fontFamily: ARCHIVO,
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, opacity: 0.7, marginTop: 8 }}>
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

function Choice({
  title,
  options,
  value,
  onPick,
}: {
  title: string;
  options: { key: string; label: string }[];
  value: string | null;
  onPick: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ fontFamily: ARCHIVO, fontSize: 19, lineHeight: 1.2, marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onPick(o.key)}
            className="nb"
            style={{
              textAlign: 'left',
              background: value === o.key ? '#FF5DA2' : '#fff',
              color: value === o.key ? '#fff' : INK,
              border: `3px solid ${INK}`,
              borderRadius: 14,
              boxShadow: value === o.key ? 'none' : `4px 4px 0 ${INK}`,
              transform: value === o.key ? 'translate(4px,4px)' : 'none',
              padding: '13px 16px',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Text({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ fontFamily: ARCHIVO, fontSize: 19, lineHeight: 1.2, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 12 }}>{hint}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Type here…"
        style={{
          width: '100%',
          border: `3px solid ${INK}`,
          borderRadius: 12,
          padding: '12px 14px',
          fontSize: 16,
          fontWeight: 600,
          background: '#FFF9E8',
          color: INK,
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}
