
import React from 'react';
import { CalendarEvent, Category } from '../types';
import { SearchIcon, ClockIcon, LocationMarkerIcon } from './Icons';
import { getCategoryHexColor } from '../utils/color';

interface SearchResultsListProps {
  events: CalendarEvent[];
  onEditEvent: (event: CalendarEvent) => void;
  allCategories: Category[];
  searchQuery: string;
}

const formatDateRange = (startStr: string, endStr: string, isAllDay?: boolean) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };

    if (isAllDay) {
        if (start.toDateString() === end.toDateString()) {
            return start.toLocaleDateString(undefined, options);
        }
        return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
    }
    
    options.hour = 'numeric';
    options.minute = '2-digit';

    if (start.toDateString() === end.toDateString()) {
         return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({ events, onEditEvent, allCategories, searchQuery }) => {
    if (events.length === 0) {
        return (
            <div className="text-center py-16">
                <SearchIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No results found for "{searchQuery}"</h3>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Try searching for something else.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
            {events.map(event => (
                <button
                    key={event.id}
                    onClick={() => onEditEvent(event)}
                    className="w-full text-left p-4 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex gap-4"
                >
                    <div
                        className="w-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getCategoryHexColor(event.category, allCategories) }}
                    />
                    <div className="flex-grow overflow-hidden">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{event.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            {formatDateRange(event.start, event.end, event.isAllDay)}
                        </p>
                        {event.summary && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                                {event.summary}
                            </p>
                        )}
                        {event.location && (
                             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                <LocationMarkerIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                {event.location}
                            </p>
                        )}
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                            {(event.category && event.category.length > 0 ? event.category : ['General']).map(catName => (
                                <span
                                    key={catName}
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{
                                        backgroundColor: getCategoryHexColor(catName, allCategories) + '20', // 20% opacity
                                        color: getCategoryHexColor(catName, allCategories),
                                    }}
                                >
                                    {catName}
                                </span>
                            ))}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
};

export default SearchResultsList;
