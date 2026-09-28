import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { confusionMatrix, rocCurve } from '../stats';
import { EMPLEADOS, MODELO, parsearCsv, seVa } from './datos';
import { categoriasDeMayorRiesgo, cortesQuintiles, tasasPorCategoria } from './eda';
import { predecir, validar } from './prediccion';

/** Resultados que guardó el notebook (redondeados a 3 decimales). */
function resultadosNotebook(archivo: string) {
  const { filas } = parsearCsv(readFileSync(new URL(`../../notebooks/resultados/${archivo}`, import.meta.url), 'utf-8'));
  return new Map(filas.map((f) => [String(f.Modelo), f]));
}

describe('datos', () => {
  it('lee los 1.470 empleados con 237 bajas', () => {
    expect(EMPLEADOS).toHaveLength(1470);
    expect(EMPLEADOS.reduce((s, e) => s + seVa(e), 0)).toBe(237);
  });

  it('el conjunto de prueba exportado coincide con el CSV', () => {
    expect(MODELO.indicesTest).toHaveLength(MODELO.nTest);
    MODELO.indicesTest.forEach((i, k) => expect(seVa(EMPLEADOS[i])).toBe(MODELO.yTest[k]));
  });
});

describe('Regresión Logística en el navegador', () => {
  const lr = MODELO.modelos.find((m) => m.nombre === 'Regresión Logística')!;

  it('reproduce las probabilidades de scikit-learn en los 441 empleados de prueba', () => {
    MODELO.indicesTest.forEach((i, k) => expect(predecir(EMPLEADOS[i]).probabilidad).toBeCloseTo(lr.proba[k], 5));
  });

  it('los aportes suman el logit menos el del empleado promedio', () => {
    const { contribuciones, logit } = predecir(EMPLEADOS[0]);
    const promedio = MODELO.logistica.intercepto + MODELO.logistica.coef.reduce((s, c, j) => s + c * MODELO.logistica.mediaEscalada[j], 0);
    expect(contribuciones.reduce((s, c) => s + c.aporte, 0)).toBeCloseTo(logit - promedio, 10);
  });

  it('valida los empleados del dataset sin problemas y detecta columnas faltantes', () => {
    expect(EMPLEADOS.every((e) => validar(e).length === 0)).toBe(true);
    const { OverTime: _, ...sinHorasExtra } = EMPLEADOS[0];
    expect(validar(sinHorasExtra)).toContain('falta OverTime');
  });
});

describe('métricas contra los resultados del notebook', () => {
  const con05 = resultadosNotebook('resultados_modelos.csv');
  const ajustado = resultadosNotebook('resultados_modelos_umbral_ajustado.csv');

  for (const m of MODELO.modelos) {
    it(m.nombre, () => {
      const umbral05 = m.umbralFijo ? m.umbralAjustado : 0.5;
      for (const [ref, umbral] of [
        [con05.get(m.nombre)!, umbral05],
        [ajustado.get(m.nombre)!, m.umbralAjustado],
      ] as const) {
        const cm = confusionMatrix(MODELO.yTest, m.proba, umbral);
        expect(cm.accuracy).toBeCloseTo(Number(ref.Accuracy), 2);
        expect(cm.recall).toBeCloseTo(Number(ref.Sensibilidad), 2);
        expect(cm.specificity).toBeCloseTo(Number(ref.Especificidad), 2);
        expect(cm.fMeasure).toBeCloseTo(Number(ref.F1), 2);
        expect(rocCurve(MODELO.yTest, m.proba).auc).toBeCloseTo(Number(ref.AUC), 2);
      }
    });
  }
});

describe('análisis exploratorio', () => {
  const cortes = cortesQuintiles(EMPLEADOS);

  it('horas extra: ≈ 31 % contra ≈ 10 %', () => {
    const t = tasasPorCategoria(EMPLEADOS, 'OverTime', cortes);
    expect(t[0]).toMatchObject({ categoria: 'Yes', n: 416 });
    expect(t[0].tasa).toBeCloseTo(0.305, 3);
    expect(t[1].tasa).toBeCloseTo(0.104, 3);
  });

  it('la categoría de mayor riesgo es Sales Representative', () => {
    expect(categoriasDeMayorRiesgo(EMPLEADOS, cortes)[0]).toMatchObject({ variable: 'JobRole', categoria: 'Sales Representative' });
  });

  it('los quintiles de ingreso tienen 294 empleados cada uno', () => {
    expect(tasasPorCategoria(EMPLEADOS, 'QuintilIngreso', cortes).map((t) => t.n)).toEqual([294, 294, 294, 294, 294]);
  });
});
