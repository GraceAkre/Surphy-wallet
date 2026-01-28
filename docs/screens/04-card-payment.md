Voici l'analyse comparative et le code final pour l'écran **`CardPaymentScreen.tsx`**.

### Analyse & Stratégie de Fusion

| Élément | Fichier `.md` (Logique) | Texte Global (Design System) | Décision pour le Code |
| --- | --- | --- | --- |
| **Header** | Bouton Retour simple + Titre. | Titre "Faire un virement" + Sous-titre descriptif. | **Hybride :** Bouton retour (navigation) + Style Global (Titre/Sous-titre). |
| **Saisie Destinataire** | Input texte simple + Liste horizontale de contacts récents. | Composant `RecipientSelector` (Carte cliquable) + Modale. | **Source B (Global) :** Le composant "Sélecteur" fait beaucoup plus "Premium". J'ai simulé l'état "Sélectionné" pour l'exemple. |
| **Saisie Montant** | Input simple. | Input stylisé avec séparateur vertical et symbole €. | **Source B (Global) :** Design beaucoup plus professionnel et clair. |
| **Sécurité** | Non mentionné. | Badge de sécurité "Bouclier" en bas de page. | **Source B (Global) :** Ajoute de la confiance (Trust element). |
| **Bouton Envoyer** | Dans le footer. | Dans la carte de transfert ou footer. | **Source B (Global) :** Intégré visuellement pour suivre le flux de lecture Z-pattern. |

### Diagramme de Séquence (Logique de Paiement)

Pour comprendre la logique de validation implémentée dans le code, voici le flux des données :

---

### Fichier : `mobile/src/screens/CardPaymentScreen.tsx`

```tsx
import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  User, 
  ChevronRight, 
  ShieldCheck, 
  CheckCircle,
  X
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// --- Types ---

type RootStackParamList = {
  Home: undefined;
  CardPayment: undefined;
  TransferSuccess: { amount: string; recipient: string; transactionId: string };
  Contacts: undefined;
};

type CardPaymentScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CardPayment'>;
};

// Mock User Data (Pour l'exemple de destinataire sélectionné)
const MOCK_RECIPIENT = {
  id: 'user_99',
  name: 'Rif Lunasio',
  email: 'rif.lunasio@epitech.eu',
  avatar: null // Pas d'image pour l'instant
};

export default function CardPaymentScreen({ navigation }: CardPaymentScreenProps) {
  // --- State ---
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<typeof MOCK_RECIPIENT | null>(null); // Null = pas de destinataire
  const [balance] = useState(1250.00); // Solde mocké
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // --- Validation Logic ---
  const numericAmount = parseFloat(amount.replace(',', '.'));
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= balance;
  const isValid = recipient !== null && isValidAmount;

  // --- Handlers ---
  const handleAmountChange = (text: string) => {
    // Regex pour autoriser chiffres et une seule virgule/point
    if (/^\d*[.,]?\d{0,2}$/.test(text)) {
      setAmount(text.replace('.', ','));
    }
  };

  const handleSelectRecipient = () => {
    // Ici, on ouvrirait normalement la modale ou la navigation vers 'Contacts'
    // Pour la démo, on toggle un utilisateur fictif
    if (recipient) {
      setRecipient(null);
    } else {
      setRecipient(MOCK_RECIPIENT);
    }
  };

  const handleSend = async () => {
    if (!isValid) return;
    
    setIsLoading(true);

    // Simulation API Call
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('TransferSuccess', {
        amount: amount,
        recipient: recipient?.name || 'Inconnu',
        transactionId: 'TX-8884'
      });
    }, 1500);
  };

  // --- Render ---

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      {/* Header Custom (Source B: High Fidelity) */}
      <View className="px-5 pt-2 pb-4">
        <Pressable onPress={() => navigation.goBack()} className="mb-4 w-10 h-10 justify-center">
          <ChevronLeft color="#111827" size={28} />
        </Pressable>
        <Text className="text-[36px] font-bold text-gray-900 leading-tight">
          Faire un virement
        </Text>
        <Text className="text-[15px] text-gray-500 mt-2">
          Envoyez de l'argent entre étudiants en toute sécurité.
        </Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* 1. Balance Card (Source B: High Fidelity) */}
          <View style={styles.cardShadow} className="bg-white rounded-2xl p-5 mb-6 border border-gray-200 mt-4">
            <Text className="text-[13px] text-gray-400 mb-2">Solde disponible</Text>
            <Text className="text-[36px] font-bold text-gray-900">
              {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </Text>
          </View>

          {/* 2. Recipient Selector (Source B: Card Style) */}
          <Text className="text-[18px] font-semibold text-gray-500 mb-4 ml-1">
            Destinataire
          </Text>
          
          <Pressable 
            onPress={handleSelectRecipient}
            style={({ pressed }) => [
              styles.cardShadow,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
              recipient ? { borderColor: '#3B82F6', borderWidth: 2 } : {}
            ]}
            className="bg-white rounded-2xl p-4 mb-6 border border-gray-200 flex-row items-center justify-between h-20"
          >
            {recipient ? (
              // État : Destinataire sélectionné
              <>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                    <Text className="text-blue-600 font-bold text-lg">
                      {recipient.name.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[18px] font-semibold text-gray-900">
                      {recipient.name}
                    </Text>
                    <Text className="text-[13px] text-gray-400">
                      {recipient.email}
                    </Text>
                  </View>
                </View>
                <View className="bg-gray-100 rounded-full p-1">
                  <X size={16} color="#6B7280" />
                </View>
              </>
            ) : (
              // État : Sélectionner un destinataire
              <>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center border border-gray-200 border-dashed">
                    <User size={20} color="#6B7280" />
                  </View>
                  <Text className="text-[16px] text-gray-500 font-medium">
                    Sélectionner un étudiant
                  </Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </>
            )}
          </Pressable>

          {/* 3. Transfer Card & Input (Source B: Input stylisé) */}
          <View style={styles.cardShadow} className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
            <Text className="text-[18px] font-semibold text-gray-900 mb-4">
              Montant à transférer
            </Text>

            {/* Input Wrapper */}
            <View 
              className={`flex-row items-center bg-white rounded-xl px-5 py-4 border-[1.5px] mb-2 ${
                isFocused ? 'border-blue-500' : (amount && !isValidAmount ? 'border-red-500' : 'border-gray-300')
              }`}
              style={isFocused ? styles.inputFocusShadow : undefined}
            >
              <Text className="text-[28px] text-gray-400 font-normal mr-3">€</Text>
              
              {/* Separator */}
              <View className="w-[1px] h-8 bg-gray-200 mr-4" />

              <TextInput
                value={amount}
                onChangeText={handleAmountChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor="#D1D5DB"
                className="flex-1 text-[32px] font-bold text-gray-900 h-12 leading-none"
                style={{ padding: 0 }} // Reset Android padding
              />
            </View>

            {/* Messages d'erreur ou d'info */}
            {amount && !isValidAmount && (
              <Text className="text-red-500 text-sm font-medium ml-1 mt-1">
                Solde insuffisant ({balance} € max)
              </Text>
            )}
            
            <Text className="text-gray-400 text-sm mt-4 leading-5">
              Les virements sont instantanés et gratuits entre membres du campus.
            </Text>

            {/* Send Button (Intégré dans la carte pour le contexte) */}
            <Pressable
              onPress={handleSend}
              disabled={!isValid || isLoading}
              className={`mt-6 rounded-xl py-4 items-center justify-center flex-row ${
                isValid ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              style={isValid ? styles.buttonShadow : undefined}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Envoyer {amount ? `${amount} €` : ''}
                </Text>
              )}
            </Pressable>
          </View>

          {/* 4. Security Badge (Source B: Trust Element) */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 flex-row items-center gap-3">
            <View className="w-10 h-10 bg-blue-50 rounded-lg items-center justify-center">
              <ShieldCheck size={24} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-semibold text-base">Paiement sécurisé</Text>
              <Text className="text-gray-500 text-xs">Cryptage SSL 256-bit de bout en bout.</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles High Fidelity (Ombres précises)
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
        elevation: 3,
        shadowColor: '#000000',
      },
    }),
  },
  buttonShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
        shadowColor: '#3B82F6',
      },
    }),
  },
  inputFocusShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  }
});

```