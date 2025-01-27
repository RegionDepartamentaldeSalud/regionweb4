/*
  # Create office numbers system

  1. New Tables
    - `office_numbers`
      - `id` (uuid, primary key)
      - `number` (integer, unique)
      - `subject` (text)
      - `used_by` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `office_numbers` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS office_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer UNIQUE NOT NULL,
  subject text NOT NULL,
  used_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE office_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all office numbers"
  ON office_numbers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create office numbers"
  ON office_numbers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = used_by);