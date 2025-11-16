
import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent, Notification } from '../types';
import useLocalStorage from './useLocalStorage';

const useNotifications = (events: CalendarEvent[]) => {
  const [notifications, setNotifications] = useLocalStorage<Notification[]>('notifications', []);
  const [notifiedEventIds, setNotifiedEventIds] = useLocalStorage<Record<string, string[]>>('notifiedEventIds', {});
  
  const addNotification = useCallback((newNotification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [
      { ...newNotification, id: Date.now().toString(), timestamp: new Date().toISOString(), read: false },
      ...prev
    ]);
  }, [setNotifications]);

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      
      events.forEach(event => {
        if (!event.reminders || event.reminders.length === 0) {
          return; // Skip events without reminders
        }
        
        const createReminderNotification = (
            targetDate: Date,
            reminderMinutes: number,
            isAnnual: boolean
        ) => {
            const diffMinutes = (targetDate.getTime() - now.getTime()) / (1000 * 60);
            
            const yearOfTarget = targetDate.getFullYear();
            const reminderKey = isAnnual 
                ? `${reminderMinutes}m-annual-${yearOfTarget}`
                : `${reminderMinutes}m-onetime`;

            const alreadyNotified = notifiedEventIds[event.id]?.includes(reminderKey);

            if (diffMinutes > 0 && diffMinutes <= reminderMinutes && !alreadyNotified) {
                let timeLabel = '';
                if (reminderMinutes < 60) {
                    timeLabel = `${reminderMinutes} minutes`;
                } else {
                    const hours = reminderMinutes / 60;
                    timeLabel = `${hours} hour${hours > 1 ? 's' : ''}`;
                }

                addNotification({
                    eventId: event.id,
                    message: isAnnual
                        ? `Annual Reminder: "${event.title}" is in less than ${timeLabel} on ${targetDate.toLocaleDateString()}.`
                        : `Reminder: "${event.title}" is in less than ${timeLabel}.`
                });
                
                setNotifiedEventIds(prev => ({
                    ...prev,
                    [event.id]: [...(prev[event.id] || []), reminderKey]
                }));
            }
        };

        if (event.recurring === 'annually') {
            const anniversaryDate = new Date(event.start);
            anniversaryDate.setFullYear(now.getFullYear());

            if (anniversaryDate < now) {
                anniversaryDate.setFullYear(now.getFullYear() + 1);
            }
            
            event.reminders.forEach(reminderMinutes => {
                createReminderNotification(anniversaryDate, reminderMinutes, true);
            });
        } else {
            const eventDate = new Date(event.start);
            event.reminders.forEach(reminderMinutes => {
                createReminderNotification(eventDate, reminderMinutes, false);
            });
        }
      });
      
      // Check for daily summary
      const lastSummaryKey = 'lastDailySummary';
      const lastSummaryDate = new Date(localStorage.getItem(lastSummaryKey) || 0).toDateString();
      const todayDate = now.toDateString();

      if (now.getHours() >= 21 && lastSummaryDate !== todayDate) {
         const tomorrow = new Date();
         tomorrow.setDate(now.getDate() + 1);
         tomorrow.setHours(0,0,0,0);
         const dayAfterTomorrow = new Date(tomorrow);
         dayAfterTomorrow.setDate(tomorrow.getDate() + 1);

         const tomorrowsEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate >= tomorrow && eventDate < dayAfterTomorrow;
         });
         
         if (tomorrowsEvents.length > 0) {
            addNotification({ message: `Daily Summary: You have ${tomorrowsEvents.length} event(s) tomorrow.` });
            localStorage.setItem(lastSummaryKey, now.toISOString());
         } else if (lastSummaryDate !== todayDate) {
            // Still mark as summarized to avoid checking again today
             localStorage.setItem(lastSummaryKey, now.toISOString());
         }
      }
    };

    const intervalId = setInterval(checkNotifications, 60 * 1000); // Check every minute
    checkNotifications(); // Run once on startup
    return () => clearInterval(intervalId);
  }, [events, addNotification, notifiedEventIds, setNotifiedEventIds]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead };
};

export default useNotifications;