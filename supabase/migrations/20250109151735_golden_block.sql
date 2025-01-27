/*
  # Add document support to office numbers

  1. Changes
    - Add document_url column to office_numbers table
    - Add document_name column for original file names
    - Add document_type column for MIME types
    - Add document_size column with size limit check
*/

-- Add document-related columns to office_numbers table
ALTER TABLE office_numbers
ADD COLUMN document_url text,
ADD COLUMN document_name text,
ADD COLUMN document_size integer,
ADD COLUMN document_type text;

-- Create an index on document_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_office_numbers_document_url 
ON office_numbers(document_url);

-- Add constraint to ensure document_size is within limits (5MB = 5242880 bytes)
ALTER TABLE office_numbers
ADD CONSTRAINT check_office_document_size 
CHECK (document_size IS NULL OR document_size <= 5242880);

-- Add constraint to ensure document_type is a valid MIME type
ALTER TABLE office_numbers
ADD CONSTRAINT check_office_document_type
CHECK (
  document_type IS NULL OR
  document_type IN (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  )
);