import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Switch,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  LogOut,
  Bell,
  Lock,
  User,
  Building,
  CreditCard,
  HelpCircle,
  FileText,
  Shield
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/api';
import type { User as UserType } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  Onboarding: undefined;
  Profile: undefined;
  PersonalInfo: undefined;
  CampusSettings: undefined;
  SecuritySettings: undefined;
};

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  // --- State ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);

  const [notifSettings, setNotifSettings] = useState({
    suspicious: true,
    blocked: true,
    weekly: false
  });

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // --- Helpers ---
  const getInitials = (fullName: string | null | undefined): string => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCampusCode = (campus: string | null | undefined): string => {
    if (!campus) return 'EP';
    const codes: Record<string, string> = {
      'Paris': 'EP',
      'Lyon': 'EL',
      'Bordeaux': 'EB',
      'Lille': 'ELI',
      'Nantes': 'EN',
      'Marseille': 'EM',
      'Toulouse': 'ET',
    };
    return codes[campus] || campus.slice(0, 2).toUpperCase();
  };

  const getStudentId = (id: string | null | undefined): string => {
    if (!id) return '------';
    // Extraire les 6 premiers caractères de l'UUID
    return id.replace(/-/g, '').slice(0, 6).toUpperCase();
  };

  const toggleSwitch = (key: keyof typeof notifSettings) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Handlers ---
  const handleLogout = async () => {
    Alert.alert(
      "Se déconnecter ?",
      "Vous devrez vous reconnecter pour accéder à votre compte.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnexion",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }],
            });
          }
        }
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;

    Alert.alert(
      "Changer de mot de passe",
      "Un email de réinitialisation sera envoyé à votre adresse.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Envoyer",
          onPress: async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) {
              Alert.alert("Erreur", error.message);
            } else {
              Alert.alert("Email envoyé", "Vérifiez votre boîte de réception.");
            }
          }
        }
      ]
    );
  };

  // --- Composants Internes ---

  const SectionTitle = ({ title }: { title: string }) => (
    <Text className="text-[22px] font-semibold text-gray-900 mx-5 mb-4 mt-2">
      {title}
    </Text>
  );

  const MenuCard = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.cardShadow} className="bg-white rounded-2xl mx-5 mb-6 border border-gray-200 overflow-hidden">
      {children}
    </View>
  );

  const MenuItem = ({
    icon: Icon,
    label,
    value,
    onPress,
    isLast = false,
    textColor = 'text-gray-900'
  }: {
    icon: any,
    label: string,
    value?: string,
    onPress: () => void,
    isLast?: boolean,
    textColor?: string
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: pressed ? '#F9FAFB' : 'white' }
      ]}
      className={`flex-row items-center justify-between px-5 py-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
      <View className="flex-row items-center gap-3">
        <View className="w-8 items-center">
          <Icon size={20} color={textColor === 'text-red-600' ? '#DC2626' : '#6B7280'} />
        </View>
        <Text className={`text-[16px] font-medium ${textColor}`}>{label}</Text>
      </View>

      <View className="flex-row items-center gap-2">
        {value && <Text className="text-[15px] text-gray-500">{value}</Text>}
        <ChevronRight size={20} color="#9CA3AF" />
      </View>
    </Pressable>
  );

  const ToggleItem = ({
    label,
    value,
    onValueChange,
    isLast = false
  }: {
    label: string,
    value: boolean,
    onValueChange: () => void,
    isLast?: boolean
  }) => (
    <View className={`flex-row items-center justify-between px-5 py-3.5 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <Text className="text-[16px] font-medium text-gray-900 flex-1 mr-4">{label}</Text>
      <Switch
        trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E5E7EB"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

  // --- Loading State ---
  if (loading) {
    return (
      <View className="flex-1 bg-[#F3F4F6] items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-4">Chargement...</Text>
      </View>
    );
  }

  // --- No User State ---
  if (!user) {
    return (
      <View className="flex-1 bg-[#F3F4F6] items-center justify-center px-6">
        <User size={64} color="#9CA3AF" />
        <Text className="text-gray-500 mt-4 text-center">Impossible de charger le profil</Text>
        <Pressable
          onPress={handleLogout}
          className="mt-6 bg-red-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Se déconnecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >

        {/* 1. Header */}
        <View className="px-5 pt-4 pb-2 flex-row justify-between items-center">
          <View />
          <Bell size={24} color="#111827" />
        </View>

        {/* 2. Profile Card */}
        <View style={styles.cardShadow} className="bg-white rounded-2xl p-6 mx-5 mb-6 items-center border border-gray-200 mt-2 relative">
          <View className="mb-4 relative">
            <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center overflow-hidden">
              <Text className="text-2xl font-bold text-blue-600">
                {getInitials(user.full_name)}
              </Text>
            </View>
            {/* School Badge Overlay */}
            <View className="absolute -bottom-0 -right-0 bg-[#5B21B6] w-8 h-8 rounded-lg border-2 border-white items-center justify-center">
              <Text className="text-white text-[10px] font-bold">{getCampusCode(user.campus)}</Text>
            </View>
          </View>

          <Text className="text-[28px] font-bold text-gray-900 mb-1">{user.full_name || 'Utilisateur'}</Text>
          <Text className="text-gray-500 text-sm mb-4">{user.email}</Text>

          {/* KYC Status Badge */}
          {user.kyc_verified_at && (
            <View className="flex-row items-center gap-2 mb-4 bg-green-50 px-3 py-1.5 rounded-full">
              <Shield size={14} color="#10B981" />
              <Text className="text-green-700 text-xs font-medium">Identité vérifiée</Text>
            </View>
          )}

          <Pressable
            className="bg-blue-500 w-full py-3.5 rounded-xl items-center"
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            onPress={() => Alert.alert("Modifier le profil", "Fonctionnalité à venir")}
          >
            <Text className="text-white font-semibold text-base">Modifier le profil</Text>
          </Pressable>
        </View>

        {/* 3. Section "Compte" */}
        <SectionTitle title="Compte" />
        <MenuCard>
          <MenuItem
            icon={Building}
            label="Campus"
            value={user.campus || 'Non défini'}
            onPress={() => Alert.alert("Campus", `Votre campus : ${user.campus || 'Non défini'}`)}
          />
          <MenuItem
            icon={User}
            label="Identifiant"
            value={getStudentId(user.id)}
            onPress={() => {}}
          />
          <MenuItem
            icon={FileText}
            label="Signalements"
            onPress={() => Alert.alert("Signalements", "Aucun signalement en cours")}
            isLast
          />
        </MenuCard>

        {/* 4. Section "Sécurité" */}
        <SectionTitle title="Sécurité" />
        <MenuCard>
          <MenuItem
            icon={Lock}
            label="Changer de mot de passe"
            onPress={handleChangePassword}
          />
          <MenuItem
            icon={LogOut}
            label="Se déconnecter"
            textColor="text-red-600"
            onPress={handleLogout}
            isLast
          />
        </MenuCard>

        {/* 5. Section "Notifications" */}
        <SectionTitle title="Notifications" />
        <MenuCard>
          <ToggleItem
            label="Transactions suspectes"
            value={notifSettings.suspicious}
            onValueChange={() => toggleSwitch('suspicious')}
          />
          <ToggleItem
            label="Transactions bloquées"
            value={notifSettings.blocked}
            onValueChange={() => toggleSwitch('blocked')}
          />
          <ToggleItem
            label="Récapitulatif hebdo"
            value={notifSettings.weekly}
            onValueChange={() => toggleSwitch('weekly')}
            isLast
          />
        </MenuCard>

        {/* Footer */}
        <Pressable className="flex-row justify-center items-center mt-4 mb-8 gap-2">
          <HelpCircle size={18} color="#3B82F6" />
          <Text className="text-blue-500 font-medium text-[15px]">Contacter le support</Text>
        </Pressable>

        <Text className="text-center text-gray-400 text-xs mb-4">Version 1.0.0 (Build 24)</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
        shadowColor: '#000000',
      },
    }),
  }
});
