import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, Path, G } from 'react-native-svg';

// --- Types ---

type RootStackParamList = {
  Onboarding: undefined;
  EmailLogin: undefined;
  Main: undefined;
};

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

// --- Composant Logo SVG Custom ---

const SurphyLogo = () => (
  <Svg width={100} height={100} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="45" fill="#3B82F6" opacity={0.15} />
    <Circle cx="50" cy="50" r="35" fill="#3B82F6" opacity={0.3} />
    <G>
      <Path
        d="M50 25 L65 40 L65 55 L50 70 L35 55 L35 40 Z"
        fill="#3B82F6"
        stroke="#2563EB"
        strokeWidth={2}
      />
      <Path
        d="M50 35 L50 55 M42 45 L58 45"
        stroke="white"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </G>
  </Svg>
);

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {

  // --- Handlers ---

  const handleEmailSignIn = () => {
    // Navigation vers écran de connexion par email
    navigation.navigate('EmailLogin');
  };

  return (
    <LinearGradient
      colors={['#EFF6FF', '#DBEAFE', '#BFDBFE']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* 1. Hero Section */}
        <View style={styles.heroSection}>
          <SurphyLogo />

          <Text style={styles.title}>
            Smart Wallet{'\n'}pour Étudiants
          </Text>

          <Text style={styles.subtitle}>
            Gérez vos finances en toute sécurité grâce à notre IA de détection de fraude.
          </Text>
        </View>

        {/* 2. Trust Badge */}
        <View style={styles.trustBadge}>
          <ShieldCheck size={20} color="#10B981" />
          <Text style={styles.trustText}>
            Protection IA en temps réel
          </Text>
        </View>

        {/* 3. CTA Buttons */}
        <View style={styles.ctaSection}>

          {/* Email Button (Primary) */}
          <Pressable
            onPress={handleEmailSignIn}
            style={({ pressed }) => [
              styles.emailButton,
              { transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
          >
            <Mail size={20} color="white" />
            <Text style={styles.emailButtonText}>
              Continuer avec Email
            </Text>
            <ArrowRight size={20} color="white" style={{ marginLeft: 'auto' }} />
          </Pressable>

        </View>

        {/* 4. Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            En continuant, vous acceptez nos{' '}
            <Text style={styles.footerLink}>Conditions d'utilisation</Text>
            {' '}et notre{' '}
            <Text style={styles.footerLink}>Politique de confidentialité</Text>.
          </Text>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

// --- Styles ---

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
    alignSelf: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  ctaSection: {
    gap: 12,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  footer: {
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});
