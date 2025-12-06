import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { inboundService, InboundOrderStatus } from '@/services/inboundService';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Plus,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

// ============================================================
// STATUS BADGE
// ============================================================

function OrderStatusBadge({ status }: { status: InboundOrderStatus }) {
  const statusConfig = {
    [InboundOrderStatus.DRAFT]: {
      label: 'טיוטה',
      variant: 'secondary' as const,
    },
    [InboundOrderStatus.CONFIRMED]: {
      label: 'מאושר',
      variant: 'default' as const,
    },
    [InboundOrderStatus.PARTIALLY_RECEIVED]: {
      label: 'נקלט חלקית',
      variant: 'default' as const,
    },
    [InboundOrderStatus.COMPLETED]: {
      label: 'הושלם',
      variant: 'default' as const,
    },
    [InboundOrderStatus.CANCELLED]: {
      label: 'בוטל',
      variant: 'destructive' as const,
    },
  };

  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function InboundOrdersList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<InboundOrderStatus | 'ALL'>(
    'ALL'
  );

  // Fetch orders
  const {
    data: orders,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['inbound-orders', statusFilter],
    queryFn: () =>
      inboundService.listOrders({
        status_filter: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

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
  if (error) {
    return (
      <div className="container mx-auto py-8" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              שגיאה
            </CardTitle>
            <CardDescription>לא ניתן לטעון את רשימת ההזמנות</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            הזמנות נכנסות
          </h1>
          <p className="text-muted-foreground">
            ניהול הזמנות נכנסות ומשלוחים
          </p>
        </div>
        <Button onClick={() => navigate('/inbound/orders/new')}>
          <Plus className="ml-2 h-4 w-4" />
          הזמנה חדשה
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                סינון לפי סטטוס
              </label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as InboundOrderStatus | 'ALL')
                }
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">הכל</SelectItem>
                  <SelectItem value={InboundOrderStatus.DRAFT}>טיוטה</SelectItem>
                  <SelectItem value={InboundOrderStatus.CONFIRMED}>
                    מאושר
                  </SelectItem>
                  <SelectItem value={InboundOrderStatus.PARTIALLY_RECEIVED}>
                    נקלט חלקית
                  </SelectItem>
                  <SelectItem value={InboundOrderStatus.COMPLETED}>
                    הושלם
                  </SelectItem>
                  <SelectItem value={InboundOrderStatus.CANCELLED}>
                    בוטל
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              סה"כ {orders?.length || 0} הזמנות
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            רשימת הזמנות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders?.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">אין הזמנות</h3>
              <p className="text-muted-foreground mb-4">
                התחל על ידי יצירת הזמנה חדשה
              </p>
              <Button onClick={() => navigate('/inbound/orders/new')}>
                <Plus className="ml-2 h-4 w-4" />
                הזמנה חדשה
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מספר הזמנה</TableHead>
                  <TableHead className="text-right">סוג</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך הגעה צפוי</TableHead>
                  <TableHead className="text-right">פריטים</TableHead>
                  <TableHead className="text-right">משלוחים</TableHead>
                  <TableHead className="text-right">התקדמות</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order) => {
                  const totalExpected = order.lines?.reduce(
                    (sum, line) => sum + line.expected_quantity,
                    0
                  ) || 0;
                  const totalReceived = order.lines?.reduce(
                    (sum, line) => sum + line.received_quantity,
                    0
                  ) || 0;
                  const progress =
                    totalExpected > 0
                      ? Math.round((totalReceived / totalExpected) * 100)
                      : 0;

                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/inbound/orders/${order.id}`)}
                    >
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>{order.order_type}</TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        {order.expected_arrival_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(
                              order.expected_arrival_date
                            ).toLocaleDateString('he-IL')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {order.lines?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {order.shipments?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden w-24">
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
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/inbound/orders/${order.id}`);
                          }}
                        >
                          <ArrowRight className="ml-2 h-4 w-4" />
                          פתח
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}