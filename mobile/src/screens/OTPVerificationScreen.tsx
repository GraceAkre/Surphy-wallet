import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { shadows } from '../utils/shadows';
import { useHaptics } from '../hooks/useHaptics';

// --- Types ---

type RootStackParamList = {
  Onboarding: undefined;
  EmailLogin: undefined;
  OTPVerification: { email: string };
  Main: undefined;
  AnalystMain: undefined;
};

type OTPVerificationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OTPVerification'>;
  route: RouteProp<RootStackParamList, 'OTPVerification'>;
};

const OTP_LENGTH = 6;

export default function OTPVerificationScreen({ navigation, route }: OTPVerificationScreenProps) {
  const { email } = route.params;
  const { light, success, error: hapticError } = useHaptics();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (value: string, index: number) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];

    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, OTP_LENGTH - index).split('');
      digits.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    // Auto-submit when complete
    const completeOtp = newOtp.join('');
    if (completeOtp.length === OTP_LENGTH && !newOtp.includes('')) {
      verifyOtp(completeOtp);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (code: string) => {
    setLoading(true);
    light();

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (error) {
        hapticError();
        Alert.alert('Code invalide', 'Le code entré est incorrect ou a expiré.');
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        return;
      }

      if (data.session) {
        success();
        const isAnalyst = email.endsWith('@analyst.surphy.fr');
        navigation.reset({
          index: 0,
          routes: [{ name: isAnalyst ? 'AnalystMain' : 'Main' }],
        });
      }
    } catch (err) {
      hapticError();
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    light();

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }

      Alert.alert('Code envoyé', 'Un nouveau code a été envoyé à votre adresse email.');
      setResendCooldown(60);
      setOtp(Array(OTP_LENGTH).fill(''));
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
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
        <View className="flex-1 px-6 pt-6 items-center">
          {/* Icon */}
          <View className="w-16 h-16 rounded-card bg-success-50 items-center justify-center mb-6">
            <ShieldCheck size={32} color="#34C759" />
          </View>

          {/* Title */}
          <Text className="text-title1 text-ink-primary text-center mb-2">
            Vérification
          </Text>
          <Text className="text-body text-ink-secondary text-center leading-relaxed mb-8">
            Entrez le code à 6 chiffres envoyé à{'\n'}
            <Text className="text-primary font-semibold">{email}</Text>
          </Text>

          {/* OTP Input */}
          <View className="flex-row justify-center gap-3 mb-8">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                className={`
                  w-12 h-14 bg-surface border-2 rounded-input
                  text-title2 text-ink-primary text-center
                  ${digit ? 'border-primary bg-primary-50' : 'border-separator-opaque'}
                `}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LENGTH : 1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          {/* Loading */}
          {loading && (
            <View className="items-center mb-6">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-subheadline text-ink-secondary mt-3">
                Vérification en cours...
              </Text>
            </View>
          )}

          {/* Resend */}
          <View className="flex-row items-center gap-1">
            <Text className="text-subheadline text-ink-secondary">
              Vous n'avez pas reçu le code ?
            </Text>
            <Pressable
              onPress={handleResend}
              disabled={resendCooldown > 0 || loading}
            >
              <Text
                className={`text-subheadline font-semibold ${
                  resendCooldown > 0 || loading
                    ? 'text-ink-disabled'
                    : 'text-primary'
                }`}
              >
                {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
