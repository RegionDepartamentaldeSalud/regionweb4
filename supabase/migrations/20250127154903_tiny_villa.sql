-- Primero, crear una tabla temporal para respaldar los datos existentes
CREATE TEMP TABLE temp_digital_office_documents AS
SELECT * FROM digital_office_documents;

-- Eliminar los datos existentes
TRUNCATE digital_office_documents;

-- Eliminar la restricción existente
ALTER TABLE digital_office_documents 
DROP CONSTRAINT IF EXISTS digital_office_documents_uploaded_by_fkey;

-- Agregar la nueva restricción
ALTER TABLE digital_office_documents
ADD CONSTRAINT digital_office_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES profiles(id);

-- Restaurar los datos, pero solo aquellos donde el uploaded_by existe en profiles
INSERT INTO digital_office_documents
SELECT t.*
FROM temp_digital_office_documents t
WHERE EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = t.uploaded_by
);

-- Eliminar la tabla temporal
DROP TABLE temp_digital_office_documents;

-- Asegurar que las políticas RLS estén en su lugar
DROP POLICY IF EXISTS "Users can view all digital office documents" ON digital_office_documents;
DROP POLICY IF EXISTS "Users can upload digital office documents" ON digital_office_documents;

CREATE POLICY "Users can view all digital office documents"
  ON digital_office_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload digital office documents"
  ON digital_office_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);