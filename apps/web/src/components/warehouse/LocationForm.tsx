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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  locationService,
  Location,
  LocationCreate,
  LocationUpdate,
} from '@/services/locations';
import { Zone } from '@/services/zones';

interface LocationFormProps {
  warehouseId: number;
  zones: Zone[];
  location?: Location;
  onSubmit: (data: LocationCreate | LocationUpdate) => void;
  onCancel: () => void;
  isSubmitting: boolean;
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

  // שליפת נתונים דינמית עבור הדרופ-דאונים
  const { data: types, isLoading: isLoadingTypes } = useQuery({
    queryKey: ['locationTypes'],
    queryFn: locationService.getLocationTypes,
  });

  const { data: usages, isLoading: isLoadingUsages } = useQuery({
    queryKey: ['locationUsages'],
    queryFn: locationService.getLocationUsages,
  });

  const formSchema = z.object({
    zone_id: z.string().min(1, t('locations.zoneRequired')),
    name: z.string().min(1, t('locations.nameRequired')),
    aisle: z.string().min(1, t('locations.aisleRequired')),
    bay: z.string().min(1, t('locations.bayRequired')),
    level: z.string().min(1, t('locations.levelRequired')),
    slot: z.string().min(1, t('locations.slotRequired')),
    type_id: z.string().min(1, t('locations.typeRequired')),
    usage_id: z.string().min(1, t('locations.usageRequired')),
    pick_sequence: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      zone_id: location?.zone_id.toString() || '',
      name: location?.name || '',
      aisle: location?.aisle || '',
      bay: location?.bay || '',
      level: location?.level || '',
      slot: location?.slot || '',
      type_id: location?.type_id.toString() || '',
      usage_id: location?.usage_id.toString() || '',
      pick_sequence: location?.pick_sequence.toString() || '0',
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const data = {
      ...values,
      zone_id: parseInt(values.zone_id),
      type_id: parseInt(values.type_id),
      usage_id: parseInt(values.usage_id),
      pick_sequence: parseInt(values.pick_sequence || '0'),
    };

    if (location) {
      onSubmit(data as LocationUpdate);
    } else {
      onSubmit({ ...data, warehouse_id: warehouseId } as LocationCreate);
    }
  };

  const isLoadingData = isLoadingTypes || isLoadingUsages;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6 pb-20">
        
        {/* בחירת אזור */}
        <FormField
          control={form.control}
          name="zone_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locations.zone')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('locations.selectZone')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>
                      {zone.name} ({zone.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* שם המיקום */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locations.name')}</FormLabel>
              <FormControl>
                <Input placeholder="A-01-01-01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* היררכיה - 4 רמות (כולל איתור/Slot) */}
        <div className="grid grid-cols-4 gap-2">
          <FormField
            control={form.control}
            name="aisle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.aisle')}</FormLabel>
                <FormControl><Input placeholder="A" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.bay')}</FormLabel>
                <FormControl><Input placeholder="01" {...field} /></FormControl>
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
                <FormControl><Input placeholder="01" {...field} /></FormControl>
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
                <FormControl><Input placeholder="01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* בחירת סוג מיקום דינמית */}
        <FormField
          control={form.control}
          name="type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locations.type')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingData}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingData ? t('common.loading') : ''} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {types?.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* בחירת שימוש מיקום דינמית */}
        <FormField
          control={form.control}
          name="usage_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locations.usage')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingData}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingData ? t('common.loading') : ''} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {usages?.map((usage) => (
                    <SelectItem key={usage.id} value={usage.id.toString()}>
                      {usage.name}
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
          name="pick_sequence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locations.pickSequence')}</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
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
            {isSubmitting ? t('common.saving') : location ? t('common.update') : t('common.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
