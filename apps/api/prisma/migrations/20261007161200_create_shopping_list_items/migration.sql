-- CreateTable
CREATE TABLE "shopping_list_items" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "category" TEXT,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopping_list_items_category_idx" ON "shopping_list_items"("category");

-- CreateIndex
CREATE INDEX "shopping_list_items_purchased_idx" ON "shopping_list_items"("purchased");

-- CreateIndex
CREATE INDEX "shopping_list_items_active_idx" ON "shopping_list_items"("active");
