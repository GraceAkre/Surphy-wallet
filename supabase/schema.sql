-- =============================================================================
-- Smart Wallet IA - Schéma SQL Supabase
-- Version: 1.0
-- Date: 22 Janvier 2026
-- Sprint: 1 - Infrastructure Core
-- =============================================================================

-- Ce schéma supporte les 9 règles de détection (R1-R9) avec:
-- - Traçabilité via request_id
-- - Row Level Security (RLS) pour isolation des données
-- - Indexes optimisés pour les requêtes de détection
-- - Fonctions RPC pour calculs côté serveur (performance)

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour calculs géographiques (optionnel, pour R5)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================================================
-- TYPES ENUM
-- =============================================================================

-- Statuts de transaction
CREATE TYPE transaction_status AS ENUM (
    'pending',
    'approved',
    'blocked',
    'flagged'
);

-- Décisions ML
CREATE TYPE ml_decision AS ENUM (
    'approve',
    'review',
    'block'
);

-- Types de transaction
CREATE TYPE transaction_type AS ENUM (
    'payment',
    'transfer',
    'withdrawal',
    'deposit'
);

-- Direction de transaction
CREATE TYPE transaction_direction AS ENUM (
    'incoming',
    'outgoing'
);

-- Types de labels (pour entraînement ML)
CREATE TYPE label_type AS ENUM (
    'fraud',
    'legit',
    'category',
    'duplicate',
    'subscription'
);

-- Niveaux de confiance
CREATE TYPE confidence_level AS ENUM (
    'low',
    'medium',
    'high'
);

-- Statuts des peers (interop)
CREATE TYPE peer_status AS ENUM (
    'active',
    'suspended',
    'revoked'
);

-- Statuts des wallets
CREATE TYPE wallet_status AS ENUM (
    'active',
    'frozen',
    'closed'
);

-- =============================================================================
-- TABLE: users
-- =============================================================================
-- Profils utilisateurs avec informations KYC pour R6 et campus pour R8

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    campus VARCHAR(100),  -- Pour R8: CAMPUS_NOT_ALLOWED
    kyc_expires_at TIMESTAMP WITH TIME ZONE,  -- Pour R6: KYC_EXPIRED
    kyc_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche par email
CREATE INDEX idx_users_email ON users(email);

-- Index pour campus (R8)
CREATE INDEX idx_users_campus ON users(campus);

-- =============================================================================
-- TABLE: wallets
-- =============================================================================
-- Portefeuilles multi-devises avec gestion des statuts

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    status wallet_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche par user
CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- =============================================================================
-- TABLE: transactions
-- =============================================================================
-- Journal transactionnel avec support complet des 9 règles

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),

    -- Données transaction
    provider VARCHAR(50) NOT NULL,  -- 'stripe', 'paypal', 'internal'
    merchant_id VARCHAR(100),  -- Pour R7: DUPLICATE_REQUEST
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),  -- Pour R1, R9
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',

    -- Localisation (pour R3, R5)
    country VARCHAR(2),  -- ISO 3166-1 alpha-2, pour R3: LOCATION_CHANGE
    city VARCHAR(100),
    ip_address INET,  -- Pour R5: IP_GEO_MISMATCH
    ip_latitude NUMERIC(10, 7),  -- Pour R5
    ip_longitude NUMERIC(10, 7),  -- Pour R5
    declared_latitude NUMERIC(10, 7),  -- Pour R5
    declared_longitude NUMERIC(10, 7),  -- Pour R5

    -- Type et direction
    transaction_type transaction_type NOT NULL,
    direction transaction_direction NOT NULL,

    -- Statut et décision
    status transaction_status NOT NULL DEFAULT 'pending',

    -- Traçabilité (CRITIQUE)
    request_id UUID UNIQUE NOT NULL,  -- Idempotence, pour R7

    -- Résultats ML
    score_ml NUMERIC(5, 2) CHECK (score_ml BETWEEN 0 AND 100),
    decision ml_decision,
    reasons_json JSONB,  -- ["AMOUNT_HIGH", "VELOCITY_HIGH", ...]
    reasons_detail JSONB,  -- Détails complets de chaque raison

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- Pour R2, R4, R9
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE  -- Quand ML a traité
);

-- Index pour traçabilité (CRITIQUE)
CREATE INDEX idx_transactions_request_id ON transactions(request_id);

-- Index pour recherche utilisateur
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);

-- Index pour filtrage statut/décision
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_decision ON transactions(decision);

-- Index pour R4: VELOCITY_HIGH (transactions récentes par user)
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);

-- Index pour R7: DUPLICATE_REQUEST (même user, montant, merchant récemment)
CREATE INDEX idx_transactions_duplicate_check ON transactions(user_id, amount, merchant_id, created_at DESC);

-- Index pour R9: SCA_THRESHOLD (cumul journalier)
CREATE INDEX idx_transactions_daily_sum ON transactions(user_id, created_at)
    WHERE status IN ('approved', 'pending');

-- Index pour R3: dernier pays de transaction
CREATE INDEX idx_transactions_last_country ON transactions(user_id, country, created_at DESC);

-- Index temporel pour pagination et analytics
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- =============================================================================
-- TABLE: labels
-- =============================================================================
-- Annotations pour entraînement ML (utilisé par Alex)

CREATE TABLE labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    analyst_id UUID NOT NULL REFERENCES users(id),
    label_type label_type NOT NULL,
    label_value VARCHAR(100) NOT NULL,
    confidence confidence_level DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour récupération labels d'une transaction
CREATE INDEX idx_labels_transaction_id ON labels(transaction_id);

-- Index pour labels par analyste
CREATE INDEX idx_labels_analyst_id ON labels(analyst_id);

-- =============================================================================
-- TABLE: external_transfers
-- =============================================================================
-- Transferts inter-campus (interop)

CREATE TABLE external_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Index pour traçabilité
CREATE INDEX idx_external_transfers_request_id ON external_transfers(request_id);

-- =============================================================================
-- TABLE: peers
-- =============================================================================
-- Instances/campus autorisés pour interop (utilisé par Eric)

CREATE TABLE peers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_name VARCHAR(100) UNIQUE NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    jwks_url VARCHAR(255) NOT NULL,
    public_key TEXT NOT NULL,  -- RSA public key (PEM)
    status peer_status DEFAULT 'active',
    allowed_domains TEXT[],  -- ['@epitech.eu', '@epitech.digital']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche par campus
CREATE INDEX idx_peers_campus_name ON peers(campus_name);
CREATE INDEX idx_peers_status ON peers(status);

-- =============================================================================
-- TABLE: audit_log
-- =============================================================================
-- Log d'audit pour traçabilité complète (RGPD, sécurité)

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL,  -- Corrélation avec la requête
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),  -- 'transaction', 'user', 'wallet'
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche par request_id
CREATE INDEX idx_audit_log_request_id ON audit_log(request_id);

-- Index temporel
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- =============================================================================
-- FONCTIONS RPC
-- =============================================================================

-- Fonction: Compter les transactions récentes (pour R4: VELOCITY_HIGH)
CREATE OR REPLACE FUNCTION count_recent_transactions(
    p_user_id UUID,
    p_minutes INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM transactions
    WHERE user_id = p_user_id
      AND created_at > NOW() - (p_minutes || ' minutes')::INTERVAL
      AND status IN ('pending', 'approved');

    RETURN COALESCE(v_count, 0);
END;
$$;

-- Fonction: Somme des transactions du jour (pour R9: SCA_THRESHOLD)
CREATE OR REPLACE FUNCTION sum_daily_transactions(
    p_user_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sum NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_sum
    FROM transactions
    WHERE user_id = p_user_id
      AND created_at >= DATE_TRUNC('day', NOW())
      AND status IN ('pending', 'approved')
      AND direction = 'outgoing';

    RETURN v_sum;
END;
$$;

-- Fonction: Trouver transaction similaire récente (pour R7: DUPLICATE_REQUEST)
CREATE OR REPLACE FUNCTION find_duplicate_transaction(
    p_user_id UUID,
    p_amount NUMERIC,
    p_merchant_id VARCHAR,
    p_window_minutes INTEGER DEFAULT 2,
    p_exclude_request_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    request_id UUID,
    amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.request_id, t.amount, t.created_at
    FROM transactions t
    WHERE t.user_id = p_user_id
      AND t.amount = p_amount
      AND t.merchant_id = p_merchant_id
      AND t.created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL
      AND (p_exclude_request_id IS NULL OR t.request_id != p_exclude_request_id)
    ORDER BY t.created_at DESC
    LIMIT 1;
END;
$$;

-- Fonction: Virement atomique entre deux wallets
-- Accepte p_to_user_id (pas wallet_id) car RLS empêche le client de lire le wallet d'un autre user
CREATE OR REPLACE FUNCTION transfer_funds(
    p_from_wallet_id UUID,
    p_to_user_id UUID,
    p_amount NUMERIC,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_from_wallet RECORD;
    v_to_wallet RECORD;
    v_tx_id UUID;
BEGIN
    -- 0. Résoudre le wallet actif du destinataire à partir de son user_id
    SELECT * INTO v_to_wallet FROM wallets
    WHERE user_id = p_to_user_id AND status = 'active'
    LIMIT 1;

    IF v_to_wallet.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Wallet du destinataire introuvable');
    END IF;

    -- 1. Verrouiller les deux wallets dans un ordre déterministe (évite deadlock)
    IF p_from_wallet_id < v_to_wallet.id THEN
        SELECT * INTO v_from_wallet FROM wallets WHERE id = p_from_wallet_id FOR UPDATE;
        SELECT * INTO v_to_wallet FROM wallets WHERE id = v_to_wallet.id FOR UPDATE;
    ELSE
        SELECT * INTO v_to_wallet FROM wallets WHERE id = v_to_wallet.id FOR UPDATE;
        SELECT * INTO v_from_wallet FROM wallets WHERE id = p_from_wallet_id FOR UPDATE;
    END IF;

    -- 2. Vérifier que le wallet expéditeur existe
    IF v_from_wallet.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Wallet expéditeur introuvable');
    END IF;

    -- 3. Vérifier que les wallets sont actifs
    IF v_from_wallet.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Votre wallet est inactif');
    END IF;
    IF v_to_wallet.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Le wallet du destinataire est inactif');
    END IF;

    -- 4. Vérifier le solde suffisant
    IF v_from_wallet.balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Solde insuffisant');
    END IF;

    -- 5. Débiter l'expéditeur
    UPDATE wallets SET balance = balance - p_amount WHERE id = p_from_wallet_id;

    -- 6. Créditer le destinataire
    UPDATE wallets SET balance = balance + p_amount WHERE id = v_to_wallet.id;

    -- 7. Insérer la transaction outgoing (expéditeur)
    v_tx_id := uuid_generate_v4();
    INSERT INTO transactions (
        id, user_id, wallet_id, provider, amount, currency,
        transaction_type, direction, status, request_id
    ) VALUES (
        v_tx_id,
        v_from_wallet.user_id,
        p_from_wallet_id,
        'internal',
        p_amount,
        'EUR',
        'transfer',
        'outgoing',
        'approved',
        p_request_id
    );

    -- 8. Insérer la transaction incoming (destinataire)
    INSERT INTO transactions (
        user_id, wallet_id, provider, amount, currency,
        transaction_type, direction, status, request_id
    ) VALUES (
        v_to_wallet.user_id,
        v_to_wallet.id,
        'internal',
        p_amount,
        'EUR',
        'transfer',
        'incoming',
        'approved',
        uuid_generate_v4()
    );

    -- 9. Retourner le succès avec l'ID de la transaction
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'error_message', NULL
    );
END;
$$;

-- Fonction: Récupérer le dernier pays de transaction (pour R3: LOCATION_CHANGE)
CREATE OR REPLACE FUNCTION get_last_transaction_country(
    p_user_id UUID
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_country VARCHAR;
BEGIN
    SELECT country
    INTO v_country
    FROM transactions
    WHERE user_id = p_user_id
      AND country IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN v_country;
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Active RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE peers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Policies: users
-- -----------------------------------------------------------------------------

-- Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Les utilisateurs peuvent créer leur propre profil (auto-registration après OTP)
CREATE POLICY "Users can insert own profile"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Les utilisateurs authentifiés peuvent voir tous les profils (sélecteur de destinataire)
CREATE POLICY "Authenticated users can view all users"
ON users FOR SELECT
USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- Policies: wallets
-- -----------------------------------------------------------------------------

-- Les utilisateurs peuvent voir leurs propres wallets
CREATE POLICY "Users can view own wallets"
ON wallets FOR SELECT
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent créer leur propre wallet (auto-création après inscription)
CREATE POLICY "Users can insert own wallet"
ON wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Policies: transactions
-- -----------------------------------------------------------------------------

-- Les utilisateurs peuvent voir leurs propres transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent créer des transactions pour eux-mêmes
CREATE POLICY "Users can create own transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les analystes (@epitech.digital) peuvent voir toutes les transactions
CREATE POLICY "Analysts can view all transactions"
ON transactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND email LIKE '%@epitech.digital'
    )
);

-- -----------------------------------------------------------------------------
-- Policies: labels
-- -----------------------------------------------------------------------------

-- Les analystes peuvent créer des labels
CREATE POLICY "Analysts can create labels"
ON labels FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND email LIKE '%@epitech.digital'
    )
);

-- Les analystes peuvent voir tous les labels
CREATE POLICY "Analysts can view all labels"
ON labels FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND email LIKE '%@epitech.digital'
    )
);

-- -----------------------------------------------------------------------------
-- Policies: peers
-- -----------------------------------------------------------------------------

-- Seuls les admins peuvent gérer les peers
CREATE POLICY "Admins can manage peers"
ON peers FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND email LIKE '%@admin.epitech.eu'
    )
);

-- Lecture publique des peers actifs (pour discovery)
CREATE POLICY "Public can view active peers"
ON peers FOR SELECT
USING (status = 'active');

-- -----------------------------------------------------------------------------
-- Policies: audit_log
-- -----------------------------------------------------------------------------

-- Seuls les admins peuvent voir les logs d'audit
CREATE POLICY "Admins can view audit logs"
ON audit_log FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND email LIKE '%@admin.epitech.eu'
    )
);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger: Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labels_updated_at
    BEFORE UPDATE ON labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_peers_updated_at
    BEFORE UPDATE ON peers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DONNÉES INITIALES
-- =============================================================================

-- Campus autorisés par défaut
INSERT INTO peers (campus_name, base_url, jwks_url, public_key, status, allowed_domains)
VALUES
    ('Paris', 'https://paris.surphy-wallet.com', 'https://paris.surphy-wallet.com/.well-known/jwks.json', 'PLACEHOLDER_PUBLIC_KEY', 'active', ARRAY['@epitech.digital']),
    ('Lyon', 'https://lyon.surphy-wallet.com', 'https://lyon.surphy-wallet.com/.well-known/jwks.json', 'PLACEHOLDER_PUBLIC_KEY', 'active', ARRAY['@epitech.digital']),
    ('Bordeaux', 'https://bordeaux.surphy-wallet.com', 'https://bordeaux.surphy-wallet.com/.well-known/jwks.json', 'PLACEHOLDER_PUBLIC_KEY', 'active', ARRAY['@epitech.digital']),
    ('Lille', 'https://lille.surphy-wallet.com', 'https://lille.surphy-wallet.com/.well-known/jwks.json', 'PLACEHOLDER_PUBLIC_KEY', 'active', ARRAY['@epitech.digital']),
    ('Nantes', 'https://nantes.surphy-wallet.com', 'https://nantes.surphy-wallet.com/.well-known/jwks.json', 'PLACEHOLDER_PUBLIC_KEY', 'active', ARRAY['@epitech.digital'])
ON CONFLICT (campus_name) DO NOTHING;

-- =============================================================================
-- COMMENTAIRES
-- =============================================================================

COMMENT ON TABLE users IS 'Profils utilisateurs avec KYC (R6) et campus (R8)';
COMMENT ON TABLE wallets IS 'Portefeuilles multi-devises';
COMMENT ON TABLE transactions IS 'Journal transactionnel avec support R1-R9';
COMMENT ON TABLE labels IS 'Annotations ML par les analystes';
COMMENT ON TABLE peers IS 'Campus autorisés pour interop';
COMMENT ON TABLE audit_log IS 'Log d audit pour traçabilité RGPD';

COMMENT ON COLUMN transactions.request_id IS 'UUID unique pour idempotence et traçabilité (R7)';
COMMENT ON COLUMN transactions.score_ml IS 'Score de risque 0-100 calculé par le moteur ML';
COMMENT ON COLUMN transactions.reasons_json IS 'Codes des raisons déclenchées (max 3)';
COMMENT ON COLUMN users.kyc_expires_at IS 'Date expiration KYC pour R6: KYC_EXPIRED';
COMMENT ON COLUMN users.campus IS 'Campus pour R8: CAMPUS_NOT_ALLOWED';

-- =============================================================================
-- TABLE: money_requests
-- =============================================================================
-- Demandes d'argent entre utilisateurs

CREATE TABLE money_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id),
    target_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'declined')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_money_requests_requester ON money_requests(requester_id);
CREATE INDEX idx_money_requests_target ON money_requests(target_id, status, created_at DESC);

-- RLS
ALTER TABLE money_requests ENABLE ROW LEVEL SECURITY;

-- Le demandeur peut voir et créer ses propres demandes
CREATE POLICY "Requesters can view own requests"
ON money_requests FOR SELECT
USING (auth.uid() = requester_id);

CREATE POLICY "Requesters can insert own requests"
ON money_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Le destinataire peut voir et mettre à jour les demandes qui lui sont adressées
CREATE POLICY "Targets can view received requests"
ON money_requests FOR SELECT
USING (auth.uid() = target_id);

CREATE POLICY "Targets can update received requests"
ON money_requests FOR UPDATE
USING (auth.uid() = target_id);

-- Trigger updated_at
CREATE TRIGGER update_money_requests_updated_at
    BEFORE UPDATE ON money_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE money_requests IS 'Demandes d argent entre utilisateurs';
