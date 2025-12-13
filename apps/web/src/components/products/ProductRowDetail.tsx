import { Product } from '@/services/products';
import { useTranslation } from 'react-i18next';
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
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ProductRowDetailProps {
  product: Product;
  colSpan: number;
}

export function ProductRowDetail({ product }: ProductRowDetailProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  // Sort UOMs by conversion factor
  const sortedUoms = [...(product.uoms || [])].sort(
    (a, b) => a.conversion_factor - b.conversion_factor
  );

  // Format dimensions
  const formatDimensions = (length: number | null, width: number | null, height: number | null) => {
    if (!length && !width && !height) return '-';
    const l = length?.toFixed(1) || '-';
    const w = width?.toFixed(1) || '-';
    const h = height?.toFixed(1) || '-';
    return `${l} × ${w} × ${h}`;
  };

  // FIX: Removed outer <td> as SmartTable already wraps this in a <td colSpan>
  return (
    <div className="bg-muted/50 p-2 border-t text-xs">
      <Tabs defaultValue="uoms" className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList className="h-8">
          <TabsTrigger value="uoms" className="text-xs">{t('products.tabs.packaging', 'אריזות')}</TabsTrigger>
          <TabsTrigger value="details" className="text-xs">{t('products.tabs.details', 'פרטים נוספים')}</TabsTrigger>
        </TabsList>

        {/* Tab 1: UOMs/Packaging */}
        <TabsContent value="uoms" className="mt-2">
          {sortedUoms.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {t('products.noUoms', 'לא הוגדרו אריזות למוצר זה')}
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="text-right h-8 text-xs">{t('products.uomName', 'שם יחידה')}</TableHead>
                    <TableHead className="text-right h-8 text-xs">{t('products.conversionFactor', 'יחס המרה')}</TableHead>
                    <TableHead className="text-left h-8 text-xs">{t('products.barcode', 'ברקוד')}</TableHead>
                    <TableHead className="text-center h-8 text-xs">{t('products.dimensions', 'מידות (ס״מ)')}</TableHead>
                    <TableHead className="text-center h-8 text-xs">{t('products.volume', 'נפח (סמ״ק)')}</TableHead>
                    <TableHead className="text-center h-8 text-xs">{t('products.weight', 'משקל (ק״ג)')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUoms.map((uom) => (
                    <TableRow key={uom.id} className="h-8">
                      <TableCell className="font-medium text-right text-xs p-2">
                        {uom.uom_name} ({uom.uom_code})
                      </TableCell>
                      <TableCell className="text-right text-xs p-2">
                        <Badge variant="secondary" className="text-[10px]">{uom.conversion_factor}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-left text-xs p-2">
                        {uom.barcode || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs p-2">
                        {formatDimensions(uom.length, uom.width, uom.height)}
                      </TableCell>
                      <TableCell className="text-center text-xs p-2">
                        {uom.volume ? uom.volume.toFixed(2) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center text-xs p-2">
                        {uom.weight ? uom.weight.toFixed(2) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Additional Details */}
        <TabsContent value="details" className="mt-2">
          <div className="bg-white rounded-lg border p-4 space-y-4">
            {/* Custom Attributes */}
            <div>
              <h4 className="font-semibold mb-2 text-right text-xs">
                {t('products.customAttributes', 'תכונות מותאמות אישית')}
              </h4>
              {product.custom_attributes && Object.keys(product.custom_attributes).length > 0 ? (
                <div className="flex flex-wrap gap-2" dir="rtl">
                  {Object.entries(product.custom_attributes).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-[10px]">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs text-right">
                  {t('products.noCustomAttributes', 'אין תכונות מותאמות אישית')}
                </p>
              )}
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('products.createdAt', 'נוצר בתאריך')}
                </p>
                <p className="font-medium text-xs">
                  {format(new Date(product.created_at), 'PPp', { locale: isRTL ? he : undefined })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('products.updatedAt', 'עודכן בתאריך')}
                </p>
                <p className="font-medium text-xs">
                  {format(new Date(product.updated_at), 'PPp', { locale: isRTL ? he : undefined })}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}