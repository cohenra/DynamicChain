import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight, Wand2, Package, Filter, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartTable } from '@/components/ui/data-table/SmartTable';

import {
  WaveType,
  WaveTypeOption,
  OrderSimulationSummary,
  WaveSimulationResponse,
  getWaveTypes,
  simulateWave,
  createWaveWithWizard,
  getPriorityInfo,
} from '@/services/outboundService';
import { depositorService, Depositor } from '@/services/depositors';

// ============================================================================
// Types & Constants
// ============================================================================

const WAVE_TYPE_LABELS: Record<WaveType, { he: string; en: string }> = {
  ECOMMERCE_DAILY: { he: 'אי-קומרס יומי', en: 'E-commerce Daily' },
  ECOMMERCE_EXPRESS: { he: 'אי-קומרס מהיר', en: 'E-commerce Express' },
  B2B_STANDARD: { he: 'B2B רגיל', en: 'B2B Standard' },
  B2B_URGENT: { he: 'B2B דחוף', en: 'B2B Urgent' },
  WHOLESALE: { he: 'סיטונאי', en: 'Wholesale' },
  RETAIL_REPLENISHMENT: { he: 'חידוש מדפים', en: 'Retail Replenishment' },
  PERISHABLE: { he: 'מוצרים מתכלים', en: 'Perishable' },
  CUSTOM: { he: 'מותאם אישית', en: 'Custom' },
};

const ORDER_TYPES = [
  { value: 'SALES', label: { he: 'מכירות', en: 'Sales' } },
  { value: 'TRANSFER', label: { he: 'העברה', en: 'Transfer' } },
  { value: 'RETURN', label: { he: 'החזרה', en: 'Return' } },
  { value: 'SAMPLE', label: { he: 'דוגמה', en: 'Sample' } },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: { he: 'קריטי (1)', en: 'Critical (1)' } },
  { value: 2, label: { he: 'גבוה (2)', en: 'High (2)' } },
  { value: 3, label: { he: 'בינוני (3)', en: 'Medium (3)' } },
  { value: 5, label: { he: 'רגיל (5)', en: 'Normal (5)' } },
  { value: 10, label: { he: 'נמוך (10)', en: 'Low (10)' } },
];

// ============================================================================
// Zod Schema
// ============================================================================

const wizardSchema = z.object({
  // Step 1: Configuration
  waveName: z.string().max(50).optional(),
  waveType: z.string().min(1, 'Wave type is required'),

  // Step 2: Criteria
  deliveryDateFrom: z.string().optional(),
  deliveryDateTo: z.string().optional(),
  customerId: z.string().optional(),
  orderType: z.string().optional(),
  priority: z.string().optional(),
});

type WizardFormValues = z.infer<typeof wizardSchema>;

// ============================================================================
// Props
// ============================================================================

interface CreateWaveWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function CreateWaveWizard({
  open,
  onOpenChange,
  onSuccess,
}: CreateWaveWizardProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === 'he';

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [simulationResult, setSimulationResult] = useState<WaveSimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Form
  const form = useForm<WizardFormValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      waveName: '',
      waveType: '',
      deliveryDateFrom: '',
      deliveryDateTo: '',
      customerId: '',
      orderType: '',
      priority: '',
    },
  });

  // Queries
  const { data: waveTypes, isLoading: isLoadingWaveTypes } = useQuery({
    queryKey: ['wave-types'],
    queryFn: getWaveTypes,
    enabled: open,
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['depositors'],
    queryFn: depositorService.getDepositors,
    enabled: open,
  });

  // Create Wave Mutation
  const createWaveMutation = useMutation({
    mutationFn: createWaveWithWizard,
    onSuccess: (wave) => {
      toast.success(t('outbound.waveCreated', 'גל נוצר בהצלחה'), {
        description: wave.wave_number,
      });
      queryClient.invalidateQueries({ queryKey: ['outbound-waves'] });
      handleClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(t('common.error', 'שגיאה'), {
        description: error.response?.data?.detail || t('outbound.waveCreateError', 'יצירת הגל נכשלה'),
      });
    },
  });

  // ============================================================================
  // Preview Table Configuration
  // ============================================================================

  const previewColumns = useMemo<ColumnDef<OrderSimulationSummary>[]>(
    () => [
      {
        accessorKey: 'order_number',
        header: t('outbound.orderNumber', 'מספר הזמנה'),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.order_number}</span>
        ),
      },
      {
        accessorKey: 'customer_name',
        header: t('outbound.customer', 'לקוח'),
      },
      {
        accessorKey: 'order_type',
        header: t('outbound.orderType', 'סוג'),
        cell: ({ row }) => <Badge variant="outline">{row.original.order_type}</Badge>,
      },
      {
        accessorKey: 'priority',
        header: t('outbound.priority', 'עדיפות'),
        cell: ({ row }) => {
          const { label, color } = getPriorityInfo(row.original.priority);
          return (
            <Badge
              className={`bg-${color}-100 text-${color}-700 border-${color}-200`}
            >
              {label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'lines_count',
        header: t('outbound.lines', 'שורות'),
        cell: ({ row }) => row.original.lines_count,
      },
      {
        accessorKey: 'total_qty',
        header: t('outbound.totalQty', 'כמות'),
        cell: ({ row }) => row.original.total_qty.toLocaleString(),
      },
      {
        accessorKey: 'requested_delivery_date',
        header: t('outbound.deliveryDate', 'תאריך משלוח'),
        cell: ({ row }) =>
          row.original.requested_delivery_date
            ? format(new Date(row.original.requested_delivery_date), 'dd/MM/yyyy')
            : '-',
      },
    ],
    [t]
  );

  const previewTable = useReactTable({
    data: simulationResult?.orders || [],
    columns: previewColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 5 },
    },
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClose = () => {
    setCurrentStep(1);
    setSimulationResult(null);
    form.reset();
    onOpenChange(false);
  };

  const handleSimulate = async () => {
    const values = form.getValues();

    if (!values.waveType) {
      toast.error(t('outbound.selectWaveType', 'בחר סוג גל'));
      return;
    }

    setIsSimulating(true);
    try {
      const result = await simulateWave({
        wave_type: values.waveType as WaveType,
        criteria: {
          delivery_date_from: values.deliveryDateFrom || null,
          delivery_date_to: values.deliveryDateTo || null,
          customer_id: values.customerId ? parseInt(values.customerId, 10) : null,
          order_type: values.orderType || null,
          priority: values.priority ? parseInt(values.priority, 10) : null,
        },
      });
      setSimulationResult(result);
      setCurrentStep(3);
    } catch (error: any) {
      toast.error(t('common.error', 'שגיאה'), {
        description: error.response?.data?.detail || t('outbound.simulationFailed', 'הסימולציה נכשלה'),
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCreateWave = () => {
    if (!simulationResult || simulationResult.orders.length === 0) {
      toast.error(t('outbound.noOrdersSelected', 'אין הזמנות ליצירת גל'));
      return;
    }

    const values = form.getValues();

    createWaveMutation.mutate({
      wave_name: values.waveName || null,
      wave_type: values.waveType as WaveType,
      criteria: {
        delivery_date_from: values.deliveryDateFrom || null,
        delivery_date_to: values.deliveryDateTo || null,
        customer_id: values.customerId ? parseInt(values.customerId, 10) : null,
        order_type: values.orderType || null,
        priority: values.priority ? parseInt(values.priority, 10) : null,
      },
      order_ids: simulationResult.orders.map((o) => o.id),
    });
  };

  const goToNextStep = () => {
    if (currentStep === 1) {
      const waveType = form.getValues('waveType');
      if (!waveType) {
        form.setError('waveType', { message: t('outbound.selectWaveType', 'בחר סוג גל') });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      handleSimulate();
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 3) {
        setSimulationResult(null);
      }
    }
  };

  // ============================================================================
  // Step Indicator
  // ============================================================================

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
              currentStep >= step
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-muted-foreground/30 text-muted-foreground'
            }`}
          >
            {step === 1 && <Wand2 className="w-4 h-4" />}
            {step === 2 && <Filter className="w-4 h-4" />}
            {step === 3 && <Eye className="w-4 h-4" />}
          </div>
          {step < 3 && (
            <div
              className={`w-12 h-0.5 mx-1 ${
                currentStep > step ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // ============================================================================
  // Step Content
  // ============================================================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">
                {t('outbound.wizard.step1Title', 'הגדרות הגל')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('outbound.wizard.step1Desc', 'בחר סוג גל ותן לו שם (אופציונלי)')}
              </p>
            </div>

            <FormField
              control={form.control}
              name="waveName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('outbound.waveName', 'שם הגל')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('outbound.waveNamePlaceholder', 'WV-ECOM-20240115-001')}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('outbound.waveNameHint', 'השאר ריק ליצירה אוטומטית')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="waveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('outbound.waveType', 'סוג גל')} *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingWaveTypes}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingWaveTypes
                              ? t('common.loading', 'טוען...')
                              : t('outbound.selectWaveType', 'בחר סוג גל')
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {waveTypes?.map((wt) => (
                        <SelectItem key={wt.wave_type} value={wt.wave_type}>
                          <div className="flex flex-col">
                            <span>
                              {WAVE_TYPE_LABELS[wt.wave_type]?.[isRTL ? 'he' : 'en'] ||
                                wt.wave_type}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {wt.strategy_name}
                              {wt.picking_policy && ` (${wt.picking_policy})`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(
                      'outbound.waveTypeHint',
                      'סוג הגל קובע את אסטרטגיית ההקצאה אוטומטית'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">
                {t('outbound.wizard.step2Title', 'קריטריונים לסינון')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('outbound.wizard.step2Desc', 'הגדר אילו הזמנות לכלול בגל')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deliveryDateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('outbound.dateFrom', 'מתאריך משלוח')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryDateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('outbound.dateTo', 'עד תאריך משלוח')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('outbound.customer', 'לקוח')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingCustomers}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('outbound.allCustomers', 'כל הלקוחות')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">{t('outbound.allCustomers', 'כל הלקוחות')}</SelectItem>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} ({customer.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="orderType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('outbound.orderType', 'סוג הזמנה')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('outbound.allTypes', 'כל הסוגים')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">{t('outbound.allTypes', 'כל הסוגים')}</SelectItem>
                        {ORDER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label[isRTL ? 'he' : 'en']}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('outbound.maxPriority', 'עדיפות מקסימלית')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('outbound.allPriorities', 'כל העדיפויות')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">{t('outbound.allPriorities', 'כל העדיפויות')}</SelectItem>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label[isRTL ? 'he' : 'en']}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('outbound.priorityHint', 'יכללו הזמנות עד רמת עדיפות זו')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">
                {t('outbound.wizard.step3Title', 'תצוגה מקדימה')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('outbound.wizard.step3Desc', 'אשר את ההזמנות שייכללו בגל')}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('outbound.totalOrders', 'סה״כ הזמנות')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-2xl font-bold text-primary">
                    {simulationResult?.matched_orders_count || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('outbound.totalLines', 'סה״כ שורות')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-2xl font-bold text-primary">
                    {simulationResult?.total_lines || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('outbound.strategy', 'אסטרטגיה')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-sm font-bold text-primary truncate">
                    {simulationResult?.resolved_strategy_name || '-'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Orders Preview Table */}
            {simulationResult && simulationResult.orders.length > 0 ? (
              <div className="border rounded-md">
                <SmartTable
                  table={previewTable}
                  columnsLength={previewColumns.length}
                  isLoading={false}
                  noDataMessage={t('outbound.noOrdersFound', 'לא נמצאו הזמנות')}
                  containerClassName="border-0 shadow-none"
                />
              </div>
            ) : (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {t('outbound.noOrdersForCriteria', 'לא נמצאו הזמנות התואמות לקריטריונים')}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setCurrentStep(2)}
                  >
                    {t('outbound.adjustCriteria', 'שנה קריטריונים')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            {t('outbound.createWaveWizard', 'יצירת גל חדש')}
          </DialogTitle>
          <DialogDescription>
            {t('outbound.wizardDesc', 'אשף יצירת גל ליקוט - בחר סוג, הגדר קריטריונים וצפה בתצוגה מקדימה')}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator />

        <Form {...form}>
          <form className="space-y-6">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevStep}
                disabled={currentStep === 1 || createWaveMutation.isPending}
              >
                {isRTL ? <ChevronRight className="w-4 h-4 ml-2" /> : <ChevronLeft className="w-4 h-4 mr-2" />}
                {t('common.back', 'חזור')}
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {t('common.cancel', 'ביטול')}
                </Button>

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    disabled={isSimulating}
                  >
                    {isSimulating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        {t('common.loading', 'טוען...')}
                      </>
                    ) : (
                      <>
                        {t('common.next', 'הבא')}
                        {isRTL ? <ChevronLeft className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleCreateWave}
                    disabled={
                      createWaveMutation.isPending ||
                      !simulationResult ||
                      simulationResult.orders.length === 0
                    }
                  >
                    {createWaveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        {t('common.creating', 'יוצר...')}
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 ml-2" />
                        {t('outbound.createWave', 'צור גל')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
