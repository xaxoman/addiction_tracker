import React, { useMemo } from 'react';
import { Check, Compass, Plus, ShieldCheck } from 'lucide-react';
import { Addiction, CopingPlan } from '../types';
import { useI18n } from '../i18n/useI18n';
import { getAlternativeKeys, getNeedInsight, needLabelKey, needPhraseKey } from '../utils/needs';
import { formatPlanStats, getPlanCueText, getPlanStats, getPlans, isStruggling } from '../utils/plans';

interface NeedInsightCardProps {
  addiction: Addiction;
  onAddPlan: (addictionId: string, plan: Omit<CopingPlan, 'id'>) => void;
}

// What the habit is really for, and other ways to get it. Each alternative is
// one tap away from being an if-then plan for the trigger it usually comes with.
export const NeedInsightCard: React.FC<NeedInsightCardProps> = ({ addiction, onAddPlan }) => {
  const { t } = useI18n();
  const insight = useMemo(() => getNeedInsight(addiction), [addiction]);
  const existingActions = new Set(getPlans(addiction).map(plan => plan.action.toLowerCase()));

  return (
    <section className="card p-5">
      <h3 className="card-title mb-3 flex items-center gap-2">
        <Compass size={17} className="text-amber-500" />
        {t('needInsightTitle')}
      </h3>

      {!insight ? (
        <p className="text-sm text-sage-500 dark:text-sage-400">{t('needInsightNoData')}</p>
      ) : (
        <>
          <p className="text-base font-medium text-sage-900 dark:text-white">
            {t('needInsightUsually', { need: t(needPhraseKey(insight.need)) })}
            {insight.trigger && (
              <> {t('needInsightMostlyWith', { trigger: t(`trigger_${insight.trigger}`) })}</>
            )}
          </p>
          <p className="mt-1 text-xs text-sage-500 dark:text-sage-400">
            {t('needInsightCount', { count: insight.count, total: insight.total })}
          </p>

          <h4 className="mt-4 mb-2 text-sm font-medium text-sage-700 dark:text-sage-300">
            {t('needAlternativesTitle', { need: t(needLabelKey(insight.need)) })}
          </h4>
          <ul className="space-y-2">
            {getAlternativeKeys(insight.need).map(key => {
              const action = t(key);
              const isAdded = existingActions.has(action.toLowerCase());
              const triggers = insight.trigger ? [insight.trigger] : undefined;
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5"
                >
                  <span className="text-sm text-sage-900 dark:text-white">{action}</span>
                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={() => onAddPlan(addiction.id, {
                      cue: insight.trigger ? t(`trigger_${insight.trigger}`) : t(needLabelKey(insight.need)),
                      action,
                      triggers
                    })}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold
                             bg-white dark:bg-sage-800 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200
                             hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors
                             disabled:opacity-70 disabled:cursor-default disabled:hover:bg-white dark:disabled:hover:bg-sage-800"
                  >
                    {isAdded ? <Check size={13} /> : <Plus size={13} />}
                    {isAdded ? t('planAdded') : t('addAsPlan')}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};

interface PlanEffectivenessCardProps {
  addiction: Addiction;
}

// "Walking: worked 7 times out of 8." Plans sorted by how often they have
// actually worked, with the ones that keep failing called out.
export const PlanEffectivenessCard: React.FC<PlanEffectivenessCardProps> = ({ addiction }) => {
  const { t } = useI18n();

  const rows = useMemo(() => {
    const stats = getPlanStats(addiction);
    return getPlans(addiction)
      .map(plan => ({ plan, stats: stats.get(plan.id) ?? { used: 0, worked: 0, rate: null } }))
      .sort((a, b) => (
        (b.stats.rate ?? -1) - (a.stats.rate ?? -1) || b.stats.used - a.stats.used
      ));
  }, [addiction]);

  return (
    <section className="card p-5">
      <h3 className="card-title mb-3 flex items-center gap-2">
        <ShieldCheck size={17} className="text-brand-600 dark:text-brand-300" />
        {t('planEffectivenessTitle')}
      </h3>

      {rows.length === 0 ? (
        <p className="text-sm text-sage-500 dark:text-sage-400">{t('planEffectivenessEmpty')}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ plan, stats }) => (
            <li key={plan.id}>
              <div className="text-sm font-medium text-sage-900 dark:text-white break-words">{plan.action}</div>
              <div className="mt-0.5 text-xs text-sage-500 dark:text-sage-400">
                {getPlanCueText(plan, t)}
                {' · '}
                <span className={isStruggling(stats) ? 'font-medium text-rose-600 dark:text-rose-400' : ''}>
                  {formatPlanStats(stats, t)}
                </span>
              </div>
              {stats.used > 0 && (
                <div className="mt-1.5 h-1.5 rounded-full bg-sage-100 dark:bg-sage-700 overflow-hidden flex">
                  <div
                    className="h-full bg-brand-500 dark:bg-brand-400"
                    style={{ width: `${(stats.worked / stats.used) * 100}%` }}
                  />
                  <div
                    className="h-full bg-rose-400 dark:bg-rose-500"
                    style={{ width: `${((stats.used - stats.worked) / stats.used) * 100}%` }}
                  />
                </div>
              )}
              {isStruggling(stats) && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{t('planStrugglingHint')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
