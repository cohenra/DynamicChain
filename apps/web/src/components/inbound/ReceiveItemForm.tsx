import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inboundService } from '@/services/inboundService';
import { toast } from 'sonner';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Package, MapPin, Hash, Loader2, Download } from 'lucide-react';

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const receiveItemSchema = z.object({
  quantity: z.number().min(1, 'הכמות חייבת להיות לפחות 1'),
  location_id: z.number({
    required_error: 'יש לבחור מיקום',
  }),
  lpn: z.string().optional(),
  batch_number: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
});

type ReceiveItemFormData = z.infer<typeof receiveItemSchema>;

// ============================================================
// TYPES
// ============================================================

interface ReceiveItemFormProps {
  shipmentId: number;
  orderId: number;
  product: {
    id: number;
    sku: string;
    name: string;
  };
  expectedQuantity: number;
  receivedQuantity: number;
  locations: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function ReceiveItemForm({
  shipmentId,
  orderId,
  product,
  expectedQuantity,
  receivedQuantity,
  locations,
  onSuccess,
  onCancel,
}: ReceiveItemFormProps) {
  const queryClient = useQueryClient();
  const [quantityValue, setQuantityValue] = useState(expectedQuantity - receivedQuantity);

  const remainingQuantity = expectedQuantity - receivedQuantity;

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReceiveItemFormData>({
    resolver: zodResolver(receiveItemSchema),
    defaultValues: {
      quantity: remainingQuantity > 0 ? remainingQuantity : 0,
      lpn: '',
      batch_number: '',
      expiry_date: '',
      notes: '',
    },
  });

  const selectedLocationId = watch('location_id');

  // Mutation for receiving items
  const receiveMutation = useMutation({
    mutationFn: async (data: ReceiveItemFormData) => {
      return inboundService.receiveShipment({
        shipment_id: shipmentId,
        items: [
          {
            product_id: product.id,
            quantity: data.quantity,
            location_id: data.location_id,
            lpn: data.lpn || undefined,
            batch_number: data.batch_number || undefined,
            expiry_date: data.expiry_date || undefined,
            notes: data.notes || undefined,
          },
        ],
      });
    },
    onSuccess: (data) => {
      toast.success('הקליטה בוצעה בהצלחה', {
        description: `נקלטו ${data.received_items[0]?.quantity} יחידות`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['inbound-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error('שגיאה בקליטה', {
        description: error.response?.data?.detail || 'אנא נסה שוב',
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ReceiveItemFormData) => {
    if (data.quantity > remainingQuantity) {
      toast.error('קליטת יתר', {
        description: `ניתן לקלוט עד ${remainingQuantity} יחידות בלבד`,
      });
      return;
    }

    receiveMutation.mutate(data);
  };

  // Handle quantity slider change
  const handleQuantityChange = (value: number[]) => {
    const newQuantity = value[0];
    setQuantityValue(newQuantity);
    setValue('quantity', newQuantity);
  };

  return (
    <div className="space-y-6">
      {/* Product Info */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>SKU: {product.sku}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>אחד: {product.name}</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Quantity Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">כמות</Label>
            <div className="bg-primary/10 px-4 py-2 rounded-md">
              <span className="text-2xl font-bold text-primary">
                {quantityValue}
              </span>
            </div>
          </div>

          <Slider
            value={[quantityValue]}
            onValueChange={handleQuantityChange}
            max={remainingQuantity}
            min={0}
            step={1}
            className="w-full"
          />

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>מותר: {remainingQuantity}</span>
            <span>כבר נקלט: {receivedQuantity}</span>
          </div>

          {errors.quantity && (
            <p className="text-sm text-destructive">{errors.quantity.message}</p>
          )}
        </div>

        {/* Location Selector */}
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            מיקום
          </Label>
          <Select
            onValueChange={(value) => setValue('location_id', parseInt(value))}
            defaultValue={selectedLocationId?.toString()}
          >
            <SelectTrigger id="location">
              <SelectValue placeholder="בחר מיקום" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id.toString()}>
                  {location.name} ({location.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.location_id && (
            <p className="text-sm text-destructive">{errors.location_id.message}</p>
          )}
        </div>

        {/* LPN Input */}
        <div className="space-y-2">
          <Label htmlFor="lpn" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            LPN (אופציונלי)
          </Label>
          <Input
            id="lpn"
            {...register('lpn')}
            placeholder="אופציונלי"
            className="text-right"
          />
          {errors.lpn && (
            <p className="text-sm text-destructive">{errors.lpn.message}</p>
          )}
        </div>

        {/* Batch Number (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="batch_number">מספר מנה (אופציונלי)</Label>
          <Input
            id="batch_number"
            {...register('batch_number')}
            placeholder="אופציונלי"
            className="text-right"
          />
        </div>

        {/* Expiry Date (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="expiry_date">תאריך תפוגה (אופציונלי)</Label>
          <Input
            id="expiry_date"
            type="date"
            {...register('expiry_date')}
            className="text-right"
          />
        </div>

        {/* Notes (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="notes">הערות (אופציונלי)</Label>
          <Input
            id="notes"
            {...register('notes')}
            placeholder="הערות נוספות..."
            className="text-right"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            className="flex-1"
            disabled={receiveMutation.isPending || remainingQuantity === 0}
          >
            {receiveMutation.isPending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                מעבד...
              </>
            ) : (
              <>
                <Download className="ml-2 h-4 w-4" />
                שמור ובצע קליטה
              </>
            )}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={receiveMutation.isPending}
            >
              ביטול
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

// ============================================================
// DIALOG WRAPPER
// ============================================================

interface ReceiveItemDialogProps extends ReceiveItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiveItemDialog({
  open,
  onOpenChange,
  ...formProps
}: ReceiveItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">
            קליטת סחורה למלאי
            <div className="text-sm font-normal text-muted-foreground mt-1">
              משלוח: {formProps.shipmentId}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ReceiveItemForm
          {...formProps}
          onSuccess={() => {
            formProps.onSuccess?.();
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}