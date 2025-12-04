import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  locationService,
  Location,
  LocationCreate,
  LocationUpdate,
} from '@/services/locations';
import { zoneService } from '@/services/zones';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LocationForm } from './LocationForm';
import { LocationGenerator } from './LocationGenerator';
import { Plus, Edit, Trash2, Loader2, XCircle, Wand2, ArrowUpDown, Search, Settings2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTableSettings } from '@/hooks/use-table-settings';

interface LocationsTabProps {
  warehouseId: number;
}

export function LocationsTab({ warehouseId }: LocationsTabProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  
  // Table States
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  
  // Server-side filters
  const [filterZoneId, setFilterZoneId] = useState<number | undefined>();
  const [filterUsageId, setFilterUsageId] = useState<number | undefined>();
  
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Persistent Settings Hook
  const { 
    pagination, 
    onPaginationChange, 
    columnVisibility, 
    onColumnVisibilityChange,
    isLoading: isLoadingSettings 
  } = useTableSettings('locations_table');

  // Data Fetching
  const { data: zones } = useQuery({
    queryKey: ['zones', warehouseId],
    queryFn: () => zoneService.getZones(warehouseId),
  });

  const { data: usages } = useQuery({
    queryKey: ['locationUsages'],
    queryFn: locationService.getLocationUsages,
  });

  const { data: locations, isLoading: isLoadingData, isError } = useQuery({
    queryKey: ['locations', warehouseId, filterZoneId, filterUsageId],
    queryFn: () =>
      locationService.getLocations({
        warehouse_id: warehouseId,
        zone_id: filterZoneId,
        usage_id: filterUsageId,
        limit: 10000, // Load all for client-side features
      }),
  });

  // Mutations
  const createLocationMutation = useMutation({
    mutationFn: locationService.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsSheetOpen(false);
      toast.success(t('locations.createSuccess'));
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || t('locations.createError')),
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LocationUpdate }) =>
      locationService.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsSheetOpen(false);
      setEditingLocation(null);
      toast.success(t('locations.updateSuccess'));
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || t('locations.updateError')),
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id: number) => locationService.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setDeletingLocation(null);
      toast.success(t('locations.deleteSuccess'));
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || t('locations.deleteError')),
  });

  const getZoneName = (zoneId: number) => zones?.find((z) => z.id === zoneId)?.name || '';

  // Column Definitions
  const columns: ColumnDef<Location>[] = [
    {
      accessorKey: 'name',
      id: 'name',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent font-bold">
          {t('locations.name')}
          <ArrowUpDown className="mr-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-bold">{row.getValue("name")}</div>,
    },
    {
      accessorKey: 'zone_id',
      id: 'zone_id',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent">
          {t('locations.zone')}
          <ArrowUpDown className="mr-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => getZoneName(row.original.zone_id),
    },
    {
      accessorKey: 'aisle',
      id: 'aisle',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent">
          {t('locations.aisle')}
          <ArrowUpDown className="mr-2 h-3 w-3" />
        </Button>
      ),
    },
    {
      accessorKey: 'bay',
      id: 'bay',
      header: t('locations.bay'),
    },
    {
      accessorKey: 'level',
      id: 'level',
      header: t('locations.level'),
    },
    {
      accessorKey: 'slot',
      id: 'slot',
      header: t('locations.slot'),
    },
    {
      accessorKey: 'usage_id',
      id: 'usage_id',
      header: t('locations.usage'),
      cell: ({ row }) => {
        const usageName = usages?.find(u => u.id === row.original.usage_id)?.name;
        const defName = row.original.usage_definition?.name;
        return <Badge variant="secondary" className="font-normal">{defName || usageName || row.original.usage_id}</Badge>;
      },
    },
    {
      accessorKey: 'type_id',
      id: 'type_id',
      header: t('locations.type'),
      cell: ({ row }) => row.original.type_definition?.name || row.original.type_id,
    },
    {
      accessorKey: 'pick_sequence',
      id: 'pick_sequence',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent">
          {t('locations.pickSequence')}
          <ArrowUpDown className="mr-2 h-3 w-3" />
        </Button>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-left w-full pl-2">{t('common.actions')}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingLocation(row.original); setIsSheetOpen(true); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeletingLocation(row.original)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: locations || [],
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

  if (isLoadingData || isLoadingSettings) return <div className="flex justify-center h-64 items-center"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-2">{t('common.loading')}</span></div>;
  if (isError) return <div className="flex justify-center h-64 items-center text-red-600"><XCircle className="h-8 w-8 mr-2" /><span>{t('common.error')}</span></div>;

  return (
    <div className="space-y-3">
      {/* --- Top Bar: Compact Controls --- */}
      <div className="bg-background border rounded-lg p-2 shadow-sm flex flex-col sm:flex-row justify-between gap-3 items-center">
        
        {/* Right Side: Filters & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש מהיר..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pr-8 h-9 w-[200px] text-sm"
            />
          </div>

          {/* Zone Filter */}
          <Select value={filterZoneId?.toString() || 'all'} onValueChange={(v) => setFilterZoneId(v === 'all' ? undefined : parseInt(v))}>
            <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder={t('locations.filterByZone')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {zones?.map((z) => <SelectItem key={z.id} value={z.id.toString()}>{z.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Usage Filter */}
          <Select value={filterUsageId?.toString() || 'all'} onValueChange={(v) => setFilterUsageId(v === 'all' ? undefined : parseInt(v))}>
            <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder={t('locations.filterByUsage')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {usages?.map((u) => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Left Side: Actions & View Settings */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Column Toggle (Fixed: Doesn't close on click) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9"><Settings2 className="mr-2 h-3.5 w-3.5" />תצוגה</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] max-h-[300px] overflow-y-auto">
              {table.getAllColumns().filter((c) => typeof c.accessorFn !== "undefined" && c.getCanHide()).map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize text-right"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(e) => e.preventDefault()} // Prevent closing
                  >
                    {t(`locations.${column.id}`) || column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => setIsGeneratorOpen(true)} className="h-9">
            <Wand2 className="mr-2 h-3.5 w-3.5" />
            {t('locations.generator')}
          </Button>
          
          <Button size="sm" onClick={() => setIsSheetOpen(true)} className="h-9">
            <Plus className="mr-2 h-3.5 w-3.5" />
            {t('locations.addLocation')}
          </Button>
        </div>
      </div>

      {/* --- Table --- */}
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 font-bold text-gray-700">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="h-9 hover:bg-blue-50/50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-1">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('locations.noLocations')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- Pagination (Fixed Arrows & Total) --- */}
      <div className="flex items-center justify-between px-2" dir="rtl">
        <div className="text-xs text-muted-foreground">
          סה"כ <strong>{table.getFilteredRowModel().rows.length}</strong> רשומות
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs">שורות:</span>
            <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(v) => table.setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[60px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100, 500, 1000].map(p => <SelectItem key={p} value={`${p}`}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs mx-2">עמוד {table.getState().pagination.pageIndex + 1} מתוך {table.getPageCount()}</span>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- Dialogs & Sheets --- */}
      <Sheet open={isSheetOpen} onOpenChange={(v) => { setIsSheetOpen(v); if(!v) setEditingLocation(null); }}>
        <SheetContent className="overflow-y-auto w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{editingLocation ? t('locations.editLocation') : t('locations.addLocation')}</SheetTitle>
            <SheetDescription>{editingLocation ? t('locations.editDescription') : t('locations.addDescription')}</SheetDescription>
          </SheetHeader>
          <LocationForm
            warehouseId={warehouseId}
            zones={zones || []}
            location={editingLocation || undefined}
            onSubmit={editingLocation ? (data) => updateLocationMutation.mutate({ id: editingLocation.id, data }) : (data) => createLocationMutation.mutate(data)}
            onCancel={() => setIsSheetOpen(false)}
            isSubmitting={createLocationMutation.isPending || updateLocationMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('locations.generator')}</SheetTitle>
            <SheetDescription>{t('locations.generatorDescription')}</SheetDescription>
          </SheetHeader>
          <LocationGenerator
            warehouseId={warehouseId}
            zones={zones || []}
            onSuccess={() => { setIsGeneratorOpen(false); queryClient.invalidateQueries({ queryKey: ['locations'] }); }}
            onCancel={() => setIsGeneratorOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingLocation} onOpenChange={() => setDeletingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('locations.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('locations.deleteConfirmDescription', { name: deletingLocation?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingLocation && deleteLocationMutation.mutate(deletingLocation.id)} className="bg-red-600 hover:bg-red-700">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
