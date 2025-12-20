import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';
import { inventoryService, InventoryTransaction } from '@/services/inventory';

export function TransactionsTable() {
  const { t, i18n } = useTranslation();
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } =
    useTableSettings({ tableName: 'inventory_transactions_table' });

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['inventory-transactions', pagination.pageIndex, pagination.pageSize],
    queryFn: () =>
      inventoryService.getTransactions({
        skip: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
      }),
  });

  const formatDate = (dateStr: string) => {
    const locale = i18n.language === 'he' ? 'he-IL' : i18n.language === 'ar' ? 'ar-SA' : i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    return new Date(dateStr).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeBadgeColor = (type: string): string => {
    switch (type) {
      case 'INBOUND_RECEIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MOVE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ADJUSTMENT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CORRECTION':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PICK':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'SHIP':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const columns = useMemo<ColumnDef<InventoryTransaction>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id}</span>,
      },
      {
        accessorKey: 'timestamp',
        header: t('inventory.timestamp', 'תאריך'),
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.timestamp)}</span>,
      },
      {
        accessorKey: 'transaction_type',
        header: t('inventory.type', 'סוג'),
        cell: ({ row }) => {
          const typeKey = row.original.transaction_type;
          const translatedType = t(`inventory.transactionTypes.${typeKey}`, typeKey);
          
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold border ${getTransactionTypeBadgeColor(
                typeKey
              )}`}
            >
              {translatedType}
            </span>
          );
        },
      },
      {
        accessorKey: 'inventory_lpn',
        header: t('inventory.lpn', 'LPN'),
        cell: ({ row }) => <span className="font-mono font-bold text-sm">{row.original.inventory_lpn}</span>,
      },
      {
        accessorKey: 'product_name',
        header: t('products.name', 'מוצר'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-sm">{row.original.product_name}</span>
            <span className="text-xs text-muted-foreground">{row.original.product_sku}</span>
          </div>
        ),
      },
      {
        accessorKey: 'quantity',
        header: t('inventory.quantity', 'כמות'),
        cell: ({ row }) => <span className="font-bold">{row.original.quantity}</span>,
      },
      {
        accessorKey: 'from_location_name',
        header: t('inventory.from', 'מ-'),
        cell: ({ row }) => <span className="text-sm">{row.original.from_location_name || '-'}</span>,
      },
      {
        accessorKey: 'to_location_name',
        header: t('inventory.to', 'ל-'),
        cell: ({ row }) => <span className="text-sm">{row.original.to_location_name || '-'}</span>,
      },
      {
        accessorKey: 'performed_by_name',
        header: t('inventory.performedBy', 'בוצע על ידי'),
        cell: ({ row }) => <span className="text-sm">{row.original.performed_by_name}</span>,
      },
      {
        accessorKey: 'reference_doc',
        header: t('inventory.reference', 'אסמכתא'),
        cell: ({ row }) => <span className="text-sm font-mono">{row.original.reference_doc || '-'}</span>,
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: transactionsData?.items || [],
    columns,
    state: { sorting, globalFilter, pagination, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount: transactionsData ? Math.ceil(transactionsData.total / pagination.pageSize) : 0,
  });

  return (
    <SmartTable
      table={table}
      columnsLength={columns.length}
      isLoading={isLoading}
      searchValue={globalFilter}
      onSearchChange={setGlobalFilter}
      noDataMessage={t('inventory.noTransactions', 'אין טרנזקציות להצגה')}
    />
  );
}