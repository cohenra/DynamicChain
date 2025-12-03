import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import {
  locationService,
  LocationBulkCreateConfig,
  LocationType,
  LocationUsage,
} from '@/services/locations';
import { Zone } from '@/services/zones';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LocationGeneratorProps {
  warehouseId: number;
  zones: Zone[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function LocationGenerator({ warehouseId, zones, onSuccess, onCancel }: LocationGeneratorProps) {
  const { t } = useTranslation();
  const [previewCount, setPreviewCount] = useState(0);

  const formSchema = z.object({
    zone_id: z.string().min(1, t('locations.zoneRequired')),
    aisle: z.string().min(1, t('locations.aisleRequired')),
    bay_start: z.string().refine((val) => parseInt(val) > 0, {
      message: t('locations.bayStartRequired'),
    }),
    bay_end: z.string().refine((val) => parseInt(val) > 0, {
      message: t('locations.bayEndRequired'),
    }),
    level_start: z.string().refine((val) => parseInt(val) > 0, {
      message: t('locations.levelStartRequired'),
    }),
    level_end: z.string().refine((val) => parseInt(val) > 0, {
      message: t('locations.levelEndRequired'),
    }),
    slot_start: z.string().refine((val) => parseInt(val) > 0, {
      message: t('locations.slotStartRequired'),
    }),
    slot_end: z.string().refine((val) => parseInt(val) > 0, {
      message: t('locations.slotEndRequired'),
    }),
    type: z.nativeEnum(LocationType, { required_error: t('locations.typeRequired') }),
    usage: z.nativeEnum(LocationUsage, { required_error: t('locations.usageRequired') }),
    pick_sequence_start: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      zone_id: '',
      aisle: '',
      bay_start: '1',
      bay_end: '10',
      level_start: '1',
      level_end: '5',
      slot_start: '1',
      slot_end: '2',
      type: LocationType.SHELF,
      usage: LocationUsage.STORAGE,
      pick_sequence_start: '0',
    },
  });

  // Watch form values for preview
  const watchValues = form.watch();

  // Calculate preview count when values change
  useEffect(() => {
    const bayStart = parseInt(watchValues.bay_start || '0');
    const bayEnd = parseInt(watchValues.bay_end || '0');
    const levelStart = parseInt(watchValues.level_start || '0');
    const levelEnd = parseInt(watchValues.level_end || '0');
    const slotStart = parseInt(watchValues.slot_start || '0');
    const slotEnd = parseInt(watchValues.slot_end || '0');

    if (
      bayStart > 0 &&
      bayEnd >= bayStart &&
      levelStart > 0 &&
      levelEnd >= levelStart &&
      slotStart > 0 &&
      slotEnd >= slotStart
    ) {
      const count = (bayEnd - bayStart + 1) * (levelEnd - levelStart + 1) * (slotEnd - slotStart + 1);
      setPreviewCount(count);
    } else {
      setPreviewCount(0);
    }
  }, [watchValues]);

  // Bulk create mutation
  const bulkCreateMutation = useMutation({
    mutationFn: locationService.bulkCreateLocations,
    onSuccess: (data) => {
      toast.success(t('locations.bulkCreateSuccess', { count: data.created_count }));
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('locations.bulkCreateError'));
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const config: LocationBulkCreateConfig = {
      warehouse_id: warehouseId,
      zone_id: parseInt(values.zone_id),
      aisle: values.aisle,
      bay_start: parseInt(values.bay_start),
      bay_end: parseInt(values.bay_end),
      level_start: parseInt(values.level_start),
      level_end: parseInt(values.level_end),
      slot_start: parseInt(values.slot_start),
      slot_end: parseInt(values.slot_end),
      type: values.type,
      usage: values.usage,
      pick_sequence_start: parseInt(values.pick_sequence_start || '0'),
    };

    bulkCreateMutation.mutate(config);
  };

  // Generate preview string
  const getPreviewString = () => {
    const { zone_id, aisle, bay_start, bay_end, level_start, level_end, slot_start, slot_end } = watchValues;

    if (!zone_id || !aisle || !bay_start || !bay_end || !level_start || !level_end || !slot_start || !slot_end) {
      return t('locations.previewEmpty');
    }

    const bayStartNum = parseInt(bay_start);
    const bayEndNum = parseInt(bay_end);
    const levelStartNum = parseInt(level_start);
    const levelEndNum = parseInt(level_end);
    const slotStartNum = parseInt(slot_start);
    const slotEndNum = parseInt(slot_end);

    if (
      bayStartNum <= 0 ||
      bayEndNum < bayStartNum ||
      levelStartNum <= 0 ||
      levelEndNum < levelStartNum ||
      slotStartNum <= 0 ||
      slotEndNum < slotStartNum
    ) {
      return t('locations.previewInvalid');
    }

    const firstLocation = `${aisle}-${String(bayStartNum).padStart(2, '0')}-${String(levelStartNum).padStart(2, '0')}-${String(slotStartNum).padStart(2, '0')}`;
    const lastLocation = `${aisle}-${String(bayEndNum).padStart(2, '0')}-${String(levelEndNum).padStart(2, '0')}-${String(slotEndNum).padStart(2, '0')}`;

    return `${firstLocation} → ${lastLocation} (${previewCount} ${t('locations.locationsCount')})`;
  };

  return (
    <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
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
            name="aisle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.aisle')}</FormLabel>
                <FormControl>
                  <Input placeholder="A" {...field} />
                </FormControl>
                <FormDescription>{t('locations.aisleDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bay_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('locations.bayStart')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bay_end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('locations.bayEnd')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="level_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('locations.levelStart')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="level_end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('locations.levelEnd')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="slot_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('locations.slotStart')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slot_end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('locations.slotEnd')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
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
            name="pick_sequence_start"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.pickSequenceStart')}</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormDescription>{t('locations.pickSequenceDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preview Card */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">{t('locations.preview')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{getPreviewString()}</p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={bulkCreateMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={bulkCreateMutation.isPending || previewCount === 0}>
              {bulkCreateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkCreateMutation.isPending ? t('common.creating') : t('locations.generateLocations')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
