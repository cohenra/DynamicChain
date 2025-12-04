import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, ProductCreate, Product } from '@/services/products';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  ExpandedState,
  SortingState,
} from '@tanstack/react-table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ProductForm } from '@/components/products/ProductForm';
import { UomDefinitionsTable } from '@/components/products/UomDefinitionsTable';
import { ProductRowDetail } from '@/components/products/ProductRowDetail';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';

export default function Products() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  
  // Table States
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Settings Hook (עבור שמירת הגדרות תצוגה)
  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } = 
    useTableSettings({ tableName: 'products_table' });

  // 1. Fetch
  const { data: products, isLoading, isError, error } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  // 2. Mutations
  const createProductMutation = useMutation({
    mutationFn: productService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsSheetOpen(false);
      toast.success(t('products.createSuccess'));
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || t('common.error')),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductCreate }) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsSheetOpen(false);
      setEditingProduct(null);
      toast.success(t('products.updateSuccess'));
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || t('common.error')),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeletingProduct(null);
      toast.success(t('products.deleteSuccess'));
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || t('common.error')),
  });

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsSheetOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsSheetOpen(true);
  };

  const confirmDelete = () => {
    if (deletingProduct) {
      deleteProductMutation.mutate(deletingProduct.id);
    }
  };

  // 3. Columns
  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
          className="h-8 w-8"
        >
          {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      ),
      size: 50,
    },
    { accessorKey: 'sku', header: t('products.sku') },
    { accessorKey: 'name', header: t('products.name') },
    { accessorKey: 'depositor_name', header: t('products.depositor') },
    { accessorKey: 'base_uom_name', header: t('products.baseUnit') },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); handleEditProduct(row.original); }}
            title={t('common.edit')}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:bg-destructive/10" 
            onClick={(e) => { e.stopPropagation(); setDeletingProduct(row.original); }}
            title={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [t]);

  const table = useReactTable({
    data: products || [],
    columns,
    state: { expanded, sorting, globalFilter, pagination, columnVisibility },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('products.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('products.description')}</p>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList>
          <TabsTrigger value="catalog">{t('products.tabs.catalog')}</TabsTrigger>
          <TabsTrigger value="uoms">{t('products.tabs.uoms')}</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4 pt-4">
          <SmartTable
            table={table}
            columnsLength={columns.length}
            isLoading={isLoading}
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            noDataMessage={t('products.noProducts')}
            // כאן עובר הכפתור בצורה תקינה
            actions={
              <Button onClick={handleAddNew}>
                <Plus className="ml-2 h-4 w-4" />
                {t('products.addProduct')}
              </Button>
            }
            // וכאן ההרחבה
            renderSubComponent={({ row }) => (
              <ProductRowDetail product={row.original} colSpan={columns.length} />
            )}
          />
        </TabsContent>

        <TabsContent value="uoms" className="pt-4">
          <UomDefinitionsTable />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Product Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={(open) => { setIsSheetOpen(open); if(!open) setEditingProduct(null); }}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingProduct ? t('products.editProduct') : t('products.addNewProduct')}</SheetTitle>
            <SheetDescription>{editingProduct ? t('products.editProductDescription') : t('products.addProductDescription')}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ProductForm
              onSubmit={(data) => editingProduct ? updateProductMutation.mutate({ id: editingProduct.id, data }) : createProductMutation.mutate(data)}
              isLoading={createProductMutation.isPending || updateProductMutation.isPending}
              product={editingProduct}
              mode={editingProduct ? 'edit' : 'create'}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('products.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('products.deleteConfirmDescription', {
                name: deletingProduct?.name,
                sku: deletingProduct?.sku,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProductMutation.isPending ? t('common.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
