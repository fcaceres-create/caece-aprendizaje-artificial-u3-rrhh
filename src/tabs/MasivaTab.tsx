import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import { Legend } from '../components/charts';
import { Alert, Card, SliderField, Stat } from '../components/ui';
import { DATASET, EMPLEADOS, MODELO, seVa, type Empleado } from '../model/datos';
import { etiqueta } from '../model/etiquetas';
import { COLUMNAS_REQUERIDAS, NOMINALES, nivelRiesgo, predecir, validar } from '../model/prediccion';
import { fmt, fmtPct } from '../stats';

interface Fila {
  n: number;
  e: Empleado;
  p: number;
  factor: string;
}

function principalFactor(e: Empleado): string {
  const grupos = new Map<string, number>();
  for (const c of predecir(e).contribuciones) {
    const clave = NOMINALES.find((n) => c.variable.startsWith(`${n}_`)) ?? c.variable;
    grupos.set(clave, (grupos.get(clave) ?? 0) + c.aporte);
  }
  const [v] = [...grupos].sort((a, b) => b[1] - a[1])[0];
  return NOMINALES.includes(v) ? `${etiqueta(v)}: ${e[v]}` : etiqueta(v);
}

function descargar(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCelda = (v: unknown) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));

function plantilla(): string {
  const cols = ['EmployeeNumber', ...COLUMNAS_REQUERIDAS];
  return [cols.join(','), ...EMPLEADOS.slice(0, 3).map((e) => cols.map((c) => csvCelda(e[c])).join(','))].join('\n');
}

async function leerArchivo(f: File): Promise<Empleado[]> {
  const libro = /\.(csv|txt)$/i.test(f.name)
    ? XLSX.read(await f.text(), { type: 'string', raw: true })
    : XLSX.read(await f.arrayBuffer(), { type: 'array' });
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets[libro.SheetNames[0]], { defval: '', raw: true });
  return filas.map((r) => {
    const e: Empleado = {};
    for (const [k, v] of Object.entries(r)) {
      const s = String(v).trim();
      const n = Number(s);
      e[k.trim()] = typeof v === 'number' ? v : s !== '' && Number.isFinite(n) ? n : s;
    }
    return e;
  });
}

/** Curva de captura: % de bajas reales detectadas contactando al x % de mayor riesgo. */
function CurvaCaptura({ filas }: { filas: Fila[] }) {
  const total = filas.reduce((s, f) => s + seVa(f.e), 0);
  let acum = 0;
  const puntos = [{ x: 0, modelo: 0, azar: 0 }];
  filas.forEach((f, i) => {
    acum += seVa(f.e);
    const x = (i + 1) / filas.length;
    puntos.push({ x, modelo: acum / total, azar: x });
  });
  return (
    <div className="chart" style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={puntos} margin={{ top: 8, right: 16, bottom: 28, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 1]}
            ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
            stroke="var(--axis)"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => `${fmt(v * 100, 0)} %`}
            label={{ value: 'Empleados contactados (de mayor a menor riesgo)', position: 'insideBottom', offset: -16, fontSize: 12, fill: 'var(--text-2)' }}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            width={48}
            stroke="var(--axis)"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => `${fmt(v * 100, 0)} %`}
          />
          <Tooltip
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof puntos)[number];
              return (
                <div className="tooltip">
                  <div style={{ fontWeight: 600 }}>Contactando al {fmtPct(d.x, 0)}</div>
                  <div>Bajas detectadas: {fmtPct(d.modelo, 0)}</div>
                  <div>Al azar: {fmtPct(d.azar, 0)}</div>
                </div>
              );
            }}
          />
          <ReferenceLine x={0.2} stroke="var(--muted)" strokeDasharray="5 4" />
          <Line dataKey="azar" dot={false} stroke="var(--axis)" strokeDasharray="5 4" isAnimationActive={false} />
          <Line dataKey="modelo" dot={false} stroke="var(--series-2)" strokeWidth={2.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MasivaTab() {
  const [datos, setDatos] = useState<{ nombre: string; filas: Empleado[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [umbral, setUmbral] = useState(0.5);
  const [depto, setDepto] = useState('Todos');
  const [mostrar, setMostrar] = useState(25);
  const [arrastrando, setArrastrando] = useState(false);

  const res = useMemo(() => {
    if (!datos) return null;
    const faltantes = COLUMNAS_REQUERIDAS.filter((c) => !datos.filas.some((e) => c in e));
    const invalidas: { n: number; problemas: string[] }[] = [];
    const filas: Fila[] = [];
    datos.filas.forEach((e, i) => {
      const problemas = validar(e);
      if (problemas.length) invalidas.push({ n: i + 2, problemas });
      else filas.push({ n: i + 2, e, p: predecir(e).probabilidad, factor: principalFactor(e) });
    });
    filas.sort((a, b) => b.p - a.p);
    const conReal = filas.length > 0 && filas.every((f) => f.e.Attrition !== undefined && f.e.Attrition !== '');
    return { faltantes, invalidas, filas, conReal };
  }, [datos]);

  const cargarArchivo = async (f: File) => {
    try {
      const filas = await leerArchivo(f);
      if (!filas.length) throw new Error('El archivo no tiene filas.');
      setDatos({ nombre: f.name, filas });
      setError(null);
      setMostrar(25);
      setDepto('Todos');
    } catch (e) {
      setError(`No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const departamentos = res ? [...new Set(res.filas.map((f) => String(f.e.Department)))].sort() : [];
  const visibles = res ? res.filas.filter((f) => depto === 'Todos' || f.e.Department === depto) : [];
  const conteo = { alto: 0, medio: 0, bajo: 0 };
  visibles.forEach((f) => conteo[nivelRiesgo(f.p, umbral)]++);
  const top20 = visibles.slice(0, Math.floor(visibles.length * 0.2));
  const bajasTotal = visibles.reduce((s, f) => s + seVa(f.e), 0);
  const captura = bajasTotal ? top20.reduce((s, f) => s + seVa(f.e), 0) / bajasTotal : NaN;

  const exportar = () => {
    if (!res) return;
    const cols = Object.keys(datos!.filas[0]);
    const lineas = [
      ['Ranking', ...cols, 'ProbabilidadIrse', 'Riesgo', 'PrincipalFactor'].join(','),
      ...visibles.map((f, i) =>
        [i + 1, ...cols.map((c) => csvCelda(f.e[c])), f.p.toFixed(4), nivelRiesgo(f.p, umbral), csvCelda(f.factor)].join(','),
      ),
    ];
    descargar(`ranking_riesgo_${datos!.nombre.replace(/\.\w+$/, '')}.csv`, lineas.join('\n'));
  };

  return (
    <>
      <Card title="Predicción masiva y ranking de riesgo">
        <p className="muted">
          Subí un CSV o Excel con una fila por empleado y las mismas columnas que el dataset de IBM. El archivo se procesa en tu
          navegador: no se envía a ningún servidor. Si incluye la columna <code>Attrition</code> (Yes/No), además se evalúa el modelo.
        </p>
        <div className="grid-2 no-print">
          <label
            className={`dropzone ${arrastrando ? 'over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              const f = e.dataTransfer.files[0];
              if (f) cargarArchivo(f);
            }}
          >
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) cargarArchivo(f);
                e.target.value = '';
              }}
            />
            <b>Subir un archivo .csv o .xlsx</b>
            <br />
            <small>Arrastralo acá o hacé click.</small>
          </label>
          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <button
              onClick={() => {
                setDatos({ nombre: 'conjunto de prueba', filas: MODELO.indicesTest.map((i) => EMPLEADOS[i]) });
                setMostrar(25);
              }}
            >
              Usar los {MODELO.nTest} empleados de prueba (no vistos por el modelo)
            </button>
            <button
              onClick={() => {
                setDatos({ nombre: 'dataset completo', filas: DATASET.filas });
                setMostrar(25);
              }}
            >
              Usar el dataset completo ({EMPLEADOS.length} empleados)
            </button>
            <button className="ghost" onClick={() => descargar('plantilla_empleados.csv', plantilla())}>
              Descargar plantilla CSV
            </button>
          </div>
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        <details className="no-print" style={{ marginTop: 10 }}>
          <summary>Columnas requeridas ({COLUMNAS_REQUERIDAS.length})</summary>
          <p className="chart-caption">
            {COLUMNAS_REQUERIDAS.join(', ')}. Opcionales: <code>EmployeeNumber</code> y <code>Attrition</code>. Las categorías deben
            estar escritas como en el dataset (por ejemplo <code>OverTime</code> = Yes / No).
          </p>
        </details>
      </Card>

      {res && (
        <>
          {res.faltantes.length > 0 && <Alert kind="error">Faltan columnas en el archivo: {res.faltantes.join(', ')}.</Alert>}
          {res.invalidas.length > 0 && res.faltantes.length === 0 && (
            <Alert kind="error">
              {res.invalidas.length === 1 ? 'Se omitió 1 fila con problemas' : `Se omitieron ${res.invalidas.length} filas con problemas`}.
              {res.invalidas.length > 1 ? ' Por ejemplo, fila ' : ' Fila '}
              {res.invalidas[0].n}:{' '}
              {res.invalidas[0].problemas.slice(0, 3).join('; ')}.
            </Alert>
          )}
          {res.filas.length > 0 && (
            <>
              <div className={res.conReal ? 'grid-2' : undefined}>
                <Card title={`Resultados: ${datos!.nombre}`}>
                  <div className="row" style={{ alignItems: 'end', marginBottom: 12 }}>
                    <label className="field">
                      <span>Departamento</span>
                      <select value={depto} onChange={(e) => setDepto(e.target.value)}>
                        <option>Todos</option>
                        {departamentos.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                    <div style={{ flex: '1 1 260px', maxWidth: 360 }}>
                      <SliderField label="Umbral de alerta" value={umbral} min={0.05} max={0.95} step={0.01} decimals={2} onChange={setUmbral} />
                    </div>
                    <button className="primary" onClick={exportar}>
                      Descargar ranking (CSV)
                    </button>
                  </div>
                  <div className="stats">
                    <Stat label="Empleados" value={fmt(visibles.length, 0)} />
                    <Stat label="Riesgo alto" value={`${conteo.alto} (${fmtPct(conteo.alto / visibles.length, 0)})`} />
                    <Stat label="Riesgo medio" value={String(conteo.medio)} />
                    <Stat label="Riesgo bajo" value={String(conteo.bajo)} />
                    {res.conReal && <Stat label="Bajas reales" value={String(bajasTotal)} />}
                    {res.conReal && <Stat label="Bajas en el 20 % de mayor riesgo" value={fmtPct(captura, 0)} />}
                  </div>
                </Card>

                {res.conReal && bajasTotal > 0 && (
                  <Card title="Curva de captura">
                    <Legend
                      items={[
                        { label: 'Modelo', color: 'var(--series-2)', kind: 'line' },
                        { label: 'Al azar', color: 'var(--axis)', kind: 'dash' },
                      ]}
                    />
                    <CurvaCaptura filas={visibles} />
                    <p className="chart-caption">
                      Contactando al 20 % de mayor riesgo se llega al {fmtPct(captura, 0)} de las bajas reales, contra el 20 % si se eligiera
                      al azar.
                      {datos!.nombre === 'dataset completo' &&
                        ' Ojo: el dataset completo incluye a los empleados de entrenamiento, así que el resultado es optimista; el conjunto de prueba da una medida honesta.'}
                    </p>
                  </Card>
                )}
              </div>
              <Card title="Ranking de riesgo">
                <div className="table-wrap scroll" style={{ maxHeight: 560 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Empleado</th>
                        <th className="left">Puesto</th>
                        <th>Edad</th>
                        <th className="left">Horas extra</th>
                        <th>Ingreso</th>
                        <th>Prob.</th>
                        <th className="left">Principal factor</th>
                        {res.conReal && <th className="left">Real</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.slice(0, mostrar).map((f, i) => {
                        const r = nivelRiesgo(f.p, umbral);
                        return (
                          <tr key={f.n}>
                            <td>{i + 1}</td>
                            <td>{String(f.e.EmployeeNumber ?? `fila ${f.n}`)}</td>
                            <td className="left">{String(f.e.JobRole)}</td>
                            <td>{String(f.e.Age)}</td>
                            <td className="left">{f.e.OverTime === 'Yes' ? 'Sí' : 'No'}</td>
                            <td>{fmt(Number(f.e.MonthlyIncome), 0)}</td>
                            <td>
                              <span className={`chip ${r}`}>{fmtPct(f.p, 0)}</span>
                            </td>
                            <td className="left">{f.factor}</td>
                            {res.conReal && <td className="left">{seVa(f.e) ? <b>Se fue</b> : 'Se quedó'}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {mostrar < visibles.length && (
                  <div className="row no-print" style={{ marginTop: 8 }}>
                    <button onClick={() => setMostrar(mostrar + 50)}>Ver 50 más</button>
                    <button onClick={() => setMostrar(visibles.length)}>Ver todos ({visibles.length})</button>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}
