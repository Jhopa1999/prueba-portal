import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ShoppingListController } from './shopping-list.controller';
import { ShoppingListService } from './shopping-list.service';

/**
 * Lista de mercado: productos a comprar con cantidad, unidad y estado.
 * Importa PrismaModule explicitamente (PrismaModule no es global), de modo que
 * la dependencia de persistencia queda visible.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ShoppingListController],
  providers: [ShoppingListService],
})
export class ShoppingListModule {}
