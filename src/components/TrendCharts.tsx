import React, { useMemo } from 'react';
import { Addiction } from '../types';
import { useI18n } from '../i18n/useI18n';

interface TrendChartsProps {
  addictions: Addiction[];
}

interface Point {
  label: string;
  value: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getMonthStart = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatWeekLabel = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
};

const formatMonthLabel = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${month}/${String(date.getFullYear()).slice(-2)}`;
};

const uniqueSortedDates = (dates: Date[]): Date[] => {
  const unique = Array.from(new Set(dates.map((d) => new Date(d).getTime())));
  unique.sort((a, b) => a - b);
  return unique.map((value) => new Date(value));
};

const getRelapseDates = (addiction: Addiction): Date[] => {
  const noteDates = (addiction.notes || []).map((note) => new Date(note.date));
  const lastEngaged = new Date(addiction.lastEngaged);

  const all = [...noteDates, lastEngaged].filter((d) => !Number.isNaN(d.getTime()));
  return uniqueSortedDates(all);
};

const getWeekdayLabel = (index: number, t: (key: string) => string): string => {
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return t(keys[index]);
};

const TrendCharts: React.FC<TrendChartsProps> = ({ addictions }) => {
  const { t } = useI18n();

  const streakPoints = useMemo(() => {
    const now = new Date();
    const currentWeek = getWeekStart(now);
    const points: Point[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(currentWeek.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const streakValues = addictions
        .filter((addiction) => new Date(addiction.createdAt) <= weekEnd)
        .map((addiction) => {
          const relapses = getRelapseDates(addiction).filter((d) => d <= weekEnd);
          if (relapses.length === 0) {
            return 0;
          }

          const latest = relapses[relapses.length - 1];
          return Math.max(0, Math.floor((weekEnd.getTime() - latest.getTime()) / DAY_MS));
        });

      const average = streakValues.length
        ? streakValues.reduce((sum, value) => sum + value, 0) / streakValues.length
        : 0;

      points.push({
        label: formatWeekLabel(weekStart),
        value: Number(average.toFixed(1))
      });
    }

    return points;
  }, [addictions]);

  const weeklyRelapsePoints = useMemo(() => {
    const now = new Date();
    const currentWeek = getWeekStart(now);
    const counts = new Map<string, number>();

    addictions.forEach((addiction) => {
      (addiction.notes || []).forEach((note) => {
        const date = new Date(note.date);
        if (Number.isNaN(date.getTime())) {
          return;
        }

        const weekStart = getWeekStart(date).toISOString().slice(0, 10);
        counts.set(weekStart, (counts.get(weekStart) || 0) + 1);
      });
    });

    const points: Point[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(currentWeek.getDate() - i * 7);
      const key = weekStart.toISOString().slice(0, 10);
      points.push({
        label: formatWeekLabel(weekStart),
        value: counts.get(key) || 0
      });
    }

    return points;
  }, [addictions]);

  const monthlyRelapsePoints = useMemo(() => {
    const now = new Date();
    const currentMonth = getMonthStart(now);
    const counts = new Map<string, number>();

    addictions.forEach((addiction) => {
      (addiction.notes || []).forEach((note) => {
        const date = new Date(note.date);
        if (Number.isNaN(date.getTime())) {
          return;
        }

        const monthStart = getMonthStart(date).toISOString().slice(0, 7);
        counts.set(monthStart, (counts.get(monthStart) || 0) + 1);
      });
    });

    const points: Point[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(currentMonth);
      monthStart.setMonth(currentMonth.getMonth() - i);
      const key = monthStart.toISOString().slice(0, 7);
      points.push({
        label: formatMonthLabel(monthStart),
        value: counts.get(key) || 0
      });
    }

    return points;
  }, [addictions]);

  const dayStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];

    addictions.forEach((addiction) => {
      (addiction.notes || []).forEach((note) => {
        const date = new Date(note.date);
        if (!Number.isNaN(date.getTime())) {
          counts[date.getDay()] += 1;
        }
      });
    });

    const entries = counts.map((value, index) => ({
      dayIndex: index,
      label: getWeekdayLabel(index, t),
      value
    }));

    const minValue = Math.min(...counts);
    const maxValue = Math.max(...counts);

    const best = entries.find((entry) => entry.value === minValue);
    const worst = entries.find((entry) => entry.value === maxValue);

    return { entries, best, worst };
  }, [addictions, t]);

  if (addictions.length === 0) {
    return null;
  }

  const maxStreak = Math.max(1, ...streakPoints.map((point) => point.value));
  const maxWeeklyRelapses = Math.max(1, ...weeklyRelapsePoints.map((point) => point.value));
  const maxDayRelapses = Math.max(1, ...dayStats.entries.map((entry) => entry.value));

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('trends')}</h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('streakTrend')}</h3>
          <div className="w-full h-40 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">
            <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="currentColor"
                className="text-blue-500"
                strokeWidth="1.5"
                points={streakPoints
                  .map((point, index) => {
                    const x = (index / (streakPoints.length - 1)) * 100;
                    const y = 38 - (point.value / maxStreak) * 34;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            </svg>
            <div className="mt-2 flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
              <span>{streakPoints[0]?.label}</span>
              <span>{streakPoints[streakPoints.length - 1]?.label}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('relapseByWeek')}</h3>
          <div className="grid grid-cols-12 gap-1 h-24 items-end bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">
            {weeklyRelapsePoints.map((point) => (
              <div key={point.label} className="flex flex-col items-center justify-end h-full">
                <div
                  className="w-full rounded-t bg-rose-400 dark:bg-rose-500"
                  style={{ height: `${(point.value / maxWeeklyRelapses) * 100}%` }}
                  title={`${point.label}: ${point.value}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('relapseTrend')}</h3>
          <div className="grid grid-cols-6 gap-2">
            {monthlyRelapsePoints.map((point) => (
              <div key={point.label} className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{point.label}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{point.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('bestWorstDays')}</h3>
          <div className="grid grid-cols-7 gap-2 mb-3">
            {dayStats.entries.map((entry) => (
              <div key={entry.dayIndex} className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{entry.label}</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{entry.value}</div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500"
                    style={{ width: `${(entry.value / maxDayRelapses) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>
              {t('bestDay')}: <span className="font-medium">{dayStats.best?.label || t('noData')}</span> ({dayStats.best?.value ?? 0} {t('relapses')})
            </p>
            <p>
              {t('worstDay')}: <span className="font-medium">{dayStats.worst?.label || t('noData')}</span> ({dayStats.worst?.value ?? 0} {t('relapses')})
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrendCharts;
