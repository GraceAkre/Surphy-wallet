import {
  ShoppingBag,
  Coffee,
  CreditCard,
  Send,
  Banknote,
  Store,
  Utensils,
  Smartphone,
  Globe,
  LucideIcon,
} from 'lucide-react-native';
import type { Transaction, MLDecision, TransactionStatus } from '../lib/types';

/**
 * Transaction Helper Utilities
 * Centralized logic for transaction display
 */

// --- Icon Mapping ---

const MERCHANT_ICONS: Record<string, LucideIcon> = {
  cafet: Coffee,
  snack: Coffee,
  shop: ShoppingBag,
  store: Store,
  restaurant: Utensils,
  electronics: Smartphone,
  luxury: ShoppingBag,
  carrefour: ShoppingBag,
  starbucks: Coffee,
};

/**
 * Get the appropriate icon for a transaction
 */
export function getTransactionIcon(tx: Transaction): LucideIcon {
  // Check transaction type first
  if (tx.transaction_type === 'transfer') return Send;
  if (tx.transaction_type === 'deposit') return Banknote;
  if (tx.transaction_type === 'withdrawal') return Banknote;

  // Check merchant_id for specific icons
  if (tx.merchant_id) {
    const merchantLower = tx.merchant_id.toLowerCase();
    for (const [key, icon] of Object.entries(MERCHANT_ICONS)) {
      if (merchantLower.includes(key)) {
        return icon;
      }
    }
  }

  // Check if international
  if (tx.country && tx.country !== 'FR') {
    return Globe;
  }

  // Default
  return CreditCard;
}

// --- Background Color Mapping ---

const TRANSACTION_BG_COLORS = {
  incoming: '#E0E7FF',        // Indigo light
  transfer: '#FCE7F3',        // Pink light
  cafeteria: '#FEF3C7',       // Amber light
  shopping: '#DBEAFE',        // Blue light
  blocked: '#FEE2E2',         // Red light
  default: '#DBEAFE',         // Blue light
} as const;

/**
 * Get the background color for a transaction icon container
 */
export function getTransactionBgColor(tx: Transaction): string {
  // Blocked transactions
  if (tx.status === 'blocked') {
    return TRANSACTION_BG_COLORS.blocked;
  }

  // Incoming transactions
  if (tx.direction === 'incoming') {
    return TRANSACTION_BG_COLORS.incoming;
  }

  // Transfers
  if (tx.transaction_type === 'transfer') {
    return TRANSACTION_BG_COLORS.transfer;
  }

  // Cafeteria
  if (tx.merchant_id?.includes('cafet') || tx.merchant_id?.includes('snack')) {
    return TRANSACTION_BG_COLORS.cafeteria;
  }

  // Shopping
  if (tx.merchant_id?.includes('shop') || tx.merchant_id?.includes('store')) {
    return TRANSACTION_BG_COLORS.shopping;
  }

  return TRANSACTION_BG_COLORS.default;
}

// --- Merchant Name Mapping ---

const MERCHANT_NAMES: Record<string, string> = {
  cafet_paris: 'Cafétéria Paris',
  cafet_marseille: 'Cafétéria Marseille',
  cafet_toulouse: 'Cafétéria Toulouse',
  cafet_lyon: 'Cafétéria Lyon',
  cafet_bordeaux: 'Cafétéria Bordeaux',
  luxury_store_ru: 'Luxury Store (Moscow)',
  night_shop: 'Night Shop',
  shop_paris: 'Shop Paris',
  p2p_transfer: 'Transfert P2P',
  stripe: 'Dépôt Stripe',
  electronics_msl: 'Electronics Marseille',
  carrefour: 'Carrefour Market',
  starbucks: 'Starbucks',
};

/**
 * Get a human-readable merchant name
 */
export function getMerchantName(tx: Transaction): string {
  if (!tx.merchant_id) {
    // Fallback based on transaction type
    switch (tx.transaction_type) {
      case 'transfer':
        return 'Transfert';
      case 'deposit':
        return 'Dépôt';
      case 'withdrawal':
        return 'Retrait';
      default:
        return 'Transaction';
    }
  }

  // Intercampus transfers: try to show the recipient/source email or name
  if (tx.merchant_id.startsWith('intercampus:')) {
    const intercampusMeta = (tx.reasons_detail as any)?.intercampus;
    const label =
      intercampusMeta?.destination_email ||
      intercampusMeta?.destination_name ||
      tx.merchant_id.slice('intercampus:'.length);
    return tx.direction === 'incoming'
      ? `Reçu de ${label}`
      : `Transfert à ${label}`;
  }

  return MERCHANT_NAMES[tx.merchant_id] || tx.merchant_id;
}

// --- Status Badge Config ---

export interface BadgeConfig {
  label: string;
  bgColor: string;
  textColor: string;
}

const STATUS_BADGES: Record<TransactionStatus, BadgeConfig> = {
  approved: { label: 'VALIDÉE', bgColor: '#34C759', textColor: '#FFFFFF' },
  pending: { label: 'EN ATTENTE', bgColor: '#9CA3AF', textColor: '#FFFFFF' },
  flagged: { label: 'À VÉRIFIER', bgColor: '#FF9500', textColor: '#FFFFFF' },
  blocked: { label: 'BLOQUÉE', bgColor: '#FF3B30', textColor: '#FFFFFF' },
};

const DECISION_BADGES: Record<MLDecision, BadgeConfig> = {
  approve: { label: 'VALIDÉE', bgColor: '#34C759', textColor: '#FFFFFF' },
  review: { label: 'À VÉRIFIER', bgColor: '#FF9500', textColor: '#FFFFFF' },
  block: { label: 'BLOQUÉE', bgColor: '#FF3B30', textColor: '#FFFFFF' },
};

/**
 * Get badge configuration for a transaction status
 */
export function getStatusBadge(tx: Transaction): BadgeConfig {
  // Prioritize decision over status
  if (tx.decision === 'review' || tx.status === 'flagged') {
    return DECISION_BADGES.review;
  }

  if (tx.status === 'blocked' || tx.decision === 'block') {
    return STATUS_BADGES.blocked;
  }

  if (tx.status === 'approved' || tx.decision === 'approve') {
    return STATUS_BADGES.approved;
  }

  return STATUS_BADGES[tx.status] || STATUS_BADGES.pending;
}

// --- Risk Reasons Mapping ---

export interface RiskReason {
  code: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

const RISK_REASONS: Record<string, RiskReason> = {
  AMOUNT_HIGH: {
    code: 'R1',
    title: 'Montant élevé',
    description: 'Supérieur à 2500 EPC inhabituel',
    severity: 'high',
  },
  TIME_SUSPICIOUS: {
    code: 'R2',
    title: 'Horaire suspect',
    description: 'Transaction nocturne (00h-06h)',
    severity: 'medium',
  },
  LOCATION_CHANGE: {
    code: 'R3',
    title: 'Changement de lieu',
    description: 'Pays différent dernière transaction',
    severity: 'medium',
  },
  VELOCITY_HIGH: {
    code: 'R4',
    title: 'Fréquence élevée',
    description: '≥ 3 transactions en 5 minutes',
    severity: 'high',
  },
  IP_GEO_MISMATCH: {
    code: 'R5',
    title: 'Localisation incohérente',
    description: 'Écart IP vs Position GPS',
    severity: 'high',
  },
  KYC_EXPIRED: {
    code: 'R6',
    title: 'KYC expiré',
    description: 'Vérification identité expirée',
    severity: 'medium',
  },
  DUPLICATE_REQUEST: {
    code: 'R7',
    title: 'Doublon détecté',
    description: 'Transaction similaire < 2 min',
    severity: 'high',
  },
  CAMPUS_NOT_ALLOWED: {
    code: 'R8',
    title: 'Campus non autorisé',
    description: 'Campus non dans la liste autorisée',
    severity: 'medium',
  },
  SCA_THRESHOLD: {
    code: 'R9',
    title: 'Seuil SCA dépassé',
    description: '> 750 EPC/jour sans authentification forte',
    severity: 'high',
  },
};

/**
 * Get risk reason details from a code
 */
export function getRiskReason(code: string): RiskReason | null {
  return RISK_REASONS[code] || null;
}

/**
 * Get all risk reasons for a transaction
 */
export function getTransactionRisks(tx: Transaction): RiskReason[] {
  if (!tx.reasons_json || !Array.isArray(tx.reasons_json)) {
    return [];
  }

  return tx.reasons_json
    .map(code => getRiskReason(code))
    .filter((reason): reason is RiskReason => reason !== null);
}
