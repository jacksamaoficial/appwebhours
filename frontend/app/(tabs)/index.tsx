import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../src/utils/colors';
import { SummaryCard } from '../../src/components/SummaryCard';
import { WeeklyChart } from '../../src/components/WeeklyChart';
import { HistoryItem } from '../../src/components/HistoryItem';
import { useAuthStore } from '../../src/store/authStore';
import { useDataStore } from '../../src/store/dataStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const {
    summary,
    weeklyData,
    history,
    isLoadingSummary,
    fetchDashboard,
    fetchWeeklyChart,
    fetchHistory,
    refreshAll,
    currentMonth,
    setCurrentMonth,
  } = useDataStore();

  useEffect(() => {
    refreshAll();
  }, []);

  const handleRefresh = () => {
    refreshAll();
  };

  const currentMonthName = format(new Date(currentMonth + '-01'), 'MMMM yyyy', { locale: es });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingSummary}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hola, {user?.name?.split(' ')[0] || 'Usuario'}
            </Text>
            <Text style={styles.monthLabel}>{currentMonthName}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Health Message */}
        {summary && (
          <View style={styles.healthCard}>
            <Ionicons
              name={summary.savings_rate >= 10 ? 'trending-up' : 'alert-circle'}
              size={24}
              color={summary.savings_rate >= 10 ? colors.success : colors.warning}
            />
            <Text style={styles.healthMessage}>{summary.health_message}</Text>
          </View>
        )}

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard
            title="Ingresos Bruto"
            value={`${(summary?.total_earnings || 0).toFixed(0)}€`}
            icon="trending-up"
            iconColor={colors.success}
            trend="up"
          />
          <View style={{ width: spacing.md }} />
          <SummaryCard
            title="Gastos"
            value={`${(summary?.total_expenses || 0).toFixed(0)}€`}
            icon="trending-down"
            iconColor={colors.expense}
          />
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            title="Balance Neto"
            value={`${(summary?.net_balance || 0).toFixed(0)}€`}
            icon="wallet"
            iconColor={colors.primary}
            subtitle={`${summary?.savings_rate || 0}% ahorrado`}
          />
          <View style={{ width: spacing.md }} />
          <SummaryCard
            title="Horas Extra"
            value={`${(summary?.total_extra_earnings || 0).toFixed(0)}€`}
            icon="time"
            iconColor={colors.warning}
          />
        </View>

        {/* Weekly Chart */}
        <WeeklyChart data={weeklyData} />

        {/* History */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Historial Reciente</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllButton}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No hay registros aún</Text>
            <Text style={styles.emptySubtext}>Empieza registrando tu jornada o un gasto</Text>
          </View>
        ) : (
          history.slice(0, 5).map((item) => (
            <HistoryItem key={item.id} item={item} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  healthMessage: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  seeAllButton: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
