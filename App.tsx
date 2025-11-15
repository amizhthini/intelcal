
import React, { useState, useCallback, useEffect } from 'react';
import { ExtractedData, CalendarEvent, View, ToastMessage, BookingSettings, Category } from './types';
import { extractInfo } from './services/geminiService';
import useLocalStorage from './hooks/useLocalStorage';
import useNotifications from './hooks/useNotifications';
import { generateICS, generateInviteEmail } from './utils/calendar';
import { addEventToGoogleCalendar } from './services/googleCalendarService';
import { DEFAULT_CATEGORIES, COLOR_PALETTE } from './utils/categories';

import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import DocumentsView from './components/DocumentsView';
import CalendarView from './components/CalendarView';
import BookingView from './components/BookingView';
import DataStructuringView from './components/DataStructuringView';
import NavigationBar from './components/NavigationBar';
import Toast from './components/Toast';
import GoogleClientIdModal from './components/GoogleClientIdModal';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Default to true for development
  const [currentView, setCurrentView] = useState<View>(View.DOCUMENTS);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [extractionResults, setExtractionResults] = useState<ExtractedData[]>([]);
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>('calendarEvents', []);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);
  
  const [googleClientId, setGoogleClientId] = useLocalStorage<string>('googleClientId', '');
  const [isClientIdModalOpen, setIsClientIdModalOpen] = useState(false);
  
  const [allCategories, setAllCategories] = useLocalStorage<Category[]>('allCategories', DEFAULT_CATEGORIES);
  
  const [bookingSettings, setBookingSettings] = useLocalStorage<BookingSettings>('bookingSettings', {
    availabilityRules: [],
    appointmentDuration: 30,
    bookingPageId: `user-${Math.random().toString(36).substr(2, 9)}`,
  });

  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications(events);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // One-time migration for old string-based categories
  useEffect(() => {
    const firstItem = allCategories[0];
    if (firstItem && typeof firstItem === 'string') {
        console.log('Migrating categories to new format...');
        const migratedCategories = (allCategories as unknown as string[]).map((name, index) => ({
            name,
            color: COLOR_PALETTE[index % COLOR_PALETTE.length],
        }));
        
        DEFAULT_CATEGORIES.forEach(defaultCat => {
            if (!migratedCategories.some(mc => mc.name.toLowerCase() === defaultCat.name.toLowerCase())) {
                migratedCategories.push(defaultCat);
            }
        });
        
        setAllCategories(migratedCategories);
        showToast('Categories updated!', 'success');
    }
  }, [allCategories, setAllCategories, showToast]);


  const handleExtract = useCallback(async (files: File[], text: string) => {
    const tasks: { file: File | null; text: string; sourceName: string }[] = [];
    files.forEach(file => tasks.push({ file, text: '', sourceName: file.name }));
    text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .forEach(line => tasks.push({ file: null, text: line, sourceName: `Pasted Text: "${line.substring(0, 20)}..."` }));

    if (tasks.length === 0) {
        showToast('Please provide files or text to analyze.', 'error');
        return;
    }

    setIsLoading(true);
    setExtractionResults([]);

    try {
        const extractionPromises = tasks.map(task => extractInfo(task.file, task.text));
        const extractedInfosNested = await Promise.all(extractionPromises);
        const extractedInfos = extractedInfosNested.flat();
        
        const finalResults = extractedInfos.map((info, index) => {
            const task = tasks.find(t => (info as any).originalSource === t.sourceName) || tasks[0];
            return {
                ...info,
                clientId: `${Date.now()}-${index}`,
                source: task.sourceName,
                attendees: [],
            };
        });
        setExtractionResults(finalResults);

    } catch (e) {
      console.error(e);
      showToast('Failed to extract information. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);
  
  const handleSaveEvent = (eventData: CalendarEvent) => {
    const isNewEvent = !eventData.id;
    const oldEvent = isNewEvent ? null : events.find(e => e.id === eventData.id);

    const updatedEvent: CalendarEvent = isNewEvent 
      ? { ...eventData, id: Date.now().toString() } 
      : eventData;
    
    const existingAttendees = oldEvent?.attendees || [];
    const newAttendees = (updatedEvent.attendees || []).filter(a => !existingAttendees.includes(a));

    if (newAttendees.length > 0) {
        if(window.confirm(`Do you want to send email invites to ${newAttendees.length} new guest(s)? This will open your default email client.`)) {
            generateInviteEmail(updatedEvent, newAttendees);
        }
    }

    if (isNewEvent) {
      setEvents(prev => [...prev, updatedEvent]);
      showToast('Event created successfully!', 'success');
    } else {
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      showToast('Event updated successfully!', 'success');
    }
  };

  const handleBookAppointment = useCallback((slot: Date, bookerName: string, bookerEmail: string) => {
    const newBooking: CalendarEvent = {
        id: Date.now().toString(),
        title: `Booking: ${bookerName}`,
        start: slot.toISOString(),
        end: new Date(slot.getTime() + bookingSettings.appointmentDuration * 60 * 1000).toISOString(),
        attendees: [bookerEmail],
        summary: `Meeting booked via IntelliCal with ${bookerName} (${bookerEmail}).`,
        category: 'Meeting',
    };
    setEvents(prev => [...prev, newBooking]);
    showToast(`Appointment with ${bookerName} booked successfully!`, 'success');
  }, [bookingSettings.appointmentDuration, setEvents, showToast]);

  const extractedDataToCalendarEvent = (data: ExtractedData): CalendarEvent | null => {
      if (!data.deadline || !data.title) {
        return null;
      }
      let deadlineISO = data.deadline;
      if (deadlineISO && (deadlineISO.length <= 10 || !deadlineISO.includes('T'))) {
          deadlineISO = `${deadlineISO.split('T')[0]}T23:59:59`; 
      }
      const deadline = new Date(deadlineISO);
      if (isNaN(deadline.getTime())) {
          return null;
      }
      return {
        id: '', 
        title: data.title,
        start: deadline.toISOString(),
        end: new Date(deadline.getTime() + 60 * 60 * 1000).toISOString(),
        summary: data.summary || '',
        location: data.location || '',
        eligibility: data.eligibility || '',
        source: data.source || undefined,
        attendees: data.attendees || [],
        category: data.category || 'General',
      };
  }

  const handleBulkAddToCalendar = useCallback((dataItems: ExtractedData[]) => {
    let addedCount = 0;
    let skippedCount = 0;
    const newEvents: CalendarEvent[] = [];

    dataItems.forEach(data => {
        const potentialEvent = extractedDataToCalendarEvent(data);
        if (potentialEvent) {
            const isDuplicate = events.some(
                e => e.title === potentialEvent.title && e.start === potentialEvent.start
            );
            if (isDuplicate) {
                skippedCount++;
            } else {
                newEvents.push({ ...potentialEvent, id: `${Date.now()}-${addedCount}` });
                addedCount++;
            }
        }
    });
    
    if (addedCount > 0) {
        setEvents(prev => [...prev, ...newEvents]);
    }
    
    if (addedCount > 0 && skippedCount > 0) {
        showToast(`${addedCount} event(s) added. ${skippedCount} duplicate(s) skipped.`, 'success');
    } else if (addedCount > 0) {
        showToast(`${addedCount} event(s) added to calendar!`, 'success');
    } else if (skippedCount > 0) {
        showToast(`No events added. ${skippedCount} duplicate(s) found.`, 'error');
    } else {
        showToast("No valid events could be added.", 'error');
    }

    if (addedCount > 0) {
        setExtractionResults([]);
        setCurrentView(View.CALENDAR);
    }
  }, [events, setEvents, showToast]);


  const addEventToCalendar = useCallback((data: ExtractedData) => {
    const newEvent = extractedDataToCalendarEvent(data);
    if(newEvent) {
        const isDuplicate = events.some(
            e => e.title === newEvent.title && e.start === newEvent.start
        );
        if (isDuplicate) {
            showToast("This event already exists in your calendar.", 'error');
            return;
        }
        handleSaveEvent(newEvent);
        setExtractionResults([]); // Auto-clear results
        setCurrentView(View.CALENDAR);
    } else {
        showToast("Cannot add to calendar. Title and deadline are required.", 'error');
    }
  }, [events, showToast, handleSaveEvent]);

  const handleBulkExportToICS = useCallback((dataItems: ExtractedData[]) => {
    let exportedCount = 0;
    dataItems.forEach(data => {
        const event = extractedDataToCalendarEvent(data);
        if (event) {
            try {
                generateICS({ ...event, id: `${Date.now()}-${exportedCount}`});
                exportedCount++;
            } catch(e) {
                // error generating one of them, continue
            }
        }
    });
     if (exportedCount > 0) {
        showToast(`${exportedCount} ICS file(s) exported successfully!`, 'success');
    } else {
        showToast('No valid events to export.', 'error');
    }
  }, [showToast]);

  const handleAddToGoogleCalendar = async (eventData: CalendarEvent | ExtractedData) => {
    if (!isGoogleCalendarConnected) {
        showToast('Please connect your Google Calendar first.', 'error');
        return;
    }

    showToast('Adding to Google Calendar...', 'success');
    try {
        const deadlineISO = (eventData as ExtractedData).deadline || (eventData as CalendarEvent).start;
        if (!deadlineISO) throw new Error("Event has no date.");
        
        const deadline = new Date(deadlineISO.length === 10 ? `${deadlineISO}T23:59:59` : deadlineISO);
        
        const event: CalendarEvent = {
            id: (eventData as CalendarEvent).id || Date.now().toString(),
            title: eventData.title || 'Untitled Event',
            start: deadline.toISOString(),
            end: new Date(deadline.getTime() + 60 * 60 * 1000).toISOString(),
            summary: eventData.summary || '',
            location: eventData.location || '',
            eligibility: eventData.eligibility || '',
            attendees: eventData.attendees || [],
            category: eventData.category || 'General',
        };
      
        const googleEvent = await addEventToGoogleCalendar(event);
        showToast('Event added to Google Calendar!', 'success');
        
        const isExistingEvent = events.some(e => e.id === event.id);

        if (isExistingEvent) {
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, googleEventId: googleEvent.id } : e));
        } else {
            const newLocalEvent: CalendarEvent = { ...event, googleEventId: googleEvent.id };
            setEvents(prev => [...prev, newLocalEvent]);
        }

    } catch (error: any) {
        console.error(error);
        showToast(error.message || 'Failed to add to Google Calendar.', 'error');
    }
  };

  const handleBulkAddToGoogleCalendar = async (dataItems: ExtractedData[]) => {
      let addedCount = 0;
      let skippedCount = 0;
      showToast(`Processing ${dataItems.length} events for Google Calendar...`, 'success');
      for (const data of dataItems) {
          const potentialEvent = extractedDataToCalendarEvent(data);
          if (potentialEvent) {
              const isDuplicate = events.some(e => e.title === potentialEvent.title && e.start === potentialEvent.start);
              if (isDuplicate) {
                  skippedCount++;
                  continue;
              }
          }
          try {
              await handleAddToGoogleCalendar(data);
              addedCount++;
          } catch(e) {
              console.error(`Failed to add item to Google Calendar: ${data.title}`, e);
          }
      }
      
      let message = '';
      if(addedCount > 0) message += `${addedCount} event(s) added. `;
      if(skippedCount > 0) message += `${skippedCount} duplicate(s) skipped.`;
      if(message === '') message = 'No new events to add.';

      showToast(message, addedCount > 0 ? 'success' : 'error');

      if (addedCount > 0) {
        setExtractionResults([]); // Auto-clear results
      }
  }
  
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentView(View.DASHBOARD);
  };
  
  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {isClientIdModalOpen && (
        <GoogleClientIdModal
          onSave={setGoogleClientId}
          onClose={() => setIsClientIdModalOpen(false)}
        />
      )}
      <Toast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
      <Header 
        onLogout={handleLogout}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead} 
        onGoogleAuthChange={setIsGoogleCalendarConnected}
        googleClientId={googleClientId}
        onConfigureGoogle={() => setIsClientIdModalOpen(true)}
      />
      <main className="p-4 mx-auto max-w-4xl pb-24">
        {currentView === View.DASHBOARD && <DashboardView events={events} />}
        {currentView === View.DOCUMENTS && (
          <DocumentsView
            onExtract={handleExtract}
            isLoading={isLoading}
            extractionResults={extractionResults}
            onAddToCalendar={addEventToCalendar}
            onBulkAddToCalendar={handleBulkAddToCalendar}
            onBulkExportToICS={handleBulkExportToICS}
            isGoogleCalendarConnected={isGoogleCalendarConnected}
            onAddToGoogleCalendar={handleAddToGoogleCalendar}
            onBulkAddToGoogleCalendar={handleBulkAddToGoogleCalendar}
            allCategories={allCategories}
            setAllCategories={setAllCategories}
          />
        )}
        {currentView === View.CALENDAR && 
            <CalendarView 
                events={events} 
                setEvents={setEvents} 
                showToast={showToast}
                isGoogleCalendarConnected={isGoogleCalendarConnected}
                onAddToGoogleCalendar={handleAddToGoogleCalendar}
                onSaveEvent={handleSaveEvent}
                allCategories={allCategories}
                setAllCategories={setAllCategories}
            />
        }
        {currentView === View.BOOKING &&
            <BookingView
                settings={bookingSettings}
                onSettingsChange={setBookingSettings}
                events={events}
                onBookAppointment={handleBookAppointment}
                showToast={showToast}
            />
        }
        {currentView === View.DATA_STRUCTURING &&
            <DataStructuringView showToast={showToast} />
        }
      </main>
      <NavigationBar currentView={currentView} setCurrentView={setCurrentView} />
    </div>
  );
};

export default App;