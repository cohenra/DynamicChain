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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { depositorService } from '@/services/depositors';
import { productService } from '@/services/products';
import { locationService } from '@/services/locations';
import { InventoryReceiveRequest } from '@/services/inventory';
import { Loader2 } from 'lucide-react';

interface InventoryReceiveFormProps {
  onSubmit: (data: InventoryReceiveRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function InventoryReceiveForm({ onSubmit, onCancel, isSubmitting }: InventoryReceiveFormProps) {
  const { t } = useTranslation();

  const { data: depositors } = useQuery({
    queryKey: ['depositors'],
    queryFn: depositorService.getDepositors,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getLocations({ limit: 1000 }),
  });

  const formSchema = z.object({
    depositor_id: z.string().min(1, t('products.depositorRequired')),
    product_id: z.string().min(1, t('products.nameRequired')),
    location_id: z.string().min(1, t('locations.nameRequired')),
    quantity: z.string().refine((val) => parseFloat(val) > 0, t('products.uoms.mustBePositive')),
    lpn: z.string().optional(),
    batch_number: z.string().optional(),
    reference_doc: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: '',
      lpn: '',
      batch_number: '',
      reference_doc: '',
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      depositor_id: parseInt(values.depositor_id),
      product_id: parseInt(values.product_id),
      location_id: parseInt(values.location_id),
      quantity: parseFloat(values.quantity),
      lpn: values.lpn || undefined,
      batch_number: values.batch_number || undefined,
      reference_doc: values.reference_doc || undefined,
    });
  };

  const isLoadingData = !depositors || !products || !locations;

  if (isLoadingData) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4 pb-20">
        
        <FormField
          control={form.control}
          name="depositor_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('products.depositor')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('products.selectDepositor')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {depositors?.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('products.name')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מוצר" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('warehouses.location')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מיקום" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {locations?.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inventory.quantity')}</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="lpn"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('inventory.lpn')} (אופציונלי)</FormLabel>
                <FormControl>
                    <Input placeholder="אוטומטי אם ריק" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="batch_number"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('inventory.batch')}</FormLabel>
                <FormControl>
                    <Input placeholder="" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="reference_doc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>מסמך אסמכתא</FormLabel>
              <FormControl>
                <Input placeholder="לדוגמה: PO-123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('inventory.receiveStock')}
          </Button>
        </div>
      </form>
    </Form>
  );
}