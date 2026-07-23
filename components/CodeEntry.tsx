'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import { normalizeCode } from '@/lib/challenge';
import { ARCHIVO, PAGE, card, btn, input, label } from '@/lib/ui';

export default function CodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    const clean = normalizeCode(code);
    if (!clean || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/challenge?code=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok || !data?.found) {
        setErr('No challenge with that code. Check for typos.');
        setBusy(false);
        return;
      }
      router.push(`/join/${data.invite_code}`);
    } catch {
      setErr('Network error. Try again.');
      setBusy(false);
    }
  }

  return (
    <main style={PAGE}>
      <Header badge="JOIN" back />
      <div style={card}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 20, marginBottom: 6 }}>GOT A CODE?</div>
        <p style={{ fontWeight: 500, fontSize: 14, marginTop: 0, marginBottom: 16 }}>
          Punch in the code your friend sent. You can paste the whole invite link too, we&rsquo;ll figure it out.
        </p>

        <label style={label}>CHALLENGE CODE</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go();
          }}
          placeholder="ABC123"
          autoCapitalize="characters"
          maxLength={80}
          style={{
            ...input,
            fontFamily: ARCHIVO,
            fontSize: 24,
            letterSpacing: 4,
            textAlign: 'center',
            marginBottom: 14,
          }}
        />

        {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <button
          onClick={go}
          disabled={!normalizeCode(code) || busy}
          className="nb"
          style={btn('#4D7CFF', {
            width: '100%',
            color: '#fff',
            fontSize: 18,
            opacity: normalizeCode(code) && !busy ? 1 : 0.5,
          })}
        >
          {busy ? 'LOOKING…' : 'FIND IT 🔍'}
        </button>
      </div>

    </main>
  );
}
