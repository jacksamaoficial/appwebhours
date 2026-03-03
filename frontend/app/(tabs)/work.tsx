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
import { format, subDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Job, WorkEntry, RestDay } from '../../src/types';

export default function WorkScreen() {
  const {
    jobs,
    workEntries,
    restDays,
    isLoadingJobs,
    isLoadingEntries,
    fetchJobs,
    fetchWorkEntries,
    fetchRestDays,
    createWorkEntry,
    updateWorkEntry,
    closeWorkEntry,
    deleteWorkEntry,
    toggleRestDay,
    createJob,
    deleteRestDay,
  } = useDataStore();

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [jobModalVisible, setJobModalVisible] = useState(false);
  
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<WorkEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Form state for new/edit entry
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('20:00');
  const [isNextDay, setIsNextDay] = useState(false);
  const [notes, setNotes] = useState('');
  const [isCompleteEntry, setIsCompleteEntry] = useState(false); // If adding complete day at once

  // Form state for new job
  const [jobName, setJobName] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [standardStart, setStandardStart] = useState('16:00');
  const [standardEnd, setStandardEnd] = useState('20:00');

  useEffect(() => {
    fetchJobs();
    fetchWorkEntries();
    fetchRestDays();
  }, []);

  const handleRefresh = () => {
    fetchJobs();
    fetchWorkEntries();
    fetchRestDays();
  };

  // Start new entry (clock in)
  const handleStartEntry = (job: Job) => {
    setSelectedJob(job);
    setEntryDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime(job.standard_start);
    setEndTime(job.standard_end);
    setNotes('');
    setIsNextDay(false);
    setIsCompleteEntry(false);
    setModalVisible(true);
  };

  // Add manual entry for past day
  const handleAddManualEntry = (job: Job, date?: string) => {
    setSelectedJob(job);
    setEntryDate(date || format(subDays(new Date(), 1), 'yyyy-MM-dd'));
    setStartTime(job.standard_start);
    setEndTime(job.standard_end);
    setNotes('');
    setIsNextDay(false);
    setIsCompleteEntry(true);
    setModalVisible(true);
  };

  // Create new entry
  const handleCreateEntry = async () => {
    if (!selectedJob) return;
    
    try {
      const entryData: any = {
        job_id: selectedJob.job_id,
        date: entryDate,
        start_time: startTime,
        notes: notes || undefined,
      };

      // If adding complete entry with end time
      if (isCompleteEntry && endTime) {
        entryData.end_time = endTime;
        entryData.is_next_day = isNextDay;
      }

      await createWorkEntry(entryData);
      setModalVisible(false);
      Alert.alert('Éxito', isCompleteEntry ? 'Jornada añadida correctamente' : 'Jornada iniciada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la jornada');
    }
  };

  // Open close modal
  const handleOpenCloseModal = (entry: WorkEntry) => {
    setSelectedEntry(entry);
    const job = jobs.find(j => j.job_id === entry.job_id);
    setEndTime(job?.standard_end || '20:00');
    setIsNextDay(false);
    setCloseModalVisible(true);
  };

  // Close entry
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

  // Open edit modal
  const handleOpenEditModal = (entry: WorkEntry) => {
    setSelectedEntry(entry);
    setEntryDate(entry.date);
    setStartTime(entry.start_time);
    setEndTime(entry.end_time || '20:00');
    setIsNextDay(entry.is_next_day);
    setNotes(entry.notes || '');
    setEditModalVisible(true);
  };

  // Update entry
  const handleUpdateEntry = async () => {
    if (!selectedEntry) return;
    
    try {
      await updateWorkEntry(selectedEntry.entry_id, {
        date: entryDate,
        start_time: startTime,
        end_time: endTime,
        is_next_day: isNextDay,
        notes: notes || undefined,
      });
      setEditModalVisible(false);
      Alert.alert('Éxito', 'Jornada actualizada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la jornada');
    }
  };

  // Delete entry
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

  // Toggle rest day
  const handleToggleRestDay = async (date: string) => {
    try {
      await toggleRestDay(date);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el día de descanso');
    }
  };

  // Delete rest day
  const handleDeleteRestDay = async (restId: string) => {
    try {
      await deleteRestDay(restId);
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar el día de descanso');
    }
  };

  // Open add job modal
  const handleOpenAddJobModal = () => {
    setJobName('');
    setBaseSalary('');
    setHoursPerWeek('');
    setHourlyRate('');
    setStandardStart('16:00');
    setStandardEnd('20:00');
    setJobModalVisible(true);
  };

  // Create new job
  const handleCreateJob = async () => {
    if (!jobName || !baseSalary || !hoursPerWeek || !hourlyRate) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      await createJob({
        name: jobName,
        base_salary: parseFloat(baseSalary),
        hours_per_week: parseInt(hoursPerWeek),
        hourly_rate: parseFloat(hourlyRate),
        standard_start: standardStart,
        standard_end: standardEnd,
      });
      setJobModalVisible(false);
      Alert.alert('Éxito', 'Trabajo añadido correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el trabajo');
    }
  };

  // Check if date is rest day
  const isRestDay = (date: string) => {
    return restDays.some(r => r.date === date);
  };

  // Get entries for a specific date
  const getEntriesForDate = (date: string) => {
    return workEntries.filter(e => e.date === date);
  };

  // Get open entries (without end_time)
  const openEntries = workEntries.filter((e) => !e.end_time);

  // Generate calendar days for current month
  const calendarDays = eachDayOfInterval({
    start: startOfMonth(selectedDate),
    end: endOfMonth(selectedDate),
  });

  // Calculate empty cells at the start (to align with weekday)
  // getDay returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday = 0, so we adjust: (getDay + 6) % 7
  const firstDayOfMonth = startOfMonth(selectedDate);
  const startDayIndex = (getDay(firstDayOfMonth) + 6) % 7; // Convert to Monday-based index
  const emptyDays = Array(startDayIndex).fill(null);

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
          <View>
            <Text style={styles.title}>Control Horario</Text>
            <Text style={styles.subtitle}>{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</Text>
          </View>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setCalendarModalVisible(true)}
          >
            <Ionicons name="calendar" size={22} color={colors.primary} />
          </TouchableOpacity>
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tus Trabajos</Text>
          <TouchableOpacity style={styles.addJobHeaderButton} onPress={handleOpenAddJobModal}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No tienes trabajos configurados</Text>
            <Text style={styles.emptySubtext}>Ve a Ajustes para añadir un trabajo</Text>
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
                <View style={styles.jobButtons}>
                  <TouchableOpacity
                    style={styles.addPastButton}
                    onPress={() => handleAddManualEntry(job)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.addPastText}>Añadir día</Text>
                  </TouchableOpacity>
                  <Button
                    title="Fichar"
                    onPress={() => handleStartEntry(job)}
                    size="small"
                    icon={<Ionicons name="play" size={16} color={colors.white} />}
                  />
                </View>
              </View>
            </View>
          ))
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => handleToggleRestDay(format(new Date(), 'yyyy-MM-dd'))}
          >
            <Ionicons
              name={isRestDay(format(new Date(), 'yyyy-MM-dd')) ? 'bed' : 'bed-outline'}
              size={24}
              color={isRestDay(format(new Date(), 'yyyy-MM-dd')) ? colors.primary : colors.textMuted}
            />
            <Text style={styles.quickActionText}>
              {isRestDay(format(new Date(), 'yyyy-MM-dd')) ? 'Día de descanso' : 'Marcar descanso'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Entries */}
        <Text style={styles.sectionTitle}>Registros del Mes</Text>
        {workEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No hay registros este mes</Text>
          </View>
        ) : (
          workEntries.slice(0, 15).map((entry) => {
            const job = jobs.find((j) => j.job_id === entry.job_id);
            const entryRestDay = isRestDay(entry.date);
            return (
              <TouchableOpacity
                key={entry.entry_id}
                style={[styles.entryCard, entryRestDay && styles.entryCardRest]}
                onPress={() => handleOpenEditModal(entry)}
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
                      {format(parseISO(entry.date), "EEE, d 'de' MMM", { locale: es })}
                    </Text>
                    <Text style={styles.entryTime}>
                      {entry.start_time} {entry.end_time ? `- ${entry.end_time}` : '(en curso)'}
                      {entry.is_next_day && ' (+1)'}
                    </Text>
                    {job && <Text style={styles.entryJob}>{job.name}</Text>}
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

        {/* Rest Days Section */}
        {restDays.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Días de Descanso</Text>
            <View style={styles.restDaysList}>
              {restDays.slice(0, 10).map((restDay) => (
                <TouchableOpacity
                  key={restDay.rest_id}
                  style={styles.restDayChip}
                  onPress={() => handleDeleteRestDay(restDay.rest_id)}
                >
                  <Ionicons name="bed" size={16} color={colors.primary} />
                  <Text style={styles.restDayText}>
                    {format(parseISO(restDay.date), "d MMM", { locale: es })}
                  </Text>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.restDaysHelp}>Toca para eliminar un día de descanso</Text>
          </>
        )}
      </ScrollView>

      {/* New/Manual Entry Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isCompleteEntry ? 'Añadir Jornada' : 'Iniciar Jornada'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedJob && (
              <Text style={styles.modalSubtitle}>{selectedJob.name}</Text>
            )}

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Jornada completa</Text>
                <Text style={styles.switchSubtitle}>Añadir hora de inicio y fin</Text>
              </View>
              <Switch
                value={isCompleteEntry}
                onValueChange={setIsCompleteEntry}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={isCompleteEntry ? colors.primary : colors.textMuted}
              />
            </View>

            <Input
              label="Fecha"
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="2026-03-03"
              icon="calendar"
            />

            <Input
              label="Hora de Inicio"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="16:00"
              icon="time"
            />

            {isCompleteEntry && (
              <>
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
              </>
            )}

            <Input
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Añade notas sobre tu jornada"
              multiline
              numberOfLines={2}
            />

            <Button
              title={isCompleteEntry ? 'Añadir Jornada' : 'Iniciar Jornada'}
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

      {/* Edit Entry Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Jornada</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Fecha"
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="2026-03-03"
              icon="calendar"
            />

            <Input
              label="Hora de Inicio"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="16:00"
              icon="time"
            />

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

            <Input
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Añade notas"
              multiline
              numberOfLines={2}
            />

            <Button
              title="Guardar Cambios"
              onPress={handleUpdateEntry}
              size="large"
              style={styles.modalButton}
            />

            <Button
              title="Eliminar Jornada"
              onPress={() => {
                if (selectedEntry) {
                  handleDeleteEntry(selectedEntry.entry_id);
                  setEditModalVisible(false);
                }
              }}
              variant="danger"
              size="medium"
              style={styles.deleteButton}
            />
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal visible={calendarModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calendario</Text>
              <TouchableOpacity onPress={() => setCalendarModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => setSelectedDate(subDays(startOfMonth(selectedDate), 1))}>
                <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.calendarMonth}>
                {format(selectedDate, 'MMMM yyyy', { locale: es })}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(addDays(endOfMonth(selectedDate), 1))}>
                <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekDays}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
                <Text key={i} style={styles.calendarWeekDay}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {/* Empty cells for alignment */}
              {emptyDays.map((_, index) => (
                <View key={`empty-${index}`} style={styles.calendarDay} />
              ))}
              {/* Actual days */}
              {calendarDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasEntries = getEntriesForDate(dateStr).length > 0;
                const isRest = isRestDay(dateStr);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[
                      styles.calendarDay,
                      isToday && styles.calendarDayToday,
                      hasEntries && styles.calendarDayHasEntry,
                      isRest && styles.calendarDayRest,
                    ]}
                    onPress={() => handleToggleRestDay(dateStr)}
                    onLongPress={() => {
                      if (jobs.length > 0) {
                        handleAddManualEntry(jobs[0], dateStr);
                        setCalendarModalVisible(false);
                      }
                    }}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      isToday && styles.calendarDayTextToday,
                    ]}>
                      {format(day, 'd')}
                    </Text>
                    {hasEntries && <View style={styles.calendarDot} />}
                    {isRest && <Ionicons name="bed" size={10} color={colors.primary} style={styles.calendarRestIcon} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.calendarHelp}>
              Toca para marcar descanso • Mantén pulsado para añadir jornada
            </Text>
          </View>
        </View>
      </Modal>

      {/* Add Job Modal */}
      <Modal visible={jobModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Trabajo</Text>
              <TouchableOpacity onPress={() => setJobModalVisible(false)}>
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
                title="Crear Trabajo"
                onPress={handleCreateJob}
                size="large"
                style={styles.modalButton}
              />
            </ScrollView>
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
    textTransform: 'capitalize',
    marginTop: spacing.xs,
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  jobButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addPastButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  addPastText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    marginVertical: spacing.md,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
  },
  quickActionText: {
    fontSize: 14,
    color: colors.textSecondary,
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
  entryCardRest: {
    opacity: 0.6,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    textTransform: 'capitalize',
  },
  entryTime: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entryJob: {
    fontSize: 12,
    color: colors.textMuted,
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
  restDaysList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  restDayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    gap: spacing.xs,
  },
  restDayText: {
    fontSize: 13,
    color: colors.textSecondary,
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
  emptySubtext: {
    fontSize: 13,
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
    maxHeight: '90%',
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
  deleteButton: {
    marginTop: spacing.sm,
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
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calendarMonth: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDayToday: {
    backgroundColor: colors.primary + '30',
    borderRadius: 8,
  },
  calendarDayHasEntry: {
    backgroundColor: colors.success + '20',
    borderRadius: 8,
  },
  calendarDayRest: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  calendarDayTextToday: {
    fontWeight: '700',
    color: colors.primary,
  },
  calendarDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.success,
  },
  calendarRestIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  calendarHelp: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  addJobHeaderButton: {
    padding: spacing.xs,
  },
  restDaysHelp: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
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
});
