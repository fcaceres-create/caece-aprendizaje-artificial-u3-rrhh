import { MODELO, type Empleado } from './datos';

/** Variables nominales que el notebook transforma con one-hot encoding (drop_first). */
export const NOMINALES = ['BusinessTravel', 'Department', 'EducationField', 'Gender', 'JobRole', 'MaritalStatus', 'OverTime'];

/** Variables derivadas del notebook (sección 2.3). */
export const DERIVADAS: Record<string, (e: Empleado) => number> = {
  IngresoPorNivel: (e) => num(e.MonthlyIncome) / num(e.JobLevel),
  AniosPromPorEmpresa: (e) => num(e.TotalWorkingYears) / (num(e.NumCompaniesWorked) + 1),
  ProporcionAniosEnEmpresa: (e) => num(e.YearsAtCompany) / (num(e.TotalWorkingYears) + 1),
  AniosSinPromocionRel: (e) => num(e.YearsSinceLastPromotion) / (num(e.YearsAtCompany) + 1),
  SatisfaccionTotal: (e) =>
    (num(e.EnvironmentSatisfaction) + num(e.JobSatisfaction) + num(e.RelationshipSatisfaction) + num(e.JobInvolvement)) / 4,
};

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim().replace(',', '.');
  return s === '' ? NaN : Number(s);
}

const VARS = MODELO.logistica.variables;

/** Columnas originales del CSV que el modelo necesita. */
export const COLUMNAS_REQUERIDAS: string[] = (() => {
  const set = new Set<string>();
  for (const v of VARS) {
    const nominal = NOMINALES.find((n) => v.startsWith(`${n}_`));
    if (nominal) set.add(nominal);
    else if (!DERIVADAS[v]) set.add(v);
  }
  return [...set];
})();

/** Categorías conocidas de cada nominal, deducidas de las ficticias del modelo más la de referencia. */
export const CATEGORIAS_MODELO: Record<string, string[]> = Object.fromEntries(
  NOMINALES.map((n) => [n, VARS.filter((v) => v.startsWith(`${n}_`)).map((v) => v.slice(n.length + 1))]),
);

/** Valor de una variable del modelo para un empleado (ficticias 0/1, derivadas o numéricas). */
export function valorVariable(e: Empleado, variable: string): number {
  const nominal = NOMINALES.find((n) => variable.startsWith(`${n}_`));
  if (nominal) return String(e[nominal]).trim() === variable.slice(nominal.length + 1) ? 1 : 0;
  if (DERIVADAS[variable]) return DERIVADAS[variable](e);
  return num(e[variable]);
}

export interface Contribucion {
  variable: string;
  valor: number;
  /** Aporte al logit respecto del empleado promedio del entrenamiento: coef · (x escalado − media escalada). */
  aporte: number;
}

export interface Prediccion {
  probabilidad: number;
  logit: number;
  contribuciones: Contribucion[];
}

/** Regresión Logística del notebook: escalado min-max del entrenamiento y coeficientes de scikit-learn. */
export function predecir(e: Empleado): Prediccion {
  const { min, max, coef, intercepto, mediaEscalada } = MODELO.logistica;
  let logit = intercepto;
  const contribuciones: Contribucion[] = VARS.map((variable, j) => {
    const valor = valorVariable(e, variable);
    const rango = max[j] - min[j];
    const escalado = rango === 0 ? 0 : (valor - min[j]) / rango;
    logit += coef[j] * escalado;
    return { variable, valor, aporte: coef[j] * (escalado - mediaEscalada[j]) };
  });
  return { probabilidad: 1 / (1 + Math.exp(-logit)), logit, contribuciones };
}

/** Problemas de un empleado cargado desde un archivo: columnas faltantes, valores no numéricos o categorías nuevas. */
export function validar(e: Empleado): string[] {
  const problemas: string[] = [];
  for (const c of COLUMNAS_REQUERIDAS) {
    const v = e[c];
    if (v === undefined || v === '') problemas.push(`falta ${c}`);
    else if (NOMINALES.includes(c)) {
      const cats = CATEGORIAS_MODELO[c];
      if (!cats.includes(String(v)) && !CATEGORIAS_REFERENCIA[c]?.includes(String(v))) problemas.push(`${c} desconocido: ${v}`);
    } else if (!Number.isFinite(num(v))) problemas.push(`${c} no es numérico`);
  }
  return problemas;
}

/** Categoría de referencia de cada nominal (la primera en orden alfabético, que drop_first elimina). */
export const CATEGORIAS_REFERENCIA: Record<string, string[]> = {
  BusinessTravel: ['Non-Travel'],
  Department: ['Human Resources'],
  EducationField: ['Human Resources'],
  Gender: ['Female'],
  JobRole: ['Healthcare Representative'],
  MaritalStatus: ['Divorced'],
  OverTime: ['No'],
};

export function nivelRiesgo(p: number, umbral: number): 'alto' | 'medio' | 'bajo' {
  if (p >= umbral) return 'alto';
  if (p >= umbral / 2) return 'medio';
  return 'bajo';
}
