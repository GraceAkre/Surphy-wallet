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

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function RiskGauge({ score, size = 280, subtitle }: RiskGaugeProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score]);

  const center = size / 2;
  const radius = (size - 40) / 2;
  const strokeWidth = 18;

  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;

  const polarToCartesian = (angle: number) => ({
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  });

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);

  // Arc de fond (gris clair)
  const backgroundArc = `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;

  // Arc de progression (coloré, se remplit de gauche à droite)
  const progressAngle = startAngle + (Math.min(score, 100) / 100) * Math.PI;
  const progressEnd = polarToCartesian(progressAngle);
  const largeArcFlag = score > 50 ? 1 : 0;
  const progressArc = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${progressEnd.x} ${progressEnd.y}`;

  const currentLevel = getRiskLevel(score);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        <Defs>
          <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#34C759" />
            <Stop offset="50%" stopColor="#FF9500" />
            <Stop offset="100%" stopColor="#FF3B30" />
          </LinearGradient>
        </Defs>

        {/* Arc de fond (gris) */}
        <Path
          d={backgroundArc}
          fill="none"
          stroke="#E5E5EA"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Arc de progression (dégradé) */}
        {score > 0 && (
          <Path
            d={progressArc}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Graduations */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = startAngle + (tick / 100) * Math.PI;
          const innerRadius = radius - strokeWidth / 2 - 6;
          const outerRadius = radius - strokeWidth / 2 - 1;
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
                stroke="#C7C7CC"
                strokeWidth={1.5}
              />
            </G>
          );
        })}

        {/* Cercle central */}
        <Circle cx={center} cy={center} r={50} fill="white" />
        <Circle cx={center} cy={center} r={50} fill="none" stroke="#F2F2F7" strokeWidth={1.5} />

        {/* Labels 0 et 100 */}
        <SvgText x={32} y={center + 26} fontSize={11} fill="#AEAEB2" textAnchor="middle">
          0
        </SvgText>
        <SvgText x={size - 32} y={center + 26} fontSize={11} fill="#AEAEB2" textAnchor="middle">
          100
        </SvgText>
      </Svg>

      {/* Score central + badge (overlay) */}
      <View style={{ position: 'absolute', top: center - 42, alignItems: 'center' }}>
        <Text style={{ fontSize: 42, fontWeight: '800', color: currentLevel.color }}>
          {score}
        </Text>
        <View
          style={{
            backgroundColor: currentLevel.bgColor,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 20,
            marginTop: 8,
          }}
        >
          <Text style={{ color: currentLevel.color, fontWeight: '600', fontSize: 13 }}>
            {currentLevel.label}
          </Text>
        </View>
      </View>

      {/* Subtitle */}
      {subtitle && (
        <Text style={{ color: '#86868B', fontSize: 12, marginTop: 12, textAlign: 'center', paddingHorizontal: 8 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export { RISK_LEVELS, getRiskLevel };
export default RiskGauge;
