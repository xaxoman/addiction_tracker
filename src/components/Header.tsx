import React, { useState } from 'react';
import { Settings, User } from 'lucide-react';
import { useAddictions } from '../context/AddictionContext';
import { useAuth } from '../context/AuthContext';
import SettingsDialog from './SettingsDialog';
import AccountDialog from './AccountDialog';
import { useI18n } from '../i18n/useI18n';

const Header: React.FC = () => {
  const { addictions } = useAddictions();
  const { session } = useAuth();
  const { t } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 pb-3 flex justify-between items-center mobile-header-spacing">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {t('appTitle')}
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAccountOpen(true)}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
                       text-gray-500 dark:text-gray-400 transition-colors"
              aria-label={t('openAccount')}
            >
              <User size={20} />
              {session && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900" />
              )}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
                       text-gray-500 dark:text-gray-400 transition-colors"
              aria-label={t('openSettings')}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        addictions={addictions}
      />

      <AccountDialog
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />
    </>
  );
};

export default Header;
