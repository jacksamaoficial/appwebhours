import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert, Linking } from 'react-native';
import { pushTokensApi } from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  // Initialize notification channel for Android
  async setupNotificationChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily_reminder', {
        name: 'Recordatorios Diarios',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00CED1',
        sound: 'default',
        enableBadge: true,
      });

      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificaciones Generales',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }
  }

  // Request permission and get push token
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on a physical device
      if (!Device.isDevice) {
        console.warn('Push notifications require a physical device');
        return null;
      }

      // Setup notification channel for Android
      await this.setupNotificationChannel();

      // Check existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ||
                        Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn('Project ID not configured for push notifications');
        // For development, we can still get a token
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      this.expoPushToken = tokenData.data;
      console.log('Expo Push Token:', this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Register token with backend
  async registerTokenWithBackend(): Promise<boolean> {
    if (!this.expoPushToken) {
      const token = await this.registerForPushNotifications();
      if (!token) return false;
    }

    try {
      await pushTokensApi.register(
        this.expoPushToken!,
        Platform.OS,
        Device.deviceName || undefined
      );
      console.log('Token registered with backend');
      return true;
    } catch (error) {
      console.error('Error registering token with backend:', error);
      return false;
    }
  }

  // Schedule a local daily reminder
  async scheduleDailyReminder(hour: number = 20, minute: number = 0) {
    try {
      // Cancel existing daily reminders
      await this.cancelDailyReminders();

      // Schedule new reminder
      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '¿Has terminado tu jornada? ⏰',
          body: 'Recuerda registrar tu hora de salida y cualquier gasto del día.',
          data: { type: 'daily_reminder' },
          sound: 'default',
        },
        trigger,
      });

      console.log('Daily reminder scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
      return null;
    }
  }

  // Cancel all daily reminders
  async cancelDailyReminders() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === 'daily_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      console.log('Daily reminders cancelled');
    } catch (error) {
      console.error('Error cancelling daily reminders:', error);
    }
  }

  // Send immediate local notification
  async sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Immediate
      });

      return notificationId;
    } catch (error) {
      console.error('Error sending local notification:', error);
      return null;
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Add notification listeners
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Open notification settings
  openNotificationSettings() {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  // Show permission request with explanation
  async requestPermissionWithExplanation(): Promise<boolean> {
    const isEnabled = await this.areNotificationsEnabled();
    
    if (isEnabled) return true;

    return new Promise((resolve) => {
      Alert.alert(
        'Activar Notificaciones',
        'Recibe recordatorios diarios para registrar tu jornada y gastos. ¿Quieres activar las notificaciones?',
        [
          {
            text: 'No, gracias',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Activar',
            onPress: async () => {
              const token = await this.registerForPushNotifications();
              resolve(token !== null);
            },
          },
        ]
      );
    });
  }

  // Get current push token
  getToken(): string | null {
    return this.expoPushToken;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
