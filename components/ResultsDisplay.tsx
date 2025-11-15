import React, { useState, useEffect } from 'react';
import { ExtractedData } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { CalendarIcon, DownloadIcon, InformationCircleIcon, GoogleIcon } from './Icons';
import AttendeesInput from './AttendeesInput';

interface ResultsDisplayProps {
  data: ExtractedData | null;
  isLoading: boolean;
  onAddToCalendar: (data: ExtractedData) => void;
  onExportToICS: (data: ExtractedData) => void;
  isGoogleCalendarConnected: boolean;
  onAddToGoogleCalendar: (data: ExtractedData) => void;
}

const EditableField: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: 'text' | 'textarea' | 'datetime-local';
}> = ({ id, label, value, onChange, placeholder, type = 'text' }) => {
    const commonClasses = "mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition";
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-slate-600 dark:text-slate-400">{label}</label>
            {type === 'textarea' ? (
                 <textarea
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                    className={commonClasses}
                    placeholder={placeholder}
                />
            ) : type === 'datetime-local' ? (
                <input
                    id={id}
                    type="datetime-local"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${commonClasses} dark:[color-scheme:dark]`}
                 />
            ): (
                 <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={commonClasses}
                    placeholder={placeholder}
                />
            )}
        </div>
    )
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data, isLoading, onAddToCalendar, onExportToICS, isGoogleCalendarConnected, onAddToGoogleCalendar }) => {
  const [editableData, setEditableData] = useState<ExtractedData | null>(data);

  useEffect(() => {
    setEditableData(data);
  }, [data]);
  
  const handleFieldChange = (field: keyof ExtractedData, value: string | string[]) => {
      if (editableData) {
          setEditableData({ ...editableData, [field]: value });
      }
  }

  const setAttendees = (attendees: string[]) => {
    handleFieldChange('attendees', attendees);
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

  if (!data || !editableData) {
    return (
      <div className="mt-8 text-center bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg">
        <InformationCircleIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
        <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">Ready to Extract</h3>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Upload an image or paste some text to get started.</p>
      </div>
    );
  }
  
  const hasDeadline = editableData.deadline;
  const deadlineForInput = editableData.deadline ? editableData.deadline.substring(0, 16) : '';


  return (
    <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Extraction Results</h2>
        <EditableField id="title" label="Title" value={editableData.title || ''} onChange={(val) => handleFieldChange('title', val)} placeholder="No title extracted."/>
        <EditableField id="summary" label="Summary" value={editableData.summary || ''} onChange={(val) => handleFieldChange('summary', val)} placeholder="No summary extracted." type="textarea"/>
        <EditableField id="deadline" label="Deadline" value={deadlineForInput} onChange={(val) => handleFieldChange('deadline', val)} placeholder="No deadline extracted." type="datetime-local"/>
        <EditableField id="eligibility" label="Eligibility" value={editableData.eligibility || ''} onChange={(val) => handleFieldChange('eligibility', val)} placeholder="No eligibility info extracted."/>
        <EditableField id="location" label="Location" value={editableData.location || ''} onChange={(val) => handleFieldChange('location', val)} placeholder="No location extracted."/>
        <AttendeesInput attendees={editableData.attendees || []} setAttendees={setAttendees} />

        {editableData.source && (
            <div>
                 <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400">Source</label>
                 <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg max-h-48 overflow-y-auto">
                    {editableData.source.startsWith('data:image') ? (
                        <img src={editableData.source} alt="Source Preview" className="rounded-md max-w-full h-auto" />
                    ) : (
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                            {editableData.source}
                        </p>
                    )}
                 </div>
            </div>
        )}
      </div>

      {hasDeadline && (
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onAddToCalendar(editableData)}
              className="flex-1 flex justify-center items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              <CalendarIcon className="w-5 h-5"/>
              Add to In-App Calendar
            </button>
            <button
              onClick={() => onExportToICS(editableData)}
              className="flex-1 flex justify-center items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all"
            >
              <DownloadIcon className="w-5 h-5"/>
              Export (.ics file)
            </button>
            {isGoogleCalendarConnected && (
                <button
                onClick={() => onAddToGoogleCalendar(editableData)}
                className="sm:col-span-2 flex-1 flex justify-center items-center gap-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                >
                <GoogleIcon className="w-5 h-5"/>
                Add to Google Calendar
                </button>
            )}
          </div>
          <p className="text-xs text-center mt-3 text-slate-500 dark:text-slate-400">Add to your calendars. You can invite guests by adding their emails above.</p>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;