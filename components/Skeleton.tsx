import { INK, ARCHIVO, PAGE, card } from '@/lib/ui';

// Shown the instant a navigation starts, so a tap never feels like it did
// nothing while the server puts the real page together.
export default function Skeleton({ rows = 3, label }: { rows?: number; label?: string }) {
  return (
    <main style={PAGE}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 21, letterSpacing: 0.5, color: INK }}>🏋️ SWOLE SQUAD</div>
      </div>

      {label && <div style={{ fontWeight: 700, fontSize: 13, opacity: 0.6, marginBottom: 12 }}>{label}</div>}

      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ ...card, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shimmer w={54} h={54} r={999} />
            <div style={{ flex: 1 }}>
              <Shimmer w="62%" h={13} />
              <div style={{ height: 7 }} />
              <Shimmer w="42%" h={10} />
              <div style={{ height: 10 }} />
              <Shimmer w="100%" h={14} r={999} />
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}

function Shimmer({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width: w, height: h, borderRadius: r, background: '#EFE6C6' }}
    />
  );
}
