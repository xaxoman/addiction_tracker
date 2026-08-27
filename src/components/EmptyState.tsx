import React from 'react';
import { Plus } from 'lucide-react';
import { LeafSprig } from './illustrations';
import { useI18n } from '../i18n/useI18n';

interface EmptyStateProps {
  onAdd: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onAdd }) => {
  const { t } = useI18n();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-800/60
                  bg-brand-50 dark:bg-brand-900/25 px-6 py-14 text-center flex flex-col items-center">
      <LeafSprig className="absolute -bottom-4 -right-4 w-40 h-40 text-brand-200 dark:text-brand-800/60" />

      <div className="relative flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-sage-800 shadow-card flex items-center justify-center mb-5">
          <Plus className="w-8 h-8 text-brand-600 dark:text-brand-300" />
        </div>

        <h2 className="text-xl font-semibold text-sage-900 dark:text-white mb-2">
          {t('startJourney')}
        </h2>

        <p className="text-sage-600 dark:text-sage-300 max-w-sm mb-6">
          {t('startJourneyDesc')}
        </p>

        <button
          onClick={onAdd}
          className="px-5 py-3 bg-brand-700 dark:bg-brand-600 text-white rounded-xl
                    hover:bg-brand-800 dark:hover:bg-brand-500
                    transition-colors duration-200 font-semibold shadow-card"
        >
          {t('addFirstAddiction')}
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
