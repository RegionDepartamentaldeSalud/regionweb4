-- Add storage bucket for office documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('office-documents', 'office-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Authenticated users can read office documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'office-documents');

CREATE POLICY "Authenticated users can upload office documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'office-documents');

CREATE POLICY "Users can update their own office documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'office-documents' AND owner = auth.uid())
WITH CHECK (bucket_id = 'office-documents' AND owner = auth.uid());

CREATE POLICY "Users can delete their own office documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'office-documents' AND owner = auth.uid());