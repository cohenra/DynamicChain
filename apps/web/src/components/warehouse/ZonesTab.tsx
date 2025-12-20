import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zoneService, Zone, ZoneCreate, ZoneUpdate } from '@/services/zones';
import { Button } from '@/components/ui/button';
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
import { ZoneForm } from './ZoneForm';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';
import { cn } from '@/lib/utils'; // הוספתי למקרה הצורך

interface ZonesTabProps {
  warehouseId: number;
}

export function ZonesTab({ warehouseId }: ZonesTabProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [deletingZone, setDeletingZone] = useState<Zone | null>(null);
  
  // Table States
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  // Persistent Settings Hook
  const { 
    pagination, 
    onPaginationChange, 
    columnVisibility, 
    onColumnVisibilityChange,
    isLoading: isLoadingSettings 
  } = useTableSettings({ tableName: 'zones_table' });

  // Fetch zones (Server-Side Pagination)
  const { data: zonesData, isLoading: isLoadingData } = useQuery({
    queryKey: ['zones', warehouseId, pagination.pageIndex, pagination.pageSize],
    queryFn: () => zoneService.getZones({
        warehouse_id: warehouseId,
        skip: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize
    }),
    placeholderData: (previousData) => previousData, // מונע הבהוב בטעינה
  });

  const zones = zonesData?.items || [];
  const totalCount = zonesData?.total || 0;

  // Create zone mutation
  const createZoneMutation = useMutation({
    mutationFn: zoneService.createZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
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
      queryClient.invalidateQueries({ queryKey: ['zones'] });
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
      queryClient.invalidateQueries({ queryKey: ['zones'] });
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
    data: zones,
    columns,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      pagination,
      columnVisibility,
      sorting,
      globalFilter,
    },
    manualPagination: true, // קריטי!
    onPaginationChange,
    onColumnVisibilityChange,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
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

  return (
    <div>
      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoadingData || isLoadingSettings}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage={t('zones.noZones')}
        actions={
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
            {t('zones.addZone')}
          </Button>
        }
      />

      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent side={isRtl ? 'left' : 'right'}>
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