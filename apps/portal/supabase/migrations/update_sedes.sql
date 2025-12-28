-- 1. Actualizar "Sede Centro" (o similares) a "Rappi (Centro)"
UPDATE branches 
SET name = 'Rappi (Centro)' 
WHERE name ILIKE '%Centro%';

-- 2. Quitar la palabra "Sede " de todas las demás
UPDATE branches 
SET name = TRIM(REPLACE(name, 'Sede ', ''))
WHERE name LIKE 'Sede %';

-- 3. Insertar las nuevas sedes
INSERT INTO branches (name, address) VALUES 
('SantaRosa', 'Santa Rosa'),
('To-Go (Primax)', 'Estación Primax'),
('Condina', 'Condina');

-- Verificamos el resultado
SELECT * FROM branches ORDER BY name;
