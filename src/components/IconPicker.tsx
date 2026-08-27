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
    <div className="flex flex-wrap gap-2 p-2 bg-sage-100 dark:bg-sage-700 rounded-lg max-h-36 overflow-y-auto">
      {icons.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onSelectIcon(icon)}
          className={`w-10 h-10 flex items-center justify-center text-xl 
                    rounded-lg transition-all duration-200
                    ${selectedIcon === icon 
                      ? 'bg-brand-500 dark:bg-brand-600 text-white scale-110'
                      : 'bg-white dark:bg-sage-600 text-sage-800 dark:text-sage-200 hover:bg-sage-200 dark:hover:bg-sage-500'}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

export default IconPicker;