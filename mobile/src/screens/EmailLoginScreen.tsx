import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { shadows } from '../utils/shadows';
import { useHaptics } from '../hooks/useHaptics';

// --- Types ---

type RootStackParamList = {
  Onboarding: undefined;
  EmailLogin: undefined;
  Main: undefined;
  AnalystMain: undefined;
};

type EmailLoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailLogin'>;
};

export default function EmailLoginScreen({ navigation }: EmailLoginScreenProps) {
  const { light, success, error: hapticError } = useHaptics();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Email requis', 'Veuillez entrer votre adresse email.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    if (!email.endsWith('@epitech.digital') && !email.endsWith('@analyst.surphy.fr')) {
      Alert.alert(
        'Domaine non autorisé',
        'Seules les adresses @epitech.digital et @analyst.surphy.fr sont autorisées.'
      );
      return;
    }

    if (!password.trim() || password.length < 6) {
      Alert.alert('Mot de passe invalide', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    light();

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            emailRedirectTo: undefined,
          },
        });

        if (error) {
          hapticError();
          if (error.message.includes('User already registered')) {
            Alert.alert(
              'Compte existant',
              'Un compte existe déjà avec cet email. Connectez-vous à la place.',
              [{ text: 'Se connecter', onPress: () => setIsSignUp(false) }]
            );
          } else {
            Alert.alert('Erreur', error.message);
          }
          return;
        }

        if (data.session) {
          success();
          const isAnalyst = email.trim().toLowerCase().endsWith('@analyst.surphy.fr');
          navigation.reset({
            index: 0,
            routes: [{ name: isAnalyst ? 'AnalystMain' : 'Main' }],
          });
          return;
        }

        if (data.user && !data.session) {
          Alert.alert(
            'Vérifiez votre email',
            'Un email de confirmation a été envoyé. Cliquez sur le lien pour activer votre compte, puis connectez-vous.',
            [{ text: 'OK', onPress: () => setIsSignUp(false) }]
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });

        if (error) {
          hapticError();
          if (error.message.includes('Invalid login credentials')) {
            Alert.alert('Erreur', 'Email ou mot de passe incorrect.');
          } else if (error.message.includes('Email not confirmed')) {
            Alert.alert('Erreur', 'Veuillez confirmer votre email avant de vous connecter.');
          } else {
            Alert.alert('Erreur', error.message);
          }
          return;
        }

        if (data.session) {
          success();
          const isAnalyst = email.trim().toLowerCase().endsWith('@analyst.surphy.fr');
          navigation.reset({
            index: 0,
            routes: [{ name: isAnalyst ? 'AnalystMain' : 'Main' }],
          });
        } else {
          hapticError();
          Alert.alert('Erreur', 'Connexion échouée. Veuillez réessayer.');
        }
      }
    } catch (err) {
      hapticError();
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-4 py-3">
            <Pressable
              onPress={() => navigation.goBack()}
              className="w-11 h-11 rounded-full bg-surface items-center justify-center border border-separator-opaque"
              style={shadows.soft}
            >
              <ChevronLeft size={24} color="#1D1D1F" />
            </Pressable>
          </View>

          {/* Content */}
          <View className="flex-1 px-6 pt-6">
            {/* Icon */}
            <View className="w-16 h-16 rounded-card bg-primary-50 items-center justify-center mb-6">
              <Mail size={32} color="#3B82F6" />
            </View>

            {/* Title */}
            <Text className="text-title1 text-ink-primary mb-2">
              {isSignUp ? 'Créer un compte' : 'Connexion'}
            </Text>
            <Text className="text-body text-ink-secondary leading-relaxed mb-8">
              {isSignUp
                ? 'Créez votre compte avec votre adresse institutionnelle'
                : 'Connectez-vous avec votre adresse institutionnelle'}
            </Text>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-footnote font-semibold text-ink-primary mb-2">
                Adresse email
              </Text>
              <View
                className={`flex-row items-center bg-surface border rounded-input px-4 ${
                  emailFocused ? 'border-primary' : 'border-separator-opaque'
                }`}
                style={emailFocused ? shadows.soft : undefined}
              >
                <Mail size={20} color="#86868B" style={{ marginRight: 12 }} />
                <TextInput
                  className="flex-1 py-3.5 text-body text-ink-primary"
                  placeholder="prenom.nom@epitech.digital"
                  placeholderTextColor="#86868B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-footnote font-semibold text-ink-primary mb-2">
                Mot de passe
              </Text>
              <View
                className={`flex-row items-center bg-surface border rounded-input px-4 ${
                  passwordFocused ? 'border-primary' : 'border-separator-opaque'
                }`}
                style={passwordFocused ? shadows.soft : undefined}
              >
                <Lock size={20} color="#86868B" style={{ marginRight: 12 }} />
                <TextInput
                  className="flex-1 py-3.5 text-body text-ink-primary"
                  placeholder="••••••••"
                  placeholderTextColor="#86868B"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-2 -mr-2"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#86868B" />
                  ) : (
                    <Eye size={20} color="#86868B" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleAuth}
              disabled={loading}
              style={({ pressed }) => [
                shadows.primaryButton,
                {
                  backgroundColor: '#4B8DF8',
                  transform: [{ scale: pressed && !loading ? 0.98 : 1 }],
                  opacity: loading ? 0.8 : 1,
                },
              ]}
              className="flex-row items-center justify-center bg-primary h-[50px] rounded-button gap-2"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-headline text-white">
                    {isSignUp ? "S'inscrire" : 'Se connecter'}
                  </Text>
                  <ArrowRight size={20} color="white" />
                </>
              )}
            </Pressable>

            {/* Toggle Sign Up / Sign In */}
            <View className="flex-row items-center justify-center mt-6 gap-1">
              <Text className="text-subheadline text-ink-secondary">
                {isSignUp ? 'Déjà un compte ?' : "Pas encore de compte ?"}
              </Text>
              <Pressable onPress={() => setIsSignUp(!isSignUp)}>
                <Text className="text-subheadline text-primary font-semibold">
                  {isSignUp ? 'Se connecter' : "S'inscrire"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
