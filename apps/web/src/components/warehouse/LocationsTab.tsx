import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  locationService,
  Location,
  LocationUpdate,
} from '@/services/locations';
import { zoneService } from '@/services/zones';
import { cn } from '@/lib/utils'; // <-- התיקון: הוספת הייבוא החסר
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
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
import { Plus, Edit, Trash2, Wand2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useTableSettings } from '@/hooks/use-table-settings';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { FilterOption } from '@/components/ui/data-table/DataTableToolbar';

interface LocationsTabProps {
  warehouseId: number;
}

export function LocationsTab({ warehouseId }: LocationsTabProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const queryClient = useQueryClient();

  // Dialog States
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

  // Persistent Settings
  const { 
    pagination, 
    onPaginationChange, 
    columnVisibility, 
    onColumnVisibilityChange,
    isLoading: isLoadingSettings 
  } = useTableSettings({ tableName: 'locations_table' });

  // Data Fetching
  const { data: zones } = useQuery({
    queryKey: ['zones', warehouseId],
    queryFn: () => zoneService.getZones(warehouseId),
  });

  const { data: usages } = useQuery({
    queryKey: ['locationUsages'],
    queryFn: locationService.getLocationUsages,
  });

  // --- Optimized Data Fetching (Server-Side Pagination) ---
  const { data: locationData, isLoading: isLoadingData } = useQuery({
    queryKey: ['locations', warehouseId, filterZoneId, filterUsageId, pagination.pageIndex, pagination.pageSize],
    queryFn: () =>
      locationService.getLocations({
        warehouse_id: warehouseId,
        zone_id: filterZoneId,
        usage_id: filterUsageId,
        skip: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
      }),
      placeholderData: (previousData) => previousData,
  });

  // Extract items and total safely
  const locations = locationData?.items || [];
  const totalCount = locationData?.total || 0;

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
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent font-bold">
          {t('locations.name')}
<<<<<<< HEAD
          <ArrowUpDown className="mx-2 h-3 w-3" />
=======
          <ArrowUpDown className="ms-2 h-3 w-3" />
>>>>>>> claude/add-i18n-accessibility-5sa1q
        </Button>
      ),
      cell: ({ row }) => <div className="font-bold">{row.getValue("name")}</div>,
    },
    {
      accessorKey: 'zone_id',
<<<<<<< HEAD
      header: t('locations.zone'),
=======
      id: 'zone_id',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent">
          {t('locations.zone')}
          <ArrowUpDown className="ms-2 h-3 w-3" />
        </Button>
      ),
>>>>>>> claude/add-i18n-accessibility-5sa1q
      cell: ({ row }) => getZoneName(row.original.zone_id),
    },
    {
      accessorKey: 'aisle',
<<<<<<< HEAD
      header: t('locations.aisle'),
=======
      id: 'aisle',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent">
          {t('locations.aisle')}
          <ArrowUpDown className="ms-2 h-3 w-3" />
        </Button>
      ),
>>>>>>> claude/add-i18n-accessibility-5sa1q
    },
    {
      accessorKey: 'bay',
      header: t('locations.bay'),
    },
    {
      accessorKey: 'level',
      header: t('locations.level'),
    },
    {
      accessorKey: 'slot',
      header: t('locations.slot'),
    },
    {
      accessorKey: 'usage_id',
      header: t('locations.usage'),
      cell: ({ row }) => {
        const usageName = usages?.find(u => u.id === row.original.usage_id)?.name;
        const defName = row.original.usage_definition?.name;
        return <Badge variant="secondary" className="font-normal">{defName || usageName || row.original.usage_id}</Badge>;
      },
    },
    {
      accessorKey: 'type_id',
      header: t('locations.type'),
      cell: ({ row }) => row.original.type_definition?.name || row.original.type_id,
    },
    {
      accessorKey: 'pick_sequence',
<<<<<<< HEAD
      header: t('locations.pickSequence'),
    },
    {
      id: 'actions',
      header: t('common.actions'),
=======
      id: 'pick_sequence',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent">
          {t('locations.pickSequence')}
          <ArrowUpDown className="ms-2 h-3 w-3" />
        </Button>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-end w-full pe-2">{t('common.actions')}</div>,
>>>>>>> claude/add-i18n-accessibility-5sa1q
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
    data: locations,
    columns,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      pagination,
      columnVisibility,
      sorting,
      globalFilter,
    },
    manualPagination: true,
    onPaginationChange,
    onColumnVisibilityChange,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
  });

  const filters: FilterOption[] = [
    {
      key: 'zone',
      label: t('locations.filterByZone'),
      value: filterZoneId?.toString(),
      options: zones?.map(z => ({ label: z.name, value: z.id })) || [],
      onChange: (val) => setFilterZoneId(val ? parseInt(val) : undefined)
    },
    {
      key: 'usage',
      label: t('locations.filterByUsage'),
      value: filterUsageId?.toString(),
      options: usages?.map(u => ({ label: u.name, value: u.id })) || [],
      onChange: (val) => setFilterUsageId(val ? parseInt(val) : undefined)
    }
  ];

  const actions = (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsGeneratorOpen(true)} className="h-9">
<<<<<<< HEAD
        <Wand2 className={cn("h-3.5 w-3.5", isRtl ? "ml-2" : "mr-2")} />
        {t('locations.generator')}
      </Button>
      <Button size="sm" onClick={() => setIsSheetOpen(true)} className="h-9">
        <Plus className={cn("h-3.5 w-3.5", isRtl ? "ml-2" : "mr-2")} />
=======
        <Wand2 className="me-2 h-3.5 w-3.5" />
        {t('locations.generator')}
      </Button>
      <Button size="sm" onClick={() => setIsSheetOpen(true)} className="h-9">
        <Plus className="me-2 h-3.5 w-3.5" />
>>>>>>> claude/add-i18n-accessibility-5sa1q
        {t('locations.addLocation')}
      </Button>
    </>
  );

  return (
    <div>
      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoadingData || isLoadingSettings}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        filters={filters}
        actions={actions}
        noDataMessage={t('locations.noLocations')}
      />

      <Sheet open={isSheetOpen} onOpenChange={(v) => { setIsSheetOpen(v); if(!v) setEditingLocation(null); }}>
        <SheetContent side={isRtl ? 'left' : 'right'} className="overflow-y-auto w-[400px] sm:w-[540px]">
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
        <SheetContent side={isRtl ? 'left' : 'right'} className="sm:max-w-[600px] overflow-y-auto">
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