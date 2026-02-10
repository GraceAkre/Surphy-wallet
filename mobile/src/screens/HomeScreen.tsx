import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ArrowUpRight, ArrowDownLeft, Plus, Check, X, XCircle, Building2, ChevronRight } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

// Components
import { Card, IconButton } from '../components/ui';
import { Section } from '../components/layout';
import { TransactionList } from '../components/transaction';
import { AlertBanner } from '../components/feedback';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency, formatDate, getInitials } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// API
import {
  getCurrentUser,
  getUserWallet,
  getUserTransactions,
  hasSuspiciousTransactions,
  getFirstSuspiciousTransaction,
  getMoneyRequestsForUser,
  acceptMoneyRequest,
  declineMoneyRequest,
} from '../lib/api';
import type { User, Wallet, Transaction, MoneyRequest } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  Home: undefined;
  TransactionDetail: { id: string };
  Verification: { transactionId: string };
  Notifications: undefined;
  CardPayment: undefined;
  Receive: undefined;
  Deposit: undefined;
  Interoperability: undefined;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { light } = useHaptics();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data from Supabase
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasSuspiciousAlert, setHasSuspiciousAlert] = useState(false);
  const [suspiciousTransaction, setSuspiciousTransaction] = useState<Transaction | null>(null);
  const [pendingRequests, setPendingRequests] = useState<MoneyRequest[]>([]);
  const [declinedRequests, setDeclinedRequests] = useState<MoneyRequest[]>([]);

  // Money request popup
  const [requestPopupVisible, setRequestPopupVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MoneyRequest | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('No user found');
        return;
      }
      setUser(currentUser);

      const [userWallet, userTransactions, hasSuspicious, firstSuspicious, moneyRequests, declinedReqs] = await Promise.all([
        getUserWallet(currentUser.id),
        getUserTransactions(currentUser.id, { limit: 5 }),
        hasSuspiciousTransactions(currentUser.id),
        getFirstSuspiciousTransaction(currentUser.id),
        getMoneyRequestsForUser(currentUser.id),
        getMoneyRequestsForUser(currentUser.id, 'declined'),
      ]);

      setWallet(userWallet);
      setTransactions(userTransactions);
      setHasSuspiciousAlert(hasSuspicious);
      setSuspiciousTransaction(firstSuspicious);
      setPendingRequests(moneyRequests);
      setDeclinedRequests(declinedReqs);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleTransactionPress = (transaction: Transaction) => {
    light();
    navigation.navigate('TransactionDetail', { id: transaction.id });
  };

  const handleAlertPress = () => {
    if (suspiciousTransaction) {
      light();
      navigation.navigate('Verification', { transactionId: suspiciousTransaction.id });
    }
  };

  const handleRequestPress = (request: MoneyRequest) => {
    light();
    setSelectedRequest(request);
    setRequestPopupVisible(true);
  };

  const handleAcceptRequest = async () => {
    if (!selectedRequest || !wallet) return;
    setRequestLoading(true);
    try {
      const result = await acceptMoneyRequest(
        selectedRequest.id,
        wallet.id,
        selectedRequest.requester_id,
        selectedRequest.amount
      );
      if (result.success) {
        Alert.alert('Virement effectué', `${formatCurrency(selectedRequest.amount)} envoyé à ${selectedRequest.requester_name}.`);
        setRequestPopupVisible(false);
        setSelectedRequest(null);
        await fetchData();
      } else {
        Alert.alert('Erreur', result.errorMessage || 'Impossible d\'effectuer le virement.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!selectedRequest) return;
    setRequestLoading(true);
    try {
      await declineMoneyRequest(selectedRequest.id);
      light();
      setRequestPopupVisible(false);
      setSelectedRequest(null);
      await fetchData();
    } catch {
      // Silently handle
    } finally {
      setRequestLoading(false);
    }
  };

  // --- Render Header ---
  const renderHeader = () => (
    <View className="flex-row justify-between items-center px-screen py-4">
      <View>
        <Text className="text-subheadline text-ink-secondary font-medium">
          Bon retour,
        </Text>
        <Text className="text-title1 text-ink-primary">
          {user?.firstname || 'Utilisateur'}
        </Text>
      </View>

      <View className="relative">
        <IconButton
          icon={Bell}
          variant="outlined"
          onPress={() => navigation.navigate('Notifications')}
        />
        {hasSuspiciousAlert && (
          <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white" />
        )}
      </View>
    </View>
  );

  // --- Render Balance Card ---
  const renderBalanceCard = () => (
    <Card variant="elevated" padding="lg" className="mx-screen mb-6">
      <Text className="text-footnote text-ink-tertiary mb-2">
        Solde disponible
      </Text>
      <Text className="text-largeTitle text-ink-primary mb-6">
        {formatCurrency(wallet?.balance || 0)}
      </Text>

      {/* Quick Actions */}
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => {
            light();
            navigation.navigate('CardPayment');
          }}
          style={({ pressed }) => [
            shadows.primaryButton,
            { flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          className="bg-primary rounded-button py-3.5 flex-row justify-center items-center"
        >
          <ArrowUpRight size={16} color="white" style={{ marginRight: 6 }} />
          <Text className="text-subheadline font-semibold text-white">Envoyer</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            light();
            navigation.navigate('Receive');
          }}
          style={({ pressed }) => [
            shadows.soft,
            { flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          className="bg-surface border border-separator-opaque rounded-button py-3.5 flex-row justify-center items-center"
        >
          <ArrowDownLeft size={16} color="#3B82F6" style={{ marginRight: 6 }} />
          <Text className="text-subheadline font-semibold text-primary">Recevoir</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            light();
            navigation.navigate('Deposit');
          }}
          style={({ pressed }) => [
            shadows.soft,
            { flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          className="bg-surface border border-separator-opaque rounded-button py-3.5 flex-row justify-center items-center"
        >
          <Plus size={16} color="#3B82F6" style={{ marginRight: 6 }} />
          <Text className="text-subheadline font-semibold text-primary">Déposer</Text>
        </Pressable>
      </View>
    </Card>
  );

  // --- Loading State ---
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-body text-ink-secondary mt-4">Chargement...</Text>
      </View>
    );
  }

  // --- Main Render ---
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} className="bg-background z-10">
        {renderHeader()}
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 100 + insets.bottom,
          paddingTop: 10,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        {renderBalanceCard()}

        {/* Multi-Campus Banner */}
        <Pressable
          onPress={() => {
            light();
            navigation.navigate('Interoperability');
          }}
          style={({ pressed }) => [
            shadows.card,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          className="mx-screen mb-6 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3.5 flex-row items-center"
        >
          <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3">
            <Building2 size={20} color="#3B82F6" />
          </View>
          <View className="flex-1">
            <Text className="text-subheadline font-semibold text-ink-primary">Multi-Campus</Text>
            <Text className="text-caption1 text-ink-tertiary">Passez entre vos soldes de campus</Text>
          </View>
          <ChevronRight size={20} color="#3B82F6" />
        </Pressable>

        {/* Alert Banner */}
        {hasSuspiciousAlert && suspiciousTransaction && (
          <View className="px-screen mb-6">
            <AlertBanner
              variant="warning"
              title="Alerte de sécurité"
              message="Transaction suspecte détectée"
              onPress={handleAlertPress}
            />
          </View>
        )}

        {/* Pending Money Requests */}
        {pendingRequests.length > 0 && (
          <View className="px-screen mb-6">
            <Text className="text-headline text-ink-primary mb-3">
              Demandes en attente
            </Text>
            <View
              className="bg-surface rounded-2xl border border-separator-opaque/50 overflow-hidden"
              style={shadows.card}
            >
              {pendingRequests.map((req, index) => (
                <Pressable
                  key={req.id}
                  onPress={() => handleRequestPress(req)}
                  style={({ pressed }) => [
                    { backgroundColor: pressed ? '#F0F7FF' : 'white' },
                  ]}
                  className={`flex-row items-center px-4 py-3.5 ${
                    index < pendingRequests.length - 1 ? 'border-b border-separator-opaque/50' : ''
                  }`}
                >
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#DBEAFE' }}>
                    <ArrowDownLeft size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-subheadline font-semibold text-ink-primary">
                      {req.requester_name}
                    </Text>
                    <Text className="text-footnote text-ink-tertiary">
                      Demande de virement
                    </Text>
                  </View>
                  <Text className="text-subheadline font-bold text-primary">
                    {formatCurrency(req.amount)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View className="px-screen">
          <Section
            title="Activités récentes"
            onAction={() => console.log('Voir tout')}
          >
            <TransactionList
              transactions={transactions}
              onTransactionPress={handleTransactionPress}
              maxItems={5}
              emptyMessage="Aucune transaction récente"
            />

            {/* Declined Money Requests */}
            {declinedRequests.length > 0 && (
              <View
                className="bg-surface rounded-2xl border border-separator-opaque/50 overflow-hidden mt-3"
                style={shadows.card}
              >
                {declinedRequests.slice(0, 5).map((req, index) => (
                  <View
                    key={req.id}
                    className={`flex-row items-center px-4 py-3.5 ${
                      index < Math.min(declinedRequests.length, 5) - 1 ? 'border-b border-separator-opaque/50' : ''
                    }`}
                  >
                    <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FEE2E2' }}>
                      <XCircle size={20} color="#EF4444" />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-subheadline font-semibold text-ink-primary">
                        Demande refusée
                      </Text>
                      <Text className="text-footnote text-ink-tertiary">
                        {req.requester_name} — {formatDate(req.updated_at)}
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      <Text className="text-subheadline font-bold text-ink-tertiary">
                        {formatCurrency(req.amount)}
                      </Text>
                      <View className="bg-red-100 rounded-full px-2 py-0.5">
                        <Text className="text-caption2 font-semibold" style={{ color: '#EF4444', fontSize: 10 }}>REFUSÉE</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Section>
        </View>
      </ScrollView>

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

            {selectedRequest && (
              <>
                <View className="bg-background rounded-2xl p-4 mb-4">
                  <Text className="text-body text-ink-secondary text-center leading-6">
                    <Text className="font-bold text-ink-primary">
                      {selectedRequest.requester_name}
                    </Text>
                    {' '}vous demande
                  </Text>
                  <Text className="text-largeTitle text-primary font-bold text-center mt-2">
                    {formatCurrency(selectedRequest.amount)}
                  </Text>
                  {selectedRequest.message && (
                    <Text className="text-footnote text-ink-tertiary text-center mt-2 italic">
                      "{selectedRequest.message}"
                    </Text>
                  )}
                </View>

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
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
