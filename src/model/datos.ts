import csvTexto from '../../notebooks/datos/WA_Fn-UseC_-HR-Employee-Attrition.csv?raw';
import modeloJson from '../data/modelo.json';

export type Valor = string | number;
export type Empleado = Record<string, Valor>;

export interface ModeloExportado {
  nombre: string;
  aucCv: number | null;
  aucCvDesvio: number | null;
  hiperparametros: Record<string, unknown>;
  umbralAjustado: number;
  umbralFijo?: boolean;
  proba: number[];
}

export interface NodoArbol {
  n: number;
  seVan: number;
  clase: number;
  variable?: string;
  umbral?: number;
  izq?: number;
  der?: number;
}

export interface Modelo {
  generado: string;
  semilla: number;
  nTrain: number;
  nTest: number;
  tasaTrain: number;
  indicesTest: number[];
  yTest: number[];
  modelos: ModeloExportado[];
  logistica: {
    variables: string[];
    min: number[];
    max: number[];
    coef: number[];
    intercepto: number;
    mediaEscalada: number[];
  };
  logitEstadistico: {
    vifEliminadas: { variable: string; vif: number }[];
    historial: { modelo: number; nVariables: number; aic: number; eliminada: string | null; p: number | null }[];
    constante: number;
    coeficientes: { variable: string; coef: number; p: number }[];
    pseudoR2: number;
    aic: number;
  };
  arbol: NodoArbol[];
  importanciaRf: { variable: string; importancia: number }[];
}

export const MODELO = modeloJson as Modelo;

/** Interpreta un CSV simple separado por comas o punto y coma (sin comillas con separadores adentro). */
export function parsearCsv(texto: string): { columnas: string[]; filas: Empleado[] } {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lineas.length) return { columnas: [], filas: [] };
  const sep = lineas[0].split(';').length > lineas[0].split(',').length ? ';' : ',';
  const limpiar = (s: string) => s.trim().replace(/^"(.*)"$/, '$1');
  const columnas = lineas[0].split(sep).map(limpiar);
  const filas = lineas.slice(1).map((l) => {
    const celdas = l.split(sep).map(limpiar);
    const fila: Empleado = {};
    columnas.forEach((c, i) => {
      const s = celdas[i] ?? '';
      const n = Number(s);
      fila[c] = s !== '' && Number.isFinite(n) ? n : s;
    });
    return fila;
  });
  return { columnas, filas };
}

/** Dataset completo de IBM (1.470 empleados), en el mismo orden que el CSV. */
export const DATASET = parsearCsv(csvTexto);
export const EMPLEADOS = DATASET.filas;

/** Attrition como 0/1. */
export const seVa = (e: Empleado): number => (e.Attrition === 'Yes' || e.Attrition === 1 || e.Attrition === '1' ? 1 : 0);
