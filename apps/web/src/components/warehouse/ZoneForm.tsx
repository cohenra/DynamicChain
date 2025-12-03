import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Zone, ZoneCreate, ZoneUpdate } from '@/services/zones';

interface ZoneFormProps {
  warehouseId: number;
  zone?: Zone;
  onSubmit: (data: ZoneCreate | ZoneUpdate) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ZoneForm({ warehouseId, zone, onSubmit, onCancel, isSubmitting }: ZoneFormProps) {
  const { t } = useTranslation();

  const formSchema = z.object({
    name: z.string().min(1, t('zones.nameRequired')),
    code: z.string().min(1, t('zones.codeRequired')),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: zone?.name || '',
      code: zone?.code || '',
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    if (zone) {
      onSubmit(values as ZoneUpdate);
    } else {
      onSubmit({ ...values, warehouse_id: warehouseId } as ZoneCreate);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('zones.code')}</FormLabel>
              <FormControl>
                <Input placeholder={t('zones.codePlaceholder')} {...field} />
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
              <FormLabel>{t('zones.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('zones.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : zone ? t('common.update') : t('common.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
