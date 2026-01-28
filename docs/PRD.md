# Smart Wallet IA - Product Requirements Document (PRD)

**Version:** 1.1
**Date:** 23 Janvier 2026
**Statut:** Sprint 1 - Infrastructure Core
**Stack:** React Native + Expo (Mobile) + TypeScript + Supabase (PostgreSQL + Auth + RLS) + Python 3.13 (ML Engine)

---

## 1. Vue d'Ensemble du Projet

### 1.1 Mission
Développer une plateforme de portefeuille intelligent (Smart Wallet) avec détection de fraude en temps réel, capable de protéger les utilisateurs tout en maintenant une expérience fluide et compréhensible.

### 1.2 Vision Produit
Un système de paiement étudiant sécurisé qui :
- Détecte automatiquement les transactions suspectes en **< 100ms** (p95)
- Offre une expérience utilisateur fluide avec une latence perçue **< 300ms**
- Permet aux analystes de comprendre et améliorer les décisions de sécurité
- Garantit une infrastructure stable, observable et sécurisée (RGPD, OWASP L1)

### 1.3 Périmètre du Sprint 1
**Objectif:** Établir l'infrastructure core et implémenter les 9 règles de détection déterministes (R1-R9)

**Livrables:**
- Base de données Supabase avec RLS activé
- API FastAPI (Python 3.13) pour le moteur ML
- Application mobile React Native + Expo avec authentification Supabase
- 9 règles de détection opérationnelles (R1-R9)
- Dashboard minimal pour Alex (analyste) - version mobile
- Monitoring de base pour Eric (admin système)

---

## 2. Personas et Besoins

### 2.1 Camille - Utilisatrice Non-Technique

**Profil:**
- Étudiante utilisant le wallet pour ses transactions quotidiennes
- Non-technique, veut une expérience simple et rassurante
- Sensible à la latence et aux messages incompréhensibles

**Besoins Métiers:**
- ✅ Comprendre rapidement si une transaction est "OK" ou "à risque"
- ✅ Recevoir un message d'alerte en 1 phrase claire, sans jargon
- ✅ Savoir quelle action entreprendre (continuer, vérifier, contacter support)

**Besoins Techniques:**
- UI dépouillée centrée sur : **statut**, **score**, **décision**, **1-3 raisons**
- Latence UI **< 300ms** (incluant appel ML + rendu)
- Règles lisibles : R1 (Montant), R2 (Nocturne), R3 (Pays), R4 (Vélocité)
- Score de risque simple (0-100)

**Impact sur Priorisation:**

| Priorité | Fonctionnalité |
|----------|----------------|
| **MUST** | - Auth Supabase + création wallet<br>- Simulation/création de transactions<br>- Règles R1-R4 opérationnelles<br>- Endpoint `/v1/ml` avec ≤ 3 raisons standardisées<br>- UI affichant score + décision + raisons |
| **SHOULD** | - Paramétrage des seuils dans l'UI<br>- Historique des transactions paginé |
| **COULD** | - A/B testing sur le wording des alertes<br>- Notifications push |

---

### 2.2 Alex - Analyste Fraude Junior

**Profil:**
- Responsable de la supervision des alertes et de l'amélioration du système
- Besoin de comprendre le "pourquoi" des décisions
- Contribue à l'amélioration du ML via labellisation

**Besoins Métiers:**
- ✅ Filtrer rapidement les transactions à risque (score, type, période)
- ✅ Comprendre la logique de chaque décision pour ajuster les seuils
- ✅ Labelliser les transactions (fraude/légitime/catégorie/doublon)

**Besoins Techniques:**
- Dashboard avec :
  - Filtres (risque, raison, période, décision, label)
  - Liste paginée des transactions
  - Journal d'alertes exploitable
- Endpoints : `/v1/transactions`, `/v1/alerts`, `/v1/labels`
- Champs enrichis : `score_ml`, `reasons_json`, `anomaly_score`, `decision`, `labels`
- Métriques simples : volume d'alertes, décisions, erreurs

**Impact sur Priorisation:**

| Priorité | Fonctionnalité |
|----------|----------------|
| **MUST** | - Dashboard minimal avec filtres essentiels<br>- Journal d'alertes lié aux transactions<br>- Enrichissement systématique (score, décision, raisons) |
| **SHOULD** | - `/v1/labels` pour labellisation<br>- Correction de catégorie dans l'UI<br>- `/metrics` pour observabilité métier |
| **COULD** | - Export CSV<br>- Simulateur automatique<br>- Graphiques d'évolution du risque<br>- Catégorisation NLP |

---

### 2.3 Eric - Admin Système

**Profil:**
- Responsable de la stabilité, sécurité et conformité de la plateforme
- Doit diagnostiquer rapidement les incidents (ML, API, JWT, réseau)
- Garantit l'interopérabilité entre campus/instances

**Besoins Métiers:**
- ✅ Plateforme stable, sécurisée et conforme (RGPD, OWASP L1)
- ✅ Interopérabilité fiable entre instances/campus
- ✅ Diagnostic rapide des incidents (source du problème)

**Besoins Techniques:**
- Gestion et supervision des pairs (`peers` table)
- JWT interop (RS256, JWKS) avec allowlist et validation stricte des claims
- Idempotence via `request_id` sur les transferts
- Endpoints : `/health`, `/metrics`, logs corrélés
- Gestion des secrets (variables d'env, rotation)
- Mode dégradé si ML KO

**Impact sur Priorisation:**

| Priorité | Fonctionnalité |
|----------|----------------|
| **MUST** | - Endpoints interop : `/.well-known/epitech-wallet`, `/v1/federation/verify`, `/v1/federation/transfers`<br>- JWT sécurisé (RS256 + JWKS + allowlist)<br>- Erreurs normalisées (TOKEN_INVALID, FORBIDDEN_PAIR, etc.)<br>- `/health` et `/metrics` + `request_id` dans logs |
| **SHOULD** | - Sauvegardes automatiques<br>- Durcissement OWASP<br>- Métriques inter-campus par pair |
| **COULD** | - Dead Letter Queue (DLQ) pour échecs interop<br>- Templates IaC (Terraform/CloudFormation) |

---

## 2.5 Design System Unifié

> **Source de vérité :** Cette section définit les couleurs, typographie, espacements
> et animations utilisés dans TOUTE l'application mobile.

### 2.5.1 Palette de Couleurs Globale

Cette palette consolide TOUTES les couleurs utilisées à travers les 9 écrans de l'application.

```typescript
// mobile/src/utils/theme.ts

export const colors = {
  // === PRIMARY COLORS ===
  primary: {
    blue: '#3B82F6',
    'blue-dark': '#2563EB',
  },

  // === BACKGROUNDS ===
  background: {
    primary: '#F3F4F6',        // Fond général de l'app
    card: '#FFFFFF',            // Fond des cartes standard
    'card-light': '#F8F9FB',    // Fond des cartes légères (Risk Gauge)
    secondary: '#F9FAFB',       // Fond secondaire (hover states)
  },

  // === TEXT COLORS ===
  text: {
    primary: '#111827',         // Titres, texte principal
    secondary: '#6B7280',       // Descriptions, labels
    tertiary: '#9CA3AF',        // Timestamps, placeholders
    onCard: '#FFFFFF',          // Texte sur carte bleue virtuelle
    risk: '#3B4A6B',           // Texte spécifique jauge de risque
  },

  // === STATUS COLORS ===
  status: {
    success: '#10B981',         // Validée, succès
    'success-bg': '#D1FAE5',    // Fond badge succès
    warning: '#F59E0B',         // À vérifier, warning
    'warning-bg': '#FEF3C7',    // Fond badge warning
    'warning-light': '#FBBF24', // Warning secondaire (checkmarks)
    error: '#EF4444',           // Erreur, bloquée
    'error-bg': '#FEE2E2',      // Fond badge erreur
    info: '#3B82F6',
  },

  // === ALERT COLORS ===
  alert: {
    red: '#EF4444',             // Alerte critique
    'red-bg': '#FEE2E2',
    'red-light': '#FEF2F2',
    orange: '#F59E0B',          // Alerte warning
    'orange-bg': '#FEF3C7',
  },

  // === BLOCK COLORS ===
  block: {
    red: '#DC2626',             // Bloquer ma carte
    'red-bg': '#FEE2E2',
  },

  // === BORDERS & DIVIDERS ===
  border: '#E5E7EB',
  'border-light': '#F3F4F6',
  'input-border': '#D1D5DB',

  // === SHADOWS ===
  shadow: 'rgba(0, 0, 0, 0.06)',
  'shadow-strong': 'rgba(0, 0, 0, 0.15)',

  // === VIRTUAL CARD GRADIENT ===
  card: {
    'blue-start': '#5B8FD8',
    'blue-end': '#7BB5F5',
  },

  // === RISK GAUGE ===
  gauge: {
    green: '#A3E635',          // Normal (début)
    yellow: '#FDE047',         // Transition
    orange: '#FB923C',         // Moyen
    red: '#EF4444',            // Critique (fin)
    needle: '#3B82F6',         // Aiguille
    background: '#E5E7EB',     // Fond inactif
  },

  // === TABS & NAVIGATION ===
  tab: {
    active: '#3B82F6',
    inactive: '#9CA3AF',
    'bar-bg': '#FFFFFF',
    'bar-border': '#E5E7EB',
  },

  // === OVERLAY & MODALS ===
  overlay: {
    dark: 'rgba(0, 0, 0, 0.5)',
    blue: 'rgba(139, 180, 216, 0.95)', // Pour modal explicability
  },

  // === SPECIAL BACKGROUNDS ===
  special: {
    'security-blue-bg': '#EFF6FF',  // Fond icône bouclier
    'school-purple': '#5B21B6',     // Badge école Epitech
  },
};
```

### 2.5.2 Système Typographique Unifié

```typescript
// mobile/src/utils/theme.ts

export const typography = {
  // === FONT FAMILIES ===
  fontFamily: {
    primary: 'System',  // San Francisco (iOS) / Roboto (Android)
    mono: 'Courier, monospace', // Pour numéro de carte
  },

  // === FONT SIZES ===
  fontSize: {
    // Extra Large
    'page-title': '40px',           // Historique, Carte virtuelle
    'card-title': '36px',           // Faire un virement
    'risk-percentage': '56px',      // 23% dans la jauge
    'balance-amount': '36px',       // Solde actuel
    'transfer-amount': '32px',      // Montant à transférer

    // Large
    'modal-title': '28px',          // Raison du blocage
    'user-name': '28px',            // Grace Akré
    'section-title': '22px',        // Compte, Sécurité
    'alert-title': '24px',          // Vérification d'activité suspecte

    // Medium
    'card-number': '20px',          // 1234 **** **** 4321
    'h2': '20px',                   // Aujourd'hui, Hier
    'gauge-label': '18px',          // RISQUE
    'menu-item': '17px',            // Campus par défaut
    'reason-label': '17px',         // Nouvel appareil détecté

    // Regular
    'body-large': '16px',
    'body': '15px',
    'body-small': '14px',
    'caption': '13px',
    'tiny': '11px',                 // Labels de tabs
  },

  // === FONT WEIGHTS ===
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // === LINE HEIGHTS ===
  lineHeight: {
    none: 1,
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // === LETTER SPACING ===
  letterSpacing: {
    normal: '0px',
    'card-number': '2px',
    'card-title': '0.5px',
    'risk-label': '1px',
  },
};
```

### 2.5.3 Espacements & Grille

```typescript
// mobile/src/utils/theme.ts

export const spacing = {
  // === SCREEN PADDING ===
  'screen-h': '20px',
  'screen-v': '16px',

  // === SAFE AREAS ===
  'safe-top': '60px',
  'safe-bottom': '34px',

  // === COMMON GAPS ===
  'gap-xs': '4px',
  'gap-sm': '8px',
  'gap-md': '12px',
  'gap-lg': '16px',
  'gap-xl': '24px',
  'gap-2xl': '32px',

  // === CARD PADDING ===
  'card-padding': '20px',
  'card-padding-lg': '24px',
  'card-padding-sm': '16px',

  // === SECTION SPACING ===
  'section-gap': '24px',
  'element-gap': '12px',
};
```

### 2.5.4 Border Radius

```typescript
// mobile/src/utils/theme.ts

export const borderRadius = {
  'button': '12px',
  'input': '12px',
  'badge': '8px',
  'card': '16px',
  'card-lg': '20px',
  'modal': '24px',
  'filter-chip': '20px',
  'avatar': '24px',
  'toggle': '16px',
  'virtual-card': '20px',
};
```

### 2.5.5 Ombres (Box Shadows)

```typescript
// mobile/src/utils/theme.ts

export const shadows = {
  'card-sm': {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,  // Android
  },

  'card': {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  'modal': {
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },

  'virtual-card': {
    shadowColor: '#3B82F6',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};
```

### 2.5.6 Animations Globales

```typescript
// mobile/src/utils/theme.ts

export const animations = {
  // === DURATIONS ===
  duration: {
    instant: 0,
    fast: 100,
    normal: 200,
    medium: 300,
    slow: 400,
    slower: 600,
    'gauge-needle': 1200,
  },

  // === EASING FUNCTIONS ===
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'spring',
  },

  // === COMMON ANIMATIONS ===
  fadeIn: {
    duration: 200,
    easing: 'ease-out',
  },

  fadeInUp: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  scalePress: {
    scale: { from: 1.0, to: 0.97 },
    duration: 100,
  },
};
```

---

## 2.6 Composants Réutilisables (Application Mobile)

> Ces composants sont utilisés à travers plusieurs écrans.
> **Emplacement :** `mobile/src/components/ui/`

### 2.6.1 Button

**Variants :** `primary`, `secondary`, `outline`, `ghost`

```typescript
// mobile/src/components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
}
```

**Utilisé dans :** Onboarding, Home, Verification, Card Payment, Profile, History, Card Virtual

### 2.6.2 Card

**Variants :** `default`, `elevated`, `flat`

```typescript
// mobile/src/components/ui/Card.tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'flat';
  padding?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}
```

**Utilisé dans :** Tous les écrans

### 2.6.3 Badge

**Variants :** `success`, `warning`, `error`, `info`

```typescript
// mobile/src/components/ui/Badge.tsx
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info';
  label: string;
  size?: 'sm' | 'md';
}
```

**Utilisé dans :** Home, History, Card Virtual, Verification

### 2.6.4 TransactionItem ⭐ (Composant le plus réutilisé)

```typescript
// mobile/src/components/transactions/TransactionItem.tsx
interface TransactionItemProps {
  transaction: Transaction;
  showBadge?: boolean;
  onPress?: () => void;
  variant?: 'default' | 'compact';
}
```

**Structure :** `[Avatar] [Name + Timestamp] [Amount] [Badge?]`

**Utilisé dans :** Home, History, Card Virtual, Verification, Risk Gauge (5 écrans)

### 2.6.5 SearchBar

```typescript
// mobile/src/components/ui/SearchBar.tsx
interface SearchBarProps {
  placeholder?: string;
  onPress?: () => void;
  onChangeText?: (text: string) => void;
  value?: string;
}
```

**Utilisé dans :** History, Risk Gauge

### 2.6.6 FilterChip

```typescript
// mobile/src/components/ui/FilterChip.tsx
interface FilterChipProps {
  label: string;
  active?: boolean;
  icon?: ReactNode;
  onPress: () => void;
}
```

**Utilisé dans :** History

### 2.6.7 MenuItem

```typescript
// mobile/src/components/ui/MenuItem.tsx
interface MenuItemProps {
  label: string;
  sublabel?: string;
  value?: string;
  icon?: ReactNode;
  onPress: () => void;
  showChevron?: boolean;
}
```

**Utilisé dans :** Profile

### 2.6.8 Toggle

```typescript
// mobile/src/components/ui/Toggle.tsx
interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}
```

**Utilisé dans :** Profile (Notification settings)

---

## 2.7 Configuration NativeWind / Tailwind CSS

**Fichier :** `mobile/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },

        // Backgrounds
        'app-bg': '#F3F4F6',
        'card-bg': '#FFFFFF',
        'card-light-bg': '#F8F9FB',

        // Text
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'text-tertiary': '#9CA3AF',
        'text-on-card': '#FFFFFF',
        'text-risk': '#3B4A6B',

        // Status
        success: {
          DEFAULT: '#10B981',
          bg: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg: '#FEF3C7',
          light: '#FBBF24',
        },
        error: {
          DEFAULT: '#EF4444',
          bg: '#FEE2E2',
        },

        // Alert
        alert: {
          red: '#EF4444',
          'red-bg': '#FEE2E2',
          orange: '#F59E0B',
          'orange-bg': '#FEF3C7',
        },

        // Block
        block: {
          red: '#DC2626',
          'red-bg': '#FEE2E2',
        },

        // Borders
        border: '#E5E7EB',
        'border-light': '#F3F4F6',
        'input-border': '#D1D5DB',

        // Card Virtual
        'card-blue-start': '#5B8FD8',
        'card-blue-end': '#7BB5F5',

        // Gauge
        'gauge-green': '#A3E635',
        'gauge-yellow': '#FDE047',
        'gauge-orange': '#FB923C',
        'gauge-red': '#EF4444',
        'gauge-needle': '#3B82F6',
        'gauge-bg': '#E5E7EB',

        // Tabs
        'tab-active': '#3B82F6',
        'tab-inactive': '#9CA3AF',

        // Overlay
        'overlay-blue': 'rgba(139, 180, 216, 0.95)',

        // Special
        'security-blue-bg': '#EFF6FF',
        'school-purple': '#5B21B6',
      },

      spacing: {
        'safe-top': '60px',
        'safe-bottom': '34px',
        'avatar': '48px',
        'shield': '80px',
      },

      fontSize: {
        'page-title': '40px',
        'card-title': '36px',
        'risk-percentage': '56px',
        'balance-amount': '36px',
        'transfer-amount': '32px',
        'modal-title': '28px',
        'user-name': '28px',
        'section-title': '22px',
        'alert-title': '24px',
        'card-number': '20px',
        'gauge-label': '18px',
        'menu-item': '17px',
        'tab': '11px',
      },

      borderRadius: {
        'button': '12px',
        'card': '16px',
        'card-lg': '20px',
        'modal': '24px',
        'badge': '8px',
        'avatar': '24px',
        'filter-chip': '20px',
        'toggle': '16px',
        'virtual-card': '20px',
      },

      letterSpacing: {
        'card-number': '2px',
        'card-title': '0.5px',
        'risk-label': '1px',
      },

      boxShadow: {
        'card-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'card-lg': '0 6px 16px rgba(0, 0, 0, 0.08)',
        'modal': '0 12px 24px rgba(0, 0, 0, 0.15)',
        'virtual-card': '0 8px 16px rgba(59, 130, 246, 0.25)',
      },
    },
  },
  plugins: [],
}
```

---

## 3. KPIs et Objectifs de Performance

### 3.1 KPIs Techniques

| Métrique | Cible | Méthode de Mesure |
|----------|-------|-------------------|
| **Latence ML (p95)** | < 100ms | Temps d'exécution du service `/v1/ml` |
| **Latence Globale Perçue (p95)** | < 300ms | Temps total de la requête utilisateur (frontend → backend → ML → frontend) |
| **Disponibilité API** | > 99.5% | Uptime monitoring via `/health` |
| **Taux d'Erreur** | < 0.1% | Erreurs HTTP 5xx / total requêtes |
| **Latence DB (p95)** | < 50ms | Queries PostgreSQL via Supabase |

### 3.2 KPIs Métiers

| Métrique | Cible | Persona Impacté |
|----------|-------|-----------------|
| **Taux de Faux Positifs** | < 2% | Camille (frustration) |
| **Taux de Fraudes Détectées** | > 95% | Alex (efficacité) |
| **Temps de Labellisation** | < 30s/transaction | Alex (productivité) |
| **MTTR (Mean Time To Repair)** | < 15 min | Eric (réactivité) |

---

## 4. Architecture Technique

### 4.1 Stack Technologique

```
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION MOBILE                     │
│  React Native + Expo + TypeScript + NativeWind         │
│  Authentification: Supabase Auth (React Native SDK)     │
│  Plateformes: iOS + Android                             │
└─────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   API GATEWAY                            │
│  FastAPI (Python 3.13) - Middleware Request ID          │
│  Routes: /v1/ml, /v1/transactions, /health, /metrics    │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   ML ENGINE (Python)    │   │   SUPABASE (Backend)    │
│  Règles R1-R4           │   │  PostgreSQL + Auth      │
│  Score: 0-100           │   │  Row Level Security     │
│  Décision: 3 niveaux    │   │  Real-time subscriptions│
└─────────────────────────┘   └─────────────────────────┘
```

### 4.2 Composants Principaux

#### A. Application Mobile (React Native + Expo)
- **Localisation:** `/mobile`
- **Responsabilités:**
  - Authentification utilisateur (Supabase Auth React Native)
  - Affichage des transactions et scores
  - Dashboard Alex (filtres, labels)
  - Notifications push pour alertes fraude
- **Librairies clés:**
  - `@supabase/supabase-js` - Client Supabase
  - `expo-secure-store` - Stockage sécurisé tokens
  - `expo-notifications` - Push notifications
  - `nativewind` - Styling (TailwindCSS pour RN)

#### B. API Gateway (FastAPI)
- **Localisation:** `/api`
- **Responsabilités:**
  - Middleware `request_id` (UUID v4 unique)
  - Orchestration des appels ML
  - Gestion des sessions Supabase côté serveur
  - Mock endpoints pour tests (`/v1/mock-payment`)

#### C. ML Engine (Python 3.13)
- **Localisation:** `/ml`
- **Responsabilités:**
  - Exécution des règles R1-R4
  - Calcul du score de risque (0-100)
  - Génération de la décision et raisons
  - Optimisé pour latence < 100ms

#### D. Base de Données (Supabase/PostgreSQL)
- **Responsabilités:**
  - Stockage des utilisateurs, wallets, transactions
  - Row Level Security (RLS) pour isolation des données
  - Real-time pour notifications
  - Auth intégrée (JWT, OAuth)

---

## 5. Spécifications UI/UX des Écrans (Application Mobile)

### 5.1 Vue d'Ensemble

L'application mobile React Native comprend **9 écrans principaux** dont les
spécifications UI/UX détaillées sont documentées dans des fichiers séparés.

**📁 Emplacement :** `docs/screens/`

**Chaque fichier contient :**
- Palette de couleurs spécifique (basée sur le design system global)
- Typographie et espacements détaillés
- Composants atomiques de l'écran
- Interactions et animations
- États et validations
- Accessibilité

### 5.2 Instructions pour l'Implémentation

**Pour implémenter un écran :**

1. **Lire d'abord les sections 2.5-2.7 de ce PRD** (design system global)
2. **Puis consulter le fichier de spec correspondant** dans `docs/screens/`
3. **Réutiliser les composants** définis en section 2.6
4. **Respecter la structure** : `mobile/src/screens/[NomScreen].tsx`

**Exemple de commande pour Claude Code :**

```bash
"Implémente le HomeScreen en suivant :
1. Le design system (docs/PRD.md sections 2.5-2.7)
2. Les specs détaillées (docs/screens/02-home.md)
3. Utilise les composants de mobile/src/components/ui/
4. Fichier : mobile/src/screens/HomeScreen.tsx"
```

### 5.3 Index des Écrans et Priorités

| # | Écran | Fichier Spec | Priorité | Composants Clés | Description |
|---|-------|--------------|----------|-----------------|-------------|
| 1 | **Onboarding / Connexion** | [`screens/01-onboarding.md`](./screens/01-onboarding.md) | 🔴 P0 | Button, Card | Écran d'accueil et authentification |
| 2 | **Home (Accueil)** | [`screens/02-home.md`](./screens/02-home.md) | 🔴 P0 | BalanceCard, TransactionItem, Badge | Dashboard principal avec solde et transactions récentes |
| 3 | **Vérification Transaction Suspecte** | [`screens/03-verification.md`](./screens/03-verification.md) | 🔴 P0 | AlertBanner, Button, Badge | Écran de validation des transactions suspectes |
| 4 | **Carte - Faire un Virement** | [`screens/04-card-payment.md`](./screens/04-card-payment.md) | 🟡 P1 | BalanceCard, Input, Button | Interface de création de virement inter-campus |
| 5 | **Profil Utilisateur** | [`screens/05-profile.md`](./screens/05-profile.md) | 🟡 P1 | ProfileCard, MenuItem, Toggle | Profil et paramètres utilisateur |
| 6 | **Historique des Transactions** | [`screens/06-history.md`](./screens/06-history.md) | 🟡 P1 | FilterChip, SearchBar, TransactionItem | Liste complète avec filtres et recherche |
| 7 | **Carte Virtuelle** | [`screens/07-card-virtual.md`](./screens/07-card-virtual.md) | 🟡 P1 | VirtualCard (gradient), Button | Affichage et gestion de la carte virtuelle |
| 8 | **Modal Explicabilité** | [`screens/08-explicability-modal.md`](./screens/08-explicability-modal.md) | 🔴 P0 | Modal, Overlay, Glassmorphism | Explication IA des blocages de transaction |
| 9 | **Jauge de Risque (Alex)** | [`screens/09-risk-gauge.md`](./screens/09-risk-gauge.md) | 🟢 P2 | CircularGauge (SVG), SearchBar | Visualisation du score de risque de fraude |

**Légende des Priorités :**
- 🔴 **P0** : Critique - Écrans essentiels pour le MVP (flow principal)
- 🟡 **P1** : Important - Fonctionnalités core de l'application
- 🟢 **P2** : Nice-to-have - Améliorations et features avancées

### 5.4 Flows Utilisateurs

**Flow critique (MVP - P0) :**
```
Onboarding → Home ⟷ Vérification ⟷ Modal Explicabilité
```

**Flows secondaires (P1) :**
```
Home → Card Payment → Confirmation → Success
Home → History (avec filtres et recherche)
Home → Profile → Settings
Carte Tab → Card Virtual → Details/Lock/PIN
```

**Flows avancés (P2) :**
```
Card Tab → Risk Gauge → Suspicious Transactions → Verification
```

### 5.5 Composants Partagés entre Écrans

**TransactionItem** (le plus réutilisé - créer en priorité) :
- ✅ Home (activités récentes)
- ✅ History (liste complète)
- ✅ Card Virtual (paiements récents)
- ✅ Risk Gauge (transactions suspectes)
- ✅ Verification (détails transaction)

**Button** :
- ✅ Tous les écrans

**Badge** :
- ✅ Home, History, Card Virtual, Verification

**SearchBar** :
- ✅ History, Risk Gauge

**Card** (container) :
- ✅ Tous les écrans

### 5.6 Architecture de Navigation

```typescript
// mobile/src/navigation/RootNavigator.tsx

<NavigationContainer>
  <Stack.Navigator>
    {/* Auth Flow */}
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />

    {/* Main App */}
    <Stack.Screen name="Main" component={TabNavigator} />

    {/* Modals */}
    <Stack.Screen
      name="Verification"
      component={VerificationScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="Explicability"
      component={ExplicabilityModal}
      options={{ presentation: 'transparentModal' }}
    />
  </Stack.Navigator>
</NavigationContainer>

// mobile/src/navigation/TabNavigator.tsx

<Tab.Navigator>
  <Tab.Screen name="Home" component={HomeScreen} />
  <Tab.Screen name="History" component={HistoryScreen} />
  <Tab.Screen name="Card" component={CardVirtualScreen} />
  <Tab.Screen name="Profile" component={ProfileScreen} />
</Tab.Navigator>
```

### 5.7 Intégration avec le Backend

L'application mobile communique avec le backend FastAPI existant via les services API.

**Base URL :** Configuration dans `.env`

```bash
# mobile/.env
API_URL=http://localhost:8000  # Dev
# API_URL=https://api.surphy.app  # Production
```

**Services API :**

```typescript
// mobile/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL,
  timeout: 10000,
});

export default api;
```

**Endpoints utilisés par le mobile :**
- `POST /auth/login` - Authentification
- `GET /transactions` - Liste des transactions
- `GET /transactions/:id` - Détails d'une transaction
- `POST /transactions/:id/verify` - Valider une transaction
- `POST /transactions/:id/contest` - Contester un blocage
- `GET /fraud/alerts` - Alertes de fraude actives
- `GET /fraud/risk-score` - Score de risque utilisateur
- `GET /users/me` - Profil utilisateur
- `GET /users/me/balance` - Solde actuel
- `PUT /users/me/card/lock` - Verrouiller la carte

**Note :** Les endpoints détaillés sont définis dans la section 7 de ce PRD.

### 5.8 Workflow de Développement Recommandé

**Phase 1 - Setup & Design System (Jour 1)**
```bash
✅ Initialiser le projet Expo
✅ Configurer NativeWind
✅ Créer mobile/src/utils/theme.ts
✅ Créer les composants UI de base (Button, Card, Badge)
✅ Créer TransactionItem (le plus réutilisé)
```

**Phase 2 - Écrans P0 (Jours 2-5)**
```bash
✅ 1. OnboardingScreen
✅ 2. HomeScreen (avec TransactionItem, BalanceCard)
✅ 3. VerificationScreen
✅ 8. ExplicabilityModal (glassmorphism)
✅ Navigation de base + Tab Bar
```

**Phase 3 - Écrans P1 (Jours 6-8)**
```bash
✅ 5. ProfileScreen (MenuItem, Toggle)
✅ 6. HistoryScreen (FilterChip, SearchBar)
✅ 7. CardVirtualScreen (gradient)
✅ 4. CardPaymentScreen
✅ Intégration API complète
```

**Phase 4 - Écrans P2 & Polish (Jours 9-10)**
```bash
✅ 9. RiskGaugeScreen (SVG circular gauge)
✅ Animations avancées
✅ Haptic feedback
✅ Tests E2E
```

---

## 6. Stratégie de Détection Hybride

### 5.1 Vue d'Ensemble des 9 Règles

| ID | Code | Criticité | Description | Poids |
|----|------|-----------|-------------|-------|
| **R1** | AMOUNT_HIGH | P0 | Montant > 500€ | +30 |
| **R2** | TIME_SUSPICIOUS | P1 | Transaction nocturne (00h-06h) | +20 |
| **R3** | LOCATION_CHANGE | P1 | Pays différent de la dernière transaction | +25 |
| **R4** | VELOCITY_HIGH | P0 | ≥ 3 transactions en 5 minutes | +35 |
| **R5** | IP_GEO_MISMATCH | P0 | Écart IP/Géolocalisation > 1000km | +40 |
| **R6** | KYC_EXPIRED | P1 | KYC utilisateur expiré | +15 |
| **R7** | DUPLICATE_REQUEST | P0 | Même montant/marchand en < 2min | +50 |
| **R8** | CAMPUS_NOT_ALLOWED | P1 | Campus non présent dans l'allowlist | +20 |
| **R9** | SCA_THRESHOLD | P0 | Cumul journalier > 150€ | +35 |

**Légende Criticité:**
- **P0 (Bloquant)** : Peut entraîner un BLOCK immédiat
- **P1 (Audit)** : Déclenche une alerte pour revue

### 5.2 Phase 1 - Règles Déterministes (Sprint 1)

#### Règles P0 - Bloquant/Rejet

**R1 - AMOUNT_HIGH**
```python
if amount > 500 and currency == "EUR":
    score += 30
    reasons.append("AMOUNT_HIGH")
```
- **Seuil:** 500 EUR
- **Poids:** +30 points
- **Raison:** Transaction inhabituelle pour un étudiant

**R4 - VELOCITY_HIGH**
```python
if transactions_last_5min >= 3:
    score += 35
    reasons.append("VELOCITY_HIGH")
```
- **Seuil:** ≥ 3 transactions en 5 minutes
- **Poids:** +35 points
- **Raison:** Activité anormalement intense

**R5 - IP_GEO_MISMATCH**
```python
distance_km = haversine(ip_coords, declared_coords)
if distance_km > 1000:
    score += 40
    reasons.append("IP_GEO_MISMATCH")
```
- **Seuil:** > 1000 km (formule Haversine)
- **Poids:** +40 points
- **Raison:** Incohérence entre IP et localisation déclarée

**R7 - DUPLICATE_REQUEST**
```python
duplicate = find_similar_transaction(user_id, amount, merchant_id, window_minutes=2)
if duplicate and duplicate.request_id != current_request_id:
    score += 50
    reasons.append("DUPLICATE_REQUEST")
```
- **Fenêtre:** 2 minutes
- **Poids:** +50 points
- **Raison:** Possible double soumission/replay attack

**R9 - SCA_THRESHOLD**
```python
daily_total = sum_transactions_today(user_id)
if daily_total + amount > 150:
    score += 35
    reasons.append("SCA_THRESHOLD")
```
- **Seuil:** Cumul > 150€ / jour
- **Poids:** +35 points
- **Raison:** Dépassement seuil PSD2/SCA

#### Règles P1 - Audit/Alerte

**R2 - TIME_SUSPICIOUS**
```python
if 0 <= hour < 6:  # 00h00-05h59
    score += 20
    reasons.append("TIME_SUSPICIOUS")
```
- **Plage:** 00:00 - 05:59
- **Poids:** +20 points
- **Raison:** Horaire inhabituel pour une transaction légitime

**R3 - LOCATION_CHANGE**
```python
if current_country != last_transaction_country:
    score += 25
    reasons.append("LOCATION_CHANGE")
```
- **Condition:** Pays différent de la dernière transaction
- **Poids:** +25 points
- **Raison:** Déplacement géographique suspect

**R6 - KYC_EXPIRED**
```python
if user.kyc_expires_at < datetime.now():
    score += 15
    reasons.append("KYC_EXPIRED")
```
- **Condition:** Date KYC dépassée
- **Poids:** +15 points
- **Raison:** Identité non vérifiée récemment

**R8 - CAMPUS_NOT_ALLOWED**
```python
if user.campus not in ALLOWED_CAMPUSES:
    score += 20
    reasons.append("CAMPUS_NOT_ALLOWED")
```
- **Condition:** Campus non dans l'allowlist
- **Poids:** +20 points
- **Raison:** Campus non autorisé pour ce service

### 6.3 Seuils de Décision

| Score | Décision | Action |
|-------|----------|--------|
| **0-29** | `APPROVE` | Transaction approuvée automatiquement |
| **30-69** | `REVIEW` | Marquée pour revue par Alex |
| **70-100** | `BLOCK` | Transaction bloquée, notification Camille |

### 6.4 Phase 2 - Machine Learning (Future Sprint)

**Objectifs:**
- Modèle de classification supervisé (Random Forest, XGBoost)
- Entraînement sur les labels d'Alex
- Détection d'anomalies (Isolation Forest, Autoencoder)
- Feature engineering avancé (graphes de transactions, embeddings)

**Métriques Cibles:**
- Précision: > 95%
- Rappel: > 90%
- F1-Score: > 92%

---

## 7. Schéma de Base de Données (Supabase)

### 7.1 Tables Principales

#### `users` - Profils Utilisateurs
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    campus VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `wallets` - Portefeuilles Multi-Devises
```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `transactions` - Journal Transactionnel
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'internal'
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    country VARCHAR(2), -- ISO 3166-1 alpha-2
    city VARCHAR(100),
    transaction_type VARCHAR(20) NOT NULL CHECK (
        transaction_type IN ('payment', 'transfer', 'withdrawal', 'deposit')
    ),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'blocked', 'flagged')
    ),
    request_id UUID UNIQUE NOT NULL,
    score_ml NUMERIC(5, 2) CHECK (score_ml BETWEEN 0 AND 100),
    decision VARCHAR(20) CHECK (decision IN ('approve', 'review', 'block')),
    reasons_json JSONB, -- ["AMOUNT_HIGH", "TIME_SUSPICIOUS"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_request_id ON transactions(request_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_decision ON transactions(decision);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

#### `labels` - Annotations pour ML Training
```sql
CREATE TABLE labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    analyst_id UUID NOT NULL REFERENCES users(id),
    label_type VARCHAR(20) NOT NULL CHECK (
        label_type IN ('fraud', 'legit', 'category', 'duplicate', 'subscription')
    ),
    label_value VARCHAR(100) NOT NULL,
    confidence VARCHAR(10) CHECK (confidence IN ('low', 'medium', 'high')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_labels_transaction_id ON labels(transaction_id);
```

#### `external_transfers` - Transferts Inter-Campus
```sql
CREATE TABLE external_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_wallet_id UUID NOT NULL REFERENCES wallets(id),
    to_email VARCHAR(255) NOT NULL,
    to_campus VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'verified', 'completed', 'failed')
    ),
    request_id UUID UNIQUE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `peers` - Instances/Campus Autorisés
```sql
CREATE TABLE peers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_name VARCHAR(100) UNIQUE NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    jwks_url VARCHAR(255) NOT NULL,
    public_key TEXT NOT NULL, -- RSA public key (PEM)
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
    allowed_domains TEXT[], -- ['@epitech.eu', '@epitech.digital']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7.2 Row Level Security (RLS)

**Politique pour `transactions`:**
```sql
-- Camille peut voir uniquement ses propres transactions
CREATE POLICY "Users can view their own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- Alex (analyste) peut voir toutes les transactions
CREATE POLICY "Analysts can view all transactions"
ON transactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND email LIKE '%@epitech.eu'
    )
);
```

**Politique pour `wallets`:**
```sql
-- Utilisateurs peuvent voir uniquement leurs wallets
CREATE POLICY "Users can view their own wallets"
ON wallets FOR SELECT
USING (auth.uid() = user_id);
```

---

## 8. Endpoints API

### 8.1 Endpoints Publics (Frontend)

#### `POST /v1/ml` - Détection de Fraude
**Request:**
```json
{
  "transaction_id": "uuid",
  "amount": 650.00,
  "currency": "EUR",
  "country": "FR",
  "city": "Paris",
  "timestamp": "2026-01-22T14:30:00Z",
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "request_id": "uuid",
  "score": 55,
  "decision": "review",
  "reasons": ["AMOUNT_HIGH", "VELOCITY_HIGH"],
  "reasons_json": {
    "AMOUNT_HIGH": {
      "threshold": 500,
      "actual": 650,
      "contribution": 25
    },
    "VELOCITY_HIGH": {
      "count": 3,
      "window": "5min",
      "contribution": 25
    }
  },
  "latency_ms": 87
}
```

#### `GET /v1/transactions` - Liste Transactions
**Query Params:**
- `user_id` (optional, auto-filled pour Camille)
- `status` (optional: pending, approved, blocked)
- `decision` (optional: approve, review, block)
- `limit` (default: 50)
- `offset` (default: 0)

#### `POST /v1/labels` - Créer un Label
**Request:**
```json
{
  "transaction_id": "uuid",
  "label_type": "fraud",
  "label_value": "confirmed_fraud",
  "confidence": "high",
  "notes": "Card stolen, confirmed by user"
}
```

### 8.2 Endpoints Internes

#### `GET /health` - Health Check
```json
{
  "status": "healthy",
  "timestamp": "2026-01-22T14:30:00Z",
  "services": {
    "database": "up",
    "ml_engine": "up"
  }
}
```

#### `GET /metrics` - Métriques Prometheus
```
# TYPE http_requests_total counter
http_requests_total{method="POST",endpoint="/v1/ml",status="200"} 1547

# TYPE ml_latency_seconds histogram
ml_latency_seconds_bucket{le="0.05"} 892
ml_latency_seconds_bucket{le="0.1"} 1520
ml_latency_seconds_sum 127.4
ml_latency_seconds_count 1547
```

### 8.3 Endpoints Interopérabilité (Federation)

#### `GET /.well-known/epitech-wallet` - Discovery
```json
{
  "campus": "Paris",
  "version": "1.0",
  "endpoints": {
    "verify": "https://paris.epitech-wallet.eu/v1/federation/verify",
    "transfers": "https://paris.epitech-wallet.eu/v1/federation/transfers"
  },
  "jwks_uri": "https://paris.epitech-wallet.eu/.well-known/jwks.json"
}
```

#### `POST /v1/federation/verify` - Vérifier Email Externe
**Request (with JWT):**
```json
{
  "email": "camille@lyon.epitech.eu"
}
```

**Response:**
```json
{
  "exists": true,
  "campus": "Lyon",
  "verified_at": "2026-01-22T14:30:00Z"
}
```

---

## 9. Sécurité et Conformité

### 9.1 Authentification et Autorisation

**Supabase Auth:**
- JWT tokens (RS256) avec expiration 1h
- Refresh tokens sécurisés (httpOnly cookies)
- OAuth providers: Google, GitHub (optionnel)

**Gestion des Secrets:**
```bash
# .env.local (local, JAMAIS commité)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Production (Vercel/Render)
# Variables d'environnement via interface web
# Rotation des clés tous les 90 jours
```

### 9.2 OWASP Top 10 (Level 1)

| Vulnérabilité | Mitigation |
|---------------|------------|
| **A01: Broken Access Control** | RLS activé sur toutes les tables Supabase |
| **A02: Cryptographic Failures** | HTTPS obligatoire, secrets hashés (bcrypt) |
| **A03: Injection** | Prepared statements, validation Pydantic |
| **A04: Insecure Design** | JWT interop avec allowlist de pairs |
| **A05: Security Misconfiguration** | `.env.local` ignoré, secrets hors dépôt |
| **A07: Identification & Auth Failures** | Rate limiting (10 req/min login) |
| **A08: Software & Data Integrity** | Validation des inputs, CSP headers |

### 9.3 RGPD

**Droits des Utilisateurs:**
- ✅ Droit à l'oubli: endpoint `DELETE /v1/users/me`
- ✅ Portabilité: endpoint `GET /v1/users/me/export` (JSON)
- ✅ Transparence: raisons claires dans `reasons_json`

**Conservation des Données:**
- Transactions: 7 ans (obligations comptables)
- Logs: 90 jours maximum
- Sessions: 1h (JWT expiration)

---

## 10. Monitoring et Observabilité

### 10.1 Logs Structurés (JSON)

**Format:**
```json
{
  "timestamp": "2026-01-22T14:30:00Z",
  "level": "INFO",
  "request_id": "uuid",
  "service": "ml_engine",
  "endpoint": "/v1/ml",
  "latency_ms": 87,
  "score": 55,
  "decision": "review",
  "user_id": "uuid"
}
```

**Corrélation:**
- Chaque requête reçoit un `request_id` unique (UUID v4)
- Propagé à travers tous les services (API → ML → DB)
- Permet à Eric de tracer les incidents

### 10.2 Métriques Clés

**Application:**
- Latence (p50, p95, p99) par endpoint
- Taux d'erreur (4xx, 5xx)
- Débit (requêtes/seconde)

**Business:**
- Volume de transactions par statut
- Distribution des scores ML
- Taux de faux positifs/négatifs

**Infrastructure:**
- CPU, RAM, Disk I/O
- Connexions DB actives
- Taille de la queue (si DLQ implémentée)

---

## 11. Plan de Déploiement

### 11.1 Environnements

| Environnement | URL | Usage |
|---------------|-----|-------|
| **Local** | `localhost:3000` | Développement, tests unitaires |
| **Staging** | `staging.surphy-wallet.com` | Tests E2E, QA |
| **Production** | `app.surphy-wallet.com` | Utilisateurs finaux |

### 11.2 CI/CD Pipeline (GitHub Actions)

**Workflow:**
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
      - run: pytest ml/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: vercel/actions@v2
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### 11.3 Procédure de Rollback

**En cas d'incident:**
1. Détection via alertes (Sentry, Vercel Logs)
2. Rollback Vercel: `vercel rollback <deployment-id>`
3. Investigation des logs avec `request_id`
4. Hotfix + redéploiement

---

## 12. Roadmap

### Sprint 1 (Actuel - 2 semaines)
- [x] Schéma Supabase + RLS
- [ ] API FastAPI avec middleware `request_id`
- [ ] ML Engine règles R1-R4
- [ ] Frontend Next.js (auth + transactions)
- [ ] Dashboard Alex minimal

### Sprint 2 (3 semaines)
- [ ] Système de labels pour Alex
- [ ] Métriques `/metrics` (Prometheus)
- [ ] Endpoints interop (verify, transfers)
- [ ] JWT interop (RS256, JWKS)

### Sprint 3 (4 semaines)
- [ ] ML supervisé (entraînement sur labels)
- [ ] Détection d'anomalies (Isolation Forest)
- [ ] Export CSV pour Alex
- [ ] Sauvegardes automatiques

### Sprint 4+ (Backlog)
- [ ] A/B testing wording alertes
- [ ] Notifications push (Firebase)
- [ ] Templates IaC (Terraform)
- [ ] DLQ pour échecs interop

---

## 13. Critères de Succès

### 13.1 Sprint 1

**Fonctionnel:**
- ✅ Camille peut créer un wallet et simuler une transaction
- ✅ Le système détecte correctement les 4 règles (R1-R4)
- ✅ Alex peut voir la liste des transactions avec score/décision
- ✅ Eric peut accéder à `/health` et `/metrics`

**Performance:**
- ✅ Latence ML < 100ms (p95)
- ✅ Latence globale < 300ms (p95)
- ✅ Aucune erreur 5xx en production

**Sécurité:**
- ✅ RLS activé et testé
- ✅ Aucun secret dans le dépôt Git
- ✅ HTTPS obligatoire en production

### 13.2 Objectifs Long Terme

**Mois 3:**
- Taux de fraudes détectées > 95%
- Taux de faux positifs < 2%
- 100+ transactions labellisées par Alex

**Mois 6:**
- Modèle ML en production (supervisé + anomalies)
- Interopérabilité avec 3+ campus
- Conformité RGPD complète (audit externe)

---

## 14. Risques et Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Latence ML > 100ms** | Moyen | Élevé | Profiling Python, cache Redis, règles optimisées |
| **Faux positifs élevés** | Élevé | Moyen | A/B testing seuils, feedback Alex, ML supervisé |
| **Panne Supabase** | Faible | Élevé | Mode dégradé (approve all), monitoring, SLA 99.9% |
| **Fuite de secrets** | Faible | Critique | Rotation automatique, secrets manager, audit Git |
| **Fraude interop (JWT)** | Moyen | Élevé | Allowlist stricte, validation claims, logs détaillés |

---

## 15. Annexes

### 15.1 Glossaire

| Terme | Définition |
|-------|------------|
| **RLS** | Row Level Security - Isolation des données au niveau ligne dans PostgreSQL |
| **JWT** | JSON Web Token - Standard d'authentification (RFC 7519) |
| **JWKS** | JSON Web Key Set - Ensemble de clés publiques pour validation JWT |
| **p95** | 95e percentile - 95% des requêtes sont plus rapides que cette valeur |
| **DLQ** | Dead Letter Queue - File d'attente pour messages en erreur |
| **IaC** | Infrastructure as Code - Définition de l'infra via code (Terraform) |

### 15.2 Références

- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Python 3.13 Release Notes](https://docs.python.org/3.13/whatsnew/3.13.html)

---

## 16. Checklist de Développement Mobile

### Setup Initial
- [ ] Initialiser Expo avec TypeScript: `npx create-expo-app mobile --template`
- [ ] Installer NativeWind: `npm install nativewind tailwindcss`
- [ ] Configurer Tailwind: créer `tailwind.config.js`
- [ ] Installer dépendances:
  - [ ] React Navigation (`@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`)
  - [ ] React Query (`@tanstack/react-query`)
  - [ ] Reanimated (`react-native-reanimated`)
  - [ ] SVG (`react-native-svg`)
  - [ ] Gesture Handler (`react-native-gesture-handler`)
  - [ ] Linear Gradient (`expo-linear-gradient`)
  - [ ] Async Storage (`@react-native-async-storage/async-storage`)

### Design System
- [ ] Créer `mobile/src/utils/theme.ts` avec toutes les constantes
- [ ] Configurer NativeWind avec le design system

### Composants UI de Base
- [ ] Button (4 variants)
- [ ] Card (3 variants)
- [ ] Badge (4 variants)
- [ ] Input
- [ ] SearchBar
- [ ] FilterChip
- [ ] MenuItem
- [ ] Toggle
- [ ] **TransactionItem** ⭐ (priorité haute - utilisé partout)

### Navigation
- [ ] RootNavigator (Stack)
- [ ] TabNavigator (Bottom Tabs)
- [ ] Configurer les modals (Verification, Explicability)

### Services API
- [ ] Configurer axios avec baseURL
- [ ] auth.service.ts
- [ ] transaction.service.ts
- [ ] fraud.service.ts
- [ ] user.service.ts

### Écrans P0 (MVP)
- [ ] OnboardingScreen
- [ ] HomeScreen
- [ ] VerificationScreen
- [ ] ExplicabilityModal

### Écrans P1
- [ ] ProfileScreen
- [ ] HistoryScreen
- [ ] CardVirtualScreen
- [ ] CardPaymentScreen

### Écrans P2
- [ ] RiskGaugeScreen

### Tests & Quality
- [ ] Tests unitaires (composants UI)
- [ ] Tests E2E (flows critiques)
- [ ] Performance optimization
- [ ] Accessibilité (labels, voiceover)

### Deployment
- [ ] Build Android (AAB)
- [ ] Build iOS (IPA)
- [ ] Tests sur devices physiques

---

**Document maintenu par:** Jordan (Lead Software Engineer)
**Dernière mise à jour:** 25 Janvier 2026
**Prochaine revue:** Sprint 2 (Février 2026)
