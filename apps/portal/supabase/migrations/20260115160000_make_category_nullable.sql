-- Make category_id nullable to support System/Native Categories (like Combos) logic
ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;

COMMENT ON COLUMN products.category_id IS 'Category ID. Can be NULL for system types like Combos which are categorized by their type field.';
