import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inboundService, InboundOrder, InboundOrderCreateRequest } from '@/services/inboundService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ChevronDown, ChevronRight, Plus, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';
import { InboundOrderRowDetail } from './InboundOrderRowDetail';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { InboundOrderForm } from './InboundOrderForm';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'DRAFT': return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PARTIALLY_RECEIVED': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'SHORT_CLOSED': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-800';
  }
};

const calculateProgress = (order: InboundOrder) => {
    if (!order.lines || order.lines.length === 0) return 0;
    const totalExpected = order.lines.reduce((acc, line) => acc + Number(line.expected_quantity), 0);
    const totalReceived = order.lines.reduce((acc, line) => acc + Number(line.received_quantity), 0);
    if (totalExpected === 0) return 0;
    return Math.min(100, Math.round((totalReceived / totalExpected) * 100));
};

const calculateTotalItems = (order: InboundOrder) => {
    if (!order.lines) return 0;
    return order.lines.reduce((acc, line) => acc + Number(line.expected_quantity), 0);
};

export default function InboundOrders() {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } =
    useTableSettings({ tableName: 'inbound_orders_table' });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['inbound-orders'],
    queryFn: () => inboundService.getOrders(),
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: InboundOrderCreateRequest) => inboundService.createOrder(data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
        setIsCreateOpen(false);
        toast.success(t('inbound.createSuccess'));
    },
    onError: (err: any) => {
        toast.error(err?.response?.data?.detail || t('inbound.createError'));
    }
  });

  const bulkCloseMutation = useMutation({
    mutationFn: (orderIds: number[]) => inboundService.bulkCloseOrders({ order_ids: orderIds }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setRowSelection({});
      if (result.failed_count > 0) {
        toast.warning(`${result.success_count} נסגרו בהצלחה, ${result.failed_count} נכשלו`);
      } else {
        toast.success(`${result.success_count} הזמנות נסגרו בהצלחה`);
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('inbound.bulk.error', 'שגיאה בסגירה המונית'));
    }
  });

  const handleBulkClose = () => {
    const selectedIds = Object.keys(rowSelection).map(Number);
    if (selectedIds.length === 0) {
      toast.error(t('inbound.bulk.noSelection', 'נא לבחור הזמנות'));
      return;
    }
    if (confirm(`האם לסגור ${selectedIds.length} הזמנות שנבחרו?`)) {
        bulkCloseMutation.mutate(selectedIds);
    }
  };

  const columns = useMemo<ColumnDef<InboundOrder>[]>(() => [
    {
      id: 'select',
      size: 40,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('common.selectAll', 'בחר הכל')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('common.select', 'בחר')}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableHiding: false,
    },
    {
      id: 'expander',
      size: 40,
      header: () => null,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
          className="h-6 w-6"
        >
          {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'order_number',
      id: 'order_number',
      size: 140,
      header: t('inbound.orderNumber'),
      cell: ({ row }) => <span className="font-bold text-primary text-xs">{row.original.order_number}</span>
    },
    {
        accessorKey: 'customer.name',
        id: 'customer',
        size: 150,
        header: t('depositors.name'),
        cell: ({ row }) => <div className="truncate max-w-[140px]" title={row.original.customer?.name}>{row.original.customer?.name || '-'}</div>
    },
    {
      accessorKey: 'order_type',
      id: 'order_type',
      size: 120,
      header: t('inbound.orderType'),
      cell: ({ row }) => {
        const type = row.original.order_type;
        const label = type === 'SUPPLIER_DELIVERY' ? t('inbound.orderTypes.PO') : 
                      type === 'CUSTOMER_RETURN' ? t('inbound.orderTypes.RETURN') : 
                      t('inbound.orderTypes.TRANSFER');
        return <span className="text-xs text-muted-foreground">{label}</span>;
      }
    },
    {
      accessorKey: 'status',
      id: 'status',
      size: 110,
      header: t('inbound.status'),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeColor(status)}`}>
            {status.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      id: 'progress',
      size: 100,
      header: t('inbound.progress', 'התקדמות'),
      cell: ({ row }) => {
          const progress = calculateProgress(row.original);
          return (
              <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-1.5 w-16" />
                  <span className="text-[10px] text-muted-foreground">{progress}%</span>
              </div>
          );
      }
    },
    {
      accessorKey: 'supplier_name',
      id: 'supplier_name',
      size: 150,
      header: t('inbound.supplier'),
      cell: ({ row }) => <div className="truncate max-w-[140px]" title={row.original.supplier_name || ''}>{row.original.supplier_name || '-'}</div>
    },
    {
      accessorKey: 'expected_delivery_date',
      id: 'expected_delivery_date',
      size: 100,
      header: t('inbound.expectedDate'),
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.expected_delivery_date)}</span>
    },
    {
      id: 'total_items',
      size: 80,
      header: t('inbound.totalItems', 'פריטים'),
      cell: ({ row }) => <span className="font-medium text-xs">{calculateTotalItems(row.original)}</span>
    },
    {
        id: 'filler',
        header: '',
        size: undefined,
        cell: () => null
    }
  ], [t]);

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
      <div className="mb-2 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">{t('inbound.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('inbound.description')}</p>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-2 rounded-md mb-2 animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-blue-900 ml-2">
            {selectedCount} {t('inbound.bulk.selected', 'נבחרו')}
          </span>
          
            <Button
              size="sm"
              onClick={handleBulkClose}
              disabled={bulkCloseMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 h-8"
            >
              <CheckCircle2 className="ml-2 h-3 w-3" />
              {t('inbound.bulk.close', 'סגור נבחרים')}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
              className="h-8"
            >
              {t('common.clearSelection', 'נקה בחירה')}
            </Button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <SmartTable
            table={table}
            columnsLength={columns.length}
            isLoading={isLoading}
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            noDataMessage={t('inbound.noOrders')}
            actions={
                <Button onClick={() => setIsCreateOpen(true)} size="sm" className="h-8">
                    <Plus className="ml-2 h-3 w-3" />
                    {t('inbound.createOrder')}
                </Button>
            }
            renderSubComponent={({ row }) => (
                <InboundOrderRowDetail order={row.original} />
            )}
        />
      </div>

      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="left" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{t('inbound.createOrder')}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
                <InboundOrderForm 
                    onSubmit={(data) => createOrderMutation.mutate(data)}
                    onCancel={() => setIsCreateOpen(false)}
                    isSubmitting={createOrderMutation.isPending}
                />
            </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}