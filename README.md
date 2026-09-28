# Predicción de Attrition de Empleados – IBM HR Analytics

**Autor:** Fernando Caceres
**Universidad CAECE** · Materia: Aprendizaje Artificial · Unidad 3

Modelos de clasificación para predecir si un empleado abandonará la compañía (*attrition*), siguiendo las cinco etapas de Setiawan et al. (2020). Se comparan siete algoritmos (Regresión Logística, Árbol de Decisión C4.5, Naive Bayes, KNN, Random Forest, SVM y Red Neuronal MLP) y una regresión logística estadística con selección por VIF y eliminación hacia atrás.

**Mejor modelo:** Regresión Logística, con AUC 0,817 en test (0,828 en validación cruzada), sensibilidad del 68 % y especificidad del 79 %.

## Contenido

| Archivo | Descripción |
|---|---|
| `Informe_Attrition_IBM_HR.pdf` | Informe final (9 páginas) |
| `Attrition_IBM_HR.ipynb` | Notebook con el análisis completo |
| `Attrition_IBM_HR.html` | Notebook exportado a HTML |
| `WA_Fn-UseC_-HR-Employee-Attrition.csv` | Dataset IBM HR Analytics (Kaggle) |
| `resultados_modelos.csv` | Métricas de los modelos con umbral 0,5 |
| `resultados_modelos_umbral_ajustado.csv` | Métricas con el umbral ajustado |
| `PROMPT_VisualStudio.md` | Prompt para convertir el notebook en un proyecto Python con una app en Streamlit |
