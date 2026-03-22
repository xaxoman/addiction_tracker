import React from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

interface EmptyStateProps {
  onAdd: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onAdd }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
        <Plus className="w-10 h-10 text-blue-500 dark:text-blue-400" />
      </div>
      
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
        {t('startJourney')}
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 max-w-sm mb-6">
        {t('startJourneyDesc')}
      </p>
      
      <button
        onClick={onAdd}
        className="px-5 py-2.5 bg-blue-500 dark:bg-blue-600 text-white 
                  rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 
                  transition-colors duration-200 font-medium"
      >
        {t('addFirstAddiction')}
      </button>
    </div>
  );
};

export default EmptyState;