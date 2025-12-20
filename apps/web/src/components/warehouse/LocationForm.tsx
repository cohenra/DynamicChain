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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Location, LocationCreate, LocationUpdate } from '@/services/locations';
import { Zone } from '@/services/zones';
import { useMemo } from 'react';

interface LocationFormProps {
  warehouseId: number;
  zones: Zone[];
  location?: Location;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function LocationForm({
  warehouseId,
  zones,
  location,
  onSubmit,
  onCancel,
  isSubmitting,
}: LocationFormProps) {
  const { t } = useTranslation();

  // 1. העברת הסכמה לתוך ה-Component כדי להשתמש ב-t()
  const formSchema = useMemo(() => z.object({
    name: z.string().min(1, t('locations.nameRequired', 'Name is required')),
    zone_id: z.string().min(1, t('locations.zoneRequired', 'Zone is required')),
    aisle: z.string().min(1, t('locations.aisleRequired', 'Aisle is required')),
    bay: z.string().min(1, t('locations.bayRequired', 'Bay is required')),
    level: z.string().min(1, t('locations.levelRequired', 'Level is required')),
    slot: z.string().min(1, t('locations.slotRequired', 'Slot is required')),
    type_id: z.string().min(1, t('locations.typeRequired', 'Type is required')),
    usage_id: z.string().min(1, t('locations.usageRequired', 'Usage is required')),
    pick_sequence: z.coerce.number().optional(),
  }), [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: location?.name || '',
      zone_id: location?.zone_id?.toString() || '',
      aisle: location?.aisle || '',
      bay: location?.bay || '',
      level: location?.level || '',
      slot: location?.slot || '',
      type_id: location?.type_id?.toString() || '1', // Default Generic
      usage_id: location?.usage_id?.toString() || '1', // Default Storage
      pick_sequence: location?.pick_sequence || 0,
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const data = {
      ...values,
      warehouse_id: warehouseId,
      zone_id: parseInt(values.zone_id),
      type_id: parseInt(values.type_id),
      usage_id: parseInt(values.usage_id),
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
              <FormLabel>{t('locations.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('locations.name')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="zone_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.zone')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('locations.selectZone')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id.toString()}>
                        {zone.name}
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
            name="aisle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.aisle')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="bay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.bay')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.level')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slot"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.slot')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            {/* כאן ניתן להוסיף Select עבור Type ו-Usage אם יש מידע מהשרת */}
             {/* כרגע השדות מוסתרים או דיפולטיים, אם צריך להציג אותם - יש להוסיף תרגום */}
        </div>

        <FormField
          control={form.control}
          name="pick_sequence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locations.pickSequence')}</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
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