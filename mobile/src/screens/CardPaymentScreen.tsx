import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  User,
  ChevronRight,
  ShieldCheck,
  X,
  Search,
  ArrowDownLeft,
  Check,
  Building2,
  Globe,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Components
import { Card } from '../components/ui';
import { Avatar } from '../components/ui/Avatar';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency, formatAmountInput } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// API
import { getAllUsers, getCurrentUser, getUserWallet, transferFunds, getMoneyRequestsForUser, acceptMoneyRequest, declineMoneyRequest, getExternalPeers, lookupExternalUser, sendIntercampusTransfer } from '../lib/api';
import type { User as UserType, MoneyRequest, Peer } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  Home: undefined;
  CardPayment: undefined;
  TransferSuccess: { amount: string; recipient: string; transactionId: string };
};

type CardPaymentScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CardPayment'>;
};

type SelectedRecipient = {
  id: string;
  name: string;
  email: string;
  isExternal?: boolean;
  peer?: Peer;
  externalUserId?: string;
};

export default function CardPaymentScreen({ navigation }: CardPaymentScreenProps) {
  const { light, success } = useHaptics();

  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<SelectedRecipient | null>(null);
  const [balance, setBalance] = useState(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  // External peers state
  const [externalPeers, setExternalPeers] = useState<Peer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [externalEmail, setExternalEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ user_id: string; full_name: string; campus: string } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Money request popup state
  const [pendingRequests, setPendingRequests] = useState<MoneyRequest[]>([]);
  const [requestPopupVisible, setRequestPopupVisible] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<MoneyRequest | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  // Fetch current user, wallet, pending requests and external peers on mount
  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUser(user);
        const [wallet, requests, peers] = await Promise.all([
          getUserWallet(user.id),
          getMoneyRequestsForUser(user.id),
          getExternalPeers(),
        ]);
        if (wallet) {
          setBalance(wallet.balance);
          setWalletId(wallet.id);
        }
        if (requests.length > 0) {
          setPendingRequests(requests);
          setCurrentRequest(requests[0]);
          setRequestPopupVisible(true);
        }
        setExternalPeers(peers);
      }
    }
    loadData();
  }, []);

  // Fetch all users when modal opens
  useEffect(() => {
    if (modalVisible && currentUserId) {
      setUsersLoading(true);
      getAllUsers(currentUserId).then((users) => {
        setAllUsers(users);
        setUsersLoading(false);
      });
    }
  }, [modalVisible, currentUserId]);

  // Filtered users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers;
    const q = searchQuery.toLowerCase();
    return allUsers.filter(
      (u) =>
        `${u.firstname ?? ''} ${u.lastname ?? ''}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [allUsers, searchQuery]);

  // Validation
  const numericAmount = parseFloat(amount.replace(',', '.'));
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= balance;
  const isValid = recipient !== null && isValidAmount;

  // Handlers
  const handleAmountChange = (text: string) => {
    const formatted = formatAmountInput(text);
    setAmount(formatted);
  };

  const handleSelectRecipient = () => {
    light();
    if (recipient) {
      setRecipient(null);
      setSelectedPeer(null);
      setLookupResult(null);
      setLookupError(null);
      setExternalEmail('');
    } else {
      setSearchQuery('');
      setModalVisible(true);
    }
  };

  const handlePickUser = (user: UserType) => {
    light();
    setRecipient({
      id: user.id,
      name: `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || user.email.split('@')[0],
      email: user.email,
    });
    setSelectedPeer(null);
    setLookupResult(null);
    setLookupError(null);
    setExternalEmail('');
    setModalVisible(false);
  };

  const handlePickExternalPeer = (peer: Peer) => {
    light();
    setSelectedPeer(peer);
    setLookupResult(null);
    setLookupError(null);
    setExternalEmail('');
    setModalVisible(false);
  };

  const handleLookupExternalUser = async () => {
    if (!selectedPeer || !externalEmail.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    const result = await lookupExternalUser(
      selectedPeer.base_url,
      selectedPeer.api_key_hash || '',
      externalEmail.trim(),
    );

    if (result.success && result.user_id) {
      setLookupResult({
        user_id: result.user_id,
        full_name: result.full_name || externalEmail,
        campus: result.campus || selectedPeer.campus_name,
      });
      setRecipient({
        id: result.user_id,
        name: result.full_name || externalEmail,
        email: externalEmail,
        isExternal: true,
        peer: selectedPeer,
        externalUserId: result.user_id,
      });
    } else {
      setLookupError(result.message || 'Utilisateur non trouvé sur ce campus.');
    }
    setLookupLoading(false);
  };

  const handleSend = async () => {
    if (!isValid || !walletId || !recipient) return;

    setIsLoading(true);
    light();

    try {
      // Transfert intercampus (groupe externe)
      if (recipient.isExternal && recipient.peer && recipient.externalUserId) {
        const result = await sendIntercampusTransfer({
          sourceWalletId: walletId,
          destinationWalletId: recipient.peer.wallet_id || '',
          destinationCampusApiUrl: recipient.peer.base_url,
          destinationApiKey: recipient.peer.api_key_hash || '',
          destinationUserId: recipient.externalUserId,
          amount: numericAmount,
        });

        if (result.success && result.transaction_id) {
          success();
          navigation.navigate('TransferSuccess', {
            amount: amount,
            recipient: recipient.name,
            transactionId: result.transaction_id,
          });
        } else {
          Alert.alert('Échec du transfert', result.message || 'Une erreur est survenue.');
        }
      } else {
        // Transfert interne classique
        const result = await transferFunds(walletId, recipient.id, numericAmount, currentUser || undefined);

        if (result.success && result.transactionId) {
          success();
          navigation.navigate('TransferSuccess', {
            amount: amount,
            recipient: recipient.name,
            transactionId: result.transactionId,
          });
        } else {
          Alert.alert('Échec du virement', result.errorMessage || 'Une erreur est survenue.');
        }
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de contacter le serveur. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!currentRequest || !walletId) return;
    setRequestLoading(true);
    try {
      const result = await acceptMoneyRequest(
        currentRequest.id,
        walletId,
        currentRequest.requester_id,
        currentRequest.amount,
        currentUser || undefined,
      );
      if (result.success) {
        success();
        Alert.alert('Virement effectué', `${formatCurrency(currentRequest.amount)} envoyé à ${currentRequest.requester_name}.`);
        // Refresh balance
        if (currentUserId) {
          const wallet = await getUserWallet(currentUserId);
          if (wallet) setBalance(wallet.balance);
        }
      } else {
        Alert.alert('Erreur', result.errorMessage || 'Impossible d\'effectuer le virement.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setRequestLoading(false);
      showNextRequest();
    }
  };

  const handleDeclineRequest = async () => {
    if (!currentRequest) return;
    setRequestLoading(true);
    try {
      await declineMoneyRequest(currentRequest.id);
      light();
    } catch {
      // Silently handle
    } finally {
      setRequestLoading(false);
      showNextRequest();
    }
  };

  const showNextRequest = () => {
    const remaining = pendingRequests.filter((r) => r.id !== currentRequest?.id);
    setPendingRequests(remaining);
    if (remaining.length > 0) {
      setCurrentRequest(remaining[0]);
    } else {
      setCurrentRequest(null);
      setRequestPopupVisible(false);
    }
  };

  const renderUserItem = ({ item }: { item: UserType }) => (
    <Pressable
      onPress={() => handlePickUser(item)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      className="flex-row items-center px-5 py-3.5"
    >
      <Avatar size="md" name={`${item.firstname ?? ''} ${item.lastname ?? ''}`.trim()} />
      <View className="ml-3 flex-1">
        <Text className="text-body text-ink-primary font-semibold">
          {`${item.firstname ?? ''} ${item.lastname ?? ''}`.trim() || 'Utilisateur'}
        </Text>
        <Text className="text-footnote text-ink-tertiary">
          {item.email}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-screen pt-2 pb-4">
        <Pressable onPress={() => navigation.goBack()} className="mb-4 w-11 h-11 justify-center">
          <ChevronLeft color="#1D1D1F" size={28} />
        </Pressable>
        <Text className="text-largeTitle text-ink-primary">
          Faire un virement
        </Text>
        <Text className="text-subheadline text-ink-secondary mt-2">
          Envoyez de l'argent entre étudiants en toute sécurité.
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Balance Card */}
          <Card variant="elevated" padding="lg" className="mb-6 mt-4">
            <Text className="text-footnote text-ink-tertiary mb-2">
              Solde disponible
            </Text>
            <Text className="text-largeTitle text-ink-primary">
              {formatCurrency(balance)}
            </Text>
          </Card>

          {/* Recipient Selector */}
          <Text className="text-headline text-ink-secondary mb-4 ml-1">
            Destinataire
          </Text>

          <Pressable
            onPress={handleSelectRecipient}
            style={({ pressed }) => [
              shadows.card,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            className={`
              bg-surface rounded-2xl p-4 mb-6 border-2
              flex-row items-center justify-between h-20
              ${recipient ? 'border-primary bg-primary-50' : 'border-separator-opaque'}
            `}
          >
            {recipient ? (
              <>
                <View className="flex-row items-center gap-3">
                  {recipient.isExternal ? (
                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                      <Globe size={20} color="#3B82F6" />
                    </View>
                  ) : (
                    <Avatar size="md" name={recipient.name} />
                  )}
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-headline text-ink-primary">
                        {recipient.name}
                      </Text>
                      {recipient.isExternal && (
                        <View className="bg-blue-100 rounded-full px-2 py-0.5">
                          <Text className="text-caption2 text-primary font-semibold">EXTERNE</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-footnote text-ink-tertiary">
                      {recipient.email}
                    </Text>
                  </View>
                </View>
                <View className="bg-background rounded-full p-1">
                  <X size={16} color="#6E6E73" />
                </View>
              </>
            ) : (
              <>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-background rounded-full items-center justify-center border border-separator-opaque border-dashed">
                    <User size={20} color="#6E6E73" />
                  </View>
                  <Text className="text-body text-ink-secondary font-medium">
                    Sélectionner un destinataire
                  </Text>
                </View>
                <ChevronRight size={20} color="#86868B" />
              </>
            )}
          </Pressable>

          {/* External peer lookup — email input */}
          {selectedPeer && !lookupResult && (
            <Card variant="elevated" padding="lg" className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <Globe size={18} color="#3B82F6" />
                <Text className="text-headline text-ink-primary">
                  {selectedPeer.campus_name}
                </Text>
              </View>
              <Text className="text-footnote text-ink-tertiary mb-3">
                Entrez l'email de l'étudiant sur ce campus pour le retrouver.
              </Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextInput
                    value={externalEmail}
                    onChangeText={setExternalEmail}
                    placeholder="email@epitech.eu"
                    placeholderTextColor="#86868B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="bg-background rounded-xl px-4 py-3 text-body text-ink-primary border-2 border-separator-opaque"
                    style={{ padding: 0, paddingHorizontal: 16, paddingVertical: 12 }}
                  />
                </View>
                <Pressable
                  onPress={handleLookupExternalUser}
                  disabled={!externalEmail.trim() || lookupLoading}
                  style={({ pressed }) => [
                    shadows.primaryButton,
                    { opacity: !externalEmail.trim() ? 0.5 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                  className="bg-primary rounded-xl px-4 py-3 items-center justify-center"
                >
                  {lookupLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Search size={20} color="white" />
                  )}
                </Pressable>
              </View>
              {lookupError && (
                <Text className="text-footnote text-danger font-medium mt-2">
                  {lookupError}
                </Text>
              )}
            </Card>
          )}

          {/* Amount Card */}
          <Card variant="elevated" padding="lg" className="mb-6">
            <Text className="text-headline text-ink-primary mb-4">
              Montant à transférer
            </Text>

            {/* Input */}
            <View
              className={`
                flex-row items-center bg-surface rounded-input px-5 py-4 border-2 mb-2
                ${isFocused ? 'border-primary' : amount && !isValidAmount ? 'border-danger' : 'border-separator-opaque'}
              `}
              style={isFocused ? shadows.soft : undefined}
            >
              <Text className="text-title1 text-ink-tertiary font-normal mr-3">EPC</Text>
              <View className="w-px h-8 bg-separator-opaque mr-4" />
              <TextInput
                value={amount}
                onChangeText={handleAmountChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor="#86868B"
                className="flex-1 text-ink-primary"
                style={{ padding: 0, fontSize: 22, fontWeight: '700', height: 48 }}
              />
            </View>

            {/* Error */}
            {amount && !isValidAmount && (
              <Text className="text-footnote text-danger font-medium ml-1 mt-1">
                Solde insuffisant ({formatCurrency(balance)} max)
              </Text>
            )}

            <Text className="text-footnote text-ink-tertiary mt-4 leading-5">
              {recipient?.isExternal
                ? 'Transfert intercampus — le destinataire sera crédité sur son campus.'
                : 'Les virements sont instantanés et gratuits entre membres du campus.'}
            </Text>

            {/* Send Button */}
            <Pressable
              onPress={handleSend}
              disabled={!isValid || isLoading}
              style={({ pressed }) => [
                isValid ? shadows.primaryButton : undefined,
                {
                  transform: [{ scale: pressed && isValid ? 0.98 : 1 }],
                  opacity: !isValid ? 0.5 : 1,
                },
              ]}
              className={`
                mt-6 rounded-button py-4 items-center justify-center flex-row
                ${isValid ? 'bg-primary' : 'bg-ink-disabled'}
              `}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-headline text-white">
                  Envoyer {amount ? `${amount} EPC` : ''}
                </Text>
              )}
            </Pressable>
          </Card>

          {/* Security Badge */}
          <View className="bg-surface rounded-card p-4 border border-separator-opaque flex-row items-center gap-3">
            <View className="w-10 h-10 bg-primary-50 rounded-button items-center justify-center">
              <ShieldCheck size={24} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-headline text-ink-primary">Paiement sécurisé</Text>
              <Text className="text-footnote text-ink-tertiary">
                Cryptage SSL 256-bit de bout en bout.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Money Request Popup */}
      <Modal
        visible={requestPopupVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRequestPopupVisible(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white rounded-3xl mx-6 p-6 w-full max-w-sm" style={shadows.card}>
            {/* Icon */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-3">
                <ArrowDownLeft size={32} color="#3B82F6" />
              </View>
              <Text className="text-title3 text-ink-primary font-bold text-center">
                Demande de virement
              </Text>
            </View>

            {currentRequest && (
              <>
                <View className="bg-background rounded-2xl p-4 mb-4">
                  <Text className="text-body text-ink-secondary text-center leading-6">
                    <Text className="font-bold text-ink-primary">
                      {currentRequest.requester_name}
                    </Text>
                    {' '}vous demande
                  </Text>
                  <Text className="text-largeTitle text-primary font-bold text-center mt-2">
                    {formatCurrency(currentRequest.amount)}
                  </Text>
                  {currentRequest.message && (
                    <Text className="text-footnote text-ink-tertiary text-center mt-2 italic">
                      "{currentRequest.message}"
                    </Text>
                  )}
                </View>

                {/* Buttons */}
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={handleDeclineRequest}
                    disabled={requestLoading}
                    style={({ pressed }) => [
                      { flex: 1, transform: [{ scale: pressed ? 0.96 : 1 }], opacity: requestLoading ? 0.5 : 1 },
                    ]}
                    className="bg-red-50 border-2 border-red-200 rounded-button py-3.5 items-center justify-center flex-row"
                  >
                    <X size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text className="text-headline" style={{ color: '#EF4444' }}>Refuser</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleAcceptRequest}
                    disabled={requestLoading}
                    style={({ pressed }) => [
                      shadows.primaryButton,
                      { flex: 1, transform: [{ scale: pressed ? 0.96 : 1 }], opacity: requestLoading ? 0.5 : 1 },
                    ]}
                    className="bg-green-500 rounded-button py-3.5 items-center justify-center flex-row"
                  >
                    {requestLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Check size={18} color="white" style={{ marginRight: 6 }} />
                        <Text className="text-headline text-white">Accepter</Text>
                      </>
                    )}
                  </Pressable>
                </View>

                {pendingRequests.length > 1 && (
                  <Text className="text-caption1 text-ink-tertiary text-center mt-3">
                    {pendingRequests.length - 1} autre{pendingRequests.length > 2 ? 's' : ''} demande{pendingRequests.length > 2 ? 's' : ''} en attente
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Recipient Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-separator-opaque">
            <Text className="text-title3 text-ink-primary font-bold">
              Sélectionner un destinataire
            </Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              className="w-9 h-9 bg-fill-tertiary rounded-full items-center justify-center"
            >
              <X size={18} color="#1D1D1F" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View className="px-5 py-3">
            <View className="flex-row items-center bg-fill-tertiary rounded-xl px-4 py-3">
              <Search size={18} color="#86868B" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher par nom ou email..."
                placeholderTextColor="#86868B"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-body text-ink-primary ml-3"
                style={{ padding: 0 }}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <X size={16} color="#86868B" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Users List */}
          {usersLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-footnote text-ink-tertiary mt-3">
                Chargement des utilisateurs...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => (
                <View className="h-px bg-separator-opaque ml-16 mr-5" />
              )}
              ListHeaderComponent={
                <>
                  {/* External Peers Section */}
                  {externalPeers.length > 0 && !searchQuery && (
                    <View className="pb-2">
                      <Text className="text-caption1 text-ink-tertiary uppercase tracking-wider font-semibold px-5 pt-3 pb-2">
                        Groupes externes
                      </Text>
                      {externalPeers.map((peer) => (
                        <Pressable
                          key={peer.id}
                          onPress={() => handlePickExternalPeer(peer)}
                          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                          className="flex-row items-center px-5 py-3.5"
                        >
                          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                            <Globe size={20} color="#3B82F6" />
                          </View>
                          <View className="ml-3 flex-1">
                            <Text className="text-body text-ink-primary font-semibold">
                              {peer.campus_name}
                            </Text>
                            <Text className="text-footnote text-ink-tertiary">
                              Transfert intercampus
                            </Text>
                          </View>
                          <View className="bg-blue-50 rounded-full px-2.5 py-1">
                            <Text className="text-caption2 text-primary font-semibold">EXTERNE</Text>
                          </View>
                        </Pressable>
                      ))}
                      <View className="h-px bg-separator-opaque mx-5 mt-1" />
                      <Text className="text-caption1 text-ink-tertiary uppercase tracking-wider font-semibold px-5 pt-3 pb-2">
                        Étudiants du campus
                      </Text>
                    </View>
                  )}
                </>
              }
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center px-8 py-12">
                  <User size={40} color="#86868B" />
                  <Text className="text-body text-ink-secondary mt-3 text-center">
                    {searchQuery
                      ? 'Aucun utilisateur trouvé'
                      : 'Aucun utilisateur disponible'}
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
