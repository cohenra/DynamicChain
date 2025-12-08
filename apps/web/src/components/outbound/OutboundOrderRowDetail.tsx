import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, ListChecks, AlertCircle } from 'lucide-react';
import type { OutboundOrder, AllocationStrategy } from '@/services/outboundService';
import {
  allocateOrder,
  releaseOrder,
  cancelOrder,
  acceptShortages,
  getStrategies,
  getStrategyForOrder,
  hasShortages,
  getStatusColor,
} from '@/services/outboundService';

interface OutboundOrderRowDetailProps {
  order: OutboundOrder;
  colSpan: number;
}

export function OutboundOrderRowDetail({ order, colSpan }: OutboundOrderRowDetailProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [strategies, setStrategies] = useState<AllocationStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch strategies on mount
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        setLoading(true);
        const data = await getStrategies();
        setStrategies(data);
      } catch (err) {
        console.error('Failed to load strategies:', err);
        setError('Failed to load allocation strategies');
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  // Action handlers
  const handleAllocate = async () => {
    setActionLoading('allocate');
    setError(null);

    try {
      // Automatically find strategy
      const strategy = getStrategyForOrder(order, strategies);

      if (!strategy) {
        setError('No active allocation strategy found');
        return;
      }

      await allocateOrder(order.id, { strategy_id: strategy.id });

      // Refresh order data
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to allocate inventory');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async () => {
    setActionLoading('release');
    setError(null);

    try {
      await releaseOrder(order.id);
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to release order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptShortages = async () => {
    setActionLoading('accept-shortages');
    setError(null);

    try {
      await acceptShortages(order.id);
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to accept shortages');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setActionLoading('cancel');
    setError(null);

    try {
      await cancelOrder(order.id);
      queryClient.invalidateQueries({ queryKey: ['outbound-orders'] });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  // Determine which actions are available
  const canAllocate = order.status === 'DRAFT' || order.status === 'VERIFIED';
  const canRelease = order.status === 'PLANNED' && !hasShortages(order);
  const canAcceptShortages = order.status === 'PLANNED' && hasShortages(order);
  const canCancel = !['SHIPPED', 'CANCELLED'].includes(order.status);

  return (
    <td colSpan={colSpan} className="p-0">
      <div className="bg-muted/50 p-4 border-t">
        {/* Action Bar */}
        <div className="mb-4 flex gap-2 items-start">
          {canAllocate && (
            <Button
              onClick={handleAllocate}
              disabled={actionLoading !== null}
              size="sm"
            >
              {actionLoading === 'allocate' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Allocate Inventory
            </Button>
          )}

          {canAcceptShortages && (
            <Button
              onClick={handleAcceptShortages}
              disabled={actionLoading !== null}
              size="sm"
              variant="outline"
            >
              {actionLoading === 'accept-shortages' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              Accept Shortages
            </Button>
          )}

          {canRelease && (
            <Button
              onClick={handleRelease}
              disabled={actionLoading !== null}
              size="sm"
              variant="default"
            >
              {actionLoading === 'release' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ListChecks className="h-4 w-4 mr-2" />
              )}
              Release to Picking
            </Button>
          )}

          {canCancel && (
            <Button
              onClick={handleCancel}
              disabled={actionLoading !== null}
              size="sm"
              variant="destructive"
              className="ml-auto"
            >
              {actionLoading === 'cancel' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Cancel Order
            </Button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="lines" className="w-full">
          <TabsList>
            <TabsTrigger value="lines">
              Lines ({order.lines.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Pick Tasks ({order.pick_tasks?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Order Lines */}
          <TabsContent value="lines" className="mt-4">
            {order.lines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No lines in this order
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Picked</TableHead>
                      <TableHead className="text-right">Packed</TableHead>
                      <TableHead className="text-right">Shipped</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">
                          {line.product ? (
                            <div>
                              <div className="font-semibold">{line.product.name}</div>
                              <div className="text-xs text-muted-foreground">{line.product.sku}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {line.uom ? line.uom.code : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(line.qty_ordered).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(line.qty_allocated).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(line.qty_picked).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(line.qty_packed).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(line.qty_shipped).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {line.line_status ? (
                            <Badge
                              variant={
                                line.line_status === 'ALLOCATED' ? 'default' :
                                line.line_status === 'PARTIAL' ? 'secondary' :
                                line.line_status === 'SHORT' ? 'destructive' :
                                'outline'
                              }
                            >
                              {line.line_status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {line.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Pick Tasks */}
          <TabsContent value="tasks" className="mt-4">
            {!order.pick_tasks || order.pick_tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pick tasks created yet
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task ID</TableHead>
                      <TableHead>From Location</TableHead>
                      <TableHead>To Location</TableHead>
                      <TableHead className="text-right">Qty to Pick</TableHead>
                      <TableHead className="text-right">Qty Picked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.pick_tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono text-sm">
                          #{task.id}
                        </TableCell>
                        <TableCell>
                          {task.from_location ? (
                            <div>
                              <div className="font-medium">{task.from_location.name}</div>
                              <div className="text-xs text-muted-foreground">
                                WH: {task.from_location.warehouse_id}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.to_location ? task.to_location.name : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(task.qty_to_pick).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(task.qty_picked).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.status === 'COMPLETED' ? 'default' :
                              task.status === 'IN_PROGRESS' ? 'secondary' :
                              task.status === 'SHORT' ? 'destructive' :
                              'outline'
                            }
                          >
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.assigned_to_user_id ? `User #${task.assigned_to_user_id}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </td>
  );
}
