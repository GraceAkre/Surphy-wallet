import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import {
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  Zap,
  HelpCircle,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Components
import { Card, Button, Badge } from '../components/ui';
import { AlertBanner } from '../components/feedback';

// Utils
import { shadows } from '../utils/shadows';
import { useHaptics } from '../hooks/useHaptics';

// --- Types ---

type RootStackParamList = {
  Home: undefined;
  RiskGauge: undefined;
};

type RiskGaugeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RiskGauge'>;
};

// --- Constantes ---

const RISK_LEVELS = {
  LOW: { label: 'Faible', color: '#34C759', bgColor: '#ECFDF5' },
  MEDIUM: { label: 'Modéré', color: '#FF9500', bgColor: '#FFFBEB' },
  HIGH: { label: 'Élevé', color: '#FF3B30', bgColor: '#FEF2F2' },
};

const TRIGGERED_RULES = [
  {
    code: 'R3',
    icon: Zap,
    label: 'Montant élevé',
    description: 'Transaction > 500€',
    weight: 25,
  },
  {
    code: 'R5',
    icon: Clock,
    label: 'Horaire suspect',
    description: 'Transaction entre 00h-06h',
    weight: 15,
  },
  {
    code: 'R7',
    icon: MapPin,
    label: 'Localisation',
    description: 'Pays différent (FR → US)',
    weight: 35,
  },
];

// --- Composant Gauge SVG ---

interface GaugeProps {
  score: number;
  size?: number;
}

const RiskGauge = ({ score, size = 280 }: GaugeProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score]);

  const center = size / 2;
  const radius = (size - 40) / 2;
  const strokeWidth = 20;

  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;

  const polarToCartesian = (angle: number) => {
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);

  const backgroundArc = `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;

  const needleAngle = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [startAngle, endAngle],
  });

  const getRiskLevel = (s: number) => {
    if (s < 33) return RISK_LEVELS.LOW;
    if (s < 66) return RISK_LEVELS.MEDIUM;
    return RISK_LEVELS.HIGH;
  };

  const currentLevel = getRiskLevel(score);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`}>
        <Defs>
          <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#34C759" />
            <Stop offset="50%" stopColor="#FF9500" />
            <Stop offset="100%" stopColor="#FF3B30" />
          </LinearGradient>
        </Defs>

        {/* Arc de fond avec dégradé */}
        <Path
          d={backgroundArc}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Graduations */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = startAngle + (tick / 100) * Math.PI;
          const innerRadius = radius - strokeWidth / 2 - 8;
          const outerRadius = radius - strokeWidth / 2 - 2;
          const inner = {
            x: center + innerRadius * Math.cos(angle),
            y: center + innerRadius * Math.sin(angle),
          };
          const outer = {
            x: center + outerRadius * Math.cos(angle),
            y: center + outerRadius * Math.sin(angle),
          };
          return (
            <G key={tick}>
              <Path
                d={`M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`}
                stroke="#86868B"
                strokeWidth={2}
              />
            </G>
          );
        })}

        {/* Centre avec score */}
        <Circle cx={center} cy={center} r={60} fill="white" />
        <Circle cx={center} cy={center} r={60} fill="none" stroke="#E5E5EA" strokeWidth={2} />

        {/* Labels */}
        <SvgText x={40} y={center + 30} fontSize={12} fill="#86868B" textAnchor="middle">
          0
        </SvgText>
        <SvgText x={size - 40} y={center + 30} fontSize={12} fill="#86868B" textAnchor="middle">
          100
        </SvgText>
      </Svg>

      {/* Aiguille animée */}
      <Animated.View
        style={{
          position: 'absolute',
          top: center - 8,
          left: center - 4,
          width: 8,
          height: radius - 30,
          backgroundColor: '#1D1D1F',
          borderRadius: 4,
          transformOrigin: 'center bottom',
          transform: [
            {
              rotate: needleAngle.interpolate({
                inputRange: [Math.PI, 2 * Math.PI],
                outputRange: ['-90deg', '90deg'],
              }),
            },
          ],
        }}
      />

      {/* Score central */}
      <View style={{ position: 'absolute', top: center - 30, alignItems: 'center' }}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: currentLevel.color }}>{score}</Text>
        <View
          style={{
            backgroundColor: currentLevel.bgColor,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 20,
            marginTop: 4,
          }}
        >
          <Text style={{ color: currentLevel.color, fontWeight: '600', fontSize: 14 }}>
            {currentLevel.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

// --- Screen Principal ---

export default function RiskGaugeScreen({ navigation }: RiskGaugeScreenProps) {
  const { light, error: hapticError } = useHaptics();
  const [riskScore] = useState(72);

  const totalWeight = TRIGGERED_RULES.reduce((acc, rule) => acc + rule.weight, 0);

  const handleBlock = () => {
    hapticError();
    // Logic to block transaction
  };

  const handleRequestVerification = () => {
    light();
    // Logic to request verification
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-screen pt-2 pb-4 flex-row items-center">
        <Pressable
          onPress={() => {
            light();
            navigation.goBack();
          }}
          className="mr-4 w-11 h-11 justify-center"
        >
          <ChevronLeft size={28} color="#1D1D1F" />
        </Pressable>
        <View>
          <Text className="text-title1 text-ink-primary">Analyse de risque</Text>
          <Text className="text-footnote text-ink-secondary">Transaction #TX-8847</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Gauge Section */}
        <Card variant="elevated" padding="lg" className="mx-screen mb-6 items-center">
          <RiskGauge score={riskScore} />

          <Text className="text-body text-ink-secondary text-center mt-4 leading-6">
            Score calculé par notre IA basé sur {TRIGGERED_RULES.length} règles déclenchées.
          </Text>
        </Card>

        {/* Triggered Rules */}
        <View className="px-screen mb-6">
          <Text className="text-title2 text-ink-primary mb-4">Règles déclenchées</Text>

          {TRIGGERED_RULES.map((rule) => {
            const Icon = rule.icon;
            const contribution = Math.round((rule.weight / totalWeight) * 100);

            return (
              <View
                key={rule.code}
                style={shadows.card}
                className="bg-surface rounded-2xl p-4 mb-3 border border-separator-opaque flex-row items-center"
              >
                <View className="w-12 h-12 rounded-xl bg-warning-50 items-center justify-center mr-4">
                  <Icon size={24} color="#FF9500" />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-headline text-ink-primary">{rule.label}</Text>
                    <View className="bg-background px-2 py-0.5 rounded">
                      <Text className="text-caption2 text-ink-tertiary font-mono">{rule.code}</Text>
                    </View>
                  </View>
                  <Text className="text-footnote text-ink-secondary">{rule.description}</Text>

                  {/* Progress bar */}
                  <View className="mt-2 h-1.5 bg-separator-opaque rounded-full overflow-hidden">
                    <View
                      className="h-full bg-warning rounded-full"
                      style={{ width: `${contribution}%` }}
                    />
                  </View>
                </View>

                <View className="ml-3 items-end">
                  <Text className="text-headline text-warning font-bold">+{rule.weight}</Text>
                  <Text className="text-caption2 text-ink-tertiary">{contribution}%</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* AI Recommendation */}
        <View className="px-screen mb-6">
          <AlertBanner
            variant="info"
            title="Recommandation IA"
            message="Cette transaction présente un risque élevé. Nous recommandons une vérification biométrique avant approbation."
            icon={ShieldCheck}
          />
        </View>

        {/* Actions */}
        <View className="px-screen gap-3">
          <Button variant="danger" fullWidth onPress={handleBlock}>
            <View className="flex-row items-center justify-center gap-2">
              <ShieldAlert size={20} color="white" />
              <Text className="text-headline text-white">Bloquer la transaction</Text>
            </View>
          </Button>

          <Button variant="secondary" fullWidth onPress={handleRequestVerification}>
            Demander vérification
          </Button>
        </View>

        {/* Support */}
        <Pressable
          onPress={() => light()}
          className="flex-row justify-center items-center mt-8 mb-4 gap-2"
        >
          <HelpCircle size={18} color="#3B82F6" />
          <Text className="text-subheadline text-primary font-medium">
            Comment fonctionne l'IA ?
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
