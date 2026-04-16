"""
Smart Wallet IA — Moteur Hybride XGBoost + Règles R1-R9
=========================================================
Remplace/complète ml/engine.py

Architecture:
  1. Hard-block rules (R6 KYC, R7 doublon, R9 PSD2) → block immédiat
  2. Feature engineering (features brutes + 9 flags binaires + features enrichies)
  3. XGBoost scoring → probabilité de fraude
  4. Matrice de décision → approve / review / block
  5. SHAP explicabilité (uniquement si flaggé)

Usage:
  from ml.xgboost_engine import HybridFraudEngine
  engine = HybridFraudEngine("ml_model/")
  result = await engine.analyze(request, context)
"""

import os
import json
import math
import logging
from datetime import datetime
from typing import Optional

import joblib
import numpy as np

logger = logging.getLogger(__name__)


# ============================================================
# Modèles Pydantic (compatibles avec shared/models.py existant)
# ============================================================
# Note: On importe les modèles existants.
# Si tu veux tester standalone, décommente les classes ci-dessous.
#
# from shared.models import (
#     MLAnalysisRequest, MLAnalysisResponse,
#     ReasonCode, ReasonDetail, Decision
# )


class HybridFraudEngine:
    """
    Moteur hybride : règles déterministes + XGBoost.
    Compatible avec le contrat MLAnalysisRequest → MLAnalysisResponse.
    """

    # Seuils configurables (depuis env vars ou défauts)
    THRESHOLD_AMOUNT_HIGH = float(os.getenv("THRESHOLD_AMOUNT_HIGH", "2500"))
    THRESHOLD_NIGHT_START = int(os.getenv("THRESHOLD_NIGHT_START", "0"))
    THRESHOLD_NIGHT_END = int(os.getenv("THRESHOLD_NIGHT_END", "6"))
    THRESHOLD_VELOCITY_COUNT = int(os.getenv("THRESHOLD_VELOCITY_COUNT", "3"))
    THRESHOLD_IP_GEO_DISTANCE = float(os.getenv("THRESHOLD_IP_GEO_DISTANCE", "1000"))
    THRESHOLD_DUPLICATE_WINDOW = int(os.getenv("THRESHOLD_DUPLICATE_WINDOW", "2"))
    THRESHOLD_SCA_DAILY = float(os.getenv("THRESHOLD_SCA_DAILY", "750"))
    ALLOWED_CAMPUSES = os.getenv("ALLOWED_CAMPUSES", "Paris,Lyon,Bordeaux,Lille,Nantes").split(",")

    # Seuils de décision ML par défaut (score 0-100)
    THRESHOLD_APPROVE = 30
    THRESHOLD_BLOCK = 70

    def __init__(self, model_dir: str = "ml_model/"):
        """Charge le modèle XGBoost et l'explainer SHAP au démarrage."""
        self.model_dir = model_dir
        self.model = None
        self.explainer = None
        self.feature_columns = None
        self.threshold_approve = self.THRESHOLD_APPROVE
        self.threshold_block = self.THRESHOLD_BLOCK

        self._load_model()

    def update_thresholds(self, threshold_approve: int, threshold_block: int):
        """Met à jour dynamiquement les seuils de décision ML."""
        self.threshold_approve = threshold_approve
        self.threshold_block = threshold_block
        logger.info(f"Seuils ML mis à jour: approve < {threshold_approve}, block >= {threshold_block}")

    def _load_model(self):
        """Charge le modèle, l'explainer SHAP et la liste des features."""
        model_path = os.path.join(self.model_dir, "xgboost_fraud_model.pkl")
        features_path = os.path.join(self.model_dir, "feature_columns.json")
        shap_path = os.path.join(self.model_dir, "shap_explainer.pkl")

        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            logger.info(f"✅ Modèle XGBoost chargé depuis {model_path}")
        else:
            logger.warning(f"⚠️ Modèle non trouvé: {model_path} — fallback sur règles seules")

        if os.path.exists(features_path):
            with open(features_path) as f:
                self.feature_columns = json.load(f)
            logger.info(f"✅ {len(self.feature_columns)} features chargées")

        if os.path.exists(shap_path):
            try:
                self.explainer = joblib.load(shap_path)
                logger.info("✅ SHAP explainer chargé")
            except Exception as e:
                logger.warning(f"⚠️ SHAP explainer non chargé (pickle incompatible): {e}")
                self.explainer = None

    # ============================================================
    # ÉTAPE 1 — Hard-block rules (< 1ms)
    # ============================================================
    def _check_hard_blocks(self, request, context: dict) -> Optional[dict]:
        """
        Vérifie les règles critiques qui bloquent immédiatement.
        Retourne None si OK, ou un dict de résultat si block.
        """
        reasons = []
        reasons_detail = {}

        # R6 — KYC expiré
        kyc_expires = context.get("user", {}).get("kyc_expires_at")
        if kyc_expires:
            if isinstance(kyc_expires, str):
                kyc_expires = datetime.fromisoformat(kyc_expires)
            # Normaliser les timezones pour la comparaison
            now = datetime.now(kyc_expires.tzinfo) if kyc_expires.tzinfo else datetime.now()
            if kyc_expires < now:
                reasons.append("KYC_EXPIRED")
                reasons_detail["KYC_EXPIRED"] = {
                    "code": "KYC_EXPIRED",
                    "contribution": 15,
                    "threshold": None,
                    "actual": None,
                    "message": f"KYC expiré depuis le {kyc_expires.strftime('%d/%m/%Y')}",
                }

        # R7 — Doublon
        if context.get("has_duplicate"):
            reasons.append("DUPLICATE_REQUEST")
            reasons_detail["DUPLICATE_REQUEST"] = {
                "code": "DUPLICATE_REQUEST",
                "contribution": 50,
                "threshold": self.THRESHOLD_DUPLICATE_WINDOW,
                "actual": None,
                "message": f"Transaction dupliquée détectée (< {self.THRESHOLD_DUPLICATE_WINDOW} min)",
            }

        # R9 — Seuil PSD2/SCA
        daily_total = context.get("daily_total", 0)
        cumul = daily_total + request.amount
        if cumul > self.THRESHOLD_SCA_DAILY:
            reasons.append("SCA_THRESHOLD")
            reasons_detail["SCA_THRESHOLD"] = {
                "code": "SCA_THRESHOLD",
                "contribution": 35,
                "threshold": self.THRESHOLD_SCA_DAILY,
                "actual": cumul,
                "message": f"Cumul journalier {cumul:.2f} EPC > seuil SCA {self.THRESHOLD_SCA_DAILY} EPC",
            }

        # Hard-block uniquement si le score total des règles critiques atteint le seuil de block
        if reasons:
            score = min(sum(r["contribution"] for r in reasons_detail.values()), 100)
            if score >= self.threshold_block:
                return {
                    "score": score,
                    "decision": "block",
                    "reasons": reasons[:3],
                    "reasons_detail": reasons_detail,
                    "source": "hard_block",
                }

        return None  # Pas de hard-block, on continue vers le ML

    # ============================================================
    # ÉTAPE 2 — Feature engineering
    # ============================================================
    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2) -> float:
        """Distance en km entre deux points GPS."""
        if any(v is None for v in [lat1, lon1, lat2, lon2]):
            return 0.0
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2
             + math.cos(math.radians(lat1))
             * math.cos(math.radians(lat2))
             * math.sin(dlon / 2) ** 2)
        return R * 2 * math.asin(math.sqrt(a))

    def _build_features(self, request, context: dict) -> dict:
        """
        Construit le vecteur de features pour XGBoost.
        Features brutes + 9 flags R1-R9 + features enrichies.
        """
        timestamp = request.timestamp
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)

        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        amount = request.amount

        # Distance IP ↔ position déclarée
        ip_geo_distance = self._haversine(
            request.declared_latitude, request.declared_longitude,
            request.ip_latitude, request.ip_longitude,
        )

        # Contexte enrichi
        recent_tx_count = context.get("recent_transaction_count", 0)
        daily_total = context.get("daily_total", 0)
        user = context.get("user", {})
        account_age = user.get("account_age_days", 365)

        # Features enrichies (option 2 du mix)
        user_avg_amount = user.get("avg_amount", amount)  # fallback
        amount_vs_avg = amount / max(user_avg_amount, 1)
        user_tx_per_day = user.get("tx_per_day_avg", 1)
        tx_freq_ratio = recent_tx_count / max(user_tx_per_day, 0.1)

        # 9 flags binaires R1-R9
        last_country = context.get("last_transaction_country")
        kyc_expires = user.get("kyc_expires_at")
        kyc_valid = True
        if kyc_expires:
            if isinstance(kyc_expires, str):
                kyc_expires = datetime.fromisoformat(kyc_expires)
            now_tz = datetime.now(kyc_expires.tzinfo) if kyc_expires.tzinfo else datetime.now()
            kyc_valid = kyc_expires >= now_tz

        flags = {
            "flag_R1_amount_high": 1 if amount > self.THRESHOLD_AMOUNT_HIGH else 0,
            "flag_R2_time_suspicious": 1 if self.THRESHOLD_NIGHT_START <= hour < self.THRESHOLD_NIGHT_END else 0,
            "flag_R3_location_change": 1 if (last_country and request.country != last_country) else 0,
            "flag_R4_velocity_high": 1 if recent_tx_count >= self.THRESHOLD_VELOCITY_COUNT else 0,
            "flag_R5_ip_geo_mismatch": 1 if ip_geo_distance > self.THRESHOLD_IP_GEO_DISTANCE else 0,
            "flag_R6_kyc_expired": 0 if kyc_valid else 1,
            "flag_R7_duplicate": 1 if context.get("has_duplicate") else 0,
            "flag_R8_campus_blocked": 1 if user.get("campus") not in self.ALLOWED_CAMPUSES else 0,
            "flag_R9_sca_threshold": 1 if (daily_total + amount) > self.THRESHOLD_SCA_DAILY else 0,
        }

        rule_score = min(
            flags["flag_R1_amount_high"] * 30
            + flags["flag_R2_time_suspicious"] * 20
            + flags["flag_R3_location_change"] * 25
            + flags["flag_R4_velocity_high"] * 35
            + flags["flag_R5_ip_geo_mismatch"] * 40
            + flags["flag_R6_kyc_expired"] * 15
            + flags["flag_R7_duplicate"] * 50
            + flags["flag_R8_campus_blocked"] * 20
            + flags["flag_R9_sca_threshold"] * 35,
            100,
        )

        # Vecteur complet (même ordre que feature_columns.json)
        features = {
            "amount": amount,
            "hour_of_day": hour,
            "day_of_week": day_of_week,
            "ip_geo_distance_km": round(ip_geo_distance, 2),
            "recent_transaction_count": recent_tx_count,
            "daily_total": daily_total,
            "account_age_days": account_age,
            "amount_vs_user_avg": round(amount_vs_avg, 4),
            "tx_frequency_ratio": round(tx_freq_ratio, 4),
            **flags,
            "rule_score": rule_score,
        }

        return features

    # ============================================================
    # ÉTAPE 3 — XGBoost scoring
    # ============================================================
    def _ml_score(self, features: dict) -> float:
        """
        Retourne la probabilité de fraude (0.0 → 1.0).
        Fallback sur rule_score normalisé si modèle non disponible.
        """
        if self.model is None or self.feature_columns is None:
            # Fallback : score des règles normalisé
            return features["rule_score"] / 100.0

        # Construire le vecteur dans le bon ordre
        X = np.array([[features[col] for col in self.feature_columns]])
        proba = self.model.predict_proba(X)[0][1]  # P(fraud)
        return float(proba)

    # ============================================================
    # ÉTAPE 4 — Matrice de décision
    # ============================================================
    def _decide(self, score: int) -> str:
        """Score 0-100 → decision string."""
        if score < self.threshold_approve:
            return "approve"
        elif score < self.threshold_block:
            return "review"
        else:
            return "block"

    # ============================================================
    # ÉTAPE 5 — SHAP explicabilité (conditionnel)
    # ============================================================
    def _explain(self, features: dict, top_k: int = 3) -> dict:
        """
        Génère les raisons explicables via SHAP.
        Retourne les top_k features les plus contributives.
        """
        reasons = []
        reasons_detail = {}

        # Codes valides (enum ReasonCode dans shared/models.py)
        VALID_CODES = {
            "AMOUNT_HIGH", "TIME_SUSPICIOUS", "LOCATION_CHANGE",
            "VELOCITY_HIGH", "IP_GEO_MISMATCH", "KYC_EXPIRED",
            "DUPLICATE_REQUEST", "CAMPUS_NOT_ALLOWED", "SCA_THRESHOLD",
        }

        # Mapping feature → ReasonCode
        FEATURE_TO_REASON = {
            "flag_R1_amount_high": "AMOUNT_HIGH",
            "flag_R2_time_suspicious": "TIME_SUSPICIOUS",
            "flag_R3_location_change": "LOCATION_CHANGE",
            "flag_R4_velocity_high": "VELOCITY_HIGH",
            "flag_R5_ip_geo_mismatch": "IP_GEO_MISMATCH",
            "flag_R6_kyc_expired": "KYC_EXPIRED",
            "flag_R7_duplicate": "DUPLICATE_REQUEST",
            "flag_R8_campus_blocked": "CAMPUS_NOT_ALLOWED",
            "flag_R9_sca_threshold": "SCA_THRESHOLD",
            "amount": "AMOUNT_HIGH",
            "ip_geo_distance_km": "IP_GEO_MISMATCH",
            "recent_transaction_count": "VELOCITY_HIGH",
            "hour_of_day": "TIME_SUSPICIOUS",
            "daily_total": "SCA_THRESHOLD",
            "rule_score": "AMOUNT_HIGH",  # Fallback vers un code valide
        }

        THRESHOLDS = {
            "AMOUNT_HIGH": self.THRESHOLD_AMOUNT_HIGH,
            "TIME_SUSPICIOUS": self.THRESHOLD_NIGHT_END,
            "VELOCITY_HIGH": self.THRESHOLD_VELOCITY_COUNT,
            "IP_GEO_MISMATCH": self.THRESHOLD_IP_GEO_DISTANCE,
            "SCA_THRESHOLD": self.THRESHOLD_SCA_DAILY,
        }

        MESSAGES_FR = {
            "AMOUNT_HIGH": "Montant {actual:.2f} EPC > seuil {threshold:.0f} EPC",
            "TIME_SUSPICIOUS": "Transaction à {actual:.0f}h (plage nocturne {threshold:.0f}h)",
            "LOCATION_CHANGE": "Changement de pays détecté",
            "VELOCITY_HIGH": "{actual:.0f} transactions récentes (seuil: {threshold:.0f})",
            "IP_GEO_MISMATCH": "Distance IP {actual:.0f}km > seuil {threshold:.0f}km",
            "KYC_EXPIRED": "Identité non vérifiée (KYC expiré)",
            "DUPLICATE_REQUEST": "Transaction dupliquée détectée",
            "CAMPUS_NOT_ALLOWED": "Campus non autorisé",
            "SCA_THRESHOLD": "Cumul journalier {actual:.2f} EPC > seuil SCA {threshold:.0f} EPC",
        }

        # Mapping code → flag feature pour vérifier que la règle est réellement active
        CODE_TO_FLAG = {
            "AMOUNT_HIGH": "flag_R1_amount_high",
            "TIME_SUSPICIOUS": "flag_R2_time_suspicious",
            "LOCATION_CHANGE": "flag_R3_location_change",
            "VELOCITY_HIGH": "flag_R4_velocity_high",
            "IP_GEO_MISMATCH": "flag_R5_ip_geo_mismatch",
            "KYC_EXPIRED": "flag_R6_kyc_expired",
            "DUPLICATE_REQUEST": "flag_R7_duplicate",
            "CAMPUS_NOT_ALLOWED": "flag_R8_campus_blocked",
            "SCA_THRESHOLD": "flag_R9_sca_threshold",
        }

        if self.explainer and self.feature_columns:
            # SHAP-based explanation
            X = np.array([[features[col] for col in self.feature_columns]])
            shap_values = self.explainer.shap_values(X)[0]

            # Trier par valeur SHAP absolue (contribution au score)
            indices = np.argsort(np.abs(shap_values))[::-1]

            seen_codes = set()
            for idx in indices:
                if len(reasons) >= top_k:
                    break
                feat_name = self.feature_columns[idx]
                shap_val = shap_values[idx]

                if shap_val <= 0:
                    continue  # Ne garder que les contributions positives (vers fraude)

                code = FEATURE_TO_REASON.get(feat_name)
                if not code or code not in VALID_CODES:
                    continue  # Ignorer les features sans code R1-R9 valide
                if code in seen_codes:
                    continue

                # Ne remonter la raison que si la règle correspondante est
                # réellement déclenchée (flag = 1). SHAP peut attribuer de
                # l'importance à un flag même quand il vaut 0 à cause des
                # corrélations apprises sur les données d'entraînement.
                flag_key = CODE_TO_FLAG.get(code)
                if flag_key and features.get(flag_key, 0) == 0:
                    continue

                seen_codes.add(code)

                threshold = THRESHOLDS.get(code)
                actual = features.get(feat_name, 0)
                contribution = int(min(abs(shap_val) * 100, 50))

                message = MESSAGES_FR.get(code, f"{code} déclenché").format(
                    actual=actual, threshold=threshold or 0
                )

                reasons.append(code)
                reasons_detail[code] = {
                    "code": code,
                    "contribution": contribution,
                    "threshold": threshold,
                    "actual": actual,
                    "message": message,
                }
        else:
            # Fallback: utiliser les flags déclenchés
            WEIGHTS = {
                "flag_R1_amount_high": ("AMOUNT_HIGH", 30),
                "flag_R2_time_suspicious": ("TIME_SUSPICIOUS", 20),
                "flag_R3_location_change": ("LOCATION_CHANGE", 25),
                "flag_R4_velocity_high": ("VELOCITY_HIGH", 35),
                "flag_R5_ip_geo_mismatch": ("IP_GEO_MISMATCH", 40),
                "flag_R6_kyc_expired": ("KYC_EXPIRED", 15),
                "flag_R7_duplicate": ("DUPLICATE_REQUEST", 50),
                "flag_R8_campus_blocked": ("CAMPUS_NOT_ALLOWED", 20),
                "flag_R9_sca_threshold": ("SCA_THRESHOLD", 35),
            }

            triggered = [
                (code, weight, feat)
                for feat, (code, weight) in WEIGHTS.items()
                if features.get(feat, 0) == 1
            ]
            triggered.sort(key=lambda x: -x[1])

            for code, weight, feat in triggered[:top_k]:
                threshold = THRESHOLDS.get(code)
                actual_map = {
                    "AMOUNT_HIGH": features.get("amount", 0),
                    "TIME_SUSPICIOUS": features.get("hour_of_day", 0),
                    "VELOCITY_HIGH": features.get("recent_transaction_count", 0),
                    "IP_GEO_MISMATCH": features.get("ip_geo_distance_km", 0),
                    "SCA_THRESHOLD": features.get("daily_total", 0) + features.get("amount", 0),
                }
                actual = actual_map.get(code, 0)
                message = MESSAGES_FR.get(code, f"{code} déclenché").format(
                    actual=actual, threshold=threshold or 0
                )
                reasons.append(code)
                reasons_detail[code] = {
                    "code": code,
                    "contribution": weight,
                    "threshold": threshold,
                    "actual": actual,
                    "message": message,
                }

        return {"reasons": reasons, "reasons_detail": reasons_detail}

    # ============================================================
    # MÉTHODE PRINCIPALE — analyze()
    # ============================================================
    async def analyze(self, request, context: dict) -> dict:
        """
        Point d'entrée principal. Compatible avec le contrat existant.

        Args:
            request: MLAnalysisRequest (ou objet avec les mêmes attributs)
            context: dict enrichi (user, last_transaction_country, etc.)

        Returns:
            dict compatible MLAnalysisResponse
        """
        import time
        start = time.monotonic()

        # Étape 1 — Hard-blocks
        hard_block = self._check_hard_blocks(request, context)
        if hard_block:
            elapsed = int((time.monotonic() - start) * 1000)
            return {
                "score": hard_block["score"],
                "decision": hard_block["decision"],
                "reasons": hard_block["reasons"],
                "reasons_detail": hard_block["reasons_detail"],
                "latency_ms": elapsed,
                "source": "hard_block",
            }

        # Étape 2 — Feature engineering
        features = self._build_features(request, context)

        # Log des flags et rule_score pour debug
        flag_keys = [k for k in features if k.startswith("flag_")]
        active_flags = {k: features[k] for k in flag_keys if features[k] == 1}
        logger.info(f"ML Features: rule_score={features['rule_score']}, "
                     f"active_flags={active_flags}, amount={features['amount']}, "
                     f"recent_tx_count={features['recent_transaction_count']}, "
                     f"daily_total={features['daily_total']}")

        # Étape 3 — ML scoring
        fraud_proba = self._ml_score(features)
        score = int(min(fraud_proba * 100, 100))

        # Si le rule_score est significatif mais XGBoost sous-estime, prendre le max
        rule_score = features["rule_score"]
        if rule_score > score:
            logger.info(f"ML override: XGBoost score={score}, rule_score={rule_score} — using rule_score")
            score = rule_score

        # Étape 4 — Décision
        decision = self._decide(score)

        # Étape 5 — Explicabilité (seulement si review ou block)
        if decision in ("review", "block"):
            explanation = self._explain(features, top_k=3)
        else:
            explanation = {"reasons": [], "reasons_detail": {}}

        elapsed = int((time.monotonic() - start) * 1000)

        return {
            "score": score,
            "decision": decision,
            "reasons": explanation["reasons"],
            "reasons_detail": explanation["reasons_detail"],
            "latency_ms": elapsed,
            "source": "hybrid_ml",
        }


# ============================================================
# Intégration FastAPI (à ajouter dans api/main.py)
# ============================================================
"""
# Dans api/main.py, remplacer l'import de FraudDetectionEngine par :

from ml.xgboost_engine import HybridFraudEngine

# Au démarrage de l'app :
engine = HybridFraudEngine(model_dir="ml_model/")

# L'endpoint POST /v1/ml reste IDENTIQUE :
@app.post("/v1/ml", response_model=MLAnalysisResponse)
async def analyze_transaction(request: MLAnalysisRequest):
    context = await build_context(request)  # Tes RPC Supabase existantes
    result = await engine.analyze(request, context)
    return MLAnalysisResponse(
        request_id=uuid4(),
        transaction_id=request.transaction_id,
        score=result["score"],
        decision=result["decision"],
        reasons=result["reasons"],
        reasons_detail=result["reasons_detail"],
        latency_ms=result["latency_ms"],
        timestamp=datetime.now(),
    )
"""
