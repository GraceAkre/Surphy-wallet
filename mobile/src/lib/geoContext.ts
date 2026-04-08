import type { User } from './types';

// Merchant IDs synthétiques par type de transaction
// Permet au ML de détecter les doublons (R7) par merchant_id
const MERCHANT_IDS: Record<string, string> = {
  transfer: 'p2p_transfer',
  deposit: 'stripe_deposit',
  campus_contribute: 'campus_pool_contribute',
  campus_distribute: 'campus_pool_distribute',
  admin_deposit: 'campus_admin_deposit',
};

/**
 * Construit le payload pour l'endpoint POST /v1/ml
 * Utilise le campus de l'utilisateur comme city et 'FR' comme country
 */
export function buildMLPayload(
  user: User,
  transactionId: string,
  amount: number,
  txType: string,
) {
  return {
    transaction_id: transactionId,
    user_id: user.id,
    amount,
    currency: 'EPC',
    country: 'FR',
    city: user.campus || 'Paris',
    merchant_id: MERCHANT_IDS[txType] || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

export { MERCHANT_IDS };
