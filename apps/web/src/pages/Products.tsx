import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, ProductCreate } from '@/services/products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ProductForm } from '@/components/products/ProductForm';
import { Plus, XCircle } from 'lucide-react';

export default function Products() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const queryClient = useQueryClient();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">מוצרים</h1>
          <p className="text-muted-foreground mt-2">
            נהל את מוצרי המלאי שלך עם תכונות מותאמות אישית
          </p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף מוצר
        </Button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">טוען מוצרים...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">שגיאה בטעינת המוצרים</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : 'אירעה שגיאה לא צפויה'}
              </p>
            </div>
          </div>
        ) : products && products.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">אין מוצרים להצגה</p>
              <p className="text-sm text-muted-foreground mt-2">
                התחל על ידי הוספת המוצר הראשון שלך
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מק״ט</TableHead>
                <TableHead>שם המוצר</TableHead>
                <TableHead>ברקוד</TableHead>
                <TableHead>תכונות מותאמות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.sku}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    {product.barcode || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const attributes = product.custom_attributes || {};
                      const entries = Object.entries(attributes);

                      if (entries.length === 0) {
                        return <span className="text-muted-foreground text-sm">אין תכונות</span>;
                      }

                      // Show first 2 attributes as badges
                      const visibleAttributes = entries.slice(0, 2);
                      const remainingCount = entries.length - 2;

                      return (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {visibleAttributes.map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                          {remainingCount > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs cursor-help">
                                    +{remainingCount} נוספות
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-1">
                                    {entries.slice(2).map(([key, value]) => (
                                      <div key={key} className="text-xs">
                                        <span className="font-semibold">{key}:</span> {String(value)}
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Product Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>הוסף מוצר חדש</SheetTitle>
            <SheetDescription>
              מלא את פרטי המוצר והוסף תכונות מותאמות אישית לפי הצורך
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
                    : 'שגיאה ביצירת המוצר'}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
