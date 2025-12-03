import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  locationService,
  Location,
  LocationCreate,
  LocationUpdate,
  LocationUsage,
} from '@/services/locations';
import { zoneService } from '@/services/zones';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ColumnDef,
  flexRender,
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
import { Plus, Edit, Trash2, Loader2, XCircle, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface LocationsTabProps {
  warehouseId: number;
}

export function LocationsTab({ warehouseId }: LocationsTabProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [filterZoneId, setFilterZoneId] = useState<number | undefined>();
  const [filterUsage, setFilterUsage] = useState<LocationUsage | undefined>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch zones for filter
  const { data: zones } = useQuery({
    queryKey: ['zones', warehouseId],
    queryFn: () => zoneService.getZones(warehouseId),
  });

  // Fetch locations
  const { data: locations, isLoading, isError } = useQuery({
    queryKey: ['locations', warehouseId, filterZoneId, filterUsage],
    queryFn: () =>
      locationService.getLocations({
        warehouse_id: warehouseId,
        zone_id: filterZoneId,
        usage: filterUsage,
      }),
  });

  // Get zone name helper
  const getZoneName = (zoneId: number) => {
    return zones?.find((z) => z.id === zoneId)?.name || '';
  };

  // Create location mutation
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

  // Update location mutation
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

  // Delete location mutation
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

  // Usage badge variant
  const getUsageBadgeVariant = (usage: LocationUsage) => {
    switch (usage) {
      case LocationUsage.PICKING:
        return 'default';
      case LocationUsage.STORAGE:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Table columns
  const columns: ColumnDef<Location>[] = [
    {
      accessorKey: 'name',
      header: t('locations.name'),
    },
    {
      accessorKey: 'zone_id',
      header: t('locations.zone'),
      cell: ({ row }) => getZoneName(row.original.zone_id),
    },
    {
      accessorKey: 'usage',
      header: t('locations.usage'),
      cell: ({ row }) => (
        <Badge variant={getUsageBadgeVariant(row.original.usage)}>
          {t(`locations.usage${row.original.usage}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'type',
      header: t('locations.type'),
      cell: ({ row }) => t(`locations.type${row.original.type}`),
    },
    {
      accessorKey: 'pick_sequence',
      header: t('locations.pickSequence'),
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingLocation(row.original);
              setIsSheetOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingLocation(row.original)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: locations || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
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

  if (isLoading) {
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
    <div>
      {/* Header with buttons */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">{t('locations.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('locations.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsGeneratorOpen(true)}>
            <Wand2 className="mr-2 h-4 w-4" />
            {t('locations.generator')}
          </Button>
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('locations.addLocation')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <Select
          value={filterZoneId?.toString() || 'all'}
          onValueChange={(value) => setFilterZoneId(value === 'all' ? undefined : parseInt(value))}
        >
          <SelectTrigger className="w-[200px]">
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

        <Select
          value={filterUsage || 'all'}
          onValueChange={(value) => setFilterUsage(value === 'all' ? undefined : (value as LocationUsage))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('locations.filterByUsage')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value={LocationUsage.PICKING}>{t('locations.usagePICKING')}</SelectItem>
            <SelectItem value={LocationUsage.STORAGE}>{t('locations.usageSTORAGE')}</SelectItem>
            <SelectItem value={LocationUsage.INBOUND}>{t('locations.usageINBOUND')}</SelectItem>
            <SelectItem value={LocationUsage.OUTBOUND}>{t('locations.usageOUTBOUND')}</SelectItem>
            <SelectItem value={LocationUsage.HANDOFF}>{t('locations.usageHANDOFF')}</SelectItem>
            <SelectItem value={LocationUsage.QUARANTINE}>{t('locations.usageQUARANTINE')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Locations Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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

      {/* Location Form Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent>
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

      {/* Location Generator Sheet */}
      <Sheet open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <SheetContent className="sm:max-w-[600px]">
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

      {/* Delete Confirmation Dialog */}
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
