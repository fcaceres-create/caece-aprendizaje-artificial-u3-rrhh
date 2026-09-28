import { EMPLEADOS, type Empleado } from './datos';
import { cuantil } from './eda';
import { ESCALA_BALANCE, ESCALA_DESEMPENO, ESCALA_EDUCACION, ESCALA_SATISFACCION } from './etiquetas';
import { CATEGORIAS_MODELO, CATEGORIAS_REFERENCIA, NOMINALES } from './prediccion';

export type Campo =
  | { variable: string; tipo: 'numero'; min: number; max: number; paso?: number }
  | { variable: string; tipo: 'opciones'; opciones: { valor: string | number; texto: string }[] };

const escala = (e: Record<number, string>) => Object.entries(e).map(([k, v]) => ({ valor: Number(k), texto: v }));
const nominal = (n: string) =>
  [...CATEGORIAS_REFERENCIA[n], ...CATEGORIAS_MODELO[n]].sort().map((v) => ({ valor: v, texto: v }));
const niveles = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => ({ valor: desde + i, texto: String(desde + i) }));

function rango(variable: string): { min: number; max: number } {
  const v = EMPLEADOS.map((e) => Number(e[variable]));
  return { min: Math.min(...v), max: Math.max(...v) };
}
const numero = (variable: string, paso?: number): Campo => ({ variable, tipo: 'numero', ...rango(variable), paso });

export const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: 'Puesto',
    campos: [
      { variable: 'OverTime', tipo: 'opciones', opciones: nominal('OverTime') },
      { variable: 'Department', tipo: 'opciones', opciones: nominal('Department') },
      { variable: 'JobRole', tipo: 'opciones', opciones: nominal('JobRole') },
      { variable: 'JobLevel', tipo: 'opciones', opciones: niveles(1, 5) },
      { variable: 'BusinessTravel', tipo: 'opciones', opciones: nominal('BusinessTravel') },
      numero('DistanceFromHome'),
    ],
  },
  {
    titulo: 'Compensación',
    campos: [
      numero('MonthlyIncome', 100),
      { variable: 'StockOptionLevel', tipo: 'opciones', opciones: niveles(0, 3) },
      numero('PercentSalaryHike'),
      numero('DailyRate', 10),
      numero('HourlyRate'),
      numero('MonthlyRate', 100),
    ],
  },
  {
    titulo: 'Trayectoria',
    campos: [
      numero('Age'),
      numero('TotalWorkingYears'),
      numero('NumCompaniesWorked'),
      numero('YearsAtCompany'),
      numero('YearsInCurrentRole'),
      numero('YearsSinceLastPromotion'),
      numero('YearsWithCurrManager'),
      numero('TrainingTimesLastYear'),
    ],
  },
  {
    titulo: 'Satisfacción y desempeño',
    campos: [
      { variable: 'EnvironmentSatisfaction', tipo: 'opciones', opciones: escala(ESCALA_SATISFACCION) },
      { variable: 'JobSatisfaction', tipo: 'opciones', opciones: escala(ESCALA_SATISFACCION) },
      { variable: 'RelationshipSatisfaction', tipo: 'opciones', opciones: escala(ESCALA_SATISFACCION) },
      { variable: 'JobInvolvement', tipo: 'opciones', opciones: escala(ESCALA_SATISFACCION) },
      { variable: 'WorkLifeBalance', tipo: 'opciones', opciones: escala(ESCALA_BALANCE) },
      { variable: 'PerformanceRating', tipo: 'opciones', opciones: escala(ESCALA_DESEMPENO) },
    ],
  },
  {
    titulo: 'Datos personales',
    campos: [
      { variable: 'Gender', tipo: 'opciones', opciones: nominal('Gender') },
      { variable: 'MaritalStatus', tipo: 'opciones', opciones: nominal('MaritalStatus') },
      { variable: 'Education', tipo: 'opciones', opciones: escala(ESCALA_EDUCACION) },
      { variable: 'EducationField', tipo: 'opciones', opciones: nominal('EducationField') },
    ],
  },
];

/** Perfil típico: mediana de las numéricas y categoría más frecuente de las nominales. */
export function perfilTipico(): Empleado {
  const e: Empleado = {};
  for (const g of GRUPOS)
    for (const c of g.campos) {
      if (NOMINALES.includes(c.variable)) {
        const cuenta = new Map<string, number>();
        EMPLEADOS.forEach((x) => cuenta.set(String(x[c.variable]), (cuenta.get(String(x[c.variable])) ?? 0) + 1));
        e[c.variable] = [...cuenta].sort((a, b) => b[1] - a[1])[0][0];
      } else e[c.variable] = Math.round(cuantil(EMPLEADOS.map((x) => Number(x[c.variable])), 0.5));
    }
  return e;
}

export interface Accion {
  descripcion: string;
  aplica(e: Empleado): boolean;
  aplicar(e: Empleado): Empleado;
}

/** Acciones de retención que RRHH puede tomar, sobre variables que la empresa controla. */
export const ACCIONES: Accion[] = [
  { descripcion: 'Eliminar las horas extra', aplica: (e) => e.OverTime === 'Yes', aplicar: (e) => ({ ...e, OverTime: 'No' }) },
  {
    descripcion: 'Otorgar stock options (nivel 1)',
    aplica: (e) => Number(e.StockOptionLevel) === 0,
    aplicar: (e) => ({ ...e, StockOptionLevel: 1 }),
  },
  {
    descripcion: 'Reducir los viajes a «Travel_Rarely»',
    aplica: (e) => e.BusinessTravel === 'Travel_Frequently',
    aplicar: (e) => ({ ...e, BusinessTravel: 'Travel_Rarely' }),
  },
  {
    descripcion: 'Aumento salarial del 15 %',
    aplica: () => true,
    aplicar: (e) => ({ ...e, MonthlyIncome: Math.round(Number(e.MonthlyIncome) * 1.15) }),
  },
  {
    descripcion: 'Promoción (se reinician los años sin promoción)',
    aplica: (e) => Number(e.YearsSinceLastPromotion) > 0,
    aplicar: (e) => ({ ...e, YearsSinceLastPromotion: 0 }),
  },
  {
    descripcion: 'Mejorar la satisfacción con el entorno a 4',
    aplica: (e) => Number(e.EnvironmentSatisfaction) < 4,
    aplicar: (e) => ({ ...e, EnvironmentSatisfaction: 4 }),
  },
  {
    descripcion: 'Mejorar la satisfacción con el trabajo a 4',
    aplica: (e) => Number(e.JobSatisfaction) < 4,
    aplicar: (e) => ({ ...e, JobSatisfaction: 4 }),
  },
  {
    descripcion: 'Mejorar el balance vida-trabajo a 3',
    aplica: (e) => Number(e.WorkLifeBalance) < 3,
    aplicar: (e) => ({ ...e, WorkLifeBalance: 3 }),
  },
];
