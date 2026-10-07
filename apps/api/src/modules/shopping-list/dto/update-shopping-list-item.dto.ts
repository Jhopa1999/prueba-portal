import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Recorta espacios si el valor es string; deja el resto igual.
 */
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Entrada para actualizar un ShoppingListItem.
 * A DIFERENCIA de CatalogItem, aqui TODOS los campos son editables (incluido
 * `name`): un producto no tiene un identificador funcional estable. Todos son
 * opcionales; los campos no incluidos en el whitelist seran rechazados por el
 * ValidationPipe con forbidNonWhitelisted.
 */
export class UpdateShoppingListItemDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Nombre del producto a comprar.',
    example: 'Leche',
    maxLength: 255,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Cantidad del producto.',
    minimum: 1,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Unidad de medida del producto.',
    example: 'litro',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Categoria del producto.',
    example: 'Lacteos',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Indica si el producto ya fue comprado.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  purchased?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Indica si el producto esta activo.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Notas adicionales del producto.',
    example: 'Marca sin lactosa',
    maxLength: 1000,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
