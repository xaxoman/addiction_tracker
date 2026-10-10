import React from 'react';
import { Plus } from 'lucide-react';
import { Addiction } from '../types';
import { RelapseDetails, UrgeInput } from '../context/AddictionContext';
import DraggableAddictionList from './DraggableAddictionList';
import { useI18n } from '../i18n/useI18n';

interface TrackersScreenProps {
  addictions: Addiction[];
  onAdd: () => void;
  onReset: (id: string, date: Date, details?: RelapseDetails) => void;
  onDeleteRelapse: (id: string, relapseId: string) => void;
  onLogUrge: (id: string, input: UrgeInput) => void;
  onDeleteUrge: (id: string, urgeId: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onEdit: (addiction: Addiction) => void;
  onDelete: (id: string) => void;
}

// Managing the habits themselves: history, editing, export, order. Kept off
// the home screen, which is only about what to do today.
const TrackersScreen: React.FC<TrackersScreenProps> = ({ addictions, onAdd, ...listProps }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-sage-900 dark:text-white">{t('yourTrackers')}</h1>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                   border border-sage-200 dark:border-sage-700 bg-white dark:bg-sage-800
                   text-sage-700 dark:text-sage-200 hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} />
          {t('addTracker')}
        </button>
      </div>

      <DraggableAddictionList addictions={addictions} {...listProps} />
    </div>
  );
};

export default TrackersScreen;
