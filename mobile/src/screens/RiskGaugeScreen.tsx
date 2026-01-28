import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import {
  ChevronLeft,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  Zap,
  Globe,
  HelpCircle
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  LOW: { label: 'Faible', color: '#10B981', bgColor: '#ECFDF5' },
  MEDIUM: { label: 'Modéré', color: '#F59E0B', bgColor: '#FFFBEB' },
  HIGH: { label: 'Élevé', color: '#EF4444', bgColor: '#FEF2F2' },
};

const TRIGGERED_RULES = [
  { code: 'R3', icon: Zap, label: 'Montant élevé', description: 'Transaction > 500€', weight: 25 },
  { code: 'R5', icon: Clock, label: 'Horaire suspect', description: 'Transaction entre 00h-06h', weight: 15 },
  { code: 'R7', icon: MapPin, label: 'Localisation', description: 'Pays différent (FR → US)', weight: 35 },
];

// --- Composant Gauge SVG ---

interface GaugeProps {
  score: number; // 0-100
  size?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

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

  // Arc de 180° (demi-cercle)
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

  // Arc path pour le fond
  const backgroundArc = `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;

  // Calcul de l'angle de l'aiguille
  const needleAngle = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [startAngle, endAngle],
  });

  // Couleur basée sur le score
  const getColor = (s: number) => {
    if (s < 33) return RISK_LEVELS.LOW.color;
    if (s < 66) return RISK_LEVELS.MEDIUM.color;
    return RISK_LEVELS.HIGH.color;
  };

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
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="50%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#EF4444" />
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
                stroke="#9CA3AF"
                strokeWidth={2}
              />
            </G>
          );
        })}

        {/* Centre avec score */}
        <Circle cx={center} cy={center} r={60} fill="white" />
        <Circle cx={center} cy={center} r={60} fill="none" stroke="#E5E7EB" strokeWidth={2} />

        {/* Labels */}
        <SvgText x={40} y={center + 30} fontSize={12} fill="#9CA3AF" textAnchor="middle">0</SvgText>
        <SvgText x={size - 40} y={center + 30} fontSize={12} fill="#9CA3AF" textAnchor="middle">100</SvgText>
      </Svg>

      {/* Aiguille animée (rendue séparément) */}
      <Animated.View
        style={{
          position: 'absolute',
          top: center - 8,
          left: center - 4,
          width: 8,
          height: radius - 30,
          backgroundColor: '#1F2937',
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
        <Text style={{ fontSize: 48, fontWeight: '800', color: currentLevel.color }}>
          {score}
        </Text>
        <View style={[styles.levelBadge, { backgroundColor: currentLevel.bgColor }]}>
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
  const [riskScore] = useState(72); // Score mocké

  const totalWeight = TRIGGERED_RULES.reduce((acc, rule) => acc + rule.weight, 0);

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      {/* Header */}
      <View className="px-5 pt-2 pb-4 flex-row items-center">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <ChevronLeft size={28} color="#111827" />
        </Pressable>
        <View>
          <Text className="text-[28px] font-bold text-gray-900">Analyse de risque</Text>
          <Text className="text-[14px] text-gray-500">Transaction #TX-8847</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* 1. Gauge Section */}
        <View style={styles.cardShadow} className="mx-5 bg-white rounded-2xl p-6 mb-6 border border-gray-200 items-center">
          <RiskGauge score={riskScore} />

          <Text className="text-gray-500 text-center mt-4 text-[15px] leading-6">
            Score calculé par notre IA basé sur {TRIGGERED_RULES.length} règles déclenchées.
          </Text>
        </View>

        {/* 2. Triggered Rules */}
        <View className="px-5 mb-6">
          <Text className="text-[20px] font-semibold text-gray-900 mb-4">
            Règles déclenchées
          </Text>

          {TRIGGERED_RULES.map((rule, index) => {
            const Icon = rule.icon;
            const contribution = Math.round((rule.weight / totalWeight) * 100);

            return (
              <View
                key={rule.code}
                style={styles.softShadow}
                className="bg-white rounded-xl p-4 mb-3 border border-gray-200 flex-row items-center"
              >
                <View className="w-12 h-12 rounded-xl bg-amber-50 items-center justify-center mr-4">
                  <Icon size={24} color="#F59E0B" />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-gray-900 font-semibold text-[15px]">{rule.label}</Text>
                    <View className="bg-gray-100 px-2 py-0.5 rounded">
                      <Text className="text-gray-500 text-[11px] font-mono">{rule.code}</Text>
                    </View>
                  </View>
                  <Text className="text-gray-500 text-[13px]">{rule.description}</Text>

                  {/* Progress bar */}
                  <View className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${contribution}%` }}
                    />
                  </View>
                </View>

                <View className="ml-3 items-end">
                  <Text className="text-amber-600 font-bold text-lg">+{rule.weight}</Text>
                  <Text className="text-gray-400 text-[11px]">{contribution}%</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* 3. AI Explanation */}
        <View className="mx-5 bg-blue-50 rounded-xl p-4 border border-blue-100 flex-row items-start gap-3 mb-6">
          <ShieldCheck size={24} color="#3B82F6" />
          <View className="flex-1">
            <Text className="text-blue-900 font-semibold text-[15px] mb-1">
              Recommandation IA
            </Text>
            <Text className="text-blue-700 text-[14px] leading-5">
              Cette transaction présente un risque élevé. Nous recommandons une vérification biométrique avant approbation.
            </Text>
          </View>
        </View>

        {/* 4. Actions */}
        <View className="px-5 gap-3">
          <Pressable
            className="bg-red-500 rounded-xl py-4 items-center flex-row justify-center gap-2"
            style={styles.dangerButtonShadow}
          >
            <ShieldAlert size={20} color="white" />
            <Text className="text-white font-bold text-base">Bloquer la transaction</Text>
          </Pressable>

          <Pressable className="bg-white border border-gray-200 rounded-xl py-4 items-center">
            <Text className="text-gray-700 font-semibold text-base">Demander vérification</Text>
          </Pressable>
        </View>

        {/* Support */}
        <Pressable className="flex-row justify-center items-center mt-8 mb-4 gap-2">
          <HelpCircle size={18} color="#3B82F6" />
          <Text className="text-blue-500 font-medium text-[15px]">Comment fonctionne l'IA ?</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
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
      },
    }),
  },
  softShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  dangerButtonShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
});
