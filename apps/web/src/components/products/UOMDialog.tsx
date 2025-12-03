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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ProductUOM, ProductUOMCreate, ProductUOMUpdate } from '@/services/product-uoms';
import { useEffect, useMemo } from 'react';

interface UOMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductUOMCreate | ProductUOMUpdate) => void;
  isLoading?: boolean;
  productId?: number;
  uom?: ProductUOM | null;
}

type UOMFormValues = {
  uom_name: string;
  conversion_factor: string;
  barcode?: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
};

export function UOMDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  productId,
  uom,
}: UOMDialogProps) {
  const { t } = useTranslation();

  // Create schema with translations
  const uomSchema = useMemo(
    () =>
      z.object({
        uom_name: z.string().min(1, t('products.uoms.nameRequired')),
        conversion_factor: z
          .string()
          .min(1, t('products.uoms.conversionFactorRequired'))
          .refine(
            (val) => {
              const num = parseFloat(val);
              return !isNaN(num) && num > 0;
            },
            { message: t('products.uoms.conversionFactorMustBePositive') }
          ),
        barcode: z.string().optional(),
        length: z
          .string()
          .optional()
          .refine(
            (val) => {
              if (!val) return true;
              const num = parseFloat(val);
              return !isNaN(num) && num > 0;
            },
            { message: t('products.uoms.mustBePositive') }
          ),
        width: z
          .string()
          .optional()
          .refine(
            (val) => {
              if (!val) return true;
              const num = parseFloat(val);
              return !isNaN(num) && num > 0;
            },
            { message: t('products.uoms.mustBePositive') }
          ),
        height: z
          .string()
          .optional()
          .refine(
            (val) => {
              if (!val) return true;
              const num = parseFloat(val);
              return !isNaN(num) && num > 0;
            },
            { message: t('products.uoms.mustBePositive') }
          ),
        weight: z
          .string()
          .optional()
          .refine(
            (val) => {
              if (!val) return true;
              const num = parseFloat(val);
              return !isNaN(num) && num > 0;
            },
            { message: t('products.uoms.mustBePositive') }
          ),
      }),
    [t]
  );

  const form = useForm<UOMFormValues>({
    resolver: zodResolver(uomSchema),
    defaultValues: {
      uom_name: '',
      conversion_factor: '',
      barcode: '',
      length: '',
      width: '',
      height: '',
      weight: '',
    },
  });

  // Calculate volume from dimensions
  const watchLength = form.watch('length');
  const watchWidth = form.watch('width');
  const watchHeight = form.watch('height');

  const calculatedVolume = useMemo(() => {
    if (watchLength && watchWidth && watchHeight) {
      const l = parseFloat(watchLength);
      const w = parseFloat(watchWidth);
      const h = parseFloat(watchHeight);
      if (!isNaN(l) && !isNaN(w) && !isNaN(h)) {
        return (l * w * h).toFixed(2);
      }
    }
    return null;
  }, [watchLength, watchWidth, watchHeight]);

  // Reset form when dialog opens/closes or UOM changes
  useEffect(() => {
    if (open) {
      if (uom) {
        form.reset({
          uom_name: uom.uom_name,
          conversion_factor: uom.conversion_factor.toString(),
          barcode: uom.barcode || '',
          length: uom.length?.toString() || '',
          width: uom.width?.toString() || '',
          height: uom.height?.toString() || '',
          weight: uom.weight?.toString() || '',
        });
      } else {
        form.reset({
          uom_name: '',
          conversion_factor: '',
          barcode: '',
          length: '',
          width: '',
          height: '',
          weight: '',
        });
      }
    }
  }, [open, uom, form]);

  const handleSubmit = (values: UOMFormValues) => {
    const data: any = {
      uom_name: values.uom_name,
      conversion_factor: parseFloat(values.conversion_factor),
      barcode: values.barcode || null,
      length: values.length ? parseFloat(values.length) : null,
      width: values.width ? parseFloat(values.width) : null,
      height: values.height ? parseFloat(values.height) : null,
      weight: values.weight ? parseFloat(values.weight) : null,
    };

    // Add product_id only when creating
    if (!uom && productId) {
      data.product_id = productId;
    }

    onSubmit(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {uom ? t('products.uoms.editUOM') : t('products.uoms.addUOM')}
          </SheetTitle>
          <SheetDescription>
            {t('products.uoms.dialogDescription')}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
            {/* UOM Name */}
            <FormField
              control={form.control}
              name="uom_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('products.uoms.name')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('products.uoms.namePlaceholder')}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('products.uoms.nameDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conversion Factor */}
            <FormField
              control={form.control}
              name="conversion_factor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('products.uoms.conversionFactor')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder={t('products.uoms.conversionFactorPlaceholder')}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('products.uoms.conversionFactorDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Barcode */}
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('products.uoms.barcodeOptional')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('products.uoms.barcodePlaceholder')}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dimensions Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium">{t('products.uoms.dimensions')}</h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('products.uoms.length')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('products.uoms.width')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('products.uoms.height')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {calculatedVolume && (
                <div className="text-sm text-muted-foreground">
                  {t('products.uoms.calculatedVolume')}: {calculatedVolume} cm³
                </div>
              )}
            </div>

            {/* Weight */}
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('products.uoms.weightOptional')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="0"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('products.uoms.weightDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('common.saving')
                  : uom
                  ? t('common.update')
                  : t('common.create')}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
