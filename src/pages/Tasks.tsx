import React from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import { useLanguage } from '../contexts/LanguageContext';
import type { Database } from '../lib/supabase/types';
import TaskModal from '../components/TaskModal';

type Task = Database['public']['Tables']['tasks']['Row'];

const AREAS = {
  'Contabilidad': ['Contabilidad', 'Fondos Recuperados Ingresos', 'Fondos Recuperados Egresos'],
  'Fondos Nacionales': ['Compras', 'Viaticos'],
  'Fondos Externos': ['Vicit', 'TB'],
  'Servicios Generales': ['Mantenimiento', 'Aseo', 'Vigilancia', 'Transporte'],
  'Bienes Nacionales': ['Andres', 'Inspectores']
} as const;

type Area = keyof typeof AREAS;

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [areaFilter, setAreaFilter] = React.useState<string>('all');
  const [subAreaFilter, setSubAreaFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const { t } = useLanguage();

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesArea = areaFilter === 'all' || task.area === areaFilter;
    const matchesSubArea = subAreaFilter === 'all' || task.requesting_area === subAreaFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesArea && matchesSubArea && matchesPriority;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('tasks')}</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('newTask')}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder={t('searchTasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters - Desktop */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t('allStatus')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="in_progress">{t('inProgress')}</option>
            <option value="completed">{t('completed')}</option>
          </select>

          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">{t('allPriorities')}</option>
            <option value="high">{t('high')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="low">{t('low')}</option>
          </select>

          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              setSubAreaFilter('all');
            }}
          >
            <option value="all">{t('allAreas')}</option>
            {Object.keys(AREAS).map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          {areaFilter !== 'all' && (
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={subAreaFilter}
              onChange={(e) => setSubAreaFilter(e.target.value)}
            >
              <option value="all">{t('allSubAreas')}</option>
              {AREAS[areaFilter as Area].map((subArea) => (
                <option key={subArea} value={subArea}>
                  {subArea}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filters - Mobile */}
        {showFilters && (
          <div className="sm:hidden space-y-4">
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('allStatus')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="in_progress">{t('inProgress')}</option>
              <option value="completed">{t('completed')}</option>
            </select>

            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">{t('allPriorities')}</option>
              <option value="high">{t('high')}</option>
              <option value="medium">{t('medium')}</option>
              <option value="low">{t('low')}</option>
            </select>

            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={areaFilter}
              onChange={(e) => {
                setAreaFilter(e.target.value);
                setSubAreaFilter('all');
              }}
            >
              <option value="all">{t('allAreas')}</option>
              {Object.keys(AREAS).map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            {areaFilter !== 'all' && (
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={subAreaFilter}
                onChange={(e) => setSubAreaFilter(e.target.value)}
              >
                <option value="all">{t('allSubAreas')}</option>
                {AREAS[areaFilter as Area].map((subArea) => (
                  <option key={subArea} value={subArea}>
                    {subArea}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <li 
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-medium text-gray-900 mb-2 sm:mb-0">{task.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-blue-100 text-blue-800'}`}>
                      {t(task.priority)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        task.status === 'in_progress' ? 'bg-purple-100 text-purple-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {t(task.status === 'in_progress' ? 'inProgress' : task.status)}
                    </span>
                  </div>
                </div>
                {task.description && (
                  <p className="mt-2 text-sm text-gray-500">{task.description}</p>
                )}
                <div className="mt-2 flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
                  <p className="text-sm text-gray-500">
                    {t('area')}: {task.area}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('requestedBy')}: {task.requesting_area}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={fetchTasks}
      />
    </div>
  );
}