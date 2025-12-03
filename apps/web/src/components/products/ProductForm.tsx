import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Product, ProductCreate } from '@/services/products';
import { depositorService } from '@/services/depositors';
import { productUOMService, ProductUOM, ProductUOMCreate, ProductUOMUpdate } from '@/services/product-uoms';
import { X, Plus, Loader2, Edit, Trash2, Package } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UOMDialog } from './UOMDialog';
import { toast } from 'sonner';

type ProductFormValues = {
  depositor_id: string;
  sku: string;
  name: string;
  barcode?: string;
  base_unit?: string;
};

interface CustomAttribute {
  id: string;
  key: string;
  value: string;
}

interface ProductFormProps {
  onSubmit: (data: ProductCreate) => void;
  isLoading?: boolean;
  product?: Product | null;
  mode?: 'create' | 'edit';
}

export function ProductForm({ onSubmit, isLoading, product, mode = 'create' }: ProductFormProps) {
  const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>([]);
  const [uomDialogOpen, setUomDialogOpen] = useState(false);
  const [editingUom, setEditingUom] = useState<ProductUOM | null>(null);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Create schema with translations
  const productSchema = useMemo(
    () =>
      z.object({
        depositor_id: z.string().min(1, t('products.depositorRequired')),
        sku: z.string().min(1, t('products.skuRequired')),
        name: z.string().min(1, t('products.nameRequired')),
        barcode: z.string().optional(),
        base_unit: z.string().optional(),
      }),
    [t]
  );

  // Fetch depositors
  const {
    data: depositors,
    isLoading: isLoadingDepositors,
  } = useQuery({
    queryKey: ['depositors'],
    queryFn: depositorService.getDepositors,
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      depositor_id: product?.depositor_id.toString() || '',
      sku: product?.sku || '',
      name: product?.name || '',
      barcode: product?.barcode || '',
      base_unit: product?.base_unit || '',
    },
  });

  // Fetch product UOMs if in edit mode
  const { data: productUOMs, isLoading: isLoadingUOMs } = useQuery({
    queryKey: ['product-uoms', product?.id],
    queryFn: () => productUOMService.getProductUOMs(product!.id),
    enabled: mode === 'edit' && !!product?.id,
  });

  // Create UOM mutation
  const createUOMMutation = useMutation({
    mutationFn: (data: ProductUOMCreate) => productUOMService.createUOM(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-uoms', product?.id] });
      setUomDialogOpen(false);
      toast.success(t('products.uoms.createSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('products.uoms.createError'));
    },
  });

  // Update UOM mutation
  const updateUOMMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductUOMUpdate }) =>
      productUOMService.updateUOM(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-uoms', product?.id] });
      setUomDialogOpen(false);
      setEditingUom(null);
      toast.success(t('products.uoms.updateSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('products.uoms.updateError'));
    },
  });

  // Delete UOM mutation
  const deleteUOMMutation = useMutation({
    mutationFn: (id: number) => productUOMService.deleteUOM(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-uoms', product?.id] });
      toast.success(t('products.uoms.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('products.uoms.deleteError'));
    },
  });

  const addCustomAttribute = () => {
    setCustomAttributes([
      ...customAttributes,
      { id: Math.random().toString(36).substr(2, 9), key: '', value: '' },
    ]);
  };

  const removeCustomAttribute = (id: string) => {
    setCustomAttributes(customAttributes.filter((attr) => attr.id !== id));
  };

  const updateCustomAttribute = (id: string, field: 'key' | 'value', value: string) => {
    setCustomAttributes(
      customAttributes.map((attr) =>
        attr.id === id ? { ...attr, [field]: value } : attr
      )
    );
  };

  const handleSubmit = (values: ProductFormValues) => {
    // Convert custom attributes array to object
    const customAttrsObject = customAttributes.reduce(
      (acc, attr) => {
        if (attr.key.trim()) {
          acc[attr.key.trim()] = attr.value;
        }
        return acc;
      },
      {} as Record<string, any>
    );

    const productData: ProductCreate = {
      depositor_id: parseInt(values.depositor_id, 10),
      sku: values.sku,
      name: values.name,
      barcode: values.barcode || null,
      base_unit: values.base_unit || null,
      custom_attributes: customAttrsObject,
    };

    onSubmit(productData);
  };

  const handleUOMSubmit = (data: ProductUOMCreate | ProductUOMUpdate) => {
    if (editingUom) {
      updateUOMMutation.mutate({ id: editingUom.id, data: data as ProductUOMUpdate });
    } else {
      createUOMMutation.mutate(data as ProductUOMCreate);
    }
  };

  const handleAddUOM = () => {
    setEditingUom(null);
    setUomDialogOpen(true);
  };

  const handleEditUOM = (uom: ProductUOM) => {
    setEditingUom(uom);
    setUomDialogOpen(true);
  };

  const handleDeleteUOM = (uomId: number) => {
    if (confirm(t('products.uoms.confirmDelete'))) {
      deleteUOMMutation.mutate(uomId);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Standard Fields */}
        <FormField
          control={form.control}
          name="depositor_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('products.depositor')}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading || isLoadingDepositors}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingDepositors ? t('common.loading') : t('products.selectDepositor')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingDepositors ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : depositors && depositors.length > 0 ? (
                    depositors.map((depositor) => (
                      <SelectItem key={depositor.id} value={depositor.id.toString()}>
                        {depositor.name} ({depositor.code})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                      {t('products.noDepositors')}
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('products.sku')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('products.enterSku')} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('products.name')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('products.enterName')} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('products.barcodeOptional')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('products.enterBarcode')} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="base_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('products.baseUnitOptional')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('products.enterBaseUnit')} disabled={isLoading} />
              </FormControl>
              <FormDescription>
                {t('products.baseUnitDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Packaging & UOMs Section (Edit Mode Only) */}
        {mode === 'edit' && product?.id && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <h3 className="text-sm font-medium">{t('products.packagingAndUOMs')}</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddUOM}
                disabled={isLoadingUOMs}
              >
                <Plus className="ml-2 h-4 w-4" />
                {t('products.addUOM')}
              </Button>
            </div>

            {isLoadingUOMs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : productUOMs && productUOMs.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('products.uoms.name')}</TableHead>
                      <TableHead>{t('products.uoms.conversionFactor')}</TableHead>
                      <TableHead>{t('products.uoms.barcode')}</TableHead>
                      <TableHead>{t('products.uoms.dimensions')}</TableHead>
                      <TableHead>{t('products.uoms.weight')}</TableHead>
                      <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productUOMs.map((uom) => (
                      <TableRow key={uom.id}>
                        <TableCell className="font-medium">{uom.uom_name}</TableCell>
                        <TableCell>{uom.conversion_factor}</TableCell>
                        <TableCell>{uom.barcode || '-'}</TableCell>
                        <TableCell>
                          {uom.length && uom.width && uom.height
                            ? `${uom.length} × ${uom.width} × ${uom.height} cm`
                            : '-'}
                        </TableCell>
                        <TableCell>{uom.weight ? `${uom.weight} kg` : '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUOM(uom)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUOM(uom.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('products.noUOMsDefined')}
              </p>
            )}
          </div>
        )}

        {/* Dynamic Attributes Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t('products.customAttributes')}</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomAttribute}
              disabled={isLoading}
            >
              <Plus className="ml-2 h-4 w-4" />
              {t('products.addAttribute')}
            </Button>
          </div>

          {customAttributes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('products.noCustomAttributesDefined')}
            </p>
          ) : (
            <div className="space-y-3">
              {customAttributes.map((attr) => (
                <div key={attr.id} className="flex items-center gap-2">
                  <Input
                    placeholder={t('products.keyPlaceholder')}
                    value={attr.key}
                    onChange={(e) =>
                      updateCustomAttribute(attr.id, 'key', e.target.value)
                    }
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    placeholder={t('products.valuePlaceholder')}
                    value={attr.value}
                    onChange={(e) =>
                      updateCustomAttribute(attr.id, 'value', e.target.value)
                    }
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomAttribute(attr.id)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('common.saving') : t('products.saveProduct')}
          </Button>
        </div>
      </form>

      {/* UOM Dialog */}
      <UOMDialog
        open={uomDialogOpen}
        onOpenChange={setUomDialogOpen}
        onSubmit={handleUOMSubmit}
        isLoading={createUOMMutation.isPending || updateUOMMutation.isPending}
        productId={product?.id}
        uom={editingUom}
      />
    </Form>
  );
}
