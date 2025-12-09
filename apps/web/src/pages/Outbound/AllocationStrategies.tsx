import { useQuery } from '@tanstack/react-query';
import { getStrategies } from '@/services/outboundService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function AllocationStrategies() {
  const { data: strategies, isLoading } = useQuery({
    queryKey: ['allocation-strategies'],
    queryFn: () => getStrategies(),
  });

  if (isLoading) return <div>טוען אסטרטגיות...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">אסטרטגיות הקצאה</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {strategies?.map((strategy) => (
          <Card key={strategy.id} className="border-t-4 border-t-blue-500 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{strategy.name}</CardTitle>
                <Badge variant={strategy.is_active ? 'default' : 'secondary'}>
                  {strategy.is_active ? 'פעיל' : 'לא פעיל'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{strategy.description || 'ללא תיאור'}</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <div className="font-semibold">סוג ליקוט:</div>
                <div>{strategy.picking_type}</div>
                
                <div className="font-semibold">מדיניות הקצאה:</div>
                <div>{strategy.rules_config.picking_policy || 'N/A'}</div>

                <div className="font-semibold">פיצול מחסנים:</div>
                <div>
                    {strategy.rules_config.warehouse_logic ? (
                        <span className="flex flex-col">
                            <span>מצב: {strategy.rules_config.warehouse_logic.mode}</span>
                            <span>מקסימום פיצולים: {strategy.rules_config.warehouse_logic.max_splits}</span>
                        </span>
                    ) : 'לא מוגדר'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}