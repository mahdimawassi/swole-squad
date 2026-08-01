import { lerp } from '@/lib/challenge';

const INK = '#141414';

// Geometry handed down from SwoleGuy so items track the body as it bulks up.
export type Geo = {
  s: number; // 0..1 swole factor
  cx: number;
  shoulder: number;
  headY: number;
  headR: number;
  fistX: number; // right fist x (positive side)
  fistY: number;
  legW: number;
};

export type Equipped = Partial<Record<'head' | 'face' | 'held' | 'feet' | 'back' | 'aura', string>>;

// ---------- BACK (drawn behind the body) ----------
export function BackItem({ item, g, color }: { item?: string; g: Geo; color: string }) {
  if (!item) return null;
  const { cx, shoulder } = g;

  if (item === 'cape') {
    return (
      <path
        d={`M ${cx - shoulder + 4} 90 Q ${cx - shoulder - 16} 140 ${cx - shoulder + 2} 176
            Q ${cx} 190 ${cx + shoulder - 2} 176
            Q ${cx + shoulder + 16} 140 ${cx + shoulder - 4} 90 Z`}
        fill="#C21F3A"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    );
  }

  if (item === 'wings') {
    const w = (sign: number) => (
      <path
        key={sign}
        d={`M ${cx + sign * (shoulder - 6)} 96
            q ${sign * 42} -34 ${sign * 54} -4
            q ${sign * -6} 20 ${sign * -24} 24
            q ${sign * 14} 8 ${sign * 6} 24
            q ${sign * -26} 2 ${sign * -40} -22 Z`}
        fill="#FFFDF5"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    );
    return (
      <>
        {w(-1)}
        {w(1)}
      </>
    );
  }

  if (item === 'jetpack') {
    return (
      <>
        <rect x={cx - 26} y="96" width="52" height="46" rx="10" fill="#8A98A6" stroke={INK} strokeWidth="3" />
        <rect x={cx - 18} y="104" width="10" height="26" rx="5" fill="#4D7CFF" stroke={INK} strokeWidth="2" />
        <rect x={cx + 8} y="104" width="10" height="26" rx="5" fill="#4D7CFF" stroke={INK} strokeWidth="2" />
        <path d={`M ${cx - 16} 142 q 6 20 0 30 q -10 -12 0 -30 Z`} fill="#FF8A3D" stroke={INK} strokeWidth="2" />
        <path d={`M ${cx + 16} 142 q 6 20 0 30 q -10 -12 0 -30 Z`} fill="#FF8A3D" stroke={INK} strokeWidth="2" />
      </>
    );
  }
  return null;
}

// ---------- FEET ----------
export function FeetItem({ item, g }: { item?: string; g: Geo }) {
  if (!item) return null;
  const { cx, legW } = g;
  const offset = legW / 2 + 6;

  const palette: Record<string, { main: string; accent: string }> = {
    sneakers: { main: '#FFFDF5', accent: '#FF5DA2' },
    boots: { main: '#8A5C33', accent: '#5A3A1F' },
    cleats: { main: '#37C871', accent: '#141414' },
    goldkicks: { main: '#FFC93C', accent: '#FF9F1C' },
  };
  const c = palette[item];
  if (!c) return null;

  const shoe = (sign: number) => (
    <g key={sign}>
      <path
        d={`M ${cx + sign * offset - 12} 194
            h 24 q 4 0 6 4 l 3 6 q 1 4 -4 4
            h -30 q -4 0 -4 -5 z`}
        fill={c.main}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d={`M ${cx + sign * offset - 12} 202 h 32`} stroke={c.accent} strokeWidth="3" />
      {item === 'goldkicks' && (
        <circle cx={cx + sign * offset + 6} cy={197} r="2.4" fill="#fff" />
      )}
    </g>
  );

  return (
    <>
      {shoe(-1)}
      {shoe(1)}
    </>
  );
}

// ---------- HELD (in the right fist) ----------
export function HeldItem({ item, g }: { item?: string; g: Geo }) {
  if (!item) return null;
  const x = g.fistX;
  const y = g.fistY;

  if (item === 'dumbbell') {
    return (
      <g>
        <rect x={x - 20} y={y - 4} width="40" height="8" rx="3" fill="#8A98A6" stroke={INK} strokeWidth="2.5" />
        <rect x={x - 28} y={y - 12} width="12" height="24" rx="4" fill="#4A5560" stroke={INK} strokeWidth="2.5" />
        <rect x={x + 16} y={y - 12} width="12" height="24" rx="4" fill="#4A5560" stroke={INK} strokeWidth="2.5" />
      </g>
    );
  }
  if (item === 'kettlebell') {
    return (
      <g>
        <path d={`M ${x - 9} ${y} q 0 -13 9 -13 q 9 0 9 13`} fill="none" stroke={INK} strokeWidth="4" />
        <circle cx={x} cy={y + 12} r="13" fill="#4A5560" stroke={INK} strokeWidth="3" />
      </g>
    );
  }
  if (item === 'bottle') {
    return (
      <g>
        <rect x={x - 7} y={y - 6} width="14" height="26" rx="5" fill="#22C3D6" stroke={INK} strokeWidth="2.5" />
        <rect x={x - 4} y={y - 12} width="8" height="8" rx="2" fill="#4A5560" stroke={INK} strokeWidth="2" />
      </g>
    );
  }
  if (item === 'banana') {
    return (
      <path
        d={`M ${x - 12} ${y - 8} q 14 22 26 4 q -4 16 -18 14 q -12 -2 -8 -18 z`}
        fill="#FFD54A"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    );
  }
  if (item === 'trophy') {
    return (
      <g>
        <path d={`M ${x - 10} ${y - 12} h 20 v 8 q 0 10 -10 12 q -10 -2 -10 -12 z`} fill="#FFC93C" stroke={INK} strokeWidth="2.5" />
        <rect x={x - 3} y={y + 6} width="6" height="8" fill="#FFC93C" stroke={INK} strokeWidth="2" />
        <rect x={x - 9} y={y + 13} width="18" height="5" rx="2" fill="#FF9F1C" stroke={INK} strokeWidth="2" />
      </g>
    );
  }
  return null;
}

// ---------- HEAD ----------
export function HeadItem({ item, g, color }: { item?: string; g: Geo; color: string }) {
  if (!item) return null;
  const { cx, headY, headR } = g;
  const top = headY - headR;

  if (item === 'headband') {
    return (
      <>
        <rect x={cx - headR - 1} y={top + 8} width={headR * 2 + 2} height="9" rx="3" fill="#FF5DA2" stroke={INK} strokeWidth="2.5" />
        <path d={`M ${cx + headR - 3} ${top + 12} l 12 -3 l -2 9 z`} fill="#FF5DA2" stroke={INK} strokeWidth="2" />
      </>
    );
  }
  if (item === 'cap') {
    return (
      <>
        <path d={`M ${cx - headR} ${top + 12} q ${headR} -18 ${headR * 2} 0 l 0 5 q ${-headR} -9 ${-headR * 2} 0 z`} fill={color} stroke={INK} strokeWidth="2.5" />
        <path d={`M ${cx - headR + 2} ${top + 14} l -13 5 l 2 -9 z`} fill={color} stroke={INK} strokeWidth="2" />
        <circle cx={cx} cy={top + 4} r="3" fill={color} stroke={INK} strokeWidth="2" />
      </>
    );
  }
  if (item === 'beanie') {
    return (
      <>
        <path d={`M ${cx - headR - 1} ${top + 14} q 1 -22 ${headR + 1} -22 q ${headR} 0 ${headR + 1} 22 z`} fill="#9B6DFF" stroke={INK} strokeWidth="2.5" />
        <rect x={cx - headR - 2} y={top + 12} width={headR * 2 + 4} height="8" rx="3" fill="#7A4FE0" stroke={INK} strokeWidth="2.5" />
        <circle cx={cx} cy={top - 10} r="5" fill="#FFFDF5" stroke={INK} strokeWidth="2.5" />
      </>
    );
  }
  if (item === 'viking') {
    return (
      <>
        <path d={`M ${cx - headR - 2} ${top + 14} q 2 -20 ${headR + 2} -20 q ${headR} 0 ${headR + 2} 20 z`} fill="#8A98A6" stroke={INK} strokeWidth="2.5" />
        <rect x={cx - 3} y={top - 6} width="6" height="20" fill="#6A7684" stroke={INK} strokeWidth="2" />
        <path d={`M ${cx - headR} ${top + 4} q -16 -6 -14 -18 q 12 2 16 12 z`} fill="#FFFDF5" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d={`M ${cx + headR} ${top + 4} q 16 -6 14 -18 q -12 2 -16 12 z`} fill="#FFFDF5" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      </>
    );
  }
  if (item === 'crown') {
    return (
      <>
        <path
          d={`M ${cx - 20} ${top + 6} l 0 -18 l 9 9 l 11 -14 l 11 14 l 9 -9 l 0 18 z`}
          fill="#FFC93C"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx={cx} cy={top - 1} r="2.6" fill="#FF5DA2" stroke={INK} strokeWidth="1.5" />
      </>
    );
  }
  return null;
}

// ---------- FACE ----------
export function FaceItem({ item, g }: { item?: string; g: Geo }) {
  if (!item) return null;
  const { cx, headY } = g;
  const eyeY = headY - 1;

  if (item === 'shades') {
    return (
      <>
        <rect x={cx - 17} y={eyeY - 6} width="34" height="11" rx="4" fill={INK} />
        <rect x={cx - 14} y={eyeY - 4} width="7" height="3" rx="1.5" fill="#fff" opacity="0.75" />
      </>
    );
  }
  if (item === 'specs') {
    return (
      <>
        <circle cx={cx - 8} cy={eyeY} r="7" fill="#fff" fillOpacity="0.35" stroke={INK} strokeWidth="2.5" />
        <circle cx={cx + 8} cy={eyeY} r="7" fill="#fff" fillOpacity="0.35" stroke={INK} strokeWidth="2.5" />
        <line x1={cx - 1} y1={eyeY} x2={cx + 1} y2={eyeY} stroke={INK} strokeWidth="2.5" />
      </>
    );
  }
  if (item === 'eyepatch') {
    return (
      <>
        <path d={`M ${cx - 20} ${eyeY - 8} q 20 -5 34 -2`} stroke={INK} strokeWidth="2.5" fill="none" />
        <rect x={cx + 2} y={eyeY - 7} width="14" height="13" rx="3" fill={INK} />
      </>
    );
  }
  if (item === 'monocle') {
    return (
      <>
        <circle cx={cx + 8} cy={eyeY} r="8" fill="#fff" fillOpacity="0.4" stroke={INK} strokeWidth="2.5" />
        <path d={`M ${cx + 16} ${eyeY + 4} q 5 10 1 16`} stroke={INK} strokeWidth="2" fill="none" />
      </>
    );
  }
  return null;
}

// ---------- AURA (drawn behind everything) ----------
export function AuraItem({ item, g }: { item?: string; g: Geo }) {
  if (!item) return null;
  const { cx } = g;

  if (item === 'sparkle') {
    const pts = [
      [cx - 74, 60],
      [cx + 76, 48],
      [cx - 66, 150],
      [cx + 72, 148],
      [cx + 40, 22],
    ];
    return (
      <g className="aura-sparkle">
        {pts.map(([x, y], i) => (
          <path
            key={i}
            d={`M ${x} ${y - 8} l 2.6 5.4 l 5.4 2.6 l -5.4 2.6 l -2.6 5.4 l -2.6 -5.4 l -5.4 -2.6 l 5.4 -2.6 z`}
            fill="#FFD54A"
            stroke={INK}
            strokeWidth="1.2"
          />
        ))}
      </g>
    );
  }

  if (item === 'flames') {
    return (
      <g className="aura-flames">
        {[-1, 1].map((sign) => (
          <path
            key={sign}
            d={`M ${cx + sign * 66} 178
                q ${sign * -12} -34 ${sign * 4} -54
                q ${sign * 2} 18 ${sign * 14} 22
                q ${sign * 8} 20 ${sign * -18} 32 z`}
            fill="#FF8A3D"
            stroke={INK}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ))}
      </g>
    );
  }

  if (item === 'lightning') {
    return (
      <g className="aura-lightning">
        <path d={`M ${cx - 74} 44 l 14 -2 l -7 16 l 13 -3 l -20 30 l 5 -20 l -12 3 z`} fill="#FFD54A" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d={`M ${cx + 74} 150 l -14 2 l 7 -16 l -13 3 l 20 -30 l -5 20 l 12 -3 z`} fill="#FFD54A" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      </g>
    );
  }
  return null;
}

export function geoFor(s: number): Geo {
  const shoulder = lerp(30, 58, s);
  return {
    s,
    cx: 100,
    shoulder,
    headY: 48,
    headR: 24,
    fistX: 100 + (shoulder - 4),
    fistY: 26,
    legW: lerp(15, 22, s),
  };
}
