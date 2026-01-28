import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  ActivityIndicator, 
  StyleSheet, 
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  AlertTriangle, 
  Check, 
  X, 
  ShieldAlert, 
  CreditCard, 
  HelpCircle,
  Clock,
  MapPin,
  Zap,
  Globe
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

// --- Types & Navigation ---

type RootStackParamList = {
  Home: undefined;
  Verification: { transactionId: string };
  Explicability: { transactionId: string };
  FraudReport: { transactionId: string };
};

type VerificationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Verification'>;
  route: RouteProp<RootStackParamList, 'Verification'>;
};

// --- Constantes & Mapping (Source A: .md) ---

const REASON_DETAILS: Record<string, { icon: any, title: string, description: string }> = {
  AMOUNT_HIGH: { icon: Zap, title: 'Montant élevé', description: 'Supérieur à 500€ inhabituel' },
  TIME_SUSPICIOUS: { icon: Clock, title: 'Horaire suspect', description: 'Transaction nocturne (00h-06h)' },
  LOCATION_CHANGE: { icon: MapPin, title: 'Changement de lieu', description: 'Pays différent dernière transaction' },
  IP_GEO_MISMATCH: { icon: Globe, title: 'Localisation incohérente', description: 'Écart IP vs Position GPS' },
};

// Mock Transaction Data
const MOCK_TX = {
  id: 'tx_123',
  merchantName: 'Amazon FR',
  amount: 600.00,
  date: '25 Jan 14:32',
  reasons: ['AMOUNT_HIGH', 'LOCATION_CHANGE'],
  status: 'review_required'
};

// --- Composants Internes (Source B: Design System) ---

const ActionOption = ({ 
  type, 
  selected, 
  onPress,
  disabled 
}: { 
  type: 'confirm' | 'deny', 
  selected: boolean, 
  onPress: () => void,
  disabled: boolean
}) => {
  const isConfirm = type === 'confirm';
  const bgColor = isConfirm ? 'bg-emerald-50' : 'bg-red-50'; // Couleurs douces
  const borderColor = selected ? (isConfirm ? 'border-green-500' : 'border-red-500') : 'border-gray-200';
  const iconColor = isConfirm ? '#10B981' : '#EF4444';
  const Icon = isConfirm ? Check : ShieldAlert;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.cardShadow,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
        selected && { borderWidth: 2, borderColor: isConfirm ? '#10B981' : '#EF4444' }
      ]}
      className={`flex-row p-4 rounded-xl bg-white mb-3 border ${borderColor}`}
    >
      <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${bgColor}`}>
        <Icon size={24} color={iconColor} />
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-gray-900 font-semibold text-base mb-1">
          {isConfirm ? "C'était bien moi" : "Ce n'était pas moi"}
        </Text>
        <Text className="text-gray-500 text-sm leading-tight">
          {isConfirm 
            ? "Confirmer que cette transaction est légitime." 
            : "Signaler l'activité comme frauduleuse."}
        </Text>
      </View>
    </Pressable>
  );
};

export default function VerificationScreen({ navigation, route }: VerificationScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'confirm' | 'deny' | null>(null);

  // --- Handlers ---

  const handleAction = async () => {
    if (!selectedAction) return;

    setLoading(true);
    
    // Simulation API Call (Supabase logic placeholder)
    setTimeout(() => {
      setLoading(false);
      if (selectedAction === 'confirm') {
        Alert.alert("Succès", "Transaction validée.", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        // Redirection vers le flux de fraude
        Alert.alert("Alerte Fraude", "Votre carte a été bloquée préventivement.", [
          { text: "Voir détails", onPress: () => console.log("Navigate Fraud") }
        ]);
      }
    }, 1500);
  };

  const handleBlockCard = () => {
    Alert.alert(
      "Bloquer la carte ?",
      "Cette action est immédiate et irréversible depuis l'application.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Bloquer maintenant", style: "destructive", onPress: () => console.log("Block Card") }
      ]
    );
  };

  // --- Render ---

  return (
    <View className="flex-1 bg-[#F3F4F6]">
      {/* Header Simple */}
      <SafeAreaView edges={['top']} className="bg-[#F3F4F6] px-5 pb-2">
        <Pressable onPress={() => navigation.goBack()} className="py-2">
           {/* Icône retour simplifiée */}
           <Text className="text-blue-500 text-base font-medium">← Retour</Text>
        </Pressable>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        
        {/* 1. Alerte Banner (Source B: Design High-Fidelity) */}
        <View className="mx-5 mb-6 bg-white border border-red-100 rounded-2xl p-5 flex-row gap-4 shadow-sm">
          <View className="w-14 h-14 bg-red-50 rounded-xl items-center justify-center">
            <AlertTriangle size={28} color="#EF4444" />
          </View>
          <View className="flex-1">
            <Text className="text-[22px] font-bold text-gray-900 leading-tight mb-2">
              Vérification requise
            </Text>
            <Text className="text-[15px] text-gray-500 leading-snug">
              Nous avons détecté une activité inhabituelle sur votre compte.
            </Text>
          </View>
        </View>

        {/* 2. Détails Transaction (Source B: Typographie massive) */}
        <View style={styles.cardShadow} className="mx-5 bg-white rounded-2xl p-6 mb-6 border border-gray-200">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-[26px] font-bold text-gray-900 flex-1 mr-2">
              {MOCK_TX.merchantName}
            </Text>
            <View className="bg-amber-500 px-3 py-1.5 rounded-lg">
              <Text className="text-white font-bold text-xs uppercase">À vérifier</Text>
            </View>
          </View>
          
          <Text className="text-[40px] font-bold text-gray-900 mb-2">
            - {MOCK_TX.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </Text>
          
          <Text className="text-gray-400 text-sm mb-6">
            {MOCK_TX.date}
          </Text>

          {/* Raisons du blocage (Source A: Logique mappée) */}
          <View className="border-t border-gray-100 pt-4">
            <Text className="text-gray-900 font-semibold text-base mb-3">Pourquoi cette alerte ?</Text>
            {MOCK_TX.reasons.map((code) => {
              const reason = REASON_DETAILS[code];
              if (!reason) return null;
              const Icon = reason.icon;
              return (
                <View key={code} className="flex-row items-center gap-3 mb-2">
                  <Icon size={18} color="#F59E0B" />
                  <Text className="text-gray-700 text-[15px]">{reason.title} : {reason.description}</Text>
                </View>
              );
            })}
            
            <Pressable onPress={() => navigation.navigate('Explicability', { transactionId: MOCK_TX.id })}>
              <Text className="text-blue-500 font-medium text-sm mt-2">En savoir plus sur l'IA de détection</Text>
            </Pressable>
          </View>
        </View>

        {/* 3. Actions (Source B: Cards sélectionnables) */}
        <View className="mx-5">
          <Text className="text-gray-900 font-semibold text-lg mb-4">Veuillez confirmer</Text>
          
          <ActionOption 
            type="confirm" 
            selected={selectedAction === 'confirm'} 
            onPress={() => setSelectedAction('confirm')}
            disabled={loading}
          />
          
          <ActionOption 
            type="deny" 
            selected={selectedAction === 'deny'} 
            onPress={() => setSelectedAction('deny')}
            disabled={loading}
          />

          {/* Bouton de validation final */}
          {selectedAction && (
            <Pressable
              onPress={handleAction}
              disabled={loading}
              className="mt-4 bg-blue-500 rounded-xl py-4 items-center shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  {selectedAction === 'confirm' ? 'Valider la transaction' : 'Signaler la fraude'}
                </Text>
              )}
            </Pressable>
          )}

          {/* Option Bloquer Carte */}
          <Pressable 
            onPress={handleBlockCard}
            className="mt-8 border border-red-100 bg-white p-5 rounded-2xl flex-row items-center"
          >
             <View className="w-10 h-10 bg-red-50 rounded-lg items-center justify-center mr-4">
               <CreditCard size={20} color="#DC2626" />
             </View>
             <View className="flex-1">
               <Text className="text-red-600 font-bold text-base">Bloquer ma carte</Text>
               <Text className="text-gray-500 text-sm">Empêcher toute nouvelle transaction</Text>
             </View>
          </Pressable>

          {/* Support Link */}
          <Pressable className="flex-row justify-center items-center mt-8 mb-4 gap-2">
            <HelpCircle size={18} color="#3B82F6" />
            <Text className="text-blue-500 font-medium text-[15px]">Contacter le support</Text>
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
        shadowColor: '#000000',
      },
    }),
  }
});