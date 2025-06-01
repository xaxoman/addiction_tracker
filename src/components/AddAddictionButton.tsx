import React from 'react';
import { Plus } from 'lucide-react';

interface AddAddictionButtonProps {
  onClick: () => void;
}

const AddAddictionButton: React.FC<AddAddictionButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full 
                bg-blue-500 dark:bg-blue-600 text-white shadow-lg 
                flex items-center justify-center
                transition-all duration-300 hover:bg-blue-600 hover:scale-105 
                active:scale-95 focus:outline-none"
      aria-label="Add addiction"
    >
      <Plus className="w-8 h-8" />
    </button>
  );
};

export default AddAddictionButton;