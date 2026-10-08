import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { ShoppingListItemModel } from '../../generated/prisma/models/ShoppingListItem';
import { CatalogService } from '../catalog/catalog.service';
import { CreateShoppingListItemDto } from './dto/create-shopping-list-item.dto';
import { ListShoppingListItemsDto } from './dto/list-shopping-list-items.dto';
import { UpdateShoppingListItemDto } from './dto/update-shopping-list-item.dto';

// Nombres de las maestras de las que provienen category y unit.
const CATEGORIA_CATALOG = 'CATEGORIA';
const UNIDAD_CATALOG = 'UNIDAD';

@Injectable()
export class ShoppingListService {
  // Se inyecta CatalogService (opcion a): reutiliza la capacidad de negocio de
  // consultar maestras en vez de reconsultar Prisma por separado.
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  /**
   * Normaliza un code igual que CatalogService: recorta y pasa a MAYUSCULAS.
   */
  private normalizeCode(value: string): string {
    return value.trim().toUpperCase();
  }

  /**
   * Validacion blanda: si se envia un code (no vacio), debe existir y estar
   * activo en la maestra indicada. Devuelve el code normalizado (lo que se
   * guarda); devuelve undefined si no habia valor que validar. Lanza
   * BadRequestException con mensaje de negocio ante un code invalido/inactivo.
   */
  private async resolveCatalogCode(
    rawValue: string | undefined,
    catalog: string,
  ): Promise<string | undefined> {
    if (rawValue === undefined) return undefined;
    const code = this.normalizeCode(rawValue);
    if (code === '') return undefined;

    const activos = await this.catalog.findMany({ catalog, active: true });
    const existe = activos.some((item) => item.code === code);
    if (!existe) {
      throw new BadRequestException(
        `El codigo "${code}" no existe o no esta activo en la maestra ${catalog}.`,
      );
    }
    return code;
  }

  async create(
    dto: CreateShoppingListItemDto,
  ): Promise<ShoppingListItemModel> {
    const category = await this.resolveCatalogCode(
      dto.category,
      CATEGORIA_CATALOG,
    );
    const unit = await this.resolveCatalogCode(dto.unit, UNIDAD_CATALOG);

    return this.prisma.shoppingListItem.create({
      data: {
        name: dto.name,
        // quantity, unit, purchased y active usan los defaults del modelo si no
        // se envian. unit/category guardan el code validado de la maestra.
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(dto.purchased !== undefined ? { purchased: dto.purchased } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async findMany(
    filters: ListShoppingListItemsDto,
  ): Promise<ShoppingListItemModel[]> {
    const where: Prisma.ShoppingListItemWhereInput = {};
    if (filters.category !== undefined) {
      where.category = filters.category;
    }
    if (filters.purchased !== undefined) {
      where.purchased = filters.purchased;
    }
    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    return this.prisma.shoppingListItem.findMany({
      where,
      // Pendientes primero, luego por categoria y nombre.
      orderBy: [{ purchased: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<ShoppingListItemModel> {
    const item = await this.prisma.shoppingListItem.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`ShoppingListItem "${id}" no encontrado.`);
    }
    return item;
  }

  async update(
    id: string,
    dto: UpdateShoppingListItemDto,
  ): Promise<ShoppingListItemModel> {
    // Garantiza 404 si no existe antes de intentar actualizar.
    await this.findOne(id);

    const category = await this.resolveCatalogCode(
      dto.category,
      CATEGORIA_CATALOG,
    );
    const unit = await this.resolveCatalogCode(dto.unit, UNIDAD_CATALOG);

    // Todos los campos son editables (incluido name).
    return this.prisma.shoppingListItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(dto.purchased !== undefined ? { purchased: dto.purchased } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }
}
