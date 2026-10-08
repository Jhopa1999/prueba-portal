import { expect, test, type Page } from '@playwright/test';
import {
  cleanupE2EShoppingList,
  E2E_SHOPPING_PREFIX,
} from '../apps/api/test-utils/e2e-cleanup';

/**
 * E2E del flujo de Lista de mercado. Valida la cadena completa:
 * navegador -> Next.js -> api-client -> NestJS -> Prisma -> PostgreSQL.
 *
 * Los productos usan el prefijo reservado E2E_SHOP_ en el nombre y se limpian
 * antes y despues de la suite con una utilidad de testing (sin DELETE por HTTP).
 *
 * Categoria y Unidad ahora provienen de las maestras CATEGORIA y UNIDAD: el
 * formulario las ofrece como dropdowns. La suite usa valores base del seed
 * (categoria LACTEOS, unidad L). beforeAll se asegura via la API publica de que
 * esos codes existan y esten activos; no los borra en afterAll porque son datos
 * legitimos de maestra (no basura E2E). Antes de correr E2E conviene ejecutar
 * `npm run prisma:seed --workspace apps/api`.
 */

// Base de la API (coincide con playwright.config.ts: NestJS en el puerto 3001).
const API_BASE = 'http://localhost:3001';

// Codes de maestra que usa la suite (del seed base).
const CATEGORIA_CODE = 'LACTEOS';
const CATEGORIA_LABEL = 'Lacteos';
const UNIDAD_CODE = 'L';
const UNIDAD_LABEL = 'Litro';

/**
 * Garantiza que un code exista y este activo en una maestra. Si ya existe
 * (409), se considera correcto. No borra nada: son valores legitimos de maestra.
 */
async function ensureCatalogItem(
  catalog: string,
  code: string,
  label: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/catalog-items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ catalog, code, label, active: true }),
  });
  // 201 creado, 409 ya existia: ambos dejan el valor disponible.
  if (res.status !== 201 && res.status !== 409) {
    throw new Error(
      `No se pudo asegurar la maestra ${catalog}/${code}: HTTP ${res.status}`,
    );
  }
}

test.beforeAll(async () => {
  await ensureCatalogItem('CATEGORIA', CATEGORIA_CODE, CATEGORIA_LABEL);
  await ensureCatalogItem('UNIDAD', UNIDAD_CODE, UNIDAD_LABEL);
});

// Cada test parte de un estado E2E limpio para que sean independientes del orden.
test.beforeEach(async ({ page }) => {
  await cleanupE2EShoppingList();
  await page.goto('/shopping-list');
});

test.afterAll(async () => {
  await cleanupE2EShoppingList();
});

/** Aplica el filtro de categoria indicado y el estado de comprado indicado. */
async function applyFilter(
  page: Page,
  comprado: 'Todos' | 'Comprados' | 'Pendientes',
  categoria: 'Todas' | typeof CATEGORIA_LABEL = CATEGORIA_LABEL,
) {
  await page.locator('#filter-category').click();
  await page.getByRole('option', { name: categoria, exact: true }).click();
  await page.locator('#filter-purchased').click();
  await page.getByRole('option', { name: comprado, exact: true }).click();
  const listResponse = page.waitForResponse(
    (r) =>
      r.url().includes('/shopping-list-items') &&
      r.request().method() === 'GET',
  );
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await listResponse;
}

/** Devuelve la fila de la tabla que contiene el nombre dado. */
function rowByName(page: Page, name: string) {
  return page.getByRole('row').filter({ hasText: name });
}

/** Selecciona una opcion en un Select de shadcn por el id del trigger. */
async function selectOption(page: Page, triggerId: string, optionLabel: string) {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
}

async function createItem(
  page: Page,
  values: { name: string; quantity: number },
) {
  await page.getByRole('button', { name: 'Nuevo producto' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Nuevo producto')).toBeVisible();

  await dialog.getByLabel('Nombre').fill(values.name);
  await dialog.getByLabel('Cantidad').fill(String(values.quantity));
  // Unidad y Categoria se eligen de los dropdowns de maestras.
  await selectOption(page, 'unit', UNIDAD_LABEL);
  await selectOption(page, 'category', CATEGORIA_LABEL);

  const created = page.waitForResponse(
    (r) =>
      r.url().includes('/shopping-list-items') &&
      r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await created;
  // Esperar a que el dialog se cierre tras el exito antes de continuar.
  await expect(dialog).toBeHidden();
}

test('flujo principal de lista de mercado', async ({ page }) => {
  const leche = `${E2E_SHOPPING_PREFIX}Leche`;
  const pan = `${E2E_SHOPPING_PREFIX}Pan`;
  const lecheEditada = `${E2E_SHOPPING_PREFIX}Leche deslactosada`;

  // Encabezado visible.
  await expect(
    page.getByRole('heading', { name: 'Lista de mercado' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Nuevo producto' }).first(),
  ).toBeVisible();

  // Estado vacio para la categoria E2E.
  await applyFilter(page, 'Todos');
  await expect(page.getByText('No hay productos todavia.')).toBeVisible();

  // Crear Leche y confirmar en tabla (la tabla muestra las etiquetas de maestra).
  await createItem(page, { name: leche, quantity: 2 });
  await applyFilter(page, 'Todos');
  const lecheRow = rowByName(page, leche);
  await expect(lecheRow).toContainText(UNIDAD_LABEL);
  await expect(lecheRow).toContainText(CATEGORIA_LABEL);
  await expect(lecheRow.getByText('Pendiente', { exact: true })).toBeVisible();

  // Crear Pan.
  await createItem(page, { name: pan, quantity: 1 });
  await applyFilter(page, 'Todos');
  await expect(rowByName(page, pan)).toBeVisible();

  // Editar Leche: el nombre SI es editable (a diferencia de catalog).
  await rowByName(page, leche)
    .getByRole('button', { name: 'Editar' })
    .click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog.getByText('Editar producto')).toBeVisible();
  await editDialog.getByLabel('Nombre').fill(lecheEditada);
  await editDialog.getByLabel('Cantidad').fill('3');
  const edited = page.waitForResponse(
    (r) =>
      r.url().includes('/shopping-list-items') &&
      r.request().method() === 'PATCH',
  );
  await editDialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await edited;

  await applyFilter(page, 'Todos');
  await expect(rowByName(page, lecheEditada)).toBeVisible();
  await expect(rowByName(page, lecheEditada)).toContainText('3');

  // Marcar como comprado y confirmar badge Comprado.
  const purchased = page.waitForResponse(
    (r) =>
      r.url().includes('/shopping-list-items') &&
      r.request().method() === 'PATCH',
  );
  await rowByName(page, lecheEditada)
    .getByRole('button', { name: 'Marcar comprado' })
    .click();
  await purchased;
  await applyFilter(page, 'Todos');
  await expect(
    rowByName(page, lecheEditada).getByText('Comprado', { exact: true }),
  ).toBeVisible();

  // Desactivar Leche y confirmar badge Inactivo.
  const deactivate = page.waitForResponse(
    (r) =>
      r.url().includes('/shopping-list-items') &&
      r.request().method() === 'PATCH',
  );
  await rowByName(page, lecheEditada)
    .getByRole('button', { name: 'Desactivar' })
    .click();
  await deactivate;
  await applyFilter(page, 'Todos');
  await expect(
    rowByName(page, lecheEditada).getByText('Inactivo', { exact: true }),
  ).toBeVisible();

  // Filtrar Comprados: Leche aparece, Pan (pendiente) no.
  await applyFilter(page, 'Comprados');
  await expect(rowByName(page, lecheEditada)).toBeVisible();
  await expect(rowByName(page, pan)).toHaveCount(0);

  // Filtrar Pendientes: Pan aparece, Leche (comprado) no.
  await applyFilter(page, 'Pendientes');
  await expect(rowByName(page, pan)).toBeVisible();
  await expect(rowByName(page, lecheEditada)).toHaveCount(0);
});

test('el formulario requiere el nombre', async ({ page }) => {
  await page.getByRole('button', { name: 'Nuevo producto' }).first().click();
  const dialog = page.getByRole('dialog');

  // Intento crear sin completar el nombre: no debe crear y debe avisar.
  await dialog.getByLabel('Nombre').fill('');
  await dialog.getByRole('button', { name: 'Crear' }).click();
  await expect(dialog.getByText('El nombre es obligatorio.')).toBeVisible();
  // El dialog sigue abierto (no se creo nada).
  await expect(dialog.getByText('Nuevo producto')).toBeVisible();
});
