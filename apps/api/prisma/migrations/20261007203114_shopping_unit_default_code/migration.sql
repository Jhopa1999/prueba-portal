-- Cambia el default de la columna unit de 'unidad' (texto libre) a 'UNIDAD'
-- (code valido de la maestra UNIDAD). No altera datos existentes ni la
-- estructura de la tabla.
ALTER TABLE "shopping_list_items" ALTER COLUMN "unit" SET DEFAULT 'UNIDAD';
