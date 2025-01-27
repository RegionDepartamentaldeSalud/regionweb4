import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Eye, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface DigitalDocument {
  id: string;
  office_number_id: string;
  document_url: string;
  document_name: string;
  document_size: number;
  document_type: string;
  uploaded_by: string;
  created_at: string;
  office_number?: {
    number: number;
    subject: string;
  };
  uploader?: {
    full_name: string;
    email: string;
  };
}

export default function DigitalOfficeDocuments() {
  const [documents, setDocuments] = React.useState<DigitalDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [selectedDocument, setSelectedDocument] = React.useState<DigitalDocument | null>(null);
  const [officeNumber, setOfficeNumber] = React.useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchDocuments = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('digital_office_documents')
        .select(`
          *,
          office_number:office_numbers(number, subject),
          uploader:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error al cargar los documentos');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDocuments();

    // Subscribe to changes
    const subscription = supabase
      .channel('digital_office_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'digital_office_documents'
        },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchDocuments]);

  const validateOfficeNumber = async (number: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('office_numbers')
        .select('id')
        .eq('number', parseInt(number))
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error validating office number:', error);
      return null;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !user) return;

    const file = event.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    if (!officeNumber.trim()) {
      toast.error('Por favor, ingrese un número de oficio');
      return;
    }

    const officeNumberId = await validateOfficeNumber(officeNumber);
    if (!officeNumberId) {
      toast.error('Número de oficio no válido');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('office-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('office-documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('digital_office_documents')
        .insert({
          office_number_id: officeNumberId,
          document_url: publicUrl,
          document_name: file.name,
          document_size: file.size,
          document_type: file.type,
          uploaded_by: user.id
        });

      if (insertError) throw insertError;

      toast.success('Documento subido exitosamente');
      setShowUploadModal(false);
      setOfficeNumber('');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir el documento');
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
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/office-numbers')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a Números de Oficio
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Oficios Admon Digitales</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Subir Documento
        </button>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Oficio #{doc.office_number?.number}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedDocument(doc)}
                    className="p-1 text-gray-400 hover:text-gray-500"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <a
                    href={doc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-500"
                  >
                    <LinkIcon className="h-5 w-5" />
                  </a>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-2">{doc.office_number?.subject}</p>
              <div className="text-xs text-gray-500">
                <p>Subido por: {doc.uploader?.full_name || doc.uploader?.email}</p>
                <p>Fecha: {new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Subir Documento Digital</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número de Oficio
                </label>
                <input
                  type="number"
                  value={officeNumber}
                  onChange={(e) => setOfficeNumber(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Ingrese el número de oficio"
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
                        {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, JPG, JPEG o PNG hasta 5MB
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setOfficeNumber('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">
                Oficio #{selectedDocument.office_number?.number}
              </h2>
              <button
                onClick={() => setSelectedDocument(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
              {selectedDocument.document_type.startsWith('image/') ? (
                <img
                  src={selectedDocument.document_url}
                  alt={`Oficio ${selectedDocument.office_number?.number}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={selectedDocument.document_url}
                  className="w-full h-full"
                  title={`Oficio ${selectedDocument.office_number?.number}`}
                />
              )}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>Asunto: {selectedDocument.office_number?.subject}</p>
              <p>Subido por: {selectedDocument.uploader?.full_name || selectedDocument.uploader?.email}</p>
              <p>Fecha: {new Date(selectedDocument.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}