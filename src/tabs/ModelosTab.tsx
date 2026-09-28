import { useMemo, useState } from 'react';
import { Legend, RocChart } from '../components/charts';
import { ConfusionView } from '../components/Confusion';
import { Card, SliderField } from '../components/ui';
import { MODELO, type ModeloExportado } from '../model/datos';
import { confusionMatrix, fmt, fmtPct, rocCurve } from '../stats';

type Modo = 'fijo' | 'ajustado';

const umbralDe = (m: ModeloExportado, modo: Modo) => (modo === 'ajustado' || m.umbralFijo ? m.umbralAjustado : 0.5);

function formatoParametros(h: Record<string, unknown>): string {
  return Object.entries(h)
    .map(([k, v]) => `${k} = ${Array.isArray(v) ? `(${v.join(', ')})` : v === null ? 'None' : String(v)}`)
    .join(' · ');
}

export function ModelosTab() {
  const [modo, setModo] = useState<Modo>('fijo');
  const [sel, setSel] = useState('Regresión Logística');
  const [umbrales, setUmbrales] = useState<Record<string, number>>({});

  const rocs = useMemo(() => new Map(MODELO.modelos.map((m) => [m.nombre, rocCurve(MODELO.yTest, m.proba)])), []);
  const filas = MODELO.modelos
    .map((m) => ({ m, auc: rocs.get(m.nombre)!.auc, cm: confusionMatrix(MODELO.yTest, m.proba, umbralDe(m, modo)) }))
    .sort((a, b) => b.auc - a.auc);
  const mejorAuc = Math.max(...filas.filter((f) => !f.m.umbralFijo).map((f) => f.auc));

  const modelo = MODELO.modelos.find((m) => m.nombre === sel)!;
  const umbral = umbrales[sel] ?? umbralDe(modelo, modo);
  const cm = confusionMatrix(MODELO.yTest, modelo.proba, umbral);
  const cambiarModo = (m: Modo) => {
    setModo(m);
    setUmbrales({});
  };

  return (
    <>
      <Card
        title="Comparación de modelos en el conjunto de prueba"
        actions={
          <div className="segmented" role="group" aria-label="Umbral de decisión">
            <button aria-pressed={modo === 'fijo'} onClick={() => cambiarModo('fijo')}>
              Umbral 0,5
            </button>
            <button aria-pressed={modo === 'ajustado'} onClick={() => cambiarModo('ajustado')}>
              Umbral ajustado
            </button>
          </div>
        }
      >
        <p className="muted">
          {MODELO.nTest} empleados que los modelos no vieron al entrenar. El <b>umbral ajustado</b> maximiza sensibilidad +
          especificidad − 1 (índice de Youden) con predicciones de validación cruzada sobre el entrenamiento. La logística estadística
          usa siempre como umbral la proporción de attrition del entrenamiento ({fmt(MODELO.tasaTrain, 3)}), porque se entrenó sin
          balancear las clases. Hacé click en una fila para ver el detalle.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="left">Modelo</th>
                <th>AUC</th>
                <th>AUC CV</th>
                <th>Umbral</th>
                <th>Accuracy</th>
                <th>Sensibilidad</th>
                <th>Especificidad</th>
                <th>Precisión</th>
                <th>F1</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ m, auc, cm: c }) => (
                <tr
                  key={m.nombre}
                  className={`clickable ${auc === mejorAuc && !m.umbralFijo ? 'best' : ''} ${m.nombre === sel ? 'selected' : ''}`}
                  onClick={() => setSel(m.nombre)}
                >
                  <td className="left">{m.nombre}</td>
                  <td>{fmt(auc, 3)}</td>
                  <td>{m.aucCv === null ? '—' : `${fmt(m.aucCv, 3)} ± ${fmt(m.aucCvDesvio!, 3)}`}</td>
                  <td>{fmt(umbralDe(m, modo), 3)}</td>
                  <td>{fmt(c.accuracy, 3)}</td>
                  <td>{fmt(c.recall, 3)}</td>
                  <td>{fmt(c.specificity, 3)}</td>
                  <td>{fmt(c.precision, 3)}</td>
                  <td>{fmt(c.fMeasure, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="chart-caption">
          Con umbral 0,5, los modelos sin pesos de clase (KNN, Naive Bayes, Red Neuronal) y el SVM detectan pocas bajas. Ajustar el
          umbral compensa el desbalance (16 % de bajas). En verde, el mejor AUC entre los siete algoritmos.
        </p>
      </Card>

      <div className="grid-2">
        <Card title={`${sel}: umbral de decisión`}>
          <SliderField
            label="Umbral: se predice «se va» si la probabilidad es mayor o igual a"
            value={umbral}
            min={0.01}
            max={0.99}
            step={0.01}
            decimals={2}
            onChange={(v) => setUmbrales({ ...umbrales, [sel]: v })}
          />
          <div className="row no-print" style={{ margin: '6px 0 12px' }}>
            <button onClick={() => setUmbrales({ ...umbrales, [sel]: modelo.umbralFijo ? modelo.umbralAjustado : 0.5 })}>
              {modelo.umbralFijo ? `Umbral del notebook (${fmt(modelo.umbralAjustado, 3)})` : 'Umbral 0,5'}
            </button>
            {!modelo.umbralFijo && (
              <button onClick={() => setUmbrales({ ...umbrales, [sel]: modelo.umbralAjustado })}>
                Umbral ajustado ({fmt(modelo.umbralAjustado, 3)})
              </button>
            )}
          </div>
          <ConfusionView cm={cm} />
          <p className="chart-caption">
            Alertas generadas: {cm.tp + cm.fp} de {MODELO.nTest} empleados ({fmtPct((cm.tp + cm.fp) / MODELO.nTest, 0)}). Bajar el
            umbral detecta más bajas a costa de más falsas alarmas.
          </p>
        </Card>
        <Card title={`Curvas ROC — ${sel}: AUC = ${fmt(rocs.get(sel)!.auc, 3)}`}>
          <Legend
            items={[
              { label: sel, color: 'var(--series-2)', kind: 'line' },
              { label: 'Otros modelos', color: 'var(--axis)', kind: 'line' },
              { label: 'Umbral actual', color: 'var(--series-1)' },
            ]}
          />
          <RocChart
            curvas={MODELO.modelos.map((m) => ({ nombre: m.nombre, puntos: rocs.get(m.nombre)!.points, destacada: m.nombre === sel }))}
            marcador={{ fpr: 1 - cm.specificity, tpr: cm.recall, etiqueta: fmt(umbral, 2) }}
          />
          <p className="chart-caption">La diagonal punteada es un clasificador al azar (AUC = 0,5).</p>
        </Card>
      </div>

      <Card title="Búsqueda de hiperparámetros (GridSearchCV, 5 pliegues estratificados, métrica AUC)">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="left">Modelo</th>
                <th>AUC CV (media)</th>
                <th>Desvío</th>
                <th className="left">Mejores hiperparámetros</th>
              </tr>
            </thead>
            <tbody>
              {MODELO.modelos
                .filter((m) => m.aucCv !== null)
                .sort((a, b) => b.aucCv! - a.aucCv!)
                .map((m) => (
                  <tr key={m.nombre}>
                    <td className="left">{m.nombre}</td>
                    <td>{fmt(m.aucCv!, 3)}</td>
                    <td>{fmt(m.aucCvDesvio!, 3)}</td>
                    <td className="left">{formatoParametros(m.hiperparametros)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="chart-caption">
          Todos los modelos usan un pipeline con normalización min-max ajustada solo con los datos de entrenamiento de cada pliegue.
        </p>
      </Card>
    </>
  );
}
