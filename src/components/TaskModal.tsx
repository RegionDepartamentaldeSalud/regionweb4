import React from 'react';
import { X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import type { Database } from '../lib/supabase/types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

type Profile = Database['public']['Tables']['profiles']['Row'];

const AREAS = {
  'Contabilidad': ['Contabilidad', 'Fondos Recuperados Ingresos', 'Fondos Recuperados Egresos'],
  'Fondos Nacionales': ['Compras', 'Viaticos'],
  'Fondos Externos': ['Vicit', 'TB'],
  'Servicios Generales': ['Mantenimiento', 'Aseo', 'Vigilancia', 'Transporte'],
  'Bienes Nacionales': ['Andres', 'Inspectores']
} as const;

type Area = keyof typeof AREAS;

export default function TaskModal({ isOpen, onClose, onTaskCreated }: TaskModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = React.useState(false);
  const [selectedArea, setSelectedArea] = React.useState<Area>('Contabilidad');
  const [assignedToInput, setAssignedToInput] = React.useState('');
  const [assignedToId, setAssignedToId] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<Profile[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchUsers = React.useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(5);

    if (!error && data) {
      setSuggestions(data);
    }
  }, []);

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!assignedToId) { // Solo buscar si no hay un ID seleccionado
        searchUsers(assignedToInput);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [assignedToInput, assignedToId, searchUsers]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(t('fileTooLarge'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;
    
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('task-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-documents')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    setLoading(true);
    try {
      let documentUrl = null;
      if (selectedFile) {
        documentUrl = await uploadFile();
      }

      const { error } = await supabase.from('tasks').insert({
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        due_date: formData.get('due_date') as string,
        priority: formData.get('priority') as 'high' | 'medium' | 'low',
        status: formData.get('status') as 'pending' | 'in_progress' | 'completed',
        area: formData.get('area') as string,
        requesting_area: formData.get('requesting_area') as string,
        assigned_to: assignedToId, // Usar el ID almacenado
        created_by: user.id,
        document_url: documentUrl
      });

      if (error) throw error;
      
      toast.success(t('taskCreated'));
      onTaskCreated();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(t('errorCreating'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{t('newTask')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('title')}
            </label>
            <input
              type="text"
              name="title"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('description')}
            </label>
            <textarea
              name="description"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('dueDate')}
            </label>
            <input
              type="datetime-local"
              name="due_date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('priority')}
            </label>
            <select
              name="priority"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="high">{t('high')}</option>
              <option value="medium">{t('medium')}</option>
              <option value="low">{t('low')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('status')}
            </label>
            <select
              name="status"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="pending">{t('pending')}</option>
              <option value="in_progress">{t('inProgress')}</option>
              <option value="completed">{t('completed')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('area')}
            </label>
            <select
              name="area"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value as Area)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {Object.keys(AREAS).map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('subArea')}
            </label>
            <select
              name="requesting_area"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {AREAS[selectedArea].map((subArea) => (
                <option key={subArea} value={subArea}>
                  {subArea}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('assignedTo')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={assignedToInput}
                onChange={(e) => {
                  setAssignedToInput(e.target.value);
                  setAssignedToId(null); // Limpiar el ID cuando el usuario empieza a escribir
                  setShowSuggestions(true);
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder={t('searchUsers')}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-sm"
                >
                  {suggestions.map((profile) => (
                    <div
                      key={profile.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setAssignedToInput(profile.full_name || profile.email);
                        setAssignedToId(profile.id); // Guardar el ID del usuario seleccionado
                        setShowSuggestions(false);
                      }}
                    >
                      {profile.full_name || profile.email}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('document')}
            </label>
            <div className="mt-1 flex items-center">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Upload className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : t('selectFile')}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="ml-2 text-sm text-red-600 hover:text-red-700"
                >
                  {t('remove')}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {t('fileRestrictions')}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading || uploading ? t('creating') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}