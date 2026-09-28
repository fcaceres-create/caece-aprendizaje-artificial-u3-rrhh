"""Reproduce el pipeline del notebook Attrition_IBM_HR.ipynb y exporta los resultados para la web.

Genera src/data/modelo.json con:
- las probabilidades de cada modelo sobre el conjunto de prueba (para la matriz de confusión y la ROC en vivo),
- los parámetros de la Regresión Logística elegida (escalado min-max, coeficientes e intercepto) para predecir
  en el navegador,
- la regresión logística estadística (VIF, eliminación hacia atrás, coeficientes y odds ratios),
- el árbol de decisión simplificado, la importancia de variables del Random Forest y la validación cruzada.

Uso (desde la raíz del repositorio):
    python scripts/exportar_modelo.py
"""

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_predict, train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from statsmodels.stats.outliers_influence import variance_inflation_factor

warnings.filterwarnings("ignore")

RAIZ = Path(__file__).resolve().parent.parent
CSV = RAIZ / "notebooks" / "datos" / "WA_Fn-UseC_-HR-Employee-Attrition.csv"
SALIDA = RAIZ / "src" / "data" / "modelo.json"
SEED = 42

# ---------- Pre-procesado (idéntico al notebook) ----------
df = pd.read_csv(CSV)
df = df.drop(columns=["EmployeeCount", "Over18", "StandardHours", "EmployeeNumber"])
df["Attrition"] = (df["Attrition"] == "Yes").astype(int)
df["IngresoPorNivel"] = df["MonthlyIncome"] / df["JobLevel"]
df["AniosPromPorEmpresa"] = df["TotalWorkingYears"] / (df["NumCompaniesWorked"] + 1)
df["ProporcionAniosEnEmpresa"] = df["YearsAtCompany"] / (df["TotalWorkingYears"] + 1)
df["AniosSinPromocionRel"] = df["YearsSinceLastPromotion"] / (df["YearsAtCompany"] + 1)
df["SatisfaccionTotal"] = df[["EnvironmentSatisfaction", "JobSatisfaction",
                              "RelationshipSatisfaction", "JobInvolvement"]].mean(axis=1)

nominales = ["BusinessTravel", "Department", "EducationField", "Gender", "JobRole", "MaritalStatus", "OverTime"]
X = pd.get_dummies(df.drop(columns="Attrition"), columns=nominales, drop_first=True, dtype=int)
y = df["Attrition"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.30, stratify=y, random_state=SEED)

# ---------- Regresión logística estadística (VIF + eliminación hacia atrás) ----------
scaler_sm = MinMaxScaler().fit(X_train)
Xtr_s = pd.DataFrame(scaler_sm.transform(X_train), columns=X.columns, index=X_train.index)
cols = list(Xtr_s.columns)
eliminadas_vif = []
while True:
    Xc = sm.add_constant(Xtr_s[cols])
    vif = pd.Series([variance_inflation_factor(Xc.values, i) for i in range(1, Xc.shape[1])], index=cols)
    if vif.max() <= 5:
        break
    peor = vif.idxmax()
    eliminadas_vif.append({"variable": peor, "vif": float(vif.max())})
    cols.remove(peor)

historial = []
cols_bw = cols.copy()
while True:
    m = sm.Logit(y_train, sm.add_constant(Xtr_s[cols_bw])).fit(disp=0)
    p = m.pvalues.drop("const")
    salir = p.max() > 0.05
    historial.append({"modelo": len(historial) + 1, "nVariables": len(cols_bw), "aic": float(m.aic),
                      "eliminada": p.idxmax() if salir else None, "p": float(p.max()) if salir else None})
    if not salir:
        break
    cols_bw.remove(p.idxmax())
logit_final = m

# ---------- Siete algoritmos con GridSearchCV ----------
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
modelos = {
    "Regresión Logística": (LogisticRegression(max_iter=5000, class_weight="balanced"),
                            {"clf__C": [0.01, 0.1, 0.5, 1, 5, 10], "clf__penalty": ["l1", "l2"],
                             "clf__solver": ["liblinear"]}),
    "Árbol de Decisión (C4.5)": (DecisionTreeClassifier(criterion="entropy", class_weight="balanced", random_state=SEED),
                                 {"clf__max_depth": [3, 4, 5, 6, 8], "clf__min_samples_leaf": [5, 10, 20, 40]}),
    "Naive Bayes": (GaussianNB(), {"clf__var_smoothing": [1e-9, 1e-6, 1e-3, 1e-2, 1e-1]}),
    "KNN": (KNeighborsClassifier(), {"clf__n_neighbors": [3, 5, 9, 15, 21, 31, 41],
                                     "clf__weights": ["uniform", "distance"]}),
    "Random Forest": (RandomForestClassifier(n_estimators=500, class_weight="balanced", random_state=SEED, n_jobs=-1),
                      {"clf__max_depth": [5, 10, None], "clf__min_samples_leaf": [1, 5, 10],
                       "clf__max_features": ["sqrt", 0.3]}),
    "SVM": (SVC(probability=True, class_weight="balanced", random_state=SEED),
            {"clf__kernel": ["linear", "rbf"], "clf__C": [0.1, 0.5, 1, 5], "clf__gamma": ["scale", 0.01]}),
    "Red Neuronal (MLP)": (MLPClassifier(max_iter=3000, random_state=SEED),
                           {"clf__hidden_layer_sizes": [(8,), (16,), (32,)], "clf__alpha": [0.1, 1, 5, 10]}),
}


def valor_json(v):
    if isinstance(v, tuple):
        return list(v)
    if isinstance(v, (np.integer, np.floating)):
        return v.item()
    return v


salida_modelos = []
ajustados = {}
for nombre, (clf, grilla) in modelos.items():
    print("Entrenando", nombre)
    pipe = Pipeline([("scaler", MinMaxScaler()), ("clf", clf)])
    gs = GridSearchCV(pipe, grilla, scoring="roc_auc", cv=cv, n_jobs=-1).fit(X_train, y_train)
    mejor = gs.best_estimator_
    ajustados[nombre] = mejor
    p_cv = cross_val_predict(mejor, X_train, y_train, cv=cv, method="predict_proba")[:, 1]
    fpr, tpr, thr = roc_curve(y_train, p_cv)
    salida_modelos.append({
        "nombre": nombre,
        "aucCv": float(gs.best_score_),
        "aucCvDesvio": float(gs.cv_results_["std_test_score"][gs.best_index_]),
        "hiperparametros": {k.replace("clf__", ""): valor_json(v) for k, v in gs.best_params_.items()},
        "umbralAjustado": float(thr[np.argmax(tpr - fpr)]),
        "proba": [round(float(v), 6) for v in mejor.predict_proba(X_test)[:, 1]],
    })

Xte_s = pd.DataFrame(scaler_sm.transform(X_test), columns=X.columns, index=X_test.index)
proba_logit = logit_final.predict(sm.add_constant(Xte_s[cols_bw], has_constant="add"))
salida_modelos.append({
    "nombre": "Logística estadística",
    "aucCv": None,
    "aucCvDesvio": None,
    "hiperparametros": {"variables": len(cols_bw)},
    "umbralAjustado": float(y_train.mean()),
    "umbralFijo": True,
    "proba": [round(float(v), 6) for v in proba_logit],
})

# ---------- Regresión Logística elegida: parámetros para predecir en el navegador ----------
lr = ajustados["Regresión Logística"]
sc, clf = lr["scaler"], lr["clf"]
media_train_esc = sc.transform(X_train).mean(axis=0)
logistica = {
    "variables": list(X.columns),
    "min": [float(v) for v in sc.data_min_],
    "max": [float(v) for v in sc.data_max_],
    "coef": [float(v) for v in clf.coef_[0]],
    "intercepto": float(clf.intercept_[0]),
    "mediaEscalada": [float(v) for v in media_train_esc],
}

# ---------- Árbol simplificado (profundidad 3) con umbrales en unidades originales ----------
arbol = Pipeline([("scaler", MinMaxScaler()),
                  ("clf", DecisionTreeClassifier(criterion="entropy", max_depth=3, min_samples_leaf=20,
                                                 class_weight="balanced", random_state=SEED))]).fit(X_train, y_train)
t = arbol["clf"].tree_
camino = arbol["clf"].decision_path(arbol["scaler"].transform(X_train)).toarray().astype(bool)
ytr = y_train.to_numpy()
nodos = []
for i in range(t.node_count):
    en_nodo = camino[:, i]
    nodo = {"n": int(en_nodo.sum()), "seVan": int(ytr[en_nodo].sum()), "clase": int(np.argmax(t.value[i][0]))}
    if t.children_left[i] != -1:
        f = t.feature[i]
        nodo |= {"variable": X.columns[f],
                 "umbral": float(t.threshold[i] * (arbol["scaler"].data_max_[f] - arbol["scaler"].data_min_[f])
                                 + arbol["scaler"].data_min_[f]),
                 "izq": int(t.children_left[i]), "der": int(t.children_right[i])}
    nodos.append(nodo)

# ---------- Importancia de variables del Random Forest ----------
rf = ajustados["Random Forest"]
imp = pd.Series(rf["clf"].feature_importances_, index=X.columns).sort_values(ascending=False).head(15)

coefs = pd.DataFrame({"coef": logit_final.params, "p": logit_final.pvalues})
datos = {
    "generado": pd.Timestamp.now().strftime("%Y-%m-%d"),
    "semilla": SEED,
    "nTrain": int(len(X_train)),
    "nTest": int(len(X_test)),
    "tasaTrain": float(y_train.mean()),
    "indicesTest": [int(i) for i in X_test.index],
    "yTest": [int(v) for v in y_test],
    "modelos": salida_modelos,
    "logistica": logistica,
    "logitEstadistico": {
        "vifEliminadas": eliminadas_vif,
        "historial": historial,
        "constante": float(coefs.loc["const", "coef"]),
        "coeficientes": [{"variable": k, "coef": float(r["coef"]), "p": float(r["p"])}
                         for k, r in coefs.drop("const").sort_values("coef", ascending=False).iterrows()],
        "pseudoR2": float(logit_final.prsquared),
        "aic": float(logit_final.aic),
    },
    "arbol": nodos,
    "importanciaRf": [{"variable": k, "importancia": float(v)} for k, v in imp.items()],
}

SALIDA.parent.mkdir(parents=True, exist_ok=True)
SALIDA.write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

print(f"\nGuardado en {SALIDA.relative_to(RAIZ)}")
for m in salida_modelos:
    print(f"  {m['nombre']:28s} AUC test = {roc_auc_score(y_test, m['proba']):.3f}  umbral ajustado = {m['umbralAjustado']:.3f}")
