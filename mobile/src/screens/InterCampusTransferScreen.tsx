import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Building2,
  Shield,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// Components
import { Card } from '../components/ui';
import { Avatar } from '../components/ui/Avatar';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency, formatAmountInput } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// API
import {
  getCurrentUser,
  getUserWallet,
  getActivePeers,
  getCampusWallets,
  contributeToCampusWallet,
  distributeFromCampusWallet,
  getUsersByCampus,
} from '../lib/api';
import type { User, Wallet, CampusWallet, Peer } from '../lib/types';

// Campus info: combine peer names with optional wallet balances
interface CampusInfo {
  name: string;
  balance: number | null; // null = table not yet created
}

export default function InterCampusTransferScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { light, success: hapticSuccess, error: hapticError } = useHaptics();

  // State
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [campusList, setCampusList] = useState<CampusInfo[]>([]);
  const [campusWallets, setCampusWallets] = useState<CampusWallet[]>([]);

  // Contribute state
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isContributing, setIsContributing] = useState(false);

  // Admin distribute state
  const [campusUsers, setCampusUsers] = useState<User[]>([]);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [distributeAmount, setDistributeAmount] = useState('');
  const [isDistributing, setIsDistributing] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);

  const isAdmin = !!user?.admin_campus;

  const buildCampusList = (peers: Peer[], wallets: CampusWallet[]): CampusInfo[] => {
    const walletMap = new Map(wallets.map((w) => [w.campus_name, w.balance]));
    return peers.map((p) => ({
      name: p.campus_name,
      balance: walletMap.has(p.campus_name) ? walletMap.get(p.campus_name)! : null,
    }));
  };

  const fetchData = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;
      setUser(currentUser);

      // Fetch wallet + peers in parallel (always available)
      const [userWallet, peers] = await Promise.all([
        getUserWallet(currentUser.id),
        getActivePeers(),
      ]);
      setWallet(userWallet);

      // Try fetching campus wallets (table may not exist yet)
      let allCampusWallets: CampusWallet[] = [];
      try {
        allCampusWallets = await getCampusWallets();
      } catch {
        // Table not created yet — silently ignore
      }
      setCampusWallets(allCampusWallets);
      setCampusList(buildCampusList(peers, allCampusWallets));

      // If admin, fetch users of their campus
      if (currentUser.admin_campus) {
        const users = await getUsersByCampus(currentUser.admin_campus, currentUser.id);
        setCampusUsers(users);
      }
    } catch (error) {
      console.error('Error fetching inter-campus data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const parseAmount = (value: string): number => {
    return parseFloat(value.replace(',', '.')) || 0;
  };

  const handleAmountChange = (text: string) => {
    setAmount(formatAmountInput(text));
  };

  const handleDistributeAmountChange = (text: string) => {
    setDistributeAmount(formatAmountInput(text));
  };

  // --- Contribute ---
  const handleContribute = async () => {
    if (!wallet || !selectedCampus || !amount) return;

    const numAmount = parseAmount(amount);
    if (numAmount <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant valide.');
      return;
    }
    if (numAmount > wallet.balance) {
      hapticError();
      Alert.alert('Solde insuffisant', `Votre solde est de ${formatCurrency(wallet.balance)}.`);
      return;
    }

    light();
    setIsContributing(true);

    try {
      const result = await contributeToCampusWallet(wallet.id, selectedCampus, numAmount, user || undefined);

      if (result.success) {
        hapticSuccess();
        Alert.alert(
          'Contribution envoyée',
          `${formatCurrency(numAmount)} envoyés au pot commun ${selectedCampus}.`,
        );
        setAmount('');
        // Refetch data
        const [updatedWallet, updatedCampusWallets, peers] = await Promise.all([
          getUserWallet(user!.id),
          getCampusWallets(),
          getActivePeers(),
        ]);
        setWallet(updatedWallet);
        setCampusWallets(updatedCampusWallets);
        setCampusList(buildCampusList(peers, updatedCampusWallets));
      } else {
        hapticError();
        Alert.alert('Erreur', result.errorMessage || 'Une erreur est survenue.');
      }
    } catch (error) {
      hapticError();
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setIsContributing(false);
    }
  };

  // --- Distribute (admin) ---
  const handleDistribute = async () => {
    if (!user?.admin_campus || !recipient || !distributeAmount) return;

    const numAmount = parseAmount(distributeAmount);
    if (numAmount <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant valide.');
      return;
    }

    const adminCampusWallet = campusWallets.find(
      (cw) => cw.campus_name === user.admin_campus
    );
    if (adminCampusWallet && numAmount > adminCampusWallet.balance) {
      hapticError();
      Alert.alert(
        'Solde du pot insuffisant',
        `Le pot commun dispose de ${formatCurrency(adminCampusWallet.balance)}.`,
      );
      return;
    }

    light();
    setIsDistributing(true);

    try {
      const result = await distributeFromCampusWallet(
        user.admin_campus,
        recipient.id,
        numAmount,
        user || undefined,
      );

      if (result.success) {
        hapticSuccess();
        Alert.alert(
          'Redistribution effectuée',
          `${formatCurrency(numAmount)} envoyés à ${recipient.firstname} ${recipient.lastname}.`,
        );
        setDistributeAmount('');
        setRecipient(null);
        // Refetch
        const [updatedCampusWallets, peers] = await Promise.all([
          getCampusWallets(),
          getActivePeers(),
        ]);
        setCampusWallets(updatedCampusWallets);
        setCampusList(buildCampusList(peers, updatedCampusWallets));
      } else {
        hapticError();
        Alert.alert('Erreur', result.errorMessage || 'Une erreur est survenue.');
      }
    } catch (error) {
      hapticError();
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setIsDistributing(false);
    }
  };

  const contributeAmountValid =
    amount && parseAmount(amount) > 0 && parseAmount(amount) <= (wallet?.balance || 0);

  const adminCampusWallet = campusWallets.find(
    (cw) => cw.campus_name === user?.admin_campus
  );
  const distributeAmountValid =
    distributeAmount &&
    parseAmount(distributeAmount) > 0 &&
    parseAmount(distributeAmount) <= (adminCampusWallet?.balance || 0);

  // --- Loading ---
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-body text-ink-secondary mt-4">Chargement...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="px-screen py-4 flex-row items-center">
          <Pressable
            onPress={() => {
              light();
              navigation.goBack();
            }}
            className="w-11 h-11 justify-center"
          >
            <ChevronLeft size={28} color="#1D1D1F" />
          </Pressable>
          <Text className="text-title2 text-ink-primary flex-1 text-center mr-11">
            Transfert Inter-Campus
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Admin Campus Wallet Card */}
        {isAdmin && adminCampusWallet && (
          <View className="px-screen mb-6">
            <View
              className="bg-primary/5 border border-primary/20 rounded-2xl p-5"
              style={shadows.card}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-11 h-11 rounded-xl items-center justify-center bg-primary/10">
                    <Building2 size={22} color="#3B82F6" />
                  </View>
                  <Text className="text-headline font-semibold text-ink-primary">
                    Wallet Campus {user?.admin_campus}
                  </Text>
                </View>
                <View className="bg-primary/10 rounded-full px-3 py-1">
                  <Text className="text-caption1 font-bold text-primary">ADMIN</Text>
                </View>
              </View>
              <Text className="text-largeTitle font-bold text-primary mb-1">
                {formatCurrency(adminCampusWallet.balance)}
              </Text>
              <Text className="text-footnote text-ink-tertiary">
                Pot commun dont vous êtes responsable
              </Text>
            </View>
          </View>
        )}

        {/* Campus Wallet Cards */}
        {campusList.length > 0 && (
          <View className="mb-6">
            <Text className="text-footnote text-ink-tertiary mb-3 uppercase tracking-wider font-semibold px-screen">
              Pots communs campus
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {campusList.map((campus) => (
                <View
                  key={campus.name}
                  style={shadows.card}
                  className="bg-surface rounded-2xl p-4"
                >
                  <View className="w-10 h-10 rounded-xl items-center justify-center bg-primary/10 mb-3">
                    <Building2 size={20} color="#3B82F6" />
                  </View>
                  <Text className="text-subheadline font-semibold text-ink-primary">
                    {campus.name}
                  </Text>
                  <Text className="text-title3 font-bold text-primary mt-1">
                    {campus.balance !== null ? formatCurrency(campus.balance) : '—'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Contribute Section */}
        <View className="px-screen mb-6">
          <Text className="text-footnote text-ink-tertiary mb-3 uppercase tracking-wider font-semibold">
            Contribuer à un campus
          </Text>

          <Card variant="elevated" padding="lg">
            {/* Source wallet */}
            <View className="mb-5">
              <Text className="text-caption1 text-ink-tertiary mb-2">Mon wallet</Text>
              <View className="bg-background rounded-xl p-3 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center bg-primary/10">
                  <Building2 size={18} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-subheadline font-semibold text-ink-primary">
                    Epitech {user?.campus}
                  </Text>
                  <Text className="text-caption1 text-ink-tertiary">
                    Solde : {formatCurrency(wallet?.balance || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Campus destination */}
            <View className="mb-5">
              <Text className="text-caption1 text-ink-tertiary mb-2">Campus destination</Text>
              <View className="flex-row gap-2">
                {campusList.map((campus) => {
                  const isSelected = selectedCampus === campus.name;
                  return (
                    <Pressable
                      key={campus.name}
                      onPress={() => {
                        light();
                        setSelectedCampus(campus.name);
                      }}
                      style={isSelected ? shadows.soft : undefined}
                      className={`
                        flex-1 py-3 rounded-xl items-center border-2
                        ${isSelected ? 'bg-primary/10 border-primary' : 'bg-background border-separator-opaque'}
                      `}
                    >
                      <Text
                        className={`text-subheadline font-semibold ${
                          isSelected ? 'text-primary' : 'text-ink-secondary'
                        }`}
                      >
                        {campus.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Amount input */}
            <View className="mb-5">
              <Text className="text-caption1 text-ink-tertiary mb-2">Montant</Text>
              <View
                className={`
                  flex-row items-center bg-background rounded-xl px-4 border-2
                  ${amount && !contributeAmountValid ? 'border-danger' : 'border-separator-opaque'}
                `}
                style={{ height: 56 }}
              >
                <TextInput
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor="#86868B"
                  className="flex-1 text-ink-primary"
                  style={{ padding: 0, fontSize: 22, fontWeight: '700' }}
                />
                <Text className="text-title3 font-bold text-ink-tertiary ml-2">EPC</Text>
              </View>
              {amount && !contributeAmountValid && (
                <Text className="text-footnote text-danger font-medium mt-1.5">
                  Solde insuffisant ({formatCurrency(wallet?.balance || 0)} max)
                </Text>
              )}
            </View>

            {/* Contribute button */}
            <Pressable
              onPress={handleContribute}
              disabled={!selectedCampus || !contributeAmountValid || isContributing}
              style={({ pressed }) => [
                shadows.primaryButton,
                {
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: !selectedCampus || !contributeAmountValid ? 0.5 : 1,
                },
              ]}
              className="bg-primary rounded-button py-3.5 items-center justify-center"
            >
              {isContributing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-headline font-semibold text-white">Contribuer</Text>
              )}
            </Pressable>
          </Card>
        </View>

        {/* Admin Distribute Section */}
        {isAdmin && adminCampusWallet && (
          <View className="px-screen mb-6">
            <Text className="text-footnote text-ink-tertiary mb-3 uppercase tracking-wider font-semibold">
              Redistribuer depuis {user?.admin_campus}
            </Text>

            <Card variant="elevated" padding="lg">
              {/* Campus pool balance */}
              <View className="bg-primary/5 rounded-xl p-3 flex-row items-center gap-3 mb-5">
                <View className="w-10 h-10 rounded-xl items-center justify-center bg-primary/10">
                  <Building2 size={18} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-caption1 text-ink-tertiary">
                    Pot commun {user?.admin_campus}
                  </Text>
                  <Text className="text-title3 font-bold text-primary">
                    {formatCurrency(adminCampusWallet.balance)}
                  </Text>
                </View>
              </View>

              {/* Recipient picker */}
              <View className="mb-5">
                <Text className="text-caption1 text-ink-tertiary mb-2">Destinataire</Text>
                <Pressable
                  onPress={() => {
                    light();
                    setShowRecipientModal(true);
                  }}
                  className="bg-background rounded-xl p-3 flex-row items-center justify-between border-2 border-separator-opaque"
                >
                  {recipient ? (
                    <View className="flex-row items-center gap-3">
                      <Avatar
                        size="sm"
                        name={`${recipient.firstname} ${recipient.lastname}`}
                      />
                      <View>
                        <Text className="text-subheadline font-semibold text-ink-primary">
                          {recipient.firstname} {recipient.lastname}
                        </Text>
                        <Text className="text-caption1 text-ink-tertiary">
                          {recipient.email}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text className="text-subheadline text-ink-tertiary">
                      Choisir un destinataire
                    </Text>
                  )}
                  <ChevronDown size={20} color="#86868B" />
                </Pressable>
              </View>

              {/* Distribute amount */}
              <View className="mb-5">
                <Text className="text-caption1 text-ink-tertiary mb-2">Montant</Text>
                <View
                  className={`
                    flex-row items-center bg-background rounded-xl px-4 border-2
                    ${distributeAmount && !distributeAmountValid ? 'border-danger' : 'border-separator-opaque'}
                  `}
                  style={{ height: 56 }}
                >
                  <TextInput
                    value={distributeAmount}
                    onChangeText={handleDistributeAmountChange}
                    keyboardType="decimal-pad"
                    placeholder="0,00"
                    placeholderTextColor="#86868B"
                    className="flex-1 text-ink-primary"
                    style={{ padding: 0, fontSize: 22, fontWeight: '700' }}
                  />
                  <Text className="text-title3 font-bold text-ink-tertiary ml-2">EPC</Text>
                </View>
                {distributeAmount && !distributeAmountValid && (
                  <Text className="text-footnote text-danger font-medium mt-1.5">
                    Solde du pot insuffisant ({formatCurrency(adminCampusWallet.balance)} max)
                  </Text>
                )}
              </View>

              {/* Distribute button */}
              <Pressable
                onPress={handleDistribute}
                disabled={!recipient || !distributeAmountValid || isDistributing}
                style={({ pressed }) => [
                  shadows.primaryButton,
                  {
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    opacity: !recipient || !distributeAmountValid ? 0.5 : 1,
                  },
                ]}
                className="bg-green-600 rounded-button py-3.5 items-center justify-center"
              >
                {isDistributing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-headline font-semibold text-white">Redistribuer</Text>
                )}
              </Pressable>
            </Card>
          </View>
        )}

        {/* Security Banner */}
        <View className="px-screen">
          <View
            className="bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center gap-3"
            style={shadows.soft}
          >
            <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center">
              <Shield size={22} color="#22C55E" />
            </View>
            <View className="flex-1">
              <Text className="text-subheadline font-semibold text-green-800">
                Transferts 100% sécurisés
              </Text>
              <Text className="text-caption1 text-green-600 mt-0.5">
                Toutes les opérations sont chiffrées et vérifiées en temps réel
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Recipient Selection Modal */}
      <Modal
        visible={showRecipientModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecipientModal(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          <View className="px-screen py-4 flex-row items-center justify-between border-b border-separator-opaque">
            <Pressable onPress={() => setShowRecipientModal(false)}>
              <Text className="text-body text-primary">Annuler</Text>
            </Pressable>
            <Text className="text-headline font-semibold text-ink-primary">
              Choisir un destinataire
            </Text>
            <View className="w-16" />
          </View>

          <FlatList
            data={campusUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  light();
                  setRecipient(item);
                  setShowRecipientModal(false);
                }}
                className="px-screen py-3 flex-row items-center gap-3"
              >
                <Avatar
                  size="md"
                  name={`${item.firstname ?? ''} ${item.lastname ?? ''}`.trim()}
                />
                <View className="flex-1">
                  <Text className="text-subheadline font-semibold text-ink-primary">
                    {item.firstname} {item.lastname}
                  </Text>
                  <Text className="text-caption1 text-ink-tertiary">{item.email}</Text>
                </View>
                {recipient?.id === item.id && (
                  <Check size={20} color="#3B82F6" />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Text className="text-body text-ink-tertiary">Aucun utilisateur trouvé</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
