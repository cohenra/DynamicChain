import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">דשבורד</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>ברוכים הבאים ל-LogiSnap</CardTitle>
            <CardDescription>מערכת ניהול מחסנים מתקדמת</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              שלב 1 הושלם בהצלחה - מערכת האימות והתשתית הבסיסית מוכנות לשימוש
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>סטטוס מערכת</CardTitle>
            <CardDescription>מידע כללי</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">גרסה:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">סטטוס:</span>
                <span className="font-medium text-green-600">פעיל</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>שלבים הבאים</CardTitle>
            <CardDescription>מה בהמשך?</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• שלב 2: WMS Core</li>
              <li>• שלב 3: מנוע חיוב</li>
              <li>• שלב 4: שיפורים</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
