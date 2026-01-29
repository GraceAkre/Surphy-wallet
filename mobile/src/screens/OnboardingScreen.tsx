import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Mail, ArrowRight } from 'lucide-react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { shadows } from '../utils/shadows';
import { useHaptics } from '../hooks/useHaptics';

// --- Types ---

type RootStackParamList = {
  Onboarding: undefined;
  EmailLogin: undefined;
  Main: undefined;
};

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

// --- Logo Component ---

const SurphyLogo = () => (
  <View className="w-[120px] h-[120px] items-center justify-center">
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {/* Outer glow */}
      <Circle cx="60" cy="60" r="55" fill="#3B82F6" opacity={0.1} />
      <Circle cx="60" cy="60" r="45" fill="#3B82F6" opacity={0.2} />
      {/* Inner circle */}
      <Circle cx="60" cy="60" r="35" fill="#3B82F6" />
      {/* Shield icon */}
      <G>
        <Path
          d="M60 30 L78 42 L78 58 C78 72 60 85 60 85 C60 85 42 72 42 58 L42 42 Z"
          fill="white"
          opacity={0.9}
        />
        <Path
          d="M55 55 L58 58 L68 48"
          stroke="#3B82F6"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    </Svg>
  </View>
);

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { light } = useHaptics();

  const handleEmailSignIn = () => {
    light();
    navigation.navigate('EmailLogin');
  };

  return (
    <LinearGradient
      colors={['#EFF6FF', '#DBEAFE', '#BFDBFE']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 justify-between px-6 py-5">

        {/* 1. Hero Section */}
        <View className="items-center mt-15">
          <SurphyLogo />

          <Text className="text-largeTitle text-ink-primary text-center mt-6 leading-tight">
            Smart Wallet{'\n'}pour Étudiants
          </Text>

          <Text className="text-body text-ink-secondary text-center mt-4 leading-relaxed px-4">
            Gérez vos finances en toute sécurité grâce à notre IA de détection de fraude.
          </Text>
        </View>

        {/* 2. Trust Badge */}
        <View className="items-center">
          <View className="flex-row items-center bg-success-50 px-5 py-3 rounded-chip gap-2">
            <ShieldCheck size={20} color="#34C759" />
            <Text className="text-subheadline font-semibold text-success-600">
              Protection IA en temps réel
            </Text>
          </View>
        </View>

        {/* 3. CTA Section */}
        <View className="gap-4">
          {/* Primary Email Button */}
          <Pressable
            onPress={handleEmailSignIn}
            style={({ pressed }) => [
              shadows.primaryButton,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            className="flex-row items-center bg-primary py-4 px-5 rounded-card gap-3"
          >
            <Mail size={20} color="white" />
            <Text className="text-headline text-white flex-1">
              Continuer avec Email
            </Text>
            <ArrowRight size={20} color="white" />
          </Pressable>

          {/* Footer */}
          <Text className="text-caption1 text-ink-tertiary text-center leading-5 px-4">
            En continuant, vous acceptez nos{' '}
            <Text className="text-primary font-medium">Conditions d'utilisation</Text>
            {' '}et notre{' '}
            <Text className="text-primary font-medium">Politique de confidentialité</Text>.
          </Text>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}
