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

// A nudge before one risk window, already written for it: which day and hour
// it is about and which plan to use, so the notification says "Friday at 21 is
// usually hard. Your plan: a 10-minute walk" instead of a generic warning.
export interface RiskNudge {
  window: RiskWindow;
  title: string;
  body: string;
  addictionId?: string;
  planId?: string;
}

// What opening a nudge should bring up: the craving screen for that tracker,
// with that plan first.
export interface PlanTarget {
  addictionId?: string;
  planId?: string;
}

export interface ReminderOptions {
  dailyEnabled: boolean;
  reminderTime: string;
  dailyTitle: string;
  dailyBody: string;
  riskEnabled: boolean;
  riskNudges: RiskNudge[];
  // Label of the notification button that opens the plan (native only).
  openPlanLabel: string;
  milestoneEnabled: boolean;
  milestones: ScheduledMilestone[];
  onTrigger?: () => void;
  onOpenPlan?: (target: PlanTarget) => void;
}

const RISK_NUDGE_ACTION_TYPE = 'RISK_NUDGE';
const OPEN_PLAN_ACTION = 'open-plan';

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

const showBrowserNotification = (
  title: string,
  body: string,
  tag: string,
  onClick?: () => void
): void => {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, { body, tag });
    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
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

  if (options.riskEnabled) {
    // Registering again with the current language keeps the button label in step.
    await LocalNotifications.registerActionTypes({
      types: [{
        id: RISK_NUDGE_ACTION_TYPE,
        actions: [{ id: OPEN_PLAN_ACTION, title: options.openPlanLabel, foreground: true }]
      }]
    });
  }

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
    options.riskNudges.slice(0, RISK_NUDGE_ID_COUNT).forEach((nudge, index) => {
      notifications.push({
        id: RISK_NUDGE_ID_BASE + index,
        title: nudge.title,
        body: nudge.body,
        actionTypeId: RISK_NUDGE_ACTION_TYPE,
        extra: { kind: 'risk', addictionId: nudge.addictionId, planId: nudge.planId },
        schedule: {
          at: getNextOccurrence(nudge.window, RISK_NUDGE_LEAD_MINUTES),
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

// Every milestone the app has announced leaves a marker behind. Without a
// sweep those accumulate for the life of the install, so drop the ones old
// enough that the milestone they guard can no longer be re-reached.
const MILESTONE_MARKER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const pruneMilestoneMarkers = (): void => {
  const cutoff = Date.now() - MILESTONE_MARKER_TTL_MS;

  Object.keys(localStorage)
    .filter(key => key.startsWith(MILESTONE_ALERT_SENT_PREFIX))
    .forEach(key => {
      const sentAt = Number(localStorage.getItem(key));
      if (!Number.isFinite(sentAt) || sentAt < cutoff) {
        localStorage.removeItem(key);
      }
    });
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

    options.riskNudges.forEach(nudge => {
      // The lead time can push a nudge into the previous day, so match against
      // the slot it actually fires in rather than the window itself.
      const slot = getFireSlot(nudge.window, RISK_NUDGE_LEAD_MINUTES);
      if (slot.weekday !== now.getDay() || slot.minutes !== nowMinutes) {
        return;
      }

      const key = riskWindowKey(nudge.window);
      if (localStorage.getItem(key) === today) {
        return;
      }

      localStorage.setItem(key, today);
      showBrowserNotification(nudge.title, nudge.body, key, () => {
        options.onOpenPlan?.({ addictionId: nudge.addictionId, planId: nudge.planId });
      });
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

  pruneMilestoneMarkers();
  tick();
  const intervalId = window.setInterval(tick, 30 * 1000);

  return () => window.clearInterval(intervalId);
};

// Tapping a risk nudge, or its "open the plan" button, lands on the craving
// screen with the nudge's plan first. Native only: on the web the click
// handler is attached to the notification itself.
export const listenForPlanOpens = (onOpenPlan: (target: PlanTarget) => void): (() => void) => {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  const handle = LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const extra = notification.extra as { kind?: string; addictionId?: string; planId?: string } | undefined;
    if (extra?.kind === 'risk') {
      onOpenPlan({ addictionId: extra.addictionId, planId: extra.planId });
    }
  });

  return () => {
    void handle.then(listener => listener.remove());
  };
};
