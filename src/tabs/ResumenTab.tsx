import { useMemo } from 'react';
import { Card, Stat } from '../components/ui';
import { ENLACES } from '../enlaces';
import { EMPLEADOS, MODELO, seVa } from '../model/datos';
import { confusionMatrix, fmt, fmtPct, rocCurve } from '../stats';

const ETAPAS = [
  ['Recolección de datos', '1.470 empleados y 35 atributos del dataset IBM HR Analytics (ficticio, creado por IBM).'],
  ['Pre-procesado', 'Limpieza (sin nulos ni duplicados, outliers plausibles), reducción de 4 columnas constantes o de ID, 5 atributos derivados, one-hot encoding y normalización min-max.'],
  ['Análisis exploratorio', 'Tasa de attrition por categoría, comparación de variables numéricas y correlaciones.'],
  ['Modelado', 'Regresión logística estadística (VIF y eliminación hacia atrás, como el paper) y 7 algoritmos con búsqueda de hiperparámetros por validación cruzada de 5 pliegues.'],
  ['Evaluación', 'Métricas en el 30 % de prueba con umbral 0,5 y con umbral ajustado, curvas ROC, reglas del árbol, importancia de variables y ranking de riesgo.'],
];

const FACTORES = [
  ['Horas extra', 'quienes hacen horas extra se van ~3 veces más (31 % contra 10 %).'],
  ['Perfil junior', 'poca edad, poca experiencia y pocos años en la empresa.'],
  ['Baja satisfacción', 'con el entorno, el trabajo y el balance vida-trabajo.'],
  ['Ingreso bajo para el nivel', 'y ausencia de stock options.'],
  ['Viajes frecuentes y estado civil soltero', ''],
  ['Puestos', 'Sales Representative, Laboratory Technician y Human Resources.'],
];

export function ResumenTab({ irA }: { irA(tab: string): void }) {
  const r = useMemo(() => {
    const lr = MODELO.modelos.find((m) => m.nombre === 'Regresión Logística')!;
    const cm = confusionMatrix(MODELO.yTest, lr.proba, 0.5);
    const auc = rocCurve(MODELO.yTest, lr.proba).auc;
    const orden = lr.proba.map((p, k) => ({ p, y: MODELO.yTest[k] })).sort((a, b) => b.p - a.p);
    const top = orden.slice(0, Math.floor(orden.length * 0.2));
    const captura = top.reduce((s, d) => s + d.y, 0) / MODELO.yTest.reduce((s, v) => s + v, 0);
    const bajas = EMPLEADOS.reduce((s, e) => s + seVa(e), 0);
    return { lr, cm, auc, captura, bajas };
  }, []);

  return (
    <>
      <Card>
        <div className="portada">
          <div>
            <p className="kicker">Universidad CAECE · Aprendizaje Artificial · Unidad 3</p>
            <h2 className="titulo">Predicción de attrition de empleados</h2>
            <p className="muted" style={{ maxWidth: 760 }}>
              ¿Qué empleados tienen más probabilidad de irse de la compañía y por qué? Se compararon siete algoritmos de clasificación
              sobre el dataset <i>IBM HR Analytics Employee Attrition &amp; Performance</i>, siguiendo las cinco etapas de Setiawan et
              al. (2020).
            </p>
            <p style={{ margin: 0 }}>
              <b>Autor:</b> Fernando Caceres
            </p>
          </div>
          <div className="row no-print enlaces">
            <a className="btn primary" href={ENLACES.informe} target="_blank" rel="noreferrer">
              Informe (PDF)
            </a>
            <a className="btn" href={ENLACES.notebook} target="_blank" rel="noreferrer">
              Notebook
            </a>
            <a className="btn" href={ENLACES.colab} target="_blank" rel="noreferrer">
              Abrir en Colab
            </a>
            <a className="btn" href={ENLACES.dataset} download="WA_Fn-UseC_-HR-Employee-Attrition.csv">
              Dataset (CSV)
            </a>
            <a className="btn" href={ENLACES.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </Card>

      <div className="stats grandes">
        <Stat label="Empleados" value={fmt(EMPLEADOS.length, 0)} />
        <Stat label="Tasa de attrition" value={fmtPct(r.bajas / EMPLEADOS.length)} title={`${r.bajas} bajas`} />
        <Stat label="Mejor modelo" value="Regresión Logística" />
        <Stat label="AUC en prueba" value={fmt(r.auc, 3)} title={`Validación cruzada: ${fmt(r.lr.aucCv!, 3)}`} />
        <Stat label="Sensibilidad / especificidad" value={`${fmtPct(r.cm.recall, 0)} / ${fmtPct(r.cm.specificity, 0)}`} title="Con umbral 0,5" />
        <Stat label="Bajas en el 20 % de mayor riesgo" value={fmtPct(r.captura, 0)} />
      </div>

      <div className="grid-2">
        <Card title="Resultado">
          <p>
            La <b>Regresión Logística</b> fue el mejor modelo en validación cruzada (AUC {fmt(r.lr.aucCv!, 3)}) y en el conjunto de
            prueba (AUC {fmt(r.auc, 3)}). Con umbral 0,5 detecta el {fmtPct(r.cm.recall, 0)} de las bajas con una especificidad del{' '}
            {fmtPct(r.cm.specificity, 0)}, comparable al paper de referencia (73 % y 75 %), y además es interpretable.
          </p>
          <p>
            <b>Valor práctico:</b> si RRHH ordena a los empleados por probabilidad de irse, el 20 % de mayor riesgo concentra el{' '}
            {fmtPct(r.captura, 0)} de las bajas reales. Eso permite enfocar las acciones de retención.
          </p>
          <div className="row no-print">
            <button onClick={() => irA('modelos')}>Comparar modelos</button>
            <button onClick={() => irA('individual')}>Probar una predicción</button>
            <button onClick={() => irA('masiva')}>Ranking de riesgo</button>
          </div>
        </Card>
        <Card title="Factores clave de abandono">
          <ul className="lista">
            {FACTORES.map(([t, d]) => (
              <li key={t}>
                <b>{t}</b>
                {d && `: ${d}`}
              </li>
            ))}
          </ul>
          <button className="no-print" onClick={() => irA('exploratorio')}>
            Ver el análisis exploratorio
          </button>
        </Card>
      </div>

      <Card title="Metodología: las cinco etapas de Setiawan et al. (2020)">
        <ol className="etapas">
          {ETAPAS.map(([t, d]) => (
            <li key={t}>
              <b>{t}.</b> {d}
            </li>
          ))}
        </ol>
        <p className="chart-caption">
          Partición estratificada 70 / 30 ({MODELO.nTrain} empleados de entrenamiento y {MODELO.nTest} de prueba, semilla{' '}
          {MODELO.semilla}). Referencia: Setiawan, I. et al. (2020).{' '}
          <a href={ENLACES.paper} target="_blank" rel="noreferrer">
            HR analytics: Employee attrition analysis using logistic regression
          </a>
          . <i>IOP Conf. Series: Materials Science and Engineering</i>, 830, 032001.
        </p>
      </Card>
    </>
  );
}
