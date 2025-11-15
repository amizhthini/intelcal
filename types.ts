export interface ExtractedData {
  title: string | null;
  summary: string | null;
  eligibility: string | null;
  location: string | null;
  deadline: string | null; // Format: YYYY-MM-DDTHH:MM:SS
  source: string | null; // Filename or "Pasted Text"
  category?: string; // e.g., "Business", "Personal", "Grant"
  attendees?: string[];
  clientId?: string; // a temporary ID for UI management
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO 8601 format
  end: string;   // ISO 8601 format
  summary?: string;
  location?: string;
  eligibility?: string;
  source?: string;
  category?: string;
  attendees?: string[];
  googleEventId?: string; // To store the event ID from Google Calendar for syncing
}

export enum View {
  DASHBOARD = 'dashboard',
  DOCUMENTS = 'documents',
  CALENDAR = 'calendar',
  BOOKING = 'booking',
}

export interface ToastMessage {
    message: string;
    type: 'success' | 'error';
}

export interface Notification {
  id: string;
  eventId?: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AvailabilityRule {
  dayOfWeek: number; // 0 for Sunday, 1 for Monday, etc.
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface BookingSettings {
  availabilityRules: AvailabilityRule[];
  appointmentDuration: number; // in minutes
  bookingPageId: string; // a unique ID for the booking page link
}