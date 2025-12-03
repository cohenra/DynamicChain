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
import {
  Location,
  LocationCreate,
  LocationUpdate,
  LocationType,
  LocationUsage,
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

  const formSchema = z.object({
    zone_id: z.string().min(1, t('locations.zoneRequired')),
    name: z.string().min(1, t('locations.nameRequired')),
    aisle: z.string().min(1, t('locations.aisleRequired')),
    bay: z.string().min(1, t('locations.bayRequired')),
    level: z.string().min(1, t('locations.levelRequired')),
    type: z.nativeEnum(LocationType, { required_error: t('locations.typeRequired') }),
    usage: z.nativeEnum(LocationUsage, { required_error: t('locations.usageRequired') }),
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
      type: location?.type || LocationType.SHELF,
      usage: location?.usage || LocationUsage.STORAGE,
      pick_sequence: location?.pick_sequence.toString() || '0',
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const data = {
      ...values,
      zone_id: parseInt(values.zone_id),
      pick_sequence: parseInt(values.pick_sequence || '0'),
    };

    if (location) {
      onSubmit(data as LocationUpdate);
    } else {
      onSubmit({ ...data, warehouse_id: warehouseId } as LocationCreate);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
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

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locations.name')}</FormLabel>
              <FormControl>
                <Input placeholder="A-01-01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="aisle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.aisle')}</FormLabel>
                <FormControl>
                  <Input placeholder="A" {...field} />
                </FormControl>
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
                <FormControl>
                  <Input placeholder="01" {...field} />
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
                  <Input placeholder="01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locations.type')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={LocationType.SHELF}>{t('locations.typeSHELF')}</SelectItem>
                  <SelectItem value={LocationType.PALLET_RACK}>{t('locations.typePALLET_RACK')}</SelectItem>
                  <SelectItem value={LocationType.FLOOR}>{t('locations.typeFLOOR')}</SelectItem>
                  <SelectItem value={LocationType.CAGED}>{t('locations.typeCAGED')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="usage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locations.usage')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={LocationUsage.PICKING}>{t('locations.usagePICKING')}</SelectItem>
                  <SelectItem value={LocationUsage.STORAGE}>{t('locations.usageSTORAGE')}</SelectItem>
                  <SelectItem value={LocationUsage.INBOUND}>{t('locations.usageINBOUND')}</SelectItem>
                  <SelectItem value={LocationUsage.OUTBOUND}>{t('locations.usageOUTBOUND')}</SelectItem>
                  <SelectItem value={LocationUsage.HANDOFF}>{t('locations.usageHANDOFF')}</SelectItem>
                  <SelectItem value={LocationUsage.QUARANTINE}>{t('locations.usageQUARANTINE')}</SelectItem>
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
