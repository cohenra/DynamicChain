import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InboundShipment, InboundOrder, inboundService, ReceiveShipmentItemRequest } from '@/services/inboundService';
import { locationService } from '@/services/locations';
import { useAuthStore } from '@/store/authStore';
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

export function ReceiveShipmentSheet({ shipment, order, open, onClose }: ReceiveShipmentSheetProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  // Validation schema with translations
  const receiveSchema = z.object({
    inbound_line_id: z.string().min(1, t('inbound.sheet.validation.productRequired')),
    location_id: z.string().min(1, t('inbound.sheet.validation.locationRequired')),
    quantity: z.string().refine(val => parseFloat(val) > 0, t('inbound.sheet.validation.positiveQuantity')),
    lpn: z.string().optional(),
    batch_number: z.string().optional(),
    expiry_date: z.string().optional(),
  });

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

  // Get warehouse context from auth store
  const warehouseId = useAuthStore((state) => state.warehouseId);

  // Fetch locations filtered by user's warehouse
  const { data: locations } = useQuery({
    queryKey: ['locations', warehouseId],
    queryFn: () => locationService.getLocations({
      warehouse_id: warehouseId || undefined,
    }),
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
      toast.success(t('inbound.sheet.success'));
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      const errorDetail = error?.response?.data?.detail || t('inbound.sheet.error');
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

    return t('inbound.sheet.lineSummary', {
      product: line.product?.name || t('common.unknown'),
      expected,
      received,
      remaining
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent 
        side={isRTL ? "right" : "left"} // צד דינמי בהתאם לשפה
        className="w-full sm:max-w-md p-0 flex flex-col h-full"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <SheetHeader className="p-6 border-b text-start">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('inbound.sheet.title')}
          </SheetTitle>
          <SheetDescription className="text-start">
            {t('inbound.sheet.shipment')}: {shipment?.shipment_number || '-'}
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
                    <FormLabel>{t('inbound.sheet.product')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('inbound.sheet.selectProduct')} />
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
                    <FormLabel>{t('inbound.sheet.location')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('inbound.sheet.selectLocation')} />
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
                    <FormLabel>{t('inbound.sheet.quantity')} *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} className="text-start" />
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
                    <FormLabel>{t('inbound.sheet.lpn')}</FormLabel>
                    <FormControl>
                      <Input placeholder={generateLpnPlaceholder()} {...field} className="text-start" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('inbound.sheet.lpnHint')}
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
                    <FormLabel>{t('inbound.sheet.batch')}</FormLabel>
                    <FormControl>
                      <Input placeholder="BATCH-001" {...field} className="text-start" />
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
                    <FormLabel>{t('inbound.sheet.expiry')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="text-start" />
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
            {receiveMutation.isPending ? t('common.processing') : t('inbound.sheet.submit')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}