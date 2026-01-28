"""
Smart Wallet IA - Moteur de Détection de Fraude

Ce module implémente les 9 règles de détection (R1-R9) avec scoring et
explicabilité. Optimisé pour une latence p95 < 100ms.

Règles P0 (Bloquant/Rejet):
    R1 - AMOUNT_HIGH: Montant > 500€
    R4 - VELOCITY_HIGH: ≥ 3 transactions en 5 minutes
    R5 - IP_GEO_MISMATCH: Écart IP/Géoloc > 1000km
    R7 - DUPLICATE_REQUEST: Même montant/marchand en < 2min
    R9 - SCA_THRESHOLD: Cumul > 150€/jour

Règles P1 (Audit/Alerte):
    R2 - TIME_SUSPICIOUS: Transaction nocturne (00h-06h)
    R3 - LOCATION_CHANGE: Pays différent de la transaction précédente
    R6 - KYC_EXPIRED: KYC expiré
    R8 - CAMPUS_NOT_ALLOWED: Campus non dans l'allowlist
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import radians, sin, cos, sqrt, atan2
from typing import Any
from uuid import UUID

from shared.models import (
    MLAnalysisRequest,
    ReasonCode,
    ReasonDetail,
    Decision,
    GeoCoordinates,
)


# =============================================================================
# CONFIGURATION DES RÈGLES
# =============================================================================


@dataclass(frozen=True)
class RuleConfig:
    """Configuration d'une règle de détection."""

    code: ReasonCode
    weight: int  # Contribution au score (0-100)
    priority: str  # P0 (bloquant) ou P1 (audit)
    description: str


# Configuration des 9 règles
RULES_CONFIG: dict[str, RuleConfig] = {
    "R1": RuleConfig(
        code=ReasonCode.AMOUNT_HIGH,
        weight=30,
        priority="P0",
        description="Montant supérieur au seuil de 500€",
    ),
    "R2": RuleConfig(
        code=ReasonCode.TIME_SUSPICIOUS,
        weight=20,
        priority="P1",
        description="Transaction effectuée en horaire nocturne (00h-06h)",
    ),
    "R3": RuleConfig(
        code=ReasonCode.LOCATION_CHANGE,
        weight=25,
        priority="P1",
        description="Pays différent de la dernière transaction",
    ),
    "R4": RuleConfig(
        code=ReasonCode.VELOCITY_HIGH,
        weight=35,
        priority="P0",
        description="Trop de transactions en peu de temps (≥3 en 5min)",
    ),
    "R5": RuleConfig(
        code=ReasonCode.IP_GEO_MISMATCH,
        weight=40,
        priority="P0",
        description="Incohérence entre IP et localisation déclarée (>1000km)",
    ),
    "R6": RuleConfig(
        code=ReasonCode.KYC_EXPIRED,
        weight=15,
        priority="P1",
        description="Vérification d'identité expirée",
    ),
    "R7": RuleConfig(
        code=ReasonCode.DUPLICATE_REQUEST,
        weight=50,
        priority="P0",
        description="Transaction similaire détectée récemment (doublon potentiel)",
    ),
    "R8": RuleConfig(
        code=ReasonCode.CAMPUS_NOT_ALLOWED,
        weight=20,
        priority="P1",
        description="Campus non autorisé pour ce service",
    ),
    "R9": RuleConfig(
        code=ReasonCode.SCA_THRESHOLD,
        weight=35,
        priority="P0",
        description="Seuil journalier PSD2/SCA dépassé (>150€)",
    ),
}

# Seuils configurables
THRESHOLDS = {
    "amount_high_eur": float(os.getenv("THRESHOLD_AMOUNT_HIGH", "500")),
    "velocity_count": int(os.getenv("THRESHOLD_VELOCITY_COUNT", "3")),
    "velocity_window_min": int(os.getenv("THRESHOLD_VELOCITY_WINDOW", "5")),
    "ip_geo_distance_km": float(os.getenv("THRESHOLD_IP_GEO_DISTANCE", "1000")),
    "duplicate_window_min": int(os.getenv("THRESHOLD_DUPLICATE_WINDOW", "2")),
    "sca_daily_eur": float(os.getenv("THRESHOLD_SCA_DAILY", "150")),
    "night_start_hour": int(os.getenv("THRESHOLD_NIGHT_START", "0")),
    "night_end_hour": int(os.getenv("THRESHOLD_NIGHT_END", "6")),
}

# Campus autorisés (configurable via env)
ALLOWED_CAMPUSES = set(
    os.getenv("ALLOWED_CAMPUSES", "Paris,Lyon,Bordeaux,Lille,Nantes").split(",")
)


# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================


def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calcule la distance en kilomètres entre deux points géographiques.

    Utilise la formule de Haversine pour calculer la distance
    sur une sphère (approximation de la Terre).

    Args:
        lat1, lon1: Coordonnées du premier point
        lat2, lon2: Coordonnées du second point

    Returns:
        Distance en kilomètres
    """
    R = 6371  # Rayon de la Terre en km

    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = sin(dlat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


# =============================================================================
# MOTEUR DE DÉTECTION
# =============================================================================


@dataclass
class RuleResult:
    """Résultat de l'évaluation d'une règle."""

    triggered: bool
    code: ReasonCode
    weight: int
    threshold: float | None = None
    actual: float | None = None
    message: str = ""


class FraudDetectionEngine:
    """
    Moteur de détection de fraude avec règles R1-R9.

    Analyse une transaction et retourne:
    - Score de risque (0-100)
    - Décision (approve/review/block)
    - Raisons explicables (max 3)

    Performance cible: latence < 100ms (p95)
    """

    def __init__(self):
        """Initialise le moteur avec la configuration par défaut."""
        self.rules_config = RULES_CONFIG
        self.thresholds = THRESHOLDS
        self.allowed_campuses = ALLOWED_CAMPUSES

    def analyze(
        self,
        request: MLAnalysisRequest,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Analyse une transaction et retourne le résultat complet.

        Args:
            request: Données de la transaction à analyser
            context: Contexte enrichi (user, historique, etc.)

        Returns:
            Dictionnaire avec score, decision, reasons, reasons_detail
        """
        results: list[RuleResult] = []

        # Évalue chaque règle
        results.append(self._check_r1_amount_high(request))
        results.append(self._check_r2_time_suspicious(request))
        results.append(self._check_r3_location_change(request, context))
        results.append(self._check_r4_velocity_high(context))
        results.append(self._check_r5_ip_geo_mismatch(request))
        results.append(self._check_r6_kyc_expired(context))
        results.append(self._check_r7_duplicate_request(context))
        results.append(self._check_r8_campus_not_allowed(context))
        results.append(self._check_r9_sca_threshold(request, context))

        # Calcule le score total
        score = self._calculate_score(results)

        # Détermine la décision
        decision = self._determine_decision(score)

        # Extrait les raisons (max 3, triées par poids décroissant)
        triggered_results = [r for r in results if r.triggered]
        triggered_results.sort(key=lambda r: r.weight, reverse=True)
        top_reasons = triggered_results[:3]

        # Construit les raisons et détails
        reasons = [r.code for r in top_reasons]
        reasons_detail = {
            r.code: ReasonDetail(
                code=r.code,
                contribution=r.weight,
                threshold=r.threshold,
                actual=r.actual,
                message=r.message,
            )
            for r in top_reasons
        }

        return {
            "score": score,
            "decision": decision,
            "reasons": reasons,
            "reasons_detail": reasons_detail,
        }

    def _calculate_score(self, results: list[RuleResult]) -> int:
        """Calcule le score total (plafonné à 100)."""
        total = sum(r.weight for r in results if r.triggered)
        return min(total, 100)

    def _determine_decision(self, score: int) -> str:
        """Détermine la décision basée sur le score."""
        if score < 30:
            return Decision.APPROVE
        elif score < 70:
            return Decision.REVIEW
        else:
            return Decision.BLOCK

    # =========================================================================
    # RÈGLES DE DÉTECTION
    # =========================================================================

    def _check_r1_amount_high(self, request: MLAnalysisRequest) -> RuleResult:
        """
        R1 - AMOUNT_HIGH (P0)

        Vérifie si le montant dépasse le seuil (500€ par défaut).
        Transaction inhabituelle pour un profil étudiant.
        """
        config = self.rules_config["R1"]
        threshold = self.thresholds["amount_high_eur"]

        # Convertit en EUR si nécessaire (simplifié, suppose EUR)
        amount_eur = request.amount if request.currency == "EUR" else request.amount

        triggered = amount_eur > threshold

        return RuleResult(
            triggered=triggered,
            code=config.code,
            weight=config.weight if triggered else 0,
            threshold=threshold,
            actual=amount_eur,
            message=f"Montant {amount_eur}€ > seuil {threshold}€" if triggered else "",
        )

    def _check_r2_time_suspicious(self, request: MLAnalysisRequest) -> RuleResult:
        """
        R2 - TIME_SUSPICIOUS (P1)

        Vérifie si la transaction est effectuée en horaire nocturne (00h-06h).
        Activité suspecte pendant les heures creuses.
        """
        config = self.rules_config["R2"]
        hour = request.timestamp.hour

        start = self.thresholds["night_start_hour"]
        end = self.thresholds["night_end_hour"]

        triggered = start <= hour < end

        return RuleResult(
            triggered=triggered,
            code=config.code,
            weight=config.weight if triggered else 0,
            threshold=float(end),
            actual=float(hour),
            message=f"Transaction à {hour}h (plage nocturne {start}h-{end}h)" if triggered else "",
        )

    def _check_r3_location_change(
        self, request: MLAnalysisRequest, context: dict[str, Any]
    ) -> RuleResult:
        """
        R3 - LOCATION_CHANGE (P1)

        Vérifie si le pays de la transaction diffère de la dernière transaction.
        Déplacement géographique anormal.
        """
        config = self.rules_config["R3"]
        last_country = context.get("last_transaction_country")

        # Si pas de transaction précédente, pas de déclenchement
        if not last_country:
            return RuleResult(
                triggered=False,
                code=config.code,
                weight=0,
            )

        triggered = request.country != last_country

        return RuleResult(
            triggered=triggered,
            code=config.code,
            weight=config.weight if triggered else 0,
            message=f"Changement de pays: {last_country} → {request.country}" if triggered else "",
        )

    def _check_r4_velocity_high(self, context: dict[str, Any]) -> RuleResult:
        """
        R4 - VELOCITY_HIGH (P0)

        Vérifie si l'utilisateur a effectué trop de transactions récemment.
        Activité anormalement intense (≥3 en 5 minutes).
        """
        config = self.rules_config["R4"]
        threshold = self.thresholds["velocity_count"]
        window = self.thresholds["velocity_window_min"]

        recent_count = context.get("recent_transaction_count", 0)
        triggered = recent_count >= threshold

        return RuleResult(
            triggered=triggered,
            code=config.code,
            weight=config.weight if triggered else 0,
            threshold=float(threshold),
            actual=float(recent_count),
            message=f"{recent_count} transactions en {window}min (seuil: {threshold})" if triggered else "",
        )

    def _check_r5_ip_geo_mismatch(self, request: MLAnalysisRequest) -> RuleResult:
        """
        R5 - IP_GEO_MISMATCH (P0)

        Vérifie l'écart entre la géolocalisation IP et la localisation déclarée.
        Utilise la formule Haversine pour calculer la distance.
        """
        config = self.rules_config["R5"]
        threshold_km = self.thresholds["ip_geo_distance_km"]

        # Vérifie si on a les coordonnées nécessaires
        has_ip_coords = request.ip_latitude is not None and request.ip_longitude is not None
        has_declared_coords = (
            request.declared_latitude is not None and request.declared_longitude is not None
        )

        if not has_ip_coords or not has_declared_coords:
            return RuleResult(
                triggered=False,
                code=config.code,
                weight=0,
                message="Coordonnées insuffisantes pour la vérification",
            )

        # Calcule la distance
        distance = haversine_distance(
            request.ip_latitude,
            request.ip_longitude,
            request.declared_latitude,
            request.declared_longitude,
        )

        triggered = distance > threshold_km

        return RuleResult(
            triggered=triggered,
            code=config.code,
            weight=config.weight if triggered else 0,
            threshold=threshold_km,
            actual=round(distance, 2),
            message=f"Distance IP/déclaré: {distance:.0f}km > {threshold_km}km" if triggered else "",
        )

    def _check_r6_kyc_expired(self, context: dict[str, Any]) -> RuleResult:
        """
        R6 - KYC_EXPIRED (P1)

        Vérifie si la vérification d'identité de l'utilisateur est expirée.
        """
        config = self.rules_config["R6"]
        user = context.get("user", {})
        kyc_expires_at = user.get("kyc_expires_at")

        if not kyc_expires_at:
            # Pas de KYC = considéré comme non vérifié
            return RuleResult(
                triggered=True,
                code=config.code,
                weight=config.weight,
                message="Aucune vérification KYC trouvée",
            )

        # Parse la date si c'est une string
        if isinstance(kyc_expires_at, str):
            kyc_expires_at = datetime.fromisoformat(kyc_expires_at.replace("Z", "+00:00"))

        triggered = kyc_expires_at < datetime.now(timezone.utc)

        return RuleResult(
            triggered=triggered,
            code=config.code,
            weight=config.weight if triggered else 0,
            message=f"KYC expiré le {kyc_expires_at.date()}" if triggered else "",
        )

    def _check_r7_duplicate_request(self, context: dict[str, Any]) -> RuleResult:
        """
        R7 - DUPLICATE_REQUEST (P0)

        Vérifie si une transaction similaire existe récemment.
        Protection contre les doubles soumissions et replay attacks.
        """
        config = self.rules_config["R7"]
        has_duplicate = context.get("has_duplicate", False)

        return RuleResult(
            triggered=has_duplicate,
            code=config.code,
            weight=config.weight if has_duplicate else 0,
            message="Transaction similaire détectée dans les 2 dernières minutes" if has_duplicate else "",
        )

    def _check_r8_campus_not_allowed(self, context: dict[str, Any]) -> RuleResult:
        """
        R8 - CAMPUS_NOT_ALLOWED (P1)

        Vérifie si le campus de l'utilisateur est dans l'allowlist.
        """
        config = self.rules_config["R8"]
        user = context.get("user", {})
        campus = user.get("campus")

        if not campus:
            return RuleResult(
                triggered=True,
                code=config.code,
                weight=config.weight,
                message="Campus non renseigné",
            )

        triggered = campus not in self.allowed_campuses

        return RuleResult(
            triggered=triggered,
            code=config.code,
            weight=config.weight if triggered else 0,
            message=f"Campus '{campus}' non autorisé" if triggered else "",
        )

    def _check_r9_sca_threshold(
        self, request: MLAnalysisRequest, context: dict[str, Any]
    ) -> RuleResult:
        """
        R9 - SCA_THRESHOLD (P0)

        Vérifie si le cumul journalier dépasse le seuil PSD2/SCA (150€).
        Réglementation européenne sur l'authentification forte.
        """
        config = self.rules_config["R9"]
        threshold = self.thresholds["sca_daily_eur"]
        daily_total = context.get("daily_total", 0.0)

        # Cumul avec la transaction actuelle
        new_total = daily_total + request.amount
        triggered = new_total > threshold

        return RuleResult(
            triggered=triggered,
            code=config.code,
            weight=config.weight if triggered else 0,
            threshold=threshold,
            actual=round(new_total, 2),
            message=f"Cumul journalier {new_total:.2f}€ > seuil SCA {threshold}€" if triggered else "",
        )


# =============================================================================
# FACTORY
# =============================================================================


def get_fraud_engine() -> FraudDetectionEngine:
    """Factory pour créer une instance du moteur de détection."""
    return FraudDetectionEngine()
