import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import IconPicker from './IconPicker';
import { Addiction, CopingPlan } from '../types';
import { createCopingPlanId } from '../utils/dataValidation';
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
    note?: string;
    copingPlans?: CopingPlan[];
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
  const [note, setNote] = useState('');
  const [copingPlans, setCopingPlans] = useState<CopingPlan[]>([]);

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
      setNote(editingAddiction.note || '');
      setCopingPlans(editingAddiction.copingPlans ? [...editingAddiction.copingPlans] : []);
    } else {
      setNote('');
      setCopingPlans([]);
    }
  }, [editingAddiction]);

  const addCopingPlan = () => {
    setCopingPlans(prev => [...prev, { id: createCopingPlanId(), cue: '', action: '' }]);
  };

  const updateCopingPlan = (id: string, field: 'cue' | 'action', value: string) => {
    setCopingPlans(prev => prev.map(plan => (plan.id === id ? { ...plan, [field]: value } : plan)));
  };

  const removeCopingPlan = (id: string) => {
    setCopingPlans(prev => prev.filter(plan => plan.id !== id));
  };

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
      },
      note: note.trim(),
      // A half-filled row is a plan the user started and abandoned; keeping it
      // would put a dangling "if ... I will" on the craving screen.
      copingPlans: copingPlans
        .map(plan => ({ ...plan, cue: plan.cue.trim(), action: plan.action.trim() }))
        .filter(plan => plan.cue && plan.action)
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
    setNote('');
    setCopingPlans([]);
    
    onClose();
  };

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-sage-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-sage-900 dark:text-white">
            {editingAddiction ? t('editAddiction') : t('addNewAddiction')}
          </h2>
          <button 
            onClick={onClose}
            className="text-sage-500 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
              {t('addictionName')}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                        bg-white dark:bg-sage-700 text-sage-900 dark:text-white 
                        focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400"
              placeholder="e.g., Smoking, Social Media"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
              {t('chooseIcon')}
            </label>
            <IconPicker selectedIcon={icon} onSelectIcon={setIcon} />
          </div>
          
          <div className="mb-4 grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <label htmlFor="cost" className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
                {t('costPerEngagement')}
              </label>
              <input
                type="number"
                id="cost"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                          bg-white dark:bg-sage-700 text-sage-900 dark:text-white 
                          focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400"
                placeholder="5.00"
                required
              />
            </div>
            
            <div className="col-span-2">
              <label htmlFor="costType" className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
                {t('type')}
              </label>
              <select
                id="costType"
                value={costType}
                onChange={(e) => setCostType(e.target.value as 'money' | 'time' | 'health')}
                className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                          bg-white dark:bg-sage-700 text-sage-900 dark:text-white 
                          focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400"
              >
                <option value="money">{t('money')}</option>
                <option value="time">{t('time')}</option>
                <option value="health">{t('health')}</option>
              </select>
            </div>
          </div>
          
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lastEngaged" className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
                {t('lastEngagedDate')}
              </label>
              <input
                type="date"
                id="lastEngaged"
                value={formatDate(lastEngaged)}
                onChange={(e) => setLastEngaged(new Date(e.target.value))}
                max={formatDate(new Date())}
                className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                          bg-white dark:bg-sage-700 text-sage-900 dark:text-white 
                          focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400"
                required
              />
            </div>
            <div>
              <label htmlFor="lastEngagedTime" className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
                {t('lastEngagedTime')}
              </label>
              <input
                type="time"
                id="lastEngagedTime"
                value={lastEngagedTime}
                onChange={(e) => setLastEngagedTime(e.target.value)}
                className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                          bg-white dark:bg-sage-700 text-sage-900 dark:text-white 
                          focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400"
                required
              />
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
                {t('goalType')}
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as 'time' | 'money')}
                className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                          bg-white dark:bg-sage-700 text-sage-900 dark:text-white 
                          focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400"
              >
                <option value="time">{t('timeGoal')}</option>
                <option value="money">{t('moneyGoal')}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="goalValue" className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
                  {t('goalValue')}
                </label>
                <input
                  type="number"
                  id="goalValue"
                  value={goalValue}
                  onChange={(e) => setGoalValue(e.target.value)}
                  min="1"
                  step="1"
                  className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                            bg-white dark:bg-sage-700 text-sage-900 dark:text-white 
                            focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="goalUnit" className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
                  {t('goalUnit')}
                </label>
                <select
                  id="goalUnit"
                  value={goalUnit}
                  onChange={(e) => setGoalUnit(e.target.value as 'hours' | 'days' | 'weeks' | 'months' | 'dollars')}
                  className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                            bg-white dark:bg-sage-700 text-sage-900 dark:text-white 
                            focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400"
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
          
          <div className="mb-6">
            <label htmlFor="habitNote" className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
              {t('habitNotes')}
            </label>
            <textarea
              id="habitNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('habitNotesPlaceholder')}
              className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                        bg-white dark:bg-sage-700 text-sage-900 dark:text-white 
                        focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400
                        resize-none h-24"
            />
            <p className="mt-1 text-xs text-sage-500 dark:text-sage-400">
              {t('habitNotesHint')}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
              {t('copingPlans')}
            </label>
            <p className="mb-2 text-xs text-sage-500 dark:text-sage-400">
              {t('copingPlansHint')}
            </p>

            <div className="space-y-3">
              {copingPlans.map(plan => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-sage-200 dark:border-sage-600 p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-xs font-semibold text-sage-500 dark:text-sage-400">
                      {t('copingPlanCue')}
                    </span>
                    <input
                      type="text"
                      value={plan.cue}
                      onChange={(e) => updateCopingPlan(plan.id, 'cue', e.target.value)}
                      placeholder={t('copingPlanCuePlaceholder')}
                      className="flex-1 min-w-0 px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                                bg-white dark:bg-sage-700 text-sage-900 dark:text-white text-sm
                                focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-xs font-semibold text-sage-500 dark:text-sage-400">
                      {t('copingPlanAction')}
                    </span>
                    <input
                      type="text"
                      value={plan.action}
                      onChange={(e) => updateCopingPlan(plan.id, 'action', e.target.value)}
                      placeholder={t('copingPlanActionPlaceholder')}
                      className="flex-1 min-w-0 px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl 
                                bg-white dark:bg-sage-700 text-sage-900 dark:text-white text-sm
                                focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeCopingPlan(plan.id)}
                      className="shrink-0 p-2 rounded-lg text-red-600 dark:text-red-400 
                               hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      aria-label={t('removeCopingPlan')}
                      title={t('removeCopingPlan')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addCopingPlan}
              className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                       bg-sage-100 dark:bg-sage-700 text-sage-700 dark:text-sage-200
                       hover:bg-sage-200 dark:hover:bg-sage-600 transition-colors"
            >
              <Plus size={16} />
              {t('addCopingPlan')}
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-sage-200 dark:border-sage-600 text-sage-700 dark:text-sage-200 
                        rounded-xl hover:bg-sage-100 dark:hover:bg-sage-700 
                        transition-colors duration-200"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-700 dark:bg-brand-600 text-white font-semibold
                        rounded-xl hover:bg-brand-800 dark:hover:bg-brand-500 
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