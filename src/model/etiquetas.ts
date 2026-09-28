/** Nombres en castellano de las variables del dataset y de las derivadas. */
export const ETIQUETAS: Record<string, string> = {
  Age: 'Edad',
  Attrition: 'Attrition',
  BusinessTravel: 'Viajes de trabajo',
  DailyRate: 'Tarifa diaria',
  Department: 'Departamento',
  DistanceFromHome: 'Distancia al hogar',
  Education: 'Nivel educativo',
  EducationField: 'Campo de estudio',
  EnvironmentSatisfaction: 'Satisfacción con el entorno',
  Gender: 'Género',
  HourlyRate: 'Tarifa por hora',
  JobInvolvement: 'Compromiso con el trabajo',
  JobLevel: 'Nivel del puesto',
  JobRole: 'Puesto',
  JobSatisfaction: 'Satisfacción con el trabajo',
  MaritalStatus: 'Estado civil',
  MonthlyIncome: 'Ingreso mensual',
  MonthlyRate: 'Tarifa mensual',
  NumCompaniesWorked: 'Empresas anteriores',
  OverTime: 'Horas extra',
  PercentSalaryHike: 'Aumento salarial (%)',
  PerformanceRating: 'Evaluación de desempeño',
  RelationshipSatisfaction: 'Satisfacción con las relaciones',
  StockOptionLevel: 'Nivel de stock options',
  TotalWorkingYears: 'Años de experiencia',
  TrainingTimesLastYear: 'Capacitaciones el último año',
  WorkLifeBalance: 'Balance vida-trabajo',
  YearsAtCompany: 'Años en la compañía',
  YearsInCurrentRole: 'Años en el puesto actual',
  YearsSinceLastPromotion: 'Años desde la última promoción',
  YearsWithCurrManager: 'Años con el jefe actual',
  IngresoPorNivel: 'Ingreso por nivel',
  AniosPromPorEmpresa: 'Años promedio por empresa',
  ProporcionAniosEnEmpresa: 'Proporción de la carrera en la empresa',
  AniosSinPromocionRel: 'Años sin promoción (relativo)',
  SatisfaccionTotal: 'Satisfacción total',
  RangoEdad: 'Rango de edad',
  QuintilIngreso: 'Quintil de ingreso',
};

/** Nombre legible de una variable del modelo, incluidas las ficticias ("OverTime_Yes" → "Horas extra: Yes"). */
export function etiqueta(variable: string): string {
  if (ETIQUETAS[variable]) return ETIQUETAS[variable];
  const i = variable.indexOf('_');
  if (i > 0 && ETIQUETAS[variable.slice(0, i)]) return `${ETIQUETAS[variable.slice(0, i)]}: ${variable.slice(i + 1)}`;
  return variable;
}

/** Escalas de las encuestas (1 a 4). */
export const ESCALA_SATISFACCION: Record<number, string> = { 1: '1-Bajo', 2: '2-Medio', 3: '3-Alto', 4: '4-Muy alto' };
export const ESCALA_BALANCE: Record<number, string> = { 1: '1-Malo', 2: '2-Bueno', 3: '3-Mejor', 4: '4-Óptimo' };
export const ESCALA_EDUCACION: Record<number, string> = {
  1: '1-Secundario',
  2: '2-Terciario',
  3: '3-Grado',
  4: '4-Maestría',
  5: '5-Doctorado',
};
export const ESCALA_DESEMPENO: Record<number, string> = { 1: '1-Bajo', 2: '2-Bueno', 3: '3-Excelente', 4: '4-Sobresaliente' };
