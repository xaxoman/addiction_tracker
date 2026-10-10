import React from 'react';
import { CalendarCheck, Crosshair } from 'lucide-react';
import { WeeklyReview } from '../types';
import { useI18n } from '../i18n/useI18n';
import { getFocusDay, isReviewDue, REVIEW_INTERVAL_DAYS } from '../utils/weeklyReview';

interface WeeklyFocusCardProps {
  latestReview: WeeklyReview | null;
  onStartReview: () => void;
}

// The one change the user chose for this week, at the top of the home screen.
// Once the week is up the card turns into the prompt for the next review.
const WeeklyFocusCard: React.FC<WeeklyFocusCardProps> = ({ latestReview, onStartReview }) => {
  const { t } = useI18n();
  const isDue = isReviewDue(latestReview);

  if (!latestReview) {
    return (
      <section className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300">
          <CalendarCheck size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-sage-900 dark:text-white">{t('weeklyReviewTitle')}</h2>
          <p className="text-sm text-sage-500 dark:text-sage-400">{t('weeklyReviewPitch')}</p>
        </div>
        <button
          type="button"
          onClick={onStartReview}
          className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500 transition-colors"
        >
          {t('startReview')}
        </button>
      </section>
    );
  }

  const day = getFocusDay(latestReview);

  return (
    <section className="rounded-2xl border border-brand-200 dark:border-brand-800/70 bg-brand-50 dark:bg-brand-900/25 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          <Crosshair size={15} />
          {t('weeklyFocusTitle')}
        </div>
        <span className="text-xs font-medium text-sage-500 dark:text-sage-400">
          {t('focusDayOf', { day, total: REVIEW_INTERVAL_DAYS })}
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold leading-snug text-sage-900 dark:text-white break-words">
        {latestReview.focus}
      </p>

      {isDue && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-sage-800/60 p-3">
          <p className="text-sm text-sage-600 dark:text-sage-300">{t('reviewDuePrompt')}</p>
          <button
            type="button"
            onClick={onStartReview}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500 transition-colors"
          >
            {t('startReview')}
          </button>
        </div>
      )}
    </section>
  );
};

export default WeeklyFocusCard;
