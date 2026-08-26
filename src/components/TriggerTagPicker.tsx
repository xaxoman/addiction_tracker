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
}

const TriggerTagPicker: React.FC<TriggerTagPickerProps> = ({
  value,
  onChange,
  variant = 'default',
  label,
  hint
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
          onDark ? 'text-white/80' : 'text-gray-700 dark:text-gray-300'
        }`}>
          {label ?? t('triggers')}
        </label>
      )}
      {hint && (
        <p className={`text-xs mb-2 ${onDark ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}>
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
                    ? 'bg-white text-gray-900 border-white'
                    : 'bg-blue-500 border-blue-500 text-white dark:bg-blue-600 dark:border-blue-600'
                  : onDark
                    ? 'bg-white/10 border-white/25 text-white/80 hover:bg-white/20'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t(triggerLabelKey(tag))}
            </button>
          );
        })}
      </div>
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
                   bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
        >
          {t(triggerLabelKey(tag))}
        </span>
      ))}
    </div>
  );
};

export default TriggerTagPicker;
