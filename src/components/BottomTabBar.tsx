import React from 'react';
import { Home, BarChart3 } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

export type AppTab = 'home' | 'trends';

interface BottomTabBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange }) => {
  const { t } = useI18n();

  const tabs: Array<{ key: AppTab; icon: React.ReactNode; label: string }> = [
    { key: 'home', icon: <Home size={20} />, label: t('homeTab') },
    { key: 'trends', icon: <BarChart3 size={20} />, label: t('trendsTab') }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-md grid grid-cols-2 px-2 pb-[max(env(safe-area-inset-bottom),0px)]">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
