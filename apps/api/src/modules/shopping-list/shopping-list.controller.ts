import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ShoppingListService } from './shopping-list.service';
import { CreateShoppingListItemDto } from './dto/create-shopping-list-item.dto';
import { ListShoppingListItemsDto } from './dto/list-shopping-list-items.dto';
import { ShoppingListItemResponseDto } from './dto/shopping-list-item-response.dto';
import { UpdateShoppingListItemDto } from './dto/update-shopping-list-item.dto';

/**
 * API REST de la lista de mercado (ShoppingListItem).
 * El controller solo recibe HTTP, aplica DTOs y delega en el service.
 */
@ApiTags('shopping-list-items')
@Controller('shopping-list-items')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Post()
  @ApiOperation({ summary: 'Crea un producto en la lista de mercado.' })
  @ApiBody({ type: CreateShoppingListItemDto })
  @ApiResponse({ status: 201, description: 'Producto creado.', type: ShoppingListItemResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada invalidos.' })
  create(@Body() dto: CreateShoppingListItemDto) {
    return this.shoppingListService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista productos de la lista de mercado, con filtros opcionales.' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtra por categoria.' })
  @ApiQuery({ name: 'purchased', required: false, type: Boolean, description: 'Filtra por estado comprado.' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filtra por estado activo.' })
  @ApiResponse({ status: 200, description: 'Listado de productos.', type: [ShoppingListItemResponseDto] })
  @ApiResponse({ status: 400, description: 'Parametros de filtro invalidos.' })
  findMany(@Query() filters: ListShoppingListItemsDto) {
    return this.shoppingListService.findMany(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un producto de la lista por id.' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Identificador UUID del producto.' })
  @ApiResponse({ status: 200, description: 'Producto encontrado.', type: ShoppingListItemResponseDto })
  @ApiResponse({ status: 400, description: 'El id no es un UUID valido.' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shoppingListService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza los datos de un producto de la lista.' })
  @ApiBody({ type: UpdateShoppingListItemDto })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Identificador UUID del producto.' })
  @ApiResponse({ status: 200, description: 'Producto actualizado.', type: ShoppingListItemResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada invalidos o id no UUID.' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShoppingListItemDto,
  ) {
    return this.shoppingListService.update(id, dto);
  }
}
