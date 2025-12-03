import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uomDefinitionService } from '@/services/uom-definitions';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, XCircle, Trash2, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const uomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
});

type UomFormData = z.infer<typeof uomSchema>;

export function UomDefinitionsTable() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingUom, setEditingUom] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UomFormData>({
    resolver: zodResolver(uomSchema),
  });

  // Fetch UOM definitions
  const {
    data: uomDefinitions,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['uomDefinitions'],
    queryFn: uomDefinitionService.getUomDefinitions,
  });

  // Create UOM mutation
  const createMutation = useMutation({
    mutationFn: uomDefinitionService.createUomDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uomDefinitions'] });
      setIsSheetOpen(false);
      reset();
      toast({
        title: t('uomDefinitions.createSuccess'),
        description: t('uomDefinitions.createSuccessDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('uomDefinitions.createError'),
        description: error.response?.data?.detail || t('common.unexpectedError'),
        variant: 'destructive',
      });
    },
  });

  // Update UOM mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UomFormData }) =>
      uomDefinitionService.updateUomDefinition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uomDefinitions'] });
      setIsSheetOpen(false);
      setEditingUom(null);
      reset();
      toast({
        title: t('uomDefinitions.updateSuccess'),
        description: t('uomDefinitions.updateSuccessDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('uomDefinitions.updateError'),
        description: error.response?.data?.detail || t('common.unexpectedError'),
        variant: 'destructive',
      });
    },
  });

  // Delete UOM mutation
  const deleteMutation = useMutation({
    mutationFn: uomDefinitionService.deleteUomDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uomDefinitions'] });
      setDeleteConfirmId(null);
      toast({
        title: t('uomDefinitions.deleteSuccess'),
        description: t('uomDefinitions.deleteSuccessDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('uomDefinitions.deleteError'),
        description: error.response?.data?.detail || t('common.unexpectedError'),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: UomFormData) => {
    if (editingUom) {
      updateMutation.mutate({ id: editingUom, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (id: number) => {
    const uom = uomDefinitions?.find((u) => u.id === id);
    if (uom) {
      reset({
        name: uom.name,
        code: uom.code,
      });
      setEditingUom(id);
      setIsSheetOpen(true);
    }
  };

  const handleAdd = () => {
    reset({ name: '', code: '' });
    setEditingUom(null);
    setIsSheetOpen(true);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-muted-foreground">
            {t('uomDefinitions.description')}
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="ml-2 h-4 w-4" />
          {t('uomDefinitions.addUom')}
        </Button>
      </div>

      {/* UOM Definitions Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">{t('common.loadingError')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : t('common.unexpectedError')}
              </p>
            </div>
          </div>
        ) : uomDefinitions && uomDefinitions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">{t('uomDefinitions.noUoms')}</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('uomDefinitions.code')}</TableHead>
                <TableHead>{t('uomDefinitions.name')}</TableHead>
                <TableHead className="text-left">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uomDefinitions?.map((uom) => (
                <TableRow key={uom.id}>
                  <TableCell className="font-mono font-semibold">{uom.code}</TableCell>
                  <TableCell>{uom.name}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(uom.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(uom.id)}
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

      {/* Add/Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingUom ? t('uomDefinitions.editUom') : t('uomDefinitions.addUom')}
            </SheetTitle>
            <SheetDescription>
              {editingUom
                ? t('uomDefinitions.editDescription')
                : t('uomDefinitions.addDescription')}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('uomDefinitions.name')}</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('uomDefinitions.namePlaceholder')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">{t('uomDefinitions.code')}</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder={t('uomDefinitions.codePlaceholder')}
                className="font-mono"
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {editingUom ? t('common.update') : t('common.create')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('uomDefinitions.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('uomDefinitions.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
