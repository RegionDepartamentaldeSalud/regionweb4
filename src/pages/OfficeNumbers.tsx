import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Upload, X, Edit2, Trash2, Eye, ArrowRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface OfficeNumber {
  id: string;
  number: number;
  subject: string;
  used_by: string;
  created_at: string;
  document_url?: string;
  document_name?: string;
  document_size?: number;
  document_type?: string;
}

interface DigitalDocument {
  id: string;
  document_url: string;
  document_name: string;
  created_at: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export default function OfficeNumbers() {
  const [usedNumbers, setUsedNumbers] = React.useState<OfficeNumber[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = React.useState<number | null>(null);
  const [selectedDetails, setSelectedDetails] = React.useState<OfficeNumber | null>(null);
  const [subject, setSubject] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [digitalDocuments, setDigitalDocuments] = React.useState<Record<string, DigitalDocument[]>>({});
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (fn: () => Promise<any>, retries = MAX_RETRIES) => {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await delay(RETRY_DELAY);
        return fetchWithRetry(fn, retries - 1);
      }
      throw error;
    }
  };

  const fetchUsedNumbers = async () => {
    try {
      setError(null);
      const { data, error } = await fetchWithRetry(() => 
        supabase
          .from('office_numbers')
          .select('*')
          .order('number', { ascending: true })
      );

      if (error) throw error;
      if (data) {
        setUsedNumbers(data);
        
        // Fetch digital documents for each office number
        const documentsPromises = data.map(async (number) => {
          try {
            const { data: docs } = await fetchWithRetry(() =>
              supabase
                .from('digital_office_documents')
                .select('*')
                .eq('office_number_id', number.id)
            );
            
            if (docs) {
              setDigitalDocuments(prev => ({
                ...prev,
                [number.id]: docs
              }));
            }
          } catch (error) {
            console.error('Error fetching documents for number:', number.id, error);
          }
        });

        await Promise.all(documentsPromises);
      }
    } catch (error) {
      console.error('Error fetching numbers:', error);
      setError('Error al cargar los números de oficio. Por favor, intente de nuevo.');
      toast.error('Error al cargar los números de oficio');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsedNumbers();

    // Subscribe to changes in office_numbers
    const numbersSubscription = supabase
      .channel('office_numbers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'office_numbers'
        },
        () => {
          fetchUsedNumbers();
        }
      )
      .subscribe();

    // Subscribe to changes in digital_office_documents
    const documentsSubscription = supabase
      .channel('digital_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'digital_office_documents'
        },
        () => {
          fetchUsedNumbers();
        }
      )
      .subscribe();

    return () => {
      numbersSubscription.unsubscribe();
      documentsSubscription.unsubscribe();
    };
  }, []);

  const handleNumberClick = (number: number) => {
    const usedNumber = usedNumbers.find(n => n.number === number);
    if (usedNumber) {
      setSelectedDetails(usedNumber);
      setSubject(usedNumber.subject);
      setIsEditing(false);
    } else {
      setSelectedNumber(number);
      setSubject('');
    }
  };

  const handleUseNumber = async () => {
    if (!selectedNumber || !user || !subject.trim()) return;

    try {
      // Verificar si el número ya está en uso
      const { data: existingNumber } = await fetchWithRetry(() =>
        supabase
          .from('office_numbers')
          .select('id')
          .eq('number', selectedNumber)
          .maybeSingle()
      );

      if (existingNumber) {
        toast.error('Este número ya está en uso');
        return;
      }

      const { data, error } = await fetchWithRetry(() =>
        supabase
          .from('office_numbers')
          .insert({
            number: selectedNumber,
            subject: subject.trim(),
            used_by: user.id
          })
          .select()
          .single()
      );

      if (error) throw error;
      if (data) {
        setUsedNumbers(prev => [...prev, data]);
        toast.success('Número de oficio reservado exitosamente');
        setSelectedNumber(null);
        setSubject('');
      }
    } catch (error) {
      console.error('Error al reservar número:', error);
      toast.error('Error al reservar el número de oficio');
    }
  };

  const handleUpdateNumber = async () => {
    if (!selectedDetails || !user || !subject.trim()) return;

    try {
      const { data, error } = await fetchWithRetry(() =>
        supabase
          .from('office_numbers')
          .update({ subject: subject.trim() })
          .eq('id', selectedDetails.id)
          .select()
          .single()
      );

      if (error) throw error;
      if (data) {
        setUsedNumbers(prev => prev.map(num => 
          num.id === selectedDetails.id ? data : num
        ));
        setSelectedDetails(data);
        toast.success('Información actualizada exitosamente');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error al actualizar:', error);
      toast.error('Error al actualizar la información');
    }
  };

  const handleReleaseNumber = async () => {
    if (!selectedDetails || !user) return;

    try {
      if (selectedDetails.document_url) {
        const fileName = selectedDetails.document_url.split('/').pop();
        if (fileName) {
          await fetchWithRetry(() =>
            supabase.storage
              .from('office-documents')
              .remove([fileName])
          );
        }
      }

      const { error } = await fetchWithRetry(() =>
        supabase
          .from('office_numbers')
          .delete()
          .eq('id', selectedDetails.id)
      );

      if (error) throw error;

      setUsedNumbers(prev => prev.filter(num => num.id !== selectedDetails.id));
      toast.success('Número de oficio liberado exitosamente');
      setSelectedDetails(null);
      setSubject('');
      setIsEditing(false);
    } catch (error) {
      console.error('Error al liberar número:', error);
      toast.error('Error al liberar el número de oficio');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchUsedNumbers();
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </button>
      </div>
    );
  }

  const canEdit = selectedDetails && user && selectedDetails.used_by === user.id;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Números de Oficio</h1>
        <button
          onClick={() => navigate('/digital-office-documents')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Eye className="h-4 w-4 mr-2" />
          Ver Oficios Digitales
        </button>
      </div>

      {/* Grid of numbers */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {Array.from({ length: 500 }, (_, i) => i + 1).map(number => {
          const usedNumber = usedNumbers.find(n => n.number === number);
          const isUsed = !!usedNumber;
          const isOwnNumber = usedNumber?.used_by === user?.id;
          return (
            <button
              key={number}
              onClick={() => handleNumberClick(number)}
              className={`aspect-square flex items-center justify-center text-sm font-medium rounded-md ${
                isUsed
                  ? isOwnNumber
                    ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                  : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {number}
            </button>
          );
        })}
      </div>

      {/* Modal for number selection */}
      {selectedNumber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Reservar Número {selectedNumber}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Asunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Ingrese el asunto del oficio"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedNumber(null);
                    setSubject('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUseNumber}
                  disabled={!subject.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Utilizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for number details */}
      {selectedDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-semibold">Número de Oficio {selectedDetails.number}</h2>
              <button
                onClick={() => {
                  setSelectedDetails(null);
                  setSubject('');
                  setIsEditing(false);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Asunto</h3>
                {isEditing ? (
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1">{selectedDetails.subject}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Fecha de creación</h3>
                <p className="mt-1">{format(new Date(selectedDetails.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
              </div>
              
              {/* Add link to digital documents if they exist */}
              {digitalDocuments[selectedDetails.id]?.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700">Documentos Digitales</h3>
                  <div className="mt-2 space-y-2">
                    {digitalDocuments[selectedDetails.id].map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {doc.document_name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Add button to navigate to digital documents upload */}
              <button
                onClick={() => navigate('/digital-office-documents')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 w-full justify-center"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Ver todos los documentos digitales
              </button>

              {canEdit && (
                <div className="flex flex-col sm:flex-row gap-3">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar información
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setSubject(selectedDetails.subject);
                        }}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleUpdateNumber}
                        disabled={!subject.trim()}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Guardar cambios
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleReleaseNumber}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Liberar número
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}