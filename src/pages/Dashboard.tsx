import React from 'react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { AlertTriangle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import { useLanguage } from '../contexts/LanguageContext';
import type { Database } from '../lib/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'];

export default function Dashboard() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  React.useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (!error && data) {
        setTasks(data);
      }
      setLoading(false);
    }

    fetchTasks();
  }, []);

  const urgentTasks = tasks.filter(task => 
    task.priority === 'high' && task.status !== 'completed'
  );

  const upcomingTasks = tasks.filter(task => 
    task.status !== 'completed' && 
    new Date(task.due_date) > new Date() &&
    task.priority !== 'high'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
      
      {/* Urgent Tasks */}
      <div className="bg-red-50 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
          <h2 className="text-lg font-semibold text-red-900">{t('urgentTasks')}</h2>
        </div>
        <div className="space-y-4">
          {urgentTasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="bg-white p-4 rounded-md shadow-sm transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
            >
              <h3 className="font-medium text-gray-900">{task.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('due')}: {format(new Date(task.due_date), 'PPP', { locale: language === 'es' ? es : enUS })}
              </p>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {t('area')}: {task.area} - {task.requesting_area}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {t('high')}
                </span>
              </div>
            </div>
          ))}
          {urgentTasks.length === 0 && (
            <p className="text-sm text-gray-500">{t('noUrgentTasks')}</p>
          )}
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center mb-4">
          <Clock className="h-6 w-6 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">{t('upcomingTasks')}</h2>
        </div>
        <div className="space-y-4">
          {upcomingTasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="border border-gray-200 p-4 rounded-md transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
            >
              <h3 className="font-medium text-gray-900">{task.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('due')}: {format(new Date(task.due_date), 'PPP', { locale: language === 'es' ? es : enUS })}
              </p>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {t('area')}: {task.area} - {task.requesting_area}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                  {t(task.priority)}
                </span>
              </div>
            </div>
          ))}
          {upcomingTasks.length === 0 && (
            <p className="text-sm text-gray-500">{t('noUpcomingTasks')}</p>
          )}
        </div>
      </div>
    </div>
  );
}