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

// הגדרה פשוטה יותר לטיפול בתאריך
const shipmentSchema = z.object({
  shipment_number: z.string().min(1, "חובה להזין מספר משלוח/תעודה"),
  container_number: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
  // שינוי: מקבלים מחרוזת תאריך פשוטה
  arrival_date: z.string().min(1, "חובה להזין תאריך הגעה"),
});

type ShipmentFormValues = z.infer<typeof shipmentSchema>;

interface CreateShipmentFormProps {
  onSubmit: (data: ShipmentCreate) => void;
  isLoading?: boolean;
}

export function CreateShipmentForm({ onSubmit, isLoading }: CreateShipmentFormProps) {
  const { t } = useTranslation();

  // תאריך ברירת מחדל: היום
  const today = new Date().toISOString().split('T')[0];

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      shipment_number: '',
      container_number: '',
      driver_name: '',
      driver_phone: '',
      arrival_date: today,
    },
  });

  const handleSubmit = (values: ShipmentFormValues) => {
    // המרת התאריך לפורמט ISO שהשרת אוהב (ללא שעות/דקות כדי למנוע בעיות TZ)
    // אנחנו מוסיפים שעה שרירותית כדי שזה יהיה DateTime תקין
    const isoDate = new Date(values.arrival_date + 'T12:00:00').toISOString();

    const data: ShipmentCreate = {
      shipment_number: values.shipment_number,
      container_number: values.container_number || undefined,
      driver_name: values.driver_name || undefined,
      driver_phone: values.driver_phone || undefined,
      arrival_date: isoDate,
    };
    
    console.log("Submitting shipment:", data); // לוג לדיבאג
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="shipment_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>מספר משלוח / תעודה <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input placeholder="לדוגמה: SHIP-1001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="container_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>מספר מכולה / רכב</FormLabel>
              <FormControl>
                <Input placeholder="לדוגמה: 45-678-90" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="driver_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם הנהג</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driver_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>טלפון</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <FormField
          control={form.control}
          name="arrival_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>תאריך הגעה <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            שמור והוסף משלוח
          </Button>
        </div>
      </form>
    </Form>
  );
}