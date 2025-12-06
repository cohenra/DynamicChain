import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InboundOrder, inboundService, CreateShipmentRequest } from '@/services/inboundService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Truck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

interface InboundOrderRowDetailProps {
  order: InboundOrder;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getShipmentStatusBadge = (status: string): string => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case 'ARRIVED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'RECEIVING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'CLOSED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function InboundOrderRowDetail({ order }: InboundOrderRowDetailProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const queryClient = useQueryClient();

  const shipmentSchema = z.object({
    shipment_number: z.string().min(1, 'Shipment number is required'),
    container_number: z.string().optional(),
    driver_details: z.string().optional(),
    notes: z.string().optional(),
  });

  type ShipmentFormValues = z.infer<typeof shipmentSchema>;

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      shipment_number: '',
      container_number: '',
      driver_details: '',
      notes: '',
    },
  });

  const createShipmentMutation = useMutation({
    mutationFn: (data: CreateShipmentRequest) =>
      inboundService.createShipment(order.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setIsSheetOpen(false);
      form.reset();
      toast.success('Shipment created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create shipment');
    },
  });

  const handleCreateShipment = (values: ShipmentFormValues) => {
    createShipmentMutation.mutate(values);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Order Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Order Number:</span>
            <p className="font-medium">{order.order_number}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Type:</span>
            <p className="font-medium capitalize">{order.order_type.replace(/_/g, ' ').toLowerCase()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <p className="font-medium capitalize">{order.status.replace(/_/g, ' ').toLowerCase()}</p>
          </div>
          {order.supplier_name && (
            <div>
              <span className="text-muted-foreground">Supplier:</span>
              <p className="font-medium">{order.supplier_name}</p>
            </div>
          )}
          {order.expected_delivery_date && (
            <div>
              <span className="text-muted-foreground">Expected Delivery:</span>
              <p className="font-medium">{formatDate(order.expected_delivery_date)}</p>
            </div>
          )}
          {order.notes && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Notes:</span>
              <p className="font-medium">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="lines" className="w-full">
        <TabsList>
          <TabsTrigger value="lines">
            <Package className="h-4 w-4 mr-2" />
            Order Lines ({order.lines?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="shipments">
            <Truck className="h-4 w-4 mr-2" />
            Shipments ({order.shipments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lines" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Lines</CardTitle>
            </CardHeader>
            <CardContent>
              {order.lines && order.lines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Product</th>
                        <th className="text-left p-2">SKU</th>
                        <th className="text-right p-2">Expected Qty</th>
                        <th className="text-right p-2">Received Qty</th>
                        <th className="text-left p-2">UOM</th>
                        <th className="text-left p-2">Batch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.lines.map((line) => (
                        <tr key={line.id} className="border-b hover:bg-gray-100 dark:hover:bg-gray-800">
                          <td className="p-2">{line.product?.name || '-'}</td>
                          <td className="p-2 font-mono text-sm">{line.product?.sku || '-'}</td>
                          <td className="p-2 text-right">{line.expected_quantity}</td>
                          <td className="p-2 text-right font-medium">{line.received_quantity}</td>
                          <td className="p-2">{line.uom?.code || '-'}</td>
                          <td className="p-2">{line.expected_batch || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No lines found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipments" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Shipments</CardTitle>
              <Button onClick={() => setIsSheetOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Shipment
              </Button>
            </CardHeader>
            <CardContent>
              {order.shipments && order.shipments.length > 0 ? (
                <div className="space-y-4">
                  {order.shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="border rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{shipment.shipment_number}</h4>
                          {shipment.container_number && (
                            <p className="text-sm text-muted-foreground">
                              Container: {shipment.container_number}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShipmentStatusBadge(shipment.status)}`}>
                          {shipment.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {shipment.driver_details && (
                          <div>
                            <span className="text-muted-foreground">Driver:</span>
                            <p>{shipment.driver_details}</p>
                          </div>
                        )}
                        {shipment.arrival_date && (
                          <div>
                            <span className="text-muted-foreground">Arrived:</span>
                            <p>{formatDate(shipment.arrival_date)}</p>
                          </div>
                        )}
                        {shipment.notes && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Notes:</span>
                            <p>{shipment.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No shipments found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Shipment</SheetTitle>
            <SheetDescription>
              Add a new shipment for order {order.order_number}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateShipment)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="shipment_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipment Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SHP-001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="container_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Container/Truck Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CNT-12345" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="driver_details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Details</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Name, phone, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={createShipmentMutation.isPending}
                  >
                    {createShipmentMutation.isPending ? 'Creating...' : 'Create Shipment'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
