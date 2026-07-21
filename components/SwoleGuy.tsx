import { getSwole, clamp, lerp } from '@/lib/challenge';

const INK = '#141414';

export default function SwoleGuy({
  total,
  totalGoal,
  color,
  size = 180,
  flexing = false,
}: {
  total: number;
  totalGoal: number;
  color: string;
  size?: number;
  flexing?: boolean;
}) {
  const { f } = getSwole(total, totalGoal);
  const s = clamp(f, 0, 1);
  const skin = '#F4C89B';
  const skinDark = '#DDA778';
  const peak = totalGoal > 0 && total / totalGoal >= 0.8;

  const shoulder = lerp(30, 58, s);
  const waist = lerp(20, 30, s);
  const bicep = lerp(9, 25, s);
  const armW = lerp(11, 18, s);
  const foreW = lerp(10, 15, s);
  const legW = lerp(15, 22, s);
  const grin = lerp(9, 20, s);
  const cx = 100;

  const arm = (sign: number) => {
    const sh = [cx + sign * (shoulder - 3), 92];
    const el = [cx + sign * (shoulder + 16), 52];
    const fi = [cx + sign * (shoulder - 4), 26];
    const bx = (sh[0] + el[0]) / 2;
    const by = (sh[1] + el[1]) / 2;
    return (
      <g key={sign}>
        <line x1={sh[0]} y1={sh[1]} x2={el[0]} y2={el[1]} stroke={skin} strokeWidth={armW} strokeLinecap="round" />
        <ellipse
          cx={bx}
          cy={by}
          rx={bicep}
          ry={bicep * 1.15}
          fill={skin}
          stroke={skinDark}
          strokeWidth="1.5"
          transform={`rotate(${sign * 22} ${bx} ${by})`}
        />
        <line x1={el[0]} y1={el[1]} x2={fi[0]} y2={fi[1]} stroke={skin} strokeWidth={foreW} strokeLinecap="round" />
        <circle cx={fi[0]} cy={fi[1]} r={foreW * 0.75} fill={skin} stroke={INK} strokeWidth="2.5" />
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={(size * 220) / 200}
      className={flexing ? 'flexing' : undefined}
      style={{ display: 'block' }}
    >
      {peak && <ellipse cx="100" cy="118" rx="92" ry="104" fill="#FFD54A" opacity="0.4" />}
      <ellipse cx={cx - (legW / 2 + 6)} cy="204" rx={legW * 0.7} ry="7" fill={INK} />
      <ellipse cx={cx + (legW / 2 + 6)} cy="204" rx={legW * 0.7} ry="7" fill={INK} />
      <rect x={cx - (legW + 4)} y="150" width={legW} height="52" rx={legW / 2} fill={skin} stroke={INK} strokeWidth="3" />
      <rect x={cx + 4} y="150" width={legW} height="52" rx={legW / 2} fill={skin} stroke={INK} strokeWidth="3" />
      <rect x={cx - (waist + 8)} y="145" width={(waist + 8) * 2} height="26" rx="10" fill={color} stroke={INK} strokeWidth="3" />
      <rect x={cx - 9} y="66" width="18" height="20" fill={skin} stroke={INK} strokeWidth="3" />
      <path
        d={`M ${cx - shoulder} 88 Q ${cx - shoulder - 2} 120 ${cx - waist} 150 L ${cx + waist} 150 Q ${cx + shoulder + 2} 120 ${cx + shoulder} 88 Q ${cx} 78 ${cx - shoulder} 88 Z`}
        fill={color}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {s > 0.35 && (
        <g opacity="0.32">
          <path d={`M ${cx} 96 L ${cx} 133`} stroke={INK} strokeWidth="2" />
          <path d={`M ${cx - shoulder * 0.5} 101 Q ${cx - 6} 109 ${cx} 101`} stroke={INK} strokeWidth="2" fill="none" />
          <path d={`M ${cx + shoulder * 0.5} 101 Q ${cx + 6} 109 ${cx} 101`} stroke={INK} strokeWidth="2" fill="none" />
        </g>
      )}
      {arm(-1)}
      {arm(1)}
      <circle cx={cx} cy="48" r="24" fill={skin} stroke={INK} strokeWidth="3" />
      <path d="M 76 40 Q 100 30 124 40 L 124 46 Q 100 37 76 46 Z" fill={color} stroke={INK} strokeWidth="2.5" />
      <path d="M 122 43 l 12 -5 l -2 9 z" fill={color} stroke={INK} strokeWidth="2" />
      {peak ? (
        <>
          <rect x="83" y="44" width="34" height="11" rx="4" fill={INK} />
          <rect x="86" y="46" width="7" height="3" rx="1.5" fill="#fff" opacity="0.7" />
        </>
      ) : (
        <>
          <circle cx="92" cy="47" r="3" fill={INK} />
          <circle cx="108" cy="47" r="3" fill={INK} />
        </>
      )}
      <path
        d={`M ${100 - grin / 2} 57 Q 100 ${60 + grin / 3} ${100 + grin / 2} 57`}
        stroke={INK}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {s > 0.05 && <ellipse cx="120" cy="53" rx="2.6" ry="4" fill="#5AB2FF" stroke={INK} strokeWidth="1" />}
      {peak && (
        <text x="150" y="70" fontSize="18">
          ✨
        </text>
      )}
    </svg>
  );
}
