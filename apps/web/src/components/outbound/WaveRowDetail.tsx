import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  CheckCircle2, 
  Trash2, 
  Package, 
  ListTodo, 
  Plus,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef,
} from '@tanstack/react-table';

import { api } from '@/services/api';
import { OutboundWave, OutboundOrder } from '@/services/outboundService';

interface PickTask {
  id: number;
  task_number: string;
  status: string;
  quantity: number;
  qty_picked: number;
  product: { sku: string; name: string };
  from_location: { name: string };
}

interface WaveRowDetailProps {
  wave: OutboundWave;
}

export function WaveRowDetail({ wave }: WaveRowDetailProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isAddOrdersOpen, setIsAddOrdersOpen] = useState(false);
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  // 1. Fetch Tasks
  const shouldFetchTasks = ['ALLOCATED', 'RELEASED', 'COMPLETED'].includes(wave.status);
  
  const { data: tasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ['wave-tasks', wave.id],
    queryFn: async () => {
      const res = await api.get<PickTask[]>(`/api/outbound/waves/${wave.id}/tasks`);
      return res.data;
    },
    enabled: shouldFetchTasks,
    staleTime: 1000 * 60,
  });

  // 2. Fetch Potential Orders
  const { data: potentialOrders } = useQuery({
    queryKey: ['available-orders'],
    queryFn: async () => {
      const res = await api.get('/api/outbound/orders?status=VERIFIED');
      return res.data.filter((o: any) => !o.wave_id);
    },
    enabled: isAddOrdersOpen,
  });

  // Mutations
  const allocateMutation = useMutation({
    mutationFn: async () => await api.post(`/api/outbound/waves/${wave.id}/allocate`, {}),
    onSuccess: () => {
      toast.success(t('outbound.messages.allocationStarted'));
      queryClient.invalidateQueries({ queryKey: ['outbound-waves'] });
      queryClient.invalidateQueries({ queryKey: ['wave-tasks', wave.id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('common.error')),
  });

  const releaseMutation = useMutation({
    mutationFn: async () => await api.post(`/api/outbound/waves/${wave.id}/release`, {}),
    onSuccess: () => {
      toast.success(t('outbound.messages.waveReleased'));
      queryClient.invalidateQueries({ queryKey: ['outbound-waves'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('common.error')),
  });

  const removeOrderMutation = useMutation({
    mutationFn: async (orderId: number) => await api.delete(`/api/outbound/waves/${wave.id}/orders/${orderId}`),
    onSuccess: () => {
      toast.success(t('outbound.messages.orderRemoved'));
      queryClient.invalidateQueries({ queryKey: ['outbound-waves'] });
    }
  });

  const addOrdersMutation = useMutation({
    mutationFn: async (orderIds: number[]) => await api.post(`/api/outbound/waves/${wave.id}/orders`, { order_ids: orderIds }),
    onSuccess: () => {
      toast.success(t('outbound.messages.ordersAdded'));
      setIsAddOrdersOpen(false);
      queryClient.invalidateQueries({ queryKey: ['outbound-waves'] });
    }
  });

  // --- MEMOIZED COLUMNS ---
  const orderColumns = useMemo<ColumnDef<OutboundOrder>[]>(() => [
    { 
        accessorKey: 'order_number', 
        header: t('outbound.orderNumber'),
        cell: ({row}) => <span className="font-medium">{row.original.order_number}</span>
    },
    { 
        accessorKey: 'customer.name', 
        header: t('outbound.customer') 
    },
    { 
      header: t('outbound.lines'), 
      cell: ({ row }) => row.original.lines?.length || 0 
    },
    { 
      header: t('outbound.items'), 
      cell: ({ row }) => row.original.lines?.reduce((sum, line) => sum + Number(line.qty_ordered), 0) || 0 
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => removeOrderMutation.mutate(row.original.id)} 
            disabled={wave.status !== 'PLANNING'} // Disabled if not planning, but visible
            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30"
        >
            <Trash2 className="h-4 w-4" />
        </Button>
      )
    }
  ], [wave.status, t]);

  const taskColumns = useMemo<ColumnDef<PickTask>[]>(() => [
    { accessorKey: 'task_number', header: t('outbound.task') },
    { accessorKey: 'product.sku', header: t('products.sku'), cell: ({row}) => row.original.product?.sku },
    { accessorKey: 'product.name', header: t('products.name'), cell: ({row}) => row.original.product?.name },
    { accessorKey: 'quantity', header: t('common.quantity') },
    { accessorKey: 'qty_picked', header: t('outbound.picked') },
    { accessorKey: 'from_location.name', header: t('outbound.location'), cell: ({row}) => row.original.from_location?.name },
    { 
      accessorKey: 'status', 
      header: t('outbound.status'),
      cell: ({row}) => {
        const s = row.original.status;
        let color = 'outline';
        if (s === 'SHORT') color = 'destructive';
        if (s === 'COMPLETED') color = 'default';
        return <Badge variant={color as any}>{s}</Badge>
      }
    }
  ], [t]);

  const ordersTable = useReactTable({
    data: wave.orders || [],
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const tasksTable = useReactTable({
    data: tasks || [],
    columns: taskColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const [rowSelection, setRowSelection] = useState({});
  const potentialOrdersTable = useReactTable({
    data: potentialOrders || [],
    columns: [
      {
        id: 'select',
        header: ({ table }) => (
          <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />
        ),
        cell: ({ row }) => (
          <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
        ),
      },
      { accessorKey: 'order_number', header: t('outbound.orderNumber') },
      { accessorKey: 'customer.name', header: t('outbound.customer') },
      { accessorKey: 'lines', header: t('outbound.lines'), cell: ({row}) => row.original.lines?.length || 0 },
    ],
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  return (
    <div 
        className="bg-slate-50/80 border-t border-b border-gray-200 p-2 animate-in fade-in zoom-in-95 duration-200"
        dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Tabs defaultValue="orders" className="w-full">
        {/* Compact Header: Tabs and Actions on the same line, aligned to Start (Right in RTL) */}
        <div className="flex items-center justify-start gap-4 mb-2 px-1 w-full">
          
          {/* Tabs */}
          <TabsList className="h-9 w-auto bg-white border border-gray-200 shadow-sm shrink-0">
            <TabsTrigger value="orders" className="text-xs h-7 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Package className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />
              {t('outbound.tabs.orders')} ({wave.orders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs h-7 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary" disabled={wave.status === 'PLANNING'}>
              <ListTodo className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />
              {t('outbound.tabs.tasks')} ({tasks?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Action Buttons - Always visible, disabled based on state */}
          <div className="flex items-center gap-2 shrink-0">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddOrdersOpen(true)} 
                className="h-8 text-xs bg-white hover:bg-slate-50"
                disabled={wave.status !== 'PLANNING'}
            >
                <Plus className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" /> {t('outbound.addOrders')}
            </Button>
            
            {wave.status === 'PLANNING' ? (
                <Button onClick={() => allocateMutation.mutate()} disabled={allocateMutation.isPending} size="sm" className="h-8 text-xs">
                  <Play className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" /> {t('outbound.actions.allocate')}
                </Button>
            ) : wave.status === 'ALLOCATED' ? (
                <Button onClick={() => releaseMutation.mutate()} disabled={releaseMutation.isPending} className="bg-green-600 hover:bg-green-700 h-8 text-xs" size="sm">
                  <CheckCircle2 className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" /> {t('outbound.actions.release')}
                </Button>
            ) : null}

            {tasks && tasks.some(t => t.status === 'SHORT') && wave.status !== 'RELEASED' && (
               <div className="flex items-center text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-100">
                  <AlertTriangle className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                  {t('outbound.messages.shortageDetected')}
               </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
          <TabsContent value="orders" className="m-0 p-0">
            <SmartTable 
                table={ordersTable} 
                columnsLength={5} 
                isLoading={false} 
                className="border-0 shadow-none" 
                noDataMessage={t('outbound.messages.noOrdersInWave')}
            />
          </TabsContent>
          <TabsContent value="tasks" className="m-0 p-0">
            <SmartTable 
              table={tasksTable} 
              columnsLength={7} 
              isLoading={isTasksLoading} 
              noDataMessage={t('outbound.messages.noTasksYet')} 
              className="border-0 shadow-none"
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Add Orders Dialog */}
      <Dialog open={isAddOrdersOpen} onOpenChange={setIsAddOrdersOpen}>
        <DialogContent className="max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('outbound.addOrdersToWave')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto border rounded-md mt-2">
             <SmartTable 
                table={potentialOrdersTable} 
                columnsLength={4} 
                isLoading={false} 
                noDataMessage={t('outbound.messages.noAvailableOrders')}
             />
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <Button variant="outline" onClick={() => setIsAddOrdersOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => {
              const selectedIds = Object.keys(rowSelection).map(idx => potentialOrders[parseInt(idx)].id);
              if(selectedIds.length > 0) addOrdersMutation.mutate(selectedIds);
            }} disabled={Object.keys(rowSelection).length === 0}>
              {t('common.add')} ({Object.keys(rowSelection).length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}