import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Upload, X, Eye, Search, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Database } from '../lib/supabase/types';

type Category = Database['public']['Tables']['office_categories']['Row'];
type Subcategory = Database['public']['Tables']['office_subcategories']['Row'];
type Document = Database['public']['Tables']['office_documents']['Row'];

interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

const HighlightText = ({ text, searchQuery }: { text: string; searchQuery: string }) => {
  if (!searchQuery.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={i} className="bg-green-200 text-gray-900">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export default function OfficeDatabase() {
  const [categories, setCategories] = React.useState<CategoryWithSubcategories[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = React.useState<Subcategory | null>(null);
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [inspectingDocument, setInspectingDocument] = React.useState<Document | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('office_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      const categoriesWithSubs = await Promise.all(
        categoriesData.map(async (category) => {
          const { data: subcategories, error: subError } = await supabase
            .from('office_subcategories')
            .select('*')
            .eq('category_id', category.id)
            .order('name');

          if (subError) throw subError;

          return {
            ...category,
            subcategories: subcategories || []
          };
        })
      );

      setCategories(categoriesWithSubs);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (subcategoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('office_documents')
        .select('*')
        .eq('subcategory_id', subcategoryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error al cargar los documentos');
    }
  };

  React.useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubcategoryClick = async (subcategory: Subcategory) => {
    setSelectedSubcategory(subcategory);
    await fetchDocuments(subcategory.id);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('El archivo es demasiado grande. Máximo 5MB');
        return;
      }
      setSelectedFile(file);
      
      // Si el título está vacío, usar el nombre del archivo sin extensión
      if (!title) {
        const fileName = file.name.split('.').slice(0, -1).join('.');
        setTitle(fileName);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedSubcategory || !user) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('office-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('office-documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('office_documents')
        .insert({
          subcategory_id: selectedSubcategory.id,
          title,
          description,
          document_url: publicUrl,
          uploaded_by: user.id
        });

      if (insertError) throw insertError;

      toast.success('Documento subido exitosamente');
      setShowUploadModal(false);
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      fetchDocuments(selectedSubcategory.id);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir el documento');
    } finally {
      setUploading(false);
    }
  };

  const handleInspect = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setInspectingDocument(doc);
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

  // Filtrar documentos basado en la búsqueda
  const filteredDocuments = React.useMemo(() => {
    if (!searchQuery.trim()) return documents;
    
    const query = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(query) ||
      (doc.description?.toLowerCase().includes(query) ?? false)
    );
  }, [documents, searchQuery]);

  // Keyboard shortcut para la búsqueda
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl font-bold text-gray-900">Base de Datos de Oficios</h1>
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64 lg:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar documentos... (Ctrl + K)"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-500" />
              </button>
            )}
          </div>
          {selectedSubcategory && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow-sm">
              <button
                onClick={() => setExpandedCategory(
                  expandedCategory === category.id ? null : category.id
                )}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{category.name}</span>
                {expandedCategory === category.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {expandedCategory === category.id && (
                <div className="border-t">
                  {category.subcategories.map((subcategory) => (
                    <button
                      key={subcategory.id}
                      onClick={() => handleSubcategoryClick(subcategory)}
                      className={`w-full px-6 py-2 text-left text-sm hover:bg-gray-50 ${
                        selectedSubcategory?.id === subcategory.id
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600'
                      }`}
                    >
                      {subcategory.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Documents Grid */}
        <div className="lg:col-span-2">
          {selectedSubcategory ? (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">
                Documentos de {selectedSubcategory.name}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">
                        <HighlightText text={doc.title} searchQuery={searchQuery} />
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="p-1 text-gray-400 hover:text-gray-500"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-gray-500 mb-2">
                        <HighlightText text={doc.description} searchQuery={searchQuery} />
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Fecha: {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {filteredDocuments.length === 0 && (
                  <p className="text-gray-500 col-span-2 text-center py-4">
                    No se encontraron documentos que coincidan con la búsqueda
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              Selecciona una subcategoría para ver los documentos
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedSubcategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Subir documento a {selectedSubcategory.name}
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Documento
                </label>
                <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-indigo-500">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <span className="relative rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                        {selectedFile ? selectedFile.name : 'Seleccionar archivo'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      JPG o JPEG hasta 5MB
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg"
                    required
                  />
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : 'Subir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">
                {selectedDocument.title}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => handleInspect(selectedDocument, e)}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={selectedDocument.document_url}
                alt={selectedDocument.title}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-4 text-sm text-gray-500">
              {selectedDocument.description && (
                <p className="mb-2">{selectedDocument.description}</p>
              )}
              <p>Fecha: {new Date(selectedDocument.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Image Inspection Modal */}
      {inspectingDocument && (
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
                src={inspectingDocument.document_url}
                alt={inspectingDocument.title}
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
                setInspectingDocument(null);
                setZoom(1);
                setRotation(0);
                setDragOffset({ x: 0, y: 0 });
              }}
              className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}