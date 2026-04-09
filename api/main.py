"""
Smart Wallet IA - FastAPI Application

Point d'entrée principal de l'API avec middlewares de traçabilité,
gestion des erreurs et endpoints de santé.
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import hashlib
import httpx
import jwt as pyjwt

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel as PydanticBaseModel

load_dotenv(dotenv_path=".env.local")

from api.database import get_db_session, DatabaseError
from ml.xgboost_engine import HybridFraudEngine
from shared.models import (
    MLAnalysisRequest,
    MLAnalysisResponse,
    HealthResponse,
    ErrorResponse,
    Decision,
)


# =============================================================================
# CONFIGURATION
# =============================================================================

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
API_VERSION = "1.0.0"

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='{"timestamp":"%(asctime)s","level":"%(levelname)s","message":"%(message)s"}',
)
logger = logging.getLogger(__name__)


# =============================================================================
# LIFESPAN (Startup/Shutdown)
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application."""
    # Startup
    logger.info(f"Starting Smart Wallet IA API v{API_VERSION}")
    logger.info(f"Environment: {ENVIRONMENT}")

    # Initialise le moteur ML hybride (XGBoost + règles R1-R9)
    app.state.ml_engine = HybridFraudEngine(model_dir="ml_model/")
    logger.info("Hybrid ML Engine (XGBoost + R1-R9) initialized")

    yield

    # Shutdown
    logger.info("Shutting down Smart Wallet IA API")


# =============================================================================
# APPLICATION
# =============================================================================

app = FastAPI(
    title="Smart Wallet IA API",
    description="API de détection de fraude en temps réel pour Smart Wallet",
    version=API_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# =============================================================================
# MIDDLEWARES
# =============================================================================


@app.middleware("http")
async def request_id_middleware(request: Request, call_next) -> Response:
    """
    Middleware qui ajoute un request_id unique à chaque requête.

    - Génère un UUID v4 pour chaque requête
    - Ajoute le request_id dans les headers de réponse
    - Stocke le request_id dans request.state pour utilisation
    """
    # Génère ou récupère le request_id
    request_id = request.headers.get("X-Request-ID", str(uuid4()))
    request.state.request_id = request_id

    # Log de la requête entrante
    logger.info(
        f'{{"request_id":"{request_id}","method":"{request.method}",'
        f'"path":"{request.url.path}","action":"request_start"}}'
    )

    start_time = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception as e:
        # Log de l'erreur
        logger.error(
            f'{{"request_id":"{request_id}","error":"{str(e)}","action":"request_error"}}'
        )
        raise

    # Calcul du temps de traitement
    process_time_ms = int((time.perf_counter() - start_time) * 1000)

    # Ajoute les headers de traçabilité
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = str(process_time_ms)

    # Log de la réponse
    logger.info(
        f'{{"request_id":"{request_id}","status":{response.status_code},'
        f'"latency_ms":{process_time_ms},"action":"request_end"}}'
    )

    return response


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if ENVIRONMENT == "development" else ["https://surphy-wallet.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time-Ms"],
)


# =============================================================================
# ERROR HANDLERS
# =============================================================================


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handler pour les erreurs HTTP."""
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
            request_id=request_id,
        ).model_dump(),
    )


@app.exception_handler(DatabaseError)
async def database_error_handler(request: Request, exc: DatabaseError) -> JSONResponse:
    """Handler pour les erreurs de base de données."""
    request_id = getattr(request.state, "request_id", None)
    logger.error(
        f'{{"request_id":"{request_id}","error_code":"{exc.code}",'
        f'"message":"{exc.message}","action":"database_error"}}'
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            code=exc.code,
            message=exc.message,
            request_id=request_id or exc.request_id,
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handler pour les erreurs non gérées."""
    request_id = getattr(request.state, "request_id", None)
    logger.exception(
        f'{{"request_id":"{request_id}","error":"{str(exc)}","action":"unhandled_error"}}'
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            code="INTERNAL_ERROR",
            message="An unexpected error occurred" if ENVIRONMENT == "production" else str(exc),
            request_id=request_id,
        ).model_dump(),
    )


# =============================================================================
# HEALTH & METRICS ENDPOINTS
# =============================================================================


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Monitoring"],
    summary="Health Check",
    description="Vérifie l'état de santé de l'API et de ses dépendances.",
)
async def health_check() -> HealthResponse:
    """
    Endpoint de health check pour monitoring.

    Vérifie:
    - Connectivité base de données
    - État du moteur ML
    """
    services: dict[str, str] = {}

    # Check Database
    try:
        async with get_db_session() as db:
            # Simple query pour vérifier la connexion
            await db.fetch_all_active_peers()
        services["database"] = "up"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        services["database"] = "down"

    # Check ML Engine
    try:
        if hasattr(app.state, "ml_engine") and app.state.ml_engine is not None:
            services["ml_engine"] = "up"
        else:
            services["ml_engine"] = "down"
    except Exception:
        services["ml_engine"] = "down"

    # Détermine le statut global
    all_up = all(s == "up" for s in services.values())
    status_str = "healthy" if all_up else "unhealthy"

    return HealthResponse(
        status=status_str,
        timestamp=datetime.now(timezone.utc),
        services=services,
        version=API_VERSION,
    )


@app.get(
    "/metrics",
    tags=["Monitoring"],
    summary="Prometheus Metrics",
    description="Expose les métriques au format Prometheus.",
)
async def metrics() -> Response:
    """
    Endpoint de métriques au format Prometheus.

    TODO: Implémenter avec prometheus_client en Sprint 2
    """
    # Placeholder - à implémenter avec prometheus_client
    metrics_output = """# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",endpoint="/v1/ml",status="200"} 0

# HELP ml_latency_seconds ML processing latency
# TYPE ml_latency_seconds histogram
ml_latency_seconds_bucket{le="0.05"} 0
ml_latency_seconds_bucket{le="0.1"} 0
ml_latency_seconds_sum 0
ml_latency_seconds_count 0
"""
    return Response(content=metrics_output, media_type="text/plain")


# =============================================================================
# ML ANALYSIS ENDPOINT
# =============================================================================


@app.post(
    "/v1/ml",
    response_model=MLAnalysisResponse,
    tags=["ML Engine"],
    summary="Analyse de fraude",
    description="Analyse une transaction et retourne un score de risque avec décision.",
    responses={
        200: {"description": "Analyse réussie"},
        422: {"description": "Données invalides"},
        500: {"description": "Erreur interne"},
    },
)
async def analyze_transaction(
    request: Request,
    payload: MLAnalysisRequest,
) -> MLAnalysisResponse:
    """
    Analyse une transaction pour détection de fraude.

    Processus:
    1. Charge le contexte utilisateur depuis la DB
    2. Exécute les 9 règles de détection (R1-R9)
    3. Calcule le score de risque (0-100)
    4. Détermine la décision (approve/review/block)
    5. Retourne les raisons explicables (max 3)

    Performance cible: latence p95 < 100ms
    """
    request_id = request.state.request_id
    start_time = time.perf_counter()

    # Récupère le moteur ML
    engine: HybridFraudEngine = app.state.ml_engine

    # Charge la config ML et les seuils dynamiques (service_role pour bypass RLS)
    async with get_db_session(request_id=request_id, service_role=True) as db:
        # Charge les seuils ML depuis la BDD
        ml_config = await db.fetch_ml_config()
        if ml_config:
            engine.update_thresholds(
                ml_config.get("threshold_approve", 30),
                ml_config.get("threshold_block", 70),
            )

    # Charge le contexte utilisateur
    async with get_db_session(request_id=request_id, service_role=True) as db:
        # Récupère les données nécessaires pour l'analyse
        user = await db.fetch_user(payload.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {payload.user_id} not found",
            )

        # Récupère la dernière transaction pour R3 (changement de pays)
        last_tx = await db.fetch_last_transaction(payload.user_id)

        # Compte les transactions récentes pour R4 (vélocité)
        recent_count = await db.count_recent_transactions(payload.user_id, minutes=5)

        # Vérifie les doublons pour R7
        duplicate = await db.find_duplicate_transaction(
            user_id=payload.user_id,
            amount=payload.amount,
            merchant_id=payload.merchant_id,
            window_minutes=2,
        )

        # Calcule le cumul journalier pour R9 (SCA)
        daily_total = await db.sum_daily_transactions(payload.user_id)

    # Prépare le contexte pour le moteur ML
    context = {
        "user": user,
        "last_transaction_country": last_tx.get("country") if last_tx else None,
        "recent_transaction_count": recent_count,
        "has_duplicate": duplicate is not None,
        "daily_total": daily_total,
    }

    # Exécute l'analyse (moteur hybride async)
    result = await engine.analyze(payload, context)

    # Calcule la latence
    latency_ms = int((time.perf_counter() - start_time) * 1000)

    # Log de l'analyse
    logger.info(
        f'{{"request_id":"{request_id}","transaction_id":"{payload.transaction_id}",'
        f'"score":{result["score"]},"decision":"{result["decision"]}",'
        f'"reasons":{result["reasons"]},"latency_ms":{latency_ms},"action":"ml_analysis"}}'
    )

    return MLAnalysisResponse(
        request_id=request_id,
        transaction_id=payload.transaction_id,
        score=result["score"],
        decision=Decision(result["decision"]),
        reasons=result["reasons"],
        reasons_detail=result["reasons_detail"],
        latency_ms=latency_ms,
        timestamp=datetime.now(timezone.utc),
    )


# =============================================================================
# INTERCAMPUS — Pydantic Models
# =============================================================================


class LookupUserRequest(PydanticBaseModel):
    api_key: str
    email: str | None = None
    full_name: str | None = None
    campus: str | None = None


class LookupUserResponse(PydanticBaseModel):
    success: bool
    user_id: str | None = None
    full_name: str | None = None
    campus: str | None = None
    message: str | None = None


class IntercampusReceiveRequest(PydanticBaseModel):
    transaction_id: str
    source_wallet_id: str
    destination_wallet_id: str
    destination_user_id: str | None = None
    amount: float
    currency: str = "EPC"
    initiator_user_id: str | None = None
    api_key: str
    source_campus_id: str | None = None
    enriched_data: dict[str, Any] | None = None


class IntercampusReceiveResponse(PydanticBaseModel):
    success: bool
    status: str
    message: str
    transaction_id: str | None = None
    new_balance: float | None = None
    fraud_score: int | None = None


class IntercampusSendRequest(PydanticBaseModel):
    source_wallet_id: str
    destination_wallet_id: str
    destination_campus_api_url: str
    destination_api_key: str
    destination_user_id: str | None = None
    amount: float
    currency: str = "EPC"
    description: str | None = None
    enriched_data: dict[str, Any] | None = None


class IntercampusSendResponse(PydanticBaseModel):
    success: bool
    status: str
    message: str
    transaction_id: str | None = None
    destination_tx_id: str | None = None
    new_balance: float | None = None
    fraud_score: int | None = None


# =============================================================================
# INTERCAMPUS — JWT Auth
# =============================================================================

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
security_scheme = HTTPBearer()


async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict[str, Any]:
    """Vérifie le JWT Supabase et retourne le payload."""
    token = credentials.credentials
    try:
        logger.info(f"JWT verify: secret_len={len(SUPABASE_JWT_SECRET)}, secret_start={SUPABASE_JWT_SECRET[:8]}..., token_start={token[:20]}...")
        payload = pyjwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError as e:
        logger.error(f"JWT invalid: {type(e).__name__}: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


# =============================================================================
# INTERCAMPUS — Endpoints
# =============================================================================


@app.post(
    "/lookup-user",
    response_model=LookupUserResponse,
    tags=["Intercampus"],
    summary="Recherche un utilisateur par email ou nom",
)
async def lookup_user(payload: LookupUserRequest) -> LookupUserResponse:
    """
    Endpoint intercampus : recherche un utilisateur.
    Auth via api_key comparé au api_key_hash de notre campus_wallet.
    """
    async with get_db_session(service_role=True) as db:
        # Vérifie l'api_key contre tous nos campus_wallets
        client = db._get_client()
        wallets_resp = (
            client.table("campus_wallets")
            .select("api_key_hash")
            .not_.is_("api_key_hash", "null")
            .execute()
        )
        valid = any(
            w.get("api_key_hash") == payload.api_key
            for w in (wallets_resp.data or [])
        )
        if not valid:
            return LookupUserResponse(
                success=False, message="Unauthorized: invalid api_key"
            )

        # Recherche par email
        if payload.email:
            user = await db.fetch_user_by_email(payload.email)
            if user:
                return LookupUserResponse(
                    success=True,
                    user_id=user["id"],
                    full_name=f"{user.get('firstname', '')} {user.get('lastname', '')}".strip(),
                    campus=user.get("campus"),
                )
            return LookupUserResponse(
                success=False, message="User not found"
            )

        # Recherche par nom + campus
        if payload.full_name and payload.campus:
            user = await db.lookup_user_by_name(payload.full_name, payload.campus)
            if user:
                return LookupUserResponse(
                    success=True,
                    user_id=user["id"],
                    full_name=f"{user.get('firstname', '')} {user.get('lastname', '')}".strip(),
                    campus=user.get("campus"),
                )
            return LookupUserResponse(
                success=False, message="User not found"
            )

        return LookupUserResponse(
            success=False, message="Provide email or (full_name + campus)"
        )


@app.post(
    "/intercampus-receive",
    response_model=IntercampusReceiveResponse,
    tags=["Intercampus"],
    summary="Reçoit un transfert intercampus entrant",
)
async def intercampus_receive(
    request: Request,
    payload: IntercampusReceiveRequest,
) -> IntercampusReceiveResponse:
    """
    Endpoint intercampus : reçoit un transfert entrant d'un autre groupe.
    Auth via api_key comparé au api_key_hash de notre campus_wallet.
    """
    request_id = request.state.request_id

    async with get_db_session(service_role=True, request_id=request_id) as db:
        # 1. Vérifie l'api_key
        valid = await db.verify_campus_api_key(
            payload.destination_wallet_id, payload.api_key
        )
        if not valid:
            return IntercampusReceiveResponse(
                success=False, status="unauthorized",
                message="Invalid api_key for destination wallet",
            )

        # 2. Vérifie que le campus wallet existe et est actif
        campus_wallet = await db.fetch_campus_wallet(payload.destination_wallet_id)
        if not campus_wallet:
            return IntercampusReceiveResponse(
                success=False, status="failed",
                message="Destination campus wallet not found",
            )

        # 3. Crédite le wallet de l'utilisateur destinataire (si spécifié)
        new_balance = None
        if payload.destination_user_id:
            try:
                new_balance = await db.credit_user_wallet(
                    payload.destination_user_id, payload.amount
                )
            except DatabaseError as e:
                return IntercampusReceiveResponse(
                    success=False, status="failed",
                    message=f"Failed to credit user: {e.message}",
                )
        else:
            # Crédite le campus wallet directement
            client = db._get_client()
            current_balance = float(campus_wallet.get("balance", 0))
            new_balance = current_balance + payload.amount
            client.table("campus_wallets").update(
                {"balance": new_balance}
            ).eq("id", payload.destination_wallet_id).execute()

        # 4. Enregistre la transaction
        tx_id = str(uuid4())
        try:
            await db.create_transaction({
                "id": tx_id,
                "user_id": payload.destination_user_id or payload.initiator_user_id,
                "wallet_id": payload.destination_wallet_id,
                "amount": payload.amount,
                "currency": payload.currency,
                "country": "FR",
                "transaction_type": "transfer",
                "direction": "incoming",
                "status": "approved",
                "request_id": request_id,
                "provider": "intercampus",
                "source_campus_code": payload.source_campus_id,
                "external_tx_id": payload.transaction_id,
                "type": "intercampus_receive",
            })
        except Exception as e:
            logger.warning(f"Failed to record intercampus transaction: {e}")

        # 5. Enregistre dans external_transfers
        try:
            await db.record_external_transfer({
                "from_wallet_id": payload.source_wallet_id,
                "to_email": payload.destination_user_id or "campus_wallet",
                "to_campus": payload.source_campus_id or "unknown",
                "amount": payload.amount,
                "currency": payload.currency,
                "status": "completed",
                "request_id": request_id,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.warning(f"Failed to record external transfer: {e}")

        return IntercampusReceiveResponse(
            success=True,
            status="completed",
            message="Transfer received successfully",
            transaction_id=tx_id,
            new_balance=new_balance,
        )


@app.post(
    "/intercampus-send",
    response_model=IntercampusSendResponse,
    tags=["Intercampus"],
    summary="Envoie un transfert intercampus vers un autre groupe",
)
async def intercampus_send(
    request: Request,
    payload: IntercampusSendRequest,
    jwt_payload: dict[str, Any] = Depends(verify_jwt),
) -> IntercampusSendResponse:
    """
    Endpoint intercampus : envoie un transfert vers un autre groupe.
    Auth via JWT Supabase (user connecté).
    """
    request_id = request.state.request_id
    user_id = jwt_payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid JWT: no sub claim")

    async with get_db_session(service_role=True, request_id=request_id) as db:
        # 1. Vérifie que le user possède le wallet source
        user_wallet = await db.get_user_wallet(user_id)
        if not user_wallet or user_wallet["id"] != payload.source_wallet_id:
            return IntercampusSendResponse(
                success=False, status="unauthorized",
                message="You don't own the source wallet",
            )

        # 2. Vérifie le solde
        if float(user_wallet["balance"]) < payload.amount:
            return IntercampusSendResponse(
                success=False, status="failed",
                message=f"Insufficient balance: {user_wallet['balance']} < {payload.amount}",
            )

        # 3. Débite le wallet local
        try:
            new_balance = await db.debit_user_wallet(user_id, payload.amount)
        except DatabaseError as e:
            return IntercampusSendResponse(
                success=False, status="failed",
                message=f"Debit failed: {e.message}",
            )

        # 4. Appelle l'API du campus distant
        tx_id = str(uuid4())
        destination_tx_id = None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{payload.destination_campus_api_url}/intercampus-receive",
                    json={
                        "transaction_id": tx_id,
                        "source_wallet_id": payload.source_wallet_id,
                        "destination_wallet_id": payload.destination_wallet_id,
                        "destination_user_id": payload.destination_user_id,
                        "amount": payload.amount,
                        "currency": payload.currency,
                        "initiator_user_id": user_id,
                        "api_key": payload.destination_api_key,
                        "source_campus_id": "lyon",
                        "enriched_data": payload.enriched_data,
                    },
                )
                remote_data = resp.json()

                if resp.status_code != 200 or not remote_data.get("success"):
                    # Rollback : recrédite le wallet local
                    await db.credit_user_wallet(user_id, payload.amount)
                    return IntercampusSendResponse(
                        success=False, status="failed",
                        message=f"Remote campus rejected: {remote_data.get('message', 'unknown error')}",
                    )

                destination_tx_id = remote_data.get("transaction_id")

        except httpx.TimeoutException:
            # Rollback
            await db.credit_user_wallet(user_id, payload.amount)
            return IntercampusSendResponse(
                success=False, status="failed",
                message="Remote campus timeout — transfer rolled back",
            )
        except Exception as e:
            # Rollback
            await db.credit_user_wallet(user_id, payload.amount)
            return IntercampusSendResponse(
                success=False, status="error",
                message=f"Remote campus error: {str(e)} — transfer rolled back",
            )

        # 5. Enregistre la transaction locale
        try:
            await db.create_transaction({
                "id": tx_id,
                "user_id": user_id,
                "wallet_id": payload.source_wallet_id,
                "amount": payload.amount,
                "currency": payload.currency,
                "country": "FR",
                "transaction_type": "transfer",
                "direction": "outgoing",
                "status": "approved",
                "request_id": request_id,
                "provider": "intercampus",
                "destination_wallet_id": payload.destination_wallet_id,
                "external_tx_id": destination_tx_id,
                "type": "intercampus_send",
            })
        except Exception as e:
            logger.warning(f"Failed to record outgoing intercampus tx: {e}")

        # 6. Enregistre dans external_transfers
        try:
            await db.record_external_transfer({
                "from_wallet_id": payload.source_wallet_id,
                "to_email": payload.destination_user_id or "campus_wallet",
                "to_campus": "external",
                "amount": payload.amount,
                "currency": payload.currency,
                "status": "completed",
                "request_id": request_id,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.warning(f"Failed to record external transfer: {e}")

        return IntercampusSendResponse(
            success=True,
            status="completed",
            message="Intercampus transfer completed",
            transaction_id=tx_id,
            destination_tx_id=destination_tx_id,
            new_balance=new_balance,
        )


# =============================================================================
# MOCK ENDPOINT (Development Only)
# =============================================================================

if ENVIRONMENT == "development":

    @app.post(
        "/v1/mock-payment",
        tags=["Development"],
        summary="Simule un paiement (dev only)",
    )
    async def mock_payment(
        amount: float = 100.0,
        country: str = "FR",
        simulate_fraud: bool = False,
    ) -> dict[str, Any]:
        """
        Endpoint de test pour simuler des paiements.

        Disponible uniquement en environnement de développement.
        """
        from uuid import uuid4

        mock_request = MLAnalysisRequest(
            transaction_id=uuid4(),
            user_id=uuid4(),
            amount=amount if not simulate_fraud else 1000.0,  # Déclenche R1
            currency="EPC",
            country=country,
            merchant_id="mock_merchant",
            timestamp=datetime.now(timezone.utc),
        )

        return {
            "mock": True,
            "transaction_id": str(mock_request.transaction_id),
            "amount": mock_request.amount,
            "country": mock_request.country,
            "note": "Use POST /v1/ml with this transaction_id for analysis",
        }


# =============================================================================
# ROOT
# =============================================================================


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """Endpoint racine."""
    return {
        "service": "Smart Wallet IA API",
        "version": API_VERSION,
        "docs": "/docs" if ENVIRONMENT != "production" else "disabled",
    }
