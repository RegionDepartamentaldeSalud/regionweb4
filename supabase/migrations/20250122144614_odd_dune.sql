/*
  # Fix office numbers permissions and references

  1. Changes
    - Drop existing foreign key constraint
    - Add new foreign key constraint to auth.users
    - Update existing records to ensure data consistency
    - Recreate policies with proper auth.uid() checks
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view all office numbers" ON office_numbers;
  DROP POLICY IF EXISTS "Users can create office numbers" ON office_numbers;
  DROP POLICY IF EXISTS "Users can update their own office numbers" ON office_numbers;
  DROP POLICY IF EXISTS "Users can delete their own office numbers" ON office_numbers;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Drop existing foreign key constraint if it exists
ALTER TABLE office_numbers 
DROP CONSTRAINT IF EXISTS office_numbers_used_by_fkey;

-- Add new foreign key constraint referencing auth.users
ALTER TABLE office_numbers
ADD CONSTRAINT office_numbers_used_by_fkey
FOREIGN KEY (used_by) REFERENCES auth.users(id);

-- Recreate policies with proper auth.uid() checks
CREATE POLICY "Users can view all office numbers"
  ON office_numbers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create office numbers"
  ON office_numbers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = used_by);

CREATE POLICY "Users can update their own office numbers"
  ON office_numbers FOR UPDATE
  TO authenticated
  USING (auth.uid() = used_by);

CREATE POLICY "Users can delete their own office numbers"
  ON office_numbers FOR DELETE
  TO authenticated
  USING (auth.uid() = used_by);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_office_numbers_used_by ON office_numbers(used_by);