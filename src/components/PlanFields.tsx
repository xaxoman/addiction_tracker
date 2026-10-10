import React from 'react';
import { CopingPlan, TriggerTag } from '../types';
import { useI18n } from '../i18n/useI18n';
import { buildCueFromTriggers } from '../utils/plans';

type Variant = 'default' | 'onDark';

interface PlanUsedPickerProps {
  plans: CopingPlan[];
  value?: string;
  onChange: (planId: string | undefined) => void;
  variant?: Variant;
}

// "Did you use a plan?" One tap on a plan's action, or "No". This answer is
// what lets the app say which plans actually work.
export const PlanUsedPicker: React.FC<PlanUsedPickerProps> = ({ plans, value, onChange, variant = 'default' }) => {
  const { t } = useI18n();
  const onDark = variant === 'onDark';

  if (plans.length === 0) {
    return null;
  }

  const chipClass = (isSelected: boolean): string => `px-3 py-1.5 rounded-full text-sm font-medium border transition-colors text-left ${
    isSelected
      ? onDark
        ? 'bg-white text-sage-900 border-white'
        : 'bg-brand-700 border-brand-700 text-white dark:bg-brand-600 dark:border-brand-600'
      : onDark
        ? 'bg-white/10 border-white/25 text-white/80 hover:bg-white/20'
        : 'bg-white border-sage-200 text-sage-700 hover:bg-sage-100 dark:bg-sage-700 dark:border-sage-600 dark:text-sage-200 dark:hover:bg-sage-600'
  }`;

  return (
    <div>
      <label className={`block text-sm font-medium mb-1 ${onDark ? 'text-white/80' : 'text-sage-700 dark:text-sage-300'}`}>
        {t('didYouUsePlan')}
      </label>
      <div className="flex flex-wrap gap-2">
        {plans.map(plan => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onChange(value === plan.id ? undefined : plan.id)}
            aria-pressed={value === plan.id}
            className={chipClass(value === plan.id)}
          >
            {plan.action}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-pressed={value === undefined}
          className={chipClass(value === undefined)}
        >
          {t('noPlanUsed')}
        </button>
      </div>
    </div>
  );
};

interface NextTimePlanFieldProps {
  value: string;
  onChange: (value: string) => void;
  saveAsPlan: boolean;
  onSaveAsPlanChange: (value: boolean) => void;
  triggers: TriggerTag[];
  variant?: Variant;
  error?: string;
}

// The question every relapse ends on. With the toggle on (the default) the
// answer becomes an if-then plan for the triggers of this slip, so the next
// craving in the same situation opens with a decision already made.
export const NextTimePlanField: React.FC<NextTimePlanFieldProps> = ({
  value,
  onChange,
  saveAsPlan,
  onSaveAsPlanChange,
  triggers,
  variant = 'default',
  error
}) => {
  const { t } = useI18n();
  const onDark = variant === 'onDark';
  const cue = buildCueFromTriggers(triggers, t);
  const action = value.trim();

  return (
    <div className={`rounded-2xl p-4 space-y-3 ${
      onDark ? 'bg-white/10 border border-white/20' : 'bg-brand-50 dark:bg-brand-900/25 border border-brand-100 dark:border-brand-800/60'
    }`}>
      <div>
        <label className={`block text-sm font-semibold mb-1 ${onDark ? 'text-white' : 'text-sage-900 dark:text-white'}`}>
          {t('nextTimeQuestion')}
        </label>
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={t('nextTimePlaceholder')}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-xl px-3 py-2 resize-none h-20 focus:ring-2 border ${
            onDark
              ? `bg-white/10 text-white placeholder:text-white/40 ${error ? 'border-rose-300 focus:ring-rose-300' : 'border-white/20 focus:ring-brand-300'}`
              : `bg-white dark:bg-sage-700 text-sage-900 dark:text-white ${error ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500' : 'border-sage-200 dark:border-sage-600 focus:ring-brand-500'}`
          }`}
        />
        {error && (
          <p className={`mt-1 text-xs font-medium ${onDark ? 'text-rose-200' : 'text-rose-600 dark:text-rose-400'}`}>{error}</p>
        )}
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={saveAsPlan}
          onChange={event => onSaveAsPlanChange(event.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-brand-600"
        />
        <span className={`text-sm ${onDark ? 'text-white/85' : 'text-sage-700 dark:text-sage-200'}`}>
          {t('saveAsPlan')}
        </span>
      </label>

      {saveAsPlan && (
        <p className={`text-sm leading-relaxed ${onDark ? 'text-white/70' : 'text-sage-600 dark:text-sage-300'}`}>
          <span className="opacity-70">{t('copingPlanCue')} </span>
          <span className="font-medium">{cue || t('planCuePending')}</span>
          <span className="opacity-70"> {t('copingPlanAction')} </span>
          <span className="font-medium">{action || '…'}</span>
        </p>
      )}
    </div>
  );
};
