// Services API pour fetcher les données depuis Supabase
import { supabase } from './supabase';
import type { User, Wallet, Transaction, Peer, CardDetails, MoneyRequest, CampusWallet } from './types';
import { buildMLPayload } from './geoContext';
import { scoreTransaction, applyMLResult, ML_API_URL } from './mlClient';

/**
 * Score une transaction via le moteur ML et met à jour la BDD
 * Silencieux en cas d'erreur — ne bloque jamais le flux principal
 */
async function scoreAndUpdate(
  transactionId: string,
  amount: number,
  txType: string,
  user: User,
): Promise<void> {
  try {
    const payload = buildMLPayload(user, transactionId, amount, txType);
    const result = await scoreTransaction(payload);
    if (result) {
      await applyMLResult(
        transactionId,
        payload.country,
        payload.city,
        payload.merchant_id,
        result,
      );
    }
  } catch (err) {
    console.warn('ML scoring skipped:', err);
  }
}

/**
 * Récupère l'utilisateur courant via Supabase Auth
 * Crée automatiquement l'entrée dans la table users si elle n'existe pas
 */
export async function getCurrentUser(): Promise<User | null> {
  // 1. Récupérer l'utilisateur authentifié via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    console.log('No authenticated user');
    return null;
  }

  const authUser = authData.user;
  const authEmail = authUser.email;
  if (!authEmail) {
    console.error('No email in auth user');
    return null;
  }

  // 2. Chercher l'utilisateur dans notre table users par email
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', authEmail)
    .single();

  if (error && error.code === 'PGRST116') {
    // L'utilisateur n'existe pas dans la table users, le créer
    console.log('Creating user in users table...');
    const newUser = await createUserFromAuth(authUser.id, authEmail);
    return newUser;
  }

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

/**
 * Crée un utilisateur dans la table users à partir des données auth
 */
async function createUserFromAuth(authId: string, email: string): Promise<User | null> {
  // Vérifier que l'email est @epitech.digital
  if (!email.endsWith('@epitech.digital')) {
    console.error('Inscription refusée : seuls les emails @epitech.digital sont autorisés');
    return null;
  }

  // Extraire le prénom/nom depuis l'email (prenom.nom@epitech.digital)
  const emailPrefix = email.split('@')[0];
  const parts = emailPrefix.split('.');
  const firstname = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
  const lastname = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';

  // Créer l'utilisateur avec le même ID que auth.uid()
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: authId,
      email: email,
      firstname: firstname,
      lastname: lastname,
      campus: 'Paris', // Campus par défaut
      kyc_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // KYC valide 1 an
      kyc_verified_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  // Créer aussi un wallet par défaut (campus principal)
  const walletInsert = await supabase
    .from('wallets')
    .insert({
      user_id: authId,
      campus: 'Paris',
      currency: 'EPC',
      balance: 500.00,
      status: 'active',
    });

  // Fallback sans campus (colonne pas encore migrée)
  if (walletInsert.error?.code === '42703') {
    await supabase
      .from('wallets')
      .insert({
        user_id: authId,
        currency: 'EPC',
        balance: 500.00,
        status: 'active',
      });
  }

  console.log('User and wallet created successfully');
  return data;
}

/**
 * Récupère un utilisateur par défaut (pour le dev/démo)
 */
async function getDefaultUser(): Promise<User | null> {
  // Essayer de récupérer Jordan ou le premier utilisateur disponible
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or('email.eq.jordan.josub@epitech.digital,email.eq.grace.akre@epitech.digital')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching default user:', error);
    // Dernier recours : premier utilisateur de la table
    const { data: firstUser } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();
    return firstUser;
  }

  return data;
}

/**
 * Récupère tous les utilisateurs sauf l'utilisateur courant
 * Utilisé pour le sélecteur de destinataire dans les virements
 */
export async function getAllUsers(excludeId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', excludeId)
    .like('email', '%@epitech.digital')
    .order('firstname');

  if (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
  return data || [];
}

/**
 * Récupère un utilisateur par son ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return data;
}

/**
 * Récupère le wallet principal d'un utilisateur (campus principal)
 * Crée automatiquement un wallet s'il n'existe pas
 */
export async function getUserWallet(userId: string): Promise<Wallet | null> {
  // Récupérer le campus principal de l'utilisateur
  const { data: userData } = await supabase
    .from('users')
    .select('campus')
    .eq('id', userId)
    .single();

  const userCampus = userData?.campus || 'Paris';

  // Essayer avec filtre campus
  let { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .eq('campus', userCampus)
    .eq('status', 'active')
    .single();

  // Fallback sans filtre campus (colonne pas encore migrée)
  if (error && error.code === '42703') {
    ({ data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single());
  }

  if (error && error.code === 'PGRST116') {
    // Wallet n'existe pas, le créer
    console.log('Creating wallet for user...');
    const newWallet = await createWalletForUser(userId, userCampus);
    return newWallet;
  }

  if (error) {
    console.error('Error fetching wallet:', error);
    return null;
  }
  return data;
}

/**
 * Crée un wallet pour un utilisateur
 * Si campus n'est pas fourni, utilise le campus principal de l'utilisateur
 */
async function createWalletForUser(userId: string, campus?: string): Promise<Wallet | null> {
  // Résoudre le campus si non fourni
  if (!campus) {
    const { data: userData } = await supabase
      .from('users')
      .select('campus')
      .eq('id', userId)
      .single();
    campus = userData?.campus || 'Paris';
  }

  // Essayer avec campus
  let { data, error } = await supabase
    .from('wallets')
    .insert({
      user_id: userId,
      campus,
      currency: 'EPC',
      balance: 500.00,
      status: 'active',
    })
    .select()
    .single();

  // Fallback sans campus (colonne pas encore migrée)
  if (error && error.code === '42703') {
    ({ data, error } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        currency: 'EPC',
        balance: 500.00,
        status: 'active',
      })
      .select()
      .single());
  }

  if (error) {
    console.error('Error creating wallet:', error);
    return null;
  }

  console.log('Wallet created successfully:', data);
  return data;
}

/**
 * Récupère les transactions d'un utilisateur
 */
export async function getUserTransactions(
  userId: string,
  options?: {
    limit?: number;
    status?: string;
    decision?: string;
  }
): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.decision) {
    query = query.eq('decision', options.decision);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data || [];
}

/**
 * Récupère une transaction par son ID
 */
export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
  return data;
}

/**
 * Récupère tous les peers (campus) actifs
 */
export async function getActivePeers(): Promise<Peer[]> {
  const { data, error } = await supabase
    .from('peers')
    .select('*')
    .eq('status', 'active')
    .order('campus_name');

  if (error) {
    console.error('Error fetching peers:', error);
    return [];
  }
  return data || [];
}

/**
 * Récupère tous les peers (tous statuts)
 */
export async function getAllPeers(): Promise<Peer[]> {
  const { data, error } = await supabase
    .from('peers')
    .select('*')
    .order('campus_name');

  if (error) {
    console.error('Error fetching peers:', error);
    return [];
  }
  return data || [];
}

/**
 * Récupère les peers externes (autres groupes Epitech avec API intercampus)
 */
export async function getExternalPeers(): Promise<Peer[]> {
  const { data, error } = await supabase
    .from('peers')
    .select('*')
    .eq('status', 'active')
    .eq('is_external', true)
    .order('campus_name');

  if (error) {
    console.error('Error fetching external peers:', error);
    return [];
  }
  return data || [];
}

/**
 * Recherche un utilisateur sur un campus externe via /lookup-user
 */
export async function lookupExternalUser(
  peerBaseUrl: string,
  apiKey: string,
  email: string,
): Promise<{ success: boolean; user_id?: string; full_name?: string; campus?: string; message?: string }> {
  try {
    const response = await fetch(`${peerBaseUrl}/lookup-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, email }),
    });
    return await response.json();
  } catch (err) {
    console.error('Lookup external user failed:', err);
    return { success: false, message: 'Impossible de contacter le campus distant.' };
  }
}

/**
 * Envoie un transfert intercampus via notre API FastAPI /intercampus-send
 */
export async function sendIntercampusTransfer(params: {
  sourceWalletId: string;
  destinationWalletId: string;
  destinationCampusApiUrl: string;
  destinationApiKey: string;
  destinationUserId: string;
  amount: number;
  currency?: string;
  description?: string;
}): Promise<{ success: boolean; status?: string; message?: string; transaction_id?: string; new_balance?: number }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, message: 'Non authentifié' };
    }

    const response = await fetch(`${ML_API_URL}/intercampus-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        source_wallet_id: params.sourceWalletId,
        destination_wallet_id: params.destinationWalletId,
        destination_campus_api_url: params.destinationCampusApiUrl,
        destination_api_key: params.destinationApiKey,
        destination_user_id: params.destinationUserId,
        amount: params.amount,
        currency: params.currency || 'EPC',
        description: params.description,
      }),
    });

    return await response.json();
  } catch (err) {
    console.error('Intercampus send failed:', err);
    return { success: false, message: 'Erreur lors du transfert intercampus.' };
  }
}

/**
 * Calcule les stats mensuelles pour un utilisateur
 */
export async function getMonthlyStats(userId: string): Promise<{
  expenses: number;
  income: number;
  balance: number;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, direction, status')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())
    .in('status', ['approved', 'pending']);

  if (error) {
    console.error('Error fetching monthly stats:', error);
    return { expenses: 0, income: 0, balance: 0 };
  }

  let expenses = 0;
  let income = 0;

  (data || []).forEach((tx) => {
    if (tx.direction === 'outgoing') {
      expenses += tx.amount;
    } else {
      income += tx.amount;
    }
  });

  return {
    expenses,
    income,
    balance: income - expenses,
  };
}

/**
 * Vérifie s'il y a des transactions suspectes (en review)
 */
export async function hasSuspiciousTransactions(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('decision', 'review')
    .limit(1);

  if (error) {
    console.error('Error checking suspicious transactions:', error);
    return false;
  }
  return (data || []).length > 0;
}

/**
 * Récupère la première transaction suspecte
 */
export async function getFirstSuspiciousTransaction(userId: string): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('decision', 'review')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }
  return data;
}

/**
 * Effectue un virement atomique entre deux utilisateurs via la RPC Supabase
 * La résolution du wallet destinataire se fait côté serveur (SECURITY DEFINER)
 * pour éviter les blocages RLS
 */
export async function transferFunds(
  fromWalletId: string,
  toUserId: string,
  amount: number,
  user?: User,
): Promise<{ success: boolean; transactionId: string | null; errorMessage: string | null }> {
  // 1. Générer un request_id unique (idempotence)
  const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

  // 2. Appeler la RPC transfer_funds (résout le wallet destinataire côté serveur)
  const { data, error } = await supabase.rpc('transfer_funds', {
    p_from_wallet_id: fromWalletId,
    p_to_user_id: toUserId,
    p_amount: amount,
    p_request_id: requestId,
  });

  if (error) {
    console.error('Transfer RPC error:', error);
    return { success: false, transactionId: null, errorMessage: error.message };
  }

  const result = data as { success: boolean; transaction_id: string | null; error_message: string | null };

  // 3. Scoring ML (silencieux)
  if (result.success && result.transaction_id && user) {
    await scoreAndUpdate(result.transaction_id, amount, 'transfer', user);
  }

  return {
    success: result.success,
    transactionId: result.transaction_id,
    errorMessage: result.error_message,
  };
}

/**
 * Génère les détails de carte de manière déterministe à partir du wallet et user
 * Les données sont générées (pas stockées en BDD) mais consistantes pour chaque utilisateur
 */
export function generateCardDetails(wallet: Wallet, user: User): CardDetails {
  // Générer un numéro de carte unique basé sur l'ID du wallet
  const walletIdNum = wallet.id.replace(/-/g, '').substring(0, 12);
  const cardDigits = [];
  for (let i = 0; i < 12; i++) {
    const charCode = walletIdNum.charCodeAt(i) || 48;
    cardDigits.push(charCode % 10);
  }

  // Format: 4973 XXXX XXXX XXXX (4973 = préfixe Surphy)
  const cardNumber = `4973 ${cardDigits.slice(0, 4).join('')} ${cardDigits.slice(4, 8).join('')} ${cardDigits.slice(8, 12).join('')}`;
  const maskedNumber = `4973 **** **** ${cardDigits.slice(8, 12).join('')}`;

  // Générer CVV (3 chiffres) basé sur l'ID
  const cvvBase = wallet.id.replace(/-/g, '').substring(0, 3);
  const cvv = String(
    (cvvBase.charCodeAt(0) % 10) * 100 +
    (cvvBase.charCodeAt(1) % 10) * 10 +
    (cvvBase.charCodeAt(2) % 10)
  ).padStart(3, '0');

  // Générer date d'expiration (basée sur la date de création + 4 ans)
  const createdDate = new Date(wallet.created_at);
  const expiryDate = new Date(createdDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 4);
  const expiryMonth = String(expiryDate.getMonth() + 1).padStart(2, '0');
  const expiryYear = String(expiryDate.getFullYear()).slice(-2);
  const expiry = `${expiryMonth}/${expiryYear}`;

  // Extraire NOM PRENOM depuis l'email (prenom.nom@domain -> NOM PRENOM)
  const emailPrefix = user.email.split('@')[0];
  const parts = emailPrefix.split('.');
  const firstName = parts[0] ? parts[0].toUpperCase() : '';
  const lastName = parts[1] ? parts[1].toUpperCase() : '';
  const holder = `${lastName} ${firstName}`.trim();

  return {
    number: cardNumber,
    maskedNumber,
    expiry,
    cvv,
    holder,
  };
}

/**
 * Effectue un dépôt (simulation Stripe) via la RPC Supabase
 * Crédite le wallet et crée une transaction de type deposit
 */
export async function depositFunds(
  walletId: string,
  amount: number,
  user?: User,
): Promise<{ success: boolean; transactionId: string | null; errorMessage: string | null }> {
  // Générer un request_id unique (idempotence)
  const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

  const { data, error } = await supabase.rpc('deposit_funds', {
    p_wallet_id: walletId,
    p_amount: amount,
    p_request_id: requestId,
  });

  if (error) {
    console.error('Deposit RPC error:', error);
    return { success: false, transactionId: null, errorMessage: error.message };
  }

  const result = data as { success: boolean; transaction_id: string | null; error_message: string | null };

  // Scoring ML (silencieux)
  if (result.success && result.transaction_id && user) {
    await scoreAndUpdate(result.transaction_id, amount, 'deposit', user);
  }

  return {
    success: result.success,
    transactionId: result.transaction_id,
    errorMessage: result.error_message,
  };
}

/**
 * Met à jour le profil d'un utilisateur (campus, prénom, nom, avatar)
 */
export async function updateUserProfile(
  userId: string,
  data: { firstname?: string; lastname?: string; campus?: string; avatar_url?: string | null }
): Promise<{ success: boolean; errorMessage: string | null }> {
  const { error } = await supabase
    .from('users')
    .update(data)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    return { success: false, errorMessage: error.message };
  }

  return { success: true, errorMessage: null };
}

/**
 * Upload un avatar utilisateur vers Supabase Storage
 * Écrase l'ancien fichier s'il existe (upsert)
 */
export async function uploadAvatar(
  userId: string,
  imageUri: string
): Promise<{ success: boolean; avatarUrl: string | null; errorMessage: string | null }> {
  try {
    // Fetch le fichier local comme blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const filePath = `${userId}.jpg`;

    // Upload vers le bucket "avatars" (upsert pour écraser l'ancien)
    const { error: uploadError } = await supabase.storage
      .from('Avatars')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return { success: false, avatarUrl: null, errorMessage: uploadError.message };
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('Avatars')
      .getPublicUrl(filePath);

    // Cache-buster pour éviter le cache image
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Sauvegarder l'URL dans la table users
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Avatar URL update error:', updateError);
      return { success: false, avatarUrl: null, errorMessage: updateError.message };
    }

    return { success: true, avatarUrl: publicUrl, errorMessage: null };
  } catch (error) {
    console.error('Avatar upload exception:', error);
    return { success: false, avatarUrl: null, errorMessage: 'Erreur lors de l\'upload' };
  }
}

/**
 * Supprime l'avatar d'un utilisateur (Storage + DB)
 */
export async function deleteAvatar(
  userId: string
): Promise<{ success: boolean; errorMessage: string | null }> {
  try {
    // Supprimer le fichier du Storage
    const { error: deleteError } = await supabase.storage
      .from('Avatars')
      .remove([`${userId}.jpg`]);

    if (deleteError) {
      console.error('Avatar delete error:', deleteError);
      // On continue quand même pour nettoyer la DB
    }

    // Mettre avatar_url à null dans la table users
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: null })
      .eq('id', userId);

    if (updateError) {
      console.error('Avatar URL reset error:', updateError);
      return { success: false, errorMessage: updateError.message };
    }

    return { success: true, errorMessage: null };
  } catch (error) {
    console.error('Avatar delete exception:', error);
    return { success: false, errorMessage: 'Erreur lors de la suppression' };
  }
}

/**
 * Crée une demande d'argent (money request) vers un autre utilisateur
 */
export async function createMoneyRequest(
  requesterId: string,
  targetId: string,
  amount: number,
  message?: string
): Promise<{ success: boolean; errorMessage: string | null }> {
  const { error } = await supabase
    .from('money_requests')
    .insert({
      requester_id: requesterId,
      target_id: targetId,
      amount,
      currency: 'EPC',
      message: message || null,
    });

  if (error) {
    console.error('Error creating money request:', error);
    return { success: false, errorMessage: error.message };
  }

  return { success: true, errorMessage: null };
}

/**
 * Accepte une demande d'argent : effectue le virement puis met à jour le statut
 */
export async function acceptMoneyRequest(
  requestId: string,
  fromWalletId: string,
  toUserId: string,
  amount: number,
  user?: User,
): Promise<{ success: boolean; transactionId: string | null; errorMessage: string | null }> {
  // 1. Effectuer le virement (avec scoring ML si user fourni)
  const transferResult = await transferFunds(fromWalletId, toUserId, amount, user);

  if (!transferResult.success) {
    return transferResult;
  }

  // 2. Mettre à jour le statut de la demande
  await supabase
    .from('money_requests')
    .update({ status: 'fulfilled' })
    .eq('id', requestId);

  return transferResult;
}

/**
 * Refuse une demande d'argent
 */
export async function declineMoneyRequest(requestId: string): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('money_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);

  if (error) {
    console.error('Error declining money request:', error);
    return { success: false };
  }

  return { success: true };
}

/**
 * Récupère les demandes d'argent reçues par un utilisateur
 * Par défaut ne retourne que les pending, mais on peut filtrer par statut
 */
export async function getMoneyRequestsForUser(
  userId: string,
  status: 'pending' | 'declined' | 'fulfilled' | 'all' = 'pending'
): Promise<MoneyRequest[]> {
  let query = supabase
    .from('money_requests')
    .select(`
      *,
      requester:users!money_requests_requester_id_fkey (
        firstname,
        lastname,
        email
      )
    `)
    .eq('target_id', userId)
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching money requests:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    requester_id: item.requester_id,
    target_id: item.target_id,
    amount: item.amount,
    currency: item.currency,
    status: item.status,
    message: item.message,
    created_at: item.created_at,
    updated_at: item.updated_at,
    requester_name: item.requester
      ? `${item.requester.firstname ?? ''} ${item.requester.lastname ?? ''}`.trim()
      : 'Utilisateur',
    requester_email: item.requester?.email ?? '',
  }));
}

/**
 * Exporte toutes les données personnelles de l'utilisateur (RGPD)
 * Appelle la RPC SECURITY DEFINER qui utilise auth.uid()
 */
export async function exportMyData(): Promise<{
  success: boolean;
  data: Record<string, unknown> | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase.rpc('export_my_data');

  if (error) {
    console.error('Export data RPC error:', error);
    return { success: false, data: null, errorMessage: error.message };
  }

  return { success: true, data: data as Record<string, unknown>, errorMessage: null };
}

/**
 * Supprime définitivement le compte et toutes les données associées (RGPD)
 * Appelle la RPC SECURITY DEFINER qui utilise auth.uid()
 */
export async function deleteMyAccount(): Promise<{
  success: boolean;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase.rpc('delete_my_account');

  if (error) {
    console.error('Delete account RPC error:', error);
    return { success: false, errorMessage: error.message };
  }

  const result = data as { success: boolean; error_message: string | null };

  return {
    success: result.success,
    errorMessage: result.error_message,
  };
}

/**
 * Dépôt admin direct sur le pot commun campus (carte bancaire → campus_wallet)
 * Seul un admin_campus peut appeler cette fonction
 */
export async function adminDepositToCampus(
  campusName: string,
  amount: number,
  user?: User,
): Promise<{ success: boolean; transactionId: string | null; errorMessage: string | null }> {
  const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

  const { data, error } = await supabase.rpc('admin_deposit_to_campus', {
    p_campus_name: campusName,
    p_amount: amount,
    p_request_id: requestId,
  });

  if (error) {
    console.error('Admin deposit to campus RPC error:', error);
    return { success: false, transactionId: null, errorMessage: error.message };
  }

  const result = data as { success: boolean; transaction_id: string | null; error_message: string | null };

  // Scoring ML (silencieux)
  if (result.success && result.transaction_id && user) {
    await scoreAndUpdate(result.transaction_id, amount, 'admin_deposit', user);
  }

  return {
    success: result.success,
    transactionId: result.transaction_id,
    errorMessage: result.error_message,
  };
}

/**
 * Verrouille ou déverrouille un wallet (status frozen/active)
 */
export async function toggleWalletLock(
  walletId: string,
  lock: boolean
): Promise<{ success: boolean; errorMessage: string | null }> {
  const newStatus = lock ? 'frozen' : 'active';

  const { error } = await supabase
    .from('wallets')
    .update({ status: newStatus })
    .eq('id', walletId);

  if (error) {
    console.error('Error toggling wallet lock:', error);
    return { success: false, errorMessage: error.message };
  }

  return { success: true, errorMessage: null };
}

/**
 * Récupère tous les wallets actifs d'un utilisateur (tous campus)
 */
export async function getUserCampusWallets(userId: string): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at');

  if (error) {
    console.error('Error fetching campus wallets:', error);
    return [];
  }
  return data || [];
}

/**
 * Crée ou réactive un wallet pour un campus partenaire (solde initial 0 EPC)
 * Si un wallet fermé existe déjà pour ce campus, le réactive
 */
export async function createCampusWallet(
  userId: string,
  campusName: string
): Promise<{ success: boolean; wallet: Wallet | null; errorMessage: string | null }> {
  // Vérifier s'il existe un wallet fermé pour ce campus (réactivation après toggle OFF/ON)
  const { data: existing } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .eq('campus', campusName)
    .eq('status', 'closed')
    .single();

  if (existing) {
    // Réactiver le wallet existant
    const { data, error } = await supabase
      .from('wallets')
      .update({ status: 'active' })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error reactivating campus wallet:', error);
      return { success: false, wallet: null, errorMessage: error.message };
    }
    return { success: true, wallet: data, errorMessage: null };
  }

  // Sinon créer un nouveau wallet
  const { data, error } = await supabase
    .from('wallets')
    .insert({
      user_id: userId,
      campus: campusName,
      currency: 'EPC',
      balance: 0,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating campus wallet:', error);
    return { success: false, wallet: null, errorMessage: error.message };
  }

  return { success: true, wallet: data, errorMessage: null };
}

/**
 * Désactive un wallet campus (met status = 'closed')
 * Refuse si le solde est > 0
 */
export async function deactivateCampusWallet(
  walletId: string
): Promise<{ success: boolean; errorMessage: string | null }> {
  // Vérifier le solde
  const { data: wallet, error: fetchError } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', walletId)
    .single();

  if (fetchError) {
    console.error('Error fetching wallet for deactivation:', fetchError);
    return { success: false, errorMessage: fetchError.message };
  }

  if (wallet && wallet.balance > 0) {
    return {
      success: false,
      errorMessage: `Impossible de désactiver : solde restant de ${wallet.balance} EPC. Transférez vos fonds avant de désactiver.`,
    };
  }

  const { error } = await supabase
    .from('wallets')
    .update({ status: 'closed' })
    .eq('id', walletId);

  if (error) {
    console.error('Error deactivating campus wallet:', error);
    return { success: false, errorMessage: error.message };
  }

  return { success: true, errorMessage: null };
}

// =============================================================================
// Campus Wallets (Pot Commun)
// =============================================================================

/**
 * Récupère les 3 campus wallets (pots communs)
 */
export async function getCampusWallets(): Promise<CampusWallet[]> {
  const { data, error } = await supabase
    .from('campus_wallets')
    .select('*')
    .order('campus_name');

  if (error) {
    // PGRST205 = table not found — silently return empty (table not yet created)
    if (error.code !== 'PGRST205') {
      console.error('Error fetching campus wallets:', error);
    }
    return [];
  }
  return data || [];
}

/**
 * Contribue au pot commun d'un campus (tout user authentifié)
 * Débite le wallet perso, crédite le campus_wallet
 */
export async function contributeToCampusWallet(
  fromWalletId: string,
  campusName: string,
  amount: number,
  user?: User,
): Promise<{ success: boolean; transactionId: string | null; errorMessage: string | null }> {
  const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

  const { data, error } = await supabase.rpc('contribute_to_campus_wallet', {
    p_from_wallet_id: fromWalletId,
    p_campus_name: campusName,
    p_amount: amount,
    p_request_id: requestId,
  });

  if (error) {
    console.error('Contribute RPC error:', error);
    return { success: false, transactionId: null, errorMessage: error.message };
  }

  const result = data as { success: boolean; transaction_id: string | null; error_message: string | null };

  // Scoring ML (silencieux)
  if (result.success && result.transaction_id && user) {
    await scoreAndUpdate(result.transaction_id, amount, 'campus_contribute', user);
  }

  return { success: result.success, transactionId: result.transaction_id, errorMessage: result.error_message };
}

/**
 * Redistribue depuis le pot commun vers un user (admin campus uniquement)
 * Débite le campus_wallet, crédite le wallet du destinataire
 */
export async function distributeFromCampusWallet(
  campusName: string,
  toUserId: string,
  amount: number,
  user?: User,
): Promise<{ success: boolean; transactionId: string | null; errorMessage: string | null }> {
  const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

  const { data, error } = await supabase.rpc('distribute_from_campus_wallet', {
    p_campus_name: campusName,
    p_to_user_id: toUserId,
    p_amount: amount,
    p_request_id: requestId,
  });

  if (error) {
    console.error('Distribute RPC error:', error);
    return { success: false, transactionId: null, errorMessage: error.message };
  }

  const result = data as { success: boolean; transaction_id: string | null; error_message: string | null };

  // Scoring ML (silencieux)
  if (result.success && result.transaction_id && user) {
    await scoreAndUpdate(result.transaction_id, amount, 'campus_distribute', user);
  }

  return { success: result.success, transactionId: result.transaction_id, errorMessage: result.error_message };
}

/**
 * Récupère les utilisateurs d'un campus (pour la redistribution admin)
 * Exclut l'admin lui-même
 */
export async function getUsersByCampus(campusName: string, excludeId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('campus', campusName)
    .neq('id', excludeId)
    .like('email', '%@epitech.digital')
    .order('firstname');

  if (error) {
    console.error('Error fetching users by campus:', error);
    return [];
  }
  return data || [];
}
