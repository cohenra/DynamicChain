import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryService, Inventory } from '@/services/inventory';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { PackagePlus, Search } from 'lucide-react';

export default function InventoryPage() {
  const { t } = useTranslation();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Hook לשמירת הגדרות טבלה
  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } = 
    useTableSettings({ tableName: 'inventory_table' });

  // שליפת נתונים
  const { data: inventoryItems, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.getInventory({ limit: 1000 }), // מביא 1000 רשומות ראשונות
  });

  // הגדרת עמודות
  const columns = useMemo<ColumnDef<Inventory>[]>(() => [
    {
      accessorKey: 'lpn',
      header: 'LPN (לוחית רישוי)',
      cell: ({ row }) => <span className="font-mono font-bold">{row.original.lpn}</span>
    },
    {
      accessorKey: 'product_name',
      header: t('products.name'),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.product_name}</span>
          <span className="text-xs text-muted-foreground">{row.original.product_sku}</span>
        </div>
      )
    },
    {
      accessorKey: 'location_name',
      header: t('warehouses.location'),
      cell: ({ row }) => <Badge variant="outline">{row.original.location_name}</Badge>
    },
    {
      accessorKey: 'quantity',
      header: 'כמות',
      cell: ({ row }) => <span className="font-bold text-lg">{row.original.quantity}</span>
    },
    {
      accessorKey: 'status',
      header: 'סטטוס',
      cell: ({ row }) => {
        const status = row.original.status;
        let variant: "default" | "secondary" | "destructive" | "outline" = "default";
        
        if (status === 'AVAILABLE') variant = "default"; // ירוק/כחול (תלוי בערכה)
        if (status === 'QUARANTINE') variant = "destructive"; // אדום
        if (status === 'RESERVED') variant = "secondary"; // אפור
        
        return <Badge variant={variant}>{status}</Badge>;
      }
    },
    {
      accessorKey: 'batch_number',
      header: 'אצווה',
      cell: ({ row }) => row.original.batch_number || '-'
    },
  ], [t]);

  const table = useReactTable({
    data: inventoryItems || [],
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
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ניהול מלאי</h1>
        <p className="text-muted-foreground mt-2">תמונת מצב מלאי נוכחית (LPNs)</p>
      </div>

      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage="אין מלאי במערכת"
        actions={
          <Button>
            <PackagePlus className="ml-2 h-4 w-4" />
            קליטת מלאי
          </Button>
        }
      />
    </div>
  );
}
