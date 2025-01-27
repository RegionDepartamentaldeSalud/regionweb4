/*
  # Office Database Structure

  1. New Tables
    - `office_categories` - Main categories (REGION, MUNICIPIOS, OTROS)
    - `office_subcategories` - Subcategories for each main category
    - `office_documents` - Documents stored in each subcategory
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create enum for main categories
CREATE TYPE office_category_type AS ENUM ('REGION', 'MUNICIPIOS', 'OTROS');

-- Create office categories table
CREATE TABLE IF NOT EXISTS office_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name office_category_type NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create office subcategories table
CREATE TABLE IF NOT EXISTS office_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES office_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create office documents table
CREATE TABLE IF NOT EXISTS office_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id uuid REFERENCES office_subcategories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  document_url text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE office_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all office categories"
  ON office_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view all office subcategories"
  ON office_subcategories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view all office documents"
  ON office_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload office documents"
  ON office_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Insert initial data
INSERT INTO office_categories (name) VALUES
  ('REGION'),
  ('MUNICIPIOS'),
  ('OTROS');

-- Insert subcategories for REGION
WITH region_category AS (
  SELECT id FROM office_categories WHERE name = 'REGION'
)
INSERT INTO office_subcategories (category_id, name)
SELECT region_category.id, subcategory
FROM region_category,
UNNEST(ARRAY[
  'RISS',
  'Apoyo a la Gestion',
  'Unidad de Calidad',
  'Recursos Humanos',
  'Bienes Nacionales',
  'Biologicos',
  'Compras Nacionales',
  'Comunicación',
  'Administración',
  'Asesoria Legal',
  'Red de Frio',
  'Marco Normativo',
  'Servicios Generales',
  'Unidad de Planeamiento',
  'Vigilancia de la Salud'
]) AS subcategory;

-- Insert subcategories for MUNICIPIOS
WITH municipios_category AS (
  SELECT id FROM office_categories WHERE name = 'MUNICIPIOS'
)
INSERT INTO office_subcategories (category_id, name)
SELECT municipios_category.id, subcategory
FROM municipios_category,
UNNEST(ARRAY[
  'Coordinación Pimienta',
  'Omoa',
  'San Manuel',
  'Potrerillos',
  'Puerto Cortes',
  'Choloma',
  'San Francisco de Yojoa',
  'Santa Cruz de Yojoa',
  'San Antonio',
  'La Lima',
  'Villanueva'
]) AS subcategory;

-- Insert subcategories for OTROS
WITH otros_category AS (
  SELECT id FROM office_categories WHERE name = 'OTROS'
)
INSERT INTO office_subcategories (category_id, name)
SELECT otros_category.id, subcategory
FROM otros_category,
UNNEST(ARRAY[
  'SESAL',
  'Gerencia Administrativa',
  'Gestion de Vacunas',
  'Punto Focal VIH',
  'Servicios Publicos',
  'Constancias'
]) AS subcategory;