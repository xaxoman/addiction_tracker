import { DAILY_CHECKIN_TIME_KEY } from '../context/AppSettingsContext';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getFireSlot, getNextOccurrence, RiskWindow } from '../utils/riskWindows';

export const DAILY_CHECKIN_LAST_SENT_KEY = 'dailyCheckInLastSentDate';
const RISK_NUDGE_LAST_SENT_PREFIX = 'riskNudgeLastSent:';
const MILESTONE_ALERT_SENT_PREFIX = 'milestoneAlertSent:';

const DAILY_CHECKIN_NOTIFICATION_ID = 1001;
// Fixed id ranges, so a reschedule can cancel exactly what it previously
// scheduled without touching the other kinds of reminder.
const RISK_NUDGE_ID_BASE = 1100;
const RISK_NUDGE_ID_COUNT = 10;
const MILESTONE_ID_BASE = 1200;
const MILESTONE_ID_COUNT = 10;

// A nudge is only useful before the craving, not during it.
export const RISK_NUDGE_LEAD_MINUTES = 30;

export interface ScheduledMilestone {
  // Stable across reschedules: tracker + milestone + the streak anchor it is
  // measured from, so a relapse invalidates the old alert instead of
  // suppressing the new one.
  key: string;
  at: Date;
  title: string;
  body: string;
}

export interface ReminderOptions {
  dailyEnabled: boolean;
  reminderTime: string;
  dailyTitle: string;
  dailyBody: string;
  riskEnabled: boolean;
  riskWindows: RiskWindow[];
  riskTitle: string;
  riskBody: string;
  milestoneEnabled: boolean;
  milestones: ScheduledMilestone[];
  onTrigger?: () => void;
}

const formatToday = (): string => {
  return new Date().toISOString().slice(0, 10);
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

const shouldSendNow = (reminderTime: string): boolean => {
  const time = parseReminderTime(reminderTime);
  if (!time) {
    return false;
  }

  const now = new Date();
  return now.getHours() === time.hours && now.getMinutes() === time.minutes;
};

const showBrowserNotification = (title: string, body: string, tag: string): void => {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body, tag });
  }
};

// Web nudges are checked minute by minute while the app is open, so each one
// needs a "already sent today" marker keyed by the window it belongs to.
const riskWindowKey = (window: RiskWindow): string => (
  `${RISK_NUDGE_LAST_SENT_PREFIX}${window.weekday}-${window.hour}`
);

const takeIds = (base: number, count: number): { id: number }[] => (
  Array.from({ length: count }, (_, index) => ({ id: base + index }))
);

const scheduleNativeNotifications = async (options: ReminderOptions): Promise<void> => {
  // Always cancel the previous schedule first so time/enable changes are
  // applied idempotently.
  await LocalNotifications.cancel({
    notifications: [
      { id: DAILY_CHECKIN_NOTIFICATION_ID },
      ...takeIds(RISK_NUDGE_ID_BASE, RISK_NUDGE_ID_COUNT),
      ...takeIds(MILESTONE_ID_BASE, MILESTONE_ID_COUNT)
    ]
  });

  const notifications = [];

  const time = options.dailyEnabled ? parseReminderTime(options.reminderTime) : null;
  if (time) {
    const nextTrigger = new Date();
    nextTrigger.setHours(time.hours, time.minutes, 0, 0);

    if (nextTrigger.getTime() <= Date.now()) {
      nextTrigger.setDate(nextTrigger.getDate() + 1);
    }

    notifications.push({
      id: DAILY_CHECKIN_NOTIFICATION_ID,
      title: options.dailyTitle,
      body: options.dailyBody,
      schedule: {
        at: nextTrigger,
        repeats: true,
        every: 'day' as const,
        allowWhileIdle: true
      }
    });
  }

  if (options.riskEnabled) {
    options.riskWindows.slice(0, RISK_NUDGE_ID_COUNT).forEach((window, index) => {
      notifications.push({
        id: RISK_NUDGE_ID_BASE + index,
        title: options.riskTitle,
        body: options.riskBody,
        schedule: {
          at: getNextOccurrence(window, RISK_NUDGE_LEAD_MINUTES),
          repeats: true,
          every: 'week' as const,
          allowWhileIdle: true
        }
      });
    });
  }

  if (options.milestoneEnabled) {
    options.milestones
      .filter(milestone => milestone.at.getTime() > Date.now())
      .slice(0, MILESTONE_ID_COUNT)
      .forEach((milestone, index) => {
        notifications.push({
          id: MILESTONE_ID_BASE + index,
          title: milestone.title,
          body: milestone.body,
          schedule: {
            at: milestone.at,
            allowWhileIdle: true
          }
        });
      });
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
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

export const startReminderScheduler = (options: ReminderOptions): (() => void) => {
  if (Capacitor.isNativePlatform()) {
    void scheduleNativeNotifications(options);
    return () => {
      // No interval is used on native because scheduling is delegated to the OS.
    };
  }

  const sendDaily = () => {
    if (!options.dailyEnabled) {
      return;
    }

    const today = formatToday();
    if (localStorage.getItem(DAILY_CHECKIN_LAST_SENT_KEY) === today) {
      return;
    }

    if (!shouldSendNow(options.reminderTime)) {
      return;
    }

    localStorage.setItem(DAILY_CHECKIN_LAST_SENT_KEY, today);
    localStorage.setItem(DAILY_CHECKIN_TIME_KEY, options.reminderTime);
    showBrowserNotification(options.dailyTitle, options.dailyBody, 'daily-checkin');
    options.onTrigger?.();
  };

  const sendRiskNudges = () => {
    if (!options.riskEnabled) {
      return;
    }

    const now = new Date();
    const today = formatToday();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    options.riskWindows.forEach(window => {
      // The lead time can push a nudge into the previous day, so match against
      // the slot it actually fires in rather than the window itself.
      const slot = getFireSlot(window, RISK_NUDGE_LEAD_MINUTES);
      if (slot.weekday !== now.getDay() || slot.minutes !== nowMinutes) {
        return;
      }

      const key = riskWindowKey(window);
      if (localStorage.getItem(key) === today) {
        return;
      }

      localStorage.setItem(key, today);
      showBrowserNotification(options.riskTitle, options.riskBody, key);
      options.onTrigger?.();
    });
  };

  const sendMilestoneAlerts = () => {
    if (!options.milestoneEnabled) {
      return;
    }

    const now = Date.now();

    options.milestones.forEach(milestone => {
      if (milestone.at.getTime() > now) {
        return;
      }

      // Only fire a milestone the app was open for, not every one the user
      // passed while it was closed: a day-old "you hit 24 hours" is noise.
      if (now - milestone.at.getTime() > 60 * 60 * 1000) {
        return;
      }

      const key = `${MILESTONE_ALERT_SENT_PREFIX}${milestone.key}`;
      if (localStorage.getItem(key)) {
        return;
      }

      localStorage.setItem(key, String(now));
      showBrowserNotification(milestone.title, milestone.body, key);
      options.onTrigger?.();
    });
  };

  const tick = () => {
    sendDaily();
    sendRiskNudges();
    sendMilestoneAlerts();
  };

  tick();
  const intervalId = window.setInterval(tick, 30 * 1000);

  return () => window.clearInterval(intervalId);
};
