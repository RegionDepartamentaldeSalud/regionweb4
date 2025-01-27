import React from 'react';

interface Translations {
  [key: string]: {
    es: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  dashboard: { es: 'Panel de Control', en: 'Dashboard' },
  tasks: { es: 'Tareas', en: 'Tasks' },
  calendar: { es: 'Calendario', en: 'Calendar' },
  settings: { es: 'Configuración', en: 'Settings' },
  signOut: { es: 'Cerrar Sesión', en: 'Sign Out' },
  
  // Task list
  newTask: { es: 'Nueva Tarea', en: 'New Task' },
  searchTasks: { es: 'Buscar tareas...', en: 'Search tasks...' },
  allStatus: { es: 'Todos los estados', en: 'All statuses' },
  allPriorities: { es: 'Todas las prioridades', en: 'All priorities' },
  allAreas: { es: 'Todas las áreas', en: 'All areas' },
  allSubAreas: { es: 'Todas las sub-áreas', en: 'All sub-areas' },
  requestedBy: { es: 'Solicitado por', en: 'Requested by' },
  
  // Calendar
  selectDate: { es: 'Seleccione una fecha', en: 'Select a date' },
  noTasksForDay: { es: 'No hay tareas para este día', en: 'No tasks for this day' },
  
  // Dashboard
  urgentTasks: { es: 'Tareas Urgentes', en: 'Urgent Tasks' },
  upcomingTasks: { es: 'Próximas Tareas', en: 'Upcoming Tasks' },
  noUrgentTasks: { es: 'No hay tareas urgentes', en: 'No urgent tasks' },
  noUpcomingTasks: { es: 'No hay próximas tareas', en: 'No upcoming tasks' },
  due: { es: 'Vence', en: 'Due' },
  
  // Settings
  account: { es: 'Cuenta', en: 'Account' },
  theme: { es: 'Tema', en: 'Theme' },
  language: { es: 'Idioma', en: 'Language' },
  terms: { es: 'Términos', en: 'Terms' },
  spanish: { es: 'Español', en: 'Spanish' },
  english: { es: 'Inglés', en: 'English' },
  
  // Document handling
  document: { es: 'Documento', en: 'Document' },
  selectFile: { es: 'Seleccionar archivo', en: 'Select file' },
  remove: { es: 'Eliminar', en: 'Remove' },
  fileRestrictions: { 
    es: 'Formatos permitidos: PDF, DOC, DOCX, JPG, JPEG, PNG. Tamaño máximo: 5MB', 
    en: 'Allowed formats: PDF, DOC, DOCX, JPG, JPEG, PNG. Maximum size: 5MB' 
  },
  fileTooLarge: {
    es: 'El archivo es demasiado grande. Máximo 5MB.',
    en: 'File is too large. Maximum 5MB.'
  },
  viewDocument: { es: 'Ver documento', en: 'View document' },
  updateDocument: { es: 'Actualizar documento', en: 'Update document' },
  uploading: { es: 'Subiendo...', en: 'Uploading...' },
  documentUpdated: { es: 'Documento actualizado', en: 'Document updated' },
  errorUpdatingDocument: { 
    es: 'Error al actualizar el documento', 
    en: 'Error updating document' 
  },
  
  // Task operations
  taskCreated: { es: 'Tarea creada exitosamente', en: 'Task created successfully' },
  errorCreating: { es: 'Error al crear la tarea', en: 'Error creating task' },
  back: { es: 'Volver', en: 'Back' },
  taskDetails: { es: 'Detalles de la tarea', en: 'Task details' },
  title: { es: 'Título', en: 'Title' },
  status: { es: 'Estado', en: 'Status' },
  priority: { es: 'Prioridad', en: 'Priority' },
  dueDate: { es: 'Fecha de vencimiento', en: 'Due date' },
  description: { es: 'Descripción', en: 'Description' },
  area: { es: 'Área', en: 'Area' },
  subArea: { es: 'Sub-área', en: 'Sub-area' },
  assignedTo: { es: 'Asignado a', en: 'Assigned to' },
  createdBy: { es: 'Creado por', en: 'Created by' },
  createdAt: { es: 'Fecha de creación', en: 'Created at' },
  lastUpdated: { es: 'Última actualización', en: 'Last updated' },
  
  // Actions
  save: { es: 'Guardar', en: 'Save' },
  updating: { es: 'Actualizando...', en: 'Updating...' },
  cancel: { es: 'Cancelar', en: 'Cancel' },
  creating: { es: 'Creando...', en: 'Creating...' },
  
  // Status options
  pending: { es: 'Pendiente', en: 'Pending' },
  inProgress: { es: 'En progreso', en: 'In progress' },
  completed: { es: 'Completado', en: 'Completed' },
  
  // Priority levels
  high: { es: 'Alta', en: 'High' },
  medium: { es: 'Media', en: 'Medium' },
  low: { es: 'Baja', en: 'Low' },
  
  // Error messages
  errorLoading: { es: 'Error al cargar la tarea', en: 'Error loading task' },
  errorUpdating: { es: 'Error al actualizar la tarea', en: 'Error updating task' },
  taskUpdated: { es: 'Tarea actualizada exitosamente', en: 'Task updated successfully' },
  
  // Notifications
  notifications: { es: 'Notificaciones', en: 'Notifications' },
  noNotifications: { es: 'No hay notificaciones', en: 'No notifications' },

  // Office Database
  officeDatabase: { es: 'Base de Datos de Oficios', en: 'Office Database' },
  uploadDocument: { es: 'Subir Documento', en: 'Upload Document' },
  selectCategory: { es: 'Selecciona una categoría', en: 'Select a category' }
};

interface LanguageContextType {
  language: 'es' | 'en';
  setLanguage: (lang: 'es' | 'en') => void;
  t: (key: string) => string;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = React.useState<'es' | 'en'>('es');

  const t = React.useCallback((key: string): string => {
    return translations[key]?.[language] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}