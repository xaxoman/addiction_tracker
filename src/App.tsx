import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AddictionProvider, useAddictions } from './context/AddictionContext';
import { Addiction } from './types';
import Header from './components/Header';
import AddAddictionButton from './components/AddAddictionButton';
import AddAddictionDialog from './components/AddAddictionDialog';
import DraggableAddictionList from './components/DraggableAddictionList';
import StatsSection from './components/StatsSection';
import EmptyState from './components/EmptyState';

const AppContent = () => {
  const { addictions, addAddiction, removeAddiction, updateAddiction, resetLastEngaged, reorderAddictions } = useAddictions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddiction, setEditingAddiction] = useState<Addiction | null>(null);

  const handleAddAddiction = (data: any) => {
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

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this addiction tracker?')) {
      removeAddiction(id);
    }
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
              onReset={resetLastEngaged} 
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