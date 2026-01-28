"""
Smart Wallet IA - Schémas Pydantic

Ce module définit tous les modèles de données utilisés par l'API et le moteur ML.
Utilise Pydantic v2 avec validation stricte.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


# =============================================================================
# ENUMS
# =============================================================================


class Decision(str, Enum):
    """Décisions possibles du moteur ML."""

    APPROVE = "approve"
    REVIEW = "review"
    BLOCK = "block"


class ReasonCode(str, Enum):
    """Codes de raison pour les règles de détection R1-R9."""

    # P0 - Bloquant
    AMOUNT_HIGH = "AMOUNT_HIGH"  # R1
    VELOCITY_HIGH = "VELOCITY_HIGH"  # R4
    IP_GEO_MISMATCH = "IP_GEO_MISMATCH"  # R5
    DUPLICATE_REQUEST = "DUPLICATE_REQUEST"  # R7
    SCA_THRESHOLD = "SCA_THRESHOLD"  # R9

    # P1 - Audit/Alerte
    TIME_SUSPICIOUS = "TIME_SUSPICIOUS"  # R2
    LOCATION_CHANGE = "LOCATION_CHANGE"  # R3
    KYC_EXPIRED = "KYC_EXPIRED"  # R6
    CAMPUS_NOT_ALLOWED = "CAMPUS_NOT_ALLOWED"  # R8


class TransactionType(str, Enum):
    """Types de transactions."""

    PAYMENT = "payment"
    TRANSFER = "transfer"
    WITHDRAWAL = "withdrawal"
    DEPOSIT = "deposit"


class TransactionDirection(str, Enum):
    """Direction de la transaction."""

    INCOMING = "incoming"
    OUTGOING = "outgoing"


class TransactionStatus(str, Enum):
    """Statuts possibles d'une transaction."""

    PENDING = "pending"
    APPROVED = "approved"
    BLOCKED = "blocked"
    FLAGGED = "flagged"


class LabelType(str, Enum):
    """Types de labels pour l'entraînement ML."""

    FRAUD = "fraud"
    LEGIT = "legit"
    CATEGORY = "category"
    DUPLICATE = "duplicate"
    SUBSCRIPTION = "subscription"


class Confidence(str, Enum):
    """Niveaux de confiance pour les labels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# =============================================================================
# REQUEST MODELS
# =============================================================================


class MLAnalysisRequest(BaseModel):
    """
    Requête d'analyse ML pour détection de fraude.

    Envoyée à l'endpoint POST /v1/ml
    """

    model_config = ConfigDict(
        frozen=True,
        json_schema_extra={
            "example": {
                "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "amount": 650.00,
                "currency": "EUR",
                "country": "FR",
                "city": "Paris",
                "ip_address": "192.168.1.1",
                "ip_latitude": 48.8566,
                "ip_longitude": 2.3522,
                "merchant_id": "merchant_123",
                "timestamp": "2026-01-22T14:30:00Z",
            }
        },
    )

    transaction_id: UUID = Field(description="ID unique de la transaction")
    user_id: UUID = Field(description="ID de l'utilisateur")
    amount: float = Field(gt=0, description="Montant de la transaction")
    currency: str = Field(
        default="EUR",
        pattern=r"^[A-Z]{3}$",
        description="Code devise ISO 4217",
    )
    country: str = Field(
        pattern=r"^[A-Z]{2}$",
        description="Code pays ISO 3166-1 alpha-2",
    )
    city: str | None = Field(default=None, max_length=100, description="Ville")
    ip_address: str | None = Field(
        default=None,
        description="Adresse IP du client",
    )
    ip_latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
        description="Latitude géolocalisée de l'IP",
    )
    ip_longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
        description="Longitude géolocalisée de l'IP",
    )
    declared_latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
        description="Latitude déclarée par l'utilisateur",
    )
    declared_longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
        description="Longitude déclarée par l'utilisateur",
    )
    merchant_id: str = Field(max_length=100, description="ID du marchand")
    timestamp: datetime = Field(description="Horodatage de la transaction")

    @model_validator(mode="after")
    def validate_coordinates(self) -> MLAnalysisRequest:
        """Valide la cohérence des coordonnées."""
        has_ip_coords = self.ip_latitude is not None and self.ip_longitude is not None
        has_declared_coords = (
            self.declared_latitude is not None and self.declared_longitude is not None
        )

        # Si on a des coordonnées IP, on doit avoir les deux
        if (self.ip_latitude is None) != (self.ip_longitude is None):
            raise ValueError("ip_latitude and ip_longitude must both be set or both be None")

        # Idem pour les coordonnées déclarées
        if (self.declared_latitude is None) != (self.declared_longitude is None):
            raise ValueError(
                "declared_latitude and declared_longitude must both be set or both be None"
            )

        return self


class TransactionRequest(BaseModel):
    """
    Requête de création de transaction.

    Utilisée pour créer une nouvelle transaction dans le système.
    """

    model_config = ConfigDict(strict=True)

    user_id: UUID = Field(description="ID de l'utilisateur")
    wallet_id: UUID = Field(description="ID du wallet")
    amount: float = Field(gt=0, description="Montant")
    currency: str = Field(default="EUR", pattern=r"^[A-Z]{3}$")
    country: str = Field(pattern=r"^[A-Z]{2}$")
    city: str | None = Field(default=None, max_length=100)
    transaction_type: TransactionType = Field(description="Type de transaction")
    direction: TransactionDirection = Field(description="Direction")
    provider: str = Field(max_length=50, description="Provider (stripe, paypal, internal)")
    merchant_id: str | None = Field(default=None, max_length=100)
    ip_address: str | None = Field(default=None)
    request_id: UUID = Field(description="ID unique de la requête (idempotence)")


class LabelRequest(BaseModel):
    """Requête de création de label par un analyste."""

    model_config = ConfigDict(strict=True)

    transaction_id: UUID = Field(description="ID de la transaction")
    label_type: LabelType = Field(description="Type de label")
    label_value: str = Field(max_length=100, description="Valeur du label")
    confidence: Confidence = Field(default=Confidence.MEDIUM, description="Niveau de confiance")
    notes: str | None = Field(default=None, max_length=1000, description="Notes additionnelles")


# =============================================================================
# RESPONSE MODELS
# =============================================================================


class ReasonDetail(BaseModel):
    """Détail d'une raison de détection."""

    model_config = ConfigDict(frozen=True)

    code: ReasonCode = Field(description="Code de la raison")
    contribution: int = Field(ge=0, le=100, description="Contribution au score")
    threshold: float | None = Field(default=None, description="Seuil déclenché")
    actual: float | None = Field(default=None, description="Valeur actuelle")
    message: str = Field(description="Message explicatif")


class MLAnalysisResponse(BaseModel):
    """
    Réponse de l'analyse ML.

    Retournée par l'endpoint POST /v1/ml
    """

    model_config = ConfigDict(frozen=True)

    request_id: UUID = Field(description="ID de la requête")
    transaction_id: UUID = Field(description="ID de la transaction analysée")
    score: int = Field(ge=0, le=100, description="Score de risque (0-100)")
    decision: Decision = Field(description="Décision finale")
    reasons: list[ReasonCode] = Field(
        default_factory=list,
        max_length=3,
        description="Codes des raisons principales (max 3)",
    )
    reasons_detail: dict[ReasonCode, ReasonDetail] = Field(
        default_factory=dict,
        description="Détails de chaque raison déclenchée",
    )
    latency_ms: int = Field(ge=0, description="Temps de traitement en ms")
    timestamp: datetime = Field(description="Horodatage de l'analyse")


class TransactionResponse(BaseModel):
    """Réponse contenant une transaction complète."""

    model_config = ConfigDict(frozen=True)

    id: UUID
    user_id: UUID
    wallet_id: UUID
    provider: str
    amount: float
    currency: str
    country: str | None
    city: str | None
    transaction_type: TransactionType
    direction: TransactionDirection
    status: TransactionStatus
    request_id: UUID
    score_ml: float | None = None
    decision: Decision | None = None
    reasons_json: list[ReasonCode] | None = None
    created_at: datetime
    updated_at: datetime


class TransactionListResponse(BaseModel):
    """Réponse paginée de liste de transactions."""

    model_config = ConfigDict(frozen=True)

    transactions: list[TransactionResponse]
    total: int
    limit: int
    offset: int


class LabelResponse(BaseModel):
    """Réponse de création de label."""

    model_config = ConfigDict(frozen=True)

    id: UUID
    transaction_id: UUID
    analyst_id: UUID
    label_type: LabelType
    label_value: str
    confidence: Confidence
    notes: str | None
    created_at: datetime


class HealthResponse(BaseModel):
    """Réponse du health check."""

    model_config = ConfigDict(frozen=True)

    status: str = Field(description="healthy ou unhealthy")
    timestamp: datetime
    services: dict[str, str] = Field(
        description="État de chaque service (up, down, degraded)"
    )
    version: str = Field(description="Version de l'API")


class ErrorResponse(BaseModel):
    """Réponse d'erreur standardisée."""

    model_config = ConfigDict(frozen=True)

    code: str = Field(description="Code d'erreur")
    message: str = Field(description="Message d'erreur")
    request_id: str | None = Field(default=None, description="ID de la requête")
    details: dict[str, Any] | None = Field(default=None, description="Détails additionnels")


# =============================================================================
# USER & CONTEXT MODELS
# =============================================================================


class UserContext(BaseModel):
    """
    Contexte utilisateur pour l'analyse ML.

    Chargé depuis la base de données pour enrichir l'analyse.
    """

    model_config = ConfigDict(frozen=True)

    id: UUID
    email: str
    campus: str | None = None
    kyc_expires_at: datetime | None = None
    last_transaction_country: str | None = None
    daily_transaction_total: float = 0.0
    recent_transaction_count: int = 0


class GeoCoordinates(BaseModel):
    """Coordonnées géographiques."""

    model_config = ConfigDict(frozen=True)

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

    def distance_to(self, other: GeoCoordinates) -> float:
        """
        Calcule la distance en km vers un autre point (formule Haversine).

        Args:
            other: Autre point géographique

        Returns:
            Distance en kilomètres
        """
        from math import radians, sin, cos, sqrt, atan2

        R = 6371  # Rayon de la Terre en km

        lat1 = radians(self.latitude)
        lat2 = radians(other.latitude)
        dlat = radians(other.latitude - self.latitude)
        dlon = radians(other.longitude - self.longitude)

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c
