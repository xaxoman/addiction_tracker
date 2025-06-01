// Export utility for addiction data
import { Addiction } from '../types';

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
  relapseDate?: string;
  relapseTime?: string;
  relapseNote?: string;
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

export const convertAddictionsToExportData = (addictions: Addiction[]): ExportDataRow[] => {
  const exportData: ExportDataRow[] = [];

  addictions.forEach(addiction => {
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
      totalSaved: calculateTotalSaved(addiction)
    };

    // If there are no relapses, add one row with the base data
    if (!addiction.notes || addiction.notes.length === 0) {
      exportData.push({
        ...baseData,
        relapseDate: undefined,
        relapseTime: undefined,
        relapseNote: undefined
      });
    } else {
      // Add one row for each relapse
      addiction.notes.forEach(note => {
        const relapseDate = new Date(note.date);
        exportData.push({
          ...baseData,
          relapseDate: isNaN(relapseDate.getTime()) ? 'Invalid Date' : formatDateForExport(relapseDate),
          relapseTime: isNaN(relapseDate.getTime()) ? 'Invalid Time' : formatTimeForExport(relapseDate),
          relapseNote: note.text || 'No note provided'
        });
      });
    }
  });

  return exportData;
};

export const convertToCSV = (data: ExportDataRow[]): string => {
  if (data.length === 0) return '';

  // Define CSV headers
  const headers = [
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
    'Relapse Date',
    'Relapse Time',
    'Relapse Note'
  ];

  // Convert data to CSV format
  const csvRows = [
    headers.join(','),
    ...data.map(row => [
      `"${row.addictionName}"`,
      `"${row.addictionIcon}"`,
      row.costPerEngagement,
      `"${row.costType}"`,
      `"${row.lastEngaged}"`,
      `"${row.createdAt}"`,
      `"${row.goalType}"`,
      row.goalValue,
      `"${row.goalUnit}"`,
      row.currentStreak,
      row.totalSaved.toFixed(2),
      row.relapseDate ? `"${row.relapseDate}"` : '',
      row.relapseTime ? `"${row.relapseTime}"` : '',
      row.relapseNote ? `"${row.relapseNote.replace(/"/g, '""')}"` : ''
    ].join(','))
  ];

  return csvRows.join('\n');
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

  const headers = [
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
    'Relapse Date',
    'Relapse Time',
    'Relapse Note'
  ];

  const tsvRows = [
    headers.join('\t'),
    ...data.map(row => [
      row.addictionName,
      row.addictionIcon,
      row.costPerEngagement,
      row.costType,
      row.lastEngaged,
      row.createdAt,
      row.goalType,
      row.goalValue,
      row.goalUnit,
      row.currentStreak,
      row.totalSaved.toFixed(2),
      row.relapseDate || '',
      row.relapseTime || '',
      row.relapseNote || ''
    ].join('\t'))
  ];

  return tsvRows.join('\n');
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
