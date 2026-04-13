import { Platform } from 'react-native';
import { supabase } from './supabase';

// URL FastAPI : variable d'env (EAS build / prod) ou fallback localhost (Expo Go dev)
export const ML_API_URL = process.env.EXPO_PUBLIC_API_URL
  || (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

export interface MLResult {
  score: number;
  decision: 'approve' | 'review' | 'block';
  reasons: string[];
  reasons_detail: Record<string, unknown>;
}

/**
 * Appelle POST /v1/ml pour scorer une transaction
 * Timeout 3s — retourne null si le serveur est injoignable
 */
export async function scoreTransaction(
  payload: Record<string, unknown>,
): Promise<MLResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${ML_API_URL}/v1/ml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    return {
      score: data.score,
      decision: data.decision,
      reasons: data.reasons,
      reasons_detail: data.reasons_detail,
    };
  } catch (err) {
    console.warn('ML scoring failed (API down?):', err);
    return null;
  }
}

/**
 * Met à jour la transaction en BDD avec le résultat ML via RPC Supabase
 */
export async function applyMLResult(
  transactionId: string,
  country: string,
  city: string,
  merchantId: string,
  result: MLResult,
): Promise<void> {
  const statusMap: Record<string, string> = {
    approve: 'approved',
    review: 'flagged',
    block: 'blocked',
  };
  const newStatus = statusMap[result.decision] || 'approved';

  const { error } = await supabase.rpc('update_transaction_ml_result', {
    p_transaction_id: transactionId,
    p_country: country,
    p_city: city,
    p_merchant_id: merchantId,
    p_score_ml: result.score,
    p_decision: result.decision,
    p_reasons_json: result.reasons,
    p_reasons_detail: result.reasons_detail,
    p_new_status: newStatus,
  });

  if (error) {
    console.warn('Failed to update transaction ML result:', error.message);
  }
}
