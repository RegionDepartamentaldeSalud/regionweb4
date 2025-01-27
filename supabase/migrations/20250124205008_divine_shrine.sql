-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  achievement_date date NOT NULL,
  unit text NOT NULL,
  location text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create achievement photos table
CREATE TABLE IF NOT EXISTS achievement_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  photo_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_photos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create achievements"
  ON achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view all achievement photos"
  ON achievement_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create achievement photos"
  ON achievement_photos FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM achievements
    WHERE id = achievement_id AND created_by = auth.uid()
  ));

-- Add storage bucket for achievement photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('achievement-photos', 'achievement-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for achievement photos
CREATE POLICY "Authenticated users can read achievement photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'achievement-photos');

CREATE POLICY "Authenticated users can upload achievement photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'achievement-photos');