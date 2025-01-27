/*
  # Set up storage for task documents
  
  1. Changes
    - Add storage bucket for task documents
    - Set up storage policies for authenticated users
  
  2. Security
    - Enable RLS for storage objects
    - Add policies for authenticated users to:
      - Read task documents
      - Upload task documents
      - Update their own documents
      - Delete their own documents
*/

-- Add storage bucket for task documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-documents', 'task-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Authenticated users can read task documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-documents');

CREATE POLICY "Authenticated users can upload task documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-documents');

CREATE POLICY "Users can update their own task documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'task-documents' AND owner = auth.uid())
WITH CHECK (bucket_id = 'task-documents' AND owner = auth.uid());

CREATE POLICY "Users can delete their own task documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-documents' AND owner = auth.uid());