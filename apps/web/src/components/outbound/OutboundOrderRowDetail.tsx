import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ListChecks, AlertCircle } from 'lucide-react';
import type { OutboundOrder, AllocationStrategy } from '@/services/outboundService';
import {
  releaseOrder,
  acceptShortages,
  getStrategies,
  hasShortages,
} from '@/services/outboundService';
import { toast } from 'sonner';

interface OutboundOrderRowDetailProps {
  order: OutboundOrder;
}

export function OutboundOrderRowDetail({ order }: OutboundOrderRowDetailProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [strategies, setStrategies] = useState<AllocationStrategy[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch strategies
  useEffect(() => {
    let mounted = true;
    const fetchStrategies = async () => {
      if (strategies.length > 0) return;
      try {
        const data = await getStrategies();
        if (mounted) setStrategies(data);
      } catch (err) { console.error(err); }
    };
    fetchStrategies();
    return () => { mounted = false; };
  }, [strategies.length]);

  const handleRelease = async () => {
    setActionLoading('release');
    try {
      await releaseOrder(order.id);
      toast.success(t('outbound.statuses.RELEASED'));
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
    } catch (err: any) {
      toast.error(t('common.error'));
    } finally { setActionLoading(null); }
  };

  const handleAcceptShortages = async () => {
    setActionLoading('accept-shortages');
    try {
      await acceptShortages(order.id);
      toast.success(t('outbound.statuses.RELEASED'));
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
    } catch (err: any) {
      toast.error(t('common.error'));
    } finally { setActionLoading(null); }
  };

  const canRelease = order.status === 'PLANNED' && !hasShortages(order);
  const canAcceptShortages = order.status === 'PLANNED' && hasShortages(order);
  const lines = order.lines || [];
  const tasks = order.pick_tasks || [];

  return (
    // FIX: Enforcing RTL direction on the container
    <div className="bg-slate-50/50 p-4 w-full border-t shadow-inner" dir="rtl">
      
      {/* Secondary Action Bar */}
      {(canRelease || canAcceptShortages) && (
        <div className="mb-4 flex gap-2 items-center bg-white p-2 rounded border shadow-sm justify-end">
            {canAcceptShortages && (
              <Button onClick={handleAcceptShortages} disabled={!!actionLoading} size="sm" variant="destructive">
                {actionLoading === 'accept-shortages' ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <AlertCircle className="h-4 w-4 ml-2" />}
                {t('outbound.actions.acceptShortages')}
              </Button>
            )}
            {canRelease && (
              <Button onClick={handleRelease} disabled={!!actionLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                {actionLoading === 'release' ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <ListChecks className="h-4 w-4 ml-2" />}
                {t('outbound.actions.release')}
              </Button>
            )}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="lines" className="w-full">
        {/* FIX: justify-start combined with dir="rtl" aligns to the right */}
        <TabsList className="bg-white border w-full justify-start h-10 p-0">
          <TabsTrigger value="lines" className="px-6 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            {t('outbound.tabs.lines')} ({lines.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="px-6 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            {t('outbound.tabs.tasks')} ({tasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lines" className="mt-4">
          <div className="bg-white rounded-md border overflow-hidden shadow-sm">
            <Table dir="rtl"> {/* Explicitly set RTL for the table */}
              <TableHeader className="bg-slate-50">
                <TableRow>
                   {/* FIX: Reordered columns to match Hebrew RTL reading order (Right to Left) */}
                  <TableHead className="text-right w-[30%]">{t('outbound.table.product')}</TableHead>
                  <TableHead className="text-center">{t('outbound.table.ordered')}</TableHead>
                  <TableHead className="text-center">{t('outbound.table.allocated')}</TableHead>
                  <TableHead className="text-center">{t('outbound.table.picked')}</TableHead>
                  <TableHead className="text-center">{t('outbound.table.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                   <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('common.noData') || 'אין נתונים'}</TableCell></TableRow>
                ) : (
                  lines.map((line) => {
                    const isShort = line.qty_allocated < line.qty_ordered;
                    const rowClass = isShort ? 'bg-amber-50/50 hover:bg-amber-100/50' : 'hover:bg-slate-50';
                    return (
                      <TableRow key={line.id} className={rowClass}>
                        <TableCell>
                          <div className="font-medium">{line.product?.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{line.product?.sku}</div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{line.qty_ordered}</TableCell>
                        <TableCell className={`text-center font-bold ${isShort ? 'text-red-600' : 'text-green-600'}`}>{line.qty_allocated}</TableCell>
                        <TableCell className="text-center">{line.qty_picked}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={isShort ? 'destructive' : 'outline'}>{line.line_status || 'PENDING'}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
           <div className="bg-white rounded-md border overflow-hidden shadow-sm">
             <Table dir="rtl">
               <TableHeader className="bg-slate-50">
                 <TableRow>
                   <TableHead className="text-right">{t('outbound.table.task')}</TableHead>
                   <TableHead className="text-right">{t('outbound.table.fromLocation')}</TableHead>
                   <TableHead className="text-center">{t('outbound.table.qtyToPick')}</TableHead>
                   <TableHead className="text-center">{t('outbound.table.status')}</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {tasks.map((task) => (
                   <TableRow key={task.id}>
                     <TableCell className="font-mono">#{task.id}</TableCell>
                     <TableCell><Badge variant="outline">{task.from_location?.name}</Badge></TableCell>
                     <TableCell className="text-center font-bold">{task.qty_to_pick}</TableCell>
                     <TableCell className="text-center"><Badge>{task.status}</Badge></TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}