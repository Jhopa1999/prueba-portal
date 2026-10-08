import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ShoppingListController } from './shopping-list.controller';
import { ShoppingListService } from './shopping-list.service';

/**
 * Lista de mercado: productos a comprar con cantidad, unidad y estado.
 * Importa PrismaModule explicitamente (PrismaModule no es global), de modo que
 * la dependencia de persistencia queda visible. Importa CatalogModule para
 * reutilizar CatalogService y validar que category/unit sean codes de maestra.
 */
@Module({
  imports: [PrismaModule, CatalogModule],
  controllers: [ShoppingListController],
  providers: [ShoppingListService],
})
export class ShoppingListModule {}
