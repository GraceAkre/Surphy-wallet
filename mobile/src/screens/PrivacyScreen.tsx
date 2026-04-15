import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { shadows } from '../utils/shadows';

type PrivacyScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const Section = ({ title, children }: { title: string; children: string }) => (
  <View className="mb-6">
    <Text className="text-headline text-ink-primary mb-2">{title}</Text>
    <Text className="text-footnote text-ink-secondary leading-5">{children}</Text>
  </View>
);

export default function PrivacyScreen({ navigation }: PrivacyScreenProps) {
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
        <Text className="text-title2 text-ink-primary">Politique de confidentialité</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-caption1 text-ink-tertiary mb-6">
          Dernière mise à jour : 15 avril 2026
        </Text>

        <Section title="1. Responsable du traitement">
          {`Surphy Wallet, projet développé dans le cadre d'Epitech Digital, est responsable du traitement des données personnelles collectées via l'Application.

Le traitement est effectué conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679).`}
        </Section>

        <Section title="2. Données collectées">
          {`Nous collectons les catégories de données suivantes :

Données d'identification :
• Prénom et nom
• Adresse email institutionnelle
• Campus de rattachement

Données de transaction :
• Montants et devises
• Dates et heures des opérations
• Identifiants de transaction
• Bénéficiaires et émetteurs

Données techniques :
• Adresse IP
• Type d'appareil et système d'exploitation
• Données de géolocalisation (avec consentement)
• Journaux de connexion`}
        </Section>

        <Section title="3. Finalités du traitement">
          {`Vos données sont traitées pour les finalités suivantes :
• Gestion de votre compte et authentification
• Exécution des transactions financières
• Détection et prévention de la fraude via notre système d'intelligence artificielle
• Respect des obligations réglementaires (PSD2, lutte anti-blanchiment)
• Amélioration de la qualité du service
• Communication relative à votre compte`}
        </Section>

        <Section title="4. Base légale du traitement">
          {`Le traitement de vos données repose sur :
• L'exécution du contrat : gestion de votre compte et des transactions
• L'obligation légale : conformité réglementaire (PSD2, KYC)
• L'intérêt légitime : détection de fraude et sécurité du service
• Le consentement : géolocalisation et notifications`}
        </Section>

        <Section title="5. Détection de fraude et IA">
          {`Notre système d'intelligence artificielle analyse les transactions en temps réel pour détecter les comportements suspects. Cette analyse porte sur :
• Les montants et fréquences de transaction
• Les horaires d'utilisation
• La localisation géographique
• La cohérence avec votre historique d'utilisation

Ce traitement automatisé peut conduire au blocage temporaire d'une transaction. Conformément à l'article 22 du RGPD, vous disposez du droit de contester cette décision et d'obtenir une intervention humaine via le support de l'Application.`}
        </Section>

        <Section title="6. Durée de conservation">
          {`Vos données sont conservées pendant les durées suivantes :
• Données de compte : durée de l'inscription + 1 an après suppression
• Données de transaction : 5 ans (obligation légale)
• Journaux de connexion : 1 an
• Données de détection de fraude : 5 ans

À l'expiration de ces délais, vos données sont supprimées ou anonymisées de manière irréversible.`}
        </Section>

        <Section title="7. Partage des données">
          {`Vos données peuvent être partagées avec :
• Les autres campus du réseau Epitech Digital dans le cadre des transferts inter-campus
• Nos sous-traitants techniques (hébergement, infrastructure)
• Les autorités compétentes sur requête légale

Vos données ne sont jamais vendues à des tiers. Les transferts inter-campus sont sécurisés par des clés API et un chiffrement des communications.`}
        </Section>

        <Section title="8. Vos droits">
          {`Conformément au RGPD, vous disposez des droits suivants :
• Droit d'accès : obtenir une copie de vos données personnelles
• Droit de rectification : corriger vos données inexactes
• Droit à l'effacement : demander la suppression de vos données
• Droit à la portabilité : recevoir vos données dans un format structuré
• Droit d'opposition : vous opposer au traitement de vos données
• Droit à la limitation : restreindre le traitement de vos données

Pour exercer ces droits, contactez-nous via le support de l'Application ou à l'adresse : privacy@surphy.fr

Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr).`}
        </Section>

        <Section title="9. Sécurité">
          {`Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
• Chiffrement des données en transit (TLS/SSL)
• Authentification sécurisée via Supabase Auth
• Politique de Row Level Security (RLS) sur la base de données
• Journalisation et audit des accès
• Détection automatisée des anomalies`}
        </Section>

        <Section title="10. Contact">
          {`Pour toute question relative à la protection de vos données personnelles :
• Support intégré à l'Application
• Email : privacy@surphy.fr

Délégué à la protection des données : dpo@surphy.fr`}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
