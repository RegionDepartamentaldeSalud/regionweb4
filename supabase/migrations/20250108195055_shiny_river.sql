/*
  # Add document storage support for tasks

  1. Changes
    - Add document_url column to tasks table
    - Add document_name column to tasks table for original file names
    - Add document_size column to tasks table for file size tracking
    - Add document_type column to tasks table for MIME type

  2. Security
    - No changes to existing RLS policies needed as they already cover the new columns
*/

-- Add document-related columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS document_name text,
ADD COLUMN IF NOT EXISTS document_size integer,
ADD COLUMN IF NOT EXISTS document_type text;

-- Create an index on document_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_document_url ON tasks(document_url);

-- Add constraint to ensure document_size is within limits (5MB = 5242880 bytes)
ALTER TABLE tasks
ADD CONSTRAINT check_document_size 
CHECK (document_size IS NULL OR document_size <= 5242880);

-- Add constraint to ensure document_type is a valid MIME type
ALTER TABLE tasks
ADD CONSTRAINT check_document_type
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