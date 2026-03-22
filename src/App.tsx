import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AddictionProvider, useAddictions } from './context/AddictionContext';
import { Addiction } from './types';
import Header from './components/Header';
import AddAddictionButton from './components/AddAddictionButton';
import AddAddictionDialog from './components/AddAddictionDialog';
import DraggableAddictionList from './components/DraggableAddictionList';
import StatsSection from './components/StatsSection';
import EmptyState from './components/EmptyState';
import { capacitorService } from './services/capacitor';
import { safeAreaService } from './services/safeArea';
import { createAutomaticBackupIfDue } from './utils/backup';

const AppContent = () => {
  const { addictions, addAddiction, removeAddiction, updateAddiction, resetLastEngaged, reorderAddictions } = useAddictions();
  const { theme } = useTheme();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddiction, setEditingAddiction] = useState<Addiction | null>(null);

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
    // Check on mount and whenever user data changes so we can create a daily backup.
    const checkAndCreateDailyBackup = () => {
      try {
        createAutomaticBackupIfDue(addictions, theme);
      } catch (error) {
        console.error('Automatic backup failed:', error);
      }
    };

    checkAndCreateDailyBackup();
    const intervalId = window.setInterval(checkAndCreateDailyBackup, 60 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [addictions, theme]);

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
    if (window.confirm('Are you sure you want to delete this addiction tracker?')) {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-24">
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
      </main>
      
      <AddAddictionButton onClick={() => {
        setEditingAddiction(null);
        setIsDialogOpen(true);
      }} />
      
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
    <ThemeProvider>
      <AddictionProvider>
        <AppContent />
      </AddictionProvider>
    </ThemeProvider>
  );
}

export default App;