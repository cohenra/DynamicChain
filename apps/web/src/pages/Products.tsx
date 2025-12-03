import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, ProductCreate, Product } from '@/services/products';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  ColumnDef,
  flexRender,
  ExpandedState,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { Plus, XCircle, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function Products() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch products
  const {
    data: products,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: productService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsSheetOpen(false);
      toast.success(t('products.createSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('products.createError'));
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductCreate }) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsSheetOpen(false);
      setEditingProduct(null);
      toast.success(t('products.updateSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('products.updateError'));
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeletingProduct(null);
      toast.success(t('products.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t('products.deleteError'));
    },
  });

  const handleCreateProduct = (data: ProductCreate) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsSheetOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
  };

  const confirmDelete = () => {
    if (deletingProduct) {
      deleteProductMutation.mutate(deletingProduct.id);
    }
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingProduct(null);
    }
  };

  // Define table columns
  const columns: ColumnDef<Product>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="h-8 w-8"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        );
      },
      size: 50,
    },
    {
      accessorKey: 'sku',
      header: () => <div className="text-right">{t('products.sku')}</div>,
      cell: ({ row }) => (
        <div className="font-medium text-right">{row.original.sku}</div>
      ),
    },
    {
      accessorKey: 'name',
      header: () => <div className="text-right">{t('products.name')}</div>,
      cell: ({ row }) => <div className="text-right">{row.original.name}</div>,
    },
    {
      accessorKey: 'depositor_name',
      header: () => <div className="text-right">{t('products.depositor', 'מאחסן')}</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.depositor_name || <span className="text-muted-foreground">-</span>}
        </div>
      ),
    },
    {
      accessorKey: 'base_uom_name',
      header: () => <div className="text-right">{t('products.baseUnit', 'יחידת בסיס')}</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.base_uom_name || <span className="text-muted-foreground">-</span>}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">{t('common.actions')}</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditProduct(row.original);
            }}
            title={t('common.edit')}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteProduct(row.original);
            }}
            title={t('common.delete')}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
      size: 120,
    },
  ];

  // Create table instance
  const table = useReactTable({
    data: products || [],
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('products.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('products.description')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalog" className="w-full">
        <TabsList>
          <TabsTrigger value="catalog">{t('products.tabs.catalog')}</TabsTrigger>
          <TabsTrigger value="uoms">{t('products.tabs.uoms')}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Product Catalog */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                {t('products.description')}
              </p>
            </div>
            <Button onClick={() => setIsSheetOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              {t('products.addProduct')}
            </Button>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg border">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">{t('products.loading')}</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
                  <p className="text-destructive font-medium">{t('products.loadingError')}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {error instanceof Error ? error.message : t('common.unexpectedError')}
                  </p>
                </div>
              </div>
            ) : products && products.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-muted-foreground">{t('products.noProducts')}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('products.addFirstProduct')}
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={header.id === 'actions' ? 'sticky left-0 bg-background' : ''}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <>
                      <TableRow
                        key={row.id}
                        onClick={() => row.toggleExpanded()}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cell.column.id === 'actions' ? 'sticky left-0 bg-background' : ''}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {row.getIsExpanded() && (
                        <TableRow key={`${row.id}-expanded`}>
                          <ProductRowDetail
                            product={row.original}
                            colSpan={row.getVisibleCells().length}
                          />
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: UOM Definitions */}
        <TabsContent value="uoms" className="space-y-4">
          <UomDefinitionsTable />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Product Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingProduct ? t('products.editProduct') : t('products.addNewProduct')}
            </SheetTitle>
            <SheetDescription>
              {editingProduct
                ? t('products.editProductDescription')
                : t('products.addProductDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ProductForm
              onSubmit={handleCreateProduct}
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
