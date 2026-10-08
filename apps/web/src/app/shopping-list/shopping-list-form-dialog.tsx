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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CatalogItem, ShoppingListItem } from '@/lib/api-client';

export interface ShoppingListFormValues {
  name: string;
  quantity: number;
  // unit y category guardan el CODE de la maestra (no la etiqueta).
  unit: string;
  category: string;
  purchased: boolean;
  active: boolean;
  notes: string;
}

// Valor interno del Select para "Sin categoria". No se envia como code: se
// traduce a cadena vacia al enviar (categoria es opcional).
const SIN_CATEGORIA = '__none__';
const DEFAULT_UNIT = 'UNIDAD';

interface ShoppingListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, el dialog esta en modo edicion. */
  editing?: ShoppingListItem | null;
  submitting: boolean;
  onSubmit: (values: ShoppingListFormValues) => void;
  /** Opciones activas de la maestra CATEGORIA. */
  categoryOptions: CatalogItem[];
  /** Opciones activas de la maestra UNIDAD. */
  unitOptions: CatalogItem[];
  /** Estado de carga de las maestras (deshabilita los selects). */
  optionsLoading: boolean;
}

const EMPTY: ShoppingListFormValues = {
  name: '',
  quantity: 1,
  unit: DEFAULT_UNIT,
  category: '',
  purchased: false,
  active: true,
  notes: '',
};

/**
 * Combina las opciones activas con el valor guardado del item en edicion. Si el
 * code guardado ya no es una opcion activa, se agrega como opcion de respaldo
 * (etiquetada con el code crudo) para no perder el dato en pantalla.
 */
function withFallback(
  options: CatalogItem[],
  currentCode: string,
): CatalogItem[] {
  if (!currentCode) return options;
  if (options.some((o) => o.code === currentCode)) return options;
  const fallback: CatalogItem = {
    id: `fallback-${currentCode}`,
    catalog: '',
    code: currentCode,
    label: `${currentCode} (inactivo)`,
    active: false,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  };
  return [...options, fallback];
}

export function ShoppingListFormDialog({
  open,
  onOpenChange,
  editing,
  submitting,
  onSubmit,
  categoryOptions,
  unitOptions,
  optionsLoading,
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

  // Opciones efectivas, con respaldo del code guardado si quedo inactivo.
  const categoryChoices = React.useMemo(
    () => withFallback(categoryOptions, values.category),
    [categoryOptions, values.category],
  );
  const unitChoices = React.useMemo(
    () => withFallback(unitOptions, values.unit),
    [unitOptions, values.unit],
  );

  const noUnits = !optionsLoading && unitChoices.length === 0;

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
      unit: values.unit || DEFAULT_UNIT,
      category: values.category,
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
            <Select
              value={values.unit || undefined}
              onValueChange={(value) =>
                setValues((v) => ({ ...v, unit: value }))
              }
              disabled={optionsLoading || noUnits}
            >
              <SelectTrigger id="unit">
                <SelectValue
                  placeholder={
                    optionsLoading ? 'Cargando unidades...' : 'Selecciona unidad'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {unitChoices.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {noUnits ? (
              <p className="text-sm text-muted-foreground">
                No hay unidades en la maestra UNIDAD. Crea valores en Maestras
                para poder elegir una unidad.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={values.category === '' ? SIN_CATEGORIA : values.category}
              onValueChange={(value) =>
                setValues((v) => ({
                  ...v,
                  category: value === SIN_CATEGORIA ? '' : value,
                }))
              }
              disabled={optionsLoading}
            >
              <SelectTrigger id="category">
                <SelectValue
                  placeholder={
                    optionsLoading
                      ? 'Cargando categorias...'
                      : 'Sin categoria'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_CATEGORIA}>Sin categoria</SelectItem>
                {categoryChoices.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!optionsLoading && categoryOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay categorias en la maestra CATEGORIA. Puedes guardar sin
                categoria o crear valores en Maestras.
              </p>
            ) : null}
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
