import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inboundService, InboundOrder } from '@/services/inboundService';
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
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';
import { InboundOrderRowDetail } from './InboundOrderRowDetail';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'PARTIALLY_RECEIVED':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function InboundOrders() {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { t } = useTranslation();

  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } =
    useTableSettings({ tableName: 'inbound_orders_table' });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['inbound-orders'],
    queryFn: () => inboundService.getOrders(),
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
      size: 50,
    },
    {
      accessorKey: 'order_number',
      id: 'order_number',
      header: 'Order #',
      cell: ({ row }) => <span className="font-medium">{row.original.order_number}</span>
    },
    {
      accessorKey: 'order_type',
      id: 'order_type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.order_type;
        return <span className="capitalize">{type.replace(/_/g, ' ').toLowerCase()}</span>;
      }
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(status)}`}>
            {status.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      accessorKey: 'supplier_name',
      id: 'supplier_name',
      header: 'Supplier',
      cell: ({ row }) => row.original.supplier_name || '-'
    },
    {
      accessorKey: 'expected_delivery_date',
      id: 'expected_delivery_date',
      header: 'Expected Delivery',
      cell: ({ row }) => formatDate(row.original.expected_delivery_date)
    },
    {
      id: 'lines_count',
      header: 'Lines',
      cell: ({ row }) => row.original.lines?.length || 0
    },
    {
      id: 'shipments_count',
      header: 'Shipments',
      cell: ({ row }) => row.original.shipments?.length || 0
    },
  ], []);

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
        <h1 className="text-3xl font-bold tracking-tight">Inbound Orders</h1>
        <p className="text-muted-foreground mt-2">Manage incoming shipments and deliveries</p>
      </div>

      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage="No inbound orders found"
        renderSubComponent={({ row }) => (
          <InboundOrderRowDetail order={row.original} />
        )}
      />
    </div>
  );
}
