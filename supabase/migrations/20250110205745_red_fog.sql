/*
  # Add Digital Office Documents

  1. New Tables
    - `digital_office_documents`
      - `id` (uuid, primary key)
      - `office_number_id` (uuid, references office_numbers)
      - `document_url` (text)
      - `document_name` (text)
      - `document_size` (integer)
      - `document_type` (text)
      - `uploaded_by` (uuid, references profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `digital_office_documents` table
    - Add policies for viewing and uploading documents
*/

CREATE TABLE IF NOT EXISTS digital_office_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_number_id uuid REFERENCES office_numbers(id) ON DELETE CASCADE,
  document_url text NOT NULL,
  document_name text NOT NULL,
  document_size integer NOT NULL,
  document_type text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE digital_office_documents ENABLE ROW LEVEL SECURITY;

-- Policies for digital_office_documents
CREATE POLICY "Users can view all digital office documents"
  ON digital_office_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload digital office documents"
  ON digital_office_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);