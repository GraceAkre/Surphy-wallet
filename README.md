# Surphy Wallet

> Portefeuille intelligent pour étudiants avec détection de fraude IA en temps réel.

## Aperçu

Surphy Wallet analyse chaque transaction via 9 règles de détection (R1-R9) et retourne un score de risque (0-100) avec une décision explicable.

| Score | Décision |
|-------|----------|
| 0-29 | APPROVE |
| 30-69 | REVIEW |
| 70-100 | BLOCK |

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Mobile | React Native + Expo + NativeWind |
| API | FastAPI (Python 3.13) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| ML Engine | Règles déterministes R1-R9 |

## Installation

### Prérequis

- Node.js 18+
- [Expo Go](https://expo.dev/client) sur ton téléphone (iOS/Android)

### 1. Cloner et installer

```bash
git clone https://github.com/ton-username/Surphy-wallet.git
cd Surphy-wallet/mobile
npm install
```

### 2. Configurer l'environnement

Crée un fichier `.env.local` à la racine du projet (`Surphy-wallet/.env.local`) :

```bash
SUPABASE_URL=https://kzwkauprdpkrrwotwost.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6d2thdXByZHBrcnJ3b3R3b3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODU2MjAsImV4cCI6MjA4NDY2MTYyMH0.fOxeKaxgHYHdnGUxN2alWNqIeIE0TRHp9PmbEE_jJ3g
```

### 3. Lancer l'application

```bash
npx expo start
```

- Scanne le QR code avec Expo Go (iOS/Android)
- Ou appuie sur `i` pour le simulateur iOS / `a` pour Android

## Structure du Projet

```
Surphy-wallet/
├── mobile/                 # Application React Native
│   ├── src/
│   │   ├── components/     # Composants UI réutilisables
│   │   ├── screens/        # Écrans de l'application
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utilitaires
│   ├── tailwind.config.js  # Design system
│   └── package.json
├── api/                    # API FastAPI
│   ├── main.py
│   └── database.py
├── ml/                     # Moteur de détection de fraude
│   └── engine.py           # Règles R1-R9
├── shared/                 # Code partagé
│   └── models.py           # Schémas Pydantic
└── supabase/
    └── schema.sql          # Schéma de la base de données
```

## Règles de Détection

| ID | Code | Description | Seuil | Poids |
|----|------|-------------|-------|-------|
| R1 | AMOUNT_HIGH | Montant élevé | > 2500 EPC | +30 |
| R2 | TIME_SUSPICIOUS | Heure suspecte | 00h-06h | +20 |
| R3 | LOCATION_CHANGE | Changement de pays | Pays ≠ | +25 |
| R4 | VELOCITY_HIGH | Vélocité élevée | ≥ 3 tx/5min | +35 |
| R5 | IP_GEO_MISMATCH | IP/Géo incohérent | > 1000km | +40 |
| R6 | KYC_EXPIRED | KYC expiré | Expiré | +15 |
| R7 | DUPLICATE_REQUEST | Requête dupliquée | < 2min | +50 |
| R8 | CAMPUS_NOT_ALLOWED | Campus non autorisé | Not in list | +20 |
| R9 | SCA_THRESHOLD | Seuil SCA | > 750 EPC/jour | +35 |

## Tester la démo

### Sans API locale (le plus simple)

L'API ML est hébergée sur Render. Pour tester l'app sans lancer de serveur local :

```bash
git clone https://github.com/Surphy-wallet/Surphy-wallet.git
cd Surphy-wallet/mobile
npm install
EXPO_PUBLIC_API_URL=https://surphy-wallet-api.onrender.com npx expo start --tunnel
```

Scanne le QR code avec **Expo Go** (iOS/Android). C'est tout.

> **Note :** L'instance Render gratuite s'endort après 15 min d'inactivité. La première transaction ML peut prendre ~30s, les suivantes sont instantanées.

### Avec API locale (développement)

Si tu veux modifier le code ML et tester en local :

```bash
# Terminal 1 — API FastAPI
pip install -e ".[dev]"
uvicorn api.main:app --reload --port 8000

# Terminal 2 — App mobile
cd mobile
npm install
npx expo start --tunnel
```

L'app pointe automatiquement vers `localhost:8000` en dev.

Documentation API : http://localhost:8000/docs

### Comptes de test

| Email | Rôle |
|-------|------|
| `jordan@epitech.digital` | Utilisateur |
| `analyste@analyst.surphy.fr` | Analyste (dashboard ML) |

## Monnaie

La monnaie du projet est l'**Epicoin (EPC)**. Taux : **5 EPC = 1€** (1 EPC = 0,20€).

## Intercampus — Groupe 7 (Epitech Lyon)

### Nos credentials (à donner aux autres groupes)

| Champ | Valeur |
|-------|--------|
| **Groupe** | Groupe 7 — Epitech Lyon |
| **wallet_id** | `82a52097-ea76-4248-ba29-ac377338c231` |
| **api_key_hash** | `03cfc8bd1261a6bb3b9c9e256a51aca4cbb013474a9f216791ee97db7cfaa4b8` |
| **API URL** | `https://surphy-wallet-api.onrender.com` |

### Endpoints intercampus

| Endpoint | Description |
|----------|-------------|
| `POST /lookup-user` | Recherche un utilisateur par email ou nom |
| `POST /intercampus-receive` | Reçoit un transfert entrant d'un autre groupe |
| `POST /intercampus-send` | Envoie un transfert vers un autre groupe |

### Peers enregistrés

| Groupe | Campus | wallet_id | API URL |
|--------|--------|-----------|---------|
| Groupe 2 | Paris | `9ec8742d-726b-4138-80fa-4121f8f27261` | `https://srvkyiugewdjrpvcmquq.supabase.co/functions/v1` |

### Variables d'environnement requises (Render)

En plus des 3 variables Supabase existantes, ajouter :

| Variable | Description |
|----------|-------------|
| `SUPABASE_JWT_SECRET` | JWT Secret (Supabase → Settings → API → JWT Secret) — requis pour `/intercampus-send` |

## Licence

MIT
