import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAddictions } from '../context/AddictionContext';
import ExportButton from './ExportButton';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { addictions } = useAddictions();

  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          Break Free
        </h1>
        
        <div className="flex items-center gap-3">
          <ExportButton addictions={addictions} />
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 
                     text-gray-500 dark:text-gray-400 transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon size={20} />
            ) : (
              <Sun size={20} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;