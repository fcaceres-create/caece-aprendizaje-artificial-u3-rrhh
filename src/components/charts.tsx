import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmt, fmtPct } from '../stats';

const axis = { stroke: 'var(--axis)', tick: { fontSize: 12 } };

function Caja({ titulo, lineas }: { titulo: ReactNode; lineas: ReactNode[] }) {
  return (
    <div className="tooltip">
      <div style={{ fontWeight: 600 }}>{titulo}</div>
      {lineas.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; kind?: 'dot' | 'line' | 'dash' }[] }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.label}>
          <span
            className={`sw ${it.kind === 'line' || it.kind === 'dash' ? 'line' : ''}`}
            style={it.kind === 'dash' ? { background: 'none', borderTop: `2px dashed ${it.color}` } : { background: it.color }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Tasa de attrition por categoría con la tasa general como referencia (rojo: por encima; verde: por debajo). */
export function TasaChart({
  datos,
  base,
  height = 300,
}: {
  datos: { categoria: string; tasa: number; n: number; seVan: number }[];
  base: number;
  height?: number;
}) {
  const largo = Math.max(...datos.map((d) => d.categoria.length));
  const rotar = datos.length > 4 && largo > 8;
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 16, right: 16, bottom: rotar ? 8 : 4, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="categoria"
            {...axis}
            tick={{ fontSize: 11 }}
            interval={0}
            angle={rotar ? -30 : 0}
            textAnchor={rotar ? 'end' : 'middle'}
            height={rotar ? Math.min(120, 20 + largo * 5.5) : 30}
          />
          <YAxis {...axis} width={48} tickFormatter={(v: number) => `${fmt(v * 100, 0)} %`} domain={[0, 'auto']} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { categoria: string; tasa: number; n: number; seVan: number };
              return <Caja titulo={d.categoria} lineas={[`Attrition: ${fmtPct(d.tasa)}`, `${d.seVan} de ${d.n} empleados se fueron`]} />;
            }}
          />
          <ReferenceLine
            y={base}
            stroke="var(--muted)"
            strokeDasharray="5 4"
            label={{ value: `General ${fmtPct(base)}`, position: 'insideTopRight', fontSize: 11, fill: 'var(--text-2)' }}
          />
          <Bar dataKey="tasa" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={56}>
            {datos.map((d) => (
              <Cell key={d.categoria} fill={d.tasa > base ? 'var(--series-2)' : 'var(--series-3)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras horizontales con signo (coeficientes, aportes) o solo positivas (importancia). */
export function BarrasH({
  datos,
  formato = (v) => fmt(v, 3),
  height,
  colorPositivo = 'var(--series-2)',
  colorNegativo = 'var(--series-3)',
  tooltip,
}: {
  datos: { etiqueta: string; valor: number }[];
  formato?(v: number): string;
  height?: number;
  colorPositivo?: string;
  colorNegativo?: string;
  tooltip?(d: { etiqueta: string; valor: number }): ReactNode[];
}) {
  const ancho = Math.min(260, 12 + Math.max(...datos.map((d) => d.etiqueta.length)) * 6.4);
  return (
    <div className="chart" style={{ height: height ?? 40 + datos.length * 26 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            {...axis}
            domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]}
            tickFormatter={(v: number) => formato(v)}
          />
          <YAxis type="category" dataKey="etiqueta" width={ancho} {...axis} tick={{ fontSize: 11.5 }} interval={0} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { etiqueta: string; valor: number };
              return <Caja titulo={d.etiqueta} lineas={tooltip ? tooltip(d) : [formato(d.valor)]} />;
            }}
          />
          <ReferenceLine x={0} stroke="var(--axis)" />
          <Bar dataKey="valor" radius={3} isAnimationActive={false} maxBarSize={18}>
            {datos.map((d) => (
              <Cell key={d.etiqueta} fill={d.valor >= 0 ? colorPositivo : colorNegativo} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Histograma en % dentro de cada grupo (se quedan / se van). */
export function HistogramaGrupos({
  bins,
  enteros,
  height = 280,
}: {
  bins: { desde: number; hasta: number; quedan: number; van: number }[];
  enteros: boolean;
  height?: number;
}) {
  const datos = bins.map((b) => ({ ...b, etiqueta: enteros ? fmt(b.desde, 0) : `${fmt(b.desde, b.hasta - b.desde < 1 ? 2 : 0)}` }));
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 16, bottom: 4, left: 0 }} barGap={0} barCategoryGap="12%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="etiqueta" {...axis} tick={{ fontSize: 11 }} />
          <YAxis {...axis} width={48} tickFormatter={(v: number) => `${fmt(v * 100, 0)} %`} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof datos)[number];
              const rango = enteros ? fmt(d.desde, 0) : `${fmt(d.desde, 2)} a ${fmt(d.hasta, 2)}`;
              return <Caja titulo={rango} lineas={[`Se quedan: ${fmtPct(d.quedan)}`, `Se van: ${fmtPct(d.van)}`]} />;
            }}
          />
          <Bar dataKey="quedan" name="Se quedan" fill="var(--series-1)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="van" name="Se van" fill="var(--series-2)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface CurvaRoc {
  nombre: string;
  puntos: { fpr: number; tpr: number }[];
  destacada?: boolean;
}

/** Curvas ROC de varios modelos: la destacada en color y el resto en gris. */
export function RocChart({
  curvas,
  marcador,
  height = 340,
}: {
  curvas: CurvaRoc[];
  marcador?: { fpr: number; tpr: number; etiqueta: string };
  height?: number;
}) {
  const ordenadas = [...curvas].sort((a, b) => Number(!!a.destacada) - Number(!!b.destacada));
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart margin={{ top: 8, right: 16, bottom: 28, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            type="number"
            dataKey="fpr"
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            {...axis}
            tickFormatter={(v: number) => fmt(v, 2)}
            label={{ value: '1 − especificidad (falsos positivos)', position: 'insideBottom', offset: -16, fontSize: 12, fill: 'var(--text-2)' }}
          />
          <YAxis
            type="number"
            dataKey="tpr"
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            width={48}
            {...axis}
            tickFormatter={(v: number) => fmt(v, 2)}
            label={{ value: 'Sensibilidad', angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--text-2)', style: { textAnchor: 'middle' } }}
          />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ]}
            stroke="var(--axis)"
            strokeDasharray="5 4"
          />
          {ordenadas.map((c) => (
            <Line
              key={c.nombre}
              data={c.puntos}
              dataKey="tpr"
              name={c.nombre}
              type="linear"
              dot={false}
              stroke={c.destacada ? 'var(--series-2)' : 'var(--axis)'}
              strokeWidth={c.destacada ? 2.5 : 1.2}
              isAnimationActive={false}
            />
          ))}
          {marcador && (
            <ReferenceDot
              x={marcador.fpr}
              y={marcador.tpr}
              r={7}
              fill="var(--series-1)"
              stroke="var(--surface)"
              strokeWidth={2}
              label={{ value: marcador.etiqueta, position: 'right', fontSize: 12, fill: 'var(--text)' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
