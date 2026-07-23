'use client';

import { useRouter } from 'next/navigation';
import { INK, ARCHIVO, PAGE, card, btn } from '@/lib/ui';

// Used for dead ends. "reset" clears the saved identity on this device, which is
// the escape hatch if a stored link ever points at something that no longer exists.
export default function Notice({
  title,
  body,
  reset,
}: {
  title: string;
  body: string;
  reset?: boolean;
}) {
  const router = useRouter();

  return (
    <main style={PAGE}>
      <div style={{ ...card, textAlign: 'center', marginTop: 40 }}>
        <div style={{ fontSize: 42 }}>🤔</div>
        <h1 style={{ fontFamily: ARCHIVO, fontSize: 21, margin: '10px 0' }}>{title}</h1>
        <p style={{ fontWeight: 600, marginTop: 0, marginBottom: reset ? 18 : 0 }}>{body}</p>
        {reset && (
          <button
            onClick={() => {
              try {
                localStorage.removeItem('swole_me');
              } catch {
                // ignore
              }
              router.push('/');
            }}
            className="nb"
            style={btn('#4D7CFF', { width: '100%', color: '#fff' })}
          >
            START OVER
          </button>
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            textDecoration: 'underline',
            cursor: 'pointer',
            color: INK,
            fontFamily: 'inherit',
          }}
        >
          Go to the home page
        </button>
      </div>
    </main>
  );
}
