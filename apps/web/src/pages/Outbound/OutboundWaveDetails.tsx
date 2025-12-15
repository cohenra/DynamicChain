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
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef,
} from '@tanstack/react-table';

import { api } from '@/services/api';
import { OutboundWave, OutboundOrder } from '@/services/outboundService';

// Define PickTask type locally or move to service
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

  // 1. Fetch Wave Details
  const { data: wave, isLoading: isWaveLoading } = useQuery({
    queryKey: ['outbound-wave', id],
    queryFn: async () => {
      const res = await api.get<OutboundWave>(`/api/outbound/waves/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // 2. Fetch Pick Tasks (Only if wave is released or allocated)
  const { data: tasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ['outbound-wave-tasks', id],
    queryFn: async () => {
      // Assuming backend endpoint exists or getting it from wave expansion. 
      // If endpoint missing, we might need to add it to backend router.
      // Trying to get tasks associated with this wave.
      const res = await api.get<PickTask[]>(`/api/outbound/waves/${id}/tasks`); 
      return res.data;
    },
    enabled: !!id && (wave?.status === 'ALLOCATED' || wave?.status === 'RELEASED' || wave?.status === 'COMPLETED'),
  });

  // Actions Mutations
  const allocateMutation = useMutation({
    mutationFn: async () => await api.post(`/api/outbound/waves/${id}/allocate`, {}),
    onSuccess: () => {
      toast.success(t('outbound.allocationStarted', 'תהליך ההקצאה החל'));
      queryClient.invalidateQueries({ queryKey: ['outbound-wave', id] });
      queryClient.invalidateQueries({ queryKey: ['outbound-wave-tasks', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('common.error')),
  });

  const releaseMutation = useMutation({
    mutationFn: async () => await api.post(`/api/outbound/waves/${id}/release`, {}),
    onSuccess: () => {
      toast.success(t('outbound.waveReleased', 'הגל שוחרר לליקוט'));
      queryClient.invalidateQueries({ queryKey: ['outbound-wave', id] });
      queryClient.invalidateQueries({ queryKey: ['outbound-wave-tasks', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('common.error')),
  });

  // --- Order Columns ---
  const orderColumns: ColumnDef<OutboundOrder>[] = [
    {
      accessorKey: 'order_number',
      header: t('outbound.orderNumber', 'מספר הזמנה'),
      cell: ({ row }) => <span className="font-medium">{row.original.order_number}</span>,
    },
    {
      accessorKey: 'customer.name',
      header: t('outbound.customer', 'לקוח'),
    },
    {
      accessorKey: 'status',
      header: t('outbound.status', 'סטטוס'),
      cell: ({ row }) => {
        const status = row.original.status;
        let color = 'bg-slate-100 text-slate-800';
        if (status === 'PLANNED') color = 'bg-blue-100 text-blue-800';
        if (status === 'RELEASED') color = 'bg-green-100 text-green-800';
        return <Badge className={color}>{status}</Badge>;
      },
    },
    {
      header: t('outbound.lines', 'שורות'),
      cell: ({ row }) => row.original.lines?.length || 0,
    },
  ];

  // --- Task Columns ---
  const taskColumns: ColumnDef<PickTask>[] = [
    {
      accessorKey: 'task_number',
      header: 'משימה',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.task_number}</span>,
    },
    {
      accessorKey: 'from_location.name',
      header: 'מיקום',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          {row.original.from_location?.name}
        </div>
      ),
    },
    {
      accessorKey: 'product.sku',
      header: 'מק"ט',
      cell: ({ row }) => row.original.product?.sku,
    },
    {
      accessorKey: 'product.name',
      header: 'שם מוצר',
      cell: ({ row }) => row.original.product?.name,
    },
    {
      accessorKey: 'quantity',
      header: 'כמות לליקוט',
      cell: ({ row }) => <span className="font-bold">{row.original.quantity}</span>,
    },
    {
      accessorKey: 'status',
      header: 'סטטוס',
      cell: ({ row }) => {
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
  });

  const tasksTable = useReactTable({
    data: tasks || [],
    columns: taskColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isWaveLoading) return <div className="p-8 text-center">{t('common.loading', 'טוען...')}</div>;
  if (!wave) return <div className="p-8 text-center text-red-500">{t('outbound.waveNotFound', 'גל לא נמצא')}</div>;

  const totalOrders = wave.orders?.length || 0;
  const completedOrders = wave.orders?.filter(o => o.status === 'SHIPPED').length || 0;
  const progress = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
              {t('outbound.createdOn', 'נוצר ב:')} {format(new Date(wave.created_at), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wave.status === 'PLANNING' && (
            <Button onClick={() => allocateMutation.mutate()} disabled={allocateMutation.isPending}>
              {allocateMutation.isPending ? <Play className="w-4 h-4 animate-spin ml-2" /> : <Play className="w-4 h-4 ml-2" />}
              {t('outbound.actions.allocate', 'הרץ הקצאה')}
            </Button>
          )}
          {wave.status === 'ALLOCATED' && (
            <Button onClick={() => releaseMutation.mutate()} disabled={releaseMutation.isPending} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 ml-2" />
              {t('outbound.actions.release', 'שחרר לליקוט')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('outbound.progress', 'התקדמות')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{Math.round(progress)}%</span>
              <span className="text-xs text-muted-foreground">{completedOrders}/{totalOrders} {t('outbound.orders', 'הזמנות')}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('outbound.strategy', 'אסטרטגיה')}</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('outbound.totalLines', 'סה״כ שורות')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {wave.orders?.reduce((acc, o) => acc + (o.lines?.length || 0), 0) || 0}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <Package className="w-4 h-4" />
            {t('outbound.orders', 'הזמנות')} ({wave.orders?.length || 0})
          </TabsTrigger>
          
          {/* FIX: Enabled Tasks Tab */}
          <TabsTrigger value="tasks" className="gap-2" disabled={wave.status === 'PLANNING'}>
            <ListTodo className="w-4 h-4" />
            {t('outbound.tasks', 'משימות ליקוט')} ({tasks?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <SmartTable
            table={ordersTable}
            columnsLength={orderColumns.length}
            isLoading={false}
            noDataMessage={t('common.noData')}
          />
        </TabsContent>

        {/* FIX: Added Tasks Table Content */}
        <TabsContent value="tasks" className="mt-4">
           <SmartTable
            table={tasksTable}
            columnsLength={taskColumns.length}
            isLoading={isTasksLoading}
            noDataMessage="אין משימות ליקוט עדיין. יש לבצע הקצאה ושחרור."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}