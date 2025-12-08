import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
} from '@tanstack/react-table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { OutboundOrderRowDetail } from '@/components/outbound/OutboundOrderRowDetail';
import { Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';
import type { OutboundOrder } from '@/services/outboundService';
import {
  getOrders,
  createOrder,
  calculateOrderProgress,
  getStatusColor,
  getPriorityInfo,
} from '@/services/outboundService';
import { format } from 'date-fns';

export default function OutboundOrders() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } =
    useTableSettings({ tableName: 'outbound_orders_table' });

  // Fetch outbound orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['outbound-orders'],
    queryFn: () => getOrders(),
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
      setIsSheetOpen(false);
      toast.success('Order created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to create order');
    },
  });

  const handleAddNew = () => {
    setIsSheetOpen(true);
  };

  const columns = useMemo<ColumnDef<OutboundOrder>[]>(
    () => [
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
        size: 50,
      },
      {
        accessorKey: 'order_number',
        id: 'order_number',
        header: 'Order Number',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.order_number}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.order_type}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'customer',
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) =>
          row.original.customer ? (
            <div>
              <div className="font-medium">{row.original.customer.name}</div>
              <div className="text-xs text-muted-foreground">
                {row.original.customer.code}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: 'status',
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const color = getStatusColor(row.original.status);
          return (
            <Badge
              className={`bg-${color}-100 text-${color}-800 border-${color}-200`}
            >
              {row.original.status}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'priority',
        id: 'priority',
        header: 'Priority',
        cell: ({ row }) => {
          const { label, color } = getPriorityInfo(row.original.priority);
          return (
            <Badge
              variant="outline"
              className={`border-${color}-200 text-${color}-700`}
            >
              {label}
            </Badge>
          );
        },
      },
      {
        id: 'progress',
        header: 'Progress',
        cell: ({ row }) => {
          const progress = calculateOrderProgress(row.original);
          return (
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-24 h-2" />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {progress}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'requested_delivery_date',
        id: 'requested_delivery_date',
        header: 'Delivery Date',
        cell: ({ row }) =>
          row.original.requested_delivery_date ? (
            <span className="text-sm">
              {format(new Date(row.original.requested_delivery_date), 'MMM dd, yyyy')}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: 'metrics',
        header: 'Metrics',
        cell: ({ row }) => {
          const metrics = row.original.metrics;
          return (
            <div className="text-xs text-muted-foreground">
              {metrics?.total_lines || 0} lines / {metrics?.total_units || 0} units
            </div>
          );
        },
      },
    ],
    []
  );

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Outbound Orders</h1>
        <p className="text-muted-foreground mt-2">
          Manage outbound orders, allocations, and picking operations
        </p>
      </div>

      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage="No outbound orders found"
        actions={
          <Button onClick={handleAddNew}>
            <Plus className="ml-2 h-4 w-4" />
            Create Order
          </Button>
        }
        renderSubComponent={({ row }) => (
          <OutboundOrderRowDetail order={row.original} colSpan={columns.length} />
        )}
      />

      {/* Create Order Sheet */}
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
        }}
      >
        <SheetContent side="left" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Outbound Order</SheetTitle>
            <SheetDescription>
              Create a new outbound order with customer details and line items
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              Order creation form will be implemented here with:
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Customer selection</li>
                <li>Order type and priority</li>
                <li>Delivery date</li>
                <li>Line items with product, UOM, and quantity</li>
                <li>Shipping details (JSONB)</li>
              </ul>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
