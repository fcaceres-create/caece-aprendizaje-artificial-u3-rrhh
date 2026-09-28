import { useEffect, useState } from 'react';
import { ENLACES } from './enlaces';
import { ExploratorioTab } from './tabs/ExploratorioTab';
import { IndividualTab } from './tabs/IndividualTab';
import { InterpretacionTab } from './tabs/InterpretacionTab';
import { MasivaTab } from './tabs/MasivaTab';
import { ModelosTab } from './tabs/ModelosTab';
import { ResumenTab } from './tabs/ResumenTab';

const TABS = [
  { key: 'resumen', label: 'Resumen', title: 'Resumen' },
  { key: 'exploratorio', label: 'Exploratorio', title: 'Análisis exploratorio' },
  { key: 'modelos', label: 'Modelos', title: 'Comparación de modelos' },
  { key: 'interpretacion', label: 'Interpretación', title: 'Interpretación de los modelos' },
  { key: 'individual', label: 'Predicción individual', title: 'Predicción individual' },
  { key: 'masiva', label: 'Ranking de riesgo', title: 'Predicción masiva y ranking de riesgo' },
] as const;

type Theme = 'auto' | 'light' | 'dark';

function readStored<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [tab, setTab] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    return TABS.some((t) => t.key === hash) ? hash : readStored('tab', 'resumen');
  });
  const [theme, setTheme] = useState<Theme>(() => readStored<Theme>('theme', 'auto'));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* sin almacenamiento */
    }
  }, [theme]);

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`);
    try {
      localStorage.setItem('tab', tab);
    } catch {
      /* sin almacenamiento */
    }
  }, [tab]);

  const irA = (t: string) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const nextTheme: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
  const themeLabel: Record<Theme, string> = { auto: '◐ Automático', light: '☀ Claro', dark: '☾ Oscuro' };

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <h1>
            Attrition de empleados · IBM HR Analytics
            <span className="subtitle">Fernando Caceres · Universidad CAECE · Aprendizaje Artificial — Unidad 3</span>
          </h1>
          <button onClick={() => setTheme(nextTheme[theme])} title="Cambiar tema">
            {themeLabel[theme]}
          </button>
          <button onClick={() => window.print()} title="Imprimir la pestaña actual o guardarla como PDF">
            Imprimir pestaña
          </button>
          <a className="btn primary" href={ENLACES.informe} target="_blank" rel="noreferrer" title="Informe final en PDF (9 páginas)">
            Informe PDF
          </a>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" className="tab" aria-selected={t.key === current.key} onClick={() => irA(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {TABS.map(({ key, title }) => (
        <main key={key} hidden={key !== current.key} role="tabpanel">
          <div className="only-print">
            <h2>{title}</h2>
            <p className="muted">
              Fernando Caceres · Universidad CAECE · Aprendizaje Artificial. Generado el {new Date().toLocaleString('es-AR')}
            </p>
          </div>
          {key === 'resumen' && <ResumenTab irA={irA} />}
          {key === 'exploratorio' && <ExploratorioTab />}
          {key === 'modelos' && <ModelosTab />}
          {key === 'interpretacion' && <InterpretacionTab />}
          {key === 'individual' && <IndividualTab />}
          {key === 'masiva' && <MasivaTab />}
        </main>
      ))}
    </>
  );
}
