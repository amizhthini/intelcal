import React, { useState, useEffect } from 'react';
import { ExtractedData } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { CalendarIcon, DownloadIcon, InformationCircleIcon, GoogleIcon, TableIcon } from './Icons';
import AttendeesInput from './AttendeesInput';

interface ResultsDisplayProps {
  results: ExtractedData[];
  isLoading: boolean;
  onAddToCalendar: (data: ExtractedData) => void;
  onBulkAddToCalendar: (data: ExtractedData[]) => void;
  onBulkExportToICS: (data: ExtractedData[]) => void;
  isGoogleCalendarConnected: boolean;
  onAddToGoogleCalendar: (data: ExtractedData) => void;
  onBulkAddToGoogleCalendar: (data: ExtractedData[]) => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = (props) => {
  const { results, isLoading, onAddToCalendar, onBulkAddToCalendar, onBulkExportToICS, isGoogleCalendarConnected, onAddToGoogleCalendar, onBulkAddToGoogleCalendar } = props;
  const [editableResults, setEditableResults] = useState<ExtractedData[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setEditableResults(results);
    setSelectedClientIds(new Set()); // Reset selection when results change
  }, [results]);
  
  const handleFieldChange = (clientId: string, field: keyof ExtractedData, value: string | string[]) => {
      setEditableResults(currentResults => 
          currentResults.map(r => r.clientId === clientId ? { ...r, [field]: value } : r)
      );
  }

  const handleSelect = (clientId: string, isSelected: boolean) => {
    setSelectedClientIds(prev => {
        const newSet = new Set(prev);
        if (isSelected) {
            newSet.add(clientId);
        } else {
            newSet.delete(clientId);
        }
        return newSet;
    });
  }

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
        setSelectedClientIds(new Set(editableResults.map(r => r.clientId!)));
    } else {
        setSelectedClientIds(new Set());
    }
  }

  const getSelectedData = () => {
    return editableResults.filter(r => selectedClientIds.has(r.clientId!));
  }

  if (isLoading) {
    return (
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 px-6 py-4 rounded-lg shadow-md">
            <LoadingSpinner />
            <span className="font-medium text-slate-600 dark:text-slate-300">Analyzing your content...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mt-8 text-center bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg">
        <InformationCircleIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
        <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">Ready to Extract</h3>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Upload an image or paste some text to get started.</p>
      </div>
    );
  }

  const isAllSelected = selectedClientIds.size > 0 && selectedClientIds.size === editableResults.length;

  return (
    <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Extraction Results</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Review and edit the extracted information below.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                <tr>
                    <th scope="col" className="p-4">
                        <input type="checkbox" checked={isAllSelected} onChange={(e) => handleSelectAll(e.target.checked)} className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"/>
                    </th>
                    <th scope="col" className="px-6 py-3 min-w-[150px]">Source</th>
                    <th scope="col" className="px-6 py-3 min-w-[200px]">Title</th>
                    <th scope="col" className="px-6 py-3 min-w-[200px]">Deadline</th>
                    <th scope="col" className="px-6 py-3 min-w-[250px]">Summary</th>
                    <th scope="col" className="px-6 py-3 min-w-[150px]">Location</th>
                    <th scope="col" className="px-6 py-3 min-w-[150px]">Actions</th>
                </tr>
            </thead>
            <tbody>
                {editableResults.map((result) => (
                    <tr key={result.clientId} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/20">
                        <td className="w-4 p-4">
                            <input type="checkbox" checked={selectedClientIds.has(result.clientId!)} onChange={e => handleSelect(result.clientId!, e.target.checked)} className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"/>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{result.source}</td>
                        <td className="px-6 py-4"><input type="text" value={result.title || ''} onChange={e => handleFieldChange(result.clientId!, 'title', e.target.value)} className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none focus:border-indigo-500"/></td>
                        <td className="px-6 py-4"><input type="datetime-local" value={(result.deadline || '').substring(0,16)} onChange={e => handleFieldChange(result.clientId!, 'deadline', e.target.value)} className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none focus:border-indigo-500 dark:[color-scheme:dark]"/></td>
                        <td className="px-6 py-4"><textarea rows={1} value={result.summary || ''} onChange={e => handleFieldChange(result.clientId!, 'summary', e.target.value)} className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none focus:border-indigo-500 resize-none"/></td>
                        <td className="px-6 py-4"><input type="text" value={result.location || ''} onChange={e => handleFieldChange(result.clientId!, 'location', e.target.value)} className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none focus:border-indigo-500"/></td>
                        <td className="px-6 py-4">
                            <button onClick={() => onAddToCalendar(result)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">Add</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {selectedClientIds.size > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
            <span className="font-semibold">{selectedClientIds.size} item(s) selected</span>
            <div className="flex-grow"></div>
            <button onClick={() => onBulkAddToCalendar(getSelectedData())} className="flex items-center gap-2 text-sm bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-indigo-700">
                <CalendarIcon className="w-4 h-4"/> Add to In-App Calendar
            </button>
            <button onClick={() => onBulkExportToICS(getSelectedData())} className="flex items-center gap-2 text-sm bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-700">
                <DownloadIcon className="w-4 h-4"/> Export (.ics)
            </button>
            {isGoogleCalendarConnected && (
                <button onClick={() => onBulkAddToGoogleCalendar(getSelectedData())} className="flex items-center gap-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                    <GoogleIcon className="w-4 h-4"/> Add to Google
                </button>
            )}
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;
