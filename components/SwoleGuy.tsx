import { getSwole, clamp, lerp } from '@/lib/challenge';

const INK = '#141414';

// Avatar styles. Each is still the same twig-to-swole mechanic, just a different
// character. "classic" is the original so existing users look unchanged.
export const AVATAR_STYLES = [
  { key: 'classic', label: 'Classic', emoji: '💪' },
  { key: 'bear', label: 'Bear', emoji: '🐻' },
  { key: 'robot', label: 'Robot', emoji: '🤖' },
  { key: 'yeti', label: 'Yeti', emoji: '❄️' },
  { key: 'cat', label: 'Buff Cat', emoji: '🐱' },
];

export const AVATAR_KEYS = AVATAR_STYLES.map((s) => s.key);

export default function SwoleGuy({
  total,
  totalGoal,
  color,
  size = 180,
  flexing = false,
  style = 'classic',
}: {
  total: number;
  totalGoal: number;
  color: string;
  size?: number;
  flexing?: boolean;
  style?: string;
}) {
  const { f } = getSwole(total, totalGoal);
  const s = clamp(f, 0, 1);
  const peak = totalGoal > 0 && total / totalGoal >= 0.8;

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={(size * 220) / 200}
      className={flexing ? 'flexing' : undefined}
      style={{ display: 'block' }}
    >
      {peak && <ellipse cx="100" cy="118" rx="92" ry="104" fill="#FFD54A" opacity="0.4" />}
      <Body s={s} color={color} peak={peak} style={style} />
      {peak && (
        <text x="150" y="70" fontSize="18">
          ✨
        </text>
      )}
    </svg>
  );
}

function Body({ s, color, peak, style }: { s: number; color: string; peak: boolean; style: string }) {
  const skin = '#F4C89B';
  const skinDark = '#DDA778';

  const shoulder = lerp(30, 58, s);
  const waist = lerp(20, 30, s);
  const bicep = lerp(9, 25, s);
  const armW = lerp(11, 18, s);
  const foreW = lerp(10, 15, s);
  const legW = lerp(15, 22, s);
  const grin = lerp(9, 20, s);
  const cx = 100;

  // Per-style skin/fur and head decoration.
  const fur =
    style === 'bear'
      ? '#B07A48'
      : style === 'yeti'
        ? '#DCEBF5'
        : style === 'cat'
          ? '#F0A94B'
          : style === 'robot'
            ? '#B8C2CC'
            : skin;
  const furDark =
    style === 'bear'
      ? '#8A5C33'
      : style === 'yeti'
        ? '#B9D4E6'
        : style === 'cat'
          ? '#D98A2B'
          : style === 'robot'
            ? '#8A98A6'
            : skinDark;

  const arm = (sign: number) => {
    const sh = [cx + sign * (shoulder - 3), 92];
    const el = [cx + sign * (shoulder + 16), 52];
    const fi = [cx + sign * (shoulder - 4), 26];
    const bx = (sh[0] + el[0]) / 2;
    const by = (sh[1] + el[1]) / 2;
    return (
      <g key={sign}>
        <line x1={sh[0]} y1={sh[1]} x2={el[0]} y2={el[1]} stroke={fur} strokeWidth={armW} strokeLinecap="round" />
        <ellipse
          cx={bx}
          cy={by}
          rx={bicep}
          ry={bicep * 1.15}
          fill={fur}
          stroke={furDark}
          strokeWidth="1.5"
          transform={`rotate(${sign * 22} ${bx} ${by})`}
        />
        <line x1={el[0]} y1={el[1]} x2={fi[0]} y2={fi[1]} stroke={fur} strokeWidth={foreW} strokeLinecap="round" />
        {style === 'robot' ? (
          <rect x={fi[0] - foreW * 0.7} y={fi[1] - foreW * 0.7} width={foreW * 1.4} height={foreW * 1.4} rx="3" fill={fur} stroke={INK} strokeWidth="2.5" />
        ) : (
          <circle cx={fi[0]} cy={fi[1]} r={foreW * 0.75} fill={fur} stroke={INK} strokeWidth="2.5" />
        )}
      </g>
    );
  };

  return (
    <>
      {/* feet */}
      <ellipse cx={cx - (legW / 2 + 6)} cy="204" rx={legW * 0.7} ry="7" fill={INK} />
      <ellipse cx={cx + (legW / 2 + 6)} cy="204" rx={legW * 0.7} ry="7" fill={INK} />
      {/* legs */}
      <rect x={cx - (legW + 4)} y="150" width={legW} height="52" rx={legW / 2} fill={fur} stroke={INK} strokeWidth="3" />
      <rect x={cx + 4} y="150" width={legW} height="52" rx={legW / 2} fill={fur} stroke={INK} strokeWidth="3" />
      {/* shorts */}
      <rect x={cx - (waist + 8)} y="145" width={(waist + 8) * 2} height="26" rx="10" fill={color} stroke={INK} strokeWidth="3" />
      {/* neck */}
      <rect x={cx - 9} y="66" width="18" height="20" fill={fur} stroke={INK} strokeWidth="3" />
      {/* torso */}
      <path
        d={`M ${cx - shoulder} 88 Q ${cx - shoulder - 2} 120 ${cx - waist} 150 L ${cx + waist} 150 Q ${cx + shoulder + 2} 120 ${cx + shoulder} 88 Q ${cx} 78 ${cx - shoulder} 88 Z`}
        fill={color}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* abs hint as they bulk */}
      {s > 0.35 && (
        <g opacity="0.32">
          <path d={`M ${cx} 96 L ${cx} 133`} stroke={INK} strokeWidth="2" />
          <path d={`M ${cx - shoulder * 0.5} 101 Q ${cx - 6} 109 ${cx} 101`} stroke={INK} strokeWidth="2" fill="none" />
          <path d={`M ${cx + shoulder * 0.5} 101 Q ${cx + 6} 109 ${cx} 101`} stroke={INK} strokeWidth="2" fill="none" />
        </g>
      )}
      {arm(-1)}
      {arm(1)}
      {/* head */}
      {style === 'robot' ? (
        <rect x={cx - 24} y="24" width="48" height="48" rx="10" fill={fur} stroke={INK} strokeWidth="3" />
      ) : (
        <circle cx={cx} cy="48" r="24" fill={fur} stroke={INK} strokeWidth="3" />
      )}

      <Head style={style} color={color} furDark={furDark} peak={peak} grin={grin} s={s} />
    </>
  );
}

function Head({
  style,
  color,
  furDark,
  peak,
  grin,
  s,
}: {
  style: string;
  color: string;
  furDark: string;
  peak: boolean;
  grin: number;
  s: number;
}) {
  const eyes = peak ? (
    <>
      <rect x="83" y="44" width="34" height="11" rx="4" fill={INK} />
      <rect x="86" y="46" width="7" height="3" rx="1.5" fill="#fff" opacity="0.7" />
    </>
  ) : (
    <>
      <circle cx="92" cy="47" r="3" fill={INK} />
      <circle cx="108" cy="47" r="3" fill={INK} />
    </>
  );

  const mouth = (
    <path
      d={`M ${100 - grin / 2} 57 Q 100 ${60 + grin / 3} ${100 + grin / 2} 57`}
      stroke={INK}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  );

  return (
    <>
      {/* ears / antenna per style */}
      {style === 'bear' && (
        <>
          <circle cx="80" cy="30" r="9" fill={furDark} stroke={INK} strokeWidth="3" />
          <circle cx="120" cy="30" r="9" fill={furDark} stroke={INK} strokeWidth="3" />
        </>
      )}
      {style === 'cat' && (
        <>
          <path d="M 80 30 L 74 14 L 90 26 Z" fill={furDark} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M 120 30 L 126 14 L 110 26 Z" fill={furDark} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )}
      {style === 'yeti' && (
        <>
          <path d="M 78 34 q -6 -14 6 -18" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <path d="M 122 34 q 6 -14 -6 -18" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {style === 'robot' && (
        <>
          <line x1="100" y1="24" x2="100" y2="14" stroke={INK} strokeWidth="3" />
          <circle cx="100" cy="12" r="4" fill={color} stroke={INK} strokeWidth="2.5" />
        </>
      )}
      {style === 'classic' && (
        <>
          <path d="M 76 40 Q 100 30 124 40 L 124 46 Q 100 37 76 46 Z" fill={color} stroke={INK} strokeWidth="2.5" />
          <path d="M 122 43 l 12 -5 l -2 9 z" fill={color} stroke={INK} strokeWidth="2" />
        </>
      )}

      {eyes}
      {mouth}

      {/* whiskers for the cat */}
      {style === 'cat' && s >= 0 && (
        <g stroke={INK} strokeWidth="1.5" opacity="0.8">
          <line x1="70" y1="52" x2="84" y2="53" />
          <line x1="70" y1="56" x2="84" y2="56" />
          <line x1="130" y1="52" x2="116" y2="53" />
          <line x1="130" y1="56" x2="116" y2="56" />
        </g>
      )}

      {/* the classic sunglasses-glint once swole (non-robot) */}
      {s > 0.05 && style !== 'robot' && !peak && (
        <ellipse cx="120" cy="53" rx="2.6" ry="4" fill="#5AB2FF" stroke={INK} strokeWidth="1" />
      )}
    </>
  );
}
