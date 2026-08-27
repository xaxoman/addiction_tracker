import React, { useMemo, useState } from 'react';
import { Addiction, DailyCheckIn } from '../types';
import { useI18n } from '../i18n/useI18n';
import { formatPercent, getTopTriggers, getUrges, startOfCurrentMonth, summarizeUrges } from '../utils/urgeStats';
import { formatWindowTime, getRiskWindows } from '../utils/riskWindows';
import { triggerLabelKey } from '../utils/triggers';

interface TrendChartsProps {
  addictions: Addiction[];
  checkIns: DailyCheckIn[];
}

interface Point {
  label: string;
  value: number;
}

interface WeeklyPoint {
  label: string;
  resisted: number;
  relapses: number;
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

// Local-date key, so bucketing by week never shifts an evening event into the
// next week the way an ISO/UTC key would.
const weekKey = (date: Date): string => {
  const start = getWeekStart(date);
  return `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
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

const TrendCharts: React.FC<TrendChartsProps> = ({ addictions, checkIns }) => {
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

  // Resisted urges and relapses share the weekly chart: seeing the wins next to
  // the losses is the whole point of recording urges in the first place.
  const weeklyPoints = useMemo<WeeklyPoint[]>(() => {
    if (!selected) {
      return [];
    }

    const currentWeek = getWeekStart(new Date());
    const resistedCounts = new Map<string, number>();
    const relapseCounts = new Map<string, number>();

    getUrges(selected).forEach((urge) => {
      if (urge.outcome !== 'resisted') {
        return;
      }
      const date = new Date(urge.date);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = weekKey(date);
      resistedCounts.set(key, (resistedCounts.get(key) || 0) + 1);
    });

    (selected.notes || []).forEach((note) => {
      const date = new Date(note.date);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = weekKey(date);
      relapseCounts.set(key, (relapseCounts.get(key) || 0) + 1);
    });

    const points: WeeklyPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(currentWeek.getDate() - i * 7);
      const key = weekKey(weekStart);
      points.push({
        label: formatWeekLabel(weekStart),
        resisted: resistedCounts.get(key) || 0,
        relapses: relapseCounts.get(key) || 0
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

  // The daily series is app-wide rather than per habit, so it sits outside the
  // selected-tracker memos. Days with no check-in are kept as gaps: drawing
  // through them would invent data the user never entered.
  const checkInSeries = useMemo(() => {
    const byDay = new Map(checkIns.map(entry => [entry.date, entry]));
    const days: { key: string; label: string; entry?: DailyCheckIn }[] = [];

    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      days.push({ key, label: String(date.getDate()), entry: byDay.get(key) });
    }

    return days;
  }, [checkIns]);

  const monthly = useMemo(
    () => (selected ? summarizeUrges(selected, startOfCurrentMonth()) : null),
    [selected]
  );
  const allTime = useMemo(() => (selected ? summarizeUrges(selected) : null), [selected]);
  const topTriggers = useMemo(() => (selected ? getTopTriggers(selected, { limit: 4 }) : []), [selected]);
  const riskWindows = useMemo(() => (selected ? getRiskWindows([selected], { limit: 3 }) : []), [selected]);

  if (addictions.length === 0 || !selected || !monthly || !allTime) {
    return null;
  }

  const relapseCount = (selected.notes || []).length;
  const currentStreakDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(selected.lastEngaged).getTime()) / DAY_MS)
  );

  const maxStreak = Math.max(1, ...streakPoints.map((point) => point.value));
  const maxWeeklyEvents = Math.max(1, ...weeklyPoints.map((point) => point.resisted + point.relapses));
  const hasWeeklyEvents = weeklyPoints.some((point) => point.resisted + point.relapses > 0);

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
                  ? 'bg-brand-700 border-brand-700 text-white dark:bg-brand-600 dark:border-brand-600'
                  : 'bg-white border-sage-200 text-sage-700 hover:bg-sage-100 dark:bg-sage-800 dark:border-sage-700 dark:text-sage-300 dark:hover:bg-sage-700'
              }`}
            >
              <span>{addiction.icon}</span>
              <span>{addiction.name}</span>
            </button>
          );
        })}
      </div>

      {allTime.total > 0 && (
        <section className="rounded-2xl bg-brand-50 dark:bg-brand-900/25 p-5 border border-brand-100 dark:border-brand-800/60">
          <p className="text-base font-medium text-brand-900 dark:text-brand-100">
            {/* A month with nothing in it yet would read as "you beat 0 of 0", so
                fall back to the all-time count until there is something to say. */}
            {monthly.total > 0
              ? t('urgesBeatenThisMonth', { resisted: monthly.resisted, total: monthly.total })
              : t('urgesBeatenAllTime', { resisted: allTime.resisted, total: allTime.total })}
          </p>
        </section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-5">
          <div className="card-label mb-1.5">{t('currentStreak')}</div>
          <div className="text-2xl font-bold text-brand-700 dark:text-brand-300">
            {currentStreakDays} <span className="text-sm font-medium text-sage-500 dark:text-sage-400">{t('days')}</span>
          </div>
        </div>
        <div className="card p-5">
          <div className="card-label mb-1.5">{t('urgesResisted')}</div>
          <div className="text-2xl font-bold text-brand-700 dark:text-brand-300">{allTime.resisted}</div>
        </div>
        <div className="card p-5">
          <div className="card-label mb-1.5">{t('relapsesRecorded')}</div>
          <div className="text-2xl font-bold text-sage-900 dark:text-white">{relapseCount}</div>
        </div>
        <div className="card p-5">
          <div className="card-label mb-1.5">{t('resistedRate')}</div>
          <div className="text-2xl font-bold text-brand-700 dark:text-brand-300">
            {formatPercent(allTime.resistedRate)}
          </div>
        </div>
      </div>

      <section className="card p-5">
        <h3 className="card-title mb-3">{t('checkInTrend')}</h3>
        {checkIns.length === 0 ? (
          <p className="text-sm text-sage-500 dark:text-sage-400">{t('noCheckInsYet')}</p>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-2 text-[11px] text-sage-500 dark:text-sage-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-600 dark:bg-brand-400" />
                {t('moodLabel')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                {t('cravingLabel')}
              </span>
            </div>
            <div className="bg-sage-50 dark:bg-sage-900/40 rounded-xl p-3">
              <div className="grid grid-cols-14 gap-1 h-24 items-end">
                {checkInSeries.map(day => (
                  <div key={day.key} className="flex items-end justify-center gap-0.5 h-full" title={day.key}>
                    {day.entry ? (
                      <>
                        <div
                          className="w-1/2 rounded-t bg-brand-500 dark:bg-brand-400"
                          style={{ height: `${(day.entry.mood / 5) * 100}%` }}
                        />
                        <div
                          className="w-1/2 rounded-t bg-amber-400 dark:bg-amber-500"
                          // A craving score of 0 is a real answer, so it keeps a
                          // sliver of height: a zero-height bar would be
                          // indistinguishable from a day with no check-in.
                          style={{ height: `${Math.max(4, (day.entry.cravingIntensity / 5) * 100)}%` }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-1 rounded bg-sage-200 dark:bg-sage-700" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-sage-500 dark:text-sage-400">
                <span>{checkInSeries[0]?.label}</span>
                <span>{checkInSeries[checkInSeries.length - 1]?.label}</span>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="card p-5">
        <h3 className="card-title mb-3">{t('streakTrend')}</h3>
        <div className="w-full bg-sage-50 dark:bg-sage-900/40 rounded-xl p-3">
          <svg viewBox="0 0 100 40" className="w-full h-32" preserveAspectRatio="none">
            <polygon
              fill="currentColor"
              className="text-brand-500 dark:text-brand-400"
              fillOpacity="0.1"
              points={`0,40 ${linePoints} 100,40`}
            />
            <polyline
              fill="none"
              stroke="currentColor"
              className="text-brand-500 dark:text-brand-400"
              strokeWidth="1.5"
              points={linePoints}
            />
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-sage-500 dark:text-sage-400">
            <span>{streakPoints[0]?.label}</span>
            <span>{streakPoints[streakPoints.length - 1]?.label}</span>
          </div>
        </div>
      </section>

      {hasWeeklyEvents && (
        <section className="card p-5">
          <h3 className="card-title mb-3">{t('eventsByWeek')}</h3>
          <div className="flex items-center gap-4 mb-2 text-[11px] text-sage-500 dark:text-sage-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-500 dark:bg-brand-400" />
              {t('urgeResisted')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400" />
              {t('legendRelapse')}
            </span>
          </div>
          <div className="bg-sage-50 dark:bg-sage-900/40 rounded-xl p-3">
            <div className="grid grid-cols-12 gap-1 h-24 items-end">
              {weeklyPoints.map((point) => (
                <div key={point.label} className="flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-t bg-brand-400 dark:bg-brand-500"
                    style={{ height: `${(point.resisted / maxWeeklyEvents) * 100}%` }}
                    title={`${point.label}: ${point.resisted} ${t('urgeResisted')}`}
                  />
                  <div
                    className="w-full bg-rose-400 dark:bg-rose-500"
                    style={{ height: `${(point.relapses / maxWeeklyEvents) * 100}%` }}
                    title={`${point.label}: ${point.relapses} ${t('relapses')}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-sage-500 dark:text-sage-400">
              <span>{weeklyPoints[0]?.label}</span>
              <span>{weeklyPoints[weeklyPoints.length - 1]?.label}</span>
            </div>
          </div>
        </section>
      )}

      <section className="card p-5">
        <h3 className="card-title mb-3">{t('topTriggers')}</h3>
        {topTriggers.length === 0 ? (
          <p className="text-sm text-sage-500 dark:text-sage-400">{t('noTriggerData')}</p>
        ) : (
          <ul className="space-y-2">
            {topTriggers.map((trigger) => (
              <li key={trigger.tag} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-sage-900 dark:text-white">
                    {t(triggerLabelKey(trigger.tag))}
                  </div>
                  <div className="text-xs text-sage-500 dark:text-sage-400">
                    {t('triggerSlipShare', { slips: trigger.slips, total: trigger.total })}
                  </div>
                </div>
                <div className="w-24 shrink-0 h-2 rounded-full bg-sage-100 dark:bg-sage-700 overflow-hidden flex">
                  <div
                    className="h-full bg-rose-400 dark:bg-rose-500"
                    style={{ width: `${(trigger.slips / trigger.total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-brand-400 dark:bg-brand-500"
                    style={{ width: `${((trigger.total - trigger.slips) / trigger.total) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h3 className="card-title mb-3">{t('riskyWindows')}</h3>
        {riskWindows.length === 0 ? (
          <p className="text-sm text-sage-500 dark:text-sage-400">{t('riskNudgesNoData')}</p>
        ) : (
          <ul className="space-y-2">
            {riskWindows.map((window) => (
              <li
                key={`${window.weekday}-${window.hour}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-sage-900 dark:text-white">
                  {getWeekdayLabel(window.weekday, t)}
                </span>
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                  {formatWindowTime(window)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {relapseCount > 0 ? (
        <section className="card p-5">
          <h3 className="card-title mb-3">{t('bestWorstDays')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-50 dark:bg-brand-900/25 p-3">
              <div className="text-xs font-medium text-brand-700 dark:text-brand-400 mb-1">{t('bestDay')}</div>
              <div className="text-base font-semibold text-sage-900 dark:text-white">{dayStats.best?.label}</div>
              <div className="text-xs text-sage-500 dark:text-sage-400">{dayStats.best?.value ?? 0} {t('relapses')}</div>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-900/25 p-3">
              <div className="text-xs font-medium text-rose-700 dark:text-rose-400 mb-1">{t('worstDay')}</div>
              <div className="text-base font-semibold text-sage-900 dark:text-white">{dayStats.worst?.label}</div>
              <div className="text-xs text-sage-500 dark:text-sage-400">{dayStats.worst?.value ?? 0} {t('relapses')}</div>
            </div>
          </div>
        </section>
      ) : (
        <section className="card p-6 text-center">
          <p className="text-sm text-sage-600 dark:text-sage-400">{t('noRelapsesYet')}</p>
        </section>
      )}
    </div>
  );
};

export default TrendCharts;
