-- Get the ID of the REGION category
WITH region_category AS (
  SELECT id FROM office_categories WHERE name = 'REGION'
)
INSERT INTO office_subcategories (category_id, name)
SELECT region_category.id, 'Direccion'
FROM region_category
WHERE NOT EXISTS (
  SELECT 1 FROM office_subcategories s
  JOIN office_categories c ON s.category_id = c.id
  WHERE c.name = 'REGION' AND s.name = 'Direccion'
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_office_subcategories_name 
ON office_subcategories(name);