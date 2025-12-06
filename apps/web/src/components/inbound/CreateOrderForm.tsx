import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InboundOrderCreate } from '@/services/inbound';
import { productService } from '@/services/products';
import { X, Plus, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

type OrderFormValues = {
  order_type: 'PO' | 'ASN';
  order_number: string;
  supplier_name: string;
  expected_date?: string;
  lines: {
    product_id: string;
    uom_id: string;
    expected_quantity: string;
  }[];
};

interface CreateOrderFormProps {
  onSubmit: (data: InboundOrderCreate) => void;
  isLoading?: boolean;
}

export function CreateOrderForm({ onSubmit, isLoading }: CreateOrderFormProps) {
  const { t } = useTranslation();

  const orderSchema = useMemo(
    () =>
      z.object({
        order_type: z.enum(['PO', 'ASN'], {
          required_error: t('inbound.fields.orderTypeRequired'),
        }),
        order_number: z.string().min(1, t('inbound.fields.orderNumberRequired')),
        supplier_name: z.string().min(1, t('inbound.fields.supplierNameRequired')),
        expected_date: z.string().optional(),
        lines: z
          .array(
            z.object({
              product_id: z.string().min(1, t('inbound.lines.productRequired')),
              uom_id: z.string().min(1, t('inbound.lines.uomRequired')),
              expected_quantity: z
                .string()
                .min(1, t('inbound.lines.quantityRequired'))
                .refine((val) => parseFloat(val) > 0, {
                  message: t('inbound.lines.quantityMustBePositive'),
                }),
            })
          )
          .min(1, t('inbound.lines.noLines')),
      }),
    [t]
  );

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      order_type: 'PO',
      order_number: '',
      supplier_name: '',
      expected_date: '',
      lines: [{ product_id: '', uom_id: '', expected_quantity: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  const handleSubmit = (values: OrderFormValues) => {
    // --- התיקון: המרה לערכים שהשרת מצפה לקבל ---
    const orderTypeMap: Record<string, string> = {
      'PO': 'PURCHASE_ORDER',
      'ASN': 'ASN'
    };

    const data: InboundOrderCreate = {
      order_type: orderTypeMap[values.order_type] || values.order_type,
      order_number: values.order_number,
      supplier_name: values.supplier_name,
      expected_date: values.expected_date || undefined,
      lines: values.lines.map((line) => ({
        product_id: parseInt(line.product_id),
        uom_id: parseInt(line.uom_id),
        expected_quantity: parseFloat(line.expected_quantity),
      })),
    };
    onSubmit(data);
  };

  // פונקציה עזר להצגת יחידות מידה (כולל יחידת בסיס)
  const getProductUOMs = (productId: string) => {
    if (!productId || !products) return [];
    const product = products.find((p) => p.id === parseInt(productId));
    if (!product) return [];

    const availableUoms = [...(product.uoms || [])];

    // הוספת יחידת בסיס לרשימה באופן מלאכותי
    if (product.base_uom_id) {
      availableUoms.unshift({
        id: -1,
        uom_id: product.base_uom_id,
        uom_name: product.base_uom_name || 'Base Unit',
        uom_code: 'BASE',
        conversion_factor: 1,
        barcode: null,
        length: null,
        width: null,
        height: null,
        volume: null,
        weight: null
      });
    }
    return availableUoms;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Order Type */}
        <FormField
          control={form.control}
          name="order_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inbound.orderType')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('inbound.fields.selectOrderType')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PO">הזמנת רכש (PO)</SelectItem>
                  <SelectItem value="ASN">הודעה מוקדמת (ASN)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Order Number */}
        <FormField
          control={form.control}
          name="order_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inbound.fields.orderNumber')}</FormLabel>
              <FormControl>
                <Input
                  placeholder="לדוגמה: PO-2024-001"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Supplier Name */}
        <FormField
          control={form.control}
          name="supplier_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inbound.fields.supplierName')}</FormLabel>
              <FormControl>
                <Input
                  placeholder="שם הספק"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Expected Date */}
        <FormField
          control={form.control}
          name="expected_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inbound.fields.expectedDateOptional')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Order Lines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('inbound.lines.title')}</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ product_id: '', uom_id: '', expected_quantity: '' })
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('inbound.lines.addLine')}
            </Button>
          </div>

          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t('inbound.lines.product')}</TableHead>
                    <TableHead className="min-w-[150px]">{t('inbound.lines.uom')}</TableHead>
                    <TableHead className="min-w-[120px]">{t('inbound.lines.expectedQty')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lines.${index}.product_id`}
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  form.setValue(`lines.${index}.uom_id`, '');
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={t('inbound.lines.selectProduct')}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products?.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id.toString()}
                                    >
                                      {product.sku} - {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lines.${index}.uom_id`}
                          render={({ field }) => {
                            const productId = form.watch(`lines.${index}.product_id`);
                            const uoms = getProductUOMs(productId);
                            return (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={!productId}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={t('inbound.lines.selectUom')}
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {uoms.map((uom) => (
                                      <SelectItem key={uom.id} value={uom.uom_id.toString()}>
                                        {uom.uom_name} (x{uom.conversion_factor})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lines.${index}.expected_quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder={t('inbound.lines.enterQuantity')}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}