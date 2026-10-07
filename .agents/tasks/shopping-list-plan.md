# Implementation Plan — Lista de mercado (shopping-list)

Objetivo: implementar una feature full-stack 'lista de mercado' calcando EXACTAMENTE
el modulo `catalog` existente (backend NestJS + Prisma, OpenAPI, api-client generado,
frontend Next.js, E2E Playwright). Mismas convenciones de codigo: comentarios en
espanol SIN acentos, indentacion de 2 espacios, comillas simples, mismo orden de
imports y mismo uso de decoradores que los archivos de catalog.

## Decisiones de diseno (y como difiere de catalog)

- Entidad `ShoppingListItem` -> tabla `shopping_list_items`. Campos: `id` (uuid),
  `name`, `quantity` (Int default 1), `unit` (String default "unidad"),
  `category` (nullable), `purchased` (Boolean default false), `active` (Boolean
  default true), `notes` (nullable), `createdAt`, `updatedAt`. Indices en
  `category`, `purchased`, `active`. NO hay unique compuesto (catalog usa
  `@@unique([catalog, code])`; aqui no aplica, el nombre no es un identificador
  funcional unico).
- Sin P2002/409: al no existir unique compuesto, el service NO traduce P2002 a
  ConflictException. El create no puede chocar por duplicado. Se conserva igual el
  resto del patron (NotFoundException en findOne/update). Decision: no inventar un
  unique que el modelo no pide; el ConflictException de catalog se omite por diseno.
- Update: a diferencia de catalog (donde `catalog`/`code` son estables y NO
  editables), aqui TODOS los campos son editables incluyendo `name`. El
  `UpdateShoppingListItemDto` incluye todos los campos como opcionales. En el
  frontend el campo `name` NO es readOnly en modo edicion.
- Normalizacion: catalog hace `trim().toUpperCase()` sobre `catalog`/`code`. Aqui
  los campos no son codigos en mayusculas; se aplica solo `trim` via `@Transform`
  en los DTO (igual que catalog lo hace con el helper `trim`), sin
  `toUpperCase()`. Opcional: `category` se normaliza con trim; se deja tal cual
  (no mayusculas). No hay metodo `normalizeKey`.
- Endpoints: `@Controller('shopping-list-items')` con POST, GET (lista con filtros
  `category`/`purchased`/`active`), GET :id, PATCH :id. NO DELETE (igual que
  catalog; CORS en app.config.ts solo permite GET/POST/PATCH y NO se toca).
- Orden en findMany: catalog ordena por `[catalog, sortOrder, label]`. Aqui no hay
  sortOrder; ordenar por `[{ category: 'asc' }, { name: 'asc' }]` (category puede
  ser null; Prisma ordena nulls al final por defecto en Postgres, aceptable).
- Frontend: pantalla espejo en `apps/web/src/app/shopping-list/` con los mismos
  estados (loading/vacio/exito/error), tabla, dialog de formulario, toggle de
  estado via PATCH `active`. Se agrega ademas accion de marcar/desmarcar
  `purchased` (PATCH `purchased`) por coherencia con el modelo; usa el mismo patron
  que `handleToggleActive`.
- UI: solo se usan componentes ya existentes en `components/ui/*` (badge, button,
  card, dialog, input, label, select, separator, skeleton, sonner, switch, table).
  NO existe `textarea`; el campo `notes` usa `Input`. NO agregar dependencias ni
  componentes nuevos.

## Pasos

- [ ] 1. Agregar el modelo Prisma `ShoppingListItem` al final de
      `apps/api/prisma/schema.prisma`, despues del modelo `CatalogItem`, SIN tocar
      `CatalogItem`. Campos exactos: `id String @id @default(uuid()) @db.Uuid`;
      `name String`; `quantity Int @default(1)`; `unit String @default("unidad")`;
      `category String?`; `purchased Boolean @default(false) @map("purchased")`;
      `active Boolean @default(true)`; `notes String?`;
      `createdAt DateTime @default(now()) @map("created_at")`;
      `updatedAt DateTime @updatedAt @map("updated_at")`. Indices
      `@@index([category])`, `@@index([purchased])`, `@@index([active])` y
      `@@map("shopping_list_items")`. Comentarios en espanol sin acentos al estilo
      del modelo CatalogItem.
      Files: apps/api/prisma/schema.prisma
      Verify: `npm run prisma:validate` termina sin errores; `npm run prisma:format`
      no reordena de forma inesperada el modelo nuevo.

- [ ] 2. Crear la migracion manual con timestamp POSTERIOR a `20261007161124` en
      `apps/api/prisma/migrations/<timestamp>_create_shopping_list_items/migration.sql`
      (usar p. ej. `20261007161200_create_shopping_list_items`). Contenido estilo
      catalog: `CREATE TABLE "shopping_list_items"` con columnas
      `id UUID NOT NULL`, `name TEXT NOT NULL`, `quantity INTEGER NOT NULL DEFAULT 1`,
      `unit TEXT NOT NULL DEFAULT 'unidad'`, `category TEXT`,
      `purchased BOOLEAN NOT NULL DEFAULT false`, `active BOOLEAN NOT NULL DEFAULT true`,
      `notes TEXT`, `created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `updated_at TIMESTAMP(3) NOT NULL`, `CONSTRAINT "shopping_list_items_pkey"
      PRIMARY KEY ("id")`; y tres `CREATE INDEX` para `category`, `purchased`,
      `active` (nombres `shopping_list_items_category_idx`, `..._purchased_idx`,
      `..._active_idx`). NO borrar ni editar la migracion de catalog.
      Files: apps/api/prisma/migrations/<timestamp>_create_shopping_list_items/migration.sql
      Verify: el SQL es coherente con el modelo del paso 1 (mismas columnas, tipos
      y defaults); revisar manualmente contra la migracion de catalog. Marcar como
      'verificar durante implementacion': aplicar la migracion contra PostgreSQL
      (`npm run db:up` y migrate) no es posible sin base; confirmar en implementacion.

- [ ] 3. Regenerar el cliente Prisma para que exista el delegate
      `prisma.shoppingListItem` y el tipo `ShoppingListItemModel`.
      Files: (genera `apps/api/src/generated/prisma/*`, no versionado)
      Verify: `npm run prisma:generate` termina OK y aparece
      `apps/api/src/generated/prisma/models/ShoppingListItem.ts` (o equivalente).

- [ ] 4. Crear los 4 DTOs del modulo en `apps/api/src/modules/shopping-list/dto/`
      calcando los de catalog:
      - `create-shopping-list-item.dto.ts`: helper `trim` identico; `name`
        (`@IsString @IsNotEmpty @MaxLength(255)`, requerido); `quantity`
        (`@IsOptional @IsInt @Min(1)`); `unit` (`@IsOptional @IsString
        @IsNotEmpty @MaxLength(50)`); `category` (`@IsOptional @IsString
        @MaxLength(100)`); `purchased` (`@IsOptional @IsBoolean`); `active`
        (`@IsOptional @IsBoolean`); `notes` (`@IsOptional @IsString
        @MaxLength(500)`). Decoradores `@ApiProperty`/`@ApiPropertyOptional` con
        descripciones en espanol sin acentos y ejemplos.
      - `update-shopping-list-item.dto.ts`: TODOS los campos opcionales
        (incluido `name`, a diferencia de catalog) con las mismas validaciones
        envueltas en `@IsOptional`.
      - `list-shopping-list-items.dto.ts`: filtros opcionales `category`
        (`@IsOptional @IsString`), `purchased` y `active` (ambos con el mismo
        `@Transform` string->boolean de `ListCatalogItemsDto` y `@IsBoolean`).
      - `shopping-list-item-response.dto.ts`: contrato HTTP con todos los campos
        (`id` uuid, `name`, `quantity`, `unit`, `category` nullable, `purchased`,
        `active`, `notes` nullable, `createdAt`, `updatedAt`) con `@ApiProperty`.
        Para nullable usar `nullable: true` en el decorador.
      Files: apps/api/src/modules/shopping-list/dto/create-shopping-list-item.dto.ts,
      apps/api/src/modules/shopping-list/dto/update-shopping-list-item.dto.ts,
      apps/api/src/modules/shopping-list/dto/list-shopping-list-items.dto.ts,
      apps/api/src/modules/shopping-list/dto/shopping-list-item-response.dto.ts
      Verify: `npm run typecheck:api` compila sin errores (depende del paso 3).

- [ ] 5. Crear `apps/api/src/modules/shopping-list/shopping-list.service.ts`
      calcando `catalog.service.ts`: inyecta `PrismaService`; `create` (sin
      traduccion P2002, construye `data` enviando solo los campos definidos para
      respetar defaults del modelo en `quantity`/`unit`/`purchased`/`active`);
      `findMany(filters)` arma `where` con `category`/`purchased`/`active` cuando
      estan definidos y `orderBy: [{ category: 'asc' }, { name: 'asc' }]`;
      `findOne(id)` con `NotFoundException`; `update(id, dto)` que primero llama
      `findOne` (garantiza 404) y luego actualiza enviando solo campos definidos
      (incluido `name`). Tipos desde `../../generated/prisma/client` y
      `../../generated/prisma/models/ShoppingListItem`.
      Files: apps/api/src/modules/shopping-list/shopping-list.service.ts
      Verify: `npm run typecheck:api` compila sin errores.

- [ ] 6. Crear `apps/api/src/modules/shopping-list/shopping-list.controller.ts`
      calcando `catalog.controller.ts`: `@ApiTags('shopping-list-items')`,
      `@Controller('shopping-list-items')`, metodos POST/GET/GET(:id con
      `ParseUUIDPipe`)/PATCH(:id) delegando al service, con los mismos decoradores
      `@ApiOperation`/`@ApiBody`/`@ApiQuery`/`@ApiParam`/`@ApiResponse`.
      `@ApiQuery` para `category` (string), `purchased` (Boolean), `active`
      (Boolean). Sin respuesta 409 (no hay conflicto por diseno).
      Files: apps/api/src/modules/shopping-list/shopping-list.controller.ts
      Verify: `npm run typecheck:api` compila sin errores.

- [ ] 7. Crear `apps/api/src/modules/shopping-list/shopping-list.module.ts`
      calcando `catalog.module.ts` (importa `PrismaModule`, declara controller y
      provider) y registrar `ShoppingListModule` en
      `apps/api/src/app.module.ts` junto a `CatalogModule` (agregar import y
      entrada en `imports`), sin alterar lo existente.
      Files: apps/api/src/modules/shopping-list/shopping-list.module.ts,
      apps/api/src/app.module.ts
      Verify: `npm run typecheck:api` compila sin errores.

- [ ] 8. Crear `apps/api/src/modules/shopping-list/shopping-list.service.spec.ts`
      calcando `catalog.service.spec.ts` pero adaptado: mock tipado del delegate
      `shoppingListItem` (`create`, `findMany`, `findUnique`, `update`); helper
      `makeItem` con la forma de ShoppingListItem. Cubrir: create respeta defaults
      (no envia quantity/unit/purchased/active cuando no se pasan), create pasa los
      campos cuando se envian, findOne devuelve/404, update envia solo campos
      definidos e INCLUYE `name` (demostrar que name SI es editable), update lanza
      404 si no existe, findMany arma where por category/purchased/active y usa el
      orderBy `[{category:'asc'},{name:'asc'}]`, findMany sin filtros usa
      `where: {}`. NO incluir el caso P2002/Conflict (no aplica).
      Files: apps/api/src/modules/shopping-list/shopping-list.service.spec.ts
      Verify: `npm run test:unit` pasa todas las pruebas (catalog + shopping-list);
      los nuevos specs del service de shopping-list pasan.

- [ ] 9. Regenerar el contrato OpenAPI. `generate-openapi.ts` carga el `.env`
      raiz y `PrismaService` lanza error si falta `DATABASE_URL`. El repo NO tiene
      `.env` raiz, por lo que la generacion requiere un `DATABASE_URL` dummy en el
      entorno (no se abre conexion real, main.ts/init no se llaman). Ejecutar con
      una variable de entorno temporal, p. ej. en PowerShell:
      `$env:DATABASE_URL='postgresql://user:pass@localhost:5432/db'; npm run openapi:generate`.
      No crear un `.env` versionado ni guardar secretos; usar solo variable de
      entorno efimera. Marcar como 'verificar durante implementacion' si el entorno
      ya define `DATABASE_URL`.
      Files: apps/api/openapi/openapi.json (regenerado)
      Verify: `apps/api/openapi/openapi.json` contiene las rutas
      `/shopping-list-items` y `/shopping-list-items/{id}` y los schemas
      `ShoppingListItemResponseDto`, `CreateShoppingListItemDto`,
      `UpdateShoppingListItemDto` (buscar esos literales en el JSON).

- [ ] 10. Regenerar el api-client tipado desde el OpenAPI actualizado.
      Files: packages/api-client/src/generated/schema.d.ts (regenerado)
      Verify: `npm run api-client:generate` termina OK; `schema.d.ts` incluye los
      paths `/shopping-list-items` y los schemas Dto de shopping-list. Luego
      `npm run build:api-client` compila el paquete.

- [ ] 11. Exponer los tipos de dominio en
      `apps/web/src/lib/api-client.ts` agregando (sin quitar los de catalog):
      `ShoppingListItem = components['schemas']['ShoppingListItemResponseDto']`,
      `CreateShoppingListItem = components['schemas']['CreateShoppingListItemDto']`,
      `UpdateShoppingListItem = components['schemas']['UpdateShoppingListItemDto']`.
      Files: apps/web/src/lib/api-client.ts
      Verify: `npm run typecheck:web` compila (depende del paso 10).

- [ ] 12. Crear `apps/web/src/lib/shopping-list.ts` espejo de `lib/catalog.ts`:
      clase `ShoppingListError` (equivalente a `CatalogError`), `messageForStatus`
      (sin el mensaje 409 especifico de duplicado; para 409 u otros usar el
      default), `toShoppingListError`, interfaz `ShoppingListFilters`
      (`category?`, `purchased?`, `active?`) y funciones `listShoppingListItems`,
      `createShoppingListItem`, `updateShoppingListItem` que consumen `api.GET/POST/PATCH`
      sobre `/shopping-list-items` y `/shopping-list-items/{id}` con el mismo patron
      de manejo de errores.
      Files: apps/web/src/lib/shopping-list.ts
      Verify: `npm run typecheck:web` compila sin errores.

- [ ] 13. Crear la pantalla en `apps/web/src/app/shopping-list/`:
      - `page.tsx`: Server Component con `metadata` (title 'Lista de mercado |
        ...') que renderiza `<ShoppingListView />` (espejo de catalogs/page.tsx).
      - `shopping-list-form-dialog.tsx`: espejo de catalog-form-dialog.tsx con
        `ShoppingListFormValues` (name, quantity, unit, category, purchased,
        active, notes). DIFERENCIA CLAVE: `name` NO es readOnly/disabled en modo
        edicion (todos los campos editables). Usa Input para name/quantity
        (type number min 1)/unit/category/notes y Switch para purchased y active.
        Validacion minima en cliente: `name` obligatorio en crear y en editar.
      - `shopping-list-view.tsx`: espejo de catalogs-view.tsx con estados
        loading/vacio/exito/error, filtros (category Input, purchased Select
        Todos/Comprados/Pendientes, active Select Todos/Activos/Inactivos), tabla
        con columnas (Nombre, Cantidad, Unidad, Categoria, Comprado, Estado,
        Actualizado, Acciones), boton Editar, toggle Activar/Desactivar via PATCH
        `active`, y toggle Comprado via PATCH `purchased`. Mensajes en espanol sin
        acentos. Usa ids estables `#filter-category`, `#filter-purchased`,
        `#filter-active` para los filtros.
      Files: apps/web/src/app/shopping-list/page.tsx,
      apps/web/src/app/shopping-list/shopping-list-view.tsx,
      apps/web/src/app/shopping-list/shopping-list-form-dialog.tsx
      Verify: `npm run typecheck:web` compila sin errores.

- [ ] 14. Agregar el link de navegacion en `apps/web/src/app/layout.tsx`:
      importar `ShoppingCart` de `lucide-react` (junto a los iconos existentes) y
      agregar un segundo `<Link href="/shopping-list">` con icono `ShoppingCart`
      y label 'Lista de mercado', manteniendo el link 'Maestras' existente y el
      mismo estilo de clases.
      Files: apps/web/src/app/layout.tsx
      Verify: `npm run typecheck:web` compila; revisar que el nav muestra ambos
      enlaces (verificar durante implementacion en navegador).

- [ ] 15. Extender la utilidad de limpieza E2E en
      `apps/api/test-utils/e2e-cleanup.ts`: agregar un marcador reservado para
      shopping-list (p. ej. `export const E2E_SHOPPING_PREFIX = 'E2E_SHOP_'` o
      `E2E_SHOPPING_UNIT = 'E2E_SHOP'`) y una funcion
      `cleanupE2EShoppingList()` que haga `prisma.shoppingListItem.deleteMany`
      con filtro ESTRICTO (p. ej. `where: { unit: E2E_SHOPPING_UNIT }` o
      `name: { startsWith: E2E_SHOPPING_PREFIX }`), nunca sin `where`. Mantener la
      limpieza de catalog existente intacta. Decidir el marcador en implementacion
      segun que campo filtra mejor; dejar comentario explicando el filtro estricto.
      Files: apps/api/test-utils/e2e-cleanup.ts
      Verify: `npm run typecheck:api` compila; revisar que el `deleteMany` siempre
      lleva `where`.

- [ ] 16. Crear `e2e/shopping-list.spec.ts` espejo de `e2e/catalogs.spec.ts`:
      beforeEach y afterAll que llaman `cleanupE2EShoppingList()` y navegan a
      `/shopping-list`; helpers `applyFilter`, `rowByName`, `createItem` adaptados
      a los campos/labels de shopping-list y a los ids `#filter-*` del paso 13.
      Cubrir el flujo principal: estado vacio, crear item, verlo en tabla, editar
      (incluyendo EDITAR el `name`, demostrando que es editable, a diferencia de
      catalog), toggle comprado y toggle activo, y los filtros. Todos los datos
      usan el marcador reservado del paso 15 para que la limpieza sea estricta.
      Files: e2e/shopping-list.spec.ts
      Verify: 'verificar durante implementacion' — `npm run test:e2e` requiere
      PostgreSQL (`npm run db:up`) y los dos servidores; confirmar que el flujo pasa
      en implementacion. Como minimo, el spec debe tipar/compilar.

- [ ] 17. Verificacion integral final (seams entre capas).
      Files: (ninguno nuevo)
      Verify: en orden — `npm run prisma:generate`; `npm run typecheck` (api +
      api-client + web) sin errores; `npm run test:unit` todo verde (catalog y
      shopping-list); `npm run build` completa (build:api, build:api-client,
      build:web). Confirmar que la feature catalog sigue intacta (sus specs y E2E
      no se modificaron). Los pasos que requieren base/servidores
      (`npm run test:e2e`, aplicar migracion) quedan marcados 'verificar durante
      implementacion' si el entorno no tiene PostgreSQL disponible.

## Notas y supuestos

- No se agregan dependencias ni componentes UI nuevos; `notes` usa `Input` porque
  no existe `textarea` en `components/ui`.
- No se agrega endpoint DELETE ni se modifica CORS (sigue GET/POST/PATCH).
- No se traduce P2002 a 409 porque el modelo no define unique compuesto; es la
  diferencia esperada frente a catalog y se documenta en el spec.
- `prisma:generate`, `openapi:generate` y `api-client:generate` deben ejecutarse en
  ese orden; el OpenAPI necesita un `DATABASE_URL` dummy en entorno porque no hay
  `.env` raiz versionado (sin abrir conexion real).
- Cualquier verificacion que dependa de PostgreSQL o de servidores levantados queda
  marcada 'verificar durante implementacion'; no se descarta ningun requisito por
  no poder ejecutarlo aqui.

## Nota de verificacion (ejecutada en implementacion)

Scripts reales de package.json ejecutados desde la raiz y sus resultados. El
revisor puede leer esto SIN re-ejecutar.

1. `npm run prisma:validate` -> OK ("The schema at prisma\schema.prisma is valid").
2. `npm run prisma:generate` -> OK (Prisma Client 7.10.0 generado; aparece
   `apps/api/src/generated/prisma/models/ShoppingListItem.ts`).
3. `npm run openapi:generate` -> OK. Se ejecuto con `DATABASE_URL` dummy efimera
   en el entorno (`postgresql://user:pass@localhost:5432/db`) porque no hay `.env`
   raiz versionado y el constructor de PrismaService la exige; NO se abre conexion
   real ni se commitea el valor. `openapi.json` contiene las rutas
   `/shopping-list-items` y `/shopping-list-items/{id}` y los schemas
   `CreateShoppingListItemDto`, `UpdateShoppingListItemDto`,
   `ShoppingListItemResponseDto`.
4. `npm run api-client:generate` -> OK (schema.d.ts regenerado con los nuevos
   paths/schemas). `npm run build:api-client` -> OK.
5. `npm run typecheck` (api + api-client + web) -> OK, CERO errores.
6. `npm run build:api` -> OK (nest build).
7. `npm run test:unit` -> OK: 2 suites, 27 tests pasados (catalog +
   shopping-list.service.spec.ts).
8. `npm run build:web` -> OK con `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`
   en el entorno (misma variable que CI y el Dockerfile usan en build; es publica,
   no es secreto). El build prerenderiza `/catalogs` y `/shopping-list`. Sin la
   variable, el build falla igual para `/catalogs` (requisito preexistente del
   proyecto, no introducido por esta feature).
9. E2E (`npm run test:e2e`): NO ejecutado en el loop (requiere PostgreSQL via
   `npm run db:up` y los dos servidores). El spec `e2e/shopping-list.spec.ts`
   compila bajo tsc en aislamiento junto con `e2e/catalogs.spec.ts` (sin errores).
   El cleanup usa filtro estricto `name startsWith 'E2E_SHOP_'`, nunca sin where.
