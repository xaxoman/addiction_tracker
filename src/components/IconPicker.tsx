import React from 'react';

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onSelectIcon }) => {
  // Common addiction-related emojis
  const icons = [
    '🚬', '🍺', '🍷', '🎮', '📱', '🍔', '🛒', '💊', '💸', 
    '🎰', '🍩', '☕', '🎯', '📺', '🍫', '🧁', '🏎️', '🎭',
    '😡', '🍕', '💄', '👗', '👟', '🛍️', '🎬', '💻', '🎹',
    '🚫', '⚠️', '⏱️', '💯', '🆘', '🔞', '⛔', '🚷'
  ];

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg max-h-36 overflow-y-auto">
      {icons.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onSelectIcon(icon)}
          className={`w-10 h-10 flex items-center justify-center text-xl 
                    rounded-lg transition-all duration-200
                    ${selectedIcon === icon 
                      ? 'bg-blue-500 dark:bg-blue-600 text-white scale-110'
                      : 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500'}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

export default IconPicker;