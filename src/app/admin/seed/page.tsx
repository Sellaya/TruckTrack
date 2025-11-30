'use client';

// Seed database page for admin to populate database with test data
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SeedResult {
  success: boolean;
  message: string;
  data?: {
    units?: number;
    drivers?: number;
    trips?: number;
    transactions?: number;
    errors?: number;
    error?: string;
  };
}

export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsSeeding(true);
    setResult(null);

    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: SeedResult = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'Database seeded successfully!',
          description: data.message,
        });
      } else {
        toast({
          title: 'Seed completed with errors',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error seeding database:', error);
      const errorResult: SeedResult = {
        success: false,
        message: `Failed to seed database: ${error.message || error}`,
      };
      setResult(errorResult);
      toast({
        title: 'Failed to seed database',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Seed Database</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Populate the database with comprehensive dummy data for testing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Seeding</CardTitle>
          <CardDescription>
            This will populate your database with:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>6 Truck Units with varied data</li>
              <li>7 Drivers (6 active, 1 inactive for testing)</li>
              <li>14 Trips with various statuses (upcoming, ongoing, completed)</li>
              <li>50+ Transactions (expenses in CAD & USD, income entries)</li>
              <li>Full coverage of all fields and options</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSeed}
              disabled={isSeeding}
              size="lg"
              className="min-w-[200px]"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding Database...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Start Seeding
                </>
              )}
            </Button>
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>{result.success ? 'Seed Successful' : 'Seed Completed with Errors'}</AlertTitle>
              <AlertDescription>
                <p className="mb-2">{result.message}</p>
                {result.data && (
                  <div className="mt-3 space-y-1 text-sm">
                    {result.data.units !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Units: {result.data.units}</span>
                      </div>
                    )}
                    {result.data.drivers !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Drivers: {result.data.drivers}</span>
                      </div>
                    )}
                    {result.data.trips !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Trips: {result.data.trips}</span>
                      </div>
                    )}
                    {result.data.transactions !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Transactions: {result.data.transactions}</span>
                      </div>
                    )}
                    {result.data.errors !== undefined && result.data.errors > 0 && (
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Errors: {result.data.errors}</span>
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h3 className="font-semibold text-sm">What will be created:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Units:</p>
                <ul className="list-disc list-inside text-muted-foreground ml-2">
                  <li>Freightliner Cascadia</li>
                  <li>Kenworth T680</li>
                  <li>Peterbilt 579</li>
                  <li>Volvo VNL 860</li>
                  <li>International LT</li>
                  <li>Mack Anthem</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Drivers:</p>
                <ul className="list-disc list-inside text-muted-foreground ml-2">
                  <li>John Michael Smith</li>
                  <li>Jane Elizabeth Doe</li>
                  <li>Michael Robert Johnson</li>
                  <li>Sarah Anne Williams</li>
                  <li>David Christopher Brown</li>
                  <li>Emily Grace Martinez (inactive)</li>
                  <li>Robert James Taylor</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <p className="font-medium">Trips include:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2">
                <li>Completed trips with full expense records</li>
                <li>Ongoing trips with partial expenses</li>
                <li>Upcoming trips scheduled for future</li>
                <li>Expenses in both CAD and USD</li>
                <li>All expense categories (Fuel, Food, Lodging, Tolls, Maintenance, etc.)</li>
                <li>Income transactions for completed trips</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


