import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ShoppingListModule } from './modules/shopping-list/shopping-list.module';

@Module({
  imports: [HealthModule, CatalogModule, ShoppingListModule],
})
export class AppModule {}
