import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { inboundService, InboundOrderStatus } from '@/services/inboundService';
import { ReceiveItemDialog } from '@/components/Inbound/ReceiveItemForm';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  Package,
  Truck,
  Calendar,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface ReceiveDialogState {
  open: boolean;
  shipmentId: number | null;
  orderId: number | null;
  product: {
    id: number;
    sku: string;
    name: string;
  } | null;
  expectedQuantity: number;
  receivedQuantity: number;
}

// ============================================================
// STATUS BADGE
// ============================================================

function OrderStatusBadge({ status }: { status: InboundOrderStatus }) {
  const statusConfig = {
    [InboundOrderStatus.DRAFT]: {
      label: 'טיוטה',
      variant: 'secondary' as const,
      icon: FileText,
    },
    [InboundOrderStatus.CONFIRMED]: {
      label: 'מאושר',
      variant: 'default' as const,
      icon: CheckCircle2,
    },
    [InboundOrderStatus.PARTIALLY_RECEIVED]: {
      label: 'נקלט חלקית',
      variant: 'default' as const,
      icon: Package,
    },
    [InboundOrderStatus.COMPLETED]: {
      label: 'הושלם',
      variant: 'default' as const,
      icon: CheckCircle2,
    },
    [InboundOrderStatus.CANCELLED]: {
      label: 'בוטל',
      variant: 'destructive' as const,
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function InboundOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [receiveDialog, setReceiveDialog] = useState<ReceiveDialogState>({
    open: false,
    shipmentId: null,
    orderId: null,
    product: null,
    expectedQuantity: 0,
    receivedQuantity: 0,
  });

  // Fetch order details
  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['inbound-order', orderId],
    queryFn: () => inboundService.getOrder(Number(orderId)),
    enabled: !!orderId,
  });

  // Mock locations - in real app, fetch from API
  const mockLocations = [
    { id: 1, name: 'A-01-01', type: 'RECEIVING' },
    { id: 2, name: 'A-01-02', type: 'RECEIVING' },
    { id: 3, name: 'A-02-01', type: 'STORAGE' },
    { id: 4, name: 'B-01-01', type: 'RECEIVING' },
  ];

  // Open receive dialog
  const openReceiveDialog = (
    shipmentId: number,
    product: { id: number; sku: string; name: string },
    expectedQuantity: number,
    receivedQuantity: number
  ) => {
    setReceiveDialog({
      open: true,
      shipmentId,
      orderId: Number(orderId),
      product,
      expectedQuantity,
      receivedQuantity,
    });
  };

  // Close receive dialog
  const closeReceiveDialog = () => {
    setReceiveDialog({
      open: false,
      shipmentId: null,
      orderId: null,
      product: null,
      expectedQuantity: 0,
      receivedQuantity: 0,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6" dir="rtl">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="container mx-auto py-8" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              שגיאה
            </CardTitle>
            <CardDescription>לא ניתן לטעון את פרטי ההזמנה</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/inbound/orders')}>
              <ChevronLeft className="ml-2 h-4 w-4" />
              חזרה לרשימת הזמנות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/inbound/orders')}
            >
              <ChevronLeft className="ml-2 h-4 w-4" />
              חזרה
            </Button>
            <h1 className="text-3xl font-bold">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground">הזמנה נכנסת - {order.order_type}</p>
        </div>
      </div>

      {/* Order Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            פרטי הזמנה
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">מספר הזמנה</p>
            <p className="font-semibold">{order.order_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">סוג</p>
            <p className="font-semibold">{order.order_type}</p>
          </div>
          {order.reference_number && (
            <div>
              <p className="text-sm text-muted-foreground">מספר התייחסות</p>
              <p className="font-semibold">{order.reference_number}</p>
            </div>
          )}
          {order.expected_arrival_date && (
            <div>
              <p className="text-sm text-muted-foreground">תאריך הגעה צפוי</p>
              <p className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(order.expected_arrival_date).toLocaleDateString('he-IL')}
              </p>
            </div>
          )}
          {order.notes && (
            <div className="col-span-full">
              <p className="text-sm text-muted-foreground">הערות</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            פריטים בהזמנה
          </CardTitle>
          <CardDescription>
            סה"כ {order.lines?.length || 0} פריטים
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">מוצר</TableHead>
                <TableHead className="text-right">SKU</TableHead>
                <TableHead className="text-right">כמות צפויה</TableHead>
                <TableHead className="text-right">כמות שנקלטה</TableHead>
                <TableHead className="text-right">יתרה</TableHead>
                <TableHead className="text-right">התקדמות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines?.map((line) => {
                const remaining = line.expected_quantity - line.received_quantity;
                const progress = Math.round(
                  (line.received_quantity / line.expected_quantity) * 100
                );

                return (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">
                      {line.product?.name || 'N/A'}
                    </TableCell>
                    <TableCell>{line.product?.sku || 'N/A'}</TableCell>
                    <TableCell>{line.expected_quantity}</TableCell>
                    <TableCell>
                      <Badge variant={progress === 100 ? 'default' : 'secondary'}>
                        {line.received_quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {remaining > 0 ? (
                        <span className="text-orange-600 font-semibold">
                          {remaining}
                        </span>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          הושלם
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground min-w-[3rem]">
                          {progress}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Shipments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            משלוחים
          </CardTitle>
          <CardDescription>
            {order.shipments?.length || 0} משלוחים עבור הזמנה זו
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.shipments?.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              אין משלוחים עדיין
            </p>
          )}

          {order.shipments?.map((shipment) => (
            <Card key={shipment.id} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {shipment.shipment_number}
                    </CardTitle>
                    <CardDescription>
                      {shipment.container_number && `מכולה: ${shipment.container_number}`}
                    </CardDescription>
                  </div>
                  <Badge>{shipment.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Shipment Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {shipment.driver_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">נהג</p>
                      <p className="font-semibold">{shipment.driver_name}</p>
                    </div>
                  )}
                  {shipment.truck_license_plate && (
                    <div>
                      <p className="text-sm text-muted-foreground">רישוי רכב</p>
                      <p className="font-semibold">{shipment.truck_license_plate}</p>
                    </div>
                  )}
                  {shipment.expected_arrival_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">הגעה צפויה</p>
                      <p className="font-semibold">
                        {new Date(shipment.expected_arrival_date).toLocaleDateString(
                          'he-IL'
                        )}
                      </p>
                    </div>
                  )}
                  {shipment.actual_arrival_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">הגעה בפועל</p>
                      <p className="font-semibold">
                        {new Date(shipment.actual_arrival_date).toLocaleDateString(
                          'he-IL'
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Receive Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">מוצר</TableHead>
                        <TableHead className="text-right">SKU</TableHead>
                        <TableHead className="text-right">צפוי</TableHead>
                        <TableHead className="text-right">נקלט</TableHead>
                        <TableHead className="text-right">יתרה</TableHead>
                        <TableHead className="text-right w-[150px]">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.lines?.map((line) => {
                        const remaining =
                          line.expected_quantity - line.received_quantity;
                        const canReceive = remaining > 0;

                        return (
                          <TableRow key={line.id}>
                            <TableCell className="font-medium">
                              {line.product?.name || 'N/A'}
                            </TableCell>
                            <TableCell>{line.product?.sku || 'N/A'}</TableCell>
                            <TableCell>{line.expected_quantity}</TableCell>
                            <TableCell>{line.received_quantity}</TableCell>
                            <TableCell>
                              <Badge variant={canReceive ? 'secondary' : 'default'}>
                                {remaining}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                disabled={!canReceive}
                                onClick={() =>
                                  line.product &&
                                  openReceiveDialog(
                                    shipment.id,
                                    {
                                      id: line.product_id,
                                      sku: line.product.sku,
                                      name: line.product.name,
                                    },
                                    line.expected_quantity,
                                    line.received_quantity
                                  )
                                }
                              >
                                <Download className="ml-2 h-4 w-4" />
                                קלוט
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Receive Item Dialog */}
      {receiveDialog.product && (
        <ReceiveItemDialog
          open={receiveDialog.open}
          onOpenChange={(open) => {
            if (!open) closeReceiveDialog();
          }}
          shipmentId={receiveDialog.shipmentId!}
          orderId={receiveDialog.orderId!}
          product={receiveDialog.product}
          expectedQuantity={receiveDialog.expectedQuantity}
          receivedQuantity={receiveDialog.receivedQuantity}
          locations={mockLocations}
          onSuccess={() => {
            closeReceiveDialog();
          }}
        />
      )}
    </div>
  );
}