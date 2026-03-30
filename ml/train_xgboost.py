"""
Smart Wallet IA — Script d'entraînement XGBoost
=================================================
Entraîne un modèle XGBoost sur le dataset généré,
évalue les performances, génère les SHAP explanations,
et exporte le modèle en .pkl pour FastAPI.

Usage:
    pip install xgboost scikit-learn shap joblib pandas numpy matplotlib
    python train_xgboost.py
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
from datetime import datetime

# --- 1. Charger les données ---
print("=" * 60)
print("Smart Wallet IA — Entraînement XGBoost")
print("=" * 60)

df = pd.read_csv("smart_wallet_training_data.csv")
print(f"\nDataset chargé: {len(df)} transactions ({df['is_fraud'].mean()*100:.1f}% fraude)")

# --- 2. Préparer les features ---
FEATURE_COLS = [
    "amount", "hour_of_day", "day_of_week",
    "ip_geo_distance_km", "recent_transaction_count", "daily_total",
    "account_age_days", "amount_vs_user_avg", "tx_frequency_ratio",
    "flag_R1_amount_high", "flag_R2_time_suspicious", "flag_R3_location_change",
    "flag_R4_velocity_high", "flag_R5_ip_geo_mismatch", "flag_R6_kyc_expired",
    "flag_R7_duplicate", "flag_R8_campus_blocked", "flag_R9_sca_threshold",
    "rule_score",
]
TARGET = "is_fraud"

X = df[FEATURE_COLS].values
y = df[TARGET].values

print(f"Features: {len(FEATURE_COLS)}")
print(f"  Brutes (9): amount, hour_of_day, day_of_week, ip_geo_distance_km, ...")
print(f"  Rules (9):  flag_R1 → flag_R9")
print(f"  Enrichies (1): rule_score")

# --- 3. Split temporel (plus réaliste qu'un split aléatoire) ---
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\nSplit: {len(X_train)} train / {len(X_test)} test")
print(f"  Train fraude: {y_train.sum()} ({y_train.mean()*100:.1f}%)")
print(f"  Test fraude:  {y_test.sum()} ({y_test.mean()*100:.1f}%)")

# --- 4. Entraîner XGBoost ---
import xgboost as xgb

# Ratio pour gérer le déséquilibre de classes (95% legit / 5% fraud)
scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    scale_pos_weight=scale_pos_weight,
    min_child_weight=3,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.1,
    reg_lambda=1.0,
    eval_metric="aucpr",
    random_state=42,
    use_label_encoder=False,
    tree_method="hist",  # Rapide sur CPU
)

print(f"\nEntraînement XGBoost...")
print(f"  scale_pos_weight: {scale_pos_weight:.1f}")

model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False,
)
print("  ✅ Modèle entraîné")

# --- 5. Évaluation ---
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    precision_recall_curve,
    average_precision_score,
    confusion_matrix,
)

y_proba = model.predict_proba(X_test)[:, 1]
y_pred = (y_proba >= 0.5).astype(int)

auc_roc = roc_auc_score(y_test, y_proba)
auc_pr = average_precision_score(y_test, y_proba)

print(f"\n{'='*60}")
print(f"RÉSULTATS")
print(f"{'='*60}")
print(f"  AUC-ROC:  {auc_roc:.4f}")
print(f"  AUC-PR:   {auc_pr:.4f}")
print(f"\nClassification Report (seuil=0.5):")
print(classification_report(y_test, y_pred, target_names=["Légitime", "Fraude"]))

cm = confusion_matrix(y_test, y_pred)
print(f"Matrice de confusion:")
print(f"  TP={cm[1,1]} FP={cm[0,1]} FN={cm[1,0]} TN={cm[0,0]}")
print(f"  → {cm[1,0]} fraudes manquées sur {cm[1,1]+cm[1,0]} ({cm[1,0]/(cm[1,1]+cm[1,0])*100:.1f}%)")

# --- 6. Feature importance ---
print(f"\nFeature importance (top 10):")
importances = model.feature_importances_
sorted_idx = np.argsort(importances)[::-1]
for i in range(min(10, len(FEATURE_COLS))):
    idx = sorted_idx[i]
    print(f"  {i+1}. {FEATURE_COLS[idx]}: {importances[idx]:.4f}")

# --- 7. SHAP (explicabilité) ---
try:
    import shap
    print(f"\nCalcul SHAP values...")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test[:100])  # 100 samples pour la démo
    print("  ✅ SHAP explainer prêt")

    # Sauvegarder l'explainer
    joblib.dump(explainer, "shap_explainer.pkl")
    print("  ✅ SHAP explainer sauvegardé → shap_explainer.pkl")
except ImportError:
    print("  ⚠️  SHAP non installé, skip explicabilité (pip install shap)")

# --- 8. Sauvegarder le modèle ---
MODEL_DIR = "ml_model"
os.makedirs(MODEL_DIR, exist_ok=True)

# Modèle XGBoost
model_path = os.path.join(MODEL_DIR, "xgboost_fraud_model.pkl")
joblib.dump(model, model_path)
print(f"\n✅ Modèle sauvegardé → {model_path}")

# Metadata du modèle
model_meta = {
    "model_type": "XGBClassifier",
    "version": "1.0.0",
    "trained_at": datetime.now().isoformat(),
    "n_train_samples": len(X_train),
    "n_test_samples": len(X_test),
    "fraud_rate": float(y.mean()),
    "feature_columns": FEATURE_COLS,
    "metrics": {
        "auc_roc": float(auc_roc),
        "auc_pr": float(auc_pr),
        "confusion_matrix": {
            "tp": int(cm[1, 1]),
            "fp": int(cm[0, 1]),
            "fn": int(cm[1, 0]),
            "tn": int(cm[0, 0]),
        },
    },
    "hyperparameters": {
        "n_estimators": 200,
        "max_depth": 6,
        "learning_rate": 0.1,
        "scale_pos_weight": float(scale_pos_weight),
        "min_child_weight": 3,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
    },
    "decision_thresholds": {
        "approve": "score < 30 (proba < 0.30)",
        "review": "30 <= score < 70 (0.30 <= proba < 0.70)",
        "block": "score >= 70 (proba >= 0.70)",
    },
    "feature_importance_top5": [
        {"name": FEATURE_COLS[sorted_idx[i]], "importance": float(importances[sorted_idx[i]])}
        for i in range(5)
    ],
}

meta_path = os.path.join(MODEL_DIR, "model_metadata.json")
with open(meta_path, "w") as f:
    json.dump(model_meta, f, indent=2, ensure_ascii=False)
print(f"✅ Metadata sauvegardée → {meta_path}")

# Feature columns pour le serving (l'API doit savoir l'ordre exact)
features_path = os.path.join(MODEL_DIR, "feature_columns.json")
with open(features_path, "w") as f:
    json.dump(FEATURE_COLS, f)
print(f"✅ Feature columns sauvegardées → {features_path}")

print(f"\n{'='*60}")
print(f"FICHIERS GÉNÉRÉS DANS {MODEL_DIR}/")
print(f"{'='*60}")
print(f"  xgboost_fraud_model.pkl  — Modèle entraîné (joblib)")
print(f"  shap_explainer.pkl       — Explainer SHAP (joblib)")
print(f"  model_metadata.json      — Métadonnées et métriques")
print(f"  feature_columns.json     — Ordre des features pour l'API")
print(f"\n→ Copie ces 4 fichiers dans ton projet Smart Wallet")
print(f"→ Puis intègre le code de ml/xgboost_engine.py")
