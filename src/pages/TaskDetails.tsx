import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ArrowLeft, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Database } from '../lib/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

const AREAS = {
  'Contabilidad': ['Contabilidad', 'Fondos Recuperados Ingresos', 'Fondos Recuperados Egresos'],
  'Fondos Nacionales': ['Compras', 'Viaticos'],
  'Fondos Externos': ['Vicit', 'TB'],
  'Servicios Generales': ['Mantenimiento', 'Aseo', 'Vigilancia', 'Transporte'],
  'Bienes Nacionales': ['Andres', 'Inspectores']
} as const;

type Area = keyof typeof AREAS;

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [task, setTask] = React.useState<Task | null>(null);
  const [creator, setCreator] = React.useState<Profile | null>(null);
  const [assignee, setAssignee] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);
  const [selectedArea, setSelectedArea] = React.useState<Area>('Contabilidad');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Define canEdit based on user permissions
  const canEdit = React.useMemo(() => {
    if (!user || !task) return false;
    return user.id === task.created_by || user.id === task.assigned_to;
  }, [user, task]);

  React.useEffect(() => {
    if (task) {
      setSelectedArea(task.area as Area);
    }
  }, [task]);

  React.useEffect(() => {
    async function fetchTaskAndUsers() {
      if (!taskId || !UUID_REGEX.test(taskId)) {
        toast.error('Invalid task ID');
        navigate('/tasks');
        return;
      }

      try {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (taskError) throw taskError;

        if (taskData) {
          setTask(taskData);
          setSelectedArea(taskData.area as Area);

          // Fetch creator
          if (taskData.created_by) {
            const { data: creatorData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', taskData.created_by)
              .single();
            
            if (creatorData) setCreator(creatorData);
          }

          // Fetch assignee if exists
          if (taskData.assigned_to) {
            const { data: assigneeData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', taskData.assigned_to)
              .single();
            
            if (assigneeData) setAssignee(assigneeData);
          }
        }
      } catch (error) {
        console.error('Error loading task:', error);
        toast.error(t('errorLoading'));
        navigate('/tasks');
      } finally {
        setLoading(false);
      }
    }

    fetchTaskAndUsers();
  }, [taskId, navigate, t]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !task) return;

    const file = event.target.files[0];
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error(t('fileTooLarge'));
      return;
    }

    setSelectedFile(file);
    setUploading(true);

    try {
      // Delete existing file if there is one
      if (task.document_url) {
        const existingFileName = task.document_url.split('/').pop();
        if (existingFileName) {
          await supabase.storage
            .from('task-documents')
            .remove([existingFileName]);
        }
      }

      // Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${task.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('task-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-documents')
        .getPublicUrl(fileName);

      // Update task with new document URL
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ document_url: publicUrl })
        .eq('id', task.id);

      if (updateError) throw updateError;

      // Update local task state
      setTask(prev => prev ? { ...prev, document_url: publicUrl } : null);
      toast.success(t('documentUpdated'));
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error(t('errorUpdatingDocument'));
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!task || !taskId || !UUID_REGEX.test(taskId)) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    setUpdating(true);
    try {
      const updateData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        due_date: formData.get('due_date') as string,
        priority: formData.get('priority') as 'high' | 'medium' | 'low',
        status: formData.get('status') as 'pending' | 'in_progress' | 'completed',
        area: formData.get('area') as string,
        requesting_area: formData.get('requesting_area') as string,
        assigned_to: task.assigned_to
      };

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success(t('taskUpdated'));
      
      // Refresh task data
      const { data: updatedTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
        
      if (updatedTask) {
        setTask(updatedTask);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(t('errorUpdating'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tasks')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('back')}
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{t('taskDetails')}</h1>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg divide-y divide-gray-200">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('title')}</label>
              <input
                type="text"
                name="title"
                defaultValue={task.title}
                required
                disabled={!canEdit}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('status')}</label>
              <select
                name="status"
                defaultValue={task.status}
                required
                disabled={!canEdit}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="pending">{t('pending')}</option>
                <option value="in_progress">{t('inProgress')}</option>
                <option value="completed">{t('completed')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('priority')}</label>
              <select
                name="priority"
                defaultValue={task.priority}
                required
                disabled={!canEdit}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="high">{t('high')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="low">{t('low')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('dueDate')}</label>
              <input
                type="datetime-local"
                name="due_date"
                defaultValue={task.due_date.slice(0, 16)}
                required
                disabled={!canEdit}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t('description')}</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={task.description || ''}
                disabled={!canEdit}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('area')}</label>
              <select
                name="area"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value as Area)}
                required
                disabled={!canEdit}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              >
                {Object.keys(AREAS).map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('subArea')}</label>
              <select
                name="requesting_area"
                defaultValue={task.requesting_area}
                required
                disabled={!canEdit}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              >
                {AREAS[selectedArea].map((subArea) => (
                  <option key={subArea} value={subArea}>
                    {subArea}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('assignedTo')}</label>
              <input
                type="text"
                name="assigned_to"
                defaultValue={assignee?.full_name || assignee?.email || ''}
                disabled={!canEdit}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Document section */}
        {canEdit && (
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('document')}
            </label>
            <div className="flex items-center space-x-4">
              {task.document_url && (
                <a
                  href={task.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {t('viewDocument')}
                </a>
              )}
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? t('uploading') : t('updateDocument')}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {t('fileRestrictions')}
            </p>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500">
          <div className="flex flex-col space-y-2">
            <p>
              {t('createdBy')}: {creator?.full_name || creator?.email}
            </p>
            <p>
              {t('createdAt')}: {format(new Date(task.created_at), 'PPpp', { locale: language === 'es' ? es : enUS })}
            </p>
            <p>
              {t('lastUpdated')}: {format(new Date(task.updated_at), 'PPpp', { locale: language === 'es' ? es : enUS })}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="px-6 py-4 bg-gray-50 flex justify-end">
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {updating ? t('updating') : t('save')}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}