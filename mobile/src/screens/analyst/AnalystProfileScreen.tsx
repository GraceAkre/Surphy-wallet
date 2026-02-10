import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  LogOut,
  Lock,
  Shield,
  HelpCircle,
  LucideIcon,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/api';
import type { User } from '../../lib/types';

// Components
import { Card, Avatar } from '../../components/ui';

// Utils
import { shadows } from '../../utils/shadows';
import { getInitials } from '../../utils/formatters';
import { useHaptics } from '../../hooks/useHaptics';

// --- Types ---

type AnalystProfileScreenProps = {
  navigation: any;
};

export default function AnalystProfileScreen({ navigation }: AnalystProfileScreenProps) {
  const { light, selection } = useHaptics();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notifSettings, setNotifSettings] = useState({
    newAlerts: true,
    highRisk: true,
    weekly: false,
  });

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

  const toggleSwitch = (key: keyof typeof notifSettings) => {
    selection();
    setNotifSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // --- Sub-components ---

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
    onPress,
    isLast = false,
    isDanger = false,
  }: {
    icon: LucideIcon;
    label: string;
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
      <ChevronRight size={20} color="#86868B" />
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

  // --- Loading ---
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-body text-ink-secondary mt-4">Chargement...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Shield size={64} color="#86868B" />
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
        {/* Header spacer */}
        <View className="pt-4" />

        {/* Profile Card */}
        <Card variant="elevated" padding="lg" className="mx-screen mb-6 items-center">
          <View className="mb-4">
            <Avatar
              size="xl"
              name={`${user.firstname ?? ''} ${user.lastname ?? ''}`.trim()}
            />
          </View>

          <Text className="text-title1 text-ink-primary mb-1">
            {`${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || 'Analyste'}
          </Text>
          <Text className="text-subheadline text-ink-secondary mb-3">
            {user.email}
          </Text>

          {/* Role Badge */}
          <View className="flex-row items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-chip">
            <Shield size={14} color="#3B82F6" />
            <Text className="text-footnote text-primary font-medium">
              Analyste Fraude
            </Text>
          </View>
        </Card>

        {/* Security */}
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
            isDanger
            onPress={handleLogout}
            isLast
          />
        </MenuCard>

        {/* Notifications */}
        <SectionTitle title="Notifications" />
        <MenuCard>
          <ToggleItem
            label="Nouvelles alertes"
            value={notifSettings.newAlerts}
            onValueChange={() => toggleSwitch('newAlerts')}
          />
          <ToggleItem
            label="Risque élevé (70+)"
            value={notifSettings.highRisk}
            onValueChange={() => toggleSwitch('highRisk')}
          />
          <ToggleItem
            label="Récapitulatif hebdo"
            value={notifSettings.weekly}
            onValueChange={() => toggleSwitch('weekly')}
            isLast
          />
        </MenuCard>

        {/* Support */}
        <Pressable
          onPress={() => {
            light();
            navigation.navigate('SupportChat');
          }}
          className="flex-row justify-center items-center mt-4 mb-8 gap-2"
        >
          <HelpCircle size={18} color="#3B82F6" />
          <Text className="text-subheadline text-primary font-medium">
            Contacter le support
          </Text>
        </Pressable>

        <Text className="text-center text-ink-tertiary text-caption1 mb-4">
          Version 1.0.0 (Build 24)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
