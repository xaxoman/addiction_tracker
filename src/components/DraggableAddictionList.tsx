import React, { useState, useRef } from 'react';
import { Addiction } from '../types';
import { RelapseDetails, UrgeInput } from '../context/AddictionContext';
import AddictionItem from './AddictionItem';

interface DraggableAddictionListProps {
  addictions: Addiction[];
  onReset: (id: string, date: Date, details?: RelapseDetails) => void;
  onDeleteRelapse: (id: string, relapseId: string) => void;
  onLogUrge: (id: string, input: UrgeInput) => void;
  onDeleteUrge: (id: string, urgeId: string) => void;
  onOpenPanic: (addiction: Addiction) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onEdit: (addiction: Addiction) => void;
  onDelete: (id: string) => void;
}

const DraggableAddictionList: React.FC<DraggableAddictionListProps> = ({ 
  addictions, 
  onReset,
  onDeleteRelapse,
  onLogUrge,
  onDeleteUrge,
  onOpenPanic,
  onReorder,
  onEdit,
  onDelete
}) => {
  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window || navigator.maxTouchPoints > 0
  );
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setDragOverItemIndex(index);
  };

  const handleDrop = () => {
    if (draggedItemIndex !== null && dragOverItemIndex !== null) {
      onReorder(draggedItemIndex, dragOverItemIndex);
    }
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
  };

  if (addictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center p-4">
        <p className="text-sage-500 dark:text-sage-400 mb-2">No addictions tracked yet</p>
        <p className="text-sm text-sage-400 dark:text-sage-500">
          Click the + button below to start tracking
        </p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="space-y-4 pb-24">
      {addictions.map((addiction, index) => (
        <div
          key={addiction.id}
          draggable={!isTouchDevice}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          className={`${
            draggedItemIndex === index 
              ? 'opacity-50 scale-95' 
              : dragOverItemIndex === index 
                ? 'transform translate-y-2 border-2 border-brand-300 dark:border-brand-700 rounded-xl' 
                : ''
          } transition-all duration-200 ${isTouchDevice ? 'touch-auto' : 'cursor-grab active:cursor-grabbing'} touch-manipulation`}
          style={{ touchAction: isTouchDevice ? 'pan-y' : 'auto' }}
        >
          <AddictionItem 
            addiction={addiction} 
            onReset={onReset}
            onDeleteRelapse={onDeleteRelapse}
            onLogUrge={onLogUrge}
            onDeleteUrge={onDeleteUrge}
            onOpenPanic={onOpenPanic}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
};

export default DraggableAddictionList;