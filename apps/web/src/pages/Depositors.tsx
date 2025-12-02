import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { depositorService, DepositorCreate } from '@/services/depositors';
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

const depositorSchema = z.object({
  name: z.string().min(1, 'שם הוא שדה חובה'),
  code: z.string().min(1, 'קוד הוא שדה חובה'),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('כתובת אימייל לא תקינה').optional().or(z.literal('')),
});

type DepositorFormValues = z.infer<typeof depositorSchema>;

export default function Depositors() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const queryClient = useQueryClient();

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
      form.reset();
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

  const handleCreateDepositor = (values: DepositorFormValues) => {
    const data: DepositorCreate = {
      name: values.name,
      code: values.code,
      contact_name: values.contact_name || null,
      contact_phone: values.contact_phone || null,
      contact_email: values.contact_email || null,
    };
    createDepositorMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">מאחסנים</h1>
          <p className="text-muted-foreground mt-2">
            נהל את המאחסנים (לקוחות) במערכת
          </p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף מאחסן
        </Button>
      </div>

      {/* Depositors Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">טוען מאחסנים...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">שגיאה בטעינת המאחסנים</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : 'אירעה שגיאה לא צפויה'}
              </p>
            </div>
          </div>
        ) : depositors && depositors.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">אין מאחסנים להצגה</p>
              <p className="text-sm text-muted-foreground mt-2">
                התחל על ידי הוספת המאחסן הראשון שלך
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>קוד</TableHead>
                <TableHead>איש קשר</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>אימייל</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Depositor Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>הוסף מאחסן חדש</SheetTitle>
            <SheetDescription>
              מלא את פרטי המאחסן (לקוח) וצור רשומה חדשה במערכת
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateDepositor)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="הזן שם מאחסן"
                          disabled={createDepositorMutation.isPending}
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
                          placeholder="הזן קוד מאחסן"
                          disabled={createDepositorMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4">פרטי קשר (אופציונלי)</h3>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>שם איש קשר</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="הזן שם"
                              disabled={createDepositorMutation.isPending}
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
                          <FormLabel>טלפון</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="הזן מספר טלפון"
                              disabled={createDepositorMutation.isPending}
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
                          <FormLabel>אימייל</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="הזן כתובת אימייל"
                              disabled={createDepositorMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createDepositorMutation.isPending}>
                    {createDepositorMutation.isPending ? 'שומר...' : 'שמור מאחסן'}
                  </Button>
                </div>
              </form>
            </Form>

            {createDepositorMutation.isError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  {createDepositorMutation.error instanceof Error
                    ? createDepositorMutation.error.message
                    : 'שגיאה ביצירת המאחסן'}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
