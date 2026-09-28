const cache = new Map<string, Intl.NumberFormat>();

function formatter(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('es-AR', { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: true });
    cache.set(key, f);
  }
  return f;
}

/** Número con coma decimal y punto de miles (formato argentino). */
export function fmt(x: number, decimals = 2): string {
  if (x === Infinity) return '∞';
  if (x === -Infinity) return '−∞';
  if (!Number.isFinite(x)) return '—';
  const s = formatter(decimals, decimals).format(x);
  return s === `-${formatter(decimals, decimals).format(0)}` ? formatter(decimals, decimals).format(0) : s;
}

/** Número con hasta `max` decimales, sin ceros de relleno. */
export function fmtAuto(x: number, max = 4): string {
  if (!Number.isFinite(x)) return fmt(x);
  return formatter(0, max).format(x);
}

/** p-valor con 3 decimales o "< 0,001". */
export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return '—';
  if (p < 0.001) return '< 0,001';
  return fmt(p, 3);
}

export function fmtPct(x: number, decimals = 1): string {
  if (!Number.isFinite(x)) return '—';
  return `${fmt(x * 100, decimals)} %`;
}

/** Interpreta un número escrito en formato argentino o con punto decimal. */
export function parseNumber(s: string): number {
  const t = s.trim();
  if (!t) return NaN;
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.'));
  return Number(t);
}
