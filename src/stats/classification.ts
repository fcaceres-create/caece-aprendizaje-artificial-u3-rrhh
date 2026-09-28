export interface ConfusionMatrix {
  threshold: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  fMeasure: number;
}

/** Matriz de confusión: se predice 1 cuando p ≥ umbral. */
export function confusionMatrix(y: number[], probabilities: number[], threshold = 0.5): ConfusionMatrix {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (let i = 0; i < y.length; i++) {
    const pred = probabilities[i] >= threshold ? 1 : 0;
    if (pred === 1 && y[i] === 1) tp++;
    else if (pred === 1) fp++;
    else if (y[i] === 1) fn++;
    else tn++;
  }
  const precision = tp + fp ? tp / (tp + fp) : NaN;
  const recall = tp + fn ? tp / (tp + fn) : NaN;
  return {
    threshold,
    tp,
    fp,
    fn,
    tn,
    accuracy: (tp + tn) / y.length,
    precision,
    recall,
    specificity: tn + fp ? tn / (tn + fp) : NaN,
    fMeasure: precision + recall ? (2 * precision * recall) / (precision + recall) : NaN,
  };
}

export interface RocPoint {
  threshold: number;
  fpr: number;
  tpr: number;
}

/** Curva ROC (agrupando probabilidades empatadas) y área bajo la curva. */
export function rocCurve(y: number[], probabilities: number[]): { points: RocPoint[]; auc: number } {
  const P = y.filter((v) => v === 1).length;
  const N = y.length - P;
  const order = probabilities.map((p, i) => ({ p, y: y[i] })).sort((a, b) => b.p - a.p);
  const points: RocPoint[] = [{ threshold: Infinity, fpr: 0, tpr: 0 }];
  let tp = 0;
  let fp = 0;
  let i = 0;
  while (i < order.length) {
    const t = order[i].p;
    while (i < order.length && order[i].p === t) {
      if (order[i].y === 1) tp++;
      else fp++;
      i++;
    }
    points.push({ threshold: t, fpr: N ? fp / N : 0, tpr: P ? tp / P : 0 });
  }
  let auc = 0;
  for (let j = 1; j < points.length; j++)
    auc += ((points[j].fpr - points[j - 1].fpr) * (points[j].tpr + points[j - 1].tpr)) / 2;
  return { points, auc };
}
