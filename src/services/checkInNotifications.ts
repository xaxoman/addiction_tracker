import { DAILY_CHECKIN_TIME_KEY } from '../context/AppSettingsContext';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const DAILY_CHECKIN_LAST_SENT_KEY = 'dailyCheckInLastSentDate';
const DAILY_CHECKIN_NOTIFICATION_ID = 1001;

interface DailyCheckInOptions {
  enabled: boolean;
  reminderTime: string;
  title: string;
  body: string;
  onTrigger?: () => void;
}

const formatToday = (): string => {
  return new Date().toISOString().slice(0, 10);
};

const shouldSendNow = (reminderTime: string): boolean => {
  if (!/^\d{2}:\d{2}$/.test(reminderTime)) {
    return false;
  }

  const [targetHour, targetMinute] = reminderTime.split(':').map(Number);
  const now = new Date();
  return now.getHours() === targetHour && now.getMinutes() === targetMinute;
};

const showBrowserNotification = (title: string, body: string): void => {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body, tag: 'daily-checkin' });
  }
};

const parseReminderTime = (reminderTime: string): { hours: number; minutes: number } | null => {
  if (!/^\d{2}:\d{2}$/.test(reminderTime)) {
    return null;
  }

  const [hours, minutes] = reminderTime.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
};

const scheduleNativeDailyNotification = async (options: DailyCheckInOptions): Promise<void> => {
  // Always cancel previous schedule first so time/enable changes are applied idempotently.
  await LocalNotifications.cancel({
    notifications: [{ id: DAILY_CHECKIN_NOTIFICATION_ID }]
  });

  if (!options.enabled) {
    return;
  }

  const time = parseReminderTime(options.reminderTime);
  if (!time) {
    return;
  }

  const nextTrigger = new Date();
  nextTrigger.setHours(time.hours, time.minutes, 0, 0);

  if (nextTrigger.getTime() <= Date.now()) {
    nextTrigger.setDate(nextTrigger.getDate() + 1);
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_CHECKIN_NOTIFICATION_ID,
        title: options.title,
        body: options.body,
        schedule: {
          at: nextTrigger,
          repeats: true,
          every: 'day',
          allowWhileIdle: true
        }
      }
    ]
  });
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted' ? 'granted' : 'denied';
  }

  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return Notification.requestPermission();
};

export const startDailyCheckInScheduler = (options: DailyCheckInOptions): (() => void) => {
  if (Capacitor.isNativePlatform()) {
    void scheduleNativeDailyNotification(options);
    return () => {
      // No interval is used on native because scheduling is delegated to the OS.
    };
  }

  const tick = () => {
    if (!options.enabled) {
      return;
    }

    const today = formatToday();
    const lastSent = localStorage.getItem(DAILY_CHECKIN_LAST_SENT_KEY);

    if (lastSent === today) {
      return;
    }

    if (!shouldSendNow(options.reminderTime)) {
      return;
    }

    localStorage.setItem(DAILY_CHECKIN_LAST_SENT_KEY, today);
    localStorage.setItem(DAILY_CHECKIN_TIME_KEY, options.reminderTime);
    showBrowserNotification(options.title, options.body);
    options.onTrigger?.();
  };

  tick();
  const intervalId = window.setInterval(tick, 30 * 1000);

  return () => window.clearInterval(intervalId);
};
