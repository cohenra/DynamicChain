import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zoneService, Zone, ZoneCreate, ZoneUpdate } from '@/services/zones';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
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
import { ZoneForm } from './ZoneForm';
import { Plus, Edit, Trash2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ZonesTabProps {
  warehouseId: number;
}

export function ZonesTab({ warehouseId }: ZonesTabProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [deletingZone, setDeletingZone] = useState<Zone | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch zones
  const { data: zones, isLoading, isError } = useQuery({
    queryKey: ['zones', warehouseId],
    queryFn: () => zoneService.getZones(warehouseId),
  });

  // Create zone mutation
  const createZoneMutation = useMutation({
    mutationFn: zoneService.createZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones', warehouseId] });
      setIsSheetOpen(false);
      toast.success(t('zones.createSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('zones.createError'));
    },
  });

  // Update zone mutation
  const updateZoneMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ZoneUpdate }) =>
      zoneService.updateZone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones', warehouseId] });
      setIsSheetOpen(false);
      setEditingZone(null);
      toast.success(t('zones.updateSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('zones.updateError'));
    },
  });

  // Delete zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: (id: number) => zoneService.deleteZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones', warehouseId] });
      setDeletingZone(null);
      toast.success(t('zones.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('zones.deleteError'));
    },
  });

  // Table columns
  const columns: ColumnDef<Zone>[] = [
    {
      accessorKey: 'code',
      header: t('zones.code'),
    },
    {
      accessorKey: 'name',
      header: t('zones.name'),
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
              setEditingZone(row.original);
              setIsSheetOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingZone(row.original)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: zones || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleCreateZone = (data: ZoneCreate) => {
    createZoneMutation.mutate(data);
  };

  const handleUpdateZone = (data: ZoneUpdate) => {
    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, data });
    }
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingZone(null);
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
      {/* Header with Add button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">{t('zones.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('zones.description')}</p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('zones.addZone')}
        </Button>
      </div>

      {/* Zones Table */}
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
                  {t('zones.noZones')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Zone Form Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingZone ? t('zones.editZone') : t('zones.addZone')}
            </SheetTitle>
            <SheetDescription>
              {editingZone ? t('zones.editDescription') : t('zones.addDescription')}
            </SheetDescription>
          </SheetHeader>
          <ZoneForm
            warehouseId={warehouseId}
            zone={editingZone || undefined}
            onSubmit={editingZone ? handleUpdateZone : handleCreateZone}
            onCancel={handleCloseSheet}
            isSubmitting={createZoneMutation.isPending || updateZoneMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingZone} onOpenChange={() => setDeletingZone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('zones.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('zones.deleteConfirmDescription', { name: deletingZone?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingZone && deleteZoneMutation.mutate(deletingZone.id)}
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
