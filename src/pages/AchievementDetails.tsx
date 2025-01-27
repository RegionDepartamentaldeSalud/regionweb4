import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
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

export default function AchievementDetails() {
  const { achievementId } = useParams();
  const navigate = useNavigate();
  const [achievement, setAchievement] = React.useState<Achievement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState<number | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    async function fetchAchievement() {
      try {
        const { data: achievementData, error: achievementError } = await supabase
          .from('achievements')
          .select('*')
          .eq('id', achievementId)
          .single();

        if (achievementError) throw achievementError;

        if (achievementData) {
          const { data: photos } = await supabase
            .from('achievement_photos')
            .select('*')
            .eq('achievement_id', achievementData.id)
            .order('photo_order');

          setAchievement({
            ...achievementData,
            photos: photos || []
          });
        }
      } catch (error) {
        console.error('Error fetching achievement:', error);
        toast.error('Error al cargar el logro');
        navigate('/achievements');
      } finally {
        setLoading(false);
      }
    }

    fetchAchievement();
  }, [achievementId, navigate]);

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
    setZoom(1);
    setRotation(0);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.5, 1));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setDragOffset({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      setZoom(prev => Math.max(1, Math.min(prev + delta, 3)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!achievement) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/achievements')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a Logros
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{achievement.title}</h1>
        <p className="text-gray-600 mb-6">{achievement.description}</p>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Fecha</h3>
            <p className="mt-1">{new Date(achievement.achievement_date).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Unidad</h3>
            <p className="mt-1">{achievement.unit}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Lugar</h3>
            <p className="mt-1">{achievement.location}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Fecha de registro</h3>
            <p className="mt-1">{new Date(achievement.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {achievement.photos.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Evidencia Fotográfica</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {achievement.photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => handlePhotoClick(index)}
                  className="aspect-square relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90"
                >
                  <img
                    src={photo.photo_url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Photo Modal */}
      {selectedPhotoIndex !== null && achievement.photos[selectedPhotoIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50">
          <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <div className="relative" style={{ margin: 'auto' }}>
              <img
                src={achievement.photos[selectedPhotoIndex].photo_url}
                alt={`Foto ${selectedPhotoIndex + 1}`}
                style={{
                  transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.2s',
                  cursor: zoom > 1 ? 'grab' : 'default',
                  maxHeight: '90vh',
                  maxWidth: '90vw',
                  objectFit: 'contain'
                }}
                className="pointer-events-auto"
                draggable="false"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <button
              onClick={handleZoomIn}
              className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              onClick={handleRotate}
              className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
            >
              <RotateCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setSelectedPhotoIndex(null);
                setZoom(1);
                setRotation(0);
                setDragOffset({ x: 0, y: 0 });
              }}
              className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {achievement.photos.map((_, index) => (
              <button
                key={index}
                onClick={() => handlePhotoClick(index)}
                className={`w-2 h-2 rounded-full ${
                  index === selectedPhotoIndex ? 'bg-white' : 'bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}