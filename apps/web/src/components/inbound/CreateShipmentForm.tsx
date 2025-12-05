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
import { ShipmentCreate } from '@/services/inbound';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

type ShipmentFormValues = {
  shipment_number: string;
  container_number?: string;
  driver_name?: string;
  driver_phone?: string;
  arrival_date?: string;
};

interface CreateShipmentFormProps {
  onSubmit: (data: ShipmentCreate) => void;
  isLoading?: boolean;
}

export function CreateShipmentForm({ onSubmit, isLoading }: CreateShipmentFormProps) {
  const { t } = useTranslation();

  // Create schema with translations
  const shipmentSchema = useMemo(
    () =>
      z.object({
        shipment_number: z.string().min(1, t('inbound.shipments.fields.shipmentNumberRequired')),
        container_number: z.string().optional(),
        driver_name: z.string().optional(),
        driver_phone: z.string().optional(),
        arrival_date: z.string().optional(),
      }),
    [t]
  );

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      shipment_number: '',
      container_number: '',
      driver_name: '',
      driver_phone: '',
      arrival_date: '',
    },
  });

  const handleSubmit = (values: ShipmentFormValues) => {
    const data: ShipmentCreate = {
      shipment_number: values.shipment_number,
      container_number: values.container_number || undefined,
      driver_name: values.driver_name || undefined,
      driver_phone: values.driver_phone || undefined,
      arrival_date: values.arrival_date || undefined,
    };
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Shipment Number */}
        <FormField
          control={form.control}
          name="shipment_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inbound.shipments.fields.shipmentNumber')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('inbound.shipments.fields.shipmentNumberPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Container Number */}
        <FormField
          control={form.control}
          name="container_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inbound.shipments.fields.containerNumberOptional')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('inbound.shipments.fields.containerNumberPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Driver Name */}
        <FormField
          control={form.control}
          name="driver_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inbound.shipments.fields.driverNameOptional')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('inbound.shipments.fields.driverNamePlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Driver Phone */}
        <FormField
          control={form.control}
          name="driver_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inbound.shipments.fields.driverPhoneOptional')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('inbound.shipments.fields.driverPhonePlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Arrival Date */}
        <FormField
          control={form.control}
          name="arrival_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inbound.shipments.fields.arrivalDateOptional')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
