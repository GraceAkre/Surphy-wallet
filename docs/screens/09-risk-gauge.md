# 09 - Jauge de Risque (Alex)

> **Priorité:** 🟢 P2
> **Fichier:** `mobile/src/screens/RiskGaugeScreen.tsx`

---

## Vue d'Ensemble

Écran destiné à Alex (analyste) pour visualiser le score de risque d'un utilisateur ou d'une transaction via une jauge circulaire colorée. Permet d'identifier rapidement le niveau de risque.

---

## Structure de l'Écran

```
┌─────────────────────────────────────┐
│  [←]      Analyse de risque         │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🔍 Rechercher un user...   │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      ╭───────────────╮      │    │
│  │     ╱   🟢🟡🟠🔴     ╲     │    │
│  │    ╱                   ╲    │    │
│  │   ╱         ▲           ╲   │    │
│  │  │      (needle)         │  │    │
│  │                             │    │
│  │         23%                 │    │
│  │        RISQUE               │    │
│  │                             │    │
│  │      Score: Faible          │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  Transactions suspectes (3)         │
│  ┌─────────────────────────────┐    │
│  │ 🛍️ Amazon      -89,99 €     │    │
│  │    Hier       [À vérifier]  │    │
│  ├─────────────────────────────┤    │
│  │ 💳 Stripe     -250,00 €     │    │
│  │    22 Jan     [À vérifier]  │    │
│  ├─────────────────────────────┤    │
│  │ 🌐 PayPal     -45,00 €      │    │
│  │    20 Jan     [À vérifier]  │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## Palette de Couleurs

| Élément | Couleur | Token |
|---------|---------|-------|
| Fond écran | `#F3F4F6` | `background.primary` |
| Header title | `#111827` | `text.primary` |
| Search bar | `#FFFFFF` | `background.card` |
| Gauge card | `#F8F9FB` | `background.card-light` |
| Gauge green | `#A3E635` | `gauge.green` |
| Gauge yellow | `#FDE047` | `gauge.yellow` |
| Gauge orange | `#FB923C` | `gauge.orange` |
| Gauge red | `#EF4444` | `gauge.red` |
| Gauge background | `#E5E7EB` | `gauge.background` |
| Gauge needle | `#3B82F6` | `gauge.needle` |
| Percentage text | `#3B4A6B` | `text.risk` |
| Risk label | `#6B7280` | `text.secondary` |
| Section title | `#111827` | `text.primary` |

---

## Typographie

| Élément | Taille | Poids | Token |
|---------|--------|-------|-------|
| Header title | 17px | Semibold (600) | `menu-item` |
| Search text | 15px | Regular (400) | `body` |
| Percentage | 56px | Bold (700) | `risk-percentage` |
| Risk label | 18px | Semibold (600) | `gauge-label` |
| Score level | 15px | Medium (500) | `body` |
| Section title | 17px | Semibold (600) | `menu-item` |

---

## Composants

### Header
```typescript
<View className="flex-row items-center px-5 py-4">
  <TouchableOpacity onPress={navigation.goBack}>
    <ChevronLeftIcon color="#111827" size={24} />
  </TouchableOpacity>
  <Text className="flex-1 text-menu-item font-semibold text-text-primary text-center">
    Analyse de risque
  </Text>
  <View className="w-6" /> {/* Spacer for centering */}
</View>
```

### SearchBar
```typescript
<View className="mx-5 mb-4">
  <View className="flex-row items-center bg-card-bg border border-border rounded-input px-4 h-12">
    <SearchIcon color="#9CA3AF" size={20} />
    <TextInput
      className="flex-1 ml-3 text-body text-text-primary"
      placeholder="Rechercher un utilisateur..."
      placeholderTextColor="#9CA3AF"
      value={searchQuery}
      onChangeText={setSearchQuery}
      onSubmitEditing={handleSearch}
    />
  </View>
</View>
```

### RiskGaugeCard
```typescript
<Card variant="flat" className="mx-5 bg-card-light-bg">
  <View className="items-center py-8">
    {/* Circular Gauge */}
    <CircularGauge
      value={riskScore}
      size={200}
      strokeWidth={20}
    />

    {/* Percentage */}
    <Text className="text-risk-percentage font-bold text-text-risk mt-4">
      {riskScore}%
    </Text>

    {/* Label */}
    <Text
      className="text-gauge-label font-semibold text-text-secondary uppercase mt-1"
      style={{ letterSpacing: 1 }}
    >
      RISQUE
    </Text>

    {/* Score Level */}
    <View className={`px-4 py-1 rounded-badge mt-3 ${getRiskLevelStyle(riskScore).bgClass}`}>
      <Text className={`text-body font-medium ${getRiskLevelStyle(riskScore).textClass}`}>
        Score: {getRiskLevel(riskScore)}
      </Text>
    </View>
  </View>
</Card>
```

### CircularGauge (SVG)
```typescript
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  withTiming,
  Easing
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface CircularGaugeProps {
  value: number; // 0-100
  size: number;
  strokeWidth: number;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({ value, size, strokeWidth }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Semi-circle
  const center = size / 2;

  // Gradient stops for the gauge arc
  const gradientStops = [
    { offset: 0, color: '#A3E635' },    // Green
    { offset: 0.33, color: '#FDE047' }, // Yellow
    { offset: 0.66, color: '#FB923C' }, // Orange
    { offset: 1, color: '#EF4444' },    // Red
  ];

  // Needle rotation (0% = -90deg, 100% = 90deg)
  const needleRotation = -90 + (value / 100) * 180;

  const animatedNeedleProps = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      {
        rotate: withTiming(`${needleRotation}deg`, {
          duration: 1200,
          easing: Easing.out(Easing.cubic),
        })
      },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  return (
    <Svg width={size} height={size / 2 + 20}>
      <Defs>
        <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          {gradientStops.map((stop, i) => (
            <Stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
      </Defs>

      {/* Background arc */}
      <Path
        d={describeArc(center, center, radius, -180, 0)}
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />

      {/* Colored arc */}
      <Path
        d={describeArc(center, center, radius, -180, 0)}
        stroke="url(#gaugeGradient)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />

      {/* Needle */}
      <AnimatedPath
        animatedProps={animatedNeedleProps}
        d={`M ${center} ${center} L ${center} ${center - radius + 10}`}
        stroke="#3B82F6"
        strokeWidth={4}
        strokeLinecap="round"
      />

      {/* Needle center dot */}
      <Circle
        cx={center}
        cy={center}
        r={8}
        fill="#3B82F6"
      />
    </Svg>
  );
};

// Helper to describe SVG arc
const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};
```

### Risk Level Helper
```typescript
const getRiskLevel = (score: number): string => {
  if (score < 30) return 'Faible';
  if (score < 70) return 'Moyen';
  return 'Élevé';
};

const getRiskLevelStyle = (score: number) => {
  if (score < 30) return { bgClass: 'bg-success-bg', textClass: 'text-success' };
  if (score < 70) return { bgClass: 'bg-warning-bg', textClass: 'text-warning' };
  return { bgClass: 'bg-error-bg', textClass: 'text-error' };
};
```

### SuspiciousTransactionsList
```typescript
<View className="mt-6">
  <View className="flex-row justify-between items-center px-5 mb-3">
    <Text className="text-menu-item font-semibold text-text-primary">
      Transactions suspectes ({suspiciousCount})
    </Text>
  </View>

  <Card variant="default" padding="none" className="mx-5">
    {suspiciousTransactions.map((tx, index) => (
      <React.Fragment key={tx.id}>
        <TransactionItem
          transaction={tx}
          showBadge
          onPress={() => navigation.navigate('Verification', { transactionId: tx.id })}
        />
        {index < suspiciousTransactions.length - 1 && (
          <View className="h-px bg-border-light mx-4" />
        )}
      </React.Fragment>
    ))}
  </Card>
</View>
```

---

## Interactions

### Search
1. **Type:** Debounced search (300ms)
2. **Submit:** Fetch user risk data
3. **Clear:** Reset to default view

### Gauge Animation
1. **On mount:** Needle animates from 0 to actual value
2. **Duration:** 1200ms with ease-out cubic
3. **On value change:** Smooth transition to new value

### Transaction Item
1. **Press:** Navigate to `VerificationScreen`

---

## États

### Initial (No User Selected)
```typescript
<View className="items-center py-16">
  <SearchIcon color="#9CA3AF" size={48} />
  <Text className="text-body text-text-secondary mt-4 text-center px-8">
    Recherchez un utilisateur pour voir son analyse de risque
  </Text>
</View>
```

### Loading
```typescript
<View className="items-center py-16">
  <ActivityIndicator color="#3B82F6" size="large" />
  <Text className="text-body text-text-secondary mt-4">
    Analyse en cours...
  </Text>
</View>
```

### No Suspicious Transactions
```typescript
<View className="items-center py-8 mx-5">
  <CheckCircleIcon color="#10B981" size={48} />
  <Text className="text-body text-text-secondary mt-4 text-center">
    Aucune transaction suspecte pour cet utilisateur
  </Text>
</View>
```

### Error
```typescript
<ErrorState
  message="Impossible de charger l'analyse"
  onRetry={handleRetry}
/>
```

---

## API Calls

```typescript
// Search user
GET /users/search?query={query}
Response: [{ id, email, fullName, campus }]

// Get user risk score
GET /fraud/risk-score?user_id={userId}
Response: {
  score: number,
  level: 'low' | 'medium' | 'high',
  factors: string[],
  last_updated: string,
}

// Get suspicious transactions
GET /transactions?user_id={userId}&decision=review&status=pending
```

---

## Accessibilité

| Élément | Label | Hint |
|---------|-------|------|
| Back button | "Retour" | - |
| Search bar | "Rechercher un utilisateur" | - |
| Gauge | "Score de risque: {score}%" | "Niveau: {level}" |
| Transaction | "{merchant}, {amount}, {status}" | - |

### VoiceOver for Gauge
```typescript
<View
  accessible
  accessibilityLabel={`Score de risque: ${riskScore} pourcent`}
  accessibilityHint={`Niveau de risque ${getRiskLevel(riskScore)}`}
>
  <CircularGauge value={riskScore} />
</View>
```

---

## Navigation

```typescript
// Depuis RiskGaugeScreen (accessible depuis Profile pour Alex)
navigation.goBack();
navigation.navigate('Verification', { transactionId });
navigation.navigate('UserDetail', { userId });
```

---

## Access Control

```typescript
// Cet écran est réservé aux analystes (Alex)
// Vérification du rôle dans le composant parent ou navigation

const isAnalyst = user.role === 'analyst' || user.email.includes('@epitech.eu');

if (!isAnalyst) {
  return <AccessDenied message="Accès réservé aux analystes" />;
}
```
