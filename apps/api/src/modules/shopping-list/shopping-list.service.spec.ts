import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import { ShoppingListService } from './shopping-list.service';

/**
 * Mock tipado minimo del PrismaService: solo el delegate shoppingListItem con
 * los metodos que usa ShoppingListService. No se conecta a PostgreSQL.
 */
type ShoppingListItemDelegateMock = {
  create: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
};

function createPrismaMock(): {
  prisma: PrismaService;
  shoppingListItem: ShoppingListItemDelegateMock;
} {
  const shoppingListItem: ShoppingListItemDelegateMock = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  // Cast controlado: el service solo usa prisma.shoppingListItem.*
  const prisma = { shoppingListItem } as unknown as PrismaService;
  return { prisma, shoppingListItem };
}

/**
 * Mock de CatalogService: solo findMany, que es lo que usa la validacion blanda.
 * Por defecto devuelve las maestras CATEGORIA y UNIDAD con codes de ejemplo
 * activos. No se conecta a PostgreSQL.
 */
type CatalogServiceMock = { findMany: jest.Mock };

function createCatalogMock(): {
  catalog: CatalogService;
  findMany: jest.Mock;
} {
  const findMany = jest.fn(
    async (filters: { catalog?: string; active?: boolean }) => {
      const data: Record<string, string[]> = {
        CATEGORIA: ['LACTEOS', 'PANADERIA'],
        UNIDAD: ['UNIDAD', 'L'],
      };
      const codes = filters.catalog ? (data[filters.catalog] ?? []) : [];
      return codes.map((code) => ({
        id: `id-${code}`,
        catalog: filters.catalog,
        code,
        label: code,
        active: true,
        sortOrder: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }));
    },
  );
  const mock: CatalogServiceMock = { findMany };
  const catalog = mock as unknown as CatalogService;
  return { catalog, findMany };
}

function makeItem(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Leche',
    quantity: 1,
    unit: 'unidad',
    category: null,
    purchased: false,
    active: true,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ShoppingListService', () => {
  let service: ShoppingListService;
  let shoppingListItem: ShoppingListItemDelegateMock;
  let catalogFindMany: jest.Mock;

  beforeEach(() => {
    const mock = createPrismaMock();
    const catalogMock = createCatalogMock();
    shoppingListItem = mock.shoppingListItem;
    catalogFindMany = catalogMock.findMany;
    service = new ShoppingListService(mock.prisma, catalogMock.catalog);
  });

  describe('create', () => {
    it('crea un elemento y devuelve el resultado', async () => {
      const created = makeItem();
      shoppingListItem.create.mockResolvedValue(created);

      const result = await service.create({
        name: 'Leche',
        quantity: 2,
        unit: 'L',
      });

      expect(result).toBe(created);
    });

    it('no envia quantity, unit, purchased ni active cuando no se proporcionan (usa defaults)', async () => {
      shoppingListItem.create.mockResolvedValue(makeItem());

      await service.create({ name: 'Leche' });

      const arg = shoppingListItem.create.mock.calls[0][0];
      expect(arg.data.name).toBe('Leche');
      expect(arg.data).not.toHaveProperty('quantity');
      expect(arg.data).not.toHaveProperty('unit');
      expect(arg.data).not.toHaveProperty('purchased');
      expect(arg.data).not.toHaveProperty('active');
      expect(arg.data).not.toHaveProperty('category');
      expect(arg.data).not.toHaveProperty('notes');
    });

    it('envia los campos cuando se proporcionan (unit/category como code)', async () => {
      shoppingListItem.create.mockResolvedValue(makeItem());

      await service.create({
        name: 'Pan',
        quantity: 3,
        unit: 'UNIDAD',
        category: 'PANADERIA',
        purchased: true,
        active: false,
        notes: 'Integral',
      });

      const arg = shoppingListItem.create.mock.calls[0][0];
      expect(arg.data).toEqual({
        name: 'Pan',
        quantity: 3,
        unit: 'UNIDAD',
        category: 'PANADERIA',
        purchased: true,
        active: false,
        notes: 'Integral',
      });
    });

    it('normaliza unit/category a MAYUSCULAS antes de validar y guardar', async () => {
      shoppingListItem.create.mockResolvedValue(makeItem());

      await service.create({ name: 'Pan', unit: 'l', category: 'lacteos' });

      const arg = shoppingListItem.create.mock.calls[0][0];
      expect(arg.data.unit).toBe('L');
      expect(arg.data.category).toBe('LACTEOS');
    });

    it('acepta category y unit validos (codes activos de maestra)', async () => {
      shoppingListItem.create.mockResolvedValue(makeItem());

      await expect(
        service.create({ name: 'Pan', unit: 'UNIDAD', category: 'LACTEOS' }),
      ).resolves.toBeDefined();
      expect(catalogFindMany).toHaveBeenCalledWith({
        catalog: 'CATEGORIA',
        active: true,
      });
      expect(catalogFindMany).toHaveBeenCalledWith({
        catalog: 'UNIDAD',
        active: true,
      });
    });

    it('rechaza category que no es un code activo de la maestra CATEGORIA', async () => {
      await expect(
        service.create({ name: 'Pan', category: 'NO_EXISTE' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create({ name: 'Pan', category: 'NO_EXISTE' }),
      ).rejects.toThrow(/maestra CATEGORIA/);
      expect(shoppingListItem.create).not.toHaveBeenCalled();
    });

    it('rechaza unit que no es un code activo de la maestra UNIDAD', async () => {
      await expect(
        service.create({ name: 'Pan', unit: 'INVALIDA' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create({ name: 'Pan', unit: 'INVALIDA' }),
      ).rejects.toThrow(/maestra UNIDAD/);
      expect(shoppingListItem.create).not.toHaveBeenCalled();
    });

    it('no valida ni envia category/unit cuando llegan vacios', async () => {
      shoppingListItem.create.mockResolvedValue(makeItem());

      await service.create({ name: 'Pan', category: '', unit: '' });

      const arg = shoppingListItem.create.mock.calls[0][0];
      expect(arg.data).not.toHaveProperty('category');
      expect(arg.data).not.toHaveProperty('unit');
    });

    it('propaga errores del delegate sin transformarlos', async () => {
      shoppingListItem.create.mockRejectedValue(new Error('db caida'));

      await expect(service.create({ name: 'Leche' })).rejects.toThrow(
        'db caida',
      );
    });
  });

  describe('findOne', () => {
    it('devuelve el elemento existente', async () => {
      const item = makeItem();
      shoppingListItem.findUnique.mockResolvedValue(item);

      const result = await service.findOne(item.id);

      expect(result).toBe(item);
      expect(shoppingListItem.findUnique).toHaveBeenCalledWith({
        where: { id: item.id },
      });
    });

    it('lanza NotFoundException si no existe', async () => {
      shoppingListItem.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza los campos permitidos incluido name', async () => {
      const existing = makeItem();
      shoppingListItem.findUnique.mockResolvedValue(existing);
      shoppingListItem.update.mockResolvedValue(
        makeItem({ name: 'Leche deslactosada', quantity: 2, purchased: true }),
      );

      await service.update(existing.id, {
        name: 'Leche deslactosada',
        quantity: 2,
        purchased: true,
      });

      const arg = shoppingListItem.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: existing.id });
      // name SI es editable, a diferencia de catalog.
      expect(arg.data).toEqual({
        name: 'Leche deslactosada',
        quantity: 2,
        purchased: true,
      });
    });

    it('lanza NotFoundException si el elemento no existe', async () => {
      shoppingListItem.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(shoppingListItem.update).not.toHaveBeenCalled();
    });

    it('guarda unit/category normalizados cuando son codes validos', async () => {
      const existing = makeItem();
      shoppingListItem.findUnique.mockResolvedValue(existing);
      shoppingListItem.update.mockResolvedValue(existing);

      await service.update(existing.id, { unit: 'l', category: 'lacteos' });

      const arg = shoppingListItem.update.mock.calls[0][0];
      expect(arg.data.unit).toBe('L');
      expect(arg.data.category).toBe('LACTEOS');
    });

    it('rechaza category invalida en update (BadRequest) y no actualiza', async () => {
      const existing = makeItem();
      shoppingListItem.findUnique.mockResolvedValue(existing);

      await expect(
        service.update(existing.id, { category: 'NO_EXISTE' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(shoppingListItem.update).not.toHaveBeenCalled();
    });

    it('rechaza unit invalida en update (BadRequest) y no actualiza', async () => {
      const existing = makeItem();
      shoppingListItem.findUnique.mockResolvedValue(existing);

      await expect(
        service.update(existing.id, { unit: 'INVALIDA' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(shoppingListItem.update).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('aplica el filtro category', async () => {
      shoppingListItem.findMany.mockResolvedValue([]);

      await service.findMany({ category: 'Lacteos' });

      expect(shoppingListItem.findMany.mock.calls[0][0].where.category).toBe(
        'Lacteos',
      );
    });

    it('aplica el filtro purchased=true', async () => {
      shoppingListItem.findMany.mockResolvedValue([]);

      await service.findMany({ purchased: true });

      expect(shoppingListItem.findMany.mock.calls[0][0].where.purchased).toBe(
        true,
      );
    });

    it('aplica el filtro active=false', async () => {
      shoppingListItem.findMany.mockResolvedValue([]);

      await service.findMany({ active: false });

      expect(shoppingListItem.findMany.mock.calls[0][0].where.active).toBe(
        false,
      );
    });

    it('ordena por purchased, category y name', async () => {
      shoppingListItem.findMany.mockResolvedValue([]);

      await service.findMany({});

      const arg = shoppingListItem.findMany.mock.calls[0][0];
      expect(arg.orderBy).toEqual([
        { purchased: 'asc' },
        { category: 'asc' },
        { name: 'asc' },
      ]);
    });

    it('no agrega filtros cuando no se pasan', async () => {
      shoppingListItem.findMany.mockResolvedValue([]);

      await service.findMany({});

      const arg = shoppingListItem.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({});
    });
  });
});
