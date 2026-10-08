import {
  api,
  type CatalogItem,
  type ShoppingListItem,
  type CreateShoppingListItem,
  type UpdateShoppingListItem,
} from './api-client';
import { listCatalogItems } from './catalog';

// Nombres de las maestras que alimentan los dropdowns del formulario.
export const CATEGORIA_CATALOG = 'CATEGORIA';
export const UNIDAD_CATALOG = 'UNIDAD';

export interface ShoppingListMaestras {
  categories: CatalogItem[];
  units: CatalogItem[];
}

/**
 * Carga las opciones activas de las maestras CATEGORIA y UNIDAD en paralelo.
 * Reutiliza listCatalogItems del cliente de catalogos (una sola fuente). Lanza
 * un ShoppingListError si falla la comunicacion, para que la vista lo maneje.
 */
export async function listShoppingListMaestras(): Promise<ShoppingListMaestras> {
  try {
    const [categories, units] = await Promise.all([
      listCatalogItems({ catalog: CATEGORIA_CATALOG, active: true }),
      listCatalogItems({ catalog: UNIDAD_CATALOG, active: true }),
    ]);
    return { categories, units };
  } catch {
    throw toShoppingListError(undefined);
  }
}

/**
 * Error de dominio con un mensaje ya entendible para el usuario.
 * Nunca contiene stack traces, JSON crudo ni errores internos de Prisma.
 */
export class ShoppingListError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ShoppingListError';
  }
}

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Revisa los datos ingresados.';
    case 404:
      return 'El producto no existe o fue removido.';
    default:
      return 'Ocurrio un error al procesar la solicitud.';
  }
}

/**
 * Normaliza cualquier fallo (HTTP o de red) a un ShoppingListError entendible.
 */
function toShoppingListError(status: number | undefined): ShoppingListError {
  if (status === undefined) {
    return new ShoppingListError(
      'No fue posible comunicarse con el servidor.',
    );
  }
  return new ShoppingListError(messageForStatus(status), status);
}

export interface ShoppingListFilters {
  category?: string;
  purchased?: boolean;
  active?: boolean;
}

export async function listShoppingListItems(
  filters: ShoppingListFilters = {},
): Promise<ShoppingListItem[]> {
  try {
    const { data, error, response } = await api.GET('/shopping-list-items', {
      params: {
        query: {
          ...(filters.category ? { category: filters.category } : {}),
          ...(filters.purchased !== undefined
            ? { purchased: filters.purchased }
            : {}),
          ...(filters.active !== undefined ? { active: filters.active } : {}),
        },
      },
    });
    if (error || !data) {
      throw toShoppingListError(response.status);
    }
    return data as ShoppingListItem[];
  } catch (err) {
    if (err instanceof ShoppingListError) throw err;
    throw toShoppingListError(undefined);
  }
}

export async function createShoppingListItem(
  input: CreateShoppingListItem,
): Promise<ShoppingListItem> {
  try {
    const { data, error, response } = await api.POST('/shopping-list-items', {
      body: input,
    });
    if (error || !data) {
      throw toShoppingListError(response.status);
    }
    return data as ShoppingListItem;
  } catch (err) {
    if (err instanceof ShoppingListError) throw err;
    throw toShoppingListError(undefined);
  }
}

export async function updateShoppingListItem(
  id: string,
  input: UpdateShoppingListItem,
): Promise<ShoppingListItem> {
  try {
    const { data, error, response } = await api.PATCH(
      '/shopping-list-items/{id}',
      {
        params: { path: { id } },
        body: input,
      },
    );
    if (error || !data) {
      throw toShoppingListError(response.status);
    }
    return data as ShoppingListItem;
  } catch (err) {
    if (err instanceof ShoppingListError) throw err;
    throw toShoppingListError(undefined);
  }
}
