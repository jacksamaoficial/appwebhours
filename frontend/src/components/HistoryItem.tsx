import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../utils/colors';
import { HistoryItem as HistoryItemType } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoryItemProps {
  item: HistoryItemType;
  onPress?: () => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item, onPress }) => {
  const isIncome = item.is_income;
  const iconName = item.type === 'work' ? 'briefcase' : getCategoryIcon(item.subtitle);
  const iconColor = isIncome ? colors.income : colors.expense;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={iconName as any} size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: iconColor }]}>
          {isIncome ? '+' : '-'}{item.amount.toFixed(2)}€
        </Text>
        <Text style={styles.date}>
          {format(parseISO(item.date), 'd MMM', { locale: es })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    food: 'restaurant',
    transport: 'car',
    entertainment: 'game-controller',
    other: 'ellipsis-horizontal',
  };
  return icons[category.toLowerCase()] || 'cash';
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
