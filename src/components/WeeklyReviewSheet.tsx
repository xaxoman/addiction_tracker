import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { Addiction, CopingPlan, DailyCheckIn, DailyIntention, FollowThrough, WeeklyReview } from '../types';
import { ReviewInput } from '../context/CheckInContext';
import { useI18n } from '../i18n/useI18n';
import { buildFocusSuggestions, FocusSuggestion, summarizeWeek } from '../utils/weeklyReview';
import { formatPercent } from '../utils/urgeStats';
import { buildCueFromTriggers } from '../utils/plans';
import { needPhraseKey } from '../utils/needs';
import FollowThroughButtons from './FollowThroughButtons';

interface WeeklyReviewSheetProps {
  addictions: Addiction[];
  focusAddictionId?: string;
  checkIns: DailyCheckIn[];
  intentions: DailyIntention[];
  latestReview: WeeklyReview | null;
  onSave: (review: ReviewInput, plan?: { addictionId: string; plan: Omit<CopingPlan, 'id'> }) => void;
  onClose: () => void;
}

type Step = 'previous' | 'summary' | 'choose';

const CUSTOM = 'custom';

// Three minutes, three screens: how last week's focus went, what the week
// looked like, and the one thing to change next. The choice becomes the focus
// shown on the home screen until the next review.
const WeeklyReviewSheet: React.FC<WeeklyReviewSheetProps> = ({
  addictions,
  focusAddictionId,
  checkIns,
  intentions,
  latestReview,
  onSave,
  onClose
}) => {
  const { t } = useI18n();
  const askPrevious = Boolean(latestReview && !latestReview.outcome);
  const [step, setStep] = useState<Step>(askPrevious ? 'previous' : 'summary');
  const [previousOutcome, setPreviousOutcome] = useState<FollowThrough | undefined>(undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [customFocus, setCustomFocus] = useState('');
  const [planAction, setPlanAction] = useState('');

  const summary = useMemo(
    () => summarizeWeek(addictions, checkIns, intentions),
    [addictions, checkIns, intentions]
  );
  const suggestions = useMemo(
    () => buildFocusSuggestions(addictions, summary, focusAddictionId),
    [addictions, summary, focusAddictionId]
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const suggestionText = (suggestion: FocusSuggestion): string => {
    const translated = Object.fromEntries(
      Object.entries(suggestion.translate ?? {}).map(([name, key]) => [name, t(key)])
    );
    return t(suggestion.key, { ...suggestion.params, ...translated });
  };

  const chosen = suggestions.find(suggestion => suggestion.id === selected);
  const needsPlanAction = Boolean(chosen?.plan && !chosen.plan.actionKey);

  const canSave = selected === CUSTOM
    ? customFocus.trim().length > 0
    : Boolean(chosen) && (!needsPlanAction || planAction.trim().length > 0);

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    const addictionId = chosen?.plan?.addictionId ?? focusAddictionId;
    let focus = selected === CUSTOM ? customFocus.trim() : chosen ? suggestionText(chosen) : '';
    let plan: { addictionId: string; plan: Omit<CopingPlan, 'id'> } | undefined;

    if (chosen?.plan) {
      const triggers = chosen.plan.triggers ?? [];
      const cue = triggers.length > 0
        ? buildCueFromTriggers(triggers, t)
        : chosen.plan.cueKey ? t(chosen.plan.cueKey) : '';
      const action = chosen.plan.actionKey ? t(chosen.plan.actionKey) : planAction.trim();
      plan = {
        addictionId: chosen.plan.addictionId,
        plan: { cue, action, triggers: triggers.length > 0 ? triggers : undefined }
      };
      // The focus names the plan itself, so the home screen shows the decision
      // rather than the suggestion that led to it.
      focus = t('focusIfThen', { cue, action });
    }

    onSave({ focus, addictionId, previousOutcome }, plan);
  };

  const stepIndex = (askPrevious ? ['previous', 'summary', 'choose'] : ['summary', 'choose']).indexOf(step);
  const stepCount = askPrevious ? 3 : 2;

  const goBack = () => {
    if (step === 'choose') setStep('summary');
    else if (step === 'summary' && askPrevious) setStep('previous');
    else onClose();
  };

  const stat = (label: string, value: React.ReactNode) => (
    <div className="rounded-xl bg-sage-50 dark:bg-sage-700/50 p-3">
      <div className="text-xs text-sage-500 dark:text-sage-400 mb-1">{label}</div>
      <div className="text-lg font-semibold text-sage-900 dark:text-white">{value}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[150] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('weeklyReviewTitle')}
    >
      <div className="bg-white dark:bg-sage-800 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-xl animate-fade-in-up">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 -ml-2 px-2 py-1.5 rounded-lg text-sm text-sage-500 hover:text-sage-700 hover:bg-sage-100 dark:text-sage-400 dark:hover:text-sage-200 dark:hover:bg-sage-700"
          >
            <ChevronLeft size={18} />
            {t('panicBack')}
          </button>
          <span className="text-xs font-medium text-sage-400">
            {t('stepOf', { step: stepIndex + 1, total: stepCount })}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-sage-500 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-200"
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="text-xl font-semibold text-sage-900 dark:text-white">{t('weeklyReviewTitle')}</h2>

        {step === 'previous' && latestReview && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-sage-500 dark:text-sage-400">{t('previousFocusIntro')}</p>
            <p className="rounded-xl bg-brand-50 dark:bg-brand-900/25 p-4 text-base font-medium text-sage-900 dark:text-white">
              {latestReview.focus}
            </p>
            <p className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('howDidItGo')}</p>
            <FollowThroughButtons value={previousOutcome} onChange={setPreviousOutcome} />
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep('summary')}
                className="px-5 py-2.5 bg-brand-700 dark:bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-800 dark:hover:bg-brand-500"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}

        {step === 'summary' && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-sage-500 dark:text-sage-400">{t('weekSummaryIntro')}</p>

            <div className="grid grid-cols-2 gap-3">
              {stat(t('urgesResisted'), `${summary.urges.resisted}/${summary.urges.total}`)}
              {stat(t('relapses'), summary.urges.slips)}
              {stat(t('resistedRate'), formatPercent(summary.urges.resistedRate))}
              {stat(
                t('intentionsKept'),
                summary.intentionsSet > 0 ? `${summary.intentionsKept}/${summary.intentionsSet}` : '—'
              )}
            </div>

            <ul className="space-y-1.5 text-sm text-sage-700 dark:text-sage-300">
              {summary.cleanDays.map(({ addiction, days }) => (
                <li key={addiction.id}>
                  {addiction.icon} {addiction.name}: {t('cleanDaysOfWeek', { clean: days.clean, total: days.total })}
                </li>
              ))}
              {summary.topTrigger && (
                <li>{t('weekTopTrigger', { trigger: t(`trigger_${summary.topTrigger}`) })}</li>
              )}
              {summary.need && (
                <li>{t('weekTopNeed', { need: t(needPhraseKey(summary.need.need)) })}</li>
              )}
              {summary.bestPlan && (
                <li>
                  {t('weekBestPlan', {
                    action: summary.bestPlan.action,
                    worked: summary.bestPlan.worked,
                    used: summary.bestPlan.used
                  })}
                </li>
              )}
              {summary.averageMood !== null && (
                <li>{t('weekAverageMood', { mood: summary.averageMood.toFixed(1), days: summary.checkInDays })}</li>
              )}
            </ul>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="px-5 py-2.5 bg-brand-700 dark:bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-800 dark:hover:bg-brand-500"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}

        {step === 'choose' && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-sage-500 dark:text-sage-400">{t('chooseOneChange')}</p>

            {suggestions.map(suggestion => {
              const isSelected = selected === suggestion.id;
              return (
                <div key={suggestion.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(suggestion.id)}
                    aria-pressed={isSelected}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-sage-900 dark:text-white'
                        : 'border-sage-200 dark:border-sage-600 text-sage-700 dark:text-sage-200 hover:bg-sage-50 dark:hover:bg-sage-700'
                    }`}
                  >
                    {suggestionText(suggestion)}
                  </button>
                  {isSelected && needsPlanAction && (
                    <div className="mt-2 pl-1">
                      <label className="block text-xs font-medium text-sage-600 dark:text-sage-300 mb-1">
                        {t('copingPlanAction')}
                      </label>
                      <input
                        type="text"
                        value={planAction}
                        onChange={event => setPlanAction(event.target.value)}
                        placeholder={t('copingPlanActionPlaceholder')}
                        className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl bg-white dark:bg-sage-700 text-sage-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div>
              <button
                type="button"
                onClick={() => setSelected(CUSTOM)}
                aria-pressed={selected === CUSTOM}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                  selected === CUSTOM
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-sage-900 dark:text-white'
                    : 'border-dashed border-sage-300 dark:border-sage-600 text-sage-600 dark:text-sage-300 hover:bg-sage-50 dark:hover:bg-sage-700'
                }`}
              >
                {t('writeYourOwnFocus')}
              </button>
              {selected === CUSTOM && (
                <textarea
                  value={customFocus}
                  onChange={event => setCustomFocus(event.target.value)}
                  placeholder={t('customFocusPlaceholder')}
                  autoFocus
                  className="mt-2 w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl bg-white dark:bg-sage-700 text-sage-900 dark:text-white focus:ring-2 focus:ring-brand-500 resize-none h-20"
                />
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="px-5 py-2.5 bg-brand-700 dark:bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-800 dark:hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('setWeeklyFocus')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyReviewSheet;
