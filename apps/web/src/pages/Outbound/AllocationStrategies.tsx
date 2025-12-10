import { useQuery } from '@tanstack/react-query';
import { getStrategies } from '@/services/outboundService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';

export default function AllocationStrategies() {
  const { t } = useTranslation();
  const { data: strategies, isLoading } = useQuery({
    queryKey: ['allocation-strategies'],
    queryFn: () => getStrategies(),
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('outbound.strategies', 'אסטרטגיות הקצאה')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {strategies?.map((strategy) => (
          <Card key={strategy.id} className="border-t-4 border-t-blue-500 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{strategy.name}</CardTitle>
                <Badge variant={strategy.is_active ? 'default' : 'secondary'}>
                  {strategy.is_active ? t('dashboard.active') : t('common.inactive', 'לא פעיל')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{strategy.description || '-'}</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <div className="font-semibold">{t('outbound.pickingType', 'סוג ליקוט')}:</div>
                <div>{strategy.picking_type}</div>
                
                <div className="font-semibold">{t('outbound.allocationPolicy', 'מדיניות הקצאה')}:</div>
                <div>{strategy.rules_config.picking_policy || 'N/A'}</div>

                <div className="font-semibold">{t('outbound.warehouseLogic', 'פיצול מחסנים')}:</div>
                <div>
                    {strategy.rules_config.warehouse_logic ? (
                        <span className="flex flex-col">
                            <span>Mode: {strategy.rules_config.warehouse_logic.mode}</span>
                            <span>Max Splits: {strategy.rules_config.warehouse_logic.max_splits}</span>
                        </span>
                    ) : t('common.notDefined', 'לא מוגדר')}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}