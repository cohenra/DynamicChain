import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { depositorService, DepositorCreate, Depositor } from '@/services/depositors';
import { Button } from '@/components/ui/button';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Plus, XCircle, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';

type DepositorFormValues = {
  name: string;
  code: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
};

export default function Depositors() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingDepositor, setEditingDepositor] = useState<Depositor | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Create schema with translations
  const depositorSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('depositors.nameRequired')),
        code: z.string().min(1, t('depositors.codeRequired')),
        contact_name: z.string().optional(),
        contact_phone: z.string().optional(),
        contact_email: z.string().email(t('depositors.invalidEmail')).optional().or(z.literal('')),
      }),
    [t]
  );

  // Fetch depositors
  const {
    data: depositors,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['depositors'],
    queryFn: depositorService.getDepositors,
  });

  // Create depositor mutation
  const createDepositorMutation = useMutation({
    mutationFn: depositorService.createDepositor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositors'] });
      setIsSheetOpen(false);
      setEditingDepositor(null);
      form.reset();
    },
  });

  // Update depositor mutation
  const updateDepositorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DepositorCreate }) =>
      depositorService.updateDepositor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositors'] });
      setIsSheetOpen(false);
      setEditingDepositor(null);
      form.reset();
    },
  });

  // Delete depositor mutation
  const deleteDepositorMutation = useMutation({
    mutationFn: depositorService.deleteDepositor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositors'] });
    },
  });

  const form = useForm<DepositorFormValues>({
    resolver: zodResolver(depositorSchema),
    defaultValues: {
      name: '',
      code: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
    },
  });

  const handleAddNew = () => {
    setEditingDepositor(null);
    form.reset({
      name: '',
      code: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
    });
    setIsSheetOpen(true);
  };

  const handleEdit = (depositor: Depositor) => {
    setEditingDepositor(depositor);
    form.reset({
      name: depositor.name,
      code: depositor.code,
      contact_name: depositor.contact_name || '',
      contact_phone: depositor.contact_phone || '',
      contact_email: depositor.contact_email || '',
    });
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('common.delete') + '?')) {
      deleteDepositorMutation.mutate(id);
    }
  };

  const handleSubmit = (values: DepositorFormValues) => {
    const data: DepositorCreate = {
      name: values.name,
      code: values.code,
      contact_name: values.contact_name || null,
      contact_phone: values.contact_phone || null,
      contact_email: values.contact_email || null,
    };

    if (editingDepositor) {
      updateDepositorMutation.mutate({ id: editingDepositor.id, data });
    } else {
      createDepositorMutation.mutate(data);
    }
  };

  const isSubmitting = createDepositorMutation.isPending || updateDepositorMutation.isPending;
  const submitError = createDepositorMutation.error || updateDepositorMutation.error;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('depositors.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('depositors.description')}</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="ml-2 h-4 w-4" />
          {t('depositors.addDepositor')}
        </Button>
      </div>

      {/* Depositors Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('depositors.loading')}</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">{t('depositors.loadingError')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : t('common.unexpectedError')}
              </p>
            </div>
          </div>
        ) : depositors && depositors.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">{t('depositors.noDepositors')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('depositors.addFirstDepositor')}
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('depositors.name')}</TableHead>
                <TableHead>{t('depositors.code')}</TableHead>
                <TableHead>{t('depositors.contactPerson')}</TableHead>
                <TableHead>{t('depositors.phone')}</TableHead>
                <TableHead>{t('depositors.email')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depositors?.map((depositor) => (
                <TableRow key={depositor.id}>
                  <TableCell className="font-medium">{depositor.name}</TableCell>
                  <TableCell>{depositor.code}</TableCell>
                  <TableCell>
                    {depositor.contact_name || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {depositor.contact_phone || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {depositor.contact_email || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(depositor)}
                        title={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(depositor.id)}
                        title={t('common.delete')}
                        disabled={deleteDepositorMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Depositor Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingDepositor ? t('depositors.editDepositor') : t('depositors.addNewDepositor')}
            </SheetTitle>
            <SheetDescription>
              {editingDepositor
                ? t('depositors.editDepositorDescription')
                : t('depositors.addDepositorDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('depositors.name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('depositors.enterName')}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('depositors.code')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('depositors.enterCode')}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4">{t('depositors.contactInfoOptional')}</h3>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('depositors.contactName')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t('depositors.enterContactName')}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('depositors.phone')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t('depositors.enterPhone')}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('depositors.email')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder={t('depositors.enterEmail')}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('common.saving') : t('depositors.saveDepositor')}
                  </Button>
                </div>
              </form>
            </Form>

            {submitError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  {submitError instanceof Error
                    ? submitError.message
                    : editingDepositor
                    ? t('depositors.updateError')
                    : t('depositors.createError')}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
