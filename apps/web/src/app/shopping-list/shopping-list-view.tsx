'use client';

import * as React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ShoppingListItem } from '@/lib/api-client';
import {
  ShoppingListError,
  createShoppingListItem,
  listShoppingListItems,
  updateShoppingListItem,
  type ShoppingListFilters,
} from '@/lib/shopping-list';
import {
  ShoppingListFormDialog,
  type ShoppingListFormValues,
} from './shopping-list-form-dialog';

type PurchasedFilter = 'all' | 'purchased' | 'pending';
type ActiveFilter = 'all' | 'active' | 'inactive';
type LoadState = 'loading' | 'success' | 'error';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ShoppingListView() {
  const [items, setItems] = React.useState<ShoppingListItem[]>([]);
  const [state, setState] = React.useState<LoadState>('loading');

  // Filtros aplicados (los que se envian al backend).
  const [categoryInput, setCategoryInput] = React.useState('');
  const [purchasedFilter, setPurchasedFilter] =
    React.useState<PurchasedFilter>('all');
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>('all');

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ShoppingListItem | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const buildFilters = React.useCallback((): ShoppingListFilters => {
    const filters: ShoppingListFilters = {};
    const category = categoryInput.trim();
    if (category) filters.category = category;
    if (purchasedFilter === 'purchased') filters.purchased = true;
    if (purchasedFilter === 'pending') filters.purchased = false;
    if (activeFilter === 'active') filters.active = true;
    if (activeFilter === 'inactive') filters.active = false;
    return filters;
  }, [categoryInput, purchasedFilter, activeFilter]);

  const load = React.useCallback(async () => {
    setState('loading');
    try {
      const data = await listShoppingListItems(buildFilters());
      setItems(data);
      setState('success');
    } catch {
      setState('error');
    }
  }, [buildFilters]);

  // Carga inicial.
  React.useEffect(() => {
    void load();
    // Solo al montar; los filtros se aplican con el boton Aplicar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilters(event: React.FormEvent) {
    event.preventDefault();
    void load();
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: ShoppingListItem) {
    setEditing(item);
    setDialogOpen(true);
  }

  async function handleSubmit(values: ShoppingListFormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await updateShoppingListItem(editing.id, {
          name: values.name,
          quantity: values.quantity,
          unit: values.unit,
          category: values.category,
          purchased: values.purchased,
          active: values.active,
          notes: values.notes,
        });
        toast.success('Producto actualizado.');
      } else {
        await createShoppingListItem({
          name: values.name,
          quantity: values.quantity,
          unit: values.unit,
          category: values.category,
          purchased: values.purchased,
          active: values.active,
          notes: values.notes,
        });
        toast.success('Producto creado.');
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      const message =
        err instanceof ShoppingListError
          ? err.message
          : 'Ocurrio un error inesperado.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePurchased(item: ShoppingListItem) {
    setTogglingId(item.id);
    try {
      await updateShoppingListItem(item.id, { purchased: !item.purchased });
      toast.success(
        item.purchased
          ? 'Producto marcado como pendiente.'
          : 'Producto marcado como comprado.',
      );
      await load();
    } catch (err) {
      const message =
        err instanceof ShoppingListError
          ? err.message
          : 'Ocurrio un error inesperado.';
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleActive(item: ShoppingListItem) {
    setTogglingId(item.id);
    try {
      await updateShoppingListItem(item.id, { active: !item.active });
      toast.success(item.active ? 'Producto desactivado.' : 'Producto activado.');
      await load();
    } catch (err) {
      const message =
        err instanceof ShoppingListError
          ? err.message
          : 'Ocurrio un error inesperado.';
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Lista de mercado
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra los productos que necesitas comprar.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" />
          Nuevo producto
        </Button>
      </header>

      <form
        onSubmit={handleApplyFilters}
        className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="grid flex-1 gap-2">
          <Label htmlFor="filter-category">Categoria</Label>
          <Input
            id="filter-category"
            placeholder="Todas"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:w-48">
          <Label htmlFor="filter-purchased">Comprado</Label>
          <Select
            value={purchasedFilter}
            onValueChange={(value) =>
              setPurchasedFilter(value as PurchasedFilter)
            }
          >
            <SelectTrigger id="filter-purchased">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="purchased">Comprados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 sm:w-48">
          <Label htmlFor="filter-active">Estado</Label>
          <Select
            value={activeFilter}
            onValueChange={(value) => setActiveFilter(value as ActiveFilter)}
          >
            <SelectTrigger id="filter-active">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
      </form>

      <section aria-live="polite" className="rounded-lg border bg-card">
        {state === 'loading' ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : state === 'error' ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No fue posible comunicarse con el servidor.
            </p>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-medium">No hay productos todavia.</p>
            <p className="text-sm text-muted-foreground">
              Agrega el primer producto para empezar tu lista.
            </p>
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Nuevo producto
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Comprado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell>{item.category ?? '-'}</TableCell>
                  <TableCell>
                    {item.purchased ? (
                      <Badge variant="success">Comprado</Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.active ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {item.notes ?? '-'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(item.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(item)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant={item.purchased ? 'secondary' : 'default'}
                        size="sm"
                        disabled={togglingId === item.id}
                        onClick={() => void handleTogglePurchased(item)}
                      >
                        {item.purchased ? 'Marcar pendiente' : 'Marcar comprado'}
                      </Button>
                      <Button
                        variant={item.active ? 'secondary' : 'default'}
                        size="sm"
                        disabled={togglingId === item.id}
                        onClick={() => void handleToggleActive(item)}
                      >
                        {item.active ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <ShoppingListFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
