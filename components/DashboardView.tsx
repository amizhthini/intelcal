import React from 'react';
import { CalendarEvent } from '../types';
import { CalendarIcon, ClockIcon } from './Icons';

interface DashboardViewProps {
  events: CalendarEvent[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ events }) => {

  const upcomingEvents = events
    .filter(event => new Date(event.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 3);
    
  const today = new Date();
  today.setHours(0,0,0,0);
  const eventsToday = events.filter(e => {
      const eventDate = new Date(e.start);
      eventDate.setHours(0,0,0,0);
      return eventDate.getTime() === today.getTime();
  }).length;


  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center gap-4">
            <div className="bg-indigo-100 dark:bg-indigo-500/20 p-3 rounded-full">
                <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Events</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{events.length}</p>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-500/20 p-3 rounded-full">
                <ClockIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Events Today</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{eventsToday}</p>
            </div>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Upcoming Deadlines</h3>
        {upcomingEvents.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {upcomingEvents.map(event => (
              <li key={event.id} className="py-3">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{event.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date(event.start).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">No upcoming deadlines. You're all caught up!</p>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
