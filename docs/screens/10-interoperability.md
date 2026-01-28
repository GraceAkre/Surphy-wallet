import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  Alert 
} from 'react-native';
import { 
  Search, 
  ChevronLeft, 
  Users, 
  ShieldAlert, 
  MessageCircle, 
  Send,
  Building2
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

// --- Types ---
type CampusStatus = 'active' | 'pending' | 'blocked';

interface Campus {
  id: string;
  name: string;
  country: string;
  status: CampusStatus;
  connectedUsers: number;
  blockedReason?: string; // Ex: 'CAMPUS_NOT_ALLOWED'
}

// --- Données Mockées (Mélange des specs) ---
const MOCK_CAMPUSES: Campus[] = [
  {
    id: '1',
    name: 'Epitech Paris',
    country: 'France',
    status: 'active',
    connectedUsers: 42,
  },
  {
    id: '2',
    name: 'ESGI Lyon',
    country: 'France',
    status: 'active',
    connectedUsers: 18,
  },
  {
    id: '3',
    name: 'Supérieur Paris',
    country: 'France',
    status: 'pending',
    connectedUsers: 0,
  },
  {
    id: '4',
    name: 'Epitech Berlin',
    country: 'Germany',
    status: 'blocked',
    connectedUsers: 5,
    blockedReason: 'CAMPUS_NOT_ALLOWED (R8)',
  },
];

export default function InteroperabilityScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);

  // Filtrage
  const filteredCampuses = MOCK_CAMPUSES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Gestion des actions
  const handleCampusPress = (campus: Campus) => {
    if (campus.status === 'blocked') {
      Alert.alert('Campus Bloqué', `Raison: ${campus.blockedReason}`);
      return;
    }
    setSelectedCampus(campus.id);
  };

  const getStatusColor = (status: CampusStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: CampusStatus) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'pending': return 'En attente';
      case 'blocked': return 'Bloqué';
      default: return status;
    }
  };

  // --- Rendu d'une carte (Design Wireframe + Données Terminal) ---
  const renderCampusCard = ({ item }: { item: Campus }) => {
    const isSelected = selectedCampus === item.id;
    const isBlocked = item.status === 'blocked';

    return (
      <TouchableOpacity
        onPress={() => handleCampusPress(item)}
        activeOpacity={0.7}
        className={`
          p-4 mb-3 rounded-2xl border 
          ${isSelected ? 'bg-[#D6E8FF] border-blue-300' : 'bg-white border-gray-100'}
          ${isBlocked ? 'opacity-80' : ''}
          shadow-sm
        `}
      >
        <View className="flex-row items-center justify-between">
          {/* Info Gauche : Icone + Nom */}
          <View className="flex-row items-center gap-3">
            <View className={`w-10 h-10 rounded-xl items-center justify-center ${isSelected ? 'bg-blue-500' : 'bg-gray-100'}`}>
              <Building2 size={20} color={isSelected ? 'white' : '#666'} />
            </View>
            <View>
              <Text className="text-base font-semibold text-black">
                {item.name}
              </Text>
              <Text className="text-xs text-gray-500">
                {item.country} • {item.connectedUsers} étudiants
              </Text>
            </View>
          </View>

          {/* Info Droite : Badge Statut */}
          <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status).split(' ')[0]}`}>
            <Text className={`text-xs font-medium ${getStatusColor(item.status).split(' ')[1]}`}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Info Bonus : Raison du blocage (Si bloqué) */}
        {item.blockedReason && (
          <View className="mt-3 flex-row items-center gap-2 bg-red-50 p-2 rounded-lg">
            <ShieldAlert size={14} color="#EF4444" />
            <Text className="text-xs text-red-600 font-medium">
              {item.blockedReason}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F5F7]">
      {/* --- HEADER (Style Wireframe) --- */}
      <View className="px-5 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-black">
          Inter-Campus
        </Text>
        <View className="w-8" /> 
      </View>

      <View className="flex-1 px-5">
        {/* --- SEARCH BAR (Style Wireframe: Arrondi + Blanc) --- */}
        <View className="flex-row items-center bg-white rounded-full px-4 h-12 mb-6 border border-gray-200 shadow-sm">
          <Search size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-3 text-base text-black"
            placeholder="Rechercher un campus..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* --- LISTE DES CAMPUS (Fusion) --- */}
        <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">
          Partenaires ({filteredCampuses.length})
        </Text>

        <FlatList
          data={filteredCampuses}
          renderItem={renderCampusCard}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      {/* --- CTA ACTIONS (Logique Terminal + Style Wireframe) --- */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 pb-8 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <View className="flex-row gap-3">
          {/* Bouton Contacter */}
          <TouchableOpacity 
            className="flex-1 flex-row items-center justify-center bg-gray-100 py-4 rounded-xl active:opacity-80"
            onPress={() => console.log('Contacter')}
          >
            <MessageCircle size={20} color="#374151" />
            <Text className="ml-2 font-semibold text-gray-700">Contacter</Text>
          </TouchableOpacity>

          {/* Bouton Transfert */}
          <TouchableOpacity 
            className="flex-1 flex-row items-center justify-center bg-blue-600 py-4 rounded-xl active:opacity-80"
            onPress={() => console.log('Transfert')}
          >
            <Send size={20} color="white" />
            <Text className="ml-2 font-semibold text-white">Transfert</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}