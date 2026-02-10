import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

// --- Constantes ---

const RISK_LEVELS = {
  LOW: { label: 'Faible', color: '#34C759', bgColor: '#ECFDF5' },
  MEDIUM: { label: 'Modéré', color: '#FF9500', bgColor: '#FFFBEB' },
  HIGH: { label: 'Élevé', color: '#FF3B30', bgColor: '#FEF2F2' },
};

// --- Composant Gauge SVG ---

interface RiskGaugeProps {
  score: number;
  size?: number;
  subtitle?: string;
}

function getRiskLevel(s: number) {
  if (s < 33) return RISK_LEVELS.LOW;
  if (s < 66) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.HIGH;
}

export function RiskGauge({ score, size = 280, subtitle }: RiskGaugeProps) {
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

      {/* Subtitle placé sous la jauge (pas en absolute) */}
      {subtitle && (
        <Text style={{ color: '#86868B', fontSize: 13, marginTop: 40, textAlign: 'center', paddingHorizontal: 8 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export { RISK_LEVELS, getRiskLevel };
export default RiskGauge;
