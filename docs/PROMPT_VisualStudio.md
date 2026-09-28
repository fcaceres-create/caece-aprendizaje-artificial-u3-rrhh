# Prompt: proyecto "Predicción de Attrition – IBM HR Analytics"

> Copiá todo lo que está debajo de la línea en el chat del asistente de IA de Visual Studio / VS Code
> (GitHub Copilot en modo Agent, Claude Code, etc.). Antes, abrí una carpeta vacía y copiá en ella
> `WA_Fn-UseC_-HR-Employee-Attrition.csv` y `Attrition_IBM_HR.ipynb` como referencia.

---

Actuá como un ingeniero de Machine Learning senior. Quiero convertir un análisis que hice en un notebook de Jupyter (`Attrition_IBM_HR.ipynb`, incluido en esta carpeta) en un **proyecto de Python ordenado, reproducible y con una aplicación web**. El proyecto predice el *attrition* (abandono voluntario) de empleados con el dataset **IBM HR Analytics Employee Attrition & Performance** (`WA_Fn-UseC_-HR-Employee-Attrition.csv`: 1.470 filas, 35 columnas, objetivo `Attrition` Yes/No, 16,1 % Yes). Escribí el código, los comentarios, la interfaz y el README en **español**.

## 1. Estructura del proyecto

```
attrition-ibm/
├── data/raw/WA_Fn-UseC_-HR-Employee-Attrition.csv
├── notebooks/Attrition_IBM_HR.ipynb        # análisis original (no modificar)
├── src/attrition/
│   ├── __init__.py
│   ├── config.py        # rutas, SEED=42, listas de columnas
│   ├── data.py          # carga y limpieza
│   ├── features.py      # atributos derivados y codificación
│   ├── train.py         # entrenamiento, búsqueda de hiperparámetros y selección de umbral
│   ├── evaluate.py      # métricas, gráficos y reporte
│   └── predict.py       # carga del modelo y predicción para nuevos empleados
├── models/              # modelo entrenado (.joblib) y metadata.json
├── reports/             # métricas (CSV/JSON) y figuras (PNG)
├── app/streamlit_app.py
├── tests/
├── requirements.txt
├── pyproject.toml
└── README.md
```

## 2. Pre-procesado (replicar exactamente el notebook)

- Eliminar `EmployeeCount`, `Over18`, `StandardHours` (tienen un solo valor) y `EmployeeNumber` (es un ID).
- Convertir `Attrition` a 0/1.
- Crear estos atributos derivados:
  - `IngresoPorNivel = MonthlyIncome / JobLevel`
  - `AniosPromPorEmpresa = TotalWorkingYears / (NumCompaniesWorked + 1)`
  - `ProporcionAniosEnEmpresa = YearsAtCompany / (TotalWorkingYears + 1)`
  - `AniosSinPromocionRel = YearsSinceLastPromotion / (YearsAtCompany + 1)`
  - `SatisfaccionTotal` = promedio de `EnvironmentSatisfaction`, `JobSatisfaction`, `RelationshipSatisfaction` y `JobInvolvement`
- Aplicar one-hot encoding (`drop_first`) a `BusinessTravel`, `Department`, `EducationField`, `Gender`, `JobRole`, `MaritalStatus` y `OverTime`. Implementarlo dentro de un `sklearn.Pipeline` con `ColumnTransformer` (usar `OneHotEncoder(drop="first", handle_unknown="ignore")`), para que la predicción funcione con un solo empleado.
- Aplicar normalización `MinMaxScaler`, también dentro del pipeline, para que se ajuste solo con los datos de entrenamiento.
- Hacer la partición 70/30 estratificada, con `random_state=42`.

## 3. Modelos

- Entrenar 7 clasificadores con `GridSearchCV`, `StratifiedKFold(5, shuffle=True, random_state=42)` y `scoring="roc_auc"`. Usar las mismas grillas que el notebook:
  - Regresión Logística (`class_weight="balanced"`)
  - Árbol de Decisión (`criterion="entropy"`)
  - Naive Bayes Gaussiano
  - KNN
  - Random Forest
  - SVM (`probability=True`)
  - MLP
- Elegir el umbral de cada modelo con `cross_val_predict` sobre el entrenamiento, maximizando el índice de Youden (TPR − FPR).
- Evaluar en el conjunto de prueba estas métricas: Accuracy, Sensibilidad, Especificidad, Precisión, F1 y AUC. Calcularlas con umbral 0,5 y con el umbral ajustado.
- Guardar en `models/` el **modelo final: Regresión Logística** (fue el mejor: AUC ≈ 0,817 en prueba). Guardar también `metadata.json` con el umbral, los hiperparámetros, las métricas, la fecha y las versiones de las librerías.
- Resultados esperados como referencia; aceptar una tolerancia de ±0,02:

| Modelo | AUC prueba | AUC CV |
|---|---|---|
| Regresión Logística | 0,817 | 0,828 |
| Red Neuronal (MLP) | 0,817 | 0,836 |
| SVM | 0,812 | 0,825 |
| Random Forest | 0,750 | 0,815 |
| KNN | 0,742 | 0,755 |
| Naive Bayes | 0,737 | 0,773 |
| Árbol de Decisión | 0,695 | 0,727 |

## 4. Interfaz de línea de comandos

- `python -m attrition.train` entrena, evalúa y guarda el modelo, las métricas (`reports/metricas.csv`) y las figuras: curvas ROC, matrices de confusión, importancia de variables y comparación de modelos.
- `python -m attrition.predict --input nuevos.csv --output riesgo.csv` agrega las columnas `prob_attrition` y `riesgo` (Alto / Medio / Bajo) y ordena de mayor a menor riesgo.

## 5. Aplicación web (Streamlit)

La aplicación va en `app/streamlit_app.py` y tiene 4 pestañas:

1. **Resumen**: KPIs (empleados, tasa de attrition, AUC del modelo) y gráficos de la tasa de attrition por OverTime, JobRole, MaritalStatus, BusinessTravel, rango de edad y quintil de ingreso.
2. **Comparación de modelos**: tabla de métricas, curvas ROC y un slider de umbral que actualice en vivo la sensibilidad, la especificidad y la matriz de confusión de la Regresión Logística.
3. **Predicción individual**: un formulario con los campos del empleado (listas desplegables para las categóricas y rangos válidos para las numéricas). Debe mostrar la probabilidad de irse, el nivel de riesgo y los 5 factores que más contribuyen para ese empleado (coeficiente × valor normalizado).
4. **Predicción masiva**: carga de un CSV, ranking de riesgo descargable y el dato "el X % de mayor riesgo concentra el Y % de las bajas" cuando el CSV incluya `Attrition`.

## 6. Calidad

- Tests con `pytest`: que las columnas derivadas se calculen bien, que el pipeline prediga una sola fila sin errores, que las probabilidades estén en [0, 1] y que el AUC del modelo guardado sea > 0,78 sobre el conjunto de prueba.
- Type hints, docstrings breves, `logging` en lugar de `print` y ninguna ruta absoluta.
- Un `requirements.txt` con versiones fijadas (pandas, scikit-learn, statsmodels, matplotlib, seaborn, streamlit, joblib, pytest).
- Un `README.md` con: objetivo; metodología en 5 etapas (Setiawan et al., 2020); instrucciones para crear el entorno virtual e instalar; comandos para entrenar, predecir, correr la app (`streamlit run app/streamlit_app.py`) y correr los tests; tabla de resultados; factores clave (horas extra, perfil junior, baja satisfacción, ingreso bajo para el nivel, sin stock options, viajes frecuentes, soltero, roles Sales Representative / Laboratory Technician / HR) y limitaciones (dataset ficticio y estático).
- Un `.vscode/launch.json` con configuraciones para depurar el entrenamiento y la app de Streamlit.

## Forma de trabajo

Trabajá por etapas: primero estructura y pre-procesado con tests; después entrenamiento y evaluación (verificá que las métricas coincidan con la tabla de referencia); después predicción; por último la app y el README. Al terminar cada etapa, ejecutá el código y los tests, mostrame los resultados y avisame antes de seguir. Si algún resultado difiere más de 0,02 de la referencia, investigá la causa antes de continuar.
