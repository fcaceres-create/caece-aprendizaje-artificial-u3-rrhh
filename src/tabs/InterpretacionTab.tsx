import { BarrasH, Legend } from '../components/charts';
import { Card } from '../components/ui';
import { MODELO, type NodoArbol } from '../model/datos';
import { etiqueta } from '../model/etiquetas';
import { NOMINALES } from '../model/prediccion';
import { fmt, fmtP, fmtPct } from '../stats';

function condicion(n: NodoArbol, izquierda: boolean): string {
  const v = n.variable!;
  const nominal = NOMINALES.find((x) => v.startsWith(`${x}_`));
  if (nominal) return `${etiqueta(nominal)} ${izquierda ? '≠' : '='} ${v.slice(nominal.length + 1)}`;
  const dec = Math.abs(n.umbral!) >= 100 || Number.isInteger(n.umbral) ? 0 : 2;
  return `${etiqueta(v)} ${izquierda ? '≤' : '>'} ${fmt(n.umbral!, dec)}`;
}

function Rama({ id, cond, base }: { id: number; cond?: string; base: number }) {
  const n = MODELO.arbol[id];
  const tasa = n.seVan / n.n;
  const hoja = n.variable === undefined;
  return (
    <li>
      {cond && <span className="cond">{cond}</span>}
      <span className={`nodo ${hoja ? (n.clase === 1 ? 'hoja-va' : 'hoja-queda') : ''}`}>
        {hoja && <b>{n.clase === 1 ? 'Se va' : 'Se queda'} · </b>}
        {n.n} empleados, {fmtPct(tasa, 0)} se van{tasa > base * 1.5 ? ' ▲' : ''}
      </span>
      {!hoja && (
        <ul>
          <Rama id={n.izq!} cond={condicion(n, true)} base={base} />
          <Rama id={n.der!} cond={condicion(n, false)} base={base} />
        </ul>
      )}
    </li>
  );
}

export function InterpretacionTab() {
  const le = MODELO.logitEstadistico;
  const lr = MODELO.logistica;
  const topLr = lr.variables
    .map((v, j) => ({ etiqueta: etiqueta(v), valor: lr.coef[j] }))
    .filter((d) => d.valor !== 0)
    .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
    .slice(0, 15);
  const nulos = lr.coef.filter((c) => c === 0).length;

  return (
    <>
      <div className="grid-2">
        <Card title="Regresión logística estadística (como el paper)">
          <p className="muted">
            Primero se eliminaron de a una las variables con VIF &gt; 5 (multicolinealidad) y después, por eliminación hacia atrás, las
            de p-valor &gt; 0,05. Quedaron {le.coeficientes.length} variables significativas. Pseudo-R² de McFadden ={' '}
            {fmt(le.pseudoR2, 3)}, AIC = {fmt(le.aic, 1)}.
          </p>
          <div className="table-wrap scroll">
            <table>
              <thead>
                <tr>
                  <th className="left">Variable</th>
                  <th>Coeficiente</th>
                  <th>p-valor</th>
                  <th>Odds ratio</th>
                </tr>
              </thead>
              <tbody>
                {le.coeficientes.map((c) => (
                  <tr key={c.variable}>
                    <td className="left">{etiqueta(c.variable)}</td>
                    <td>{fmt(c.coef, 3)}</td>
                    <td>{fmtP(c.p)}</td>
                    <td className={c.coef > 0 ? 'alto' : 'bajo'}>{fmt(Math.exp(c.coef), 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chart-caption">
            Como las variables están normalizadas a [0, 1], el odds ratio compara el valor máximo contra el mínimo de cada variable. Por
            ejemplo, hacer horas extra multiplica por {fmt(Math.exp(le.coeficientes.find((c) => c.variable === 'OverTime_Yes')?.coef ?? 0), 1)}{' '}
            las chances de irse. Rojo: aumenta el riesgo; verde: lo reduce.
          </p>
        </Card>
        <Card title="Selección de variables">
          <h4>Eliminadas por VIF &gt; 5</h4>
          <table className="texto" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th className="left">Variable</th>
                <th>VIF</th>
              </tr>
            </thead>
            <tbody>
              {le.vifEliminadas.map((v) => (
                <tr key={v.variable}>
                  <td className="left">{etiqueta(v.variable)}</td>
                  <td>{v.vif > 1e6 ? '∞ (colinealidad)' : fmt(v.vif, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Eliminación hacia atrás</h4>
          <div className="table-wrap scroll">
            <table>
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Variables</th>
                  <th>AIC</th>
                  <th className="left">Se elimina</th>
                  <th>p-valor</th>
                </tr>
              </thead>
              <tbody>
                {le.historial.map((h) => (
                  <tr key={h.modelo} className={h.eliminada ? undefined : 'best'}>
                    <td>{h.modelo}</td>
                    <td>{h.nVariables}</td>
                    <td>{fmt(h.aic, 1)}</td>
                    <td className="left">{h.eliminada ? etiqueta(h.eliminada) : 'Modelo final'}</td>
                    <td>{h.p === null ? '—' : fmt(h.p, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Árbol de decisión (C4.5, profundidad 3): reglas interpretables">
        <p className="muted">
          Árbol simplificado con criterio de entropía (ganancia de información, como C4.5) y pesos de clase balanceados, entrenado con
          los {MODELO.nTrain} empleados de entrenamiento. Cada nodo muestra cuántos empleados cumplen la regla y qué porcentaje se fue
          (▲ = más de 1,5 veces la tasa general).
        </p>
        <ul className="arbol">
          <Rama id={0} base={MODELO.tasaTrain} />
        </ul>
      </Card>

      <div className="grid-2">
        <Card title="Regresión Logística (modelo elegido): coeficientes">
          <Legend
            items={[
              { label: 'Aumenta el riesgo de irse', color: 'var(--series-2)' },
              { label: 'Lo reduce', color: 'var(--series-3)' },
            ]}
          />
          <BarrasH datos={topLr} formato={(v) => fmt(v, 2)} />
          <p className="chart-caption">
            Las 15 variables de mayor coeficiente en valor absoluto (sobre variables normalizadas a [0, 1]).
            {nulos > 0 && ` La penalización L1 dejó ${nulos} variables en cero.`}
          </p>
        </Card>
        <Card title="Random Forest: importancia de las variables">
          <BarrasH
            datos={MODELO.importanciaRf.map((d) => ({ etiqueta: etiqueta(d.variable), valor: d.importancia }))}
            formato={(v) => fmt(v, 3)}
            colorPositivo="var(--series-1)"
          />
          <p className="chart-caption">Reducción media de impureza (Gini) de las 15 variables más importantes.</p>
        </Card>
      </div>
    </>
  );
}
