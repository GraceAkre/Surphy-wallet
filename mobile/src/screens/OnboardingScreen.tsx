import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Mail } from 'lucide-react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { shadows } from '../utils/shadows';
import { useHaptics } from '../hooks/useHaptics';

// --- Types ---

type RootStackParamList = {
  Onboarding: undefined;
  EmailLogin: undefined;
  Terms: undefined;
  Privacy: undefined;
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

const PulseDot = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className="w-1.5 h-1.5 rounded-full bg-success-500"
    />
  );
};

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

        {/* 2. Trust Badge - Glassmorphism */}
        <View className="items-center">
          <View
            className="flex-row items-center px-3 py-2 rounded-chip gap-1.5"
            style={{
              backgroundColor: 'rgba(232, 255, 240, 0.6)',
              borderWidth: 0.5,
              borderColor: '#34C759',
            }}
          >
            <ShieldCheck size={16} color="#34C759" />
            <PulseDot />
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
            className="flex-row items-center justify-center px-5 rounded-chip gap-3"
            style={{ height: 52, backgroundColor: '#4B8DF8' }}
          >
            <Mail size={18} color="white" strokeWidth={1.5} />
            <Text
              className="text-headline text-white"
              style={{ fontWeight: '500', letterSpacing: 0.5 }}
            >
              Continuer avec votre e-mail étudiant
            </Text>
          </Pressable>

          {/* Footer */}
          <View className="mt-2 gap-1">
            <Text className="text-caption1 text-ink-tertiary text-center leading-5 px-4">
              En continuant, vous acceptez nos
            </Text>
            <View className="flex-row justify-center gap-3">
              <Pressable onPress={() => navigation.navigate('Terms')}>
                <Text className="text-caption1 text-primary font-medium">
                  Conditions d'utilisation
                </Text>
              </Pressable>
              <Text className="text-caption1 text-ink-tertiary">•</Text>
              <Pressable onPress={() => navigation.navigate('Privacy')}>
                <Text className="text-caption1 text-primary font-medium">
                  Politique de confidentialité
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}
