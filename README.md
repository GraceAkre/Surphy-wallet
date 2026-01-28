# Smart Wallet IA

Plateforme de portefeuille intelligent avec détection de fraude en temps réel.

## Stack

- **API:** FastAPI (Python 3.13)
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **ML Engine:** Règles déterministes R1-R9

## Quick Start

```bash
# Installer les dépendances
pip install -e ".[dev]"

# Lancer l'API
uvicorn api.main:app --reload --port 8000
```

## Documentation

- API Docs: http://localhost:8000/docs
