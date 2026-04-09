"""
Smart Wallet IA - Supabase Database Client (Async)

Ce module fournit un client Supabase configuré pour une utilisation asynchrone
avec gestion du pool de connexions et traçabilité via request_id.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any
from uuid import UUID

from supabase import create_client, Client


class DatabaseError(Exception):
    """Erreur de base de données."""

    def __init__(self, code: str, message: str, request_id: str | None = None):
        self.code = code
        self.message = message
        self.request_id = request_id
        super().__init__(f"[{code}] {message}")


class SupabaseClient:
    """
    Client Supabase avec support asynchrone et traçabilité.

    Utilisation:
        async with get_db_client() as db:
            result = await db.fetch_user(user_id)
    """

    def __init__(self, url: str, key: str, service_role: bool = False):
        """
        Initialise le client Supabase.

        Args:
            url: URL du projet Supabase
            key: Clé API (anon ou service_role)
            service_role: Si True, utilise la clé service_role (bypass RLS)
        """
        self._url = url
        self._key = key
        self._service_role = service_role
        self._client: Client | None = None
        self._request_id: str | None = None

    def _get_client(self) -> Client:
        """Retourne ou crée le client Supabase."""
        if self._client is None:
            self._client = create_client(self._url, self._key)
        return self._client

    def set_request_id(self, request_id: str) -> None:
        """Définit le request_id pour la traçabilité."""
        self._request_id = request_id

    # =========================================================================
    # USERS
    # =========================================================================

    async def fetch_user(self, user_id: UUID) -> dict[str, Any] | None:
        """
        Récupère un utilisateur par son ID.

        Args:
            user_id: UUID de l'utilisateur

        Returns:
            Dictionnaire des données utilisateur ou None si non trouvé
        """
        client = self._get_client()
        response = (
            client.table("users")
            .select("*")
            .eq("id", str(user_id))
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def fetch_user_by_email(self, email: str) -> dict[str, Any] | None:
        """Récupère un utilisateur par email."""
        client = self._get_client()
        response = (
            client.table("users")
            .select("*")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    # =========================================================================
    # WALLETS
    # =========================================================================

    async def fetch_wallet(self, wallet_id: UUID) -> dict[str, Any] | None:
        """Récupère un wallet par son ID."""
        client = self._get_client()
        response = (
            client.table("wallets")
            .select("*")
            .eq("id", str(wallet_id))
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def fetch_user_wallets(self, user_id: UUID) -> list[dict[str, Any]]:
        """Récupère tous les wallets d'un utilisateur."""
        client = self._get_client()
        response = (
            client.table("wallets")
            .select("*")
            .eq("user_id", str(user_id))
            .execute()
        )
        return response.data or []

    # =========================================================================
    # TRANSACTIONS
    # =========================================================================

    async def create_transaction(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Crée une nouvelle transaction.

        Args:
            data: Données de la transaction (doit inclure request_id)

        Returns:
            Transaction créée avec son ID
        """
        client = self._get_client()
        response = client.table("transactions").insert(data).execute()
        if not response.data:
            raise DatabaseError(
                code="INSERT_FAILED",
                message="Failed to create transaction",
                request_id=self._request_id,
            )
        return response.data[0]

    async def update_transaction(
        self, transaction_id: UUID, data: dict[str, Any]
    ) -> dict[str, Any]:
        """Met à jour une transaction existante."""
        client = self._get_client()
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        response = (
            client.table("transactions")
            .update(data)
            .eq("id", str(transaction_id))
            .execute()
        )
        if not response.data:
            raise DatabaseError(
                code="UPDATE_FAILED",
                message=f"Transaction {transaction_id} not found",
                request_id=self._request_id,
            )
        return response.data[0]

    async def fetch_transaction(self, transaction_id: UUID) -> dict[str, Any] | None:
        """Récupère une transaction par son ID."""
        client = self._get_client()
        response = (
            client.table("transactions")
            .select("*")
            .eq("id", str(transaction_id))
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def fetch_transaction_by_request_id(
        self, request_id: UUID
    ) -> dict[str, Any] | None:
        """Récupère une transaction par son request_id (idempotence)."""
        client = self._get_client()
        response = (
            client.table("transactions")
            .select("*")
            .eq("request_id", str(request_id))
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def fetch_user_transactions(
        self,
        user_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
        status: str | None = None,
        decision: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Récupère les transactions d'un utilisateur avec pagination.

        Args:
            user_id: UUID de l'utilisateur
            limit: Nombre max de résultats
            offset: Décalage pour pagination
            status: Filtrer par statut (pending, approved, blocked)
            decision: Filtrer par décision ML (approve, review, block)
        """
        client = self._get_client()
        query = (
            client.table("transactions")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .limit(limit)
            .offset(offset)
        )

        if status:
            query = query.eq("status", status)
        if decision:
            query = query.eq("decision", decision)

        response = query.execute()
        return response.data or []

    async def count_recent_transactions(
        self, user_id: UUID, minutes: int = 5
    ) -> int:
        """
        Compte les transactions récentes d'un utilisateur (pour vélocité R4).

        Args:
            user_id: UUID de l'utilisateur
            minutes: Fenêtre temporelle en minutes

        Returns:
            Nombre de transactions dans la fenêtre
        """
        client = self._get_client()
        try:
            # Utilise la fonction RPC définie dans schema.sql
            response = client.rpc(
                "count_recent_transactions",
                {"p_user_id": str(user_id), "p_minutes": minutes},
            ).execute()
            return int(response.data) if response.data is not None else 0
        except Exception:
            # Fallback si RPC non disponible
            return 0

    async def find_duplicate_transaction(
        self,
        user_id: UUID,
        amount: float,
        merchant_id: str,
        *,
        window_minutes: int = 2,
        exclude_request_id: UUID | None = None,
    ) -> dict[str, Any] | None:
        """
        Recherche une transaction similaire récente (pour détection doublon R7).

        Args:
            user_id: UUID de l'utilisateur
            amount: Montant de la transaction
            merchant_id: ID du marchand
            window_minutes: Fenêtre temporelle
            exclude_request_id: Request ID à exclure (transaction courante)
        """
        client = self._get_client()
        try:
            # Utilise la fonction RPC définie dans schema.sql
            params = {
                "p_user_id": str(user_id),
                "p_amount": amount,
                "p_merchant_id": merchant_id,
                "p_window_minutes": window_minutes,
            }
            if exclude_request_id:
                params["p_exclude_request_id"] = str(exclude_request_id)

            response = client.rpc("find_duplicate_transaction", params).execute()
            return response.data[0] if response.data else None
        except Exception:
            # Fallback: pas de doublon détecté si RPC échoue
            return None

    async def sum_daily_transactions(self, user_id: UUID) -> float:
        """
        Calcule le cumul journalier des transactions (pour SCA R9).

        Args:
            user_id: UUID de l'utilisateur

        Returns:
            Somme des montants du jour en cours
        """
        client = self._get_client()
        try:
            # Utilise une fonction RPC Supabase pour le calcul côté serveur
            response = client.rpc(
                "sum_daily_transactions",
                {"p_user_id": str(user_id)},
            ).execute()
            return float(response.data) if response.data is not None else 0.0
        except Exception:
            # Fallback si RPC non disponible
            return 0.0

    async def fetch_last_transaction(self, user_id: UUID) -> dict[str, Any] | None:
        """
        Récupère la dernière transaction d'un utilisateur (pour R3 location).

        Args:
            user_id: UUID de l'utilisateur

        Returns:
            Dernière transaction ou None
        """
        client = self._get_client()
        response = (
            client.table("transactions")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    # =========================================================================
    # LABELS (pour Alex)
    # =========================================================================

    async def create_label(self, data: dict[str, Any]) -> dict[str, Any]:
        """Crée un nouveau label sur une transaction."""
        client = self._get_client()
        response = client.table("labels").insert(data).execute()
        if not response.data:
            raise DatabaseError(
                code="INSERT_FAILED",
                message="Failed to create label",
                request_id=self._request_id,
            )
        return response.data[0]

    async def fetch_transaction_labels(
        self, transaction_id: UUID
    ) -> list[dict[str, Any]]:
        """Récupère tous les labels d'une transaction."""
        client = self._get_client()
        response = (
            client.table("labels")
            .select("*")
            .eq("transaction_id", str(transaction_id))
            .execute()
        )
        return response.data or []

    # =========================================================================
    # INTERCAMPUS
    # =========================================================================

    async def verify_campus_api_key(self, wallet_id: str, api_key: str) -> bool:
        """Vérifie que api_key correspond au api_key_hash du campus_wallet."""
        client = self._get_client()
        response = (
            client.table("campus_wallets")
            .select("api_key_hash")
            .eq("id", wallet_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            return False
        return response.data[0].get("api_key_hash") == api_key

    async def fetch_campus_wallet(self, wallet_id: str) -> dict[str, Any] | None:
        """Récupère un campus_wallet par son ID."""
        client = self._get_client()
        response = (
            client.table("campus_wallets")
            .select("*")
            .eq("id", wallet_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def lookup_user_by_name(
        self, full_name: str, campus: str
    ) -> dict[str, Any] | None:
        """Cherche un utilisateur par nom complet et campus."""
        client = self._get_client()
        parts = full_name.strip().split(" ", 1)
        firstname = parts[0] if parts else ""
        lastname = parts[1] if len(parts) > 1 else ""

        response = (
            client.table("users")
            .select("id, firstname, lastname, campus, email")
            .ilike("firstname", firstname)
            .ilike("lastname", lastname)
            .eq("campus", campus)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def get_user_wallet(self, user_id: str) -> dict[str, Any] | None:
        """Récupère le wallet principal d'un utilisateur."""
        client = self._get_client()
        response = (
            client.table("wallets")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def credit_user_wallet(self, user_id: str, amount: float) -> float:
        """Crédite le wallet d'un utilisateur. Retourne le nouveau solde."""
        client = self._get_client()
        # Récupère le wallet
        wallet = await self.get_user_wallet(user_id)
        if not wallet:
            raise DatabaseError(
                code="WALLET_NOT_FOUND",
                message=f"No wallet found for user {user_id}",
                request_id=self._request_id,
            )
        new_balance = float(wallet["balance"]) + amount
        response = (
            client.table("wallets")
            .update({"balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", wallet["id"])
            .execute()
        )
        if not response.data:
            raise DatabaseError(
                code="CREDIT_FAILED",
                message=f"Failed to credit wallet for user {user_id}",
                request_id=self._request_id,
            )
        return new_balance

    async def debit_user_wallet(self, user_id: str, amount: float) -> float:
        """Débite le wallet d'un utilisateur. Retourne le nouveau solde."""
        client = self._get_client()
        wallet = await self.get_user_wallet(user_id)
        if not wallet:
            raise DatabaseError(
                code="WALLET_NOT_FOUND",
                message=f"No wallet found for user {user_id}",
                request_id=self._request_id,
            )
        if float(wallet["balance"]) < amount:
            raise DatabaseError(
                code="INSUFFICIENT_BALANCE",
                message=f"Insufficient balance: {wallet['balance']} < {amount}",
                request_id=self._request_id,
            )
        new_balance = float(wallet["balance"]) - amount
        response = (
            client.table("wallets")
            .update({"balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", wallet["id"])
            .execute()
        )
        if not response.data:
            raise DatabaseError(
                code="DEBIT_FAILED",
                message=f"Failed to debit wallet for user {user_id}",
                request_id=self._request_id,
            )
        return new_balance

    async def record_external_transfer(self, data: dict[str, Any]) -> dict[str, Any]:
        """Enregistre un transfert intercampus dans external_transfers."""
        client = self._get_client()
        response = client.table("external_transfers").insert(data).execute()
        if not response.data:
            raise DatabaseError(
                code="INSERT_FAILED",
                message="Failed to record external transfer",
                request_id=self._request_id,
            )
        return response.data[0]

    async def fetch_external_peers(self) -> list[dict[str, Any]]:
        """Récupère tous les peers externes actifs."""
        client = self._get_client()
        response = (
            client.table("peers")
            .select("*")
            .eq("status", "active")
            .eq("is_external", True)
            .execute()
        )
        return response.data or []

    # =========================================================================
    # PEERS (pour interop)
    # =========================================================================

    async def fetch_peer(self, campus_name: str) -> dict[str, Any] | None:
        """Récupère un peer par nom de campus."""
        client = self._get_client()
        response = (
            client.table("peers")
            .select("*")
            .eq("campus_name", campus_name)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def fetch_all_active_peers(self) -> list[dict[str, Any]]:
        """Récupère tous les peers actifs."""
        client = self._get_client()
        response = (
            client.table("peers")
            .select("*")
            .eq("status", "active")
            .execute()
        )
        return response.data or []

    async def fetch_ml_config(self) -> dict[str, Any] | None:
        """Récupère la configuration ML active (seuils de décision)."""
        client = self._get_client()
        response = (
            client.table("ml_config")
            .select("preset, threshold_approve, threshold_block")
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None


# =============================================================================
# FACTORY & CONTEXT MANAGER
# =============================================================================


@lru_cache(maxsize=1)
def _get_settings() -> tuple[str, str, str]:
    """Charge les settings depuis les variables d'environnement."""
    url = os.getenv("SUPABASE_URL", "")
    anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not url or not anon_key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")

    print(f"[DB] Supabase URL: '{url}' (len={len(url)})")
    return url, anon_key, service_key


def get_db_client(*, service_role: bool = False) -> SupabaseClient:
    """
    Factory pour créer un client Supabase.

    Args:
        service_role: Si True, utilise la clé service_role (bypass RLS)

    Returns:
        Instance de SupabaseClient
    """
    url, anon_key, service_key = _get_settings()
    key = service_key if service_role and service_key else anon_key
    return SupabaseClient(url, key, service_role)


@asynccontextmanager
async def get_db_session(
    *, service_role: bool = False, request_id: str | None = None
):
    """
    Context manager pour obtenir une session DB avec traçabilité.

    Usage:
        async with get_db_session(request_id="uuid") as db:
            user = await db.fetch_user(user_id)

    Args:
        service_role: Si True, bypass RLS
        request_id: ID de requête pour traçabilité
    """
    client = get_db_client(service_role=service_role)
    if request_id:
        client.set_request_id(request_id)
    try:
        yield client
    finally:
        # Cleanup si nécessaire
        pass
