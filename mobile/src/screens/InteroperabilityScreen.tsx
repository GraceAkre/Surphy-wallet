import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  ChevronLeft,
  ShieldAlert,
  MessageCircle,
  Send,
  Building2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

// Components
import { Card, Badge, Button, Input } from '../components/ui';

// Utils
import { shadows } from '../utils/shadows';
import { useHaptics } from '../hooks/useHaptics';

// API
import { getAllPeers } from '../lib/api';
import type { Peer, PeerStatus } from '../lib/types';

// --- Types ---

interface CampusDisplay {
  id: string;
  name: string;
  country: string;
  status: PeerStatus;
  blockedReason?: string;
}

// Helper pour extraire le pays depuis le campus
const getCountryFromCampus = (campusName: string): string => {
  return 'France';
};

// Mapper les statuts Supabase vers l'affichage
const mapPeerToDisplay = (peer: Peer): CampusDisplay => ({
  id: peer.id,
  name: `Epitech ${peer.campus_name}`,
  country: getCountryFromCampus(peer.campus_name),
  status: peer.status,
  blockedReason:
    peer.status === 'suspended'
      ? 'Campus suspendu temporairement'
      : peer.status === 'revoked'
        ? 'CAMPUS_NOT_ALLOWED (R8)'
        : undefined,
});

const getStatusVariant = (status: PeerStatus): 'success' | 'warning' | 'danger' | 'neutral' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'warning';
    case 'revoked':
      return 'danger';
    default:
      return 'neutral';
  }
};

const getStatusLabel = (status: PeerStatus): string => {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'suspended':
      return 'Suspendu';
    case 'revoked':
      return 'Révoqué';
    default:
      return status;
  }
};

export default function InteroperabilityScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { light, selection } = useHaptics();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [peers, setPeers] = useState<Peer[]>([]);

  // Fetch peers from Supabase
  const fetchPeers = useCallback(async () => {
    try {
      const data = await getAllPeers();
      setPeers(data);
    } catch (error) {
      console.error('Error fetching peers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeers();
  }, [fetchPeers]);

  // Convert to display format
  const campuses = useMemo(() => peers.map(mapPeerToDisplay), [peers]);

  // Filtrage
  const filteredCampuses = useMemo(
    () =>
      campuses.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.country.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [campuses, searchQuery]
  );

  // Handlers
  const handleCampusPress = (campus: CampusDisplay) => {
    selection();
    if (campus.status === 'suspended' || campus.status === 'revoked') {
      Alert.alert('Campus Bloqué', `Raison: ${campus.blockedReason}`);
      return;
    }
    setSelectedCampus(selectedCampus === campus.id ? null : campus.id);
  };

  const handleContact = () => {
    light();
    Alert.alert('Contact', 'Fonctionnalité à venir');
  };

  const handleTransfer = () => {
    light();
    if (selectedCampus) {
      Alert.alert('Transfert', 'Fonctionnalité à venir');
    } else {
      Alert.alert('Sélection requise', 'Veuillez sélectionner un campus');
    }
  };

  // --- Render Campus Card ---
  const renderCampusCard = ({ item }: { item: CampusDisplay }) => {
    const isSelected = selectedCampus === item.id;
    const isBlocked = item.status === 'suspended' || item.status === 'revoked';

    return (
      <Pressable
        onPress={() => handleCampusPress(item)}
        style={({ pressed }) => [
          shadows.card,
          {
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: isBlocked ? 0.8 : 1,
          },
        ]}
        className={`
          p-4 mb-3 rounded-2xl border-2
          ${isSelected ? 'bg-primary-50 border-primary' : 'bg-surface border-separator-opaque'}
        `}
      >
        <View className="flex-row items-center justify-between">
          {/* Left: Icon + Name */}
          <View className="flex-row items-center gap-3">
            <View
              className={`w-10 h-10 rounded-xl items-center justify-center ${
                isSelected ? 'bg-primary' : 'bg-background'
              }`}
            >
              <Building2 size={20} color={isSelected ? 'white' : '#6E6E73'} />
            </View>
            <View>
              <Text className="text-headline text-ink-primary">{item.name}</Text>
              <Text className="text-footnote text-ink-tertiary">{item.country}</Text>
            </View>
          </View>

          {/* Right: Status Badge */}
          <Badge variant={getStatusVariant(item.status)} size="sm">
            {getStatusLabel(item.status)}
          </Badge>
        </View>

        {/* Blocked Reason */}
        {item.blockedReason && (
          <View className="mt-3 flex-row items-center gap-2 bg-danger-50 p-2 rounded-lg">
            <ShieldAlert size={14} color="#FF3B30" />
            <Text className="text-footnote text-danger font-medium">{item.blockedReason}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  // --- Loading State ---
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
          <Text className="text-title2 text-ink-primary">Inter-Campus</Text>
          <View className="w-11" />
        </View>
      </SafeAreaView>

      <View className="flex-1 px-screen">
        {/* Search Bar */}
        <View
          className="flex-row items-center bg-surface rounded-input px-4 h-12 mb-6 border border-separator-opaque"
          style={shadows.soft}
        >
          <Search size={20} color="#86868B" />
          <TextInput
            className="flex-1 ml-3 text-body text-ink-primary"
            placeholder="Rechercher un campus..."
            placeholderTextColor="#86868B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* List Header */}
        <Text className="text-footnote text-ink-tertiary mb-3 uppercase tracking-wider font-semibold">
          Partenaires ({filteredCampuses.length})
        </Text>

        {/* Campus List */}
        <FlatList
          data={filteredCampuses}
          renderItem={renderCampusCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          ListEmptyComponent={
            <View className="p-8 items-center">
              <Text className="text-body text-ink-tertiary">Aucun campus trouvé</Text>
            </View>
          }
        />
      </View>

      {/* Bottom Actions */}
      <View
        style={[
          shadows.modal,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        className="absolute bottom-0 left-0 right-0 p-5 bg-surface border-t border-separator-opaque rounded-t-3xl"
      >
        <View className="flex-row gap-3">
          {/* Contact Button */}
          <View className="flex-1">
            <Button variant="secondary" fullWidth onPress={handleContact}>
              <View className="flex-row items-center justify-center gap-2">
                <MessageCircle size={20} color="#1D1D1F" />
                <Text className="text-headline text-ink-primary">Contacter</Text>
              </View>
            </Button>
          </View>

          {/* Transfer Button */}
          <View className="flex-1">
            <Button
              variant="primary"
              fullWidth
              onPress={handleTransfer}
              disabled={!selectedCampus}
            >
              <View className="flex-row items-center justify-center gap-2">
                <Send size={20} color="white" />
                <Text className="text-headline text-white">Transfert</Text>
              </View>
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}
