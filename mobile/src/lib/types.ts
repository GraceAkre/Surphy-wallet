// Types correspondant au schéma Supabase

export type TransactionStatus = 'pending' | 'approved' | 'blocked' | 'flagged';
export type MLDecision = 'approve' | 'review' | 'block';
export type TransactionType = 'payment' | 'transfer' | 'withdrawal' | 'deposit';
export type TransactionDirection = 'incoming' | 'outgoing';
export type WalletStatus = 'active' | 'frozen' | 'closed';
export type PeerStatus = 'active' | 'suspended' | 'revoked';

export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  campus: string;
  admin_campus: string | null;
  avatar_url: string | null;
  kyc_expires_at: string | null;
  kyc_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampusWallet {
  id: string;
  campus_name: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  campus: string;
  currency: string;
  balance: number;
  status: WalletStatus;
  created_at: string;
  updated_at: string;
}

// Données de carte générées (pas stockées en BDD)
export interface CardDetails {
  number: string;        // ex: "4973 1234 5678 9012"
  maskedNumber: string;  // ex: "4973 **** **** 9012"
  expiry: string;        // ex: "12/28"
  cvv: string;           // ex: "123"
  holder: string;        // ex: "JORDAN JOSUB"
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  provider: string;
  merchant_id: string | null;
  amount: number;
  currency: string;
  country: string | null;
  city: string | null;
  ip_address: string | null;
  ip_latitude: number | null;
  ip_longitude: number | null;
  declared_latitude: number | null;
  declared_longitude: number | null;
  transaction_type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  request_id: string;
  score_ml: number | null;
  decision: MLDecision | null;
  reasons_json: string[] | null;
  reasons_detail: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface Peer {
  id: string;
  campus_name: string;
  base_url: string;
  jwks_url: string;
  public_key: string;
  status: PeerStatus;
  allowed_domains: string[];
  is_external: boolean;
  wallet_id: string | null;
  api_key_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  transaction_id: string;
  analyst_id: string;
  label_type: 'fraud' | 'legit' | 'category' | 'duplicate' | 'subscription';
  label_value: string;
  confidence: 'low' | 'medium' | 'high';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Rôles utilisateur (RBAC) ---

export type UserRole = 'student' | 'analyst';

export function getUserRole(email: string): UserRole {
  return email.endsWith('@analyst.surphy.fr') ? 'analyst' : 'student';
}

export interface AlertFilter {
  scoreMin?: number;
  scoreMax?: number;
  decision?: MLDecision | 'all';
  period?: 'today' | 'week' | 'month' | 'all';
  search?: string;
}

export type MoneyRequestStatus = 'pending' | 'fulfilled' | 'declined';

export interface MoneyRequest {
  id: string;
  requester_id: string;
  target_id: string;
  amount: number;
  currency: string;
  status: MoneyRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  // Joined from users table (requester)
  requester_name?: string;
  requester_email?: string;
}
