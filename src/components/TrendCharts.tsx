import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Addiction, CopingPlan, DailyCheckIn } from '../types';
import { NeedInsightCard, PlanEffectivenessCard } from './InsightCards';
import ProgressChartCard from './ProgressChartCard';
import { useI18n } from '../i18n/useI18n';
import { formatPercent, getTopTriggers, getUrges, summarizeUrges } from '../utils/urgeStats';
import { formatWindowTime, getRiskWindows } from '../utils/riskWindows';
import { triggerLabelKey } from '../utils/triggers';
import { getStreakStats } from '../utils/streaks';
import { getSavedLabel } from '../utils/format';
import { exportAddictionsToCSV } from '../utils/exportData';
import { WEEKDAY_KEYS } from '../utils/weeklyReview';

interface TrendChartsProps {
  addictions: Addiction[];
  checkIns: DailyCheckIn[];
  onAddPlan: (addictionId: string, plan: Omit<CopingPlan, 'id'>) => void;
}

interface WeeklyPoint {
  label: string;
  resisted: number;
  relapses: number;
}

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
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

// The Progress tab reads top-down as: where you are, what your log has taught
// you (and what to do about it), then the longer-term charts.
const TrendCharts: React.FC<TrendChartsProps> = ({ addictions, checkIns, onAddPlan }) => {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(addictions[0]?.id ?? null);

  const selected = addictions.find((addiction) => addiction.id === selectedId) ?? addictions[0];

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
      const date = new Date(urge.date);
      if (urge.outcome !== 'resisted' || Number.isNaN(date.getTime())) return;
      const key = weekKey(date);
      resistedCounts.set(key, (resistedCounts.get(key) || 0) + 1);
    });

    (selected.notes || []).forEach((note) => {
      const date = new Date(note.date);
      if (Number.isNaN(date.getTime())) return;
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

  // The daily series is app-wide rather than per habit. Days with no check-in
  // are kept as gaps: drawing through them would invent data.
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

  const allTime = useMemo(() => (selected ? summarizeUrges(selected) : null), [selected]);
  const topTriggers = useMemo(() => (selected ? getTopTriggers(selected, { limit: 4 }) : []), [selected]);
  const riskWindows = useMemo(() => (selected ? getRiskWindows([selected], { limit: 3 }) : []), [selected]);

  if (!selected || !allTime) {
    return null;
  }

  const streak = getStreakStats(selected);
  const maxWeeklyEvents = Math.max(1, ...weeklyPoints.map((point) => point.resisted + point.relapses));
  const hasWeeklyEvents = weeklyPoints.some((point) => point.resisted + point.relapses > 0);
  const hasCheckIns = checkInSeries.some(day => day.entry);

  const summary = [
    { key: 'streak', label: t('currentStreak'), value: `${streak.current} ${t('days')}` },
    { key: 'best', label: t('bestStreak'), value: `${streak.best} ${t('days')}` },
    {
      key: 'urges',
      label: t('urgesResisted'),
      value: allTime.total > 0 ? `${allTime.resisted}/${allTime.total} · ${formatPercent(allTime.resistedRate)}` : '—'
    },
    { key: 'saved', label: t('totalSaved'), value: getSavedLabel(selected) }
  ];

  const handleExport = () => {
    try {
      exportAddictionsToCSV(addictions);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('exportFailed'));
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold text-sage-900 dark:text-white">{t('progress')}</h1>

      {addictions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0" role="tablist" aria-label={t('selectHabit')}>
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
      )}

      <section className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summary.map(item => (
          <div key={item.key} className="min-w-0">
            <div className="card-label mb-1">{item.label}</div>
            <div className="text-lg font-semibold text-sage-900 dark:text-white truncate">{item.value}</div>
          </div>
        ))}
      </section>

      <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-sage-500 dark:text-sage-400">
        {t('whatYouLearned')}
      </h2>

      <NeedInsightCard addiction={selected} onAddPlan={onAddPlan} />

      <PlanEffectivenessCard addiction={selected} />

      <section className="card p-5">
        <h3 className="card-title mb-3">{t('whenAndWhy')}</h3>
        {topTriggers.length === 0 && riskWindows.length === 0 ? (
          <p className="text-sm text-sage-500 dark:text-sage-400">{t('noTriggerData')}</p>
        ) : (
          <div className="space-y-4">
            {topTriggers.length > 0 && (
              <ul className="space-y-2.5">
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
                      <div className="h-full bg-rose-400 dark:bg-rose-500" style={{ width: `${(trigger.slips / trigger.total) * 100}%` }} />
                      <div className="h-full bg-brand-400 dark:bg-brand-500" style={{ width: `${((trigger.total - trigger.slips) / trigger.total) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {riskWindows.length > 0 && (
              <div>
                <div className="card-label mb-1.5">{t('riskyWindows')}</div>
                <div className="flex flex-wrap gap-2">
                  {riskWindows.map((window) => (
                    <span
                      key={`${window.weekday}-${window.hour}`}
                      className="px-3 py-1.5 rounded-full text-sm font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/25 dark:text-amber-200"
                    >
                      {t(WEEKDAY_KEYS[window.weekday])} {formatWindowTime(window)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-sage-500 dark:text-sage-400">
        {t('overTime')}
      </h2>

      <ProgressChartCard addiction={selected} />

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

      {hasCheckIns && (
        <section className="card p-5">
          <h3 className="card-title mb-3">{t('checkInTrend')}</h3>
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
        </section>
      )}

      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-sage-500 hover:text-sage-800 hover:bg-sage-100 dark:text-sage-400 dark:hover:text-sage-200 dark:hover:bg-sage-800 transition-colors"
        >
          <Download size={15} />
          {t('exportAllCsv')}
        </button>
      </div>
    </div>
  );
};

export default TrendCharts;
