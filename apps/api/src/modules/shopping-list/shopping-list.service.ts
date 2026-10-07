import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { ShoppingListItemModel } from '../../generated/prisma/models/ShoppingListItem';
import { CreateShoppingListItemDto } from './dto/create-shopping-list-item.dto';
import { ListShoppingListItemsDto } from './dto/list-shopping-list-items.dto';
import { UpdateShoppingListItemDto } from './dto/update-shopping-list-item.dto';

@Injectable()
export class ShoppingListService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateShoppingListItemDto,
  ): Promise<ShoppingListItemModel> {
    return this.prisma.shoppingListItem.create({
      data: {
        name: dto.name,
        // quantity, unit, purchased y active usan los defaults del modelo si no
        // se envian.
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
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

    // Todos los campos son editables (incluido name).
    return this.prisma.shoppingListItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.purchased !== undefined ? { purchased: dto.purchased } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }
}
