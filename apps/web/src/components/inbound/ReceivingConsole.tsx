import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InboundOrder, InboundShipment, ReceiveShipmentRequest } from '@/services/inbound';
import { locationService } from '@/services/locations';
import { Loader2, Package, Truck, User, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReceivingItem {
  product_id: number;
  product_sku: string;
  product_name: string;
  uom_id: number;
  uom_name: string;
  remaining_quantity: number;
  quantity_to_receive: number;
  location_id: number | null;
  lpn: string;
  batch_number: string;
  expiry_date: string;
}

interface ReceivingConsoleProps {
  order: InboundOrder;
  shipment: InboundShipment;
  onReceive: (data: ReceiveShipmentRequest) => void;
  isLoading?: boolean;
}

export function ReceivingConsole({
  order,
  shipment,
  onReceive,
  isLoading,
}: ReceivingConsoleProps) {
  const { t } = useTranslation();

  // Initialize receiving items from order lines
  const initialItems: ReceivingItem[] = useMemo(() => {
    return (
      order.lines
        ?.filter((line) => line.expected_quantity > line.received_quantity)
        .map((line) => ({
          product_id: line.product_id,
          product_sku: line.product_sku || '',
          product_name: line.product_name || '',
          uom_id: line.uom_id,
          uom_name: line.uom_name || '',
          remaining_quantity: line.expected_quantity - line.received_quantity,
          quantity_to_receive: 0,
          location_id: null,
          lpn: '',
          batch_number: '',
          expiry_date: '',
        })) || []
    );
  }, [order.lines]);

  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>(initialItems);

  // Fetch locations
  const { data: locations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getLocations(),
  });

  const updateItem = (index: number, field: keyof ReceivingItem, value: any) => {
    setReceivingItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = () => {
    const itemsToReceive = receivingItems.filter(
      (item) => item.quantity_to_receive > 0 && item.location_id
    );

    if (itemsToReceive.length === 0) {
      return;
    }

    const data: ReceiveShipmentRequest = {
      shipment_id: shipment.id,
      items: itemsToReceive.map((item) => ({
        product_id: item.product_id,
        uom_id: item.uom_id,
        quantity: item.quantity_to_receive,
        location_id: item.location_id!,
        lpn: item.lpn || undefined,
        batch_number: item.batch_number || undefined,
        expiry_date: item.expiry_date || undefined,
      })),
    };

    onReceive(data);
  };

  const canSubmit = receivingItems.some(
    (item) => item.quantity_to_receive > 0 && item.location_id
  );

  const hasValidationErrors = receivingItems.some(
    (item) =>
      item.quantity_to_receive > 0 &&
      (item.quantity_to_receive > item.remaining_quantity || !item.location_id)
  );

  return (
    <div className="space-y-6">
      {/* Shipment Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inbound.receiving.shipmentInfo')}</CardTitle>
          <CardDescription>
            {t('inbound.orderNumber')}: {order.order_number}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('inbound.shipments.shipmentNumber')}</p>
                <p className="text-sm text-muted-foreground">{shipment.shipment_number}</p>
              </div>
            </div>
            {shipment.container_number && (
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {t('inbound.shipments.containerNumber')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.container_number}
                  </p>
                </div>
              </div>
            )}
            {shipment.driver_name && (
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('inbound.shipments.driverName')}</p>
                  <p className="text-sm text-muted-foreground">{shipment.driver_name}</p>
                </div>
              </div>
            )}
            {shipment.driver_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('inbound.shipments.driverPhone')}</p>
                  <p className="text-sm text-muted-foreground">{shipment.driver_phone}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receiving Grid */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inbound.receiving.itemsToReceive')}</CardTitle>
        </CardHeader>
        <CardContent>
          {receivingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('inbound.receiving.noItemsToReceive')}
            </div>
          ) : isLoadingLocations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inbound.lines.product')}</TableHead>
                    <TableHead>{t('inbound.lines.uom')}</TableHead>
                    <TableHead>{t('inbound.receiving.fields.remaining')}</TableHead>
                    <TableHead>{t('inbound.receiving.quantityToReceive')}</TableHead>
                    <TableHead>{t('inbound.receiving.location')}</TableHead>
                    <TableHead>{t('inbound.receiving.lpn')}</TableHead>
                    <TableHead>{t('inbound.receiving.batch')}</TableHead>
                    <TableHead>{t('inbound.receiving.expiry')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivingItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_sku}</p>
                          <p className="text-sm text-muted-foreground">{item.product_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.uom_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.remaining_quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={item.remaining_quantity}
                          value={item.quantity_to_receive || ''}
                          onChange={(e) =>
                            updateItem(index, 'quantity_to_receive', parseFloat(e.target.value) || 0)
                          }
                          placeholder={t('inbound.receiving.fields.enterQuantity')}
                          className={
                            item.quantity_to_receive > item.remaining_quantity
                              ? 'border-destructive'
                              : ''
                          }
                        />
                        {item.quantity_to_receive > item.remaining_quantity && (
                          <p className="text-xs text-destructive mt-1">
                            {t('inbound.receiving.validation.quantityExceedsRemaining')}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.location_id?.toString() || ''}
                          onValueChange={(value) =>
                            updateItem(index, 'location_id', parseInt(value))
                          }
                          disabled={item.quantity_to_receive <= 0}
                        >
                          <SelectTrigger
                            className={
                              item.quantity_to_receive > 0 && !item.location_id
                                ? 'border-destructive'
                                : ''
                            }
                          >
                            <SelectValue
                              placeholder={t('inbound.receiving.validation.selectLocation')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {locations?.map((location) => (
                              <SelectItem key={location.id} value={location.id.toString()}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.lpn}
                          onChange={(e) => updateItem(index, 'lpn', e.target.value)}
                          placeholder={t('inbound.receiving.validation.lpnOptional')}
                          disabled={item.quantity_to_receive <= 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.batch_number}
                          onChange={(e) => updateItem(index, 'batch_number', e.target.value)}
                          placeholder={t('inbound.receiving.validation.batchOptional')}
                          disabled={item.quantity_to_receive <= 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                          placeholder={t('inbound.receiving.validation.expiryOptional')}
                          disabled={item.quantity_to_receive <= 0}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || hasValidationErrors || isLoading}
          size="lg"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading
            ? t('inbound.receiving.receiving')
            : t('inbound.receiving.executeReceiving')}
        </Button>
      </div>
    </div>
  );
}
