import { useMemo, useState } from 'react';
import { BarrasH, HistogramaGrupos, Legend, TasaChart } from '../components/charts';
import { Alert, Card, Stat } from '../components/ui';
import { EMPLEADOS, seVa } from '../model/datos';
import {
  categoriasDeMayorRiesgo,
  CATEGORICAS_EDA,
  compararNumerica,
  correlacion,
  cortesQuintiles,
  NUMERICAS_EDA,
  tasasPorCategoria,
  valorNumerico,
} from '../model/eda';
import { etiqueta } from '../model/etiquetas';
import { fmt, fmtPct } from '../stats';

const CORTES = cortesQuintiles(EMPLEADOS);
const DEPARTAMENTOS = [...new Set(EMPLEADOS.map((e) => String(e.Department)))].sort();

/** Variables numéricas para la correlación con Attrition (las del notebook después de la reducción). */
const NUMERICAS_CORR = [
  ...Object.keys(EMPLEADOS[0]).filter(
    (c) => typeof EMPLEADOS[0][c] === 'number' && !['EmployeeCount', 'EmployeeNumber', 'StandardHours'].includes(c),
  ),
  'IngresoPorNivel',
  'AniosPromPorEmpresa',
  'ProporcionAniosEnEmpresa',
  'AniosSinPromocionRel',
  'SatisfaccionTotal',
];

export function ExploratorioTab() {
  const [depto, setDepto] = useState('Todos');
  const [horasExtra, setHorasExtra] = useState('Todos');
  const [cat, setCat] = useState('OverTime');
  const [numVar, setNumVar] = useState('Age');

  const filtrados = useMemo(
    () =>
      EMPLEADOS.filter(
        (e) => (depto === 'Todos' || e.Department === depto) && (horasExtra === 'Todos' || e.OverTime === horasExtra),
      ),
    [depto, horasExtra],
  );
  const bajas = filtrados.reduce((s, e) => s + seVa(e), 0);
  const base = bajas / (filtrados.length || 1);
  const hayDatos = filtrados.length >= 10 && bajas > 0 && bajas < filtrados.length;

  const tasas = useMemo(() => tasasPorCategoria(filtrados, cat, CORTES), [filtrados, cat]);
  const riesgo = useMemo(() => categoriasDeMayorRiesgo(filtrados, CORTES, 30, 10), [filtrados]);
  const comp = useMemo(() => (hayDatos ? compararNumerica(filtrados, numVar) : null), [filtrados, numVar, hayDatos]);
  const corr = useMemo(() => {
    if (!hayDatos) return [];
    const y = filtrados.map(seVa);
    return NUMERICAS_CORR.map((v) => ({ etiqueta: etiqueta(v), valor: correlacion(filtrados.map((e) => valorNumerico(e, v)), y) }))
      .filter((d) => Number.isFinite(d.valor))
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
      .slice(0, 14);
  }, [filtrados, hayDatos]);

  return (
    <>
      <Card title="Análisis exploratorio">
        <p className="muted">
          Los filtros se aplican a todos los gráficos de esta pestaña. Rojo: categorías con attrition por encima de la tasa del grupo
          filtrado; verde: por debajo.
        </p>
        <div className="row" style={{ alignItems: 'end' }}>
          <label className="field">
            <span>Departamento</span>
            <select value={depto} onChange={(e) => setDepto(e.target.value)}>
              <option>Todos</option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Horas extra</span>
            <select value={horasExtra} onChange={(e) => setHorasExtra(e.target.value)}>
              <option>Todos</option>
              <option value="Yes">Sí</option>
              <option value="No">No</option>
            </select>
          </label>
          <div className="stats" style={{ flex: '1 1 320px' }}>
            <Stat label="Empleados" value={fmt(filtrados.length, 0)} />
            <Stat label="Bajas" value={fmt(bajas, 0)} />
            <Stat label="Tasa de attrition" value={fmtPct(base)} />
          </div>
        </div>
      </Card>

      {!hayDatos ? (
        <Alert kind="error">El filtro deja muy pocos empleados o ninguna baja. Probá con otra combinación.</Alert>
      ) : (
        <>
          <div className="grid-2">
            <Card
              title="Tasa de attrition por categoría"
              actions={
                <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Variable categórica">
                  {CATEGORICAS_EDA.map((c) => (
                    <option key={c} value={c}>
                      {etiqueta(c)}
                    </option>
                  ))}
                </select>
              }
            >
              <TasaChart datos={tasas} base={base} />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="left">{etiqueta(cat)}</th>
                      <th>Empleados</th>
                      <th>Bajas</th>
                      <th>Attrition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasas.map((t) => (
                      <tr key={t.categoria}>
                        <td className="left">{t.categoria}</td>
                        <td>{t.n}</td>
                        <td>{t.seVan}</td>
                        <td className={t.tasa > base ? 'alto' : undefined}>{fmtPct(t.tasa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Las 10 categorías de mayor riesgo">
              <p className="chart-caption">Entre todas las variables categóricas, con al menos 30 empleados por categoría.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="left">Variable</th>
                      <th className="left">Categoría</th>
                      <th>Empleados</th>
                      <th>Attrition</th>
                      <th>vs. general</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riesgo.map((r) => (
                      <tr key={r.variable + r.categoria} className="clickable" onClick={() => setCat(r.variable)} title="Ver la variable">
                        <td className="left">{etiqueta(r.variable)}</td>
                        <td className="left">{r.categoria}</td>
                        <td>{r.n}</td>
                        <td className="alto">{fmtPct(r.tasa)}</td>
                        <td>× {fmt(r.tasa / base, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="grid-2">
            <Card
              title="Variables numéricas: quienes se van vs. quienes se quedan"
              actions={
                <select value={numVar} onChange={(e) => setNumVar(e.target.value)} aria-label="Variable numérica">
                  {NUMERICAS_EDA.map((c) => (
                    <option key={c} value={c}>
                      {etiqueta(c)}
                    </option>
                  ))}
                </select>
              }
            >
              {comp && (
                <>
                  <Legend
                    items={[
                      { label: `Se quedan (n = ${comp.quedan.n})`, color: 'var(--series-1)' },
                      { label: `Se van (n = ${comp.van.n})`, color: 'var(--series-2)' },
                    ]}
                  />
                  <HistogramaGrupos bins={comp.hist} enteros={comp.enteros} />
                  <p className="chart-caption">Porcentaje de empleados de cada grupo en cada rango.</p>
                  <table>
                    <thead>
                      <tr>
                        <th className="left">{etiqueta(numVar)}</th>
                        <th>Media</th>
                        <th>Q1</th>
                        <th>Mediana</th>
                        <th>Q3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ['Se quedan', comp.quedan],
                          ['Se van', comp.van],
                        ] as const
                      ).map(([n, r]) => (
                        <tr key={n}>
                          <td className="left">{n}</td>
                          <td>{fmt(r.media, 1)}</td>
                          <td>{fmt(r.q1, 1)}</td>
                          <td>
                            <b>{fmt(r.mediana, 1)}</b>
                          </td>
                          <td>{fmt(r.q3, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </Card>
            <Card title="Correlación con Attrition">
              <Legend
                items={[
                  { label: 'Aumenta el attrition', color: 'var(--series-2)' },
                  { label: 'Lo reduce', color: 'var(--series-3)' },
                ]}
              />
              <BarrasH datos={corr} formato={(v) => fmt(v, 2)} />
              <p className="chart-caption">Las 14 variables numéricas con mayor correlación de Pearson (en valor absoluto) con Attrition (0/1).</p>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
