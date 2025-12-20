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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { InventoryReceiveForm } from '@/components/inventory/InventoryReceiveForm';
import { TransactionsTable } from '@/components/inventory/TransactionsTable';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRtl = i18n.dir() === 'rtl';
  
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
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
      toast.success(t('inventory.receiveSuccess', 'מלאי נקלט בהצלחה'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('inventory.receiveError', 'שגיאה בקליטת מלאי'));
    }
  });

  const columns = useMemo<ColumnDef<Inventory>[]>(() => [
    {
      accessorKey: 'lpn',
      header: t('inventory.lpn'),
      size: 160,
      cell: ({ row }) => <span className="font-mono font-bold text-xs">{row.original.lpn}</span>
    },
    {
      accessorKey: 'product_name',
      header: t('products.name'),
      size: 220,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs truncate max-w-[200px]" title={row.original.product_name}>{row.original.product_name}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{row.original.product_sku}</span>
        </div>
      )
    },
    {
      accessorKey: 'location_name',
      header: t('warehouses.location'),
      size: 120,
      cell: ({ row }) => <Badge variant="outline" className="text-[10px] bg-white">{row.original.location_name}</Badge>
    },
    {
      accessorKey: 'quantity',
      header: t('inventory.quantity'),
      size: 100,
      cell: ({ row }) => <span className="font-bold text-sm">{row.original.quantity}</span>
    },
    {
      accessorKey: 'status',
      header: t('inventory.status'),
      size: 100,
      cell: ({ row }) => {
        const status = row.original.status;
        const statusLabel = t(`inventory.statuses.${status}`, status); 
        let variant: "default" | "secondary" | "destructive" | "outline" = "default";
        
        if (status === 'AVAILABLE') variant = "default";
        if (status === 'QUARANTINE') variant = "destructive";
        if (status === 'RESERVED') variant = "secondary";
        
        return <Badge variant={variant} className="text-[10px] h-5 px-1.5">{statusLabel}</Badge>;
      }
    },
    {
      accessorKey: 'batch_number',
      header: t('inventory.batch'),
      size: 120,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.batch_number || '-'}</span>
    },
    {
      id: 'filler',
      header: '',
      size: undefined,
      cell: () => null
    }
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('inventory.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('inventory.subtitle')}</p>
      </div>

      <Tabs defaultValue="inventory" className="w-full" dir={i18n.dir()}>
        <TabsList className="bg-slate-100 h-9 p-1 justify-start">
          <TabsTrigger value="inventory" className="text-xs px-4">{t('inventory.tabs.inventory')}</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs px-4">{t('inventory.tabs.transactions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-2 pt-4">
          <SmartTable
            table={table}
            columnsLength={columns.length}
            isLoading={isLoading}
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            noDataMessage={t('inventory.noInventory')}
            actions={
              <Button onClick={() => setIsReceiveSheetOpen(true)} size="sm" className="h-8 text-xs">
                <PackagePlus className={cn("h-3.5 w-3.5", isRtl ? "ml-2" : "mr-2")} />
                {t('inventory.receiveStock')}
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-2 pt-4">
          <TransactionsTable />
        </TabsContent>
      </Tabs>

      <Sheet open={isReceiveSheetOpen} onOpenChange={setIsReceiveSheetOpen}>
        <SheetContent side={isRtl ? 'left' : 'right'} className="w-full sm:max-w-md overflow-y-auto">
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