import { supabase } from './supabase';
import type { Transaction, AlertFilter } from './types';

// --- Types ---

export interface AnalystStats {
  totalFlagged: number;
  totalBlocked: number;
  totalToday: number;
  avgScore: number;
}

// --- API Functions ---

/**
 * Récupère les statistiques globales pour le dashboard analyste
 */
export async function getAnalystStats(): Promise<AnalystStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all transactions (analyste voit tout via RLS)
  const { count: totalCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });

  // Flagged = decision review, status flagged, ou score >= 30
  const { count: flaggedCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .or('decision.eq.review,status.eq.flagged,score_ml.gte.30');

  // Blocked = decision block ou status blocked
  const { count: blockedCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .or('decision.eq.block,status.eq.blocked');

  // Transactions traitées aujourd'hui (approved ou blocked, par updated_at)
  const { data: todayData } = await supabase
    .from('transactions')
    .select('score_ml')
    .or('status.eq.approved,status.eq.blocked')
    .gte('updated_at', today.toISOString());

  const totalToday = todayData?.length ?? 0;
  const scored = todayData?.filter((tx) => tx.score_ml !== null) ?? [];
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, tx) => sum + (tx.score_ml ?? 0), 0) / scored.length)
      : 0;

  return {
    totalFlagged: flaggedCount ?? 0,
    totalBlocked: blockedCount ?? 0,
    totalToday,
    avgScore,
  };
}

/**
 * Récupère les dernières transactions pour le dashboard analyste.
 * Affiche toutes les transactions (le ML sera intégré plus tard).
 */
export async function getFlaggedTransactions(limit = 10): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data || [];
}

/**
 * Récupère toutes les transactions avec filtres pour l'écran Alertes
 */
export async function getAllTransactions(
  filter: AlertFilter,
  page = 0,
  pageSize = 20
): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  // Score filter (seulement si score_ml existe)
  if (filter.scoreMin !== undefined) {
    query = query.gte('score_ml', filter.scoreMin);
  }
  if (filter.scoreMax !== undefined) {
    query = query.lte('score_ml', filter.scoreMax);
  }

  // Decision filter
  if (filter.decision && filter.decision !== 'all') {
    query = query.eq('decision', filter.decision);
  }

  // Period filter
  if (filter.period && filter.period !== 'all') {
    const now = new Date();
    let since: Date;
    switch (filter.period) {
      case 'today':
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        since = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        since = new Date(0);
    }
    query = query.gte('created_at', since.toISOString());
  }

  // Search filter (merchant_id)
  if (filter.search) {
    query = query.ilike('merchant_id', `%${filter.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all transactions:', error);
    return [];
  }
  return data || [];
}

/**
 * Récupère une transaction par ID avec ses labels
 */
export async function getTransactionById(
  id: string
): Promise<(Transaction & { labels?: any[] }) | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      labels (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
  return data;
}

/**
 * Crée un label pour une transaction (annotation analyste)
 */
export async function createLabel(data: {
  transaction_id: string;
  label_type: string;
  label_value: string;
  confidence?: string;
  notes?: string;
}): Promise<{ success: boolean; errorMessage: string | null }> {
  // Get current user ID for analyst_id
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { success: false, errorMessage: 'Non authentifié' };
  }

  const { error } = await supabase.from('labels').insert({
    transaction_id: data.transaction_id,
    analyst_id: authData.user.id,
    label_type: data.label_type,
    label_value: data.label_value,
    confidence: data.confidence || 'high',
    notes: data.notes || null,
  });

  if (error) {
    console.error('Error creating label:', error);
    return { success: false, errorMessage: error.message };
  }

  return { success: true, errorMessage: null };
}

/**
 * Met à jour la décision et le statut d'une transaction
 */
export async function updateTransactionDecision(
  id: string,
  decision: string,
  status: string
): Promise<{ success: boolean; errorMessage: string | null }> {
  const { error } = await supabase
    .from('transactions')
    .update({ decision, status })
    .eq('id', id);

  if (error) {
    console.error('Error updating transaction decision:', error);
    return { success: false, errorMessage: error.message };
  }

  return { success: true, errorMessage: null };
}

// =============================================================================
// ML CONFIG
// =============================================================================

export interface MLConfig {
  preset: 'souple' | 'normal' | 'strict';
  threshold_approve: number;
  threshold_block: number;
}

export const ML_PRESETS: Record<string, { threshold_approve: number; threshold_block: number }> = {
  souple: { threshold_approve: 50, threshold_block: 80 },
  normal: { threshold_approve: 30, threshold_block: 70 },
  strict: { threshold_approve: 20, threshold_block: 50 },
};

/**
 * Récupère la configuration ML active
 */
export async function getMLConfig(): Promise<MLConfig> {
  const { data, error } = await supabase.rpc('get_ml_config');

  if (error || !data) {
    console.error('Error fetching ML config:', error);
    return { preset: 'normal', threshold_approve: 30, threshold_block: 70 };
  }

  return data as MLConfig;
}

/**
 * Met à jour la configuration ML (presets Souple/Normal/Strict)
 */
export async function updateMLConfig(
  preset: string,
  thresholdApprove: number,
  thresholdBlock: number,
): Promise<{ success: boolean; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc('update_ml_config', {
    p_preset: preset,
    p_threshold_approve: thresholdApprove,
    p_threshold_block: thresholdBlock,
  });

  if (error) {
    console.error('Error updating ML config:', error);
    return { success: false, errorMessage: error.message };
  }

  return { success: true, errorMessage: null };
}
