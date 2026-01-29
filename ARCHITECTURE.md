# Architecture Technique - Surphy Wallet

> Document d'architecture technique pour le portefeuille intelligent avec détection de fraude IA. Version ultra condensée visible dans le README

---

## Vue d'Ensemble

```mermaid
graph TB
    subgraph "Client Layer"
        APP[📱 Mobile App<br/>React Native + Expo]
    end

    subgraph "Backend Layer"
        API[⚡ FastAPI<br/>Python 3.13]
        ML[🧠 ML Engine<br/>Règles R1-R9]
    end

    subgraph "Data Layer"
        DB[(🐘 PostgreSQL<br/>Supabase)]
        AUTH[🔐 Supabase Auth<br/>Magic Link OTP]
    end

    APP -->|HTTPS| API
    APP -->|Auth + RLS| DB
    APP -->|OTP Email| AUTH
    API -->|Async| DB
    API --> ML
    AUTH --> DB
```

---

## Stack Technique

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| **Mobile** | React Native + Expo | SDK 52 | Application iOS/Android |
| **Styling** | NativeWind + Tailwind | v2 + 3.3.2 | Design system |
| **API** | FastAPI | Latest | Endpoints REST |
| **Runtime** | Python | 3.13 | Backend processing |
| **Database** | PostgreSQL (Supabase) | 15+ | Stockage données |
| **Auth** | Supabase Auth | Latest | Authentification OTP |
| **Security** | Row Level Security | - | Isolation des données |

---

## Architecture Mobile

```mermaid
graph TB
    subgraph "React Native App"
        subgraph "Screens (12)"
            ONB[Onboarding]
            LOGIN[EmailLogin]
            OTP[OTPVerification]
            HOME[Home]
            HIST[History]
            PROFILE[Profile]
            CARD[CardVirtual]
            PAY[CardPayment]
            VERIF[Verification]
            INTER[Interoperability]
            RISK[RiskGauge]
            EXPLIC[ExplicabilityModal]
        end

        subgraph "Components (18)"
            UI[UI Components<br/>Button, Card, Input,<br/>Badge, Avatar, etc.]
            LAYOUT[Layout<br/>ScreenContainer,<br/>Header, Section]
            TX[Transaction<br/>TransactionItem,<br/>TransactionList]
            CARDS[Card<br/>VirtualCard,<br/>CardActionGrid]
            FEEDBACK[Feedback<br/>AlertBanner,<br/>EmptyState]
        end

        subgraph "Core"
            HOOKS[Hooks<br/>useHaptics]
            UTILS[Utils<br/>shadows, formatters,<br/>transactionHelpers]
            LIB[Lib<br/>supabase, types, api]
        end
    end

    ONB --> LOGIN --> OTP --> HOME
    HOME --> HIST
    HOME --> PROFILE
    HOME --> CARD --> PAY
    HOME --> RISK --> EXPLIC
```

### Structure des Fichiers Mobile

```
mobile/
├── src/
│   ├── App.tsx                    # Point d'entrée + Navigation
│   ├── screens/                   # 12 écrans
│   │   ├── OnboardingScreen.tsx   # Écran d'accueil
│   │   ├── EmailLoginScreen.tsx   # Saisie email
│   │   ├── OTPVerificationScreen.tsx
│   │   ├── HomeScreen.tsx         # Dashboard principal
│   │   ├── HistoryScreen.tsx      # Historique transactions
│   │   ├── ProfileScreen.tsx      # Profil utilisateur
│   │   ├── CardVirtualScreen.tsx  # Carte virtuelle
│   │   ├── CardPaymentScreen.tsx  # Paiement
│   │   ├── VerificationScreen.tsx # KYC
│   │   ├── InteroperabilityScreen.tsx
│   │   ├── RiskGaugeScreen.tsx    # Jauge de risque
│   │   └── ExplicabilityModal.tsx # Détails décision IA
│   ├── components/
│   │   ├── ui/                    # 8 composants UI
│   │   ├── layout/                # 3 composants layout
│   │   ├── transaction/           # 2 composants transaction
│   │   ├── card/                  # 2 composants carte
│   │   └── feedback/              # 3 composants feedback
│   ├── hooks/
│   │   └── useHaptics.ts          # Retour haptique
│   ├── utils/
│   │   ├── shadows.ts             # Ombres iOS/Android
│   │   ├── formatters.ts          # Formatage données
│   │   └── transactionHelpers.ts  # Helpers transactions
│   └── lib/
│       ├── supabase.ts            # Client Supabase
│       ├── types.ts               # Types TypeScript
│       └── api.ts                 # Appels API
├── tailwind.config.js             # Design system
└── babel.config.js                # Config NativeWind
```

---

## Architecture Backend

```mermaid
graph LR
    subgraph "FastAPI Application"
        MW[Middleware<br/>Request ID<br/>CORS<br/>Logging]
        ROUTES[Routes]
        HANDLERS[Error Handlers]
    end

    subgraph "Endpoints"
        HEALTH[GET /health]
        METRICS[GET /metrics]
        ML_EP[POST /v1/ml]
        MOCK[POST /v1/mock-payment<br/>dev only]
    end

    subgraph "ML Engine"
        R1[R1: AMOUNT_HIGH]
        R2[R2: TIME_SUSPICIOUS]
        R3[R3: LOCATION_CHANGE]
        R4[R4: VELOCITY_HIGH]
        R5[R5: IP_GEO_MISMATCH]
        R6[R6: KYC_EXPIRED]
        R7[R7: DUPLICATE_REQUEST]
        R8[R8: CAMPUS_NOT_ALLOWED]
        R9[R9: SCA_THRESHOLD]
    end

    MW --> ROUTES
    ROUTES --> HEALTH
    ROUTES --> METRICS
    ROUTES --> ML_EP
    ROUTES --> MOCK
    ML_EP --> R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8 & R9
```

### Structure des Fichiers Backend

```
├── api/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, middlewares, routes
│   └── database.py          # Client Supabase async
├── ml/
│   ├── __init__.py
│   └── engine.py            # Moteur de détection R1-R9
├── shared/
│   ├── __init__.py
│   └── models.py            # Schémas Pydantic
└── supabase/
    └── schema.sql           # Schéma complet PostgreSQL
```

---

## Moteur de Détection de Fraude

```mermaid
flowchart TD
    TX[Transaction Entrante] --> ANALYZE[Analyze]

    subgraph "Règles P0 - Bloquantes"
        R1[R1: Montant > 500€<br/>+30 pts]
        R4[R4: ≥3 tx/5min<br/>+35 pts]
        R5[R5: IP ≠ Géoloc >1000km<br/>+40 pts]
        R7[R7: Doublon <2min<br/>+50 pts]
        R9[R9: Cumul >150€/jour<br/>+35 pts]
    end

    subgraph "Règles P1 - Audit"
        R2[R2: Heure 00h-06h<br/>+20 pts]
        R3[R3: Changement pays<br/>+25 pts]
        R6[R6: KYC expiré<br/>+15 pts]
        R8[R8: Campus non autorisé<br/>+20 pts]
    end

    ANALYZE --> R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8 & R9

    R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8 & R9 --> SCORE[Calcul Score<br/>0-100]

    SCORE --> DECISION{Score?}
    DECISION -->|0-29| APPROVE[✅ APPROVE]
    DECISION -->|30-69| REVIEW[⚠️ REVIEW]
    DECISION -->|70-100| BLOCK[🚫 BLOCK]
```

### Tableau des Règles

| ID | Code | Priorité | Seuil | Poids | Description |
|----|------|----------|-------|-------|-------------|
| R1 | `AMOUNT_HIGH` | P0 | > 500€ | +30 | Montant élevé |
| R2 | `TIME_SUSPICIOUS` | P1 | 00h-06h | +20 | Heure nocturne |
| R3 | `LOCATION_CHANGE` | P1 | Pays ≠ | +25 | Changement de pays |
| R4 | `VELOCITY_HIGH` | P0 | ≥ 3/5min | +35 | Vélocité élevée |
| R5 | `IP_GEO_MISMATCH` | P0 | > 1000km | +40 | IP/Géoloc incohérent |
| R6 | `KYC_EXPIRED` | P1 | Expiré | +15 | KYC expiré |
| R7 | `DUPLICATE_REQUEST` | P0 | < 2min | +50 | Requête dupliquée |
| R8 | `CAMPUS_NOT_ALLOWED` | P1 | Not in list | +20 | Campus non autorisé |
| R9 | `SCA_THRESHOLD` | P0 | > 150€/jour | +35 | Seuil SCA PSD2 |

---

## Schéma Base de Données

```mermaid
erDiagram
    users ||--o{ wallets : "possède"
    users ||--o{ transactions : "effectue"
    users ||--o{ labels : "crée (analyste)"
    wallets ||--o{ transactions : "source"
    wallets ||--o{ external_transfers : "envoie"
    transactions ||--o{ labels : "reçoit"
    peers ||--o{ external_transfers : "destination"

    users {
        uuid id PK
        varchar email UK
        varchar full_name
        varchar campus "R8"
        timestamp kyc_expires_at "R6"
        timestamp kyc_verified_at
        timestamp created_at
        timestamp updated_at
    }

    wallets {
        uuid id PK
        uuid user_id FK
        varchar currency
        numeric balance
        wallet_status status
        timestamp created_at
        timestamp updated_at
    }

    transactions {
        uuid id PK
        uuid user_id FK
        uuid wallet_id FK
        uuid request_id UK "R7 idempotence"
        varchar provider
        varchar merchant_id "R7"
        numeric amount "R1 R9"
        varchar currency
        varchar country "R3"
        inet ip_address "R5"
        numeric ip_latitude "R5"
        numeric ip_longitude "R5"
        numeric declared_latitude "R5"
        numeric declared_longitude "R5"
        transaction_type type
        transaction_direction direction
        transaction_status status
        numeric score_ml
        ml_decision decision
        jsonb reasons_json
        jsonb reasons_detail
        timestamp created_at "R2 R4 R9"
        timestamp processed_at
    }

    labels {
        uuid id PK
        uuid transaction_id FK
        uuid analyst_id FK
        label_type type
        varchar value
        confidence_level confidence
        text notes
        timestamp created_at
    }

    peers {
        uuid id PK
        varchar campus_name UK
        varchar base_url
        varchar jwks_url
        text public_key
        peer_status status
        text[] allowed_domains
        timestamp created_at
    }

    external_transfers {
        uuid id PK
        uuid from_wallet_id FK
        varchar to_email
        varchar to_campus
        numeric amount
        varchar status
        uuid request_id UK
        timestamp created_at
    }

    audit_log {
        uuid id PK
        uuid request_id
        uuid user_id FK
        varchar action
        varchar entity_type
        uuid entity_id
        jsonb old_value
        jsonb new_value
        inet ip_address
        timestamp created_at
    }
```

### Fonctions RPC (Performance)

| Fonction | Règle | Description |
|----------|-------|-------------|
| `count_recent_transactions(user_id, minutes)` | R4 | Compte les tx récentes |
| `sum_daily_transactions(user_id)` | R9 | Cumul journalier |
| `find_duplicate_transaction(...)` | R7 | Détecte les doublons |
| `get_last_transaction_country(user_id)` | R3 | Dernier pays |

---

## Flux d'Authentification

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant APP as Mobile App
    participant AUTH as Supabase Auth
    participant DB as PostgreSQL

    U->>APP: Saisit email
    APP->>AUTH: signInWithOtp(email)
    AUTH->>U: Envoie Magic Link/OTP
    U->>APP: Saisit OTP
    APP->>AUTH: verifyOtp(email, token)
    AUTH-->>APP: Session JWT
    APP->>DB: Requêtes avec RLS
    DB-->>APP: Données filtrées par user_id
```

---

## Flux de Transaction

```mermaid
sequenceDiagram
    participant APP as Mobile App
    participant API as FastAPI
    participant ML as ML Engine
    participant DB as Supabase

    APP->>API: POST /v1/ml<br/>{transaction_id, amount, ...}

    Note over API: Middleware ajoute X-Request-ID

    API->>DB: Fetch user context
    DB-->>API: user, last_tx, recent_count, daily_total

    API->>ML: analyze(request, context)

    Note over ML: Évalue R1-R9

    ML-->>API: {score, decision, reasons}

    API-->>APP: MLAnalysisResponse<br/>{score: 45, decision: "review", reasons: [...]}

    alt decision == "approve"
        APP->>DB: Insert transaction (status: approved)
    else decision == "review"
        APP->>APP: Affiche modal de vérification
    else decision == "block"
        APP->>APP: Affiche erreur + raisons
    end
```

---

## Sécurité

### Row Level Security (RLS)

```mermaid
flowchart LR
    subgraph "Utilisateur Standard"
        U1[User A] -->|auth.uid() = id| U1_DATA[Ses données uniquement]
    end

    subgraph "Analyste @epitech.digital"
        ANALYST[Analyste] -->|LIKE '%@epitech.digital'| ALL_TX[Toutes les transactions]
        ANALYST -->|Créer/Voir| LABELS[Labels]
    end

    subgraph "Admin @admin.epitech.eu"
        ADMIN[Admin] -->|LIKE '%@admin.epitech.eu'| PEERS[Gestion Peers]
        ADMIN --> AUDIT[Audit Logs]
    end
```

### Politiques RLS par Table

| Table | Utilisateur | Analyste | Admin |
|-------|-------------|----------|-------|
| `users` | Own profile | - | - |
| `wallets` | Own wallets | - | - |
| `transactions` | Own tx | All tx | All |
| `labels` | - | Create/View | All |
| `peers` | View active | View active | Full |
| `audit_log` | - | - | View |

---

## Performance

### Objectifs

| Métrique | Cible |
|----------|-------|
| Latence ML p95 | < 100ms |
| Latence API p95 | < 300ms |
| Disponibilité | > 99.5% |

### Optimisations

- **Indexes PostgreSQL** optimisés pour chaque règle
- **Fonctions RPC** côté serveur (évite N+1)
- **Connection pooling** Supabase
- **Calcul Haversine** optimisé (R5)

### Index Critiques

```sql
-- R4: Vélocité
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);

-- R7: Doublons
CREATE INDEX idx_transactions_duplicate_check ON transactions(user_id, amount, merchant_id, created_at DESC);

-- R9: Cumul journalier
CREATE INDEX idx_transactions_daily_sum ON transactions(user_id, created_at)
    WHERE status IN ('approved', 'pending');
```

---

## Environnements

```mermaid
graph LR
    subgraph "Development"
        DEV_APP[Expo Go] --> DEV_API[localhost:8000]
        DEV_API --> DEV_DB[Supabase Cloud]
    end

    subgraph "Production"
        PROD_APP[App Store / Play Store] --> PROD_API[API Cloud]
        PROD_API --> PROD_DB[Supabase Cloud]
    end
```

### Variables d'Environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `SUPABASE_URL` | URL Supabase | ✅ |
| `SUPABASE_ANON_KEY` | Clé publique | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin (API only) | ✅ (API) |
| `LOG_LEVEL` | Niveau de log | ❌ (INFO) |
| `ENVIRONMENT` | dev/prod | ❌ (development) |

---

## Commandes

### Mobile

```bash
cd mobile
npm install
npx expo start          # Expo Go
npx expo run:ios        # Build iOS
npx expo run:android    # Build Android
```

### Backend

```bash
pip install -e ".[dev]"
uvicorn api.main:app --reload --port 8000
```

### Tests

```bash
pytest tests/ -v
mypy api/ ml/ shared/
ruff format .
```

---

**Dernière mise à jour:** Janvier 2026
