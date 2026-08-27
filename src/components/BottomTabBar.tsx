import React from 'react';
import { BarChart3, Home, Settings, User } from 'lucide-react';
import { AppTab, NavAction } from './navigation';
import { useI18n } from '../i18n/useI18n';

interface BottomTabBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onAction: (action: NavAction) => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange, onAction }) => {
  const { t } = useI18n();

  const items: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onSelect: () => void;
  }> = [
    {
      key: 'home',
      icon: <Home size={20} />,
      label: t('overview'),
      isActive: activeTab === 'home',
      onSelect: () => onTabChange('home')
    },
    {
      key: 'trends',
      icon: <BarChart3 size={20} />,
      label: t('progress'),
      isActive: activeTab === 'trends',
      onSelect: () => onTabChange('trends')
    },
    {
      key: 'settings',
      icon: <Settings size={20} />,
      label: t('settings'),
      isActive: false,
      onSelect: () => onAction('settings')
    },
    {
      key: 'account',
      icon: <User size={20} />,
      label: t('you'),
      isActive: false,
      onSelect: () => onAction('account')
    }
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-sage-200 dark:border-sage-800 bg-white/95 dark:bg-sage-900/95 backdrop-blur-md"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-md grid grid-cols-4 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)]">
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={item.onSelect}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-colors ${
              item.isActive
                ? 'text-brand-700 dark:text-brand-300'
                : 'text-sage-400 dark:text-sage-500 hover:text-sage-600 dark:hover:text-sage-300'
            }`}
            aria-current={item.isActive ? 'page' : undefined}
          >
            {item.icon}
            <span className="text-[0.7rem] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomTabBar;
