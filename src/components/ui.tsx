import type { ReactNode } from 'react';
import { fmt } from '../stats';

export function Card({
  title,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          {title && <h2>{title}</h2>}
          {actions && <div className="row no-print">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, title }: { label: string; value: ReactNode; title?: string }) {
  return (
    <div className="stat" title={title}>
      <span className="label">{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}

export function Alert({ kind = 'info', children }: { kind?: 'info' | 'error'; children: ReactNode }) {
  return (
    <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="icon" aria-hidden>
        {kind === 'error' ? '⚠' : 'ℹ'}
      </span>
      <div>{children}</div>
    </div>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  decimals = 1,
  unit = '',
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  unit?: string;
  onChange(v: number): void;
  disabled?: boolean;
}) {
  return (
    <label className="slider-field" style={{ opacity: disabled ? 0.5 : 1 }}>
      <span className="slider-top">
        <span>{label}</span>
        <b>
          {fmt(value, decimals)}
          {unit}
        </b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange(v: number): void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      />
    </label>
  );
}
