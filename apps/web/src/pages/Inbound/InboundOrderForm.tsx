import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/products';
import { uomDefinitionService } from '@/services/uom-definitions';
import { depositorService } from '@/services/depositors';
import { InboundOrderCreateRequest } from '@/services/inboundService';
import { Plus, Trash2, Loader2, CalendarIcon, Package, TruckIcon, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface InboundOrderFormProps {
  onSubmit: (data: InboundOrderCreateRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function InboundOrderForm({ onSubmit, onCancel, isSubmitting }: InboundOrderFormProps) {
  const { t } = useTranslation();

  // Data Fetching
  const { data: depositors } = useQuery({ queryKey: ['depositors'], queryFn: depositorService.getDepositors });
  const { data: allProducts } = useQuery({ queryKey: ['products'], queryFn: productService.getProducts });
  const { data: uoms } = useQuery({ queryKey: ['uomDefinitions'], queryFn: uomDefinitionService.getUomDefinitions });

  // Schema Validation
  const formSchema = z.object({
    order_number: z.string().min(1, t('inbound.fields.orderNumberRequired')),
    order_type: z.enum(['SUPPLIER_DELIVERY', 'CUSTOMER_RETURN', 'TRANSFER_IN']),
    customer_id: z.string().min(1, t('depositors.nameRequired')), // Depositor
    supplier_name: z.string().min(1, t('inbound.fields.supplierNameRequired')),
    expected_delivery_date: z.string().optional(),
    notes: z.string().optional(),
    lines: z.array(z.object({
      product_id: z.string().min(1, t('inbound.lines.productRequired')),
      uom_id: z.string().min(1, t('inbound.lines.uomRequired')),
      expected_quantity: z.string().refine(val => parseFloat(val) > 0, t('inbound.lines.quantityMustBePositive')),
      expected_batch: z.string().optional(),
    })).min(1, t('inbound.lines.atLeastOneItem')),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      order_number: '',
      order_type: 'SUPPLIER_DELIVERY',
      customer_id: '',
      supplier_name: '',
      notes: '',
      lines: [{ product_id: '', uom_id: '', expected_quantity: '', expected_batch: '' }]
    },
  });

  // Watch customer_id to filter products
  const selectedCustomerId = useWatch({ control: form.control, name: 'customer_id' });

  // Filter products based on selected depositor
  const filteredProducts = allProducts?.filter(p => p.depositor_id?.toString() === selectedCustomerId);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines"
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const formattedData: InboundOrderCreateRequest = {
      order_number: values.order_number,
      order_type: values.order_type as any,
      customer_id: parseInt(values.customer_id),
      supplier_name: values.supplier_name,
      expected_delivery_date: values.expected_delivery_date || undefined,
      notes: values.notes || undefined,
      lines: values.lines.map(line => ({
        product_id: parseInt(line.product_id),
        uom_id: parseInt(line.uom_id),
        expected_quantity: parseFloat(line.expected_quantity),
        expected_batch: line.expected_batch || undefined
      }))
    };
    onSubmit(formattedData);
  };

  const isLoadingData = !depositors || !allProducts || !uoms;

  if (isLoadingData) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 pb-20">
        
        {/* Header Section */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
                <TruckIcon className="h-5 w-5" />
                <h3 className="font-semibold text-lg">פרטי הזמנה</h3>
            </div>
            
            <Card className="border-none shadow-none bg-muted/10">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Depositor Selection - Critical for filtering products */}
                    <FormField control={form.control} name="customer_id" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-1"><User className="h-3 w-3" /> {t('depositors.name')}</FormLabel>
                            <Select onValueChange={(val) => {
                                field.onChange(val);
                                // Reset lines when depositor changes to avoid invalid products
                                form.setValue('lines', [{ product_id: '', uom_id: '', expected_quantity: '', expected_batch: '' }]);
                            }} value={field.value}>
                                <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="בחר מאחסן" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {depositors?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="order_number" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('inbound.fields.orderNumber')}</FormLabel>
                            <FormControl><Input {...field} placeholder="לדוגמה: PO-2024-001" className="bg-white" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="order_type" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('inbound.orderType')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="SUPPLIER_DELIVERY">{t('inbound.orderTypes.PO', 'הזמנת רכש (PO)')}</SelectItem>
                                    <SelectItem value="CUSTOMER_RETURN">{t('inbound.orderTypes.RETURN', 'החזרת לקוח')}</SelectItem>
                                    <SelectItem value="TRANSFER_IN">{t('inbound.orderTypes.TRANSFER', 'העברה פנימית')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="supplier_name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('inbound.fields.supplierName')}</FormLabel>
                            <FormControl><Input {...field} className="bg-white" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="expected_delivery_date" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('inbound.fields.expectedDate')}</FormLabel>
                            <div className="relative">
                                <FormControl><Input type="date" {...field} className="bg-white" /></FormControl>
                                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />
                </CardContent>
            </Card>
        </div>

        <Separator />

        {/* Lines Section */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                    <Package className="h-5 w-5" />
                    <h3 className="font-semibold text-lg">{t('inbound.lines.title')}</h3>
                </div>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => append({ product_id: '', uom_id: '', expected_quantity: '', expected_batch: '' })} 
                    disabled={!selectedCustomerId} // Disable adding lines if no depositor selected
                    className="border-dashed border-primary text-primary hover:bg-primary/5"
                >
                    <Plus className="h-4 w-4 ml-2" />
                    {t('inbound.lines.addLine')}
                </Button>
            </div>

            {!selectedCustomerId && (
                <div className="text-center py-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                    יש לבחור מאחסן לפני הוספת פריטים
                </div>
            )}

            <div className="space-y-3">
                {fields.map((field, index) => (
                    <Card key={field.id} className="border bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-12 md:col-span-4">
                                <FormField control={form.control} name={`lines.${index}.product_id`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground">{t('products.name')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="בחר מוצר" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {filteredProducts?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} <span className="text-muted-foreground text-xs mx-1">({p.sku})</span></SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="col-span-6 md:col-span-3">
                                <FormField control={form.control} name={`lines.${index}.uom_id`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground">{t('inbound.lines.uom')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="יחידה" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {uoms?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="col-span-6 md:col-span-2">
                                <FormField control={form.control} name={`lines.${index}.expected_quantity`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground">{t('inbound.lines.expectedQty')}</FormLabel>
                                        <FormControl><Input type="number" className="h-10 text-center font-medium" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="col-span-10 md:col-span-2">
                                <FormField control={form.control} name={`lines.${index}.expected_batch`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground">{t('inventory.batch')}</FormLabel>
                                        <FormControl><Input className="h-10" placeholder="אופציונלי" {...field} /></FormControl>
                                    </FormItem>
                                )} />
                            </div>

                            <div className="col-span-2 md:col-span-1 flex justify-end">
                                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => remove(index)}>
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            {form.formState.errors.lines && <p className="text-destructive text-sm text-center">{form.formState.errors.lines.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t bg-background sticky bottom-0 z-10">
          <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={isSubmitting}>{t('common.cancel')}</Button>
          <Button type="submit" size="lg" className="min-w-[150px]" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('common.saving')}</> : t('inbound.createOrder')}
          </Button>
        </div>
      </form>
    </Form>
  );
}