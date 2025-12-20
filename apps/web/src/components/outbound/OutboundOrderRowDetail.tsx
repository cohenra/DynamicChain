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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
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
    <div className="bg-slate-50/80 p-0 w-full border-t shadow-inner text-xs overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>

      {error && (
        <Alert variant="destructive" className="m-2 w-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="lines" className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* FIX: Header Layout Logic
            - 'flex' with 'items-center' keeps everything in one row.
            - 'justify-start' keeps content starting from the Right (in RTL).
            - 'gap-6' adds spacing between the Tabs group and the Buttons group.
            - Result: [Tabs] space [Buttons] ........ [Empty Space]
        */}
        <div className="flex items-center justify-start gap-6 bg-white border-b px-2 h-9">
            
            {/* Group 1: Tabs */}
            <TabsList className="bg-transparent border-0 h-full p-0 gap-4">
                <TabsTrigger 
                    value="lines" 
                    className="h-full px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-medium text-muted-foreground data-[state=active]:text-primary"
                >
                    {t('outbound.tabs.lines')} <span className="ms-1.5 bg-slate-100 text-slate-600 px-1.5 rounded-full text-[10px]">{lines.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                    value="tasks" 
                    className="h-full px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-medium text-muted-foreground data-[state=active]:text-primary"
                >
                    {t('outbound.tabs.tasks')} <span className="ms-1.5 bg-slate-100 text-slate-600 px-1.5 rounded-full text-[10px]">{tasks.length}</span>
                </TabsTrigger>
            </TabsList>

            {/* Group 2: Actions (Sits right next to tabs) */}
            <div className="flex items-center gap-2">
                {(canRelease || canAcceptShortages) && (
                    <>
                        {canAcceptShortages && (
                        <Button onClick={handleAcceptShortages} disabled={!!actionLoading} size="sm" variant="destructive" className="h-6 text-[10px] px-2.5 rounded-full">
                            {actionLoading === 'accept-shortages' ? <Loader2 className="h-3 w-3 animate-spin me-1.5" /> : <AlertCircle className="h-3 w-3 me-1.5" />}
                            {t('outbound.actions.acceptShortages')}
                        </Button>
                        )}
                        {canRelease && (
                        <Button onClick={handleRelease} disabled={!!actionLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-6 text-[10px] px-2.5 rounded-full">
                            {actionLoading === 'release' ? <Loader2 className="h-3 w-3 animate-spin me-1.5" /> : <ListChecks className="h-3 w-3 me-1.5" />}
                            {t('outbound.actions.release')}
                        </Button>
                        )}
                    </>
                )}
            </div>
        </div>

        {/* Content Area */}
        <div className="p-2">
            <TabsContent value="lines" className="m-0 p-0 border rounded-sm bg-white">
            <Table className="table-fixed w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                <TableHeader className="bg-slate-50 h-8">
                    <TableRow className="h-8 hover:bg-transparent border-b border-slate-200">
                    <TableHead className="text-start h-8 px-2 py-0 font-semibold text-[11px] w-[25%]">{t('outbound.table.product')}</TableHead>
                    <TableHead className="text-center h-8 px-2 py-0 font-semibold text-[11px] w-[10%]">{t('outbound.table.ordered')}</TableHead>
                    <TableHead className="text-center h-8 px-2 py-0 font-semibold text-[11px] w-[10%]">{t('outbound.table.allocated')}</TableHead>
                    <TableHead className="text-center h-8 px-2 py-0 font-semibold text-[11px] w-[10%]">{t('outbound.table.picked')}</TableHead>
                    <TableHead className="text-center h-8 px-2 py-0 font-semibold text-[11px] w-[15%]">{t('outbound.table.status')}</TableHead>
                    <TableHead className="w-auto"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lines.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground text-xs">{t('common.noData')}</TableCell></TableRow>
                    ) : (
                    lines.map((line) => {
                        const isShort = line.qty_allocated < line.qty_ordered;
                        const rowClass = isShort ? 'bg-amber-50/30 hover:bg-amber-100/40' : 'hover:bg-slate-50';
                        return (
                        <TableRow key={line.id} className={`${rowClass} h-8 border-b border-slate-50 last:border-0`}>
                            <TableCell className="px-2 py-0 align-middle">
                            <div className="flex flex-col justify-center h-full">
                                <span className="font-medium text-[11px] truncate leading-tight" title={line.product?.name}>{line.product?.name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono leading-tight">{line.product?.sku}</span>
                            </div>
                            </TableCell>
                            <TableCell className="text-center px-2 py-0 text-[11px]">{Number(line.qty_ordered).toLocaleString()}</TableCell>
                            <TableCell className={`text-center px-2 py-0 font-bold text-[11px] ${isShort ? 'text-red-600' : 'text-green-600'}`}>{Number(line.qty_allocated).toLocaleString()}</TableCell>
                            <TableCell className="text-center px-2 py-0 text-[11px]">{Number(line.qty_picked).toLocaleString()}</TableCell>
                            <TableCell className="text-center px-2 py-0">
                            <Badge variant={isShort ? 'destructive' : 'outline'} className="text-[9px] h-4 px-1.5 py-0 font-normal border-slate-200">{line.line_status || 'PENDING'}</Badge>
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        );
                    })
                    )}
                </TableBody>
            </Table>
            </TabsContent>

            <TabsContent value="tasks" className="m-0 p-0 border rounded-sm bg-white">
                <Table className="table-fixed w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                <TableHeader className="bg-slate-50 h-8">
                    <TableRow className="h-8 hover:bg-transparent border-b border-slate-200">
                    <TableHead className="text-start h-8 px-2 py-0 font-semibold text-[11px] w-[15%]">{t('outbound.table.task')}</TableHead>
                    <TableHead className="text-start h-8 px-2 py-0 font-semibold text-[11px] w-[20%]">{t('outbound.table.fromLocation')}</TableHead>
                    <TableHead className="text-center h-8 px-2 py-0 font-semibold text-[11px] w-[15%]">{t('outbound.table.qtyToPick')}</TableHead>
                    <TableHead className="text-center h-8 px-2 py-0 font-semibold text-[11px] w-[15%]">{t('outbound.table.status')}</TableHead>
                    <TableHead className="w-auto"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tasks.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-xs">{t('common.noData')}</TableCell></TableRow>
                    ) : (
                    tasks.map((task) => (
                        <TableRow key={task.id} className="h-8 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <TableCell className="px-2 py-0 font-mono text-[10px]">#{task.id}</TableCell>
                        <TableCell className="px-2 py-0"><Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal bg-white text-slate-700">{task.from_location?.name}</Badge></TableCell>
                        <TableCell className="text-center px-2 py-0 font-bold text-[11px]">{Number(task.qty_to_pick).toLocaleString()}</TableCell>
                        <TableCell className="text-center px-2 py-0"><Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal bg-slate-100 text-slate-700 hover:bg-slate-200">{task.status}</Badge></TableCell>
                        <TableCell></TableCell>
                        </TableRow>
                    ))
                    )}
                </TableBody>
                </Table>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}