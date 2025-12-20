import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseService, WarehouseCreate, Warehouse } from '@/services/warehouses';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { ZonesTab } from '@/components/warehouse/ZonesTab';
import { LocationsTab } from '@/components/warehouse/LocationsTab';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';
import { toast } from 'sonner';

// --- Sub-component for Lazy Loading Tabs ---
// ... (הקוד הקיים, החלף רק את הפונקציה WarehouseDetailsTabs)

function WarehouseDetailsTabs({ warehouseId }: { warehouseId: number }) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("zones");
  // משתנה עזר כדי לדעת אם כבר טענו את המיקומים (כדי לא לטעון סתם בהתחלה אם המשתמש לא לחץ)
  const [locationsLoaded, setLocationsLoaded] = useState(false);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === 'locations') setLocationsLoaded(true);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-2 border-b">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full" dir={i18n.dir()}>
        <TabsList className="bg-white border w-full justify-start h-8 p-0">
          <TabsTrigger value="zones" className="px-4 h-full text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-slate-50">
            {t('zones.title')}
          </TabsTrigger>
          <TabsTrigger value="locations" className="px-4 h-full text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-slate-50">
            {t('locations.title')}
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-2 bg-white p-2 rounded border">
          {/* הטריק: שני הקומפוננטות קיימות ב-DOM, אבל רק אחת מוצגת.
             זה מונע Unmount/Mount מחדש שגורם לטעינת נתונים חוזרת.
          */}
          <div className={activeTab === 'zones' ? 'block' : 'hidden'}>
             <ZonesTab warehouseId={warehouseId} />
          </div>
          
          <div className={activeTab === 'locations' ? 'block' : 'hidden'}>
             {/* טוענים את המיקומים רק פעם אחת כשהמשתמש לוחץ, ואז שומרים אותם בזיכרון */}
             {(activeTab === 'locations' || locationsLoaded) && (
                <LocationsTab warehouseId={warehouseId} />
             )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

type WarehouseFormValues = {
  name: string;
  code: string;
  address: string;
};

export default function Warehouses() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } = 
    useTableSettings({ tableName: 'warehouses_table' });

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseService.getWarehouses,
  });

  const createWarehouseMutation = useMutation({
    mutationFn: warehouseService.createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setIsSheetOpen(false);
      form.reset();
      toast.success(t('common.save'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || t('common.error')),
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WarehouseCreate }) =>
      warehouseService.updateWarehouse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setIsSheetOpen(false);
      setEditingWarehouse(null);
      form.reset();
      toast.success(t('common.update'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || t('common.error')),
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: warehouseService.deleteWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success(t('common.delete'));
    },
  });

  const warehouseSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    address: z.string().min(1),
  });

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { name: '', code: '', address: '' },
  });

  const handleAddNew = () => {
    setEditingWarehouse(null);
    form.reset({ name: '', code: '', address: '' });
    setIsSheetOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    form.reset({ name: warehouse.name, code: warehouse.code, address: warehouse.address });
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('common.delete') + '?')) {
      deleteWarehouseMutation.mutate(id);
    }
  };

  const handleSubmit = (values: WarehouseFormValues) => {
    const data: WarehouseCreate = { name: values.name, code: values.code, address: values.address };
    if (editingWarehouse) {
      updateWarehouseMutation.mutate({ id: editingWarehouse.id, data });
    } else {
      createWarehouseMutation.mutate(data);
    }
  };

  const columns = useMemo<ColumnDef<Warehouse>[]>(() => [
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
    },
    { accessorKey: 'name', id: 'name', size: 200, header: t('warehouses.name'), cell: ({ row }) => <span className="font-medium text-xs">{row.original.name}</span> },
    { accessorKey: 'code', id: 'code', size: 100, header: t('warehouses.code'), cell: ({ row }) => <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{row.original.code}</span> },
    { accessorKey: 'address', id: 'address', size: 300, header: t('warehouses.address'), cell: ({ row }) => <span className="truncate max-w-[280px] block text-xs text-muted-foreground" title={row.original.address}>{row.original.address}</span> },
    {
      id: 'actions',
      size: 80,
      header: t('common.actions'),
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
    {
        id: 'filler',
        header: '',
        size: undefined,
        cell: () => null
    }
  ], [t]);

  const table = useReactTable({
    data: warehouses || [],
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

  const isSubmitting = createWarehouseMutation.isPending || updateWarehouseMutation.isPending;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('warehouses.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('warehouses.description')}</p>
      </div>

      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage={t('warehouses.noWarehouses')}
        actions={
          <Button onClick={handleAddNew} size="sm" className="h-8 text-xs">
            <Plus className="ml-2 h-3.5 w-3.5" />
            {t('warehouses.addWarehouse')}
          </Button>
        }
        renderSubComponent={({ row }) => (
          <WarehouseDetailsTabs warehouseId={row.original.id} />
        )}
      />

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingWarehouse ? t('warehouses.editWarehouse') : t('warehouses.addNewWarehouse')}</SheetTitle>
            <SheetDescription>{t('warehouses.addWarehouseDescription')}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>{t('warehouses.name')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>{t('warehouses.code')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>{t('warehouses.address')}</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('common.saving') : t('common.save')}</Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}