import React from 'react';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Database } from '../lib/supabase/types';
import toast from 'react-hot-toast';

type Task = Database['public']['Tables']['tasks']['Row'];

export default function NotificationBell() {
  const [notifications, setNotifications] = React.useState<Task[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
  const notificationRef = React.useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Check if notifications are supported and permission status
  React.useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Tu navegador no soporta notificaciones');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        toast.success('Notificaciones activadas');
        // Send a test notification
        new Notification('Region Web Archive', {
          body: 'Las notificaciones han sido activadas exitosamente',
          icon: 'https://i.imgur.com/3Qr9VrU.png'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Error al solicitar permiso para notificaciones');
    }
  };

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      .neq('status', 'completed')
      .or(`due_date.lte.${threeDaysFromNow.toISOString()},priority.eq.high`)
      .order('due_date', { ascending: true });

    if (data) {
      setNotifications(data);
      
      // If notifications are enabled, check for tasks due soon
      if (notificationsEnabled) {
        const urgentTasks = data.filter(task => {
          const dueDate = new Date(task.due_date);
          const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursUntilDue <= 24 || task.priority === 'high';
        });

        urgentTasks.forEach(task => {
          const dueDate = new Date(task.due_date);
          new Notification('Tarea Urgente', {
            body: `"${task.title}" vence el ${format(dueDate, 'PPP', { locale: language === 'es' ? es : enUS })}`,
            icon: 'https://i.imgur.com/3Qr9VrU.png',
            tag: `task-${task.id}`, // Prevent duplicate notifications
            requireInteraction: true // Notification persists until user interacts
          });
        });
      }
    }
  }, [user, notificationsEnabled, language]);

  // Initial fetch and setup periodic checks
  React.useEffect(() => {
    fetchNotifications();
    
    // Check for notifications every 6 hours
    const interval = setInterval(fetchNotifications, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationPriority = (task: Task) => {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (task.priority === 'high' || hoursUntilDue <= 24) return 'high';
    if (hoursUntilDue <= 72) return 'medium';
    return 'low';
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
    setShowNotifications(false);
  };

  return (
    <div className="relative" ref={notificationRef}>
      <div className="flex items-center gap-2">
        {!notificationsEnabled && (
          <button
            onClick={requestNotificationPermission}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            Activar notificaciones
          </button>
        )}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <Bell className="h-6 w-6" />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">{t('notifications')}</h3>
            </div>
            <div className="py-2">
              {notifications.length === 0 ? (
                <p className="px-4 py-2 text-sm text-gray-500">{t('noNotifications')}</p>
              ) : (
                notifications.map(task => {
                  const priority = getNotificationPriority(task);
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 ${
                        priority === 'high' ? 'border-red-500 bg-red-50' :
                        priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {t(task.priority)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {t('due')}: {format(new Date(task.due_date), 'PPP', { locale: language === 'es' ? es : enUS })}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}