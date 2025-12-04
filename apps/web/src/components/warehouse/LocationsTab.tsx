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
import { Input } from '@/components/ui/input'; // הוספנו Input
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
  getSortedRowModel, // <--- הוספנו מיון
  getFilteredRowModel, // <--- הוספנו סינון
  ColumnDef,
  flexRender,
  SortingState, // <--- טייפ למיון
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
import { Plus, Edit, Trash2, Loader2, XCircle, Wand2, ArrowUpDown, Search } from 'lucide-react'; // אייקונים חדשים
import { toast } from 'sonner';
import { useTableSettings } from '@/hooks/use-table-settings';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { DataTableViewOptions } from '@/components/ui/data-table-view-options';

interface LocationsTabProps {
  warehouseId: number;
}

export function LocationsTab({ warehouseId }: LocationsTabProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  
  // States for Table Features
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(""); // חיפוש גלובלי
  
  // Server-side filters (עדיין רלוונטי לשליפה מהשרת)
  const [filterZoneId, setFilterZoneId] = useState<number | undefined>();
  const [filterUsageId, setFilterUsageId] = useState<number | undefined>();
  
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { 
    pagination, 
    onPaginationChange, 
    columnVisibility, 
    onColumnVisibilityChange,
    isLoading: isLoadingSettings 
  } = useTableSettings('locations_table');

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
        limit: 10000, 
      }),
  });

  const createLocationMutation = useMutation({
    mutationFn: locationService.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsSheetOpen(false);
      toast.success(t('locations.createSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('locations.createError'));
    },
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
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('locations.updateError'));
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id: number) => locationService.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setDeletingLocation(null);
      toast.success(t('locations.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('locations.deleteError'));
    },
  });

  const getZoneName = (zoneId: number) => {
    return zones?.find((z) => z.id === zoneId)?.name || '';
  };

  // --- הגדרת העמודות (כולל מיון) ---
  const columns: ColumnDef<Location>[] = [
    {
      accessorKey: 'name',
      id: 'name',
      // Header עם כפתור מיון
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            {t('locations.name')}
            <ArrowUpDown className="mr-2 h-3 w-3" />
          </Button>
        )
      },
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
      id: 'aisle', // הוספנו עמודת מעבר לחיפוש/סינון
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent">
          {t('locations.aisle')}
          <ArrowUpDown className="mr-2 h-3 w-3" />
        </Button>
      ),
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
      header: () => <div className="text-left w-full pl-2">{t('common.actions')}</div>, // יישור כותרת לשמאל
      cell: ({ row }) => (
        <div className="flex justify-end gap-1"> {/* יישור כפתורים לשמאל (סוף השורה ב-RTL זה שמאל) */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setEditingLocation(row.original);
              setIsSheetOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeletingLocation(row.original)}
          >
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
    getSortedRowModel: getSortedRowModel(), // הפעלת מיון
    getFilteredRowModel: getFilteredRowModel(), // הפעלת סינון
    onPaginationChange,
    onColumnVisibilityChange,
    onSortingChange: setSorting, // ניהול סטייט מיון
    onGlobalFilterChange: setGlobalFilter, // ניהול סטייט חיפוש
    state: {
      pagination,
      columnVisibility,
      sorting,
      globalFilter,
    },
  });

  const handleCreateLocation = (data: LocationCreate) => {
    createLocationMutation.mutate(data);
  };

  const handleUpdateLocation = (data: LocationUpdate) => {
    if (editingLocation) {
      updateLocationMutation.mutate({ id: editingLocation.id, data });
    }
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingLocation(null);
  };

  if (isLoadingData || isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <XCircle className="h-8 w-8 mr-2" />
        <span>{t('common.error')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3"> {/* צמצום רווחים כללי */}
      
      {/* סרגל כלים עליון - קומפקטי */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-2 rounded-lg border">
        
        {/* צד ימין - חיפוש ופילטרים */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* שורת חיפוש */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש חופשי (שם, מעבר, אזור...)"
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pr-8 h-9 text-sm"
            />
          </div>

          {/* פילטר אזור */}
          <Select
            value={filterZoneId?.toString() || 'all'}
            onValueChange={(value) => setFilterZoneId(value === 'all' ? undefined : parseInt(value))}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder={t('locations.filterByZone')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {zones?.map((zone) => (
                <SelectItem key={zone.id} value={zone.id.toString()}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* פילטר שימוש */}
          <Select
            value={filterUsageId?.toString() || 'all'}
            onValueChange={(value) => setFilterUsageId(value === 'all' ? undefined : parseInt(value))}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder={t('locations.filterByUsage')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {usages?.map((usage) => (
                <SelectItem key={usage.id} value={usage.id.toString()}>
                  {usage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* צד שמאל - פעולות */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <DataTableViewOptions table={table} />
          
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

      {/* טבלה */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="h-10">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
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

      {/* פגינציה */}
      <DataTablePagination table={table} />

      {/* טפסים (Sheets) ודיאלוגים - נשארים אותו דבר */}
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingLocation ? t('locations.editLocation') : t('locations.addLocation')}
            </SheetTitle>
            <SheetDescription>
              {editingLocation ? t('locations.editDescription') : t('locations.addDescription')}
            </SheetDescription>
          </SheetHeader>
          <LocationForm
            warehouseId={warehouseId}
            zones={zones || []}
            location={editingLocation || undefined}
            onSubmit={editingLocation ? handleUpdateLocation : handleCreateLocation}
            onCancel={handleCloseSheet}
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
            onSuccess={() => {
              setIsGeneratorOpen(false);
              queryClient.invalidateQueries({ queryKey: ['locations'] });
            }}
            onCancel={() => setIsGeneratorOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingLocation} onOpenChange={() => setDeletingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('locations.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('locations.deleteConfirmDescription', { name: deletingLocation?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLocation && deleteLocationMutation.mutate(deletingLocation.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
