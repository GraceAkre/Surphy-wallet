import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, ArrowLeft, CreditCard } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
  Main: undefined;
  DepositSuccess: { amount: string; transactionId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DepositSuccess'>;
  route: RouteProp<RootStackParamList, 'DepositSuccess'>;
};

export default function DepositSuccessScreen({ navigation, route }: Props) {
  const { amount, transactionId } = route.params;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        {/* Success Icon */}
        <View className="w-24 h-24 bg-green-50 rounded-full items-center justify-center mb-8">
          <CheckCircle2 size={56} color="#22C55E" />
        </View>

        <Text className="text-largeTitle text-ink-primary text-center mb-2">
          {"D\u00e9p\u00f4t effectu\u00e9 !"}
        </Text>
        <Text className="text-body text-ink-secondary text-center mb-10">
          {"Votre wallet a bien \u00e9t\u00e9 cr\u00e9dit\u00e9."}
        </Text>

        {/* Details Card */}
        <View className="bg-surface rounded-2xl p-6 w-full border border-separator-opaque mb-10">
          <View className="flex-row justify-between mb-4">
            <Text className="text-subheadline text-ink-tertiary">Montant</Text>
            <Text className="text-headline text-ink-primary">{amount} EUR</Text>
          </View>
          <View className="h-px bg-separator-opaque mb-4" />
          <View className="flex-row justify-between mb-4">
            <Text className="text-subheadline text-ink-tertiary">Moyen</Text>
            <View className="flex-row items-center gap-1.5">
              <CreditCard size={14} color="#6E6E73" />
              <Text className="text-headline text-ink-primary">Carte bancaire</Text>
            </View>
          </View>
          <View className="h-px bg-separator-opaque mb-4" />
          <View className="flex-row justify-between">
            <Text className="text-subheadline text-ink-tertiary">{"R\u00e9f\u00e9rence"}</Text>
            <Text className="text-footnote text-ink-secondary" numberOfLines={1} style={{ maxWidth: 200 }}>
              {transactionId}
            </Text>
          </View>
        </View>

        {/* Back Button */}
        <Pressable
          onPress={() => navigation.navigate('Main')}
          style={({ pressed }) => [
            { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.9 : 1 },
          ]}
          className="bg-primary rounded-2xl py-4 px-8 w-full items-center flex-row justify-center gap-2"
        >
          <ArrowLeft size={20} color="white" />
          <Text className="text-headline text-white">{"Retour \u00e0 l'accueil"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
