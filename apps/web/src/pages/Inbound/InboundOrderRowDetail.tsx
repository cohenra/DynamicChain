import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InboundOrder, inboundService, CreateShipmentRequest, InboundLine, InboundLineCreate, InboundLineUpdate, InboundShipment } from '@/services/inboundService';
import { inventoryService } from '@/services/inventory';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, Truck, ArrowLeftRight, Edit, CheckCircle, Lock, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { productService } from '@/services/products';
import { uomDefinitionService } from '@/services/uom-definitions';
import { useReactTable, getCoreRowModel, getPaginationRowModel, getExpandedRowModel, ColumnDef, flexRender, ExpandedState } from '@tanstack/react-table';
import { DataTableViewOptions } from '@/components/ui/data-table-view-options';
import { ReceiveShipmentSheet } from './ReceiveShipmentSheet';

interface InboundOrderRowDetailProps {
  order: InboundOrder;
}

// --- New Component: Received Items Sub-Table ---
function ShipmentReceivedItems({ shipmentId }: { shipmentId: number }) {
    const { t } = useTranslation();
    const { data, isLoading } = useQuery({
        queryKey: ['inventory-transactions', { inbound_shipment_id: shipmentId }],
        queryFn: () => inventoryService.getTransactions({ inbound_shipment_id: shipmentId, limit: 100 }),
    });

    if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin h-4 w-4" /></div>;
    if (!data?.items || data.items.length === 0) return <div className="p-4 text-center text-sm text-muted-foreground">{t('inbound.shipments.noItemsReceived')}</div>;

    return (
        <div className="bg-slate-50 p-2 rounded-b border-t">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 mr-2">{t('inbound.shipments.receivedItems')}:</h4>
            <Table>
                <TableHeader>
                    <TableRow className="h-8">
                        <TableHead className="h-8 text-xs">{t('inbound.lines.product')}</TableHead>
                        <TableHead className="h-8 text-xs">{t('inventory.quantity')}</TableHead>
                        <TableHead className="h-8 text-xs">{t('inventory.lpn')}</TableHead>
                        <TableHead className="h-8 text-xs">{t('warehouses.location')}</TableHead>
                        <TableHead className="h-8 text-xs">{t('inventory.timestamp')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.items.map((tx) => (
                        <TableRow key={tx.id} className="h-8 hover:bg-white">
                            <TableCell className="py-1 text-xs font-medium">{tx.product_name}</TableCell>
                            <TableCell className="py-1 text-xs">{tx.quantity}</TableCell>
                            <TableCell className="py-1 text-xs font-mono">{tx.inventory_lpn}</TableCell>
                            <TableCell className="py-1 text-xs"><Badge variant="outline" className="text-[10px] h-5">{tx.to_location_name}</Badge></TableCell>
                            <TableCell className="py-1 text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getShipmentStatusBadge = (status: string, t: any) => {
  switch (status) {
    case 'SCHEDULED': return <Badge variant="outline" className="bg-slate-100 text-slate-700">{t('inbound.shipments.statuses.SCHEDULED')}</Badge>;
    case 'ARRIVED': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{t('inbound.shipments.statuses.ARRIVED')}</Badge>;
    case 'RECEIVING': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{t('inbound.shipments.statuses.RECEIVING')}</Badge>;
    case 'CLOSED': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{t('inbound.shipments.statuses.CLOSED')}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

function CompactPagination({ table, total, t }: { table: any, total: number, t: any }) {
    return (
        <div className="flex items-center gap-1 text-xs bg-slate-50 rounded-md px-2 py-1 border shrink-0">
            <span className="text-muted-foreground mx-1 hidden sm:inline">{t('common.totalRecords', { count: total })}</span>
            <div className="h-3 w-px bg-slate-300 mx-1"></div>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronRight className="h-3 w-3" /></Button>
            <span className="min-w-[2rem] text-center font-medium">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronLeft className="h-3 w-3" /></Button>
        </div>
    );
}

export function InboundOrderRowDetail({ order }: InboundOrderRowDetailProps) {
  const [isShipmentSheetOpen, setIsShipmentSheetOpen] = useState(false);
  const [isLineSheetOpen, setIsLineSheetOpen] = useState(false);
  const [isCloseAlertOpen, setIsCloseAlertOpen] = useState(false);
  const [isForceCloseAlertOpen, setIsForceCloseAlertOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<InboundLine | null>(null);
  
  // New state for receiving
  const [selectedShipment, setSelectedShipment] = useState<InboundShipment | null>(null);
  const [shipmentsExpanded, setShipmentsExpanded] = useState<ExpandedState>({});
  
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isOrderEditable = order.status === 'DRAFT' || order.status === 'CONFIRMED' || order.status === 'PARTIALLY_RECEIVED';

  // --- Forms setup (Same as before) ---
  const shipmentSchema = z.object({ shipment_number: z.string().min(1, t('common.required', 'Required')), container_number: z.string().optional(), driver_details: z.string().optional(), arrival_date: z.string().optional(), notes: z.string().optional() });
  const shipmentForm = useForm<z.infer<typeof shipmentSchema>>({ resolver: zodResolver(shipmentSchema), defaultValues: { shipment_number: '', container_number: '', driver_details: '', arrival_date: '', notes: '' } });
  const createShipmentMutation = useMutation({ mutationFn: (data: CreateShipmentRequest) => inboundService.createShipment(order.id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inbound-orders'] }); setIsShipmentSheetOpen(false); shipmentForm.reset(); toast.success(t('inbound.shipments.createSuccess')); }, onError: (err: any) => toast.error(err?.response?.data?.detail || 'Error') });
  const handleCreateShipment = (values: any) => createShipmentMutation.mutate({ ...values, arrival_date: values.arrival_date ? new Date(values.arrival_date).toISOString() : null });

  const { data: products } = useQuery({ queryKey: ['products'], queryFn: productService.getProducts });
  const { data: uoms } = useQuery({ queryKey: ['uomDefinitions'], queryFn: uomDefinitionService.getUomDefinitions });
  const customerProducts = products?.filter(p => String(p.depositor_id) === String(order.customer_id));

  const lineSchema = z.object({ product_id: z.string().min(1), uom_id: z.string().min(1), expected_quantity: z.string().refine(val => parseFloat(val) > 0), expected_batch: z.string().optional() });
  const lineForm = useForm<z.infer<typeof lineSchema>>({ resolver: zodResolver(lineSchema), defaultValues: { product_id: '', uom_id: '', expected_quantity: '', expected_batch: '' } });
  const addLineMutation = useMutation({ mutationFn: (data: InboundLineCreate) => inboundService.addLine(order.id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inbound-orders'] }); setIsLineSheetOpen(false); lineForm.reset(); toast.success(t('inbound.lines.addSuccess')); } });
  const updateLineMutation = useMutation({ mutationFn: (data: InboundLineUpdate) => inboundService.updateLine(editingLine!.id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inbound-orders'] }); setIsLineSheetOpen(false); setEditingLine(null); toast.success(t('inbound.lines.updateSuccess')); } });
  const handleLineSubmit = (values: any) => { const payload = { product_id: parseInt(values.product_id), uom_id: parseInt(values.uom_id), expected_quantity: parseFloat(values.expected_quantity), expected_batch: values.expected_batch || undefined }; if (editingLine) updateLineMutation.mutate(payload); else addLineMutation.mutate(payload); };
  
  const openAddLine = () => { setEditingLine(null); lineForm.reset({ product_id: '', uom_id: '', expected_quantity: '', expected_batch: '' }); setIsLineSheetOpen(true); };
  const openEditLine = (line: InboundLine) => { setEditingLine(line); lineForm.reset({ product_id: line.product_id.toString(), uom_id: line.uom_id.toString(), expected_quantity: line.expected_quantity.toString(), expected_batch: line.expected_batch || '' }); setIsLineSheetOpen(true); };
  const closeOrderMutation = useMutation({
    mutationFn: (force: boolean = false) => inboundService.closeOrder(order.id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setIsCloseAlertOpen(false);
      setIsForceCloseAlertOpen(false);
      toast.success(t('inbound.closeSuccess', 'ההזמנה נסגרה בהצלחה'));
    },
    onError: (error: any) => {
      const errorDetail = error?.response?.data?.detail || '';
      if (error?.response?.status === 400 && errorDetail.includes('No items') && errorDetail.includes('force=True')) {
        setIsCloseAlertOpen(false);
        setIsForceCloseAlertOpen(true);
      } else {
        toast.error(errorDetail || t('inbound.closeError', 'שגיאה בסגירת ההזמנה'));
      }
    }
  });

  // --- Tables Setup ---
  const lineColumns = useMemo<ColumnDef<InboundLine>[]>(() => [
      { accessorKey: 'product.name', header: t('inbound.lines.product'), cell: ({row}) => <span className="whitespace-nowrap">{row.original.product?.name}</span> },
      { accessorKey: 'product.sku', header: t('inbound.lines.sku') },
      { accessorKey: 'uom.code', header: t('inbound.lines.uom'), cell: ({row}) => <Badge variant="outline">{row.original.uom?.code}</Badge> },
      { accessorKey: 'expected_quantity', header: t('inbound.lines.expectedQty'), cell: ({row}) => <span className="font-medium">{row.original.expected_quantity}</span> },
      { accessorKey: 'received_quantity', header: t('inbound.lines.receivedQty'), cell: ({row}) => <span className={row.original.received_quantity > 0 ? "text-green-600 font-bold" : "text-slate-400"}>{row.original.received_quantity}</span> },
      { accessorKey: 'expected_batch', header: t('inbound.lines.batch'), cell: ({row}) => row.original.expected_batch || '-' },
      { 
          id: 'actions', 
          header: () => isOrderEditable && <Button onClick={openAddLine} variant="ghost" size="sm" className="h-6 px-2 text-primary hover:bg-primary/10 whitespace-nowrap"><Plus className="h-3.5 w-3.5 mr-1" /> {t('inbound.lines.addLine')}</Button>,
          cell: ({row}) => isOrderEditable ? <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditLine(row.original)}><Edit className="h-3.5 w-3.5 text-slate-500" /></Button> : null
      }
  ], [isOrderEditable, t]);

  const shipmentColumns = useMemo<ColumnDef<InboundShipment>[]>(() => [
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
        size: 40,
      },
      { accessorKey: 'shipment_number', header: t('inbound.shipments.shipmentNumber'), cell: ({row}) => <span className="font-bold">{row.original.shipment_number}</span> },
      { accessorKey: 'container_number', header: t('inbound.shipments.container'), cell: ({row}) => row.original.container_number || '-' },
      { accessorKey: 'driver_details', header: t('inbound.shipments.driver'), cell: ({row}) => row.original.driver_details || '-' },
      { accessorKey: 'arrival_date', header: t('inbound.shipments.arrived'), cell: ({row}) => formatDate(row.original.arrival_date) },
      { accessorKey: 'status', header: t('inbound.shipments.status'), cell: ({row}) => getShipmentStatusBadge(row.original.status, t) },
      { 
          id: 'actions', 
          header: () => isOrderEditable && <Button onClick={() => setIsShipmentSheetOpen(true)} variant="ghost" size="sm" className="h-6 px-2 text-primary hover:bg-primary/10 whitespace-nowrap"><Plus className="h-3.5 w-3.5 mr-1" /> {t('inbound.shipments.addShipment')}</Button>,
          cell: ({row}) => row.original.status !== 'CLOSED' && (
              <Button 
                size="sm" 
                variant={row.original.status === 'RECEIVING' ? "default" : "outline"} 
                className="h-7 text-xs gap-1" 
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShipment(row.original);
                }}
              >
                  <ArrowLeftRight className="h-3 w-3" /> {t('inbound.shipments.receive')}
              </Button>
          )
      }
  ], [t, isOrderEditable]);

  const linesTable = useReactTable({ 
      data: order.lines || [], 
      columns: lineColumns, 
      getCoreRowModel: getCoreRowModel(), 
      getPaginationRowModel: getPaginationRowModel(), 
      initialState: { pagination: { pageSize: 5 } } 
  });

  const shipmentsTable = useReactTable({ 
      data: order.shipments || [], 
      columns: shipmentColumns, 
      state: { expanded: shipmentsExpanded },
      onExpandedChange: setShipmentsExpanded,
      getCoreRowModel: getCoreRowModel(), 
      getExpandedRowModel: getExpandedRowModel(), // Required for expansion
      getPaginationRowModel: getPaginationRowModel(), 
      initialState: { pagination: { pageSize: 5 } },
      getRowCanExpand: () => true 
  });

  return (
    <div className="bg-slate-50/80 dark:bg-slate-900/50 p-4 border-t border-b shadow-inner">
      <Tabs defaultValue="lines" className="w-full" dir="rtl">
        
        {/* --- Unified Control Bar --- */}
        <div className="flex flex-wrap items-center justify-between px-2 py-1 bg-white border-b sticky top-0 z-10 gap-2">
            <TabsList className="bg-transparent p-0 h-9 shrink-0">
                <TabsTrigger value="lines" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 h-9">
                    <Package className="h-3.5 w-3.5 mr-2" /> {t('inbound.lines.title')} <Badge variant="secondary" className="mr-1.5 h-4 px-1 text-[10px]">{order.lines?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="shipments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 h-9">
                    <Truck className="h-3.5 w-3.5 mr-2" /> {t('inbound.shipments.title')} <Badge variant="secondary" className="mr-1.5 h-4 px-1 text-[10px]">{order.shipments?.length || 0}</Badge>
                </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
                {isOrderEditable ? (
                    <Button variant="outline" size="sm" onClick={() => setIsCloseAlertOpen(true)} className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 whitespace-nowrap">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> {t('inbound.closeOrder')}
                    </Button>
                ) : (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><Lock className="h-3 w-3 mr-1" /> {t('outbound.statuses.COMPLETED')}</Badge>
                )}

                <div className="h-4 w-px bg-slate-200 mx-1"></div>

                <TabsContent value="lines" className="m-0 border-0 p-0 flex items-center gap-2">
                    <DataTableViewOptions table={linesTable} />
                    <CompactPagination table={linesTable} total={order.lines?.length || 0} t={t} />
                </TabsContent>
                <TabsContent value="shipments" className="m-0 border-0 p-0 flex items-center gap-2">
                    <DataTableViewOptions table={shipmentsTable} />
                    <CompactPagination table={shipmentsTable} total={order.shipments?.length || 0} t={t} />
                </TabsContent>
            </div>
        </div>

        {/* --- Content Area --- */}
        <div className="bg-white border-x border-b rounded-b-md">
            <TabsContent value="lines" className="m-0 p-0 overflow-x-auto">
                <Table className="min-w-[800px] w-full">
                    <TableHeader className="bg-slate-50">
                        {linesTable.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} className="h-8 hover:bg-transparent">
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id} className="h-8 text-xs font-semibold py-1 whitespace-nowrap px-4 text-right">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {linesTable.getRowModel().rows.length > 0 ? (
                            linesTable.getRowModel().rows.map(row => (
                                <TableRow key={row.id} className="h-9 hover:bg-slate-100/50">
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="py-1 text-xs whitespace-nowrap px-4 text-right">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={lineColumns.length} className="h-12 text-center text-muted-foreground text-sm">{t('inbound.lines.noLines')}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>

            <TabsContent value="shipments" className="m-0 p-0 overflow-x-auto">
                 <Table className="min-w-[800px] w-full">
                    <TableHeader className="bg-slate-50">
                        {shipmentsTable.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} className="h-8 hover:bg-transparent">
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id} className="h-8 text-xs font-semibold py-1 whitespace-nowrap px-4 text-right">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {shipmentsTable.getRowModel().rows.length > 0 ? (
                            shipmentsTable.getRowModel().rows.map(row => (
                                <>
                                    <TableRow key={row.id} className="h-9 hover:bg-slate-100/50 cursor-pointer" onClick={() => row.toggleExpanded()}>
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell key={cell.id} className="py-1 text-xs whitespace-nowrap px-4 text-right">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {row.getIsExpanded() && (
                                        <TableRow>
                                            <TableCell colSpan={shipmentColumns.length} className="p-0 border-b bg-slate-50/50">
                                                <ShipmentReceivedItems shipmentId={row.original.id} />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={shipmentColumns.length} className="h-12 text-center text-muted-foreground text-sm">{t('inbound.shipments.noShipments')}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>
        </div>
      </Tabs>

      {/* Sheets & Alerts */}
      
      <ReceiveShipmentSheet 
        shipment={selectedShipment}
        order={order}
        open={!!selectedShipment}
        onClose={() => {
            setSelectedShipment(null);
            // Invalidate queries to refresh order status and lines
            queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
        }}
      />

       <Sheet open={isShipmentSheetOpen} onOpenChange={setIsShipmentSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md p-0 flex flex-col h-full">
          <SheetHeader className="p-6 border-b"><SheetTitle>{t('inbound.shipments.addShipment')}</SheetTitle></SheetHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <Form {...shipmentForm}>
              <form id="shipment-form" onSubmit={shipmentForm.handleSubmit(handleCreateShipment)} className="space-y-4">
                <FormField control={shipmentForm.control} name="shipment_number" render={({ field }) => (<FormItem><FormLabel>{t('inbound.shipments.shipmentNumber')} *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={shipmentForm.control} name="container_number" render={({ field }) => (<FormItem><FormLabel>{t('inbound.shipments.container')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={shipmentForm.control} name="driver_details" render={({ field }) => (<FormItem><FormLabel>{t('inbound.shipments.driver')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={shipmentForm.control} name="arrival_date" render={({ field }) => (<FormItem><FormLabel>{t('inbound.shipments.arrived')}</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={shipmentForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{t('inbound.fields.notes')}</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
              </form>
            </Form>
          </div>
          <div className="p-4 border-t bg-slate-50 mt-auto"><Button type="submit" form="shipment-form" className="w-full" disabled={createShipmentMutation.isPending}>{t('common.create')}</Button></div>
        </SheetContent>
      </Sheet>

      <Sheet open={isLineSheetOpen} onOpenChange={setIsLineSheetOpen}>
          <SheetContent side="left" className="w-full sm:max-w-md p-0 flex flex-col h-full">
              <SheetHeader className="p-6 border-b"><SheetTitle>{editingLine ? t('inbound.lines.editLine') : t('inbound.lines.addLine')}</SheetTitle></SheetHeader>
              <div className="flex-1 overflow-y-auto p-6">
                  <Form {...lineForm}>
                      <form id="line-form" onSubmit={lineForm.handleSubmit(handleLineSubmit)} className="space-y-4">
                          <FormField control={lineForm.control} name="product_id" render={({ field }) => (<FormItem><FormLabel>{t('inbound.lines.product')}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!!editingLine}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{customerProducts?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.sku})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                          <FormField control={lineForm.control} name="uom_id" render={({ field }) => (<FormItem><FormLabel>{t('inbound.lines.uom')}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!!editingLine}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{uoms?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                          <FormField control={lineForm.control} name="expected_quantity" render={({ field }) => (<FormItem><FormLabel>{t('inbound.lines.expectedQty')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={lineForm.control} name="expected_batch" render={({ field }) => (<FormItem><FormLabel>{t('inbound.lines.batch')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </form>
                  </Form>
              </div>
              <div className="p-4 border-t bg-slate-50 mt-auto"><Button type="submit" form="line-form" className="w-full" disabled={addLineMutation.isPending || updateLineMutation.isPending}>{t('common.save')}</Button></div>
          </SheetContent>
      </Sheet>

      <AlertDialog open={isCloseAlertOpen} onOpenChange={setIsCloseAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>{t('inbound.closeOrder')}</AlertDialogTitle><AlertDialogDescription>{t('inbound.closeOrderConfirm')}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => closeOrderMutation.mutate(false)}>{t('inbound.closeOrder')}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isForceCloseAlertOpen} onOpenChange={setIsForceCloseAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-amber-600">{t('inbound.forceClose.title', 'אזהרה: סגירה ללא קבלה')}</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                      <p>{t('inbound.forceClose.message', 'לא התקבלו פריטים בהזמנה זו. האם ברצונך לסגור את ההזמנה בכל זאת?')}</p>
                      <p className="text-sm font-medium text-amber-700">
                          {t('inbound.forceClose.warning', 'פעולה זו תסמן את ההזמנה כמבוטלת.')}
                      </p>
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel', 'ביטול')}</AlertDialogCancel>
                  <AlertDialogAction
                      onClick={() => closeOrderMutation.mutate(true)}
                      className="bg-amber-600 hover:bg-amber-700"
                  >
                      {t('inbound.forceClose.confirm', 'כן, סגור ובטל')}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}