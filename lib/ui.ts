import type { CSSProperties } from 'react';

export const INK = '#141414';
export const ARCHIVO = "'Archivo Black', system-ui, sans-serif";
export const RUBIK = "'Rubik', system-ui, -apple-system, sans-serif";

export const card: CSSProperties = {
  background: '#fff',
  border: `3px solid ${INK}`,
  borderRadius: 20,
  boxShadow: `6px 6px 0 ${INK}`,
  padding: 18,
  marginBottom: 16,
};

export const barOuter: CSSProperties = {
  height: 16,
  background: '#EFE6C6',
  border: `2px solid ${INK}`,
  borderRadius: 999,
  overflow: 'hidden',
};

export function btn(bg: string, extra: CSSProperties = {}): CSSProperties {
  return {
    background: bg,
    border: `3px solid ${INK}`,
    borderRadius: 14,
    boxShadow: `4px 4px 0 ${INK}`,
    padding: '13px 16px',
    fontWeight: 900,
    cursor: 'pointer',
    fontFamily: RUBIK,
    fontSize: 16,
    letterSpacing: 0.3,
    color: INK,
    ...extra,
  };
}
