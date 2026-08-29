import React from 'react';
import { TRIGGER_TAGS, TriggerTag } from '../types';
import { useI18n } from '../i18n/useI18n';
import { triggerLabelKey } from '../utils/triggers';

interface TriggerTagPickerProps {
  value: TriggerTag[];
  onChange: (next: TriggerTag[]) => void;
  // The picker is used on the panic screen too, which is dark-on-dark and needs
  // chips that read against a coloured backdrop instead of the card background.
  variant?: 'default' | 'onDark';
  label?: string;
  hint?: string;
  // Set when the surrounding form requires a tag and none has been picked yet.
  error?: string;
}

const TriggerTagPicker: React.FC<TriggerTagPickerProps> = ({
  value,
  onChange,
  variant = 'default',
  label,
  hint,
  error
}) => {
  const { t } = useI18n();

  const toggle = (tag: TriggerTag) => {
    onChange(value.includes(tag) ? value.filter(item => item !== tag) : [...value, tag]);
  };

  const onDark = variant === 'onDark';

  return (
    <div>
      {label !== '' && (
        <label className={`block text-sm font-medium mb-1 ${
          onDark ? 'text-white/80' : 'text-sage-700 dark:text-sage-300'
        }`}>
          {label ?? t('triggers')}
        </label>
      )}
      {hint && (
        <p className={`text-xs mb-2 ${onDark ? 'text-white/60' : 'text-sage-500 dark:text-sage-400'}`}>
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {TRIGGER_TAGS.map(tag => {
          const isSelected = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={isSelected}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isSelected
                  ? onDark
                    ? 'bg-white text-sage-900 border-white'
                    : 'bg-brand-700 border-brand-700 text-white dark:bg-brand-600 dark:border-brand-600'
                  : onDark
                    ? 'bg-white/10 border-white/25 text-white/80 hover:bg-white/20'
                    : 'bg-white border-sage-200 text-sage-700 hover:bg-sage-100 dark:bg-sage-700 dark:border-sage-600 dark:text-sage-200 dark:hover:bg-sage-600'
              }`}
            >
              {t(triggerLabelKey(tag))}
            </button>
          );
        })}
      </div>
      {error && (
        <p className={`mt-1.5 text-xs font-medium ${onDark ? 'text-rose-200' : 'text-rose-600 dark:text-rose-400'}`}>
          {error}
        </p>
      )}
    </div>
  );
};

interface TriggerTagListProps {
  tags?: TriggerTag[];
  className?: string;
}

// Read-only rendering of stored tags, for history entries and summaries.
export const TriggerTagList: React.FC<TriggerTagListProps> = ({ tags, className = '' }) => {
  const { t } = useI18n();

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map(tag => (
        <span
          key={tag}
          className="px-2 py-0.5 rounded-full text-[0.7rem] font-medium
                   bg-sage-200 text-sage-700 dark:bg-sage-600 dark:text-sage-200"
        >
          {t(triggerLabelKey(tag))}
        </span>
      ))}
    </div>
  );
};

export default TriggerTagPicker;
