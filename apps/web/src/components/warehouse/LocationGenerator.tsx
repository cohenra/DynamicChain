import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
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
} from '@/services/locations';
import { Zone } from '@/services/zones';
import { toast } from 'sonner';
import { Loader2, ArrowDownUp, Route } from 'lucide-react';

interface LocationGeneratorProps {
  warehouseId: number;
  zones: Zone[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function LocationGenerator({ warehouseId, zones, onSuccess, onCancel }: LocationGeneratorProps) {
  const { t } = useTranslation();
  const [previewCount, setPreviewCount] = useState(0);

  const { data: types } = useQuery({
    queryKey: ['locationTypes'],
    queryFn: locationService.getLocationTypes,
  });

  const { data: usages } = useQuery({
    queryKey: ['locationUsages'],
    queryFn: locationService.getLocationUsages,
  });

  const formSchema = z.object({
    zone_id: z.string().min(1, t('locations.zoneRequired')),
    aisle: z.string().min(1, t('locations.aisleRequired')),
    bay_start: z.string().refine((val) => parseInt(val) > 0, t('locations.bayStartRequired')),
    bay_end: z.string().refine((val) => parseInt(val) > 0, t('locations.bayEndRequired')),
    level_start: z.string().refine((val) => parseInt(val) > 0, t('locations.levelStartRequired')),
    level_end: z.string().refine((val) => parseInt(val) > 0, t('locations.levelEndRequired')),
    slot_start: z.string().refine((val) => parseInt(val) > 0, t('locations.slotStartRequired')),
    slot_end: z.string().refine((val) => parseInt(val) > 0, t('locations.slotEndRequired')),
    type_id: z.string().min(1, t('locations.typeRequired')),
    usage_id: z.string().min(1, t('locations.usageRequired')),
    pick_sequence_start: z.string().optional(),
    picking_strategy: z.enum(['ASCENDING', 'SNAKE_ODD_EVEN']),
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
      type_id: '',
      usage_id: '',
      pick_sequence_start: '0',
      picking_strategy: 'ASCENDING',
    },
  });

  const watchValues = form.watch();

  useEffect(() => {
    const bayStart = parseInt(watchValues.bay_start || '0');
    const bayEnd = parseInt(watchValues.bay_end || '0');
    const levelStart = parseInt(watchValues.level_start || '0');
    const levelEnd = parseInt(watchValues.level_end || '0');
    const slotStart = parseInt(watchValues.slot_start || '0');
    const slotEnd = parseInt(watchValues.slot_end || '0');

    if (
      bayStart > 0 && bayEnd >= bayStart &&
      levelStart > 0 && levelEnd >= levelStart &&
      slotStart > 0 && slotEnd >= slotStart
    ) {
      const count = (bayEnd - bayStart + 1) * (levelEnd - levelStart + 1) * (slotEnd - slotStart + 1);
      setPreviewCount(count);
    } else {
      setPreviewCount(0);
    }
  }, [watchValues]);

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
      type_id: parseInt(values.type_id),
      usage_id: parseInt(values.usage_id),
      pick_sequence_start: parseInt(values.pick_sequence_start || '0'),
      picking_strategy: values.picking_strategy,
    };

    bulkCreateMutation.mutate(config);
  };

  const getPreviewString = () => {
    const { aisle, bay_start, bay_end, level_start, level_end, slot_start, slot_end } = watchValues;
    if (!aisle) return t('locations.previewEmpty');
    return `${aisle}-${String(bay_start).padStart(2,'0')}-${String(level_start).padStart(2,'0')}-${String(slot_start).padStart(2,'0')} ... ${aisle}-${String(bay_end).padStart(2,'0')}-${String(level_end).padStart(2,'0')}-${String(slot_end).padStart(2,'0')}`;
  };

  return (
    // השינוי הוא כאן: הסרנו את max-h ו-overflow-y-auto
    <div className="pr-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6 pb-20">
          
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
                <FormControl><Input placeholder="A" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="bay_start" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.bayStart')}</FormLabel>
                <FormControl><Input type="number" min="1" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="bay_end" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.bayEnd')}</FormLabel>
                <FormControl><Input type="number" min="1" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="level_start" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.levelStart')}</FormLabel>
                <FormControl><Input type="number" min="1" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="level_end" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.levelEnd')}</FormLabel>
                <FormControl><Input type="number" min="1" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="slot_start" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.slotStart')}</FormLabel>
                <FormControl><Input type="number" min="1" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="slot_end" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.slotEnd')}</FormLabel>
                <FormControl><Input type="number" min="1" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>

          <div className="bg-muted/30 p-4 rounded-lg border border-muted">
            <div className="flex items-center gap-2 mb-4">
              <Route className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">הגדרות מסלול ליקוט</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="picking_strategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>אסטרטגיית מספור</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ASCENDING">
                          <div className="flex items-center gap-2">
                            <ArrowDownUp className="h-4 w-4" />
                            <span>רגיל (עולה תמיד)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="SNAKE_ODD_EVEN">
                          <div className="flex items-center gap-2">
                            <Route className="h-4 w-4" />
                            <span>נחש (Z-Pick יעיל)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      {field.value === 'ASCENDING' 
                        ? 'מספור עולה בכל המפרצים (פחות יעיל למלגזה)'
                        : 'עולה במפרץ אי-זוגי, יורד במפרץ זוגי (חוסך נסיעה)'}
                    </FormDescription>
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
                    <FormDescription className="text-xs">מספר התחלתי לרצף</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.type')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {types?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="usage_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('locations.usage')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {usages?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">{t('locations.preview')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getPreviewString()} ({previewCount} locations)
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={bulkCreateMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={bulkCreateMutation.isPending || previewCount === 0}>
              {bulkCreateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('locations.generateLocations')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
