import React from 'react';
import { Plus, X, Upload, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Achievement {
  id: string;
  title: string;
  description: string;
  achievement_date: string;
  unit: string;
  location: string;
  created_at: string;
  photos: {
    id: string;
    photo_url: string;
    photo_order: number;
  }[];
}

export default function Achievements() {
  const [achievements, setAchievements] = React.useState<Achievement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchAchievements = async () => {
    try {
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('achievement_date', { ascending: false });

      if (achievementsError) throw achievementsError;

      if (achievementsData) {
        const achievementsWithPhotos = await Promise.all(
          achievementsData.map(async (achievement) => {
            const { data: photos } = await supabase
              .from('achievement_photos')
              .select('*')
              .eq('achievement_id', achievement.id)
              .order('photo_order');

            return {
              ...achievement,
              photos: photos || []
            };
          })
        );

        setAchievements(achievementsWithPhotos);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast.error('Error al cargar los logros');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAchievements();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    
    const files = Array.from(event.target.files);
    const totalFiles = selectedFiles.length + files.length;
    
    if (totalFiles > 10) {
      toast.error('Máximo 10 fotos permitidas');
      return;
    }

    // Validate file sizes
    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error('Algunas imágenes exceden el límite de 5MB');
      return;
    }

    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    setUploading(true);
    try {
      // Create achievement
      const { data: achievement, error: achievementError } = await supabase
        .from('achievements')
        .insert({
          title: formData.get('title'),
          description: formData.get('description'),
          achievement_date: formData.get('date'),
          unit: formData.get('unit'),
          location: formData.get('location'),
          created_by: user.id
        })
        .select()
        .single();

      if (achievementError) throw achievementError;

      // Upload photos
      const photoUploads = selectedFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${achievement.id}-${index}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('achievement-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('achievement-photos')
          .getPublicUrl(fileName);

        return supabase
          .from('achievement_photos')
          .insert({
            achievement_id: achievement.id,
            photo_url: publicUrl,
            photo_order: index
          });
      });

      await Promise.all(photoUploads);

      toast.success('Logro registrado exitosamente');
      setShowModal(false);
      setSelectedFiles([]);
      fetchAchievements();
    } catch (error) {
      console.error('Error creating achievement:', error);
      toast.error('Error al registrar el logro');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Logros de la Institución</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Logro
        </button>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            onClick={() => navigate(`/achievements/${achievement.id}`)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
          >
            {achievement.photos.length > 0 && (
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                <img
                  src={achievement.photos[0].photo_url}
                  alt={achievement.title}
                  className="w-full h-full object-cover"
                />
                {achievement.photos.length > 1 && (
                  <span className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium text-white bg-black bg-opacity-50 rounded">
                    +{achievement.photos.length - 1} fotos
                  </span>
                )}
              </div>
            )}
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {achievement.title}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {achievement.description}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Fecha: {new Date(achievement.achievement_date).toLocaleDateString()}</p>
                <p>Unidad: {achievement.unit}</p>
                <p>Lugar: {achievement.location}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Achievement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">Registrar Nuevo Logro</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedFiles([]);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Título
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
                  Descripción
                </label>
                <textarea
                  name="description"
                  rows={3}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fecha
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unidad
                </label>
                <input
                  type="text"
                  name="unit"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Lugar
                </label>
                <input
                  type="text"
                  name="location"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Evidencia Fotográfica
                </label>
                <div className="mt-2 space-y-4">
                  {/* Selected files preview */}
                  {selectedFiles.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload button */}
                  {selectedFiles.length < 10 && (
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <Upload className="h-4 w-4 mr-2" />
                      {selectedFiles.length === 0 ? 'Subir fotos' : 'Añadir más fotos'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*"
                        multiple
                      />
                    </label>
                  )}
                  <p className="text-xs text-gray-500">
                    Máximo 10 fotos. Cada foto debe ser menor a 5MB.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedFiles([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}