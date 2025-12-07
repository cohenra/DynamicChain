import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InboundShipment, InboundOrder, inboundService, ReceiveShipmentItemRequest } from '@/services/inboundService';
import { locationService } from '@/services/locations';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';

interface ReceiveShipmentSheetProps {
  shipment: InboundShipment | null;
  order: InboundOrder;
  open: boolean;
  onClose: () => void;
}

const receiveSchema = z.object({
  inbound_line_id: z.string().min(1, 'חובה לבחור מוצר'),
  location_id: z.string().min(1, 'חובה לבחור מיקום'),
  quantity: z.string().refine(val => parseFloat(val) > 0, 'כמות חייבת להיות חיובית'),
  lpn: z.string().optional(),
  batch_number: z.string().optional(),
  expiry_date: z.string().optional(),
});

export function ReceiveShipmentSheet({ shipment, order, open, onClose }: ReceiveShipmentSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof receiveSchema>>({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
      inbound_line_id: '',
      location_id: '',
      quantity: '',
      lpn: '',
      batch_number: '',
      expiry_date: '',
    },
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getLocations(),
  });

  // Generate auto LPN placeholder
  const generateLpnPlaceholder = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `LPN-${timestamp}`;
  };

  const receiveMutation = useMutation({
    mutationFn: (data: ReceiveShipmentItemRequest) => {
      if (!shipment) throw new Error('No shipment selected');
      return inboundService.receiveShipmentItem(shipment.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      toast.success('פריט נקלט בהצלחה');
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      const errorDetail = error?.response?.data?.detail || 'שגיאה בקליטת פריט';
      toast.error(errorDetail);
    },
  });

  const handleSubmit = (values: z.infer<typeof receiveSchema>) => {
    const payload: ReceiveShipmentItemRequest = {
      inbound_line_id: parseInt(values.inbound_line_id),
      location_id: parseInt(values.location_id),
      quantity: parseFloat(values.quantity),
      lpn: values.lpn || undefined,
      batch_number: values.batch_number || undefined,
      expiry_date: values.expiry_date || undefined,
    };

    receiveMutation.mutate(payload);
  };

  // Calculate remaining quantity for each line
  const getLineDisplayText = (line: any) => {
    const expected = parseFloat(line.expected_quantity);
    const received = parseFloat(line.received_quantity);
    const remaining = expected - received;
    return `${line.product?.name || 'Unknown'} (צפוי: ${expected} / נקלט: ${received} / נותר: ${remaining})`;
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="left" className="w-full sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            קליטת פריט ממשלוח
          </SheetTitle>
          <SheetDescription>
            משלוח: {shipment?.shipment_number || '-'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form id="receive-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Product/Line Select */}
              <FormField
                control={form.control}
                name="inbound_line_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מוצר *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מוצר..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {order.lines?.map((line) => (
                          <SelectItem key={line.id} value={line.id.toString()}>
                            {getLineDisplayText(line)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location Select */}
              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מיקום *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מיקום..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((location) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>כמות *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* LPN */}
              <FormField
                control={form.control}
                name="lpn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LPN (אופציונלי)</FormLabel>
                    <FormControl>
                      <Input placeholder={generateLpnPlaceholder()} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      ישתולל אוטומטית אם לא יוזן
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Batch Number */}
              <FormField
                control={form.control}
                name="batch_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מספר אצווה (אופציונלי)</FormLabel>
                    <FormControl>
                      <Input placeholder="BATCH-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expiry Date */}
              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תאריך תפוגה (אופציונלי)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <div className="p-4 border-t bg-slate-50 mt-auto">
          <Button
            type="submit"
            form="receive-form"
            className="w-full"
            disabled={receiveMutation.isPending}
          >
            {receiveMutation.isPending ? 'קולט...' : 'קלוט פריט'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
