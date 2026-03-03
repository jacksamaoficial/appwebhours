import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../src/utils/colors';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useDataStore } from '../../src/store/dataStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Comida', icon: 'restaurant', color: '#F59E0B' },
  { id: 'transport', name: 'Transporte', icon: 'car', color: '#3B82F6' },
  { id: 'entertainment', name: 'Ocio', icon: 'game-controller', color: '#8B5CF6' },
  { id: 'other', name: 'Otros', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

export default function ExpensesScreen() {
  const {
    expenses,
    summary,
    isLoadingExpenses,
    fetchExpenses,
    fetchDashboard,
    createExpense,
    deleteExpense,
  } = useDataStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchExpenses();
    fetchDashboard();
  }, []);

  const handleRefresh = () => {
    fetchExpenses();
    fetchDashboard();
  };

  const handleCreateExpense = async () => {
    if (!selectedCategory || !description || !amount) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Introduce un importe válido');
      return;
    }

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await createExpense({
        date: today,
        category: selectedCategory,
        description,
        amount: amountNum,
      });
      setModalVisible(false);
      setSelectedCategory(null);
      setDescription('');
      setAmount('');
      Alert.alert('Éxito', 'Gasto registrado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el gasto');
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      'Eliminar Gasto',
      '¿Estás seguro de que quieres eliminar este gasto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expenseId);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el gasto');
            }
          },
        },
      ]
    );
  };

  // Group expenses by date
  const groupedExpenses = expenses.reduce((groups: any, expense) => {
    const date = expense.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(expense);
    return groups;
  }, {});

  const getCategoryData = (categoryId: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.id === categoryId) || EXPENSE_CATEGORIES[3];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingExpenses}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Gastos</Text>
            <Text style={styles.subtitle}>
              Total este mes: {(summary?.total_expenses || 0).toFixed(2)}€
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Quick Add Categories */}
        <View style={styles.categoriesGrid}>
          {EXPENSE_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => {
                setSelectedCategory(category.id);
                setModalVisible(true);
              }}
            >
              <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                <Ionicons name={category.icon as any} size={24} color={category.color} />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Expense List */}
        <Text style={styles.sectionTitle}>Historial</Text>
        
        {Object.keys(groupedExpenses).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No hay gastos registrados</Text>
            <Text style={styles.emptySubtext}>Pulsa + para añadir tu primer gasto</Text>
          </View>
        ) : (
          Object.keys(groupedExpenses)
            .sort((a, b) => b.localeCompare(a))
            .map((date) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>
                  {format(new Date(date), "EEEE, d 'de' MMMM", { locale: es })}
                </Text>
                {groupedExpenses[date].map((expense: any) => {
                  const category = getCategoryData(expense.category);
                  return (
                    <TouchableOpacity
                      key={expense.expense_id}
                      style={styles.expenseCard}
                      onLongPress={() => handleDeleteExpense(expense.expense_id)}
                    >
                      <View style={styles.expenseLeft}>
                        <View style={[styles.expenseIcon, { backgroundColor: category.color + '20' }]}>
                          <Ionicons name={category.icon as any} size={20} color={category.color} />
                        </View>
                        <View>
                          <Text style={styles.expenseDescription}>{expense.description}</Text>
                          <Text style={styles.expenseCategory}>{category.name}</Text>
                        </View>
                      </View>
                      <Text style={styles.expenseAmount}>-{expense.amount.toFixed(2)}€</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
        )}
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Gasto</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setSelectedCategory(null);
                setDescription('');
                setAmount('');
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              ¿Has tenido algún gasto hoy?
            </Text>

            {/* Category Selection */}
            <Text style={styles.inputLabel}>Categoría</Text>
            <View style={styles.categorySelector}>
              {EXPENSE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categorySelectorItem,
                    selectedCategory === category.id && styles.categorySelectorItemActive,
                    selectedCategory === category.id && { borderColor: category.color },
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={selectedCategory === category.id ? category.color : colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Descripción"
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Café, metro, cena..."
              icon="create"
            />

            <Input
              label="Importe (€)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              icon="cash"
            />

            <Button
              title="Guardar Gasto"
              onPress={handleCreateExpense}
              size="large"
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryCard: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  expenseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  expenseCategory: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.expense,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categorySelectorItem: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categorySelectorItemActive: {
    backgroundColor: colors.cardSecondary,
  },
  modalButton: {
    marginTop: spacing.md,
  },
});
