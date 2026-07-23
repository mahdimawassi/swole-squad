import { ARCHIVO, INK, pill } from '@/lib/ui';

export default function Header({ badge, sub }: { badge?: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 24, letterSpacing: 0.5, color: INK }}>🏋️ SWOLE SQUAD</div>
        {badge && <div style={{ ...pill, flexShrink: 0 }}>{badge}</div>}
      </div>
      {sub && <div style={{ fontWeight: 700, fontSize: 13, opacity: 0.75, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
