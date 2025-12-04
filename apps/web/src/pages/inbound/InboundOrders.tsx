import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { inboundService, InboundOrder, InboundOrderCreate } from '@/services/inbound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { CreateOrderForm } from '@/components/inbound/CreateOrderForm';
import { Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';

export default function InboundOrders() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } =
    useTableSettings({ tableName: 'inbound_orders_table' });

  // Fetch orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['inbound-orders'],
    queryFn: inboundService.getOrders,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: inboundService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setIsSheetOpen(false);
      toast.success(t('inbound.createSuccess'));
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.detail || t('inbound.createError')),
  });

  const handleAddNew = () => {
    setIsSheetOpen(true);
  };

  const handleViewDetails = (order: InboundOrder) => {
    navigate(`/inbound/${order.id}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'secondary';
      case 'CONFIRMED':
        return 'default';
      case 'IN_PROGRESS':
        return 'default';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    return type === 'PO' ? 'default' : 'secondary';
  };

  const calculateProgress = (order: InboundOrder): number => {
    if (!order.lines || order.lines.length === 0) return 0;
    const totalExpected = order.lines.reduce((sum, line) => sum + line.expected_quantity, 0);
    const totalReceived = order.lines.reduce((sum, line) => sum + line.received_quantity, 0);
    return totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;
  };

  const columns = useMemo<ColumnDef<InboundOrder>[]>(
    () => [
      {
        accessorKey: 'order_number',
        id: 'order_number',
        header: t('inbound.orderNumber'),
      },
      {
        accessorKey: 'order_type',
        id: 'order_type',
        header: t('inbound.orderType'),
        cell: ({ row }) => (
          <Badge variant={getTypeBadgeVariant(row.original.order_type)}>
            {t(`inbound.orderTypes.${row.original.order_type}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'supplier_name',
        id: 'supplier_name',
        header: t('inbound.supplier'),
      },
      {
        accessorKey: 'status',
        id: 'status',
        header: t('common.status'),
        cell: ({ row }) => (
          <Badge variant={getStatusBadgeVariant(row.original.status)}>
            {t(`inbound.statuses.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'expected_date',
        id: 'expected_date',
        header: t('inbound.expectedDate'),
        cell: ({ row }) =>
          row.original.expected_date
            ? new Date(row.original.expected_date).toLocaleDateString()
            : '-',
      },
      {
        id: 'progress',
        header: t('inbound.progress'),
        cell: ({ row }) => {
          const progress = calculateProgress(row.original);
          return (
            <div className="flex items-center gap-2">
              <div className="w-20 bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(row.original);
              }}
              title={t('inbound.viewDetails')}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: orders || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange,
    onColumnVisibilityChange,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      pagination,
      columnVisibility,
      sorting,
      globalFilter,
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('inbound.title')}</h1>
        <p className="text-muted-foreground">{t('inbound.description')}</p>
      </div>

      {/* Table */}
      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        searchKey="order_number"
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage={t('inbound.noOrders')}
        actions={
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            {t('inbound.addOrder')}
          </Button>
        }
      />

      {/* Create Order Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('inbound.createOrder')}</SheetTitle>
            <SheetDescription>{t('inbound.createOrderDescription')}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CreateOrderForm
              onSubmit={createOrderMutation.mutate}
              isLoading={createOrderMutation.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
