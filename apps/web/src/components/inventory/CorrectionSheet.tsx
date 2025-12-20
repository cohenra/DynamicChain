import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { inventoryService, InventoryTransaction } from '@/services/inventory';
import { Loader2 } from 'lucide-react';

interface CorrectionSheetProps {
  transaction: InventoryTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CorrectionSheet({ transaction, open, onOpenChange }: CorrectionSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [newQuantity, setNewQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const correctionMutation = useMutation({
    mutationFn: (data: { transactionId: number; new_quantity: number; reason?: string }) =>
      inventoryService.correctTransaction(data.transactionId, {
        new_quantity: data.new_quantity,
        reason: data.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(t('inventory.correction.success', 'התיקון בוצע בהצלחה'));
      handleClose();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.detail || t('inventory.correction.error', 'שגיאה בביצוע תיקון');
      toast.error(errorMsg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transaction) return;

    const quantity = parseFloat(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error(t('inventory.correction.invalidQuantity', 'יש להזין כמות חיובית'));
      return;
    }

    correctionMutation.mutate({
      transactionId: transaction.id,
      new_quantity: quantity,
      reason: reason.trim() || undefined,
    });
  };

  const handleClose = () => {
    setNewQuantity('');
    setReason('');
    onOpenChange(false);
  };

  // Update form when transaction changes
  useEffect(() => {
    if (transaction && open) {
      setNewQuantity(transaction.quantity.toString());
      setReason('');
    }
  }, [transaction, open]);

  if (!transaction) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('inventory.correction.title', 'תיקון טרנזקציה')}</SheetTitle>
          <SheetDescription>
            {t('inventory.correction.description', 'יצירת טרנזקצית פיצוי לתיקון טעות במלאי')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Original Transaction Info */}
          <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
            <div className="text-sm font-medium">{t('inventory.correction.original', 'טרנזקציה מקורית')}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">{t('inventory.lpn', 'LPN')}:</div>
              <div className="font-mono">{transaction.inventory_lpn}</div>

              <div className="text-muted-foreground">{t('inventory.product', 'מוצר')}:</div>
              <div>{transaction.product_name}</div>

              <div className="text-muted-foreground">{t('inventory.quantity', 'כמות')}:</div>
              <div className="font-bold">{transaction.quantity}</div>

              <div className="text-muted-foreground">{t('inventory.type', 'סוג')}:</div>
              <div className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded w-fit">
                {transaction.transaction_type}
              </div>
            </div>
          </div>

          {/* Correction Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newQuantity">
                {t('inventory.correction.newQuantity', 'כמות מתוקנת')} *
              </Label>
              <Input
                id="newQuantity"
                type="number"
                step="0.001"
                min="0"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder={t('inventory.correction.quantityPlaceholder', 'הזן כמות מתוקנת')}
                required
                dir="ltr"
              />
              {newQuantity && !isNaN(parseFloat(newQuantity)) && (
                <p className="text-sm text-muted-foreground">
                  {t('inventory.correction.delta', 'הפרש')}: {' '}
                  <span className={parseFloat(newQuantity) - transaction.quantity >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {parseFloat(newQuantity) - transaction.quantity > 0 ? '+' : ''}
                    {(parseFloat(newQuantity) - transaction.quantity).toFixed(3)}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                {t('inventory.correction.reason', 'סיבת התיקון')}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('inventory.correction.reasonPlaceholder', 'תאר את הסיבה לתיקון (אופציונלי)')}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {reason.length}/500
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={correctionMutation.isPending}
                className="flex-1"
              >
                {correctionMutation.isPending && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {t('inventory.correction.submit', 'בצע תיקון')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={correctionMutation.isPending}
              >
                {t('common.cancel', 'ביטול')}
              </Button>
            </div>
          </form>

          {/* Warning */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>{t('inventory.correction.warning', 'שים לב')}:</strong>{' '}
            {t('inventory.correction.warningText', 'תיקון זה ייצור טרנזקציה חדשה. הטרנזקציה המקורית תישאר במערכת לצורך ביקורת.')}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
