import { useMemo, useState } from 'react';
import { BarrasH, Legend } from '../components/charts';
import { Card, SliderField } from '../components/ui';
import { EMPLEADOS, MODELO, seVa, type Empleado } from '../model/datos';
import { etiqueta } from '../model/etiquetas';
import { ACCIONES, GRUPOS, perfilTipico } from '../model/formulario';
import { NOMINALES, nivelRiesgo, predecir, type Prediccion } from '../model/prediccion';
import { fmt, fmtPct } from '../stats';

const TASA_GENERAL = EMPLEADOS.reduce((s, e) => s + seVa(e), 0) / EMPLEADOS.length;
const EN_TEST = new Set(MODELO.indicesTest);
const TEXTO_RIESGO = { alto: 'Riesgo alto', medio: 'Riesgo medio', bajo: 'Riesgo bajo' };

/** Aportes agrupados por variable original (las ficticias de una nominal se suman). */
function aportesAgrupados(p: Prediccion, e: Empleado) {
  const grupos = new Map<string, number>();
  for (const c of p.contribuciones) {
    const nominal = NOMINALES.find((n) => c.variable.startsWith(`${n}_`));
    const clave = nominal ?? c.variable;
    grupos.set(clave, (grupos.get(clave) ?? 0) + c.aporte);
  }
  return [...grupos]
    .map(([v, aporte]) => ({ etiqueta: NOMINALES.includes(v) ? `${etiqueta(v)} (${e[v]})` : etiqueta(v), valor: aporte }))
    .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
    .slice(0, 10);
}

function extremos() {
  const lr = MODELO.modelos.find((m) => m.nombre === 'Regresión Logística')!;
  const orden = MODELO.indicesTest.map((i, k) => ({ i, p: lr.proba[k] })).sort((a, b) => b.p - a.p);
  return { alto: orden[0].i, bajo: orden[orden.length - 1].i };
}

export function IndividualTab() {
  const [emp, setEmp] = useState<Empleado>(() => perfilTipico());
  const [origen, setOrigen] = useState<number | null>(null);
  const [numero, setNumero] = useState('');
  const [umbral, setUmbral] = useState(0.5);
  const ext = useMemo(extremos, []);

  const pred = useMemo(() => predecir(emp), [emp]);
  const riesgo = nivelRiesgo(pred.probabilidad, umbral);
  const aportes = useMemo(() => aportesAgrupados(pred, emp), [pred, emp]);
  const acciones = useMemo(
    () =>
      ACCIONES.filter((a) => a.aplica(emp))
        .map((a) => ({ a, p: predecir(a.aplicar(emp)).probabilidad }))
        .sort((x, y) => x.p - y.p),
    [emp],
  );
  const combinada = useMemo(() => {
    let e = emp;
    for (const { a, p } of acciones) if (p < pred.probabilidad) e = a.aplicar(e);
    return predecir(e).probabilidad;
  }, [acciones, emp, pred]);

  const cargar = (i: number) => {
    setEmp({ ...EMPLEADOS[i] });
    setOrigen(i);
    setNumero(String(EMPLEADOS[i].EmployeeNumber));
  };
  const buscar = (n: string) => {
    setNumero(n);
    const i = EMPLEADOS.findIndex((e) => String(e.EmployeeNumber) === n.trim());
    if (i >= 0) {
      setEmp({ ...EMPLEADOS[i] });
      setOrigen(i);
    }
  };
  const cambiar = (variable: string, valor: string | number) => {
    setEmp((e) => ({ ...e, [variable]: valor }));
  };

  const real = origen !== null ? EMPLEADOS[origen] : null;
  const editado = real !== null && GRUPOS.some((g) => g.campos.some((c) => String(real[c.variable]) !== String(emp[c.variable])));

  return (
    <>
      <Card title="Predicción individual">
        <p className="muted">
          Completá los datos de un empleado o cargá uno del dataset. La probabilidad la calcula la Regresión Logística del notebook
          (AUC 0,817) directamente en el navegador.
        </p>
        <div className="row" style={{ alignItems: 'end' }}>
          <button
            onClick={() => {
              setEmp(perfilTipico());
              setOrigen(null);
              setNumero('');
            }}
          >
            Perfil típico
          </button>
          <button onClick={() => cargar(ext.alto)}>Ejemplo de riesgo alto</button>
          <button onClick={() => cargar(ext.bajo)}>Ejemplo de riesgo bajo</button>
          <label className="field">
            <span>N.º de empleado (1 a 2068)</span>
            <input type="text" inputMode="numeric" value={numero} onChange={(e) => buscar(e.target.value)} style={{ width: 150 }} />
          </label>
        </div>
        {real && (
          <p className="chart-caption" style={{ marginTop: 8 }}>
            Empleado n.º {String(real.EmployeeNumber)} del dataset ({EN_TEST.has(origen!) ? 'conjunto de prueba' : 'conjunto de entrenamiento'}
            ). En la realidad <b>{seVa(real) ? 'se fue' : 'se quedó'}</b>.{editado && ' Los datos fueron modificados.'}
          </p>
        )}
      </Card>

      <div className="grid-2 prediccion">
        <Card title="Datos del empleado">
          {GRUPOS.map((g) => (
            <fieldset key={g.titulo} className="grupo">
              <legend>{g.titulo}</legend>
              <div className="campos">
                {g.campos.map((c) => (
                  <label className="field" key={c.variable}>
                    <span>{etiqueta(c.variable)}</span>
                    {c.tipo === 'opciones' ? (
                      <select
                        value={String(emp[c.variable])}
                        onChange={(ev) => cambiar(c.variable, typeof c.opciones[0].valor === 'number' ? Number(ev.target.value) : ev.target.value)}
                      >
                        {c.opciones.map((o) => (
                          <option key={o.valor} value={o.valor}>
                            {o.texto}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={Number.isFinite(Number(emp[c.variable])) ? Number(emp[c.variable]) : ''}
                        min={c.min}
                        max={c.max}
                        step={c.paso ?? 1}
                        onChange={(ev) => cambiar(c.variable, ev.target.value === '' ? NaN : Number(ev.target.value))}
                      />
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </Card>

        <div className="columna">
          <Card title="Resultado">
            {Number.isFinite(pred.probabilidad) ? (
              <>
                <span className="muted">Probabilidad de irse</span>
                <div className="hero">{fmtPct(pred.probabilidad, 1)}</div>
                <div className="barra-riesgo" aria-hidden>
                  <div style={{ width: `${pred.probabilidad * 100}%` }} className={riesgo} />
                  <span style={{ left: `${umbral * 100}%` }} title="Umbral" />
                  <span className="general" style={{ left: `${TASA_GENERAL * 100}%` }} title="Tasa general" />
                </div>
                <div className={`verdict ${riesgo === 'alto' ? 'no' : riesgo === 'bajo' ? 'ok' : 'medio'}`} style={{ marginTop: 10 }}>
                  {TEXTO_RIESGO[riesgo]}
                </div>
                <p className="chart-caption">
                  Tasa general de attrition: {fmtPct(TASA_GENERAL)}. Esta probabilidad es {fmt(pred.probabilidad / TASA_GENERAL, 1)} veces la
                  tasa general. Riesgo alto: probabilidad ≥ umbral; medio: ≥ la mitad del umbral. El modelo se entrenó con pesos de clase
                  balanceados, así que sus probabilidades son más altas que la tasa real: sirven para ordenar a los empleados, no como
                  frecuencia esperada.
                </p>
                <SliderField label="Umbral de alerta" value={umbral} min={0.05} max={0.95} step={0.01} decimals={2} onChange={setUmbral} />
              </>
            ) : (
              <p className="muted">Completá todos los campos numéricos.</p>
            )}
          </Card>

          <Card title="¿Qué pesa en esta predicción?">
            <Legend
              items={[
                { label: 'Aumenta el riesgo', color: 'var(--series-2)' },
                { label: 'Lo reduce', color: 'var(--series-3)' },
              ]}
            />
            <BarrasH
              datos={aportes}
              formato={(v) => fmt(v, 2)}
              tooltip={(d) => [`Aporte al logit: ${fmt(d.valor, 3)}`, `Multiplica las chances por ${fmt(Math.exp(d.valor), 2)}`]}
            />
            <p className="chart-caption">
              Aporte de cada variable al logit comparado con el empleado promedio del entrenamiento: coeficiente × (valor normalizado −
              promedio). Las variables derivadas (ingreso por nivel, satisfacción total, etc.) se muestran aparte.
            </p>
          </Card>

          <Card title="Simulación de acciones de retención">
            {acciones.length === 0 ? (
              <p className="muted">No hay acciones aplicables a este perfil.</p>
            ) : (
              <table className="texto">
                <thead>
                  <tr>
                    <th className="left">Acción</th>
                    <th>Nueva prob.</th>
                    <th>Cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {acciones.map(({ a, p }) => (
                    <tr key={a.descripcion}>
                      <td className="left">{a.descripcion}</td>
                      <td>{fmtPct(p, 1)}</td>
                      <td className={p < pred.probabilidad ? 'bajo' : 'alto'}>
                        {p < pred.probabilidad ? '−' : '+'}
                        {fmt(Math.abs(p - pred.probabilidad) * 100, 1)} pp
                      </td>
                    </tr>
                  ))}
                  <tr className="best">
                    <td className="left">Todas las que reducen el riesgo</td>
                    <td>{fmtPct(combinada, 1)}</td>
                    <td>−{fmt((pred.probabilidad - combinada) * 100, 1)} pp</td>
                  </tr>
                </tbody>
              </table>
            )}
            <p className="chart-caption">
              Estimación del modelo cambiando una variable a la vez. Es una asociación estadística, no un efecto causal garantizado.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
