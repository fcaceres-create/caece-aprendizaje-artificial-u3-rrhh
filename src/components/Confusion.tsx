import { fmt, fmtPct, type ConfusionMatrix } from '../stats';
import { Stat } from './ui';

export function ConfusionView({ cm }: { cm: ConfusionMatrix }) {
  return (
    <div>
      <div className="confusion" role="table" aria-label="Matriz de confusión">
        <div className="h" />
        <div className="h">Pronóstico: se va</div>
        <div className="h">Pronóstico: se queda</div>
        <div className="h" style={{ textAlign: 'right' }}>
          Real: se va
        </div>
        <div className="c ok" title="Bajas detectadas">
          {cm.tp}
          <small>VP</small>
        </div>
        <div className="c bad" title="Bajas no detectadas">
          {cm.fn}
          <small>FN</small>
        </div>
        <div className="h" style={{ textAlign: 'right' }}>
          Real: se queda
        </div>
        <div className="c bad" title="Falsas alarmas">
          {cm.fp}
          <small>FP</small>
        </div>
        <div className="c ok">
          {cm.tn}
          <small>VN</small>
        </div>
      </div>
      <div className="stats" style={{ marginTop: 12 }}>
        <Stat label="Accuracy" value={fmtPct(cm.accuracy)} title="(VP + VN) / total" />
        <Stat label="Sensibilidad" value={fmtPct(cm.recall)} title="VP / (VP + FN): bajas detectadas" />
        <Stat label="Especificidad" value={fmtPct(cm.specificity)} title="VN / (VN + FP)" />
        <Stat label="Precisión" value={fmtPct(cm.precision)} title="VP / (VP + FP): alertas que eran bajas reales" />
        <Stat label="F1" value={fmt(cm.fMeasure, 3)} title="Media armónica de precisión y sensibilidad" />
      </div>
    </div>
  );
}
