import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ProductCreate } from '@/services/products';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

const productSchema = z.object({
  sku: z.string().min(1, 'מק״ט הוא שדה חובה'),
  name: z.string().min(1, 'שם הוא שדה חובה'),
  barcode: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

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

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
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
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>מק״ט</FormLabel>
              <FormControl>
                <Input {...field} placeholder="הזן מק״ט" disabled={isLoading} />
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
              <FormLabel>שם המוצר</FormLabel>
              <FormControl>
                <Input {...field} placeholder="הזן שם מוצר" disabled={isLoading} />
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
              <FormLabel>ברקוד (אופציונלי)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="הזן ברקוד" disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dynamic Attributes Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">תכונות מותאמות אישית</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomAttribute}
              disabled={isLoading}
            >
              <Plus className="ml-2 h-4 w-4" />
              הוסף תכונה
            </Button>
          </div>

          {customAttributes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              לא הוגדרו תכונות מותאמות אישית
            </p>
          ) : (
            <div className="space-y-3">
              {customAttributes.map((attr) => (
                <div key={attr.id} className="flex items-center gap-2">
                  <Input
                    placeholder="מפתח (למשל: צבע)"
                    value={attr.key}
                    onChange={(e) =>
                      updateCustomAttribute(attr.id, 'key', e.target.value)
                    }
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    placeholder="ערך (למשל: כחול)"
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
            {isLoading ? 'שומר...' : 'שמור מוצר'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
