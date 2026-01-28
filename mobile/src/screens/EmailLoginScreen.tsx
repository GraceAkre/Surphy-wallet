import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';

// --- Types ---

type RootStackParamList = {
  Onboarding: undefined;
  EmailLogin: undefined;
  Main: undefined;
};

type EmailLoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailLogin'>;
};

export default function EmailLoginScreen({ navigation }: EmailLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

    // Vérifier le domaine autorisé
    if (!email.endsWith('@epitech.digital')) {
      Alert.alert(
        'Domaine non autorisé',
        'Seules les adresses @epitech.digital sont autorisées.'
      );
      return;
    }

    if (!password.trim() || password.length < 6) {
      Alert.alert('Mot de passe invalide', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Inscription
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            // Désactiver la confirmation email pour le dev
            emailRedirectTo: undefined,
          },
        });

        console.log('SignUp response:', { data, error });

        if (error) {
          console.error('SignUp Error:', error);
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

        // Si une session est retournée, l'utilisateur est connecté directement
        if (data.session) {
          console.log('Session created after signup, navigating to Main');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
          return;
        }

        // Sinon, confirmation email requise
        if (data.user && !data.session) {
          Alert.alert(
            'Vérifiez votre email',
            'Un email de confirmation a été envoyé. Cliquez sur le lien pour activer votre compte, puis connectez-vous.',
            [{ text: 'OK', onPress: () => setIsSignUp(false) }]
          );
        }
      } else {
        // Connexion
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });

        console.log('SignIn response:', { data, error });

        if (error) {
          console.error('SignIn Error:', error);
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
          console.log('Session created, navigating to Main');
          // Succès - naviguer vers Main
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } else {
          console.error('No session returned');
          Alert.alert('Erreur', 'Connexion échouée. Veuillez réessayer.');
        }
      }
    } catch (error) {
      console.error('Auth Error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color="#111827" />
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Mail size={32} color="#3B82F6" />
            </View>

            <Text style={styles.title}>
              {isSignUp ? 'Créer un compte' : 'Connexion'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Créez votre compte avec votre adresse @epitech.digital'
                : 'Connectez-vous avec votre adresse @epitech.digital'}
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Adresse email</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="prenom.nom@epitech.digital"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleAuth}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButton,
                { opacity: pressed || loading ? 0.8 : 1 }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {isSignUp ? "S'inscrire" : 'Se connecter'}
                  </Text>
                  <ArrowRight size={20} color="white" />
                </>
              )}
            </Pressable>

            {/* Toggle Sign Up / Sign In */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Déjà un compte ?' : "Pas encore de compte ?"}
              </Text>
              <Pressable onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.toggleLink}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
  toggleText: {
    fontSize: 14,
    color: '#6B7280',
  },
  toggleLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
