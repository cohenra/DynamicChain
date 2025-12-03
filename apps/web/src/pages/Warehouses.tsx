import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseService, WarehouseCreate, Warehouse } from '@/services/warehouses';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, XCircle, Pencil, Trash2, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';

type WarehouseFormValues = {
  name: string;
  code: string;
  address: string;
};

export default function Warehouses() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Create schema with translations
  const warehouseSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('warehouses.nameRequired')),
        code: z.string().min(1, t('warehouses.codeRequired')),
        address: z.string().min(1, t('warehouses.addressRequired')),
      }),
    [t]
  );

  // Fetch warehouses
  const {
    data: warehouses,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseService.getWarehouses,
  });

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: warehouseService.createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setIsSheetOpen(false);
      setEditingWarehouse(null);
      form.reset();
    },
  });

  // Update warehouse mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WarehouseCreate }) =>
      warehouseService.updateWarehouse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setIsSheetOpen(false);
      setEditingWarehouse(null);
      form.reset();
    },
  });

  // Delete warehouse mutation
  const deleteWarehouseMutation = useMutation({
    mutationFn: warehouseService.deleteWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
    },
  });

  const handleAddNew = () => {
    setEditingWarehouse(null);
    form.reset({
      name: '',
      code: '',
      address: '',
    });
    setIsSheetOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    form.reset({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
    });
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('common.delete') + '?')) {
      deleteWarehouseMutation.mutate(id);
    }
  };

  const handleSubmit = (values: WarehouseFormValues) => {
    const data: WarehouseCreate = {
      name: values.name,
      code: values.code,
      address: values.address,
    };

    if (editingWarehouse) {
      updateWarehouseMutation.mutate({ id: editingWarehouse.id, data });
    } else {
      createWarehouseMutation.mutate(data);
    }
  };

  const isSubmitting = createWarehouseMutation.isPending || updateWarehouseMutation.isPending;
  const submitError = createWarehouseMutation.error || updateWarehouseMutation.error;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('warehouses.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('warehouses.description')}</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="ml-2 h-4 w-4" />
          {t('warehouses.addWarehouse')}
        </Button>
      </div>

      {/* Warehouses Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('warehouses.loading')}</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">{t('warehouses.loadingError')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : t('common.unexpectedError')}
              </p>
            </div>
          </div>
        ) : warehouses && warehouses.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">{t('warehouses.noWarehouses')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('warehouses.addFirstWarehouse')}
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('warehouses.name')}</TableHead>
                <TableHead>{t('warehouses.code')}</TableHead>
                <TableHead>{t('warehouses.address')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses?.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  <TableCell>{warehouse.code}</TableCell>
                  <TableCell className="max-w-md truncate">{warehouse.address}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/warehouses/${warehouse.id}`)}
                        title={t('common.view')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(warehouse)}
                        title={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(warehouse.id)}
                        title={t('common.delete')}
                        disabled={deleteWarehouseMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Warehouse Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingWarehouse ? t('warehouses.editWarehouse') : t('warehouses.addNewWarehouse')}
            </SheetTitle>
            <SheetDescription>
              {editingWarehouse
                ? t('warehouses.editWarehouseDescription')
                : t('warehouses.addWarehouseDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('warehouses.name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('warehouses.enterName')}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('warehouses.code')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('warehouses.enterCode')}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('warehouses.address')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('warehouses.enterAddress')}
                          disabled={isSubmitting}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('common.saving') : t('warehouses.saveWarehouse')}
                  </Button>
                </div>
              </form>
            </Form>

            {submitError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  {submitError instanceof Error
                    ? submitError.message
                    : editingWarehouse
                    ? t('warehouses.updateError')
                    : t('warehouses.createError')}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
