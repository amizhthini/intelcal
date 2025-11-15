import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { TrashIcon, GoogleIcon } from './Icons';
import AttendeesInput from './AttendeesInput';

interface EventModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  isGoogleCalendarConnected: boolean;
  onAddToGoogleCalendar: (event: CalendarEvent) => Promise<void>;
}

const EventModal: React.FC<EventModalProps> = ({ event, onClose, onSave, onDelete, showToast, isGoogleCalendarConnected, onAddToGoogleCalendar }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  
  // Storing a copy of the original event to access other properties on save
  const [fullEvent, setFullEvent] = useState<CalendarEvent | null>(event);

  useEffect(() => {
    if (event) {
      setFullEvent(event);
      setTitle(event.title);
      setAttendees(event.attendees || []);
      const start = new Date(event.start);
      
      // Correctly format for local date and time inputs without timezone mutation
      const year = start.getFullYear();
      const month = (start.getMonth() + 1).toString().padStart(2, '0');
      const day = start.getDate().toString().padStart(2, '0');
      const hours = start.getHours().toString().padStart(2, '0');
      const minutes = start.getMinutes().toString().padStart(2, '0');

      setStartDate(`${year}-${month}-${day}`);
      setStartTime(`${hours}:${minutes}`);
    }
  }, [event]);
  
  const getCurrentEventFromState = (): CalendarEvent => {
    const startDateTime = new Date(`${startDate}T${startTime}`);
    return {
      ...(fullEvent as CalendarEvent),
      id: event?.id || '', // Will be empty for new events, App component will assign one
      title,
      start: startDateTime.toISOString(),
      end: new Date(startDateTime.getTime() + 60 * 60 * 1000).toISOString(),
      attendees,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !startTime) {
        showToast('Please fill all fields', 'error');
        return;
    }
    onSave(getCurrentEventFromState());
  };

  const handleDelete = () => {
    if (event?.id) {
        onDelete(event.id);
    }
  }
  
  const handleGoogleCalendarClick = async () => {
    if (!title || !startDate || !startTime) {
        showToast('Please set a title, date, and time before adding to Google Calendar.', 'error');
        return;
    }
    const currentEvent = getCurrentEventFromState();
    await onAddToGoogleCalendar(currentEvent);
    // Do not close the modal, the user might want to perform other actions.
    // The App state is now updated, and they can close manually.
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-bold">{event?.id ? 'Edit Event' : 'Create Event'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
              <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                <input type="date" id="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Time</label>
                <input type="time" id="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
              </div>
            </div>
             <AttendeesInput attendees={attendees} setAttendees={setAttendees} />
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap justify-between items-center gap-2">
            <div>
                {event?.id && (
                    <button type="button" onClick={handleDelete} title="Delete Event" className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2">
                {isGoogleCalendarConnected && (
                    <button type="button" onClick={handleGoogleCalendarClick} title="Save to Google Calendar" className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                        <GoogleIcon className="w-5 h-5"/>
                    </button>
                )}
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
                <button type="submit" className="ml-3 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;