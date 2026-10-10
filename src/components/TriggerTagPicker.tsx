import React from 'react';
import { NEED_TAGS, NeedTag, TRIGGER_TAGS, TriggerTag } from '../types';
import { useI18n } from '../i18n/useI18n';
import { triggerLabelKey } from '../utils/triggers';
import { needLabelKey } from '../utils/needs';

interface ChipPickerProps<T extends string> {
  options: readonly T[];
  labelKey: (tag: T) => string;
  value: T[];
  onChange: (next: T[]) => void;
  // The picker is used on the panic screen too, which is dark-on-dark and needs
  // chips that read against a coloured backdrop instead of the card background.
  variant?: 'default' | 'onDark';
  size?: 'md' | 'sm';
  label?: string;
  hint?: string;
  // Set when the surrounding form requires a tag and none has been picked yet.
  error?: string;
}

const ChipPicker = <T extends string>({
  options,
  labelKey,
  value,
  onChange,
  variant = 'default',
  size = 'md',
  label,
  hint,
  error
}: ChipPickerProps<T>) => {
  const { t } = useI18n();

  const toggle = (tag: T) => {
    onChange(value.includes(tag) ? value.filter(item => item !== tag) : [...value, tag]);
  };

  const onDark = variant === 'onDark';

  return (
    <div>
      {label && (
        <label className={`block text-sm font-medium mb-1 ${
          onDark ? 'text-white/80' : 'text-sage-700 dark:text-sage-300'
        }`}>
          {label}
        </label>
      )}
      {hint && (
        <p className={`text-xs mb-2 ${onDark ? 'text-white/60' : 'text-sage-500 dark:text-sage-400'}`}>
          {hint}
        </p>
      )}
      <div className={`flex flex-wrap ${size === 'sm' ? 'gap-1.5' : 'gap-2'}`}>
        {options.map(tag => {
          const isSelected = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={isSelected}
              className={`rounded-full font-medium border transition-colors ${
                size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
              } ${
                isSelected
                  ? onDark
                    ? 'bg-white text-sage-900 border-white'
                    : 'bg-brand-700 border-brand-700 text-white dark:bg-brand-600 dark:border-brand-600'
                  : onDark
                    ? 'bg-white/10 border-white/25 text-white/80 hover:bg-white/20'
                    : 'bg-white border-sage-200 text-sage-700 hover:bg-sage-100 dark:bg-sage-700 dark:border-sage-600 dark:text-sage-200 dark:hover:bg-sage-600'
              }`}
            >
              {t(labelKey(tag))}
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

type TagPickerProps<T extends string> = Omit<ChipPickerProps<T>, 'options' | 'labelKey'>;

const TriggerTagPicker: React.FC<TagPickerProps<TriggerTag>> = ({ label, ...props }) => {
  const { t } = useI18n();
  // An explicit empty label hides it, for pickers that sit under their own heading.
  return (
    <ChipPicker
      options={TRIGGER_TAGS}
      labelKey={triggerLabelKey}
      label={label ?? t('triggers')}
      {...props}
    />
  );
};

// "What were you looking for?": the function the habit served, as opposed to
// the situation it happened in.
export const NeedTagPicker: React.FC<TagPickerProps<NeedTag>> = ({ label, hint, ...props }) => {
  const { t } = useI18n();
  return (
    <ChipPicker
      options={NEED_TAGS}
      labelKey={needLabelKey}
      label={label ?? t('needsQuestion')}
      hint={hint ?? t('needsHint')}
      {...props}
    />
  );
};

interface TagListProps<T extends string> {
  tags?: T[];
  className?: string;
}

const ChipList = <T extends string>({
  tags,
  className = '',
  labelKey,
  tone
}: TagListProps<T> & { labelKey: (tag: T) => string; tone: 'sage' | 'amber' }) => {
  const { t } = useI18n();

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map(tag => (
        <span
          key={tag}
          className={`px-2 py-0.5 rounded-full text-[0.7rem] font-medium ${
            tone === 'amber'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-sage-200 text-sage-700 dark:bg-sage-600 dark:text-sage-200'
          }`}
        >
          {t(labelKey(tag))}
        </span>
      ))}
    </div>
  );
};

// Read-only rendering of stored tags, for history entries and summaries.
export const TriggerTagList: React.FC<TagListProps<TriggerTag>> = props => (
  <ChipList {...props} labelKey={triggerLabelKey} tone="sage" />
);

export const NeedTagList: React.FC<TagListProps<NeedTag>> = props => (
  <ChipList {...props} labelKey={needLabelKey} tone="amber" />
);

export default TriggerTagPicker;
