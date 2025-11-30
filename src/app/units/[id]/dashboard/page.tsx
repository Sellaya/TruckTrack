'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getUnits, getTrips, getTransactions } from '@/lib/data';
import type { Unit, Trip, Transaction } from '@/lib/types';
import { format, startOfMonth, startOfYear } from 'date-fns';
import { ArrowLeft, Truck, Download, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import { formatCurrency, convertCurrency, getPrimaryCurrency, getCADToUSDRate, getUSDToCADRate } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

export default function UnitDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const unitId = params.id as string;
  const { toast } = useToast();

  const [unit, setUnit] = useState<Unit | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load unit
        const allUnits = await getUnits();
        const foundUnit = allUnits.find(u => u.id === unitId);
        if (!foundUnit) {
          toast({
            title: "Unit Not Found",
            description: "The requested truck could not be found.",
            variant: "destructive",
          });
          router.push('/units');
          return;
        }
        setUnit(foundUnit);

        // Load trips for this unit
        const allTrips = await getTrips();
        const unitTrips = allTrips.filter(t => t.unitId === unitId);
        setTrips(unitTrips);

        // Load transactions for trips of this unit
        const allTransactions = await getTransactions();
        const tripIds = unitTrips.map(t => t.id);
        const unitTransactions = allTransactions.filter(t => t.tripId && tripIds.includes(t.tripId));
        setTransactions(unitTransactions.filter(t => t.type === 'expense'));
      } catch (error) {
        console.error('Error loading unit dashboard:', error);
        toast({
          title: "Error",
          description: "Failed to load truck dashboard. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (unitId) {
      loadData();
    }
  }, [unitId, router, toast]);

  const primaryCurrency = getPrimaryCurrency();
  const cadToUsdRate = getCADToUSDRate();
  const usdToCadRate = getUSDToCADRate();

  // Calculate MTD and YTD expenses
  const { mtdExpenses, ytdExpenses } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const mtd = transactions
      .filter(t => {
        const expenseDate = new Date(t.date);
        return expenseDate >= monthStart;
      })
      .reduce((sum, t) => {
        const converted = convertCurrency(t.amount, t.originalCurrency, primaryCurrency, cadToUsdRate, usdToCadRate);
        return sum + converted;
      }, 0);

    const ytd = transactions
      .filter(t => {
        const expenseDate = new Date(t.date);
        return expenseDate >= yearStart;
      })
      .reduce((sum, t) => {
        const converted = convertCurrency(t.amount, t.originalCurrency, primaryCurrency, cadToUsdRate, usdToCadRate);
        return sum + converted;
      }, 0);

    return { mtdExpenses: mtd, ytdExpenses: ytd };
  }, [transactions, primaryCurrency, cadToUsdRate, usdToCadRate]);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    transactions.forEach(t => {
      const converted = convertCurrency(t.amount, t.originalCurrency, primaryCurrency, cadToUsdRate, usdToCadRate);
      categoryMap[t.category] = (categoryMap[t.category] || 0) + converted;
    });
    return Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, primaryCurrency, cadToUsdRate, usdToCadRate]);

  // Recent expenses (last 10)
  const recentExpenses = useMemo(() => {
    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions]);

  const formatDual = (value: number) => {
    const usdValue = primaryCurrency === 'USD' ? value : convertCurrency(value, 'CAD', 'USD', cadToUsdRate, usdToCadRate);
    const cadValue = primaryCurrency === 'CAD' ? value : convertCurrency(value, 'USD', 'CAD', cadToUsdRate, usdToCadRate);
    return {
      primary: formatCurrency(value, primaryCurrency),
      secondary: primaryCurrency === 'USD' 
        ? formatCurrency(cadValue, 'CAD')
        : formatCurrency(usdValue, 'USD'),
    };
  };

  const handleDownloadReport = () => {
    // Create CSV report
    const csvRows = [
      ['Truck Dashboard Report'],
      [`Truck: ${unit?.name} (${unit?.licensePlate})`],
      [`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`],
      [],
      ['Summary'],
      [`MTD Expenses,${formatCurrency(mtdExpenses, primaryCurrency)}`],
      [`YTD Expenses,${formatCurrency(ytdExpenses, primaryCurrency)}`],
      [],
      ['Expenses by Category'],
      ['Category,Amount'],
      ...expensesByCategory.map(e => [e.category, formatCurrency(e.amount, primaryCurrency)]),
      [],
      ['Recent Expenses'],
      ['Date,Description,Category,Amount,Currency,Trip'],
      ...recentExpenses.map(t => [
        format(new Date(t.date), 'MMM d, yyyy'),
        t.description,
        t.category,
        t.amount.toString(),
        t.originalCurrency,
        trips.find(tr => tr.id === t.tripId)?.name || 'N/A'
      ]),
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${unit?.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Truck dashboard report has been downloaded successfully.",
    });
  };

  const categoryChartConfig = {
    amount: {
      label: 'Amount',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading truck dashboard...</p>
      </div>
    );
  }

  if (!unit) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/units')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Truck className="h-8 w-8" />
              {unit.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              License Plate: {unit.licensePlate}
            </p>
          </div>
        </div>
        <Button onClick={handleDownloadReport}>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* MTD and YTD Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              MTD Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatDual(mtdExpenses).primary}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDual(mtdExpenses).secondary}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Month to Date ({format(new Date(), 'MMMM yyyy')})
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              YTD Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatDual(ytdExpenses).primary}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDual(ytdExpenses).secondary}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Year to Date ({format(new Date(), 'yyyy')})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses by Category Chart */}
      {expensesByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Expenses by Category
            </CardTitle>
            <CardDescription>Breakdown of expenses by category for this truck</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryChartConfig} className="min-h-[300px] w-full">
              <BarChart data={expensesByCategory}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value, primaryCurrency)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent 
                    indicator="dot"
                    formatter={(value) => formatCurrency(value as number, primaryCurrency)}
                  />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="amount" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Recent Expenses
          </CardTitle>
          <CardDescription>Last 10 expense transactions for this truck</CardDescription>
        </CardHeader>
        <CardContent>
          {recentExpenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExpenses.map((transaction) => {
                  const trip = trips.find(t => t.id === transaction.tripId);
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {trip ? (
                          <div className="text-sm">
                            <div className="font-medium">{trip.name}</div>
                            <div className="text-muted-foreground text-xs">
                              {trip.origin} → {trip.destination}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-red-600">
                            {formatCurrency(transaction.amount, transaction.originalCurrency)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {transaction.originalCurrency === 'CAD' 
                              ? formatCurrency(convertCurrency(transaction.amount, 'CAD', 'USD', cadToUsdRate, usdToCadRate), 'USD')
                              : formatCurrency(convertCurrency(transaction.amount, 'USD', 'CAD', cadToUsdRate, usdToCadRate), 'CAD')}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No expenses recorded for this truck yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}








