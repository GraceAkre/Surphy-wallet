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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  LogOut,
  Lock,
  Shield,
  Info,
  LucideIcon,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/api';
import { getMLConfig, updateMLConfig, ML_PRESETS } from '../../lib/analystApi';
import type { MLConfig } from '../../lib/analystApi';
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
  const [mlConfig, setMlConfig] = useState<MLConfig>({
    preset: 'normal',
    threshold_approve: 30,
    threshold_block: 70,
  });
  const [mlSaving, setMlSaving] = useState(false);
  const [mlInfoVisible, setMlInfoVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [currentUser, config] = await Promise.all([
        getCurrentUser(),
        getMLConfig(),
      ]);
      setUser(currentUser);
      setMlConfig(config);
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
          <Text className="text-subheadline text-ink-secondary mb-2">
            {user.email}
          </Text>

          {/* Role Badge */}
          <View className="flex-row items-center gap-1.5 bg-primary-50 px-2.5 py-1 rounded-full">
            <Shield size={12} color="#3B82F6" />
            <Text className="text-caption1 text-primary font-medium">
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

        {/* Sensibilité ML */}
        <View className="flex-row items-center justify-between mx-screen mb-4 mt-2">
          <Text className="text-title2 text-ink-primary">Sensibilité ML</Text>
          <Pressable onPress={() => setMlInfoVisible(true)} hitSlop={12}>
            <Info size={20} color="#86868B" />
          </Pressable>
        </View>

        {/* Modal info sensibilité ML */}
        <Modal
          visible={mlInfoVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMlInfoVisible(false)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-center items-center px-6"
            onPress={() => setMlInfoVisible(false)}
          >
            <Pressable className="bg-white rounded-2xl p-6 w-full" onPress={() => {}}>
              <Text className="text-title2 text-ink-primary mb-4">Niveaux de sensibilité</Text>

              <View className="mb-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="w-3 h-3 rounded-full bg-green-500" />
                  <Text className="text-body font-semibold text-ink-primary">Souple</Text>
                </View>
                <Text className="text-footnote text-ink-secondary ml-5">
                  Approve si score {'<'} 50 | Review entre 50-79 | Block si {'>='} 80{'\n'}
                  Moins de faux positifs, idéal en période calme.
                </Text>
              </View>

              <View className="mb-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="w-3 h-3 rounded-full bg-blue-500" />
                  <Text className="text-body font-semibold text-ink-primary">Normal</Text>
                </View>
                <Text className="text-footnote text-ink-secondary ml-5">
                  Approve si score {'<'} 30 | Review entre 30-69 | Block si {'>='} 70{'\n'}
                  Équilibre entre sécurité et fluidité. Recommandé par défaut.
                </Text>
              </View>

              <View className="mb-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="w-3 h-3 rounded-full bg-red-500" />
                  <Text className="text-body font-semibold text-ink-primary">Strict</Text>
                </View>
                <Text className="text-footnote text-ink-secondary ml-5">
                  Approve si score {'<'} 20 | Review entre 20-49 | Block si {'>='} 50{'\n'}
                  Maximum de sécurité, plus de transactions bloquées/reviewées.
                </Text>
              </View>

              <Pressable
                onPress={() => setMlInfoVisible(false)}
                className="bg-primary py-3 rounded-button items-center mt-2"
              >
                <Text className="text-headline text-white">Compris</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Card variant="elevated" padding="lg" className="mx-screen mb-6">
          <Text className="text-footnote text-ink-secondary mb-4">
            Ajustez la sensibilité de la détection de fraude. Un mode strict bloquera plus de transactions suspectes.
          </Text>

          <View className="flex-row gap-2 mb-4">
            {(['souple', 'normal', 'strict'] as const).map((preset) => {
              const isActive = mlConfig.preset === preset;
              const labels = { souple: 'Souple', normal: 'Normal', strict: 'Strict' };
              const colors = {
                souple: isActive ? 'bg-green-500' : 'bg-surface-secondary',
                normal: isActive ? 'bg-primary' : 'bg-surface-secondary',
                strict: isActive ? 'bg-danger' : 'bg-surface-secondary',
              };
              return (
                <Pressable
                  key={preset}
                  onPress={async () => {
                    if (mlSaving || isActive) return;
                    selection();
                    setMlSaving(true);
                    const thresholds = ML_PRESETS[preset];
                    const res = await updateMLConfig(preset, thresholds.threshold_approve, thresholds.threshold_block);
                    if (res.success) {
                      setMlConfig({ preset, ...thresholds });
                    } else {
                      Alert.alert('Erreur', res.errorMessage || 'Impossible de sauvegarder.');
                    }
                    setMlSaving(false);
                  }}
                  className={`flex-1 py-3 rounded-button items-center ${colors[preset]}`}
                >
                  <Text className={`text-footnote font-semibold ${isActive ? 'text-white' : 'text-ink-secondary'}`}>
                    {labels[preset]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Seuils actuels */}
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-caption2 text-ink-tertiary">Approve</Text>
              <Text className="text-footnote text-ink-primary font-medium">{'< '}{mlConfig.threshold_approve}</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-caption2 text-ink-tertiary">Review</Text>
              <Text className="text-footnote text-ink-primary font-medium">{mlConfig.threshold_approve}-{mlConfig.threshold_block - 1}</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-caption2 text-ink-tertiary">Block</Text>
              <Text className="text-footnote text-ink-primary font-medium">{'>= '}{mlConfig.threshold_block}</Text>
            </View>
          </View>

          {mlSaving && (
            <ActivityIndicator size="small" color="#3B82F6" className="mt-3" />
          )}
        </Card>

        <Text className="text-center text-ink-tertiary text-caption1 mt-4 mb-4">
          Version 1.0.0 (Build 24)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
