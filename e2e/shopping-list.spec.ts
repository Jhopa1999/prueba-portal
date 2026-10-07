import { expect, test, type Page } from '@playwright/test';
import {
  cleanupE2EShoppingList,
  E2E_SHOPPING_PREFIX,
} from '../apps/api/test-utils/e2e-cleanup';

/**
 * E2E del flujo de Lista de mercado. Valida la cadena completa:
 * navegador -> Next.js -> api-client -> NestJS -> Prisma -> PostgreSQL.
 *
 * Los datos usan el prefijo reservado E2E_SHOP_ en el nombre y se limpian antes
 * y despues de la suite con una utilidad de testing (sin DELETE por HTTP).
 */

// Categoria reservada para acotar el filtro de la suite a datos E2E.
const E2E_CATEGORY = 'E2E_CAT';

// Cada test parte de un estado E2E limpio para que sean independientes del orden.
test.beforeEach(async ({ page }) => {
  await cleanupE2EShoppingList();
  await page.goto('/shopping-list');
});

test.afterAll(async () => {
  await cleanupE2EShoppingList();
});

/** Aplica el filtro de categoria E2E y el estado de comprado indicado. */
async function applyFilter(
  page: Page,
  comprado: 'Todos' | 'Comprados' | 'Pendientes',
) {
  await page.locator('#filter-category').fill(E2E_CATEGORY);
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

async function createItem(
  page: Page,
  values: { name: string; quantity: number; unit: string },
) {
  await page.getByRole('button', { name: 'Nuevo producto' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Nuevo producto')).toBeVisible();

  await dialog.getByLabel('Nombre').fill(values.name);
  await dialog.getByLabel('Cantidad').fill(String(values.quantity));
  await dialog.getByLabel('Unidad').fill(values.unit);
  await dialog.getByLabel('Categoria').fill(E2E_CATEGORY);

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

  // Crear Leche y confirmar en tabla.
  await createItem(page, { name: leche, quantity: 2, unit: 'litro' });
  await applyFilter(page, 'Todos');
  const lecheRow = rowByName(page, leche);
  await expect(lecheRow).toContainText('litro');
  await expect(lecheRow).toContainText(E2E_CATEGORY);
  await expect(lecheRow.getByText('Pendiente', { exact: true })).toBeVisible();

  // Crear Pan.
  await createItem(page, { name: pan, quantity: 1, unit: 'unidad' });
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
