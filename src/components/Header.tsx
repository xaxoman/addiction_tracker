import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { useAddictions } from '../context/AddictionContext';
import SettingsDialog from './SettingsDialog';
import { useI18n } from '../i18n/useI18n';

const Header: React.FC = () => {
  const { addictions } = useAddictions();
  const { t } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 pb-3 flex justify-between items-center mobile-header-spacing">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {t('appTitle')}
          </h1>
          
          <div className="flex items-center gap-3">
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
    </>
  );
};

export default Header;