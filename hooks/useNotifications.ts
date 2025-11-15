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
      
      // Check for deadline reminders
      events.forEach(event => {
        const eventDate = new Date(event.start);
        const diffMinutes = (eventDate.getTime() - now.getTime()) / (1000 * 60);

        const reminderIntervals = {
            '30m': 30,
            '2h': 120,
            '6h': 360,
            '12h': 720
        };

        for (const [key, minutes] of Object.entries(reminderIntervals)) {
            if (diffMinutes > 0 && diffMinutes <= minutes) {
                const alreadyNotified = notifiedEventIds[event.id]?.includes(key);
                if (!alreadyNotified) {
                    addNotification({ eventId: event.id, message: `Reminder: "${event.title}" is due in less than ${key === '30m' ? '30 minutes' : `${minutes/60} hours`}.` });
                    setNotifiedEventIds(prev => ({
                        ...prev,
                        [event.id]: [...(prev[event.id] || []), key]
                    }));
                }
            }
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
