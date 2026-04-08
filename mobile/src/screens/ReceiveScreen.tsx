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
  ArrowDownLeft,
  X,
  Search,
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
import { getAllUsers, getCurrentUser, createMoneyRequest } from '../lib/api';
import type { User as UserType } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  Home: undefined;
  Receive: undefined;
};

type ReceiveScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Receive'>;
};

type SelectedRecipient = {
  id: string;
  name: string;
  email: string;
};

export default function ReceiveScreen({ navigation }: ReceiveScreenProps) {
  const { light, success } = useHaptics();

  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<SelectedRecipient | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
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
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0;
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
    setModalVisible(false);
  };

  const handleSend = async () => {
    if (!isValid || !currentUserId || !recipient) return;

    setIsLoading(true);
    light();

    try {
      const result = await createMoneyRequest(currentUserId, recipient.id, numericAmount);

      if (result.success) {
        success();
        Alert.alert(
          'Demande envoyée',
          `Votre demande de ${amount} EPC a été envoyée à ${recipient.name}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Erreur', result.errorMessage || 'Une erreur est survenue.');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de contacter le serveur. Réessayez.');
    } finally {
      setIsLoading(false);
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
          Demander un virement
        </Text>
        <Text className="text-subheadline text-ink-secondary mt-2">
          Demandez de l'argent à un autre étudiant.
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
          {/* Recipient Selector */}
          <Text className="text-headline text-ink-secondary mb-4 ml-1 mt-4">
            Demander à
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
                  <Avatar size="md" name={recipient.name} />
                  <View>
                    <Text className="text-headline text-ink-primary">
                      {recipient.name}
                    </Text>
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
                    Sélectionner un étudiant
                  </Text>
                </View>
                <ChevronRight size={20} color="#86868B" />
              </>
            )}
          </Pressable>

          {/* Amount Card */}
          <Card variant="elevated" padding="lg" className="mb-6">
            <Text className="text-headline text-ink-primary mb-4">
              Montant à demander
            </Text>

            {/* Input */}
            <View
              className={`
                flex-row items-center bg-surface rounded-input px-5 py-4 border-2 mb-2
                ${isFocused ? 'border-primary' : 'border-separator-opaque'}
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

            <Text className="text-footnote text-ink-tertiary mt-4 leading-5">
              Le destinataire recevra une notification avec votre demande.
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
                  Envoyer la demande {amount ? `de ${amount} EPC` : ''}
                </Text>
              )}
            </Pressable>
          </Card>

          {/* Info Badge */}
          <View className="bg-surface rounded-card p-4 border border-separator-opaque flex-row items-center gap-3">
            <View className="w-10 h-10 bg-blue-50 rounded-button items-center justify-center">
              <ArrowDownLeft size={24} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-headline text-ink-primary">Demande de virement</Text>
              <Text className="text-footnote text-ink-tertiary">
                L'autre utilisateur sera notifié de votre demande.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
          ) : filteredUsers.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <User size={40} color="#86868B" />
              <Text className="text-body text-ink-secondary mt-3 text-center">
                {searchQuery
                  ? 'Aucun utilisateur trouvé'
                  : 'Aucun utilisateur disponible'}
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
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
