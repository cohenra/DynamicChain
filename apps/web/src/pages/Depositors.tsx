import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { depositorService, DepositorCreate, Depositor } from '@/services/depositors';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { toast } from 'sonner';

const depositorSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
});
type DepositorFormValues = z.infer<typeof depositorSchema>;

export default function Depositors() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingDepositor, setEditingDepositor] = useState<Depositor | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } = 
    useTableSettings({ tableName: 'depositors_table' });

  const { data: depositors, isLoading } = useQuery({
    queryKey: ['depositors'],
    queryFn: depositorService.getDepositors,
  });

  const createDepositorMutation = useMutation({
    mutationFn: depositorService.createDepositor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositors'] });
      setIsSheetOpen(false);
      form.reset();
      toast.success(t('depositors.createSuccess'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || t('common.error')),
  });

  const updateDepositorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DepositorCreate }) =>
      depositorService.updateDepositor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositors'] });
      setIsSheetOpen(false);
      setEditingDepositor(null);
      form.reset();
      toast.success(t('depositors.updateSuccess'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || t('common.error')),
  });

  const deleteDepositorMutation = useMutation({
    mutationFn: depositorService.deleteDepositor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositors'] });
      toast.success(t('depositors.deleteSuccess'));
    },
  });

  const form = useForm<DepositorFormValues>({
    resolver: zodResolver(depositorSchema),
    defaultValues: { name: '', code: '', contact_name: '', contact_phone: '', contact_email: '' },
  });

  const handleAddNew = () => {
    setEditingDepositor(null);
    form.reset({ name: '', code: '', contact_name: '', contact_phone: '', contact_email: '' });
    setIsSheetOpen(true);
  };

  const handleEdit = (depositor: Depositor) => {
    setEditingDepositor(depositor);
    form.reset({
      name: depositor.name,
      code: depositor.code,
      contact_name: depositor.contact_info?.name || '',
      contact_phone: depositor.contact_info?.phone || '',
      contact_email: depositor.contact_info?.email || '',
    });
    setIsSheetOpen(true);
  };

  const handleSubmit = (values: DepositorFormValues) => {
    const data: DepositorCreate = {
      name: values.name,
      code: values.code,
      contact_info: {
        name: values.contact_name || '',
        phone: values.contact_phone || '',
        email: values.contact_email || '',
      },
    };
    if (editingDepositor) {
      updateDepositorMutation.mutate({ id: editingDepositor.id, data });
    } else {
      createDepositorMutation.mutate(data);
    }
  };

  const columns = useMemo<ColumnDef<Depositor>[]>(() => [
      { accessorKey: 'name', id: 'name', size: 200, header: t('depositors.name'), cell: ({row}) => <span className="font-bold text-xs">{row.original.name}</span> },
      { accessorKey: 'code', id: 'code', size: 100, header: t('depositors.code'), cell: ({row}) => <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{row.original.code}</span> },
      { accessorKey: 'contact_info.name', id: 'contact_info_name', size: 150, header: t('depositors.contactPerson'), cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.contact_info?.name || '-'}</span> },
      { accessorKey: 'contact_info.phone', id: 'contact_info_phone', size: 130, header: t('depositors.phone'), cell: ({ row }) => <span className="text-xs font-mono">{row.original.contact_info?.phone || '-'}</span> },
      {
        id: 'actions',
        size: 80,
        header: t('common.actions'),
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(row.original)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                if(confirm(t('common.delete') + '?')) deleteDepositorMutation.mutate(row.original.id);
            }}>
              <Trash2 className="h-3.5 w-3.5" />
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
    data: depositors || [],
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

  const isSubmitting = createDepositorMutation.isPending || updateDepositorMutation.isPending;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('depositors.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('depositors.description')}</p>
      </div>

      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage={t('depositors.noDepositors')}
        actions={
          <Button onClick={handleAddNew} size="sm" className="h-8 text-xs">
            <Plus className="ml-2 h-3.5 w-3.5" />
            {t('depositors.addDepositor')}
          </Button>
        }
      />

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingDepositor ? t('depositors.editDepositor') : t('depositors.addNewDepositor')}</SheetTitle>
            <SheetDescription>{t('depositors.addDepositorDescription')}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>{t('depositors.name')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>{t('depositors.code')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contact_name" render={({ field }) => (
                    <FormItem><FormLabel>{t('depositors.contactName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                    <FormItem><FormLabel>{t('depositors.phone')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contact_email" render={({ field }) => (
                    <FormItem><FormLabel>{t('depositors.email')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? t('common.saving') : t('common.save')}</Button>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}