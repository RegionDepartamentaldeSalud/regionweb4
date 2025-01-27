-- Drop the existing foreign key constraint
ALTER TABLE office_documents 
DROP CONSTRAINT IF EXISTS office_documents_uploaded_by_fkey;

-- Add new foreign key constraint referencing auth.users
ALTER TABLE office_documents
ADD CONSTRAINT office_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);

-- Ensure RLS policies are still in place
DROP POLICY IF EXISTS "Users can view all office documents" ON office_documents;
DROP POLICY IF EXISTS "Users can upload office documents" ON office_documents;

CREATE POLICY "Users can view all office documents"
  ON office_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload office documents"
  ON office_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);