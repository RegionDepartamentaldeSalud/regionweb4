import React from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { supabase } from '../lib/supabase/client';
import { useLanguage } from '../contexts/LanguageContext';
import type { Database } from '../lib/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'];

export default function Calendar() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [selectedDay, setSelectedDay] = React.useState<Date>();
  const { t, language } = useLanguage();

  React.useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (!error && data) {
        setTasks(data);
      }
    }

    fetchTasks();
  }, []);

  const selectedDayTasks = selectedDay
    ? tasks.filter(task => 
        format(new Date(task.due_date), 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd')
      )
    : [];

  return (
    <div className="flex flex-col space-y-6">
      {/* Calendar section - Always on top for mobile */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mx-auto w-full max-w-md">
        <DayPicker
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          locale={language === 'es' ? es : enUS}
          modifiers={{
            hasTasks: tasks.map(task => new Date(task.due_date))
          }}
          modifiersStyles={{
            hasTasks: {
              backgroundColor: '#EEF2FF',
              borderRadius: '100%'
            }
          }}
          className="mx-auto"
        />
      </div>

      {/* Tasks section - Below calendar */}
      <div className="w-full">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedDay ? format(selectedDay, 'PPPP', { locale: language === 'es' ? es : enUS }) : t('selectDate')}
        </h2>
        
        <div className="space-y-4">
          {selectedDayTasks.map(task => (
            <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-gray-900">{task.title}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-blue-100 text-blue-800'}`}>
                  {t(task.priority)}
                </span>
              </div>
              {task.description && (
                <p className="mt-1 text-sm text-gray-500">{task.description}</p>
              )}
              <div className="mt-2 text-sm text-gray-500">
                <p>{t('area')}: {task.area}</p>
                <p>{t('requestedBy')}: {task.requesting_area}</p>
              </div>
            </div>
          ))}
          {selectedDay && selectedDayTasks.length === 0 && (
            <p className="text-sm text-gray-500">{t('noTasksForDay')}</p>
          )}
        </div>
      </div>
    </div>
  );
}