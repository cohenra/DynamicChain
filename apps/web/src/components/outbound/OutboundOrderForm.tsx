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
import { getOrderTypeOptions, OrderTypeSelectOption } from '@/services/orderTypeService';
import { OutboundOrderCreateRequest } from '@/services/outboundService';
import { Plus, Trash2, Loader2, CalendarIcon, Package, Send, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface OutboundOrderFormProps {
  onSubmit: (data: OutboundOrderCreateRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

// Fallback order types in case API fails
const FALLBACK_ORDER_TYPES = [
  { code: 'SALES', name: 'Sales', default_priority: 5 },
  { code: 'TRANSFER', name: 'Transfer', default_priority: 3 },
  { code: 'RETURN', name: 'Return', default_priority: 2 },
  { code: 'SAMPLE', name: 'Sample', default_priority: 1 },
];

const PRIORITY_OPTIONS = [
  { value: '1', label: { he: 'קריטי (1)', en: 'Critical (1)', ar: 'حرج (1)', ru: 'Критический (1)' } },
  { value: '2', label: { he: 'גבוה (2)', en: 'High (2)', ar: 'عالي (2)', ru: 'Высокий (2)' } },
  { value: '3', label: { he: 'בינוני (3)', en: 'Medium (3)', ar: 'متوسط (3)', ru: 'Средний (3)' } },
  { value: '5', label: { he: 'רגיל (5)', en: 'Normal (5)', ar: 'عادي (5)', ru: 'Обычный (5)' } },
  { value: '10', label: { he: 'נמוך (10)', en: 'Low (10)', ar: 'منخفض (10)', ru: 'Низкий (10)' } },
];

export function OutboundOrderForm({ onSubmit, onCancel, isSubmitting }: OutboundOrderFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const langKey = (['he', 'en', 'ar', 'ru'].includes(i18n.language) ? i18n.language : 'en') as 'he' | 'en' | 'ar' | 'ru';

  // Data Fetching
  const { data: customers } = useQuery({ queryKey: ['depositors'], queryFn: depositorService.getDepositors });
  const { data: allProducts } = useQuery({ queryKey: ['products'], queryFn: productService.getProducts });
  const { data: uoms } = useQuery({ queryKey: ['uomDefinitions'], queryFn: uomDefinitionService.getUomDefinitions });

  // FIX: Fetch dynamic order types from API
  const { data: orderTypes, isLoading: isLoadingOrderTypes } = useQuery({
    queryKey: ['order-types-options'],
    queryFn: getOrderTypeOptions,
  });

  // Use fetched order types or fallback
  const availableOrderTypes = orderTypes && orderTypes.length > 0
    ? orderTypes
    : FALLBACK_ORDER_TYPES.map(t => ({ ...t, id: 0, behavior_key: 'B2B' }));

  // Schema Validation - now accepts any order type code
  const formSchema = z.object({
    order_number: z.string().min(1, t('outbound.fields.orderNumberRequired', 'מספר הזמנה נדרש')),
    order_type: z.string().min(1, t('outbound.fields.orderTypeRequired', 'סוג הזמנה נדרש')),
    customer_id: z.string().min(1, t('outbound.fields.customerRequired', 'לקוח נדרש')),
    priority: z.string().default('5'),
    requested_delivery_date: z.string().min(1, t('outbound.fields.deliveryDateRequired', 'תאריך משלוח נדרש')),
    notes: z.string().optional(),
    lines: z.array(z.object({
      product_id: z.string().min(1, t('outbound.lines.productRequired', 'מוצר נדרש')),
      uom_id: z.string().min(1, t('outbound.lines.uomRequired', 'יחידת מידה נדרשת')),
      qty_ordered: z.string().refine(val => parseFloat(val) > 0, t('outbound.lines.quantityMustBePositive', 'כמות חייבת להיות חיובית')),
    })).min(1, t('outbound.lines.atLeastOneItem', 'נדרש פריט אחד לפחות')),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      order_number: '',
      order_type: 'B2B',
      customer_id: '',
      priority: '5',
      requested_delivery_date: '',
      notes: '',
      lines: [{ product_id: '', uom_id: '', qty_ordered: '' }]
    },
  });

  // Watch customer_id to filter products
  const selectedCustomerId = useWatch({ control: form.control, name: 'customer_id' });

  // Filter products based on selected customer (depositor)
  const filteredProducts = allProducts?.filter(p => p.depositor_id?.toString() === selectedCustomerId);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines"
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const formattedData: OutboundOrderCreateRequest = {
      order_number: values.order_number,
      order_type: values.order_type,
      customer_id: parseInt(values.customer_id),
      priority: parseInt(values.priority),
      requested_delivery_date: values.requested_delivery_date,
      notes: values.notes || undefined,
      lines: values.lines.map(line => ({
        product_id: parseInt(line.product_id),
        uom_id: parseInt(line.uom_id),
        qty_ordered: parseFloat(line.qty_ordered),
      }))
    };
    onSubmit(formattedData);
  };

  const isLoadingData = !customers || !allProducts || !uoms || isLoadingOrderTypes;

  if (isLoadingData) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Send className="h-5 w-5" />
            <h3 className="font-semibold text-lg">{t('outbound.orderDetails', 'פרטי הזמנה')}</h3>
          </div>

          <Card className="border-none shadow-none bg-muted/10">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Selection */}
              <FormField control={form.control} name="customer_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {t('outbound.customer', 'לקוח')}
                  </FormLabel>
                  <Select onValueChange={(val) => {
                    field.onChange(val);
                    // Reset lines when customer changes
                    form.setValue('lines', [{ product_id: '', uom_id: '', qty_ordered: '' }]);
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={t('outbound.selectCustomer', 'בחר לקוח')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="order_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('outbound.orderNumber', 'מספר הזמנה')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('outbound.orderNumberPlaceholder', 'SO-2024-001')} className="bg-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="order_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('outbound.orderType', 'סוג הזמנה')}</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      // Auto-set priority based on selected order type
                      const selectedType = availableOrderTypes.find(ot => ot.code === val);
                      if (selectedType) {
                        form.setValue('priority', selectedType.default_priority.toString());
                      }
                    }}
                    value={field.value}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={t('outbound.selectOrderType', 'בחר סוג הזמנה')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableOrderTypes.map(type => (
                        <SelectItem key={type.code} value={type.code}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('outbound.priority', 'עדיפות')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label[langKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="requested_delivery_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('outbound.deliveryDate', 'תאריך משלוח מבוקש')}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type="date" {...field} className="bg-white" />
                    </FormControl>
                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{t('common.notes', 'הערות')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('outbound.notesPlaceholder', 'הערות להזמנה...')} className="bg-white resize-none h-20" />
                  </FormControl>
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
              <h3 className="font-semibold text-lg">{t('outbound.lines.title', 'פריטי הזמנה')}</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ product_id: '', uom_id: '', qty_ordered: '' })}
              disabled={!selectedCustomerId}
              className="border-dashed border-primary text-primary hover:bg-primary/5"
            >
              <Plus className="h-4 w-4 me-2" />
              {t('outbound.lines.addLine', 'הוסף פריט')}
            </Button>
          </div>

          {!selectedCustomerId && (
            <div className="text-center py-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
              {t('outbound.selectCustomerFirst', 'יש לבחור לקוח לפני הוספת פריטים')}
            </div>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <Card key={field.id} className="border bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-12 md:col-span-5">
                    <FormField control={form.control} name={`lines.${index}.product_id`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">{t('products.name', 'מוצר')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder={t('outbound.selectProduct', 'בחר מוצר')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredProducts?.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name} <span className="text-muted-foreground text-xs mx-1">({p.sku})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="col-span-6 md:col-span-3">
                    <FormField control={form.control} name={`lines.${index}.uom_id`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">{t('outbound.lines.uom', 'יח\' מידה')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder={t('outbound.selectUom', 'יחידה')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {uoms?.map(u => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="col-span-4 md:col-span-3">
                    <FormField control={form.control} name={`lines.${index}.qty_ordered`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">{t('outbound.lines.qty', 'כמות')}</FormLabel>
                        <FormControl>
                          <Input type="number" className="h-10 text-center font-medium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {form.formState.errors.lines && (
            <p className="text-destructive text-sm text-center">{form.formState.errors.lines.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t bg-background sticky bottom-0 z-10">
          <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={isSubmitting}>
            {t('common.cancel', 'ביטול')}
          </Button>
          <Button type="submit" size="lg" className="min-w-[150px]" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('common.saving', 'שומר...')}
              </>
            ) : (
              t('outbound.createOrder', 'צור הזמנה')
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
