import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  ActivityIndicator, 
  Pressable, 
  Alert,
  StyleSheet,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Chrome } from 'lucide-react-native'; // Assure-toi d'avoir lucide-react-native
import { supabase } from '../lib/supabase'; // Ton fichier de config Supabase

// Types pour la navigation (à adapter selon ta config)
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Onboarding: undefined;
  EmailLogin: undefined;
  Register: undefined;
  Main: undefined;
};

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [isLoading, setIsLoading] = useState(false);

  // --- Handlers ---

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'surphywallet://auth/callback',
        },
      });

      if (error) throw error;
      // La navigation vers 'Main' se fera via un listener d'état Auth dans ton App.tsx
    } catch (error) {
      Alert.alert('Erreur', "Échec de la connexion Google.");
      setIsLoading(false);
    }
  };

  const handleEmailLogin = () => {
    navigation.navigate('EmailLogin');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  // --- Render ---

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      <View className="flex-1 px-5 justify-between py-4">
        
        {/* SECTION HAUTE : Logo & Branding */}
        <View className="flex-1 justify-center items-center mt-10">
          {/* Placeholder Logo - Remplace par ton composant <Image /> */}
          <View className="w-20 h-20 bg-blue-500 rounded-2xl mb-6 items-center justify-center shadow-lg shadow-blue-500/30">
            <Text className="text-white text-3xl font-bold">S</Text>
          </View>

          <Text className="text-[32px] font-bold text-gray-900 text-center mb-2 leading-tight">
            Surphy Wallet
          </Text>
          
          <Text className="text-base text-gray-500 text-center font-normal">
            Votre portefeuille étudiant intelligent
          </Text>
        </View>

        {/* SECTION BASSE : Actions */}
        <View className="w-full gap-y-4 mb-4">
          
          {/* Loader Overlay si nécessaire */}
          {isLoading && (
            <View className="absolute z-50 self-center -top-12">
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          )}

          {/* Bouton Google (Variant: Outline) */}
          <Pressable
            onPress={handleGoogleLogin}
            disabled={isLoading}
            accessibilityLabel="Se connecter avec Google"
            accessibilityHint="Double-tap pour vous connecter avec votre compte Google"
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
              styles.googleButton
            ]}
            className="flex-row items-center justify-center h-14 rounded-xl bg-white border border-gray-200"
          >
            <Chrome size={20} color="#111827" style={{ marginRight: 12 }} />
            <Text className="text-base font-semibold text-gray-900">
              Se connecter avec Google
            </Text>
          </Pressable>

          {/* Bouton Email (Variant: Primary) */}
          <Pressable
            onPress={handleEmailLogin}
            disabled={isLoading}
            accessibilityLabel="Se connecter avec Email"
            accessibilityHint="Double-tap pour entrer vos identifiants"
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
              styles.primaryButtonShadow // Application de l'ombre complexe du Design System
            ]}
            className="flex-row items-center justify-center h-14 rounded-xl bg-blue-500"
          >
            <Mail size={20} color="#FFFFFF" style={{ marginRight: 12 }} />
            <Text className="text-base font-semibold text-white">
              Se connecter avec Email
            </Text>
          </Pressable>

          {/* Lien Inscription */}
          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-500 text-sm">Pas encore de compte ? </Text>
            <Pressable 
              onPress={handleRegister}
              accessibilityLabel="S'inscrire"
              accessibilityHint="Double-tap pour créer un compte"
            >
              <Text className="text-blue-500 text-sm font-medium">
                S'inscrire
              </Text>
            </Pressable>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

// Styles spécifiques pour les ombres complexes demandées dans le Design System
// NativeWind gère mal les ombres iOS complexes (shadowOffset, shadowRadius), 
// donc on utilise StyleSheet pour cette précision.
const styles = StyleSheet.create({
  primaryButtonShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
        shadowColor: '#3B82F6',
      },
    }),
  },
  googleButton: {
    // Ombre très légère pour le bouton blanc (optionnel mais recommandé)
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  }
});