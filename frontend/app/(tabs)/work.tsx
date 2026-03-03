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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../src/utils/colors';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useDataStore } from '../../src/store/dataStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Job, WorkEntry } from '../../src/types';

export default function WorkScreen() {
  const {
    jobs,
    workEntries,
    isLoadingJobs,
    isLoadingEntries,
    fetchJobs,
    fetchWorkEntries,
    createWorkEntry,
    closeWorkEntry,
    deleteWorkEntry,
  } = useDataStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<WorkEntry | null>(null);
  
  // Form state
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('20:00');
  const [isNextDay, setIsNextDay] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchJobs();
    fetchWorkEntries();
  }, []);

  const handleRefresh = () => {
    fetchJobs();
    fetchWorkEntries();
  };

  const handleStartEntry = (job: Job) => {
    setSelectedJob(job);
    setStartTime(job.standard_start);
    setNotes('');
    setModalVisible(true);
  };

  const handleCreateEntry = async () => {
    if (!selectedJob) return;
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await createWorkEntry({
        job_id: selectedJob.job_id,
        date: today,
        start_time: startTime,
        notes: notes || undefined,
      });
      setModalVisible(false);
      Alert.alert('Éxito', 'Jornada iniciada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar la jornada');
    }
  };

  const handleOpenCloseModal = (entry: WorkEntry) => {
    setSelectedEntry(entry);
    setEndTime('20:00');
    setIsNextDay(false);
    setCloseModalVisible(true);
  };

  const handleCloseEntry = async () => {
    if (!selectedEntry) return;
    
    try {
      await closeWorkEntry(selectedEntry.entry_id, endTime, isNextDay);
      setCloseModalVisible(false);
      Alert.alert('Éxito', 'Jornada cerrada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar la jornada');
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert(
      'Eliminar Registro',
      '¿Estás seguro de que quieres eliminar este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkEntry(entryId);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el registro');
            }
          },
        },
      ]
    );
  };

  // Get open entries (without end_time)
  const openEntries = workEntries.filter((e) => !e.end_time);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingJobs || isLoadingEntries}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Control Horario</Text>
          <Text style={styles.subtitle}>{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</Text>
        </View>

        {/* Open Entries Alert */}
        {openEntries.length > 0 && (
          <View style={styles.alertCard}>
            <Ionicons name="time" size={24} color={colors.warning} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                Tienes {openEntries.length} jornada{openEntries.length > 1 ? 's' : ''} abierta{openEntries.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.alertSubtitle}>Recuerda cerrar tu jornada al terminar</Text>
            </View>
          </View>
        )}

        {/* Jobs */}
        <Text style={styles.sectionTitle}>Tus Trabajos</Text>
        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No tienes trabajos configurados</Text>
          </View>
        ) : (
          jobs.filter((j) => j.is_active).map((job) => (
            <View key={job.job_id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.jobIconContainer}>
                  <Ionicons name="briefcase" size={24} color={colors.primary} />
                </View>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobName}>{job.name}</Text>
                  <Text style={styles.jobDetails}>
                    {job.base_salary}€/mes • {job.hourly_rate}€/h extra
                  </Text>
                </View>
              </View>
              <View style={styles.jobActions}>
                <Text style={styles.jobSchedule}>
                  Horario: {job.standard_start} - {job.standard_end}
                </Text>
                <Button
                  title="Fichar"
                  onPress={() => handleStartEntry(job)}
                  size="small"
                  icon={<Ionicons name="play" size={16} color={colors.white} />}
                />
              </View>
            </View>
          ))
        )}

        {/* Recent Entries */}
        <Text style={styles.sectionTitle}>Registros del Mes</Text>
        {workEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No hay registros este mes</Text>
          </View>
        ) : (
          workEntries.slice(0, 10).map((entry) => {
            const job = jobs.find((j) => j.job_id === entry.job_id);
            return (
              <TouchableOpacity
                key={entry.entry_id}
                style={styles.entryCard}
                onLongPress={() => handleDeleteEntry(entry.entry_id)}
              >
                <View style={styles.entryLeft}>
                  <View
                    style={[
                      styles.entryStatus,
                      { backgroundColor: entry.end_time ? colors.success : colors.warning },
                    ]}
                  />
                  <View>
                    <Text style={styles.entryDate}>
                      {format(new Date(entry.date), "d 'de' MMM", { locale: es })}
                    </Text>
                    <Text style={styles.entryTime}>
                      {entry.start_time} {entry.end_time ? `- ${entry.end_time}` : '(en curso)'}
                    </Text>
                  </View>
                </View>
                <View style={styles.entryRight}>
                  {entry.end_time ? (
                    <>
                      <Text style={styles.entryEarnings}>
                        +{entry.total_earnings.toFixed(2)}€
                      </Text>
                      {entry.extra_hours > 0 && (
                        <Text style={styles.entryExtra}>
                          +{entry.extra_hours.toFixed(1)}h extras
                        </Text>
                      )}
                    </>
                  ) : (
                    <Button
                      title="Cerrar"
                      onPress={() => handleOpenCloseModal(entry)}
                      size="small"
                      variant="secondary"
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Start Entry Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Iniciar Jornada</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedJob && (
              <Text style={styles.modalSubtitle}>{selectedJob.name}</Text>
            )}

            <Input
              label="Hora de Inicio"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="16:00"
              icon="time"
            />

            <Input
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Añade notas sobre tu jornada"
              multiline
              numberOfLines={3}
            />

            <Button
              title="Iniciar Jornada"
              onPress={handleCreateEntry}
              size="large"
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>

      {/* Close Entry Modal */}
      <Modal visible={closeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cerrar Jornada</Text>
              <TouchableOpacity onPress={() => setCloseModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              ¿A qué hora has terminado hoy?
            </Text>

            <Input
              label="Hora de Fin"
              value={endTime}
              onChangeText={setEndTime}
              placeholder="20:00"
              icon="time"
            />

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>¿Terminaste después de medianoche?</Text>
                <Text style={styles.switchSubtitle}>Activa si tu hora de fin es de madrugada</Text>
              </View>
              <Switch
                value={isNextDay}
                onValueChange={setIsNextDay}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={isNextDay ? colors.primary : colors.textMuted}
              />
            </View>

            <Button
              title="Cerrar Jornada"
              onPress={handleCloseEntry}
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
    textTransform: 'capitalize',
    marginTop: spacing.xs,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  alertContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.warning,
  },
  alertSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  jobIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  jobDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobSchedule: {
    fontSize: 13,
    color: colors.textMuted,
  },
  entryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  entryTime: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  entryEarnings: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  entryExtra: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
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
    marginBottom: spacing.md,
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
  modalButton: {
    marginTop: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  switchSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
