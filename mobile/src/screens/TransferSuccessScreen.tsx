import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
  Main: undefined;
  TransferSuccess: { amount: string; recipient: string; transactionId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransferSuccess'>;
  route: RouteProp<RootStackParamList, 'TransferSuccess'>;
};

export default function TransferSuccessScreen({ navigation, route }: Props) {
  const { amount, recipient, transactionId } = route.params;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        {/* Success Icon */}
        <View className="w-24 h-24 bg-green-50 rounded-full items-center justify-center mb-8">
          <CheckCircle2 size={56} color="#22C55E" />
        </View>

        <Text className="text-largeTitle text-ink-primary text-center mb-2">
          {"Virement envoy\u00e9 !"}
        </Text>
        <Text className="text-body text-ink-secondary text-center mb-10">
          {"Votre virement a bien \u00e9t\u00e9 effectu\u00e9."}
        </Text>

        {/* Details Card */}
        <View className="bg-surface rounded-2xl p-6 w-full border border-separator-opaque mb-10">
          <View className="flex-row justify-between mb-4">
            <Text className="text-subheadline text-ink-tertiary">Montant</Text>
            <Text className="text-headline text-ink-primary">{amount} EPC</Text>
          </View>
          <View className="h-px bg-separator-opaque mb-4" />
          <View className="flex-row justify-between mb-4">
            <Text className="text-subheadline text-ink-tertiary">Destinataire</Text>
            <Text className="text-headline text-ink-primary">{recipient}</Text>
          </View>
          <View className="h-px bg-separator-opaque mb-4" />
          <View className="flex-row justify-between">
            <Text className="text-subheadline text-ink-tertiary">{"R\u00e9f\u00e9rence"}</Text>
            <Text className="text-footnote text-ink-secondary">{transactionId}</Text>
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
