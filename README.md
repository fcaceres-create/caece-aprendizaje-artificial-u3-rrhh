# Predicción de attrition de empleados – IBM HR Analytics

**Autor:** Fernando Caceres · **Universidad CAECE** · Materia: Aprendizaje Artificial · Unidad 3

Modelos de clasificación para predecir si un empleado abandonará la compañía (*attrition*), siguiendo las
cinco etapas de Setiawan et al. (2020). Se comparan siete algoritmos (Regresión Logística, Árbol de Decisión
C4.5, Naive Bayes, KNN, Random Forest, SVM y Red Neuronal MLP) y una regresión logística estadística con
selección por VIF y eliminación hacia atrás, como en el paper.

**Mejor modelo:** Regresión Logística, con AUC 0,817 en prueba (0,828 en validación cruzada), sensibilidad del
68 % y especificidad del 79 %. El 20 % de empleados de mayor riesgo concentra el 61 % de las bajas reales.

El proyecto tiene tres partes:

| Parte | Dónde |
|---|---|
| Informe final (9 páginas) | [`informe/Informe_Attrition_IBM_HR.pdf`](informe/Informe_Attrition_IBM_HR.pdf) |
| Notebook con el análisis completo | [`notebooks/Attrition_IBM_HR.ipynb`](notebooks/Attrition_IBM_HR.ipynb) · [![Abrir en Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/fcaceres-create/caece-aprendizaje-artificial-u3-rrhh/blob/main/notebooks/Attrition_IBM_HR.ipynb) |
| Web interactiva | `src/` (React + TypeScript), se publica como sitio estático |

## Web interactiva

Todo corre en el navegador: no hace falta backend ni Python. Los modelos se entrenan en Python y la web usa
sus resultados, exportados a [`src/data/modelo.json`](src/data/modelo.json). La Regresión Logística elegida
está reimplementada en TypeScript (mismo pre-procesado y mismos coeficientes), así que puede predecir sobre
empleados nuevos.

| Pestaña | Contenido |
|---|---|
| **Resumen** | Problema, resultado, factores clave, metodología y enlaces al informe, notebook, Colab y dataset. |
| **Exploratorio** | Tasa de attrition por categoría, las 10 categorías de mayor riesgo, comparación de variables numéricas y correlaciones, con filtros por departamento y horas extra. |
| **Modelos** | Los 8 modelos con umbral 0,5 o ajustado, slider de umbral con matriz de confusión y métricas en vivo, curvas ROC y resultados de la búsqueda de hiperparámetros. |
| **Interpretación** | Regresión logística estadística (VIF, eliminación hacia atrás, odds ratios), reglas del árbol de decisión, coeficientes de la logística e importancia del Random Forest. |
| **Predicción individual** | Formulario de un empleado (o uno del dataset), probabilidad de irse, variables que más pesan y simulación de acciones de retención. |
| **Ranking de riesgo** | Carga de un CSV o Excel de empleados, ranking descargable, curva de captura y evaluación si el archivo trae `Attrition`. |

### Uso local

Requiere Node.js 20 o superior.

```bash
npm install      # instala las dependencias
npm run dev      # levanta la web en http://localhost:5181
npm test         # tests: la web reproduce las probabilidades y métricas del notebook
npm run build    # genera el sitio estático en dist/
```

Para abrir una pestaña directamente, agregá `#resumen`, `#exploratorio`, `#modelos`, `#interpretacion`,
`#individual` o `#masiva` a la URL.

### Publicar en Netlify

El repositorio incluye [`netlify.toml`](netlify.toml) (comando `npm run build`, carpeta `dist`). En
https://app.netlify.com elegí **Add new site → Import an existing project → GitHub**, seleccioná este
repositorio y confirmá: Netlify toma la configuración del archivo. También se puede arrastrar la carpeta `dist/`
a https://app.netlify.com/drop. Sirven igual GitHub Pages, Cloudflare Pages o Vercel, porque las rutas son
relativas.

### Actualizar los modelos

Si cambiás el notebook, regenerá los datos de la web con el mismo pipeline:

```bash
pip install pandas scikit-learn statsmodels
npm run exportar   # = python scripts/exportar_modelo.py (tarda unos minutos: reentrena los 7 modelos)
npm test
```

## Notebook

[`notebooks/Attrition_IBM_HR.ipynb`](notebooks/Attrition_IBM_HR.ipynb) lee el dataset de
[`notebooks/datos/`](notebooks/datos/) y, en Google Colab, lo descarga de este repositorio. Guarda las tablas de
resultados en [`notebooks/resultados/`](notebooks/resultados/). Para guardar tus cambios en Colab usá
**Archivo → Guardar una copia en Drive**.

## Estructura

```
informe/        Informe final en PDF
notebooks/      Notebook, dataset (datos/) y tablas de resultados (resultados/)
scripts/        exportar_modelo.py: reproduce el notebook y genera src/data/modelo.json
public/         notebook.html (notebook exportado) y favicon
src/
  model/        Datos, pre-procesado y predicción, EDA, formulario y tests de validación
  data/         modelo.json exportado desde Python
  stats/        Matriz de confusión, ROC/AUC y formato argentino
  components/   Tarjetas, gráficos (Recharts) y matriz de confusión
  tabs/         Una pantalla por pestaña
docs/           Prompt alternativo para convertir el notebook en un proyecto Python con Streamlit
```

## Referencias

- Setiawan, I., Suprihanto, S., Nugraha, A. C. y Hutahaean, J. (2020). HR analytics: Employee attrition
  analysis using logistic regression. *IOP Conf. Series: Materials Science and Engineering*, 830, 032001.
- IBM. *IBM HR Analytics Employee Attrition & Performance* [dataset]. Kaggle.
