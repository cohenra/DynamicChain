import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, Inventory, InventoryReceiveRequest } from '@/services/inventory';
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
import { PackagePlus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
// ייבוא הטופס החדש שיצרנו
import { InventoryReceiveForm } from '@/components/inventory/InventoryReceiveForm';

export default function InventoryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // --- זה ה-State שהיה חסר לך ---
  const [isReceiveSheetOpen, setIsReceiveSheetOpen] = useState(false);

  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } = 
    useTableSettings({ tableName: 'inventory_table' });

  const { data: inventoryItems, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.getInventory({ limit: 1000 }),
  });

  const receiveStockMutation = useMutation({
    mutationFn: (data: InventoryReceiveRequest) => inventoryService.receiveStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsReceiveSheetOpen(false);
      toast.success("מלאי נקלט בהצלחה");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "שגיאה בקליטת מלאי");
    }
  });

  const columns = useMemo<ColumnDef<Inventory>[]>(() => [
    {
      accessorKey: 'lpn',
      header: t('inventory.lpn'),
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
      header: t('inventory.quantity'),
      cell: ({ row }) => <span className="font-bold text-lg">{row.original.quantity}</span>
    },
    {
      accessorKey: 'status',
      header: t('inventory.status'),
      cell: ({ row }) => {
        const status = row.original.status;
        const statusLabel = t(`inventory.statuses.${status}`, status); 

        let variant: "default" | "secondary" | "destructive" | "outline" = "default";
        
        if (status === 'AVAILABLE') variant = "default";
        if (status === 'QUARANTINE') variant = "destructive";
        if (status === 'RESERVED') variant = "secondary";
        
        return <Badge variant={variant}>{statusLabel}</Badge>;
      }
    },
    {
      accessorKey: 'batch_number',
      header: t('inventory.batch'),
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
        <h1 className="text-3xl font-bold tracking-tight">{t('inventory.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('inventory.subtitle')}</p>
      </div>

      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage={t('inventory.noInventory')}
        actions={
          // --- התיקון: הוספת ה-onClick ---
          <Button onClick={() => setIsReceiveSheetOpen(true)}>
            <PackagePlus className="ml-2 h-4 w-4" />
            {t('inventory.receiveStock')}
          </Button>
        }
      />

      {/* --- החלק שהיה חסר: ה-Sheet עצמו --- */}
      <Sheet open={isReceiveSheetOpen} onOpenChange={setIsReceiveSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{t('inventory.receiveStock')}</SheetTitle>
            </SheetHeader>
            <InventoryReceiveForm 
                onSubmit={(data) => receiveStockMutation.mutate(data)}
                onCancel={() => setIsReceiveSheetOpen(false)}
                isSubmitting={receiveStockMutation.isPending}
            />
        </SheetContent>
      </Sheet>
    </div>
  );
}