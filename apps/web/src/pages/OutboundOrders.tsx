import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  ExpandedState,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { OutboundOrderRowDetail } from '@/components/outbound/OutboundOrderRowDetail';
import { Plus, ChevronRight, ChevronDown, Package, XCircle, Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';
import type { OutboundOrder } from '@/services/outboundService';
import {
  getOrders,
  allocateOrder,
  cancelOrder,
  createWave,
  calculateOrderProgress,
  getStatusColor,
  getPriorityInfo,
  getStrategies,
  getStrategyForOrder
} from '@/services/outboundService';
import { format } from 'date-fns';

export default function OutboundOrders() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } =
    useTableSettings({ tableName: 'outbound_orders_table' });

  // Fetch outbound orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['outbound-orders'],
    queryFn: () => getOrders(),
  });

  // Fetch strategies for auto-allocation
  const { data: strategies } = useQuery({
    queryKey: ['allocation-strategies'],
    queryFn: () => getStrategies(),
  });

  // --- Bulk Allocate Handler ---
  const handleBulkAllocate = async () => {
    const selectedIds = Object.keys(rowSelection).map(Number);
    if (selectedIds.length === 0) return;

    setBulkLoading(true);
    let successCount = 0;
    
    for (const id of selectedIds) {
        const order = orders?.find(o => o.id === id);
        if (!order || (order.status !== 'DRAFT')) continue;

        try {
            const strategy = getStrategyForOrder(order, strategies || []);
            if (strategy) {
                await allocateOrder(id, { strategy_id: strategy.id });
                successCount++;
            }
        } catch (error) {
            console.error(`Failed to allocate order ${id}`, error);
        }
    }

    setBulkLoading(false);
    setRowSelection({});
    queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
    toast.success(t('outbound.actions.allocateSelected', { count: successCount }) + ' ' + t('common.success', 'בוצע בהצלחה'));
  };

  // --- Bulk Cancel Handler ---
  const handleBulkCancel = async () => {
      const selectedIds = Object.keys(rowSelection).map(Number);
      if (selectedIds.length === 0 || !confirm(t('outbound.actions.cancelConfirm', 'האם אתה בטוח?'))) return;

      setBulkLoading(true);
      for (const id of selectedIds) {
          try {
              await cancelOrder(id);
          } catch (e) { console.error(e); }
      }
      setBulkLoading(false);
      setRowSelection({});
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      toast.success(t('outbound.actions.cancelSelected', { count: selectedIds.length }));
  };

  // --- Create Wave Handler ---
  const handleCreateWave = async () => {
      const selectedIds = Object.keys(rowSelection).map(Number);
      if (selectedIds.length === 0) return;
      
      setBulkLoading(true);
      try {
          await createWave({ order_ids: selectedIds }); 
          toast.success(t('outbound.actions.waveCreated', 'גל נוצר בהצלחה'));
          queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
          setRowSelection({});
      } catch (err: any) {
          toast.error(err.response?.data?.detail || t('common.error'));
      } finally {
          setBulkLoading(false);
      }
  };

  const columns = useMemo<ColumnDef<OutboundOrder>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="h-8 w-8"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ),
        size: 40,
      },
      {
        accessorKey: 'order_number',
        id: 'order_number',
        header: t('outbound.orderNumber'),
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-primary">{row.original.order_number}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.order_type}
            </div>
          </div>
        ),
      },
      // --- עמודת גל חדשה ---
      {
        accessorKey: 'wave.wave_number',
        id: 'wave',
        header: t('outbound.waveNumber', 'מספר גל'),
        cell: ({ row }) => row.original.wave ? (
            <Badge variant="outline">{row.original.wave.wave_number}</Badge>
        ) : '-',
      },
      {
        accessorKey: 'customer',
        id: 'customer',
        header: t('outbound.customer'),
        cell: ({ row }) =>
          row.original.customer ? (
            <div>
              <div className="font-medium">{row.original.customer.name}</div>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: 'status',
        id: 'status',
        header: t('outbound.status'),
        cell: ({ row }) => {
          const color = getStatusColor(row.original.status);
          return (
            <Badge className={`bg-${color}-100 text-${color}-800 border-${color}-200 hover:bg-${color}-100`}>
              {t(`outbound.statuses.${row.original.status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'priority',
        id: 'priority',
        header: t('outbound.priority'),
        cell: ({ row }) => {
          const { label, color } = getPriorityInfo(row.original.priority);
          return (
            <Badge variant="outline" className={`border-${color}-200 text-${color}-700`}>
              {t(`outbound.priorities.${label}`)}
            </Badge>
          );
        },
      },
      {
        id: 'progress',
        header: t('outbound.progress'),
        cell: ({ row }) => {
          const progress = calculateOrderProgress(row.original);
          return (
            <div className="flex items-center gap-2 w-24">
              <Progress value={progress} className="h-2" />
              <span className="text-xs text-muted-foreground w-8">
                {progress}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'requested_delivery_date',
        id: 'requested_delivery_date',
        header: t('outbound.deliveryDate'),
        cell: ({ row }) =>
          row.original.requested_delivery_date ? (
            <span className="text-sm">
              {format(new Date(row.original.requested_delivery_date), 'dd/MM/yyyy')}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: 'metrics',
        header: t('outbound.linesCount'),
        cell: ({ row }) => {
          const metrics = row.original.metrics;
          const linesCount = metrics?.total_lines || row.original.lines?.length || 0;
          return (
            <div className="text-xs text-muted-foreground font-mono">
              {linesCount}
            </div>
          );
        },
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: orders || [],
    columns,
    getRowId: (row) => row.id.toString(),
    state: { expanded, sorting, globalFilter, pagination, columnVisibility, rowSelection },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange,
    onColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowCanExpand: () => true,
    enableRowSelection: true,
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="flex flex-col space-y-4 pb-8">
      <div className="mb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">{t('outbound.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('outbound.description')}</p>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-2 rounded-md mb-4 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-blue-900 ml-2">
                {t('common.selected', { count: selectedCount })}
            </span>
            
            <Button size="sm" onClick={handleBulkAllocate} disabled={bulkLoading} className="bg-blue-600 hover:bg-blue-700">
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Package className="h-4 w-4 mr-2" />}
                {t('outbound.actions.allocateSelected', { count: selectedCount })}
            </Button>

            <Button size="sm" variant="outline" onClick={handleCreateWave} disabled={bulkLoading} className="bg-white hover:bg-slate-50 text-blue-700 border-blue-200">
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Layers className="h-4 w-4 mr-2" />}
                {t('outbound.actions.createWave', 'צור גל ליקוט')}
            </Button>

            <Button size="sm" variant="destructive" onClick={handleBulkCancel} disabled={bulkLoading}>
                <XCircle className="h-4 w-4 mr-2" />
                {t('outbound.actions.cancelSelected', { count: selectedCount })}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
                {t('common.clearSelection')}
            </Button>
        </div>
      )}

      <div>
        <SmartTable
            table={table}
            columnsLength={columns.length}
            isLoading={isLoading}
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            noDataMessage={t('common.noData')}
            actions={
                <Button onClick={() => setIsSheetOpen(true)}>
                    <Plus className="ml-2 h-4 w-4" />
                    {t('outbound.createOrder')}
                </Button>
            }
            renderSubComponent={({ row }) => (
                <OutboundOrderRowDetail order={row.original} />
            )}
        />
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>{t('outbound.createOrder')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
              <p className="text-muted-foreground">{t('common.comingSoon', 'בקרוב...')}</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}