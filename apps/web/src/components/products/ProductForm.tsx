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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductCreate } from '@/services/products';
import { depositorService } from '@/services/depositors';
import { X, Plus, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

type ProductFormValues = {
  depositor_id: string;
  sku: string;
  name: string;
  barcode?: string;
};

interface CustomAttribute {
  id: string;
  key: string;
  value: string;
}

interface ProductFormProps {
  onSubmit: (data: ProductCreate) => void;
  isLoading?: boolean;
}

export function ProductForm({ onSubmit, isLoading }: ProductFormProps) {
  const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>([]);
  const { t } = useTranslation();

  // Create schema with translations
  const productSchema = useMemo(
    () =>
      z.object({
        depositor_id: z.string().min(1, t('products.depositorRequired')),
        sku: z.string().min(1, t('products.skuRequired')),
        name: z.string().min(1, t('products.nameRequired')),
        barcode: z.string().optional(),
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
      depositor_id: '',
      sku: '',
      name: '',
      barcode: '',
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
      custom_attributes: customAttrsObject,
    };

    onSubmit(productData);
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
    </Form>
  );
}
