import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { shadows } from '../utils/shadows';

type TermsScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const Section = ({ title, children }: { title: string; children: string }) => (
  <View className="mb-6">
    <Text className="text-headline text-ink-primary mb-2">{title}</Text>
    <Text className="text-footnote text-ink-secondary leading-5">{children}</Text>
  </View>
);

export default function TermsScreen({ navigation }: TermsScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-11 h-11 rounded-full bg-surface items-center justify-center border border-separator-opaque"
          style={shadows.soft}
        >
          <ChevronLeft size={24} color="#1D1D1F" />
        </Pressable>
        <Text className="text-title2 text-ink-primary">Conditions d'utilisation</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-caption1 text-ink-tertiary mb-6">
          Dernière mise à jour : 15 avril 2026
        </Text>

        <Section title="1. Objet">
          {`Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'utilisation de l'application Surphy Wallet (ci-après « l'Application »), un portefeuille numérique destiné aux étudiants du réseau Epitech Digital.

L'Application permet la gestion de transactions en Epicoins (EPC), une monnaie virtuelle interne au réseau, avec un système de détection de fraude intégré.`}
        </Section>

        <Section title="2. Inscription et éligibilité">
          {`L'accès à l'Application est réservé aux personnes disposant d'une adresse email institutionnelle valide (@epitech.digital).

En créant un compte, l'utilisateur déclare :
• Être étudiant ou membre du personnel d'Epitech Digital
• Fournir des informations exactes et à jour
• Être responsable de la confidentialité de ses identifiants de connexion`}
        </Section>

        <Section title="3. Fonctionnalités">
          {`L'Application offre les services suivants :
• Gestion d'un portefeuille numérique en Epicoins (EPC)
• Envoi et réception de fonds entre utilisateurs
• Dépôt de fonds sur le portefeuille
• Carte virtuelle pour les paiements
• Historique détaillé des transactions
• Transferts inter-campus entre établissements du réseau
• Système de protection par intelligence artificielle`}
        </Section>

        <Section title="4. Epicoins (EPC)">
          {`L'Epicoin (EPC) est une monnaie virtuelle interne au réseau Epitech Digital. Le taux de conversion est fixé à 1 EPC = 0.20 €.

Les Epicoins ne constituent pas une monnaie ayant cours légal et ne peuvent être échangés en dehors de l'écosystème Surphy Wallet. Ils ne portent pas intérêt et ne sont pas garantis par un organisme bancaire.`}
        </Section>

        <Section title="5. Protection et sécurité">
          {`L'Application intègre un système de détection de fraude basé sur l'intelligence artificielle qui analyse chaque transaction en temps réel. Ce système peut :
• Approuver automatiquement les transactions à faible risque
• Soumettre à vérification les transactions présentant un risque modéré
• Bloquer temporairement les transactions à haut risque

En cas de blocage, aucun montant n'est débité du compte de l'utilisateur. L'utilisateur est notifié et peut contester la décision via l'application.`}
        </Section>

        <Section title="6. Obligations de l'utilisateur">
          {`L'utilisateur s'engage à :
• Utiliser l'Application conformément à sa destination
• Ne pas tenter de contourner les mécanismes de sécurité
• Signaler immédiatement toute utilisation non autorisée de son compte
• Ne pas utiliser l'Application à des fins frauduleuses ou illicites
• Respecter les plafonds de transaction en vigueur`}
        </Section>

        <Section title="7. Responsabilité">
          {`Surphy Wallet s'efforce d'assurer la disponibilité et la fiabilité de l'Application. Toutefois, Surphy Wallet ne saurait être tenu responsable :
• Des interruptions temporaires de service pour maintenance
• Des dysfonctionnements liés à des facteurs externes (réseau, appareil)
• Des pertes résultant d'une utilisation non conforme aux présentes CGU`}
        </Section>

        <Section title="8. Résiliation">
          {`L'utilisateur peut supprimer son compte à tout moment depuis les paramètres de l'Application. La suppression entraîne :
• La clôture définitive du portefeuille
• La perte des Epicoins restants sur le compte
• La suppression des données personnelles conformément à notre Politique de Confidentialité

Surphy Wallet se réserve le droit de suspendre ou résilier un compte en cas de violation des présentes CGU.`}
        </Section>

        <Section title="9. Modification des CGU">
          {`Surphy Wallet se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par notification dans l'Application. La poursuite de l'utilisation après modification vaut acceptation des nouvelles CGU.`}
        </Section>

        <Section title="10. Contact">
          {`Pour toute question relative aux présentes CGU, vous pouvez nous contacter via la fonctionnalité de support intégrée à l'Application ou à l'adresse : support@surphy.fr`}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
