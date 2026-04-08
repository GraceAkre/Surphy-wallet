-- =============================================================================
-- Smart Wallet IA - Schéma SQL Supabase (COMPLET)
-- Version: 2.0
-- Date: 26 Mars 2026
-- =============================================================================

-- Ce schéma supporte :
-- - 9 règles de détection ML (R1-R9) avec scoring et explicabilité
-- - Portefeuilles multi-campus avec wallets collectifs
-- - Demandes d'argent (money requests) P2P
-- - Transferts inter-campus (contribute / distribute)
-- - Dashboard analyste avec labels d'annotation
-- - Row Level Security (RLS) pour isolation des données
-- - Fonctions RPC atomiques (transfers, deposits, RGPD)
-- - Traçabilité via request_id + audit_log

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================================================
-- TYPES ENUM
-- =============================================================================

CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'blocked', 'flagged');
CREATE TYPE ml_decision AS ENUM ('approve', 'review', 'block');
CREATE TYPE transaction_type AS ENUM ('payment', 'transfer', 'withdrawal', 'deposit');
CREATE TYPE transaction_direction AS ENUM ('incoming', 'outgoing');
CREATE TYPE label_type AS ENUM ('fraud', 'legit', 'category', 'duplicate', 'subscription');
CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE peer_status AS ENUM ('active', 'suspended', 'revoked');
CREATE TYPE wallet_status AS ENUM ('active', 'frozen', 'closed');

-- =============================================================================
-- TABLE: users
-- =============================================================================
-- Profils utilisateurs avec KYC (R6), campus (R8), rôle admin

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    campus VARCHAR(100),                                -- Pour R8: CAMPUS_NOT_ALLOWED
    admin_campus VARCHAR(100),                          -- NULL = étudiant, valeur = admin de ce campus
    avatar_url TEXT,                                    -- URL avatar dans Supabase Storage
    kyc_expires_at TIMESTAMP WITH TIME ZONE,            -- Pour R6: KYC_EXPIRED
    kyc_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_campus ON users(campus);

-- =============================================================================
-- TABLE: wallets
-- =============================================================================
-- Portefeuilles multi-devises, un wallet actif par user+campus

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campus VARCHAR(100),
    currency VARCHAR(3) NOT NULL DEFAULT 'EPC',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    status wallet_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE wallets ADD CONSTRAINT wallets_user_campus_unique UNIQUE (user_id, campus);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- =============================================================================
-- TABLE: transactions
-- =============================================================================
-- Journal transactionnel avec support complet des 9 règles ML

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),

    -- Données transaction
    provider VARCHAR(50) NOT NULL,                      -- 'stripe', 'paypal', 'internal', 'campus_pool', 'campus_admin_deposit'
    merchant_id VARCHAR(100),                           -- Pour R7: DUPLICATE_REQUEST
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),  -- Pour R1, R9
    currency VARCHAR(3) NOT NULL DEFAULT 'EPC',

    -- Localisation (pour R3, R5)
    country VARCHAR(2),                                 -- ISO 3166-1 alpha-2, pour R3
    city VARCHAR(100),
    ip_address INET,                                    -- Pour R5
    ip_latitude NUMERIC(10, 7),                         -- Pour R5
    ip_longitude NUMERIC(10, 7),                        -- Pour R5
    declared_latitude NUMERIC(10, 7),                   -- Pour R5
    declared_longitude NUMERIC(10, 7),                  -- Pour R5

    -- Type et direction
    transaction_type transaction_type NOT NULL,
    direction transaction_direction NOT NULL,

    -- Statut et décision
    status transaction_status NOT NULL DEFAULT 'pending',

    -- Traçabilité
    request_id UUID UNIQUE NOT NULL,                    -- Idempotence, pour R7

    -- Résultats ML
    score_ml NUMERIC(5, 2) CHECK (score_ml BETWEEN 0 AND 100),
    decision ml_decision,
    reasons_json JSONB,                                 -- ["AMOUNT_HIGH", "VELOCITY_HIGH", ...]
    reasons_detail JSONB,                               -- Détails complets par règle déclenchée

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- Pour R2, R4, R9
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE               -- Quand le ML a traité
);

CREATE INDEX idx_transactions_request_id ON transactions(request_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_decision ON transactions(decision);
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_duplicate_check ON transactions(user_id, amount, merchant_id, created_at DESC);
CREATE INDEX idx_transactions_daily_sum ON transactions(user_id, created_at) WHERE status IN ('approved', 'pending');
CREATE INDEX idx_transactions_last_country ON transactions(user_id, country, created_at DESC);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- =============================================================================
-- TABLE: labels
-- =============================================================================
-- Annotations analystes pour entraînement ML

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

CREATE INDEX idx_labels_transaction_id ON labels(transaction_id);
CREATE INDEX idx_labels_analyst_id ON labels(analyst_id);

-- =============================================================================
-- TABLE: money_requests
-- =============================================================================
-- Demandes d'argent P2P entre utilisateurs

CREATE TABLE money_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id),
    target_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EPC',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'declined')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_money_requests_requester ON money_requests(requester_id);
CREATE INDEX idx_money_requests_target ON money_requests(target_id, status, created_at DESC);

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
    currency VARCHAR(3) NOT NULL DEFAULT 'EPC',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'completed', 'failed')),
    request_id UUID UNIQUE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_external_transfers_request_id ON external_transfers(request_id);

-- =============================================================================
-- TABLE: peers
-- =============================================================================
-- Campus autorisés pour interopérabilité

CREATE TABLE peers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_name VARCHAR(100) UNIQUE NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    jwks_url VARCHAR(255) NOT NULL,
    public_key TEXT NOT NULL,
    status peer_status DEFAULT 'active',
    allowed_domains TEXT[],                              -- ['@epitech.digital']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_peers_campus_name ON peers(campus_name);
CREATE INDEX idx_peers_status ON peers(status);

-- =============================================================================
-- TABLE: campus_wallets
-- =============================================================================
-- Portefeuilles collectifs de campus (pot commun inter-campus)

CREATE TABLE campus_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_name VARCHAR(100) UNIQUE NOT NULL REFERENCES peers(campus_name),
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EPC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TABLE: audit_log
-- =============================================================================
-- Log d'audit pour traçabilité complète (RGPD, sécurité)

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),                            -- 'transaction', 'user', 'wallet'
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_request_id ON audit_log(request_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- =============================================================================
-- TRIGGERS : updated_at automatique
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labels_updated_at
    BEFORE UPDATE ON labels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_peers_updated_at
    BEFORE UPDATE ON peers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_money_requests_updated_at
    BEFORE UPDATE ON money_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campus_wallets_updated_at
    BEFORE UPDATE ON campus_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE peers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Policies: users
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view own profile"
ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view all users"
ON users FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own profile"
ON users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Policies: wallets
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view own wallets"
ON wallets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
ON wallets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Policies: transactions
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Analysts can view all transactions"
ON transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND email LIKE '%@analyst.surphy.fr')
);

CREATE POLICY "Analysts can update transactions"
ON transactions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND email LIKE '%@analyst.surphy.fr')
);

-- -----------------------------------------------------------------------------
-- Policies: labels
-- -----------------------------------------------------------------------------

CREATE POLICY "Analysts can create labels"
ON labels FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND email LIKE '%@analyst.surphy.fr')
);

CREATE POLICY "Analysts can view all labels"
ON labels FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND email LIKE '%@analyst.surphy.fr')
);

-- -----------------------------------------------------------------------------
-- Policies: money_requests
-- -----------------------------------------------------------------------------

CREATE POLICY "Requesters can view own requests"
ON money_requests FOR SELECT USING (auth.uid() = requester_id);

CREATE POLICY "Requesters can insert own requests"
ON money_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Targets can view received requests"
ON money_requests FOR SELECT USING (auth.uid() = target_id);

CREATE POLICY "Targets can update received requests"
ON money_requests FOR UPDATE USING (auth.uid() = target_id);

-- -----------------------------------------------------------------------------
-- Policies: peers
-- -----------------------------------------------------------------------------

CREATE POLICY "Public can view active peers"
ON peers FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage peers"
ON peers FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND email LIKE '%@admin.epitech.eu')
);

-- -----------------------------------------------------------------------------
-- Policies: campus_wallets
-- -----------------------------------------------------------------------------

CREATE POLICY "Authenticated users can view campus wallets"
ON campus_wallets FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- Policies: audit_log
-- -----------------------------------------------------------------------------

CREATE POLICY "Admins can view audit logs"
ON audit_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND email LIKE '%@admin.epitech.eu')
);

-- =============================================================================
-- FONCTIONS RPC — Détection ML
-- =============================================================================

-- R4: Compter les transactions récentes (VELOCITY_HIGH)
CREATE OR REPLACE FUNCTION count_recent_transactions(
    p_user_id UUID,
    p_minutes INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM transactions
    WHERE user_id = p_user_id
      AND created_at > NOW() - (p_minutes || ' minutes')::INTERVAL
      AND status IN ('pending', 'approved');
    RETURN COALESCE(v_count, 0);
END;
$$;

-- R9: Somme des transactions du jour (SCA_THRESHOLD)
CREATE OR REPLACE FUNCTION sum_daily_transactions(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sum NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_sum
    FROM transactions
    WHERE user_id = p_user_id
      AND created_at >= DATE_TRUNC('day', NOW())
      AND status IN ('pending', 'approved')
      AND direction = 'outgoing';
    RETURN v_sum;
END;
$$;

-- R7: Trouver une transaction similaire récente (DUPLICATE_REQUEST)
CREATE OR REPLACE FUNCTION find_duplicate_transaction(
    p_user_id UUID,
    p_amount NUMERIC,
    p_merchant_id VARCHAR,
    p_window_minutes INTEGER DEFAULT 2,
    p_exclude_request_id UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, request_id UUID, amount NUMERIC, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- R3: Récupérer le dernier pays de transaction (LOCATION_CHANGE)
CREATE OR REPLACE FUNCTION get_last_transaction_country(p_user_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_country VARCHAR;
BEGIN
    SELECT country INTO v_country
    FROM transactions
    WHERE user_id = p_user_id AND country IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
    RETURN v_country;
END;
$$;

-- =============================================================================
-- FONCTIONS RPC — Transferts
-- =============================================================================

-- Virement atomique entre deux wallets (P2P)
CREATE OR REPLACE FUNCTION transfer_funds(
    p_from_wallet_id UUID,
    p_to_user_id UUID,
    p_amount NUMERIC,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_from_wallet RECORD;
    v_to_wallet RECORD;
    v_tx_id UUID;
BEGIN
    -- 0. Résoudre le wallet actif du destinataire (campus principal)
    SELECT w.* INTO v_to_wallet FROM wallets w
    INNER JOIN users u ON u.id = w.user_id
    WHERE w.user_id = p_to_user_id AND w.status = 'active' AND w.campus = u.campus
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

    IF v_from_wallet.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Wallet expéditeur introuvable');
    END IF;

    IF v_from_wallet.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Votre wallet est inactif');
    END IF;
    IF v_to_wallet.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Le wallet du destinataire est inactif');
    END IF;

    IF v_from_wallet.balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Solde insuffisant');
    END IF;

    -- 2. Débiter / Créditer
    UPDATE wallets SET balance = balance - p_amount WHERE id = p_from_wallet_id;
    UPDATE wallets SET balance = balance + p_amount WHERE id = v_to_wallet.id;

    -- 3. Transaction outgoing (expéditeur)
    v_tx_id := uuid_generate_v4();
    INSERT INTO transactions (
        id, user_id, wallet_id, provider, amount, currency,
        transaction_type, direction, status, request_id
    ) VALUES (
        v_tx_id, v_from_wallet.user_id, p_from_wallet_id,
        'internal', p_amount, 'EPC', 'transfer', 'outgoing', 'approved', p_request_id
    );

    -- 4. Transaction incoming (destinataire)
    INSERT INTO transactions (
        user_id, wallet_id, provider, amount, currency,
        transaction_type, direction, status, request_id
    ) VALUES (
        v_to_wallet.user_id, v_to_wallet.id,
        'internal', p_amount, 'EPC', 'transfer', 'incoming', 'approved', uuid_generate_v4()
    );

    RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'error_message', NULL);
END;
$$;

-- =============================================================================
-- FONCTIONS RPC — Dépôts
-- =============================================================================

-- Dépôt sur wallet personnel (simule un paiement carte → wallet)
CREATE OR REPLACE FUNCTION deposit_funds(
    p_wallet_id UUID,
    p_amount NUMERIC,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_wallet RECORD;
    v_tx_id UUID;
BEGIN
    -- Idempotence
    SELECT id INTO v_tx_id FROM transactions WHERE request_id = p_request_id;
    IF v_tx_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'error_message', NULL);
    END IF;

    -- Verrouiller le wallet
    SELECT * INTO v_wallet FROM wallets WHERE id = p_wallet_id FOR UPDATE;

    IF v_wallet.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Wallet introuvable');
    END IF;

    IF v_wallet.user_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Non autorisé');
    END IF;

    IF v_wallet.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Wallet inactif');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Montant invalide');
    END IF;

    -- Créditer le wallet
    UPDATE wallets SET balance = balance + p_amount WHERE id = p_wallet_id;

    -- Créer la transaction
    v_tx_id := uuid_generate_v4();
    INSERT INTO transactions (
        id, user_id, wallet_id, provider, amount, currency,
        transaction_type, direction, status, request_id
    ) VALUES (
        v_tx_id, v_wallet.user_id, p_wallet_id,
        'stripe', p_amount, 'EPC', 'deposit', 'incoming', 'approved', p_request_id
    );

    RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'error_message', NULL);
END;
$$;

-- =============================================================================
-- FONCTIONS RPC — Campus Wallets (Inter-campus)
-- =============================================================================

-- Contribuer au pot commun d'un campus (tout user authentifié)
CREATE OR REPLACE FUNCTION contribute_to_campus_wallet(
    p_from_wallet_id UUID,
    p_campus_name VARCHAR,
    p_amount NUMERIC,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_from_wallet RECORD;
    v_campus_wallet RECORD;
    v_tx_id UUID := uuid_generate_v4();
BEGIN
    SELECT * INTO v_from_wallet FROM wallets WHERE id = p_from_wallet_id FOR UPDATE;

    IF v_from_wallet.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Wallet introuvable');
    END IF;
    IF v_from_wallet.user_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Non autorisé');
    END IF;
    IF v_from_wallet.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Votre wallet est inactif');
    END IF;
    IF v_from_wallet.balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Solde insuffisant');
    END IF;

    SELECT * INTO v_campus_wallet FROM campus_wallets WHERE campus_name = p_campus_name FOR UPDATE;
    IF v_campus_wallet.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Pot commun campus introuvable');
    END IF;

    UPDATE wallets SET balance = balance - p_amount WHERE id = p_from_wallet_id;
    UPDATE campus_wallets SET balance = balance + p_amount WHERE campus_name = p_campus_name;

    INSERT INTO transactions (
        id, user_id, wallet_id, provider, amount, currency,
        transaction_type, direction, status, request_id
    ) VALUES (
        v_tx_id, v_from_wallet.user_id, p_from_wallet_id,
        'campus_pool', p_amount, 'EPC', 'transfer', 'outgoing', 'approved', p_request_id
    );

    RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'error_message', NULL);
END;
$$;

-- Redistribuer depuis le pot commun vers un user (admin campus uniquement)
CREATE OR REPLACE FUNCTION distribute_from_campus_wallet(
    p_campus_name VARCHAR,
    p_to_user_id UUID,
    p_amount NUMERIC,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_admin_campus VARCHAR;
    v_campus_wallet RECORD;
    v_to_wallet RECORD;
    v_tx_id UUID := uuid_generate_v4();
BEGIN
    SELECT admin_campus INTO v_admin_campus FROM users WHERE id = auth.uid();
    IF v_admin_campus IS NULL OR v_admin_campus != p_campus_name THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Non autorisé : vous n''êtes pas admin de ce campus');
    END IF;

    SELECT * INTO v_campus_wallet FROM campus_wallets WHERE campus_name = p_campus_name FOR UPDATE;
    IF v_campus_wallet.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Pot commun campus introuvable');
    END IF;
    IF v_campus_wallet.balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Solde du pot commun insuffisant');
    END IF;

    SELECT w.* INTO v_to_wallet FROM wallets w
    INNER JOIN users u ON u.id = w.user_id
    WHERE w.user_id = p_to_user_id AND w.status = 'active' AND w.campus = u.campus
    LIMIT 1;
    IF v_to_wallet.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Wallet du destinataire introuvable');
    END IF;

    UPDATE campus_wallets SET balance = balance - p_amount WHERE campus_name = p_campus_name;
    UPDATE wallets SET balance = balance + p_amount WHERE id = v_to_wallet.id;

    INSERT INTO transactions (
        id, user_id, wallet_id, provider, amount, currency,
        transaction_type, direction, status, request_id
    ) VALUES (
        v_tx_id, p_to_user_id, v_to_wallet.id,
        'campus_pool', p_amount, 'EPC', 'transfer', 'incoming', 'approved', p_request_id
    );

    RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'error_message', NULL);
END;
$$;

-- Dépôt direct sur le pot commun (admin campus — carte bancaire → campus wallet)
CREATE OR REPLACE FUNCTION admin_deposit_to_campus(
    p_campus_name VARCHAR,
    p_amount NUMERIC,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_admin_campus VARCHAR;
    v_campus_wallet RECORD;
    v_tx_id UUID;
BEGIN
    -- Idempotence
    SELECT id INTO v_tx_id FROM transactions WHERE request_id = p_request_id;
    IF v_tx_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'error_message', NULL);
    END IF;

    SELECT admin_campus INTO v_admin_campus FROM users WHERE id = auth.uid();
    IF v_admin_campus IS NULL OR v_admin_campus != p_campus_name THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Non autorisé : vous n''êtes pas admin de ce campus');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Montant invalide');
    END IF;

    SELECT * INTO v_campus_wallet FROM campus_wallets WHERE campus_name = p_campus_name FOR UPDATE;
    IF v_campus_wallet.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'transaction_id', NULL, 'error_message', 'Pot commun campus introuvable');
    END IF;

    UPDATE campus_wallets SET balance = balance + p_amount WHERE campus_name = p_campus_name;

    v_tx_id := uuid_generate_v4();
    INSERT INTO transactions (
        id, user_id, wallet_id, provider, amount, currency,
        transaction_type, direction, status, request_id
    )
    SELECT
        v_tx_id, auth.uid(), w.id,
        'campus_admin_deposit', p_amount, 'EPC', 'deposit', 'incoming', 'approved', p_request_id
    FROM wallets w
    INNER JOIN users u ON u.id = w.user_id
    WHERE w.user_id = auth.uid() AND w.status = 'active' AND w.campus = u.campus
    LIMIT 1;

    RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'error_message', NULL);
END;
$$;

-- =============================================================================
-- FONCTIONS RPC — RGPD
-- =============================================================================

-- Export de toutes les données personnelles
CREATE OR REPLACE FUNCTION export_my_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user', (SELECT row_to_json(u) FROM users u WHERE u.id = v_user_id),
        'wallets', COALESCE((SELECT jsonb_agg(row_to_json(w)) FROM wallets w WHERE w.user_id = v_user_id), '[]'::jsonb),
        'transactions', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM transactions t WHERE t.user_id = v_user_id), '[]'::jsonb),
        'money_requests_sent', COALESCE((SELECT jsonb_agg(row_to_json(mr)) FROM money_requests mr WHERE mr.requester_id = v_user_id), '[]'::jsonb),
        'money_requests_received', COALESCE((SELECT jsonb_agg(row_to_json(mr)) FROM money_requests mr WHERE mr.target_id = v_user_id), '[]'::jsonb),
        'audit_log', COALESCE((SELECT jsonb_agg(row_to_json(al)) FROM audit_log al WHERE al.user_id = v_user_id), '[]'::jsonb)
    ) INTO v_result;
    RETURN v_result;
END;
$$;

-- Suppression complète du compte (droit à l'oubli)
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    UPDATE audit_log SET user_id = NULL WHERE user_id = v_user_id;
    DELETE FROM labels WHERE analyst_id = v_user_id;
    DELETE FROM money_requests WHERE requester_id = v_user_id OR target_id = v_user_id;
    DELETE FROM transactions WHERE user_id = v_user_id;
    DELETE FROM wallets WHERE user_id = v_user_id;
    DELETE FROM users WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'error_message', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error_message', SQLERRM);
END;
$$;

-- =============================================================================
-- DONNÉES INITIALES
-- =============================================================================

-- Campus autorisés
INSERT INTO peers (campus_name, base_url, jwks_url, public_key, status, allowed_domains)
VALUES
    ('Paris', 'https://paris.surphy-wallet.com', 'https://paris.surphy-wallet.com/.well-known/jwks.json', 'PLACEHOLDER_PUBLIC_KEY', 'active', ARRAY['@epitech.digital']),
    ('Lyon', 'https://lyon.surphy-wallet.com', 'https://lyon.surphy-wallet.com/.well-known/jwks.json', 'PLACEHOLDER_PUBLIC_KEY', 'active', ARRAY['@epitech.digital']),
    ('Bordeaux', 'https://bordeaux.surphy-wallet.com', 'https://bordeaux.surphy-wallet.com/.well-known/jwks.json', 'PLACEHOLDER_PUBLIC_KEY', 'active', ARRAY['@epitech.digital'])
ON CONFLICT (campus_name) DO NOTHING;

-- Pots communs par campus
INSERT INTO campus_wallets (campus_name) VALUES ('Paris'), ('Lyon'), ('Bordeaux')
ON CONFLICT (campus_name) DO NOTHING;

-- Backfill : associer les wallets existants au campus principal
UPDATE wallets w SET campus = u.campus FROM users u WHERE w.user_id = u.id AND w.campus IS NULL;

-- =============================================================================
-- COMMENTAIRES
-- =============================================================================

COMMENT ON TABLE users IS 'Profils utilisateurs avec KYC (R6), campus (R8), rôle admin';
COMMENT ON TABLE wallets IS 'Portefeuilles multi-devises par user+campus';
COMMENT ON TABLE transactions IS 'Journal transactionnel avec support R1-R9 et résultats ML';
COMMENT ON TABLE labels IS 'Annotations ML par les analystes';
COMMENT ON TABLE money_requests IS 'Demandes d''argent P2P entre utilisateurs';
COMMENT ON TABLE campus_wallets IS 'Portefeuilles collectifs de campus (pot commun inter-campus)';
COMMENT ON TABLE peers IS 'Campus autorisés pour interopérabilité';
COMMENT ON TABLE audit_log IS 'Log d''audit pour traçabilité RGPD';
COMMENT ON TABLE external_transfers IS 'Transferts inter-campus (interop)';

COMMENT ON COLUMN users.firstname IS 'Prénom extrait de l''email (prenom.nom@epitech.digital)';
COMMENT ON COLUMN users.lastname IS 'Nom extrait de l''email';
COMMENT ON COLUMN users.campus IS 'Campus pour R8: CAMPUS_NOT_ALLOWED';
COMMENT ON COLUMN users.admin_campus IS 'NULL = étudiant, valeur = admin du campus indiqué';
COMMENT ON COLUMN users.avatar_url IS 'URL de l''avatar dans Supabase Storage';
COMMENT ON COLUMN users.kyc_expires_at IS 'Date expiration KYC pour R6: KYC_EXPIRED';
COMMENT ON COLUMN transactions.request_id IS 'UUID unique pour idempotence et traçabilité (R7)';
COMMENT ON COLUMN transactions.score_ml IS 'Score de risque 0-100 calculé par le moteur ML';
COMMENT ON COLUMN transactions.reasons_json IS 'Codes des raisons déclenchées (max 3)';
COMMENT ON COLUMN transactions.reasons_detail IS 'Détails complets par règle (threshold, actual, message)';

-- =============================================================================
-- TABLE: ml_config (Configuration ML ajustable par l'analyste)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    preset VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (preset IN ('souple', 'normal', 'strict')),
    threshold_approve INTEGER NOT NULL DEFAULT 30,
    threshold_block INTEGER NOT NULL DEFAULT 70,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer la config par défaut
INSERT INTO ml_config (preset, threshold_approve, threshold_block)
VALUES ('normal', 30, 70)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- FONCTIONS RPC — ML Scoring
-- =============================================================================

-- Met à jour une transaction avec le résultat ML
CREATE OR REPLACE FUNCTION update_transaction_ml_result(
    p_transaction_id UUID,
    p_country VARCHAR(2),
    p_city VARCHAR(100),
    p_merchant_id VARCHAR(100),
    p_score_ml NUMERIC(5,2),
    p_decision ml_decision,
    p_reasons_json JSONB,
    p_reasons_detail JSONB,
    p_new_status transaction_status
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_tx RECORD;
BEGIN
    SELECT * INTO v_tx FROM transactions WHERE id = p_transaction_id;

    IF v_tx.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Transaction introuvable');
    END IF;

    -- Vérifier que l'appelant est bien le propriétaire de la transaction
    IF v_tx.user_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Non autorisé');
    END IF;

    UPDATE transactions SET
        country = p_country,
        city = p_city,
        merchant_id = p_merchant_id,
        score_ml = p_score_ml,
        decision = p_decision,
        reasons_json = p_reasons_json,
        reasons_detail = p_reasons_detail,
        status = p_new_status,
        processed_at = NOW()
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object('success', true, 'error_message', NULL);
END;
$$;

-- Récupérer la config ML active
CREATE OR REPLACE FUNCTION get_ml_config()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_config RECORD;
BEGIN
    SELECT * INTO v_config FROM ml_config ORDER BY updated_at DESC LIMIT 1;
    RETURN jsonb_build_object(
        'preset', v_config.preset,
        'threshold_approve', v_config.threshold_approve,
        'threshold_block', v_config.threshold_block
    );
END;
$$;

-- Mettre à jour la config ML (analyste uniquement)
CREATE OR REPLACE FUNCTION update_ml_config(
    p_preset VARCHAR(20),
    p_threshold_approve INTEGER,
    p_threshold_block INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_config_id UUID;
BEGIN
    SELECT id INTO v_config_id FROM ml_config ORDER BY updated_at DESC LIMIT 1;

    UPDATE ml_config SET
        preset = p_preset,
        threshold_approve = p_threshold_approve,
        threshold_block = p_threshold_block,
        updated_by = auth.uid(),
        updated_at = NOW()
    WHERE id = v_config_id;

    RETURN jsonb_build_object('success', true, 'error_message', NULL);
END;
$$;
