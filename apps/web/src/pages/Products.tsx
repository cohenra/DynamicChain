import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, ProductCreate } from '@/services/products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { ProductForm } from '@/components/products/ProductForm';
import { UomDefinitionsTable } from '@/components/products/UomDefinitionsTable';
import { Plus, XCircle } from 'lucide-react';

export default function Products() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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
      // Invalidate and refetch products
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsSheetOpen(false);
    },
  });

  const handleCreateProduct = (data: ProductCreate) => {
    createProductMutation.mutate(data);
  };

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
                  <TableRow>
                    <TableHead className="text-start">{t('products.sku')}</TableHead>
                    <TableHead className="text-start">{t('products.name')}</TableHead>
                    <TableHead className="text-start">{t('products.packagingHierarchyColumn')}</TableHead>
                    <TableHead className="text-start">{t('products.barcode')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((product) => {
                    // Build packaging hierarchy string
                    const uoms = product.uoms || [];
                    const sortedUoms = [...uoms].sort((a, b) => a.conversion_factor - b.conversion_factor);

                    let hierarchyText = '';
                    if (sortedUoms.length > 0) {
                      hierarchyText = sortedUoms
                        .map(uom => `${uom.uom_name} (${uom.conversion_factor})`)
                        .join(' | ');
                    }

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium text-start">{product.sku}</TableCell>
                        <TableCell className="text-start">{product.name}</TableCell>
                        <TableCell className="text-start">
                          {hierarchyText ? (
                            <span className="text-sm">{hierarchyText}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-start">
                          {product.barcode || (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      {/* Add Product Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('products.addNewProduct')}</SheetTitle>
            <SheetDescription>
              {t('products.addProductDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ProductForm
              onSubmit={handleCreateProduct}
              isLoading={createProductMutation.isPending}
            />
            {createProductMutation.isError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  {createProductMutation.error instanceof Error
                    ? createProductMutation.error.message
                    : t('products.createError')}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
