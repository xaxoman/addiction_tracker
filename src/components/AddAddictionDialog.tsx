import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import IconPicker from './IconPicker';
import { Addiction } from '../types';
import { useI18n } from '../i18n/useI18n';

interface AddAddictionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { 
    name: string; 
    icon: string; 
    cost: number; 
    costType: 'money' | 'time' | 'health'; 
    lastEngaged: Date;
    goal: {
      type: 'time' | 'money';
      value: number;
      unit?: 'hours' | 'days' | 'weeks' | 'months' | 'dollars';
    };
  }) => void;
  editingAddiction?: Addiction | null;
}

const AddAddictionDialog: React.FC<AddAddictionDialogProps> = ({ 
  isOpen, 
  onClose, 
  onAdd,
  editingAddiction 
}) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🚫');
  const [cost, setCost] = useState('');
  const [costType, setCostType] = useState<'money' | 'time' | 'health'>('money');
  const [lastEngaged, setLastEngaged] = useState<Date>(new Date());
  const [lastEngagedTime, setLastEngagedTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  );
  const [goalType, setGoalType] = useState<'time' | 'money'>('time');
  const [goalValue, setGoalValue] = useState('');
  const [goalUnit, setGoalUnit] = useState<'hours' | 'days' | 'weeks' | 'months' | 'dollars'>('days');

  useEffect(() => {
    if (editingAddiction) {
      setName(editingAddiction.name);
      setIcon(editingAddiction.icon);
      // Ensure cost is properly converted to string
      const costValue = typeof editingAddiction.cost === 'number' && !isNaN(editingAddiction.cost) 
        ? editingAddiction.cost.toString() 
        : '0';
      setCost(costValue);
      setCostType(editingAddiction.costType);
      setLastEngaged(new Date(editingAddiction.lastEngaged));
      setLastEngagedTime(
        new Date(editingAddiction.lastEngaged).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      );
      if (editingAddiction.goal) {
        setGoalType(editingAddiction.goal.type);
        // Ensure goal value is properly converted to string
        const goalValueStr = typeof editingAddiction.goal.value === 'number' && !isNaN(editingAddiction.goal.value)
          ? editingAddiction.goal.value.toString()
          : '1';
        setGoalValue(goalValueStr);
        setGoalUnit(editingAddiction.goal.unit || 'days');
      }
    }
  }, [editingAddiction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !icon || !cost || !goalValue) return;
    
    // Validate and convert numeric values
    const parsedCost = parseFloat(cost);
    const parsedGoalValue = parseFloat(goalValue);
    
    if (isNaN(parsedCost) || isNaN(parsedGoalValue) || parsedCost < 0 || parsedGoalValue < 0) {
      alert(t('invalidNumbers'));
      return;
    }
    
    const [hours, minutes] = lastEngagedTime.split(':').map(Number);
    const lastEngagedDate = new Date(lastEngaged);
    lastEngagedDate.setHours(hours, minutes);
    
    // Validate the date
    if (isNaN(lastEngagedDate.getTime())) {
      alert(t('invalidDateTime'));
      return;
    }
    
    onAdd({
      name,
      icon,
      cost: parsedCost,
      costType,
      lastEngaged: lastEngagedDate,
      goal: {
        type: goalType,
        value: parsedGoalValue,
        unit: goalUnit
      }
    });
    
    setName('');
    setIcon('🚫');
    setCost('');
    setCostType('money');
    setLastEngaged(new Date());
    setLastEngagedTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    setGoalType('time');
    setGoalValue('');
    setGoalUnit('days');
    
    onClose();
  };

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingAddiction ? t('editAddiction') : t('addNewAddiction')}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('addictionName')}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
              placeholder="e.g., Smoking, Social Media"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('chooseIcon')}
            </label>
            <IconPicker selectedIcon={icon} onSelectIcon={setIcon} />
          </div>
          
          <div className="mb-4 grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('costPerEngagement')}
              </label>
              <input
                type="number"
                id="cost"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
                placeholder="5.00"
                required
              />
            </div>
            
            <div className="col-span-2">
              <label htmlFor="costType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('type')}
              </label>
              <select
                id="costType"
                value={costType}
                onChange={(e) => setCostType(e.target.value as 'money' | 'time' | 'health')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
              >
                <option value="money">{t('money')}</option>
                <option value="time">{t('time')}</option>
                <option value="health">{t('health')}</option>
              </select>
            </div>
          </div>
          
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lastEngaged" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('lastEngagedDate')}
              </label>
              <input
                type="date"
                id="lastEngaged"
                value={formatDate(lastEngaged)}
                onChange={(e) => setLastEngaged(new Date(e.target.value))}
                max={formatDate(new Date())}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label htmlFor="lastEngagedTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('lastEngagedTime')}
              </label>
              <input
                type="time"
                id="lastEngagedTime"
                value={lastEngagedTime}
                onChange={(e) => setLastEngagedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('goalType')}
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as 'time' | 'money')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
              >
                <option value="time">{t('timeGoal')}</option>
                <option value="money">{t('moneyGoal')}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="goalValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('goalValue')}
                </label>
                <input
                  type="number"
                  id="goalValue"
                  value={goalValue}
                  onChange={(e) => setGoalValue(e.target.value)}
                  min="1"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="goalUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('goalUnit')}
                </label>
                <select
                  id="goalUnit"
                  value={goalUnit}
                  onChange={(e) => setGoalUnit(e.target.value as 'hours' | 'days' | 'weeks' | 'months' | 'dollars')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
                >
                  {goalType === 'time' ? (
                    <>
                      <option value="hours">{t('hours')}</option>
                      <option value="days">{t('days')}</option>
                      <option value="weeks">{t('weeks')}</option>
                      <option value="months">{t('months')}</option>
                    </>
                  ) : (
                    <option value="dollars">{t('dollars')}</option>
                  )}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                        rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 
                        transition-colors duration-200"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white 
                        rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 
                        transition-colors duration-200"
            >
              {editingAddiction ? t('saveChanges') : t('add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAddictionDialog;