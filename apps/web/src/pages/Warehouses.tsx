import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseService, WarehouseCreate } from '@/services/warehouses';
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
import { Plus, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const warehouseSchema = z.object({
  name: z.string().min(1, 'שם הוא שדה חובה'),
  code: z.string().min(1, 'קוד הוא שדה חובה'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  zipcode: z.string().optional(),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

export default function Warehouses() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch warehouses
  const {
    data: warehouses,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseService.getWarehouses,
  });

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: warehouseService.createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setIsSheetOpen(false);
      form.reset();
    },
  });

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      country: '',
      zipcode: '',
    },
  });

  const handleCreateWarehouse = (values: WarehouseFormValues) => {
    const data: WarehouseCreate = {
      name: values.name,
      code: values.code,
      address: values.address || null,
      city: values.city || null,
      country: values.country || null,
      zipcode: values.zipcode || null,
    };
    createWarehouseMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">מחסנים</h1>
          <p className="text-muted-foreground mt-2">
            נהל את המחסנים במערכת
          </p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף מחסן
        </Button>
      </div>

      {/* Warehouses Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">טוען מחסנים...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">שגיאה בטעינת המחסנים</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : 'אירעה שגיאה לא צפויה'}
              </p>
            </div>
          </div>
        ) : warehouses && warehouses.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">אין מחסנים להצגה</p>
              <p className="text-sm text-muted-foreground mt-2">
                התחל על ידי הוספת המחסן הראשון שלך
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>קוד</TableHead>
                <TableHead>כתובת</TableHead>
                <TableHead>עיר</TableHead>
                <TableHead>מדינה</TableHead>
                <TableHead>מיקוד</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses?.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  <TableCell>{warehouse.code}</TableCell>
                  <TableCell>
                    {warehouse.address || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {warehouse.city || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {warehouse.country || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {warehouse.zipcode || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Warehouse Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>הוסף מחסן חדש</SheetTitle>
            <SheetDescription>
              מלא את פרטי המחסן וצור רשומה חדשה במערכת
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateWarehouse)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="הזן שם מחסן"
                          disabled={createWarehouseMutation.isPending}
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
                      <FormLabel>קוד</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="הזן קוד מחסן"
                          disabled={createWarehouseMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4">מיקום (אופציונלי)</h3>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>כתובת</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="הזן כתובת"
                              disabled={createWarehouseMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>עיר</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="הזן עיר"
                              disabled={createWarehouseMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>מדינה</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="הזן מדינה"
                              disabled={createWarehouseMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>מיקוד</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="הזן מיקוד"
                              disabled={createWarehouseMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createWarehouseMutation.isPending}>
                    {createWarehouseMutation.isPending ? 'שומר...' : 'שמור מחסן'}
                  </Button>
                </div>
              </form>
            </Form>

            {createWarehouseMutation.isError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  {createWarehouseMutation.error instanceof Error
                    ? createWarehouseMutation.error.message
                    : 'שגיאה ביצירת המחסן'}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
