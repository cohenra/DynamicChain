import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { InventoryTransaction } from '@/services/inventory';

interface CorrectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: InventoryTransaction | null;
  onSubmit: (id: string, newQuantity: number, reason: string) => Promise<void>;
}

export function CorrectionSheet({
  isOpen,
  onClose,
  transaction,
  onSubmit,
}: CorrectionSheetProps) {
  const { t, i18n } = useTranslation();
  const [newQuantity, setNewQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Update form when transaction changes
  useEffect(() => {
    if (transaction && isOpen) {
      setNewQuantity(transaction.quantity.toString());
      setReason('');
    }
  }, [transaction, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    const qty = parseFloat(newQuantity);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.correction.invalidQuantity', 'Please enter a valid quantity'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(transaction.id, qty, reason);
      onClose();
      setNewQuantity('');
      setReason('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDelta = () => {
    if (!transaction || !newQuantity) return 0;
    const current = transaction.quantity;
    const next = parseFloat(newQuantity);
    if (isNaN(next)) return 0;
    return (next - current).toFixed(3);
  };

  const dir = i18n.dir();

  if (!transaction) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'}>
        <SheetHeader>
          <SheetTitle>{t('inventory.correction.title', 'Inventory Correction')}</SheetTitle>
          <SheetDescription>
            {t('inventory.correction.description', 'Update quantity for specific batch/LPN.')}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('products.product')}:</span>
              <span className="font-medium">{transaction.product_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('warehouses.location')}:</span>
              <span className="font-medium">{transaction.location_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('inventory.currentQty')}:</span>
              <span className="font-medium">{transaction.quantity}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-qty">{t('inventory.newQty', 'New Quantity')}</Label>
              <Input
                id="new-qty"
                type="number"
                step="0.001"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder={t('inventory.enterQty', 'Enter quantity')}
              />
              {newQuantity && (
                <p className="text-xs text-muted-foreground text-end">
                  {t('inventory.delta', 'Difference')}: <span dir="ltr">{calculateDelta()}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">{t('inventory.correction.reason', 'Reason')}</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('inventory.correction.reasonPlaceholder', 'Cycle count, Damaged, etc.')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
