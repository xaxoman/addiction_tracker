import { DAILY_CHECKIN_TIME_KEY } from '../context/AppSettingsContext';

export const DAILY_CHECKIN_LAST_SENT_KEY = 'dailyCheckInLastSentDate';

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

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return Notification.requestPermission();
};

export const startDailyCheckInScheduler = (options: DailyCheckInOptions): (() => void) => {
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
