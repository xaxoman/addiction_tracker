import React from 'react';
import { FollowThrough } from '../types';
import { useI18n } from '../i18n/useI18n';

interface FollowThroughButtonsProps {
  value?: FollowThrough;
  onChange: (value: FollowThrough) => void;
  size?: 'md' | 'sm';
}

const OPTIONS: { value: FollowThrough; key: string; selected: string }[] = [
  { value: 'yes', key: 'outcomeYes', selected: 'bg-brand-700 border-brand-700 text-white dark:bg-brand-600 dark:border-brand-600' },
  { value: 'partly', key: 'outcomePartly', selected: 'bg-amber-500 border-amber-500 text-white' },
  { value: 'no', key: 'outcomeNo', selected: 'bg-rose-500 border-rose-500 text-white' }
];

// "Did it go to plan?" Yes / partly / no, for the daily intention and the
// weekly focus alike.
const FollowThroughButtons: React.FC<FollowThroughButtonsProps> = ({ value, onChange, size = 'md' }) => {
  const { t } = useI18n();

  return (
    <div className="flex gap-2">
      {OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`flex-1 rounded-xl border font-semibold transition-colors ${
            size === 'sm' ? 'py-2 text-sm' : 'py-2.5 text-sm'
          } ${
            value === option.value
              ? option.selected
              : 'bg-white border-sage-200 text-sage-700 hover:bg-sage-100 dark:bg-sage-700 dark:border-sage-600 dark:text-sage-200 dark:hover:bg-sage-600'
          }`}
        >
          {t(option.key)}
        </button>
      ))}
    </div>
  );
};

export default FollowThroughButtons;
