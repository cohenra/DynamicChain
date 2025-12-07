import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inboundService, InboundOrder, InboundOrderCreateRequest } from '@/services/inboundService';
import { Button } from '@/components/ui/button';
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
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
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
    case 'DRAFT':
      return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PARTIALLY_RECEIVED':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'SHORT_CLOSED':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-slate-100 text-slate-800';
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

  const columns = useMemo<ColumnDef<InboundOrder>[]>(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
          className="h-8 w-8"
        >
          {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      ),
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: 'order_number',
      id: 'order_number',
      header: t('inbound.orderNumber'),
      cell: ({ row }) => <span className="font-bold text-primary">{row.original.order_number}</span>
    },
    {
        accessorKey: 'customer.name',
        id: 'customer',
        header: t('depositors.name'),
        cell: ({ row }) => row.original.customer?.name || '-'
    },
    {
      accessorKey: 'order_type',
      id: 'order_type',
      header: t('inbound.orderType'),
      cell: ({ row }) => {
        const type = row.original.order_type;
        const label = type === 'SUPPLIER_DELIVERY' ? t('inbound.orderTypes.PO') : 
                      type === 'CUSTOMER_RETURN' ? t('inbound.orderTypes.RETURN') : 
                      t('inbound.orderTypes.TRANSFER');
        return <span>{label}</span>;
      }
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: t('inbound.status'),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(status)}`}>
            {status.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      id: 'progress',
      header: t('inbound.progress', 'התקדמות'),
      cell: ({ row }) => {
          const progress = calculateProgress(row.original);
          return (
              <div className="w-[100px] flex items-center gap-2">
                  <Progress value={progress} className="h-2" />
                  <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
          );
      }
    },
    {
      accessorKey: 'supplier_name',
      id: 'supplier_name',
      header: t('inbound.supplier'),
      cell: ({ row }) => row.original.supplier_name || '-'
    },
    {
      accessorKey: 'expected_delivery_date',
      id: 'expected_delivery_date',
      header: t('inbound.expectedDate'),
      cell: ({ row }) => formatDate(row.original.expected_delivery_date)
    },
    {
      id: 'total_items',
      header: t('inbound.totalItems', 'סה״כ פריטים'),
      cell: ({ row }) => <span className="font-medium">{calculateTotalItems(row.original)}</span>
    },
    {
      id: 'lines_count',
      header: t('inbound.lines.title'),
      cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.lines?.length || 0}</span>
    },
    {
      id: 'shipments_count',
      header: t('inbound.shipments.title'),
      cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.shipments?.length || 0}</span>
    },
    {
        accessorKey: 'created_at',
        id: 'created_at',
        header: t('products.createdAt'),
        cell: ({ row }) => formatDate(row.original.created_at)
    },
    {
        accessorKey: 'updated_at',
        id: 'updated_at',
        header: t('products.updatedAt'),
        cell: ({ row }) => formatDate(row.original.updated_at)
    },
    {
        accessorKey: 'notes',
        id: 'notes',
        header: t('inbound.fields.notes', 'הערות'),
        cell: ({ row }) => <span className="max-w-[150px] truncate block" title={row.original.notes || ''}>{row.original.notes || '-'}</span>
    }
  ], [t]);

  const table = useReactTable({
    data: orders || [],
    columns,
    state: { expanded, sorting, globalFilter, pagination, columnVisibility },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <div className="flex flex-col space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('inbound.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('inbound.description')}</p>
      </div>

      <div>
        <SmartTable
            table={table}
            columnsLength={columns.length}
            isLoading={isLoading}
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            noDataMessage={t('inbound.noOrders')}
            actions={
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="ml-2 h-4 w-4" />
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