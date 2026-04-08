# ==============================================================================
# Surphy Wallet — FastAPI + ML Engine
# Multi-stage build optimise pour la taille et la securite
# ==============================================================================

# --- Stage 1: Dependencies ---
FROM python:3.10-slim AS deps

WORKDIR /app

# Dependances systeme pour les packages Python natifs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./

# Installer les dependances de production uniquement
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir . \
    && pip install --no-cache-dir joblib numpy scikit-learn xgboost shap

# --- Stage 2: Runtime ---
FROM python:3.10-slim AS runtime

WORKDIR /app

# Copier les packages Python installes depuis le stage deps
COPY --from=deps /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copier le code source
COPY api/ ./api/
COPY ml/ ./ml/
COPY shared/ ./shared/
COPY ml_model/ ./ml_model/

# Creer un utilisateur non-root pour la securite
RUN useradd --create-home appuser
USER appuser

# Variables d'environnement par defaut
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production \
    LOG_LEVEL=INFO \
    PORT=8000

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Lancer avec uvicorn en production (pas de --reload)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
