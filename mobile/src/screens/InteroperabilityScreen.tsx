import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Building2,
  Shield,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

// Components
import { Card, IconButton } from '../components/ui';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// API
import {
  getCurrentUser,
  getUserWallet,
  getActivePeers,
  getUserCampusWallets,
  createCampusWallet,
  deactivateCampusWallet,
} from '../lib/api';
import type { User, Wallet, Peer } from '../lib/types';

export default function InteroperabilityScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { light, selection } = useHaptics();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [campusWallets, setCampusWallets] = useState<Wallet[]>([]);
  const [togglingPeer, setTogglingPeer] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;
      setUser(currentUser);

      const [userWallet, activePeers, allCampusWallets] = await Promise.all([
        getUserWallet(currentUser.id),
        getActivePeers(),
        getUserCampusWallets(currentUser.id),
      ]);

      setWallet(userWallet);
      setCampusWallets(allCampusWallets);
      // Filter out user's own campus
      const partnerPeers = activePeers.filter(
        (p) => p.campus_name !== currentUser.campus
      );
      setPeers(partnerPeers);
    } catch (error) {
      console.error('Error fetching interoperability data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getWalletForCampus = (campusName: string): Wallet | undefined => {
    return campusWallets.find((w) => w.campus === campusName);
  };

  const togglePeer = async (campusName: string) => {
    if (!user || togglingPeer) return;
    selection();
    setTogglingPeer(campusName);

    try {
      const existingWallet = getWalletForCampus(campusName);

      if (existingWallet) {
        // Désactiver le wallet
        const result = await deactivateCampusWallet(existingWallet.id);
        if (!result.success) {
          Alert.alert('Impossible de désactiver', result.errorMessage || 'Erreur inconnue');
          return;
        }
      } else {
        // Créer un nouveau wallet pour ce campus
        const result = await createCampusWallet(user.id, campusName);
        if (!result.success) {
          Alert.alert('Erreur', result.errorMessage || 'Impossible de créer le wallet');
          return;
        }
      }

      // Refetch les wallets
      const updatedWallets = await getUserCampusWallets(user.id);
      setCampusWallets(updatedWallets);
    } catch (error) {
      console.error('Error toggling campus wallet:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setTogglingPeer(null);
    }
  };

  const handleNext = () => {
    light();
    navigation.navigate('InterCampusTransfer');
  };

  const handleSupport = () => {
    light();
    navigation.navigate('SupportChat');
  };

  // --- Loading ---
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-body text-ink-secondary mt-4">Chargement des campus...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="px-screen py-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              light();
              navigation.goBack();
            }}
            className="w-11 h-11 justify-center"
          >
            <ChevronLeft size={28} color="#1D1D1F" />
          </Pressable>
          <Text className="text-title2 text-ink-primary">Surphy Multi-Campus</Text>
          <IconButton
            icon={Bell}
            variant="outlined"
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <View className="px-screen mb-6">
          <Text className="text-body text-ink-secondary">
            Passez facilement entre vos soldes de campus
          </Text>
        </View>

        {/* Campus principal */}
        <View className="px-screen mb-4">
          <Card variant="elevated" padding="lg">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-12 h-12 rounded-xl items-center justify-center bg-primary/10">
                  <Building2 size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-headline text-ink-primary">
                    Epitech {user?.campus || 'Campus'}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="bg-primary/10 rounded-full px-2.5 py-0.5">
                      <Text className="text-caption2 font-semibold text-primary">
                        Campus principal
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#E5E5EA', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3B82F6"
                value={true}
                disabled={true}
              />
            </View>
            <View className="mt-3 pt-3 border-t border-separator-opaque/50">
              <Text className="text-footnote text-ink-tertiary">
                Solde : <Text className="font-semibold text-ink-primary">{formatCurrency(wallet?.balance || 0)}</Text>
              </Text>
            </View>
          </Card>
        </View>

        {/* Campus partenaires */}
        {peers.length > 0 && (
          <View className="px-screen">
            <Text className="text-footnote text-ink-tertiary mb-3 uppercase tracking-wider font-semibold">
              Campus partenaires
            </Text>
            {peers.map((peer) => {
              const campusWallet = getWalletForCampus(peer.campus_name);
              const isEnabled = !!campusWallet;
              const isToggling = togglingPeer === peer.campus_name;

              return (
                <Pressable
                  key={peer.id}
                  onPress={() => togglePeer(peer.campus_name)}
                  disabled={isToggling}
                  style={({ pressed }) => [
                    shadows.card,
                    {
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      opacity: isToggling ? 0.7 : 1,
                    },
                  ]}
                  className={`
                    p-4 mb-3 rounded-2xl border
                    ${isEnabled ? 'bg-primary/5 border-primary/30' : 'bg-surface border-separator-opaque'}
                  `}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        className={`w-12 h-12 rounded-xl items-center justify-center ${
                          isEnabled ? 'bg-primary/10' : 'bg-background'
                        }`}
                      >
                        <Building2 size={24} color={isEnabled ? '#3B82F6' : '#6E6E73'} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-headline text-ink-primary">
                          Epitech {peer.campus_name}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          <View className="bg-background rounded-full px-2.5 py-0.5">
                            <Text className="text-caption2 font-semibold text-ink-tertiary">
                              Campus partenaire
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      {isToggling ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <Switch
                          trackColor={{ false: '#E5E5EA', true: '#3B82F6' }}
                          thumbColor="#FFFFFF"
                          ios_backgroundColor="#E5E5EA"
                          value={isEnabled}
                          onValueChange={() => togglePeer(peer.campus_name)}
                        />
                      )}
                      <ChevronRight size={18} color="#C7C7CC" />
                    </View>
                  </View>
                  <View className="mt-3 pt-3 border-t border-separator-opaque/50">
                    <Text className="text-footnote text-ink-tertiary">
                      Avoirs : <Text className="font-semibold text-ink-primary">{formatCurrency(campusWallet?.balance ?? 0)}</Text>
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Security Banner */}
        <View className="px-screen mt-4">
          <View
            className="bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center gap-3"
            style={shadows.soft}
          >
            <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center">
              <Shield size={22} color="#22C55E" />
            </View>
            <View className="flex-1">
              <Text className="text-subheadline font-semibold text-green-800">
                Transactions inter-campus 100% sécurisé
              </Text>
              <Text className="text-caption1 text-green-600 mt-0.5">
                Toutes les opérations sont chiffrées et vérifiées en temps réel
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer fixe */}
      <View
        style={[
          shadows.card,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        className="absolute bottom-0 left-0 right-0 p-5 bg-surface border-t border-separator-opaque"
      >
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            shadows.primaryButton,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          className="bg-primary rounded-button py-4 items-center justify-center flex-row mb-3"
        >
          <Text className="text-headline font-semibold text-white mr-1">Suivant</Text>
          <ChevronRight size={20} color="white" />
        </Pressable>

        <Pressable onPress={handleSupport} className="items-center py-2">
          <Text className="text-footnote text-ink-tertiary">
            Besoin d'aide ?{' '}
            <Text className="text-primary font-medium">Contacter le support</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
