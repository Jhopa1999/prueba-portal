# Verificacion: catalogos (Maestras) relacionados con la lista de mercado

Relaciona Categoria y Unidad del formulario de lista de mercado con las
maestras CATEGORIA y UNIDAD (dropdowns + validacion blanda en backend + seed).

## Decisiones (DECISION POINTs)

- Guardar code vs label: se guarda el CODE en `category`/`unit` del
  ShoppingListItem (p. ej. `LACTEOS`, `L`). El frontend resuelve code -> label
  para mostrar en la tabla y en los dropdowns.
- Dependencia del service: opcion (a). Se exporta `CatalogService` desde
  `CatalogModule`, `ShoppingListModule` lo importa y `ShoppingListService`
  inyecta `CatalogService` para consultar codes activos. Reutiliza la capacidad
  de negocio en vez de reconsultar Prisma por separado.
- Default de unit (DB vs DTO): se cambio AMBOS. En `schema.prisma` el default de
  `unit` paso de `"unidad"` a `"UNIDAD"` y se creo una nueva migracion
  `20261007203114_shopping_unit_default_code` con
  `ALTER TABLE "shopping_list_items" ALTER COLUMN "unit" SET DEFAULT 'UNIDAD';`.
  Tambien se actualizo el default/example del DTO. Motivo: dejar la base
  coherente con el nuevo contrato (el default es ahora un code valido de la
  maestra UNIDAD). No se modifico ninguna migracion ya aplicada ni ninguna
  columna/relacion del modelo (sin FK).

## Comportamiento

- Validacion blanda en `ShoppingListService` (create y update): si llega
  `category` no vacio debe ser code de un CatalogItem ACTIVO en CATEGORIA; si
  llega `unit` debe ser code ACTIVO en UNIDAD. Comparacion normalizada a
  MAYUSCULAS (igual que CatalogService). Mismatch -> `BadRequestException` con
  mensaje de negocio en espanol, sin detalles internos. category/unit vacios no
  se validan ni se envian.
- Frontend: Categoria y Unidad son `<Select>` poblados desde las maestras.
  Categoria permite "Sin categoria" (opcional); Unidad por defecto `UNIDAD`.
  Edge case de edicion: si el code guardado ya no esta activo, se agrega como
  opcion de respaldo etiquetada para no perder el dato. Estados de carga/vacio
  contemplados. La tabla muestra las etiquetas (fallback al code). El filtro de
  categoria tambien es un Select con "Todas" por defecto.
- Seed idempotente en `apps/api/prisma/seed.ts` (script `prisma:seed`), upsert
  sobre el unique (catalog, code). Puebla CATEGORIA (8) y UNIDAD (7).

## Scripts ejecutados y resultado

Desde la raiz del repo (Postgres en el puerto 5434, migraciones aplicadas):

1. `npm run prisma:validate` -> OK (schema valido).
2. `npm run prisma:generate` -> OK (client regenerado).
3. `npm run prisma:migrate:deploy --workspace apps/api` -> OK (aplico la nueva
   migracion `20261007203114_shopping_unit_default_code`).
4. `npm run prisma:seed --workspace apps/api` (dos veces) -> OK e idempotente:
   "Seed completado: 15 elementos de maestra." sin errores de clave duplicada.
5. `npm run openapi:generate` -> OK. `npm run api-client:generate` -> OK.
6. `npm run build:api-client` -> OK.
7. `npm run typecheck` (api + api-client + web) -> OK, 0 errores.
8. `npm run build:api` -> OK.
9. `npm run test:unit` -> OK: 2 suites, 35 tests passed (incluye las nuevas
   pruebas de validacion de category/unit en create y update).
10. `npm run build:web` -> OK (Next.js build correcto).
11. `npx playwright test e2e/shopping-list.spec.ts` -> OK: 2 passed. El spec
    elige Categoria/Unidad desde los dropdowns y asegura via API publica los
    codes CATEGORIA/LACTEOS y UNIDAD/L (POST idempotente, 201/409). Requiere
    `npm run prisma:seed` previo para poblar las maestras base.

Los servidores de desarrollo que Playwright dejo activos (puertos 3000/3001) se
detuvieron tras la corrida. No quedaron archivos temporales.
