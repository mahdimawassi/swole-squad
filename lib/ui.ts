import type { CSSProperties } from 'react';

export const INK = '#141414';
export const ARCHIVO = "'Archivo Black', system-ui, sans-serif";
export const RUBIK = "'Rubik', system-ui, -apple-system, sans-serif";

export const PAGE: CSSProperties = { maxWidth: 480, margin: '0 auto', padding: '18px 14px 72px' };

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

export const input: CSSProperties = {
  width: '100%',
  border: `3px solid ${INK}`,
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 16,
  fontWeight: 700,
  background: '#FFF9E8',
  color: INK,
};

export const label: CSSProperties = { fontWeight: 800, fontSize: 13, display: 'block', marginBottom: 6 };

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

export function chip(active: boolean, extra: CSSProperties = {}): CSSProperties {
  return {
    background: active ? INK : '#fff',
    color: active ? '#FFE066' : INK,
    border: `3px solid ${INK}`,
    borderRadius: 999,
    padding: '9px 14px',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: RUBIK,
    boxShadow: active ? 'none' : `3px 3px 0 ${INK}`,
    transform: active ? 'translate(3px,3px)' : 'none',
    whiteSpace: 'nowrap',
  };
}

export const pill: CSSProperties = {
  background: INK,
  color: '#FFE066',
  padding: '5px 11px',
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: 0.5,
};
