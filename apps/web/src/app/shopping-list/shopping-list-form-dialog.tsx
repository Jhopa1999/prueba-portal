'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ShoppingListItem } from '@/lib/api-client';

export interface ShoppingListFormValues {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  purchased: boolean;
  active: boolean;
  notes: string;
}

interface ShoppingListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, el dialog esta en modo edicion. */
  editing?: ShoppingListItem | null;
  submitting: boolean;
  onSubmit: (values: ShoppingListFormValues) => void;
}

const EMPTY: ShoppingListFormValues = {
  name: '',
  quantity: 1,
  unit: 'unidad',
  category: '',
  purchased: false,
  active: true,
  notes: '',
};

export function ShoppingListFormDialog({
  open,
  onOpenChange,
  editing,
  submitting,
  onSubmit,
}: ShoppingListFormDialogProps) {
  const isEdit = Boolean(editing);
  const [values, setValues] = React.useState<ShoppingListFormValues>(EMPTY);
  const [error, setError] = React.useState<string | null>(null);

  // Reinicia el formulario cada vez que se abre (crear o editar).
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setValues({
        name: editing.name,
        quantity: editing.quantity,
        unit: editing.unit,
        category: editing.category ?? '',
        purchased: editing.purchased,
        active: editing.active,
        notes: editing.notes ?? '',
      });
    } else {
      setValues(EMPTY);
    }
  }, [open, editing]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Validacion minima en cliente; el backend es la autoridad.
    const name = values.name.trim();
    // A diferencia de catalog, name SI es editable en edicion y es obligatorio
    // en ambos modos.
    if (!name) {
      setError('El nombre es obligatorio.');
      return;
    }
    const quantity =
      Number.isFinite(values.quantity) && values.quantity >= 1
        ? values.quantity
        : 1;
    setError(null);
    onSubmit({
      name,
      quantity,
      unit: values.unit.trim() || 'unidad',
      category: values.category.trim(),
      purchased: values.purchased,
      active: values.active,
      notes: values.notes.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza los datos del producto de la lista.'
              : 'Agrega un producto a la lista de mercado.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={values.name}
              placeholder="Leche"
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={String(values.quantity)}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  quantity: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="unit">Unidad</Label>
            <Input
              id="unit"
              value={values.unit}
              placeholder="unidad"
              onChange={(e) =>
                setValues((v) => ({ ...v, unit: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              value={values.category}
              placeholder="Lacteos"
              onChange={(e) =>
                setValues((v) => ({ ...v, category: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Input
              id="notes"
              value={values.notes}
              placeholder="Marca sin lactosa"
              onChange={(e) =>
                setValues((v) => ({ ...v, notes: e.target.value }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="purchased">Comprado</Label>
            <Switch
              id="purchased"
              checked={values.purchased}
              onCheckedChange={(checked) =>
                setValues((v) => ({ ...v, purchased: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Activo</Label>
            <Switch
              id="active"
              checked={values.active}
              onCheckedChange={(checked) =>
                setValues((v) => ({ ...v, active: checked }))
              }
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
