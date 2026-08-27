import React from 'react';
import { Flag, PiggyBank, ShieldCheck } from 'lucide-react';
import { Addiction } from '../types';
import { formatCountdown, getMilestoneState } from '../utils/milestones';
import { getSavedLabel } from '../utils/format';
import { summarizeUrges } from '../utils/urgeStats';
import { useI18n } from '../i18n/useI18n';

interface MilestoneCardProps {
  addiction: Addiction;
}

// The right-hand column of the prototype's overview: what is coming next, and
// what has been banked so far.
const MilestoneCard: React.FC<MilestoneCardProps> = ({ addiction }) => {
  const { t } = useI18n();
  const milestone = getMilestoneState(addiction.lastEngaged);
  const urges = summarizeUrges(addiction);

  return (
    <section className="card p-5 flex flex-col">
      <h2 className="card-title">{t('todaysOverview')}</h2>

      <div className="mt-4">
        <div className="flex items-center gap-2 text-sage-500 dark:text-sage-400">
          <Flag size={16} className="text-brand-600 dark:text-brand-300" />
          <span className="text-sm font-medium">{t('nextMilestone')}</span>
        </div>

        {milestone.next ? (
          <>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-xl font-semibold text-sage-900 dark:text-white">
                {milestone.next.emoji} {t(milestone.next.labelKey)}
              </span>
              <span className="text-xs font-medium text-sage-500 dark:text-sage-400 whitespace-nowrap">
                {milestone.msUntilNext !== undefined && t('milestoneIn', { time: formatCountdown(milestone.msUntilNext) })}
              </span>
            </div>
            <div className="mt-2.5 h-2 rounded-full bg-sage-100 dark:bg-sage-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 dark:bg-brand-400 transition-all duration-500"
                style={{ width: `${Math.round(milestone.progressToNext * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <p className="mt-1.5 text-xl font-semibold text-sage-900 dark:text-white">
            {milestone.latest ? `${milestone.latest.emoji} ${t(milestone.latest.labelKey)}` : '—'}
          </p>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-sage-100 dark:border-sage-700 grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sage-500 dark:text-sage-400">
            <PiggyBank size={15} />
            <span className="text-xs font-medium">{t('totalSaved')}</span>
          </div>
          <div className="mt-1 text-lg font-semibold text-brand-700 dark:text-brand-300 break-words">
            {getSavedLabel(addiction)}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-sage-500 dark:text-sage-400">
            <ShieldCheck size={15} />
            <span className="text-xs font-medium">{t('urgesResisted')}</span>
          </div>
          <div className="mt-1 text-lg font-semibold text-sage-900 dark:text-white">
            {urges.resisted}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MilestoneCard;
