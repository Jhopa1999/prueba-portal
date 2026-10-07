import { ApiProperty } from '@nestjs/swagger';

/**
 * Contrato HTTP de un ShoppingListItem.
 *
 * Es un DTO propio del contrato OpenAPI, separado del tipo interno generado por
 * Prisma: la forma de persistencia (Prisma) no debe filtrarse al contrato HTTP.
 * Hoy ambos coinciden en forma, por eso no se necesita una capa de mappers.
 */
export class ShoppingListItemResponseDto {
  @ApiProperty({ type: String, format: 'uuid', description: 'Identificador unico.' })
  id!: string;

  @ApiProperty({ type: String, description: 'Nombre del producto.', example: 'Leche' })
  name!: string;

  @ApiProperty({ type: Number, description: 'Cantidad del producto.', example: 2 })
  quantity!: number;

  @ApiProperty({ type: String, description: 'Unidad de medida.', example: 'litro' })
  unit!: string;

  @ApiProperty({ type: String, nullable: true, description: 'Categoria del producto.', example: 'Lacteos' })
  category!: string | null;

  @ApiProperty({ type: Boolean, description: 'Indica si el producto ya fue comprado.', example: false })
  purchased!: boolean;

  @ApiProperty({ type: Boolean, description: 'Indica si el producto esta activo.', example: true })
  active!: boolean;

  @ApiProperty({ type: String, nullable: true, description: 'Notas adicionales.', example: 'Marca sin lactosa' })
  notes!: string | null;

  @ApiProperty({ type: String, format: 'date-time', description: 'Fecha de creacion.' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', description: 'Fecha de ultima actualizacion.' })
  updatedAt!: Date;
}
