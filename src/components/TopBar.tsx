import React from 'react';
import { Sprout, User } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

interface TopBarProps {
  onOpenAccount: () => void;
  isSignedIn: boolean;
}

// Mobile chrome only: on large screens the sidebar carries the brand and the
// account entry, so the bar collapses away entirely.
const TopBar: React.FC<TopBarProps> = ({ onOpenAccount, isSignedIn }) => {
  const { t } = useI18n();

  return (
    <header className="lg:hidden sticky top-0 z-30 border-b border-sage-200/70 dark:border-sage-800 bg-sage-50/85 dark:bg-sage-900/85 backdrop-blur-md">
      <div className="px-4 pb-3 flex items-center justify-between mobile-header-spacing">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 flex items-center justify-center">
            <Sprout size={18} />
          </span>
          <span className="text-lg font-semibold text-sage-900 dark:text-white">
            {t('appTitle')}
          </span>
        </div>

        <button
          onClick={onOpenAccount}
          className="relative w-9 h-9 rounded-full border border-sage-200 dark:border-sage-700
                   bg-white dark:bg-sage-800 text-sage-500 dark:text-sage-300
                   flex items-center justify-center hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
          aria-label={t('openAccount')}
        >
          <User size={18} />
          {isSignedIn && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-500 ring-2 ring-sage-50 dark:ring-sage-900" />
          )}
        </button>
      </div>
    </header>
  );
};

export default TopBar;
