import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import type { AlertFilter, MLDecision } from '../../lib/types';

interface FilterBarProps {
  filter: AlertFilter;
  onFilterChange: (f: AlertFilter) => void;
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full mr-2 ${
        active ? 'bg-primary' : 'bg-surface border border-separator-opaque'
      }`}
    >
      <Text
        className={`text-caption1 font-semibold ${
          active ? 'text-white' : 'text-ink-secondary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const SCORE_FILTERS: { label: string; min?: number; max?: number }[] = [
  { label: 'Tous' },
  { label: 'Faible (0-29)', min: 0, max: 29 },
  { label: 'Modéré (30-69)', min: 30, max: 69 },
  { label: 'Élevé (70+)', min: 70, max: 100 },
];

const DECISION_FILTERS: { label: string; value: MLDecision | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Approve', value: 'approve' },
  { label: 'Review', value: 'review' },
  { label: 'Block', value: 'block' },
];

const PERIOD_FILTERS: { label: string; value: 'today' | 'week' | 'month' | 'all' }[] = [
  { label: 'Tout', value: 'all' },
  { label: "Aujourd'hui", value: 'today' },
  { label: 'Semaine', value: 'week' },
  { label: 'Mois', value: 'month' },
];

export function FilterBar({ filter, onFilterChange }: FilterBarProps) {
  return (
    <View className="mb-4">
      {/* Score filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-2"
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {SCORE_FILTERS.map((sf) => {
          const isActive =
            sf.min === undefined
              ? filter.scoreMin === undefined && filter.scoreMax === undefined
              : filter.scoreMin === sf.min && filter.scoreMax === sf.max;
          return (
            <Chip
              key={sf.label}
              label={sf.label}
              active={isActive}
              onPress={() =>
                onFilterChange({
                  ...filter,
                  scoreMin: sf.min,
                  scoreMax: sf.max,
                })
              }
            />
          );
        })}
      </ScrollView>

      {/* Decision filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-2"
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {DECISION_FILTERS.map((df) => (
          <Chip
            key={df.value}
            label={df.label}
            active={(filter.decision || 'all') === df.value}
            onPress={() =>
              onFilterChange({
                ...filter,
                decision: df.value,
              })
            }
          />
        ))}
      </ScrollView>

      {/* Period filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {PERIOD_FILTERS.map((pf) => (
          <Chip
            key={pf.value}
            label={pf.label}
            active={(filter.period || 'all') === pf.value}
            onPress={() =>
              onFilterChange({
                ...filter,
                period: pf.value,
              })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default FilterBar;
