import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
 * Recorta espacios si el valor es string; deja el resto igual para que las
 * validaciones de tipo (@IsString) sigan reportando correctamente.
 */
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Entrada para crear un ShoppingListItem.
 * `quantity`, `unit`, `purchased` y `active` son opcionales: si no se envian,
 * se usan los defaults del modelo (1, "UNIDAD", false y true). Se recorta
 * (trim) `name`, `category` y `notes` antes de validar, de modo que un valor de
 * solo espacios se considere vacio y sea rechazado.
 */
export class CreateShoppingListItemDto {
  @ApiProperty({
    type: String,
    description: 'Nombre del producto a comprar.',
    example: 'Leche',
    maxLength: 255,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Cantidad del producto. Por defecto 1.',
    default: 1,
    minimum: 1,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    type: String,
    description:
      'Code de la maestra UNIDAD. Por defecto "UNIDAD". Debe ser un code ' +
      'activo de esa maestra.',
    default: 'UNIDAD',
    example: 'L',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'Code de la maestra CATEGORIA (opcional). Debe ser un code activo de ' +
      'esa maestra.',
    example: 'LACTEOS',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Indica si el producto ya fue comprado. Por defecto false.',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  purchased?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Indica si el producto esta activo. Por defecto true.',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Notas adicionales del producto (opcional).',
    example: 'Marca sin lactosa',
    maxLength: 1000,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
