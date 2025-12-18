import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Package, 
  ListTodo,
  MapPin,
  Plus,
  Search,
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
} from '@tanstack/react-table';

import { api } from '@/services/api';
import { OutboundWave, OutboundOrder } from '@/services/outboundService';

interface PickTask {
  id: number;
  task_number: string;
  status: string;
  from_location_id: number;
  to_location_id: number;
  product_id: number;
  quantity: number;
  picked_quantity: number;
  product: { sku: string; name: string };
  from_location: { name: string };
  priority: number;
}

export default function OutboundWaveDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === 'he';
  
  const [isAddOrdersOpen, setIsAddOrdersOpen] = useState(false);
  const [selectedOrdersToAdd, setSelectedOrdersToAdd] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState("orders");
  const [globalFilter, setGlobalFilter] = useState('');

  // 1. Fetch Wave Details
  const { data: wave, isLoading: isWaveLoading } = useQuery({
    queryKey: ['outbound-wave', id],
    queryFn: async () => {
      const res = await api.get<OutboundWave>(`/api/outbound/waves/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // 2. Fetch Pick Tasks
  const { data: tasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ['outbound-wave-tasks', id],
    queryFn: async () => {
      const res = await api.get<PickTask[]>(`/api/outbound/waves/${id}/tasks`); 
      return res.data;
    },
    enabled: !!id && (wave?.status === 'ALLOCATED' || wave?.status === 'RELEASED' || wave?.status === 'COMPLETED'),
  });

  // 3. Fetch Available Orders
  const { data: availableOrders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['available-orders-for-wave'],
    queryFn: async () => {
      const res = await api.get<OutboundOrder[]>('/api/outbound/orders', {
        params: { status: 'VERIFIED', wave_id: 'null' }
      });
      return res.data.filter(o => !o.wave_id && o.status === 'VERIFIED');
    },
    enabled: isAddOrdersOpen,
  });

  // Mutations
  const allocateMutation = useMutation({
    mutationFn: async () => await api.post(`/api/outbound/waves/${id}/allocate`, {}),
    onSuccess: () => {
      toast.success(t('outbound.messages.allocationStarted'));
      queryClient.invalidateQueries({ queryKey: ['outbound-wave', id] });
      queryClient.invalidateQueries({ queryKey: ['outbound-wave-tasks', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('common.error')),
  });

  const releaseMutation = useMutation({
    mutationFn: async () => await api.post(`/api/outbound/waves/${id}/release`, {}),
    onSuccess: () => {
      toast.success(t('outbound.messages.waveReleased'));
      queryClient.invalidateQueries({ queryKey: ['outbound-wave', id] });
      queryClient.invalidateQueries({ queryKey: ['outbound-wave-tasks', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('common.error')),
  });

  const addOrdersMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      return await api.post(`/api/outbound/waves/${id}/orders`, { order_ids: orderIds });
    },
    onSuccess: () => {
      toast.success(t('outbound.messages.ordersAdded'));
      setIsAddOrdersOpen(false);
      setSelectedOrdersToAdd([]);
      queryClient.invalidateQueries({ queryKey: ['outbound-wave', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('common.error')),
  });

  // Table Definitions
  const orderColumns: ColumnDef<OutboundOrder>[] = [
    { accessorKey: 'order_number', header: t('outbound.orderNumber'), cell: ({ row }) => <span className="font-medium">{row.original.order_number}</span> },
    { accessorKey: 'customer.name', header: t('outbound.customer') },
    { accessorKey: 'status', header: t('outbound.status'), cell: ({ row }) => {
        const status = row.original.status;
        let color = 'bg-slate-100 text-slate-800';
        if (status === 'PLANNED') color = 'bg-blue-100 text-blue-800';
        if (status === 'RELEASED') color = 'bg-green-100 text-green-800';
        if (status === 'VERIFIED') color = 'bg-purple-100 text-purple-800';
        return <Badge className={color}>{status}</Badge>;
      }
    },
    { header: t('outbound.lines'), cell: ({ row }) => row.original.lines?.length || 0 },
  ];

  const taskColumns: ColumnDef<PickTask>[] = [
    { accessorKey: 'task_number', header: t('outbound.task'), cell: ({ row }) => <span className="font-mono text-xs">{row.original.task_number}</span> },
    { accessorKey: 'from_location.name', header: t('outbound.location'), cell: ({ row }) => <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" />{row.original.from_location?.name}</div> },
    { accessorKey: 'product.sku', header: t('products.sku'), cell: ({ row }) => row.original.product?.sku },
    { accessorKey: 'product.name', header: t('products.name'), cell: ({ row }) => row.original.product?.name },
    { accessorKey: 'quantity', header: t('outbound.table.qtyToPick'), cell: ({ row }) => <span className="font-bold">{row.original.quantity}</span> },
    { accessorKey: 'status', header: t('outbound.status'), cell: ({ row }) => {
        const status = row.original.status;
        let color = 'bg-gray-100';
        if (status === 'PENDING') color = 'bg-yellow-100 text-yellow-800';
        if (status === 'COMPLETED') color = 'bg-green-100 text-green-800';
        return <Badge className={color}>{status}</Badge>;
      }
    },
  ];

  const ordersTable = useReactTable({
    data: wave?.orders || [],
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  const tasksTable = useReactTable({
    data: tasks || [],
    columns: taskColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  // Available orders filter
  const filteredAvailableOrders = availableOrders?.filter(o => 
    o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrdersToAdd(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  if (isWaveLoading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (!wave) return <div className="p-8 text-center text-red-500">{t('outbound.waveNotFound')}</div>;

  const totalOrders = wave.orders?.length || 0;
  const completedOrders = wave.orders?.filter(o => o.status === 'SHIPPED').length || 0;
  const progress = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/outbound/waves')}>
          {isRTL ? <ArrowRight /> : <ArrowLeft />}
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {wave.wave_number}
            <Badge variant="outline" className="text-base font-normal">
              {wave.status}
            </Badge>
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('outbound.createdOn')}: {format(new Date(wave.created_at), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('outbound.progress')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{Math.round(progress)}%</span>
              <span className="text-xs text-muted-foreground">{completedOrders}/{totalOrders} {t('outbound.orders')}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('outbound.strategy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={wave.strategy_id?.toString() || ''}>
               {wave.strategy_id}
            </div>
            <p className="text-xs text-muted-foreground">
              {wave.metrics?.wave_type || 'Custom'}
            </p>
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('outbound.totalLines')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {wave.orders?.reduce((acc, o) => acc + (o.lines?.length || 0), 0) || 0}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Tabs & Unified Toolbar - ONE LINE CONTAINER */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setGlobalFilter(''); }} className="w-full">
        
        {/* Container: RTL = Starts from Right. Items: Tabs, then Gap, then Controls */}
        <div className="flex items-center justify-start gap-4 w-full mb-4 overflow-x-auto pb-1">
            
            {/* 1. Tabs (Will be on the Right in RTL) */}
            <TabsList className="shrink-0">
                <TabsTrigger value="orders" className="gap-2">
                    <Package className="w-4 h-4" />
                    {t('outbound.orders')} ({wave.orders?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2" disabled={wave.status === 'PLANNING'}>
                    <ListTodo className="w-4 h-4" />
                    {t('outbound.tasks')} ({tasks?.length || 0})
                </TabsTrigger>
            </TabsList>

            {/* 2. Controls Group - All in one line */}
            <div className="flex items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative w-64">
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground left-auto" />
                    <style>{`[dir="rtl"] .absolute.right-2.5 { right: 0.625rem; left: auto; } [dir="rtl"] .pl-8 { padding-right: 2.5rem; padding-left: 0.75rem; }`}</style>
                    <Input
                      placeholder={t('common.searchPlaceholder')}
                      value={globalFilter ?? ""}
                      onChange={(event) => setGlobalFilter(event.target.value)}
                      className="pl-8 h-9 bg-white w-full" 
                    />
                </div>

                {/* View Options (Dropdown) */}
                <DataTableViewOptions table={activeTab === 'orders' ? ordersTable : tasksTable} />

                {/* Refresh Button */}
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    title={t('common.refresh')}
                    onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ['outbound-wave', id] });
                        queryClient.invalidateQueries({ queryKey: ['outbound-wave-tasks', id] });
                        toast.success(t('common.dataRefreshed'));
                    }}
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>

                {/* Separator */}
                <div className="h-6 w-px bg-slate-200 mx-1" />

                {/* Action Buttons */}
                {wave.status === 'PLANNING' && (
                    <Button variant="default" size="sm" onClick={() => setIsAddOrdersOpen(true)} className="whitespace-nowrap h-9">
                        <Plus className="w-4 h-4 ml-2" />
                        {t('outbound.addOrders')}
                    </Button>
                )}
                
                {wave.status === 'PLANNING' && (
                    <Button size="sm" onClick={() => allocateMutation.mutate()} disabled={allocateMutation.isPending} className="whitespace-nowrap h-9">
                        {allocateMutation.isPending ? <Play className="w-4 h-4 animate-spin ml-2" /> : <Play className="w-4 h-4 ml-2" />}
                        {t('outbound.actions.allocate')}
                    </Button>
                )}

                {wave.status === 'ALLOCATED' && (
                    <Button size="sm" onClick={() => releaseMutation.mutate()} disabled={releaseMutation.isPending} className="bg-green-600 hover:bg-green-700 whitespace-nowrap h-9">
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                        {t('outbound.actions.release')}
                    </Button>
                )}
            </div>
        </div>

        {/* Content - HIDE TOOLBAR is critical here */}
        <TabsContent value="orders" className="mt-0">
          <SmartTable
            table={ordersTable}
            columnsLength={orderColumns.length}
            isLoading={false}
            noDataMessage={t('common.noData')}
            hideToolbar={true} 
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-0">
           <SmartTable
            table={tasksTable}
            columnsLength={taskColumns.length}
            isLoading={isTasksLoading}
            noDataMessage={t('outbound.messages.noTasksYet')}
            hideToolbar={true} 
          />
        </TabsContent>
      </Tabs>

      {/* Add Orders Dialog */}
      <Dialog open={isAddOrdersOpen} onOpenChange={setIsAddOrdersOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('outbound.dialog.addOrdersTitle')}</DialogTitle>
            <DialogDescription>
              {t('outbound.dialog.addOrdersDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('outbound.dialog.searchOrdersPlaceholder')}
                className="pr-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="border rounded-md">
              <ScrollArea className="h-[300px]">
                {isOrdersLoading ? (
                  <div className="p-8 text-center text-muted-foreground">{t('outbound.dialog.loadingOrders')}</div>
                ) : filteredAvailableOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">{t('outbound.messages.noAvailableOrders')}</div>
                ) : (
                  <div className="divide-y">
                    {filteredAvailableOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer"
                        onClick={() => toggleOrderSelection(order.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedOrdersToAdd.includes(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                          />
                          <div>
                            <div className="font-medium">{order.order_number}</div>
                            <div className="text-sm text-muted-foreground">{order.customer?.name} | {order.lines?.length} {t('outbound.lines')}</div>
                          </div>
                        </div>
                        <Badge variant="outline">{order.order_type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('outbound.dialog.selectedOrders', { count: selectedOrdersToAdd.length })}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOrdersOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => addOrdersMutation.mutate(selectedOrdersToAdd)}
              disabled={selectedOrdersToAdd.length === 0 || addOrdersMutation.isPending}
            >
              {addOrdersMutation.isPending ? t('common.adding') : t('outbound.dialog.addToWave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}