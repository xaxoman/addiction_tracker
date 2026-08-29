// Export utility for addiction data
import { Addiction, RelapseEntry, TriggerTag, UrgeEntry } from '../types';
import { getUrges, summarizeUrges } from './urgeStats';

export interface ExportDataRow {
  addictionName: string;
  addictionIcon: string;
  costPerEngagement: number;
  costType: string;
  lastEngaged: string;
  createdAt: string;
  goalType: string;
  goalValue: number;
  goalUnit: string;
  currentStreak: number;
  totalSaved: number;
  habitNote: string;
  copingPlans: string;
  urgesResisted: number;
  urgesTotal: number;
  // One row per recorded event. A tracker with no events at all still gets a
  // single row so its settings and totals are not lost from the export.
  eventType: 'urge' | 'relapse' | '';
  eventDate: string;
  eventTime: string;
  eventTriggers: string;
  eventIntensity: string;
  eventHeldSeconds: string;
  eventPrecededBy: string;
  eventLocation: string;
  eventNote: string;
}

export const formatDateForExport = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatTimeForExport = (date: Date): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDateTimeForExport = (date: Date): string => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const calculateCurrentStreak = (lastEngaged: Date): number => {
  const now = new Date();
  const lastEngagedDate = new Date(lastEngaged);
  
  if (isNaN(now.getTime()) || isNaN(lastEngagedDate.getTime())) {
    return 0;
  }
  
  const diffTime = Math.abs(now.getTime() - lastEngagedDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const calculateTotalSaved = (addiction: Addiction): number => {
  if (addiction.costType !== 'money') return 0;
  
  const costValue = typeof addiction.cost === 'number' && !isNaN(addiction.cost) ? addiction.cost : 0;
  const streak = calculateCurrentStreak(addiction.lastEngaged);
  const totalSaved = costValue * streak;
  
  return isNaN(totalSaved) ? 0 : Math.max(0, totalSaved);
};

// Tags are exported as a single pipe-separated cell: a column per tag would
// make the sheet unreadable, and the vocabulary can grow.
const formatTriggers = (triggers?: TriggerTag[]): string => (
  triggers && triggers.length > 0 ? triggers.join(' | ') : ''
);

const formatCopingPlans = (addiction: Addiction): string => (
  (addiction.copingPlans ?? [])
    .filter(plan => plan.cue || plan.action)
    .map(plan => `If ${plan.cue}, I will ${plan.action}`)
    .join(' | ')
);

export const convertAddictionsToExportData = (addictions: Addiction[]): ExportDataRow[] => {
  const exportData: ExportDataRow[] = [];

  addictions.forEach(addiction => {
    const summary = summarizeUrges(addiction);

    const baseData = {
      addictionName: addiction.name,
      addictionIcon: addiction.icon,
      costPerEngagement: typeof addiction.cost === 'number' ? addiction.cost : 0,
      costType: addiction.costType,
      lastEngaged: formatDateTimeForExport(addiction.lastEngaged),
      createdAt: formatDateTimeForExport(addiction.createdAt),
      goalType: addiction.goal?.type || 'N/A',
      goalValue: addiction.goal?.value || 0,
      goalUnit: addiction.goal?.unit || 'N/A',
      currentStreak: calculateCurrentStreak(addiction.lastEngaged),
      totalSaved: calculateTotalSaved(addiction),
      habitNote: addiction.note || '',
      copingPlans: formatCopingPlans(addiction),
      urgesResisted: summary.resisted,
      urgesTotal: summary.total
    };

    const events: { date: Date; row: Partial<ExportDataRow> }[] = [];

    // Urges that ended in a slip are exported as their relapse, so the sheet
    // holds one row per event rather than two for the same moment.
    getUrges(addiction).forEach((urge: UrgeEntry) => {
      if (urge.outcome === 'relapsed') return;
      const date = new Date(urge.date);
      if (isNaN(date.getTime())) return;

      events.push({
        date,
        row: {
          eventType: 'urge',
          eventDate: formatDateForExport(date),
          eventTime: formatTimeForExport(date),
          eventTriggers: formatTriggers(urge.triggers),
          eventIntensity: urge.intensity !== undefined ? String(urge.intensity) : '',
          eventHeldSeconds: urge.secondsHeld !== undefined ? String(urge.secondsHeld) : '',
          eventPrecededBy: '',
          eventLocation: '',
          eventNote: urge.text || ''
        }
      });
    });

    (addiction.notes ?? []).forEach((note: RelapseEntry) => {
      const date = new Date(note.date);
      const isValid = !isNaN(date.getTime());

      events.push({
        date: isValid ? date : new Date(0),
        row: {
          eventType: 'relapse',
          eventDate: isValid ? formatDateForExport(date) : 'Invalid Date',
          eventTime: isValid ? formatTimeForExport(date) : 'Invalid Time',
          eventTriggers: formatTriggers(note.triggers),
          eventIntensity: '',
          eventHeldSeconds: '',
          eventPrecededBy: note.precededBy || '',
          eventLocation: note.location || '',
          eventNote: note.text || ''
        }
      });
    });

    if (events.length === 0) {
      exportData.push({
        ...baseData,
        eventType: '',
        eventDate: '',
        eventTime: '',
        eventTriggers: '',
        eventIntensity: '',
        eventHeldSeconds: '',
        eventPrecededBy: '',
        eventLocation: '',
        eventNote: ''
      });
      return;
    }

    events
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach(event => {
        exportData.push({ ...baseData, ...event.row } as ExportDataRow);
      });
  });

  return exportData;
};

const HEADERS = [
  'Addiction Name',
  'Icon',
  'Cost Per Engagement',
  'Cost Type',
  'Last Engaged',
  'Created At',
  'Goal Type',
  'Goal Value',
  'Goal Unit',
  'Current Streak (Days)',
  'Total Saved',
  'Notes',
  'Coping Plans',
  'Urges Resisted',
  'Urges Total',
  'Event Type',
  'Event Date',
  'Event Time',
  'Triggers',
  'Intensity (1-5)',
  'Held (seconds)',
  'Preceded By',
  'Location',
  'Event Note'
];

// One ordered list of cell values per row, shared by both formats so the CSV
// and TSV exports can never drift out of sync with the header list.
const toCells = (row: ExportDataRow): string[] => [
  row.addictionName,
  row.addictionIcon,
  String(row.costPerEngagement),
  row.costType,
  row.lastEngaged,
  row.createdAt,
  row.goalType,
  String(row.goalValue),
  row.goalUnit,
  String(row.currentStreak),
  row.totalSaved.toFixed(2),
  row.habitNote,
  row.copingPlans,
  String(row.urgesResisted),
  String(row.urgesTotal),
  row.eventType,
  row.eventDate,
  row.eventTime,
  row.eventTriggers,
  row.eventIntensity,
  row.eventHeldSeconds,
  row.eventPrecededBy,
  row.eventLocation,
  row.eventNote
];

const csvCell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

// Notes are free text and can contain tabs or newlines, either of which would
// break a row apart in a tab-separated file.
const tsvCell = (value: string): string => value.replace(/[\t\r\n]+/g, ' ');

export const convertToCSV = (data: ExportDataRow[]): string => {
  if (data.length === 0) return '';

  return [
    HEADERS.map(csvCell).join(','),
    ...data.map(row => toCells(row).map(csvCell).join(','))
  ].join('\n');
};

export const downloadCSV = (csvContent: string, filename: string = 'addiction_tracker_export.csv'): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportAddictionsToCSV = (addictions: Addiction[], filename?: string): void => {
  const exportData = convertAddictionsToExportData(addictions);
  const csvContent = convertToCSV(exportData);
  
  const defaultFilename = `addiction_tracker_export_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename || defaultFilename);
};

// For Excel-like format (TSV - Tab Separated Values)
export const convertToTSV = (data: ExportDataRow[]): string => {
  if (data.length === 0) return '';

  return [
    HEADERS.join('\t'),
    ...data.map(row => toCells(row).map(tsvCell).join('\t'))
  ].join('\n');
};

export const downloadTSV = (tsvContent: string, filename: string = 'addiction_tracker_export.tsv'): void => {
  const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportAddictionsToTSV = (addictions: Addiction[], filename?: string): void => {
  const exportData = convertAddictionsToExportData(addictions);
  const tsvContent = convertToTSV(exportData);
  
  const defaultFilename = `addiction_tracker_export_${new Date().toISOString().split('T')[0]}.tsv`;
  downloadTSV(tsvContent, filename || defaultFilename);
};

export const exportSingleAddictionToCSV = (addiction: Addiction, filename?: string): void => {
  const exportData = convertAddictionsToExportData([addiction]);
  const csvContent = convertToCSV(exportData);
  
  const defaultFilename = `${addiction.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename || defaultFilename);
};

export const exportSingleAddictionToTSV = (addiction: Addiction, filename?: string): void => {
  const exportData = convertAddictionsToExportData([addiction]);
  const tsvContent = convertToTSV(exportData);
  
  const defaultFilename = `${addiction.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.tsv`;
  downloadTSV(tsvContent, filename || defaultFilename);
};
