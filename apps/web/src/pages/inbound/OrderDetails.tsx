import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  inboundService,
  InboundShipment,
  ShipmentCreate,
  ReceiveShipmentRequest,
} from '@/services/inbound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { CreateShipmentForm } from '@/components/inbound/CreateShipmentForm';
import { ReceivingConsole } from '@/components/inbound/ReceivingConsole';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [isShipmentSheetOpen, setIsShipmentSheetOpen] = useState(false);
  const [receivingShipment, setReceivingShipment] = useState<InboundShipment | null>(null);

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['inbound-order', id],
    queryFn: () => inboundService.getOrder(parseInt(id!)),
    enabled: !!id,
  });

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: (data: ShipmentCreate) => inboundService.createShipment(parseInt(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-order', id] });
      setIsShipmentSheetOpen(false);
      toast.success(t('inbound.shipments.createSuccess'));
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.detail || t('inbound.shipments.createError')),
  });

  // Receive shipment mutation
  const receiveShipmentMutation = useMutation({
    mutationFn: inboundService.receiveShipmentItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-order', id] });
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      setReceivingShipment(null);
      toast.success(t('inbound.receiving.receiveSuccess'));
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.detail || t('inbound.receiving.receiveError')),
  });

  const handleReceiveShipment = (shipment: InboundShipment) => {
    setReceivingShipment(shipment);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'PENDING':
        return 'secondary';
      case 'CONFIRMED':
      case 'ARRIVED':
        return 'default';
      case 'IN_PROGRESS':
      case 'RECEIVING':
      case 'IN_TRANSIT':
        return 'default';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const calculateOverview = () => {
    if (!order?.lines) return null;

    const totalLines = order.lines.length;
    const completedLines = order.lines.filter(
      (line) => line.received_quantity >= line.expected_quantity
    ).length;
    const totalExpected = order.lines.reduce((sum, line) => sum + line.expected_quantity, 0);
    const totalReceived = order.lines.reduce((sum, line) => sum + line.received_quantity, 0);
    const progressPercentage =
      totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

    return {
      totalLines,
      completedLines,
      totalExpected,
      totalReceived,
      progressPercentage,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <p>{t('common.noData')}</p>
      </div>
    );
  }

  const overview = calculateOverview();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/inbound')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground">
            {t('inbound.supplier')}: {order.supplier_name}
          </p>
        </div>
        <Badge variant={getStatusBadgeVariant(order.status)} className="text-base px-4 py-2">
          {t(`inbound.statuses.${order.status}`)}
        </Badge>
      </div>

      {/* Order Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inbound.details.orderInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('inbound.orderType')}
              </p>
              <p className="text-lg">
                {t(`inbound.orderTypes.${order.order_type}`)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('inbound.expectedDate')}
              </p>
              <p className="text-lg">
                {order.expected_date
                  ? new Date(order.expected_date).toLocaleDateString()
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('inbound.details.overview.progressPercentage')}
              </p>
              <p className="text-lg">{overview?.progressPercentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('inbound.details.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="lines">{t('inbound.details.tabs.lines')}</TabsTrigger>
          <TabsTrigger value="shipments">{t('inbound.details.tabs.shipments')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('inbound.details.overview.summary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('inbound.details.overview.totalLines')}
                  </p>
                  <p className="text-3xl font-bold">{overview?.totalLines}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('inbound.details.overview.completedLines')}
                  </p>
                  <p className="text-3xl font-bold">{overview?.completedLines}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('inbound.details.overview.totalExpected')}
                  </p>
                  <p className="text-3xl font-bold">{overview?.totalExpected}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('inbound.details.overview.totalReceived')}
                  </p>
                  <p className="text-3xl font-bold">{overview?.totalReceived}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lines Tab */}
        <TabsContent value="lines">
          <Card>
            <CardHeader>
              <CardTitle>{t('inbound.lines.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inbound.lines.product')}</TableHead>
                    <TableHead>{t('inbound.lines.uom')}</TableHead>
                    <TableHead>{t('inbound.lines.expectedQty')}</TableHead>
                    <TableHead>{t('inbound.lines.receivedQty')}</TableHead>
                    <TableHead>{t('inbound.lines.remainingQty')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines?.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.product_sku}</p>
                          <p className="text-sm text-muted-foreground">{line.product_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{line.uom_name}</TableCell>
                      <TableCell>{line.expected_quantity}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{line.received_quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            line.expected_quantity - line.received_quantity > 0
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {line.expected_quantity - line.received_quantity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipments Tab */}
        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('inbound.shipments.title')}</CardTitle>
                  <CardDescription>{t('inbound.shipments.title')}</CardDescription>
                </div>
                <Button onClick={() => setIsShipmentSheetOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('inbound.shipments.addShipment')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!order.shipments || order.shipments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('inbound.shipments.noShipments')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('inbound.shipments.shipmentNumber')}</TableHead>
                      <TableHead>{t('inbound.shipments.containerNumber')}</TableHead>
                      <TableHead>{t('inbound.shipments.driverName')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('inbound.shipments.arrivalDate')}</TableHead>
                      <TableHead>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-medium">
                          {shipment.shipment_number}
                        </TableCell>
                        <TableCell>{shipment.container_number || '-'}</TableCell>
                        <TableCell>{shipment.driver_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(shipment.status)}>
                            {t(`inbound.shipments.statuses.${shipment.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {shipment.arrival_date
                            ? new Date(shipment.arrival_date).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleReceiveShipment(shipment)}
                            disabled={shipment.status === 'COMPLETED'}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            {t('inbound.shipments.receiveShipment')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Shipment Sheet */}
      <Sheet open={isShipmentSheetOpen} onOpenChange={setIsShipmentSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('inbound.shipments.createShipment')}</SheetTitle>
            <SheetDescription>
              {t('inbound.shipments.createShipmentDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CreateShipmentForm
              onSubmit={createShipmentMutation.mutate}
              isLoading={createShipmentMutation.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Receiving Console Sheet */}
      <Sheet
        open={!!receivingShipment}
        onOpenChange={(open) => !open && setReceivingShipment(null)}
      >
        <SheetContent className="sm:max-w-[90vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('inbound.receiving.title')}</SheetTitle>
            <SheetDescription>
              {order.order_number} - {receivingShipment?.shipment_number}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {receivingShipment && (
              <ReceivingConsole
                order={order}
                shipment={receivingShipment}
                onReceive={receiveShipmentMutation.mutate}
                isLoading={receiveShipmentMutation.isPending}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
