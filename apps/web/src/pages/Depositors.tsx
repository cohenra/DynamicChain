import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { depositorService, DepositorCreate, Depositor } from '@/services/depositors';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { SmartTable } from '@/components/ui/data-table/SmartTable'; // <--- הרכיב החדש שלנו
import { useTableSettings } from '@/hooks/use-table-settings';
import { toast } from 'sonner';
// ... import other form components ...

export default function Depositors() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingDepositor, setEditingDepositor] = useState<Depositor | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Hook להגדרות טבלה אישיות (שמירת עמודות ופגינציה)
  const { 
    pagination, 
    onPaginationChange, 
    columnVisibility, 
    onColumnVisibilityChange 
  } = useTableSettings({ tableName: 'depositors_table' });

  // Fetch Data
  const { data: depositors, isLoading } = useQuery({
    queryKey: ['depositors'],
    queryFn: depositorService.getDepositors,
  });

  // --- Mutations (Delete, Create, Update) --- 
  // (נשאר אותו דבר כמו בקוד המקורי שלך...)

  // Column Definitions
  const columns = useMemo<ColumnDef<Depositor>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('depositors.name'),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'code',
        header: t('depositors.code'),
      },
      {
        accessorKey: 'contact_info.name',
        header: t('depositors.contactPerson'),
        cell: ({ row }) => row.original.contact_info?.name || '-',
      },
      {
        accessorKey: 'contact_info.phone',
        header: t('depositors.phone'),
        cell: ({ row }) => row.original.contact_info?.phone || '-',
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setEditingDepositor(row.original); setIsSheetOpen(true); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t]
  );

  // Table Instance
  const table = useReactTable({
    data: depositors || [],
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: onPaginationChange,
    onColumnVisibilityChange: onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('depositors.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('depositors.description')}</p>
      </div>

      {/* --- השימוש ברכיב החדש והאחיד --- */}
      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage={t('depositors.noDepositors')}
        actions={
          <Button onClick={() => { setEditingDepositor(null); setIsSheetOpen(true); }}>
            <Plus className="ml-2 h-4 w-4" />
            {t('depositors.addDepositor')}
          </Button>
        }
      />

      {/* Sheets / Dialogs (נשאר אותו דבר) */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
         {/* ... Form Content ... */}
      </Sheet>
    </div>
  );
}
