import React, { useState, useCallback } from 'react';
import { ExtractedData, CalendarEvent, View, ToastMessage, BookingSettings } from './types';
import { extractInfo } from './services/geminiService';
import useLocalStorage from './hooks/useLocalStorage';
import useNotifications from './hooks/useNotifications';
import { generateICS, generateInviteEmail } from './utils/calendar';
import { addEventToGoogleCalendar } from './services/googleCalendarService';

import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import DocumentsView from './components/DocumentsView';
import CalendarView from './components/CalendarView';
import BookingView from './components/BookingView';
import NavigationBar from './components/NavigationBar';
import Toast from './components/Toast';
import GoogleClientIdModal from './components/GoogleClientIdModal';

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
    });
};


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>('calendarEvents', []);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);
  
  const [googleClientId, setGoogleClientId] = useLocalStorage<string>('googleClientId', '');
  const [isClientIdModalOpen, setIsClientIdModalOpen] = useState(false);
  
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

  const handleExtract = useCallback(async (file: File | null, text: string) => {
    if (!file && !text) {
      showToast('Please provide an image or text to analyze.', 'error');
      return;
    }
    setIsLoading(true);
    setExtractedData(null);

    try {
      const result = await extractInfo(file, text);
      let sourceData: string | null = null;
      if (file) {
        sourceData = await fileToDataUrl(file);
      } else if (text) {
        sourceData = text;
      }
      setExtractedData({ ...result, source: sourceData, attendees: [] });

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
    };
    setEvents(prev => [...prev, newBooking]);
    showToast(`Appointment with ${bookerName} booked successfully!`, 'success');
  }, [bookingSettings.appointmentDuration, setEvents, showToast]);


  const addEventToCalendar = useCallback((data: ExtractedData) => {
    if (!data.deadline || !data.title) {
      showToast("Cannot add to calendar without a title and deadline.", 'error');
      return;
    }

    let deadlineISO = data.deadline;
    if (deadlineISO && deadlineISO.length === 10) {
        deadlineISO += 'T12:00:00'; // Use noon to avoid timezone boundary issues
    }
    const deadline = new Date(deadlineISO);

    if (isNaN(deadline.getTime())) {
      showToast("Invalid date format. Cannot add to calendar.", 'error');
      return;
    }
    
    const newEvent: CalendarEvent = {
      id: '', // Let handleSaveEvent know this is a new event
      title: data.title,
      start: deadline.toISOString(),
      end: new Date(deadline.getTime() + 60 * 60 * 1000).toISOString(),
      summary: data.summary || '',
      location: data.location || '',
      eligibility: data.eligibility || '',
      source: data.source || undefined,
      attendees: data.attendees || [],
    };
    handleSaveEvent(newEvent);
    setCurrentView(View.CALENDAR);
  }, [showToast, handleSaveEvent]);

  const handleExportToICS = useCallback((data: ExtractedData) => {
     if (!data.deadline || !data.title) {
      showToast("Cannot export event without a title and deadline.", 'error');
      return;
    }
    let deadlineISO = data.deadline;
    if (deadlineISO && deadlineISO.length === 10) {
        deadlineISO += 'T12:00:00'; // Use noon to avoid timezone boundary issues
    }
    const deadline = new Date(deadlineISO);


    if (isNaN(deadline.getTime())) {
      showToast("Invalid date format. Cannot export.", 'error');
      return;
    }

    try {
      generateICS({
        id: Date.now().toString(),
        title: data.title,
        start: deadline.toISOString(),
        end: new Date(deadline.getTime() + 60 * 60 * 1000).toISOString(),
        summary: data.summary || '',
        location: data.location || '',
        eligibility: data.eligibility || '',
        source: data.source || undefined,
        attendees: data.attendees || [],
      });
      showToast('ICS file exported successfully!', 'success');
    } catch (e) {
        showToast('Failed to export ICS file.', 'error');
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
        
        const deadline = new Date(deadlineISO.length === 10 ? `${deadlineISO}T12:00:00` : deadlineISO); // Use noon to avoid timezone boundary issues
        
        const event: CalendarEvent = {
            id: (eventData as CalendarEvent).id || Date.now().toString(),
            title: eventData.title || 'Untitled Event',
            start: deadline.toISOString(),
            end: new Date(deadline.getTime() + 60 * 60 * 1000).toISOString(),
            summary: eventData.summary || '',
            location: eventData.location || '',
            eligibility: eventData.eligibility || '',
            attendees: eventData.attendees || [],
        };
      
        const googleEvent = await addEventToGoogleCalendar(event);
        showToast('Event added to Google Calendar!', 'success');
        
        const isExistingEvent = events.some(e => e.id === event.id);

        if (isExistingEvent) {
            // It's an existing event from the calendar view, just update it with the Google ID
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, googleEventId: googleEvent.id } : e));
        } else {
            // It's a new event from the results display or a new event from the modal. Add it to our local state.
            const newLocalEvent: CalendarEvent = { ...event, googleEventId: googleEvent.id };
            setEvents(prev => [...prev, newLocalEvent]);
        }

    } catch (error: any) {
        console.error(error);
        showToast(error.message || 'Failed to add to Google Calendar.', 'error');
    }
  };
  
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
            extractedData={extractedData}
            onAddToCalendar={addEventToCalendar}
            onExportToICS={handleExportToICS}
            isGoogleCalendarConnected={isGoogleCalendarConnected}
            onAddToGoogleCalendar={handleAddToGoogleCalendar}
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
      </main>
      <NavigationBar currentView={currentView} setCurrentView={setCurrentView} />
    </div>
  );
};

export default App;