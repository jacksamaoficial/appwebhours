import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors, spacing } from '../utils/colors';
import { WeeklyData } from '../types';

interface WeeklyChartProps {
  data: WeeklyData[];
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sin datos para mostrar</Text>
      </View>
    );
  }

  // Prepare data for chart
  const chartData = data.flatMap((week, index) => [
    {
      value: week.income,
      label: week.week_label,
      spacing: 2,
      labelWidth: 50,
      labelTextStyle: { color: colors.textMuted, fontSize: 10 },
      frontColor: colors.income,
    },
    {
      value: week.expenses,
      frontColor: colors.expense,
    },
  ]);

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.income, d.expenses)),
    100
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ingresos vs Gastos</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
            <Text style={styles.legendText}>Ingresos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
            <Text style={styles.legendText}>Gastos</Text>
          </View>
        </View>
      </View>
      
      <BarChart
        data={chartData}
        barWidth={20}
        spacing={24}
        roundedTop
        roundedBottom
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
        noOfSections={4}
        maxValue={maxValue * 1.2}
        isAnimated
        animationDuration={500}
        barBorderRadius={4}
        height={150}
        yAxisLabelSuffix="€"
        hideYAxisText
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
