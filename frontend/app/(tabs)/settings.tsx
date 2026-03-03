import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../src/utils/colors';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';
import { useDataStore } from '../../src/store/dataStore';
import { Job } from '../../src/types';
import { notificationService } from '../../src/services/notifications';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { jobs, fetchJobs, createJob, updateJob, deleteJob } = useDataStore();

  const [jobModalVisible, setJobModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  
  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState('20');
  const [reminderMinute, setReminderMinute] = useState('00');
  
  // Job form state
  const [jobName, setJobName] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [standardStart, setStandardStart] = useState('16:00');
  const [standardEnd, setStandardEnd] = useState('20:00');

  useEffect(() => {
    fetchJobs();
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    if (Platform.OS !== 'web') {
      const enabled = await notificationService.areNotificationsEnabled();
      setNotificationsEnabled(enabled);
      
      // Check if there's a scheduled daily reminder
      const scheduled = await notificationService.getScheduledNotifications();
      const hasReminder = scheduled.some(n => n.content.data?.type === 'daily_reminder');
      setDailyReminderEnabled(hasReminder);
    }
  };

  const handleToggleNotifications = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Info', 'Las notificaciones push solo están disponibles en la app móvil');
      return;
    }

    if (!notificationsEnabled) {
      const granted = await notificationService.requestPermissionWithExplanation();
      if (granted) {
        await notificationService.registerTokenWithBackend();
        setNotificationsEnabled(true);
        Alert.alert('¡Listo!', 'Notificaciones activadas correctamente');
      }
    } else {
      notificationService.openNotificationSettings();
    }
  };

  const handleToggleDailyReminder = async (value: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert('Info', 'Las notificaciones push solo están disponibles en la app móvil');
      return;
    }

    if (value) {
      if (!notificationsEnabled) {
        const granted = await notificationService.requestPermissionWithExplanation();
        if (!granted) return;
        setNotificationsEnabled(true);
      }
      
      const hour = parseInt(reminderHour) || 20;
      const minute = parseInt(reminderMinute) || 0;
      await notificationService.scheduleDailyReminder(hour, minute);
      setDailyReminderEnabled(true);
      Alert.alert('¡Listo!', `Recordatorio configurado para las ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    } else {
      await notificationService.cancelDailyReminders();
      setDailyReminderEnabled(false);
      Alert.alert('Desactivado', 'Recordatorio diario desactivado');
    }
  };

  const handleSaveReminderTime = async () => {
    const hour = parseInt(reminderHour);
    const minute = parseInt(reminderMinute);
    
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert('Error', 'Por favor introduce una hora válida');
      return;
    }

    if (dailyReminderEnabled) {
      await notificationService.scheduleDailyReminder(hour, minute);
      Alert.alert('¡Listo!', `Hora actualizada a las ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
    setNotificationModalVisible(false);
  };

  const handleTestNotification = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Info', 'Las notificaciones push solo están disponibles en la app móvil');
      return;
    }
    
    await notificationService.sendLocalNotification(
      '¡Prueba exitosa! 🎉',
      'Las notificaciones están funcionando correctamente.',
      { type: 'test' }
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: logout },
      ]
    );
  };

  const openJobModal = (job?: Job) => {
    if (job) {
      setEditingJob(job);
      setJobName(job.name);
      setBaseSalary(job.base_salary.toString());
      setHoursPerWeek(job.hours_per_week.toString());
      setHourlyRate(job.hourly_rate.toString());
      setStandardStart(job.standard_start);
      setStandardEnd(job.standard_end);
    } else {
      setEditingJob(null);
      setJobName('');
      setBaseSalary('');
      setHoursPerWeek('');
      setHourlyRate('');
      setStandardStart('16:00');
      setStandardEnd('20:00');
    }
    setJobModalVisible(true);
  };

  const closeJobModal = () => {
    setJobModalVisible(false);
    setEditingJob(null);
  };

  const handleSaveJob = async () => {
    if (!jobName || !baseSalary || !hoursPerWeek || !hourlyRate) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const jobData = {
      name: jobName,
      base_salary: parseFloat(baseSalary),
      hours_per_week: parseInt(hoursPerWeek),
      hourly_rate: parseFloat(hourlyRate),
      standard_start: standardStart,
      standard_end: standardEnd,
    };

    try {
      if (editingJob) {
        await updateJob(editingJob.job_id, jobData);
        Alert.alert('Éxito', 'Trabajo actualizado');
      } else {
        await createJob(jobData);
        Alert.alert('Éxito', 'Trabajo creado');
      }
      closeJobModal();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el trabajo');
    }
  };

  const handleDeleteJob = (job: Job) => {
    Alert.alert(
      'Eliminar Trabajo',
      `¿Estás seguro de que quieres eliminar "${job.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJob(job.job_id);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el trabajo');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ajustes</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perfil</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Usuario'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Jobs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Trabajos</Text>
            <TouchableOpacity
              style={styles.addJobButton}
              onPress={() => openJobModal()}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={styles.addJobText}>Añadir</Text>
            </TouchableOpacity>
          </View>
          
          {jobs.map((job) => (
            <TouchableOpacity
              key={job.job_id}
              style={styles.jobItem}
              onPress={() => openJobModal(job)}
              onLongPress={() => handleDeleteJob(job)}
            >
              <View style={styles.jobItemLeft}>
                <View style={styles.jobIconContainer}>
                  <Ionicons name="briefcase" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.jobItemName}>{job.name}</Text>
                  <Text style={styles.jobItemDetails}>
                    {job.base_salary}€/mes • {job.hourly_rate}€/h extra
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleToggleNotifications}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.menuItemText}>Notificaciones Push</Text>
                <Text style={styles.menuItemSubtext}>
                  {Platform.OS === 'web' ? 'Solo en móvil' : notificationsEnabled ? 'Activadas' : 'Desactivadas'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: notificationsEnabled ? colors.success + '20' : colors.textMuted + '20' }]}>
              <Text style={[styles.statusText, { color: notificationsEnabled ? colors.success : colors.textMuted }]}>
                {notificationsEnabled ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="alarm" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Recordatorio Diario</Text>
                <Text style={styles.menuItemSubtext}>
                  Te avisamos cuando termina tu jornada
                </Text>
              </View>
            </View>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={handleToggleDailyReminder}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={dailyReminderEnabled ? colors.primary : colors.textMuted}
            />
          </View>

          {dailyReminderEnabled && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setNotificationModalVisible(true)}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: colors.primaryDark + '20' }]}>
                  <Ionicons name="time" size={20} color={colors.primaryDark} />
                </View>
                <View>
                  <Text style={styles.menuItemText}>Hora del Recordatorio</Text>
                  <Text style={styles.menuItemSubtext}>
                    {reminderHour.padStart(2, '0')}:{reminderMinute.padStart(2, '0')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={handleTestNotification}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="paper-plane" size={20} color={colors.success} />
              </View>
              <Text style={styles.menuItemText}>Probar Notificación</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sync Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sincronización</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="cloud" size={20} color={colors.success} />
              </View>
              <Text style={styles.menuItemText}>Estado</Text>
            </View>
            <View style={styles.syncStatus}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>Activa</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <Button
          title="Cerrar Sesión"
          onPress={handleLogout}
          variant="danger"
          icon={<Ionicons name="log-out" size={20} color={colors.white} />}
          style={styles.logoutButton}
        />

        <Text style={styles.version}>Finance Hub v1.0.0</Text>
      </ScrollView>

      {/* Job Modal */}
      <Modal visible={jobModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingJob ? 'Editar Trabajo' : 'Nuevo Trabajo'}
              </Text>
              <TouchableOpacity onPress={closeJobModal}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Nombre del trabajo"
                value={jobName}
                onChangeText={setJobName}
                placeholder="Ej: Trabajo Principal"
                icon="briefcase"
              />

              <Input
                label="Salario base mensual (€)"
                value={baseSalary}
                onChangeText={setBaseSalary}
                placeholder="638.00"
                keyboardType="decimal-pad"
                icon="cash"
              />

              <Input
                label="Horas semanales"
                value={hoursPerWeek}
                onChangeText={setHoursPerWeek}
                placeholder="20"
                keyboardType="numeric"
                icon="time"
              />

              <Input
                label="Tarifa hora extra (€)"
                value={hourlyRate}
                onChangeText={setHourlyRate}
                placeholder="7.50"
                keyboardType="decimal-pad"
                icon="trending-up"
              />

              <View style={styles.timeRow}>
                <View style={styles.timeInput}>
                  <Input
                    label="Hora inicio"
                    value={standardStart}
                    onChangeText={setStandardStart}
                    placeholder="16:00"
                    icon="play"
                  />
                </View>
                <View style={styles.timeInput}>
                  <Input
                    label="Hora fin estándar"
                    value={standardEnd}
                    onChangeText={setStandardEnd}
                    placeholder="20:00"
                    icon="stop"
                  />
                </View>
              </View>

              <Text style={styles.helpText}>
                Las horas después de la hora de fin estándar se contarán como extras.
              </Text>

              <Button
                title={editingJob ? 'Guardar Cambios' : 'Crear Trabajo'}
                onPress={handleSaveJob}
                size="large"
                style={styles.modalButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notification Time Modal */}
      <Modal visible={notificationModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hora del Recordatorio</Text>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              ¿A qué hora quieres recibir el recordatorio diario?
            </Text>

            <View style={styles.timePickerRow}>
              <View style={styles.timePickerInput}>
                <Input
                  label="Hora"
                  value={reminderHour}
                  onChangeText={setReminderHour}
                  placeholder="20"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timePickerInput}>
                <Input
                  label="Minutos"
                  value={reminderMinute}
                  onChangeText={setReminderMinute}
                  placeholder="00"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.helpText}>
              Recibirás una notificación para recordarte cerrar tu jornada y registrar gastos.
            </Text>

            <Button
              title="Guardar Hora"
              onPress={handleSaveReminderTime}
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addJobText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  jobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  jobItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  jobItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  jobItemDetails: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuItemText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  menuItemSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  syncText: {
    fontSize: 13,
    color: colors.success,
  },
  logoutButton: {
    marginTop: spacing.lg,
  },
  version: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.lg,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeInput: {
    flex: 1,
  },
  helpText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modalButton: {
    marginTop: spacing.md,
  },
  modalSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  timePickerInput: {
    flex: 1,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
});
