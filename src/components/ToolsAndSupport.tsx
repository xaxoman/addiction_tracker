import React from 'react';
import { NotebookPen, Sparkles, Wind, Zap } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

interface ToolsAndSupportProps {
  onOpenUrgeTracker: () => void;
  onOpenJournal: () => void;
  onOpenBreathing: () => void;
  onOpenMotivation: () => void;
}

const ToolsAndSupport: React.FC<ToolsAndSupportProps> = ({
  onOpenUrgeTracker,
  onOpenJournal,
  onOpenBreathing,
  onOpenMotivation
}) => {
  const { t } = useI18n();

  const tools = [
    { key: 'urge', icon: <Zap size={19} />, title: t('urgeTracker'), desc: t('urgeTrackerDesc'), onSelect: onOpenUrgeTracker },
    { key: 'journal', icon: <NotebookPen size={19} />, title: t('journal'), desc: t('journalDesc'), onSelect: onOpenJournal },
    { key: 'breathing', icon: <Wind size={19} />, title: t('breathing'), desc: t('breathingDesc'), onSelect: onOpenBreathing },
    { key: 'motivation', icon: <Sparkles size={19} />, title: t('motivation'), desc: t('motivationDesc'), onSelect: onOpenMotivation }
  ];

  return (
    <section className="card p-5">
      <h2 className="card-title">{t('toolsAndSupport')}</h2>

      <div className="mt-3 grid grid-cols-4 sm:divide-x sm:divide-sage-100 sm:dark:divide-sage-700">
        {tools.map(tool => (
          <button
            key={tool.key}
            type="button"
            onClick={tool.onSelect}
            className="group flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center
                     sm:flex-row sm:items-start sm:gap-3 sm:text-left sm:px-4
                     hover:bg-sage-50 dark:hover:bg-sage-700/40 transition-colors"
          >
            <span className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center
                           bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300
                           group-hover:bg-brand-100 dark:group-hover:bg-brand-500/25 transition-colors">
              {tool.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-xs sm:text-sm font-semibold text-sage-900 dark:text-white">
                {tool.title}
              </span>
              <span className="hidden sm:block mt-0.5 text-xs leading-snug text-sage-500 dark:text-sage-400">
                {tool.desc}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ToolsAndSupport;
