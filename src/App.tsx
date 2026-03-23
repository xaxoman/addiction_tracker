import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AddictionProvider, useAddictions } from './context/AddictionContext';
import { AppSettingsProvider, useAppSettings } from './context/AppSettingsContext';
import { Addiction } from './types';
import Header from './components/Header';
import AddAddictionButton from './components/AddAddictionButton';
import AddAddictionDialog from './components/AddAddictionDialog';
import DraggableAddictionList from './components/DraggableAddictionList';
import StatsSection from './components/StatsSection';
import TrendCharts from './components/TrendCharts';
import EmptyState from './components/EmptyState';
import BottomTabBar, { AppTab } from './components/BottomTabBar';
import { capacitorService } from './services/capacitor';
import { safeAreaService } from './services/safeArea';
import { createAutomaticBackupIfDue } from './utils/backup';
import { startDailyCheckInScheduler } from './services/checkInNotifications';
import { useI18n } from './i18n/useI18n';

const AppContent = () => {
  const { addictions, addAddiction, removeAddiction, updateAddiction, resetLastEngaged, reorderAddictions } = useAddictions();
  const { theme } = useTheme();
  const { dailyCheckInEnabled, dailyCheckInTime } = useAppSettings();
  const { t } = useI18n();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddiction, setEditingAddiction] = useState<Addiction | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [autoBackupNotice, setAutoBackupNotice] = useState<string | null>(null);

  const isDarkMode = theme === 'dark';

  // Initialize Capacitor services
  useEffect(() => {
    const initializeApp = async () => {
      await capacitorService.initialize();
      await safeAreaService.initialize();
      
      // Set status bar style based on theme
      await capacitorService.setStatusBarStyle(isDarkMode);
    };

    initializeApp();
  }, []);

  // Update status bar when theme changes
  useEffect(() => {
    capacitorService.setStatusBarStyle(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const stopScheduler = startDailyCheckInScheduler({
      enabled: dailyCheckInEnabled,
      reminderTime: dailyCheckInTime,
      title: t('checkInTitle'),
      body: t('checkInBody'),
      onTrigger: () => {
        capacitorService.vibrate();
      }
    });

    return () => stopScheduler();
  }, [dailyCheckInEnabled, dailyCheckInTime, t]);

  useEffect(() => {
    // Check on mount and whenever user data changes so we can create a daily backup.
    const checkAndCreateDailyBackup = async () => {
      try {
        const result = await createAutomaticBackupIfDue(addictions, theme);
        if (result.created) {
          setAutoBackupNotice(t('autoBackupCreatedPill'));
        }
      } catch (error) {
        console.error('Automatic backup failed:', error);
      }
    };

    checkAndCreateDailyBackup();
    const intervalId = window.setInterval(() => {
      void checkAndCreateDailyBackup();
    }, 60 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [addictions, theme]);

  useEffect(() => {
    if (!autoBackupNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAutoBackupNotice(null);
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoBackupNotice]);

  const handleAddAddiction = async (data: any) => {
    // Provide haptic feedback on native platforms
    await capacitorService.vibrate();
    
    if (editingAddiction) {
      updateAddiction({
        ...editingAddiction,
        ...data
      });
      setEditingAddiction(null);
    } else {
      addAddiction({
        name: data.name,
        icon: data.icon,
        cost: data.cost,
        costType: data.costType,
        lastEngaged: data.lastEngaged,
        goal: data.goal
      });
    }
    setIsDialogOpen(false);
  };

  const handleEdit = (addiction: Addiction) => {
    setEditingAddiction(addiction);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('deleteConfirm'))) {
      // Provide haptic feedback on deletion
      await capacitorService.vibrate();
      removeAddiction(id);
    }
  };

  const handleReset = async (id: string) => {
    // Provide haptic feedback on reset
    await capacitorService.vibrate();
    resetLastEngaged(id, new Date());
  };

  const handleTabChange = async (tab: AppTab) => {
    setActiveTab(tab);
    await capacitorService.vibrate();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-36">
        {activeTab === 'home' && (
          <>
            {addictions.length > 0 ? (
              <>
                <StatsSection addictions={addictions} />
                <DraggableAddictionList
                  addictions={addictions}
                  onReset={handleReset}
                  onReorder={reorderAddictions}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </>
            ) : (
              <EmptyState onAdd={() => setIsDialogOpen(true)} />
            )}
          </>
        )}

        {activeTab === 'trends' && (
          <>
            {addictions.length > 0 ? (
              <TrendCharts addictions={addictions} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('trends')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('noData')}</p>
              </div>
            )}
          </>
        )}
      </main>
      
      {activeTab === 'home' && (
        <AddAddictionButton onClick={() => {
          setEditingAddiction(null);
          setIsDialogOpen(true);
        }} />
      )}

      <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {autoBackupNotice && (
        <div className="fixed left-1/2 bottom-[calc(5rem+var(--safe-area-inset-bottom))] -translate-x-1/2 z-[120] px-3 py-2 rounded-full bg-green-600 text-white shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>{autoBackupNotice}</span>
        </div>
      )}
      
      <AddAddictionDialog 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          setEditingAddiction(null);
        }}
        onAdd={handleAddAddiction}
        editingAddiction={editingAddiction}
      />
    </div>
  );
};

function App() {
  return (
    <AppSettingsProvider>
      <ThemeProvider>
        <AddictionProvider>
          <AppContent />
        </AddictionProvider>
      </ThemeProvider>
    </AppSettingsProvider>
  );
}

export default App;