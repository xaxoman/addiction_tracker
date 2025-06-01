import React, { useState } from 'react';
import { Download, FileText, Table, X } from 'lucide-react';
import { Addiction } from '../types';
import { exportAddictionsToCSV, exportAddictionsToTSV } from '../utils/exportData';

interface ExportButtonProps {
  addictions: Addiction[];
}

const ExportButton: React.FC<ExportButtonProps> = ({ addictions }) => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const closeDialog = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowExportDialog(false);
      setIsClosing(false);
    }, 200);
  };

  const handleExport = async (format: 'csv' | 'tsv') => {
    if (addictions.length === 0) {
      alert('No addiction data to export. Please add some addictions first.');
      return;
    }

    setIsExporting(true);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `addiction_tracker_export_${timestamp}.${format}`;
      
      if (format === 'csv') {
        exportAddictionsToCSV(addictions, filename);
      } else {
        exportAddictionsToTSV(addictions, filename);
      }
      
      closeDialog();
      
      // Show success message
      setTimeout(() => {
        alert(`Export successful! Your ${format.toUpperCase()} file has been downloaded.`);
      }, 100);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getTotalRelapses = () => {
    return addictions.reduce((total, addiction) => {
      return total + (addiction.notes?.length || 0);
    }, 0);
  };

  const getDateRange = () => {
    if (addictions.length === 0) return 'No data';
    
    const dates = addictions.map(addiction => new Date(addiction.createdAt));
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const latestDate = new Date();
    
    return `${earliestDate.toLocaleDateString()} - ${latestDate.toLocaleDateString()}`;
  };

  return (
    <>
      <button
        onClick={() => setShowExportDialog(true)}
        disabled={addictions.length === 0}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          addictions.length === 0
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
        }`}
        title={addictions.length === 0 ? 'No data to export' : 'Export addiction data'}
      >
        <Download size={16} />
        <span>Export Data</span>
      </button>

      {showExportDialog && (
        <div 
          className={`fixed inset-0 backdrop-blur-sm transition-all duration-200 ${
            isClosing 
              ? 'bg-transparent' 
              : 'bg-black/60 dark:bg-black/80'
          }`}
          style={{ 
            zIndex: 9999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeDialog();
            }
          }}
        >
          <div 
            className={`bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
              isClosing 
                ? 'opacity-0 scale-95 transform translate-y-2' 
                : 'opacity-100 scale-100 transform translate-y-0 animate-fade-in-up'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Export Your Data
              </h2>
              <button 
                onClick={() => closeDialog()}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                Export Summary
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <p>• {addictions.length} addiction{addictions.length !== 1 ? 's' : ''} tracked</p>
                <p>• {getTotalRelapses()} total relapse{getTotalRelapses() !== 1 ? 's' : ''} recorded</p>
                <p>• Date range: {getDateRange()}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred export format:
              </p>

              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 
                          rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200
                          disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:border-green-300 dark:hover:border-green-600
                          focus:outline-none focus:ring-2 focus:ring-green-500/20"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">CSV Format</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Compatible with Excel, Google Sheets, and most spreadsheet apps
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleExport('tsv')}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 
                          rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200
                          disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600
                          focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Table className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">TSV Format</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Tab-separated format, ideal for data analysis tools
                  </div>
                </div>
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What's included in the export:
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Addiction details (name, icon, cost, type)</li>
                <li>• Progress data (streaks, goals, savings)</li>
                <li>• Complete relapse history with dates, times, and notes</li>
                <li>• Creation and last engagement timestamps</li>
              </ul>
            </div>

            {isExporting && (
              <div className="flex items-center justify-center mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300">Preparing export...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ExportButton;
