import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
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
import { Zone, ZoneCreate, ZoneUpdate } from '@/services/zones';
import { useMemo } from 'react';

interface ZoneFormProps {
  warehouseId: number;
  zone?: Zone;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ZoneForm({
  warehouseId,
  zone,
  onSubmit,
  onCancel,
  isSubmitting,
}: ZoneFormProps) {
  const { t } = useTranslation();

  // שימוש ב-useMemo כדי שהתרגום יעבוד בתוך ה-Schema
  const formSchema = useMemo(() => z.object({
    name: z.string().min(1, t('zones.nameRequired', 'Zone name is required')),
    code: z.string().min(1, t('zones.codeRequired', 'Zone code is required')),
  }), [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: zone?.name || '',
      code: zone?.code || '',
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const data = {
      ...values,
      warehouse_id: warehouseId,
    };
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}