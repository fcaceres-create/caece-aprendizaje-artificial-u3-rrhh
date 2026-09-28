import { seVa, type Empleado } from './datos';
import { ESCALA_BALANCE, ESCALA_SATISFACCION } from './etiquetas';
import { DERIVADAS } from './prediccion';

/** Variables categóricas del EDA del notebook (sección 3.1). Las nominales se ordenan por tasa. */
export const CATEGORICAS_EDA = [
  'OverTime',
  'MaritalStatus',
  'BusinessTravel',
  'Department',
  'JobRole',
  'EducationField',
  'Gender',
  'RangoEdad',
  'QuintilIngreso',
  'JobLevel',
  'StockOptionLevel',
  'EnvironmentSatisfaction',
  'JobSatisfaction',
  'JobInvolvement',
  'WorkLifeBalance',
  'RelationshipSatisfaction',
];
export const NOMINALES_EDA = ['OverTime', 'MaritalStatus', 'BusinessTravel', 'Department', 'JobRole', 'EducationField', 'Gender'];

/** Variables numéricas del EDA del notebook (sección 3.2). */
export const NUMERICAS_EDA = [
  'Age',
  'MonthlyIncome',
  'TotalWorkingYears',
  'YearsAtCompany',
  'YearsInCurrentRole',
  'YearsWithCurrManager',
  'DistanceFromHome',
  'NumCompaniesWorked',
  'SatisfaccionTotal',
];

/** Cuantil con interpolación lineal (como numpy/pandas). */
export function cuantil(valores: number[], q: number): number {
  const s = [...valores].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const pos = (s.length - 1) * q;
  const i = Math.floor(pos);
  return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (pos - i) : s[i];
}

export function valorNumerico(e: Empleado, variable: string): number {
  return DERIVADAS[variable] ? DERIVADAS[variable](e) : Number(e[variable]);
}

/** Cortes de quintiles de ingreso calculados sobre el dataset completo (pd.qcut). */
export function cortesQuintiles(empleados: Empleado[]): number[] {
  const ingresos = empleados.map((e) => Number(e.MonthlyIncome));
  return [0.2, 0.4, 0.6, 0.8].map((q) => cuantil(ingresos, q));
}

const QUINTILES = ['Q1 (bajo)', 'Q2', 'Q3', 'Q4', 'Q5 (alto)'];

/** Categoría de un empleado en una variable del EDA (con la discretización del notebook, sección 2.4). */
export function categoria(e: Empleado, variable: string, cortes: number[]): string {
  switch (variable) {
    case 'RangoEdad': {
      const a = Number(e.Age);
      return a <= 25 ? '18-25' : a <= 35 ? '26-35' : a <= 45 ? '36-45' : '46-60';
    }
    case 'QuintilIngreso': {
      const x = Number(e.MonthlyIncome);
      const i = cortes.findIndex((c) => x <= c);
      return QUINTILES[i === -1 ? 4 : i];
    }
    case 'EnvironmentSatisfaction':
    case 'JobSatisfaction':
    case 'RelationshipSatisfaction':
    case 'JobInvolvement':
      return ESCALA_SATISFACCION[Number(e[variable])] ?? String(e[variable]);
    case 'WorkLifeBalance':
      return ESCALA_BALANCE[Number(e[variable])] ?? String(e[variable]);
    default:
      return String(e[variable]);
  }
}

export interface TasaCategoria {
  categoria: string;
  n: number;
  seVan: number;
  tasa: number;
}

/** Tasa de attrition por categoría: nominales ordenadas por tasa, ordinales en su orden natural. */
export function tasasPorCategoria(empleados: Empleado[], variable: string, cortes: number[]): TasaCategoria[] {
  const grupos = new Map<string, { n: number; seVan: number }>();
  for (const e of empleados) {
    const k = categoria(e, variable, cortes);
    const g = grupos.get(k) ?? { n: 0, seVan: 0 };
    g.n++;
    g.seVan += seVa(e);
    grupos.set(k, g);
  }
  const filas = [...grupos].map(([k, g]) => ({ categoria: k, n: g.n, seVan: g.seVan, tasa: g.seVan / g.n }));
  if (NOMINALES_EDA.includes(variable)) return filas.sort((a, b) => b.tasa - a.tasa);
  return filas.sort((a, b) => a.categoria.localeCompare(b.categoria, 'es', { numeric: true }));
}

/** Categorías con mayor tasa de attrition entre todas las variables del EDA (mínimo `minimo` empleados). */
export function categoriasDeMayorRiesgo(empleados: Empleado[], cortes: number[], minimo = 30, top = 10) {
  return CATEGORICAS_EDA.flatMap((v) => tasasPorCategoria(empleados, v, cortes).map((t) => ({ variable: v, ...t })))
    .filter((t) => t.n >= minimo)
    .sort((a, b) => b.tasa - a.tasa)
    .slice(0, top);
}

export interface ResumenNumerico {
  n: number;
  media: number;
  mediana: number;
  q1: number;
  q3: number;
}

function resumen(valores: number[]): ResumenNumerico {
  return {
    n: valores.length,
    media: valores.reduce((s, v) => s + v, 0) / (valores.length || 1),
    mediana: cuantil(valores, 0.5),
    q1: cuantil(valores, 0.25),
    q3: cuantil(valores, 0.75),
  };
}

/** Comparación de una variable numérica entre quienes se quedan y quienes se van, con histograma en % por grupo. */
export function compararNumerica(empleados: Empleado[], variable: string, nBins = 12) {
  const quedan = empleados.filter((e) => !seVa(e)).map((e) => valorNumerico(e, variable));
  const van = empleados.filter((e) => seVa(e)).map((e) => valorNumerico(e, variable));
  const todos = [...quedan, ...van];
  const lo = Math.min(...todos);
  const hi = Math.max(...todos);
  const enteros = todos.every((v) => Number.isInteger(v));
  const bins = enteros && hi - lo + 1 <= nBins ? hi - lo + 1 : nBins;
  const ancho = (hi - lo) / bins || 1;
  const hist = Array.from({ length: bins }, (_, i) => ({ desde: lo + i * ancho, hasta: lo + (i + 1) * ancho, quedan: 0, van: 0 }));
  const idx = (v: number) => Math.min(bins - 1, Math.floor((v - lo) / ancho));
  quedan.forEach((v) => hist[idx(v)].quedan++);
  van.forEach((v) => hist[idx(v)].van++);
  return {
    quedan: resumen(quedan),
    van: resumen(van),
    enteros: enteros && bins === hi - lo + 1,
    hist: hist.map((h) => ({ ...h, quedan: quedan.length ? h.quedan / quedan.length : 0, van: van.length ? h.van / van.length : 0 })),
  };
}

/** Correlación de Pearson. */
export function correlacion(x: number[], y: number[]): number {
  const n = x.length;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
}
