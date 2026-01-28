# 06 - Historique des Transactions

> **Priorité:** 🟡 P1
> **Fichier:** `mobile/src/screens/HistoryScreen.tsx`

---

## Vue d'Ensemble

Liste complète des transactions avec filtres par statut, période et recherche textuelle.

---

## Structure de l'Écran

```
┌─────────────────────────────────────┐
│           Safe Area Top             │
├─────────────────────────────────────┤
│                                     │
│            Historique               │
│                                     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │  🔍 Rechercher...           │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│                                     │
│  [Tout] [Validées] [En attente] [▼] │
│                                     │
├─────────────────────────────────────┤
│  Aujourd'hui                        │
│  ┌─────────────────────────────┐    │
│  │ 🛒 Carrefour    -42,50 €    │    │
│  │    14:32         [Validée]  │    │
│  ├─────────────────────────────┤    │
│  │ ☕ Starbucks    -5,90 €     │    │
│  │    09:15         [Validée]  │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  Hier                               │
│  ┌─────────────────────────────┐    │
│  │ 🍕 Uber Eats    -18,90 €    │    │
│  │    20:45         [Validée]  │    │
│  ├─────────────────────────────┤    │
│  │ 💳 Virement     +150,00 €   │    │
│  │    15:30         [Validée]  │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  22 Janvier                         │
│  ┌─────────────────────────────┐    │
│  │ 🛍️ Amazon       -89,99 €    │    │
│  │    11:20       [À vérifier] │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  [Home] [History] [Card] [Profile]  │
└─────────────────────────────────────┘
```

---

## Palette de Couleurs

| Élément | Couleur | Token |
|---------|---------|-------|
| Fond écran | `#F3F4F6` | `background.primary` |
| Titre | `#111827` | `text.primary` |
| Search bar fond | `#FFFFFF` | `background.card` |
| Search bar bordure | `#E5E7EB` | `border` |
| Search placeholder | `#9CA3AF` | `text.tertiary` |
| Filter chip actif fond | `#3B82F6` | `primary.blue` |
| Filter chip actif texte | `#FFFFFF` | `text.onCard` |
| Filter chip inactif fond | `#FFFFFF` | `background.card` |
| Filter chip inactif texte | `#6B7280` | `text.secondary` |
| Section header | `#6B7280` | `text.secondary` |
| Transaction card | `#FFFFFF` | `background.card` |
| Badge Validée | `#10B981` sur `#D1FAE5` | `status.success` |
| Badge À vérifier | `#F59E0B` sur `#FEF3C7` | `status.warning` |
| Badge Bloquée | `#EF4444` sur `#FEE2E2` | `status.error` |

---

## Typographie

| Élément | Taille | Poids | Token |
|---------|--------|-------|-------|
| Page title | 40px | Bold (700) | `page-title` |
| Search text | 15px | Regular (400) | `body` |
| Filter chip | 14px | Medium (500) | `body-small` |
| Section header | 20px | Semibold (600) | `h2` |
| Transaction name | 15px | Medium (500) | `body` |
| Transaction time | 13px | Regular (400) | `caption` |
| Transaction amount | 15px | Semibold (600) | `body` |
| Badge label | 12px | Medium (500) | Custom |

---

## Composants

### PageTitle
```typescript
<Text className="text-page-title font-bold text-text-primary px-5 pt-4">
  Historique
</Text>
```

### SearchBar
```typescript
<View className="mx-5 mt-4">
  <TouchableOpacity
    className="flex-row items-center bg-card-bg border border-border rounded-input px-4 h-12"
    onPress={() => setSearchFocused(true)}
  >
    <SearchIcon color="#9CA3AF" size={20} />
    <TextInput
      className="flex-1 ml-3 text-body text-text-primary"
      placeholder="Rechercher..."
      placeholderTextColor="#9CA3AF"
      value={searchQuery}
      onChangeText={setSearchQuery}
      onFocus={() => setSearchFocused(true)}
      onBlur={() => setSearchFocused(false)}
    />
    {searchQuery && (
      <TouchableOpacity onPress={() => setSearchQuery('')}>
        <XCircleIcon color="#9CA3AF" size={20} />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
</View>
```

### FilterChips
```typescript
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  className="mt-4"
  contentContainerStyle={{ paddingHorizontal: 20 }}
>
  {FILTERS.map((filter) => (
    <FilterChip
      key={filter.value}
      label={filter.label}
      active={activeFilter === filter.value}
      onPress={() => setActiveFilter(filter.value)}
      icon={filter.icon}
    />
  ))}

  {/* Date filter dropdown */}
  <FilterChip
    label={selectedPeriod.label}
    icon={<CalendarIcon />}
    onPress={() => setShowDatePicker(true)}
    hasDropdown
  />
</ScrollView>

// Filter chip component
const FilterChip = ({ label, active, onPress, icon, hasDropdown }) => (
  <TouchableOpacity
    className={`
      flex-row items-center px-4 py-2 rounded-filter-chip mr-2
      ${active ? 'bg-primary' : 'bg-card-bg border border-border'}
    `}
    onPress={onPress}
  >
    {icon && <View className="mr-2">{icon}</View>}
    <Text className={active ? 'text-white font-medium' : 'text-text-secondary'}>
      {label}
    </Text>
    {hasDropdown && <ChevronDownIcon color={active ? '#FFFFFF' : '#6B7280'} size={16} className="ml-1" />}
  </TouchableOpacity>
);
```

### TransactionList (SectionList)
```typescript
<SectionList
  sections={groupedTransactions}
  keyExtractor={(item) => item.id}
  renderSectionHeader={({ section: { title } }) => (
    <View className="bg-app-bg px-5 py-2">
      <Text className="text-h2 font-semibold text-text-secondary">
        {title}
      </Text>
    </View>
  )}
  renderItem={({ item }) => (
    <TransactionItem
      transaction={item}
      showBadge
      onPress={() => handleTransactionPress(item)}
    />
  )}
  ItemSeparatorComponent={() => (
    <View className="h-px bg-border-light mx-5" />
  )}
  ListEmptyComponent={<EmptyState />}
  refreshControl={
    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
  }
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={isLoadingMore ? <LoadingFooter /> : null}
/>
```

### TransactionItem
```typescript
<TouchableOpacity
  className="flex-row items-center py-3 px-5 bg-card-bg"
  onPress={onPress}
  activeOpacity={0.7}
>
  {/* Icon */}
  <View className="w-10 h-10 rounded-full bg-app-bg items-center justify-center">
    {getCategoryIcon(transaction.category)}
  </View>

  {/* Details */}
  <View className="flex-1 ml-3">
    <Text className="text-body font-medium text-text-primary">
      {transaction.merchantName}
    </Text>
    <Text className="text-caption text-text-tertiary">
      {formatTime(transaction.createdAt)}
    </Text>
  </View>

  {/* Amount & Badge */}
  <View className="items-end">
    <Text className={`text-body font-semibold ${
      transaction.direction === 'incoming' ? 'text-success' : 'text-text-primary'
    }`}>
      {transaction.direction === 'incoming' ? '+' : '-'}
      {formatCurrency(transaction.amount)}
    </Text>
    <Badge
      variant={getStatusVariant(transaction.status)}
      label={getStatusLabel(transaction.status)}
      size="sm"
    />
  </View>
</TouchableOpacity>
```

---

## Filters Configuration

```typescript
const FILTERS = [
  { value: 'all', label: 'Tout', icon: null },
  { value: 'approved', label: 'Validées', icon: <CheckIcon size={14} /> },
  { value: 'pending', label: 'En attente', icon: <ClockIcon size={14} /> },
  { value: 'blocked', label: 'Bloquées', icon: <XIcon size={14} /> },
];

const PERIODS = [
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '3 mois' },
  { value: 'all', label: 'Tout' },
  { value: 'custom', label: 'Personnalisé...' },
];
```

---

## Data Grouping

```typescript
const groupTransactionsByDate = (transactions: Transaction[]) => {
  const groups: { [key: string]: Transaction[] } = {};

  transactions.forEach((tx) => {
    const date = new Date(tx.createdAt);
    const key = getDateKey(date);

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tx);
  });

  return Object.entries(groups).map(([title, data]) => ({
    title: formatSectionTitle(title),
    data,
  }));
};

const formatSectionTitle = (key: string) => {
  if (key === 'today') return "Aujourd'hui";
  if (key === 'yesterday') return 'Hier';
  return format(parseISO(key), 'd MMMM', { locale: fr });
};
```

---

## Interactions

### Search
1. **Focus:** Keyboard opens
2. **Type:** Filter transactions in real-time (debounced 300ms)
3. **Clear:** Reset search

### Filter Chip
1. **Tap:** Apply filter, fetch new data
2. **Active state:** Blue background

### Date Filter
1. **Tap:** Open date picker modal
2. **Select:** Apply period filter

### Transaction
1. **Press:** Scale 0.98
2. **Release:**
   - Si status `pending` → Navigate vers `Verification`
   - Sinon → Navigate vers `TransactionDetail`

### Pull to Refresh
```typescript
<RefreshControl
  refreshing={isRefreshing}
  onRefresh={handleRefresh}
  tintColor="#3B82F6"
/>
```

### Infinite Scroll
```typescript
onEndReached={loadMore}
onEndReachedThreshold={0.5}
```

---

## États

### Loading
```typescript
<SearchBarSkeleton />
<FilterChipsSkeleton />
<TransactionListSkeleton count={5} />
```

### Empty
```typescript
<View className="items-center justify-center py-16">
  <EmptyBoxIcon color="#9CA3AF" size={64} />
  <Text className="text-body text-text-secondary mt-4">
    Aucune transaction trouvée
  </Text>
  {activeFilter !== 'all' && (
    <Button variant="ghost" onPress={() => setActiveFilter('all')}>
      Voir toutes les transactions
    </Button>
  )}
</View>
```

### Loading More
```typescript
<View className="py-4 items-center">
  <ActivityIndicator color="#3B82F6" />
</View>
```

### Error
```typescript
<ErrorState
  message="Impossible de charger l'historique"
  onRetry={handleRefresh}
/>
```

---

## API Calls

```typescript
// Fetch transactions with filters
GET /transactions
Query params:
  - status?: 'pending' | 'approved' | 'blocked'
  - search?: string
  - from_date?: ISO date
  - to_date?: ISO date
  - limit: number (default: 20)
  - offset: number
```

---

## Accessibilité

| Élément | Label | Hint |
|---------|-------|------|
| Search bar | "Rechercher des transactions" | - |
| Filter chip | "{label}" | "Filtre {actif/inactif}" |
| Date filter | "Période: {selected}" | "Appuyez pour changer" |
| Section header | "{date}" | - |
| Transaction | "{merchant}, {amount}, {status}" | - |

---

## Navigation

```typescript
// Depuis HistoryScreen
navigation.navigate('TransactionDetail', { id: transaction.id });
navigation.navigate('Verification', { transactionId: transaction.id });
```
