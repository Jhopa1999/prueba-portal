/**
 * Seed idempotente de las maestras base que usa la lista de mercado.
 *
 * Rellena los catalogos CATEGORIA y UNIDAD con valores iniciales para que los
 * dropdowns del formulario tengan contenido. Es seguro ejecutarlo varias veces:
 * usa upsert sobre el unique (catalog, code), de modo que no genera duplicados.
 *
 * Se ejecuta con tsx (el client generado en src/generated/prisma es TypeScript):
 *   npm run prisma:seed --workspace apps/api
 *
 * Carga el .env raiz del monorepo y conecta via el adaptador PrismaPg, igual que
 * test-utils/e2e-cleanup.ts.
 */
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// Carga el .env raiz (dos niveles por encima de apps/api/prisma).
loadEnv({ path: path.resolve(__dirname, '../../../.env') });

interface SeedItem {
  catalog: string;
  code: string;
  label: string;
  sortOrder: number;
}

// Valores ficticios/base. catalog y code ya estan en MAYUSCULAS, coherente con
// la normalizacion de CatalogService.
const SEED_ITEMS: SeedItem[] = [
  { catalog: 'CATEGORIA', code: 'FRUTAS_VERDURAS', label: 'Frutas y verduras', sortOrder: 1 },
  { catalog: 'CATEGORIA', code: 'LACTEOS', label: 'Lacteos', sortOrder: 2 },
  { catalog: 'CATEGORIA', code: 'CARNES', label: 'Carnes y pescados', sortOrder: 3 },
  { catalog: 'CATEGORIA', code: 'PANADERIA', label: 'Panaderia', sortOrder: 4 },
  { catalog: 'CATEGORIA', code: 'BEBIDAS', label: 'Bebidas', sortOrder: 5 },
  { catalog: 'CATEGORIA', code: 'LIMPIEZA', label: 'Limpieza', sortOrder: 6 },
  { catalog: 'CATEGORIA', code: 'DESPENSA', label: 'Despensa', sortOrder: 7 },
  { catalog: 'CATEGORIA', code: 'OTROS', label: 'Otros', sortOrder: 8 },
  { catalog: 'UNIDAD', code: 'UNIDAD', label: 'Unidad', sortOrder: 1 },
  { catalog: 'UNIDAD', code: 'KG', label: 'Kilogramo', sortOrder: 2 },
  { catalog: 'UNIDAD', code: 'G', label: 'Gramo', sortOrder: 3 },
  { catalog: 'UNIDAD', code: 'L', label: 'Litro', sortOrder: 4 },
  { catalog: 'UNIDAD', code: 'ML', label: 'Mililitro', sortOrder: 5 },
  { catalog: 'UNIDAD', code: 'PAQUETE', label: 'Paquete', sortOrder: 6 },
  { catalog: 'UNIDAD', code: 'DOCENA', label: 'Docena', sortOrder: 7 },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no definida: no se puede ejecutar el seed.');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  try {
    for (const item of SEED_ITEMS) {
      // upsert keyed on el unique (catalog, code). Actualiza label/sortOrder y
      // reactiva el elemento si estaba inactivo, para dejar las maestras base en
      // un estado conocido.
      await prisma.catalogItem.upsert({
        where: {
          catalog_code_unique: { catalog: item.catalog, code: item.code },
        },
        update: {
          label: item.label,
          sortOrder: item.sortOrder,
          active: true,
        },
        create: {
          catalog: item.catalog,
          code: item.code,
          label: item.label,
          sortOrder: item.sortOrder,
          active: true,
        },
      });
    }
    // eslint-disable-next-line no-console
    console.log(`Seed completado: ${SEED_ITEMS.length} elementos de maestra.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
