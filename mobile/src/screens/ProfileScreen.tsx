import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Share,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  LogOut,
  Bell,
  Lock,
  User,
  Building,
  FileText,
  HelpCircle,
  Shield,
  MapPin,
  Check,
  X,
  Download,
  Trash2,
  LucideIcon,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { getCurrentUser, updateUserProfile, exportMyData, deleteMyAccount } from '../lib/api';
import type { User as UserType } from '../lib/types';

// Components
import { Card, Avatar } from '../components/ui';

// Utils
import { shadows } from '../utils/shadows';
import { getInitials } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// --- Types ---

type RootStackParamList = {
  Onboarding: undefined;
  Profile: undefined;
};

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { light, selection } = useHaptics();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);

  const [campusModalVisible, setCampusModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [notifSettings, setNotifSettings] = useState({
    suspicious: true,
    blocked: true,
    weekly: false,
  });

  // Fetch data
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

  // Helpers
  const getCampusCode = (campus: string | null | undefined): string => {
    if (!campus) return 'EP';
    const codes: Record<string, string> = {
      Paris: 'EP',
      Lyon: 'EL',
      Bordeaux: 'EB',
      Lille: 'ELI',
      Nantes: 'EN',
      Marseille: 'EM',
      Toulouse: 'ET',
    };
    return codes[campus] || campus.slice(0, 2).toUpperCase();
  };

  const getStudentId = (id: string | null | undefined): string => {
    if (!id) return '------';
    return id.replace(/-/g, '').slice(0, 6).toUpperCase();
  };

  const toggleSwitch = (key: keyof typeof notifSettings) => {
    selection();
    setNotifSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handlers
  const handleLogout = async () => {
    Alert.alert(
      'Se déconnecter ?',
      'Vous devrez vous reconnecter pour accéder à votre compte.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }],
            });
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;

    Alert.alert(
      'Changer de mot de passe',
      'Un email de réinitialisation sera envoyé à votre adresse.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) {
              Alert.alert('Erreur', error.message);
            } else {
              Alert.alert('Email envoyé', 'Vérifiez votre boîte de réception.');
            }
          },
        },
      ]
    );
  };

  const handleCampusSelect = async (campus: string) => {
    if (!user || campus === user.campus) {
      setCampusModalVisible(false);
      return;
    }

    const result = await updateUserProfile(user.id, { campus });
    if (result.success) {
      setUser({ ...user, campus });
    } else {
      Alert.alert('Erreur', result.errorMessage || 'Impossible de changer le campus');
    }
    setCampusModalVisible(false);
  };

  const handleDownloadData = () => {
    Alert.alert(
      'Télécharger mes données',
      'Vos données personnelles seront exportées au format JSON.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Télécharger',
          onPress: async () => {
            setExporting(true);
            try {
              const result = await exportMyData();
              if (!result.success || !result.data) {
                Alert.alert('Erreur', result.errorMessage || "Impossible d'exporter les données");
                return;
              }

              const jsonString = JSON.stringify(result.data, null, 2);
              await Share.share({
                message: jsonString,
                title: 'Mes données Surphy',
              });
            } catch (error) {
              console.error('Error exporting data:', error);
              Alert.alert('Erreur', "Une erreur est survenue lors de l'export");
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmer la suppression',
              'Êtes-vous vraiment sûr(e) ? Cette action ne peut pas être annulée.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer définitivement',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const result = await deleteMyAccount();
                      if (!result.success) {
                        Alert.alert('Erreur', result.errorMessage || 'Impossible de supprimer le compte');
                        return;
                      }

                      await supabase.auth.signOut();
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Onboarding' }],
                      });
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // --- Components ---

  const SectionTitle = ({ title }: { title: string }) => (
    <Text className="text-title2 text-ink-primary mx-screen mb-4 mt-2">
      {title}
    </Text>
  );

  const MenuCard = ({ children }: { children: React.ReactNode }) => (
    <Card variant="elevated" padding="none" className="mx-screen mb-6 overflow-hidden">
      {children}
    </Card>
  );

  const MenuItem = ({
    icon: Icon,
    label,
    value,
    onPress,
    isLast = false,
    isDanger = false,
  }: {
    icon: LucideIcon;
    label: string;
    value?: string;
    onPress: () => void;
    isLast?: boolean;
    isDanger?: boolean;
  }) => (
    <Pressable
      onPress={() => {
        light();
        onPress();
      }}
      style={({ pressed }) => [
        { backgroundColor: pressed ? '#F9FAFB' : 'white' },
      ]}
      className={`
        flex-row items-center justify-between px-4 py-4
        ${!isLast ? 'border-b border-separator-opaque/50' : ''}
      `}
    >
      <View className="flex-row items-center gap-3">
        <View className="w-8 items-center">
          <Icon size={20} color={isDanger ? '#FF3B30' : '#6E6E73'} />
        </View>
        <Text
          className={`text-body font-medium ${
            isDanger ? 'text-danger' : 'text-ink-primary'
          }`}
        >
          {label}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {value && (
          <Text className="text-subheadline text-ink-secondary">{value}</Text>
        )}
        <ChevronRight size={20} color="#86868B" />
      </View>
    </Pressable>
  );

  const ToggleItem = ({
    label,
    value,
    onValueChange,
    isLast = false,
  }: {
    label: string;
    value: boolean;
    onValueChange: () => void;
    isLast?: boolean;
  }) => (
    <View
      className={`
        flex-row items-center justify-between px-4 py-3.5
        ${!isLast ? 'border-b border-separator-opaque/50' : ''}
      `}
    >
      <Text className="text-body font-medium text-ink-primary flex-1 mr-4">
        {label}
      </Text>
      <Switch
        trackColor={{ false: '#E5E5EA', true: '#3B82F6' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E5E5EA"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
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

  // --- No User State ---
  if (!user) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <User size={64} color="#86868B" />
        <Text className="text-body text-ink-secondary mt-4 text-center">
          Impossible de charger le profil
        </Text>
        <Pressable
          onPress={handleLogout}
          className="mt-6 bg-danger px-6 py-3 rounded-button"
        >
          <Text className="text-headline text-white">Se déconnecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Header */}
        <View className="px-screen pt-4 pb-2 flex-row justify-between items-center">
          <View />
          <Bell size={24} color="#1D1D1F" />
        </View>

        {/* Profile Card */}
        <Card variant="elevated" padding="lg" className="mx-screen mb-6 mt-2 items-center">
          {/* Avatar */}
          <View className="mb-4 relative">
            <Avatar
              size="xl"
              name={`${user.firstname ?? ''} ${user.lastname ?? ''}`.trim()}
            />
            {/* Campus Badge */}
            <View className="absolute -bottom-0 -right-0 bg-primary-600 w-8 h-8 rounded-lg border-2 border-white items-center justify-center">
              <Text className="text-white text-caption2 font-bold">
                {getCampusCode(user.campus)}
              </Text>
            </View>
          </View>

          <Text className="text-title1 text-ink-primary mb-1">
            {`${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || 'Utilisateur'}
          </Text>
          <Text className="text-subheadline text-ink-secondary mb-4">
            {user.email}
          </Text>

          {/* KYC Badge */}
          {user.kyc_verified_at && (
            <View className="flex-row items-center gap-2 mb-4 bg-success-50 px-3 py-1.5 rounded-chip">
              <Shield size={14} color="#34C759" />
              <Text className="text-footnote text-success-600 font-medium">
                Identité vérifiée
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => Alert.alert('Modifier le profil', 'Fonctionnalité à venir')}
            style={({ pressed }) => [
              shadows.primaryButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            className="bg-primary w-full py-3.5 rounded-button items-center"
          >
            <Text className="text-headline text-white">Modifier le profil</Text>
          </Pressable>
        </Card>

        {/* Account Section */}
        <SectionTitle title="Compte" />
        <MenuCard>
          <MenuItem
            icon={Building}
            label="Campus"
            value={user.campus || 'Non défini'}
            onPress={() => setCampusModalVisible(true)}
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
            onPress={() => Alert.alert('Signalements', 'Aucun signalement en cours')}
            isLast
          />
        </MenuCard>

        {/* Security Section */}
        <SectionTitle title="Sécurité" />
        <MenuCard>
          <MenuItem
            icon={Lock}
            label="Changer de mot de passe"
            onPress={handleChangePassword}
          />
          <MenuItem
            icon={Download}
            label={exporting ? 'Export en cours…' : 'Télécharger mes données'}
            onPress={handleDownloadData}
          />
          <MenuItem
            icon={Trash2}
            label="Supprimer mon compte"
            isDanger
            onPress={handleDeleteAccount}
          />
          <MenuItem
            icon={LogOut}
            label="Se déconnecter"
            isDanger
            onPress={handleLogout}
            isLast
          />
        </MenuCard>

        {/* Notifications Section */}
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

        {/* Support Link */}
        <Pressable className="flex-row justify-center items-center mt-4 mb-8 gap-2">
          <HelpCircle size={18} color="#3B82F6" />
          <Text className="text-subheadline text-primary font-medium">
            Contacter le support
          </Text>
        </Pressable>

        <Text className="text-center text-ink-tertiary text-caption1 mb-4">
          Version 1.0.0 (Build 24)
        </Text>
      </ScrollView>

      {/* Campus Selection Modal */}
      <Modal
        visible={campusModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCampusModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-screen py-4 border-b border-separator-opaque/50">
            <Text className="text-title2 text-ink-primary font-semibold">
              Changer de campus
            </Text>
            <Pressable
              onPress={() => setCampusModalVisible(false)}
              className="w-8 h-8 items-center justify-center rounded-full bg-gray-100"
            >
              <X size={18} color="#6E6E73" />
            </Pressable>
          </View>

          <View className="px-screen pt-6">
            {['Paris', 'Lyon', 'Bordeaux'].map((campus, index) => {
              const isSelected = user.campus === campus;
              return (
                <Pressable
                  key={campus}
                  onPress={() => {
                    light();
                    handleCampusSelect(campus);
                  }}
                  style={({ pressed }) => [
                    { backgroundColor: pressed ? '#F9FAFB' : isSelected ? '#EFF6FF' : 'white' },
                    shadows.card,
                  ]}
                  className={`
                    flex-row items-center justify-between px-4 py-4 rounded-xl
                    ${index < 2 ? 'mb-3' : ''}
                    ${isSelected ? 'border border-primary' : 'border border-separator-opaque/50'}
                  `}
                >
                  <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${isSelected ? 'bg-primary' : 'bg-gray-100'}`}>
                      <MapPin size={20} color={isSelected ? '#FFFFFF' : '#6E6E73'} />
                    </View>
                    <View>
                      <Text className={`text-body font-medium ${isSelected ? 'text-primary' : 'text-ink-primary'}`}>
                        {campus}
                      </Text>
                      <Text className="text-caption1 text-ink-secondary">
                        Epitech {campus}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
