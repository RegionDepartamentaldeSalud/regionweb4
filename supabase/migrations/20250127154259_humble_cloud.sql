-- Función para extraer número de oficio del título
CREATE OR REPLACE FUNCTION extract_office_number(title text)
RETURNS integer AS $$
DECLARE
  number_match text;
BEGIN
  -- Busca un patrón como "Oficio 38" o "38 ADMON"
  number_match := regexp_replace(title, '^.*?(\d+).*$', '\1');
  
  -- Intenta convertir a número
  BEGIN
    RETURN number_match::integer;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para vincular documento con número de oficio
CREATE OR REPLACE FUNCTION link_admin_document()
RETURNS trigger AS $$
DECLARE
  admin_subcategory_id uuid;
  office_number_id uuid;
  extracted_number integer;
BEGIN
  -- Obtener ID de la subcategoría "Administración"
  SELECT s.id INTO admin_subcategory_id
  FROM office_subcategories s
  JOIN office_categories c ON s.category_id = c.id
  WHERE c.name = 'REGION' AND s.name = 'Administración';

  -- Si el documento es de Administración
  IF NEW.subcategory_id = admin_subcategory_id THEN
    -- Extraer número de oficio del título
    extracted_number := extract_office_number(NEW.title);
    
    IF extracted_number IS NOT NULL THEN
      -- Buscar el número de oficio correspondiente
      SELECT id INTO office_number_id
      FROM office_numbers
      WHERE number = extracted_number;
      
      -- Si existe el número de oficio, crear entrada en digital_office_documents
      IF office_number_id IS NOT NULL THEN
        -- Primero eliminar la restricción existente si existe
        ALTER TABLE digital_office_documents 
        DROP CONSTRAINT IF EXISTS digital_office_documents_uploaded_by_fkey;
        
        -- Agregar la nueva restricción que apunta a auth.users
        ALTER TABLE digital_office_documents
        ADD CONSTRAINT digital_office_documents_uploaded_by_fkey
        FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);
        
        INSERT INTO digital_office_documents (
          office_number_id,
          document_url,
          document_name,
          document_size,
          document_type,
          uploaded_by,
          created_at
        ) VALUES (
          office_number_id,
          NEW.document_url,
          NEW.title,
          0, -- Default size since we can't get it from the original document
          'image/jpeg', -- Default type since we only allow JPG/JPEG
          NEW.uploaded_by,
          NEW.created_at
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para vincular documentos
DROP TRIGGER IF EXISTS trigger_link_admin_document ON office_documents;
CREATE TRIGGER trigger_link_admin_document
  AFTER INSERT ON office_documents
  FOR EACH ROW
  EXECUTE FUNCTION link_admin_document();

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_office_documents_subcategory 
ON office_documents(subcategory_id);

CREATE INDEX IF NOT EXISTS idx_office_numbers_number 
ON office_numbers(number);