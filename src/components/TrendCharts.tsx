import React, { useMemo, useState } from 'react';
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

const formatWeekLabel = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
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
  const [selectedId, setSelectedId] = useState<string | null>(addictions[0]?.id ?? null);

  const selected = addictions.find((addiction) => addiction.id === selectedId) ?? addictions[0];

  const streakPoints = useMemo(() => {
    if (!selected) {
      return [];
    }

    const now = new Date();
    const currentWeek = getWeekStart(now);
    const createdAt = new Date(selected.createdAt);
    const relapses = getRelapseDates(selected);
    const points: Point[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(currentWeek.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      let value = 0;
      if (createdAt <= weekEnd) {
        const past = relapses.filter((d) => d <= weekEnd);
        if (past.length > 0) {
          const latest = past[past.length - 1];
          value = Math.max(0, Math.floor((weekEnd.getTime() - latest.getTime()) / DAY_MS));
        }
      }

      points.push({
        label: formatWeekLabel(weekStart),
        value
      });
    }

    return points;
  }, [selected]);

  const weeklyRelapsePoints = useMemo(() => {
    if (!selected) {
      return [];
    }

    const now = new Date();
    const currentWeek = getWeekStart(now);
    const counts = new Map<string, number>();

    (selected.notes || []).forEach((note) => {
      const date = new Date(note.date);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const weekStart = getWeekStart(date).toISOString().slice(0, 10);
      counts.set(weekStart, (counts.get(weekStart) || 0) + 1);
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
  }, [selected]);

  const dayStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];

    (selected?.notes || []).forEach((note) => {
      const date = new Date(note.date);
      if (!Number.isNaN(date.getTime())) {
        counts[date.getDay()] += 1;
      }
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

    return { best, worst };
  }, [selected, t]);

  if (addictions.length === 0 || !selected) {
    return null;
  }

  const relapseCount = (selected.notes || []).length;
  const currentStreakDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(selected.lastEngaged).getTime()) / DAY_MS)
  );

  const maxStreak = Math.max(1, ...streakPoints.map((point) => point.value));
  const maxWeeklyRelapses = Math.max(1, ...weeklyRelapsePoints.map((point) => point.value));

  const linePoints = streakPoints
    .map((point, index) => {
      const x = (index / (streakPoints.length - 1)) * 100;
      const y = 38 - (point.value / maxStreak) * 34;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-4 mb-4">
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
        role="tablist"
        aria-label={t('selectHabit')}
      >
        {addictions.map((addiction) => {
          const isActive = addiction.id === selected.id;
          return (
            <button
              key={addiction.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedId(addiction.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-500 border-blue-500 text-white dark:bg-blue-600 dark:border-blue-600'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span>{addiction.icon}</span>
              <span>{addiction.name}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('currentStreak')}</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {currentStreakDays} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('days')}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('relapsesRecorded')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{relapseCount}</div>
        </div>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('streakTrend')}</h3>
        <div className="w-full bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">
          <svg viewBox="0 0 100 40" className="w-full h-32" preserveAspectRatio="none">
            <polygon
              fill="currentColor"
              className="text-blue-500"
              fillOpacity="0.1"
              points={`0,40 ${linePoints} 100,40`}
            />
            <polyline
              fill="none"
              stroke="currentColor"
              className="text-blue-500"
              strokeWidth="1.5"
              points={linePoints}
            />
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
            <span>{streakPoints[0]?.label}</span>
            <span>{streakPoints[streakPoints.length - 1]?.label}</span>
          </div>
        </div>
      </section>

      {relapseCount > 0 ? (
        <>
          <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('relapseByWeek')}</h3>
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">
              <div className="grid grid-cols-12 gap-1 h-24 items-end">
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
              <div className="mt-2 flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
                <span>{weeklyRelapsePoints[0]?.label}</span>
                <span>{weeklyRelapsePoints[weeklyRelapsePoints.length - 1]?.label}</span>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('bestWorstDays')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">{t('bestDay')}</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">{dayStats.best?.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{dayStats.best?.value ?? 0} {t('relapses')}</div>
              </div>
              <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 p-3">
                <div className="text-xs font-medium text-rose-700 dark:text-rose-400 mb-1">{t('worstDay')}</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">{dayStats.worst?.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{dayStats.worst?.value ?? 0} {t('relapses')}</div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('noRelapsesYet')}</p>
        </section>
      )}
    </div>
  );
};

export default TrendCharts;
