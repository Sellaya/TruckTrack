'use client';

import { TrendingDown, Truck, Calendar, BarChart3, Route, Package } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { getTransactions, getTrips, getUnits } from '@/lib/data';
import { useEffect, useState, useMemo } from 'react';
import type { Transaction, Trip, Unit } from '@/lib/types';
import { 
  convertCurrency, 
  getPrimaryCurrency, 
  getCADToUSDRate,
  getUSDToCADRate,
  formatCurrency
} from '@/lib/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { format, startOfMonth, subMonths } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const router = useRouter();
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [transactionsData, tripsData, unitsData] = await Promise.all([
          getTransactions(),
          getTrips(),
          getUnits(),
        ]);
        const expenses = (transactionsData || []).filter((t) => t.type === 'expense');
        setTransactions(expenses);
        setTrips(tripsData || []);
        setUnits(unitsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const primaryCurrency = getPrimaryCurrency();
  const cadToUsdRate = getCADToUSDRate();
  const usdToCadRate = getUSDToCADRate();

  // Calculate total expenses this month
  const expensesThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    
    return transactions
      .filter(t => {
        const expenseDate = new Date(t.date);
        return expenseDate >= monthStart;
      })
      .reduce((sum, t) => {
        const converted = convertCurrency(t.amount, t.originalCurrency, primaryCurrency, cadToUsdRate, usdToCadRate);
        return sum + converted;
      }, 0);
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

  // Top 5 most expensive trucks (by total expenses)
  const topTrucks = useMemo(() => {
    const truckExpenses: Record<string, { unit: Unit; total: number }> = {};
    
    units.forEach(unit => {
      const unitTrips = trips.filter(t => t.unitId === unit.id);
      const unitTripIds = unitTrips.map(t => t.id);
      const unitExpenses = transactions.filter(t => t.tripId && unitTripIds.includes(t.tripId));
      
      const total = unitExpenses.reduce((sum, t) => {
        const converted = convertCurrency(t.amount, t.originalCurrency, primaryCurrency, cadToUsdRate, usdToCadRate);
        return sum + converted;
      }, 0);
      
      if (total > 0) {
        truckExpenses[unit.id] = { unit, total };
      }
    });
    
    return Object.values(truckExpenses)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [units, trips, transactions, primaryCurrency, cadToUsdRate, usdToCadRate]);

  // Fuel expense trend (last 6 months)
  const fuelTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      months.push({
        month: format(monthDate, 'MMM'),
        fullMonth: format(monthDate, 'MMMM yyyy'),
        amount: 0,
      });
    }
    
    transactions
      .filter(t => t.category === 'Fuel')
      .forEach(t => {
        const expenseDate = new Date(t.date);
        const monthIndex = months.findIndex(m => {
          const monthDate = subMonths(new Date(), 5 - months.indexOf(m));
          return format(monthDate, 'MMM yyyy') === format(expenseDate, 'MMM yyyy');
        });
        
        if (monthIndex >= 0) {
          const converted = convertCurrency(t.amount, t.originalCurrency, primaryCurrency, cadToUsdRate, usdToCadRate);
          months[monthIndex].amount += converted;
        }
      });
    
    return months;
  }, [transactions, primaryCurrency, cadToUsdRate, usdToCadRate]);

  // Count active trips
  const activeTripsCount = useMemo(() => {
    const now = new Date();
    return trips.filter(t => {
      if (t.status === 'ongoing') return true;
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      return now >= start && now <= end;
    }).length;
  }, [trips]);

  // Total trucks count
  const totalTrucksCount = useMemo(() => {
    return units.length;
  }, [units]);

  // Active trips with total expense per trip
  const activeTripsWithExpenses = useMemo(() => {
    const activeTrips = trips.filter(t => t.status === 'ongoing' || (() => {
      const now = new Date();
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      return now >= start && now <= end;
    })());
    
    return activeTrips.map(trip => {
      const tripExpenses = transactions.filter(t => t.tripId === trip.id);
      const total = tripExpenses.reduce((sum, t) => {
        const converted = convertCurrency(t.amount, t.originalCurrency, primaryCurrency, cadToUsdRate, usdToCadRate);
        return sum + converted;
      }, 0);
      
      const unit = units.find(u => u.id === trip.unitId);
      
      return {
        trip,
        unit,
        totalExpenses: total,
        expenseCount: tripExpenses.length,
      };
    }).sort((a, b) => b.totalExpenses - a.totalExpenses);
  }, [trips, transactions, units, primaryCurrency, cadToUsdRate, usdToCadRate]);

  // Format with both currencies
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

  // Chart colors
  const CHART_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(142, 76%, 36%)',
    'hsl(221, 83%, 53%)',
    'hsl(280, 100%, 70%)',
    'hsl(0, 84%, 60%)',
    'hsl(38, 92%, 50%)',
  ];

  const categoryChartConfig = {
    amount: {
      label: 'Amount',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  const fuelTrendConfig = {
    amount: {
      label: 'Fuel Expenses',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Active Trips and Total Trucks */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Active Trips"
          value={activeTripsCount.toString()}
          icon={Route}
          description="currently running"
        />
        <StatCard
          title="Total Trucks"
          value={totalTrucksCount.toString()}
          icon={Package}
          description="in fleet"
        />
      </div>

      {/* Total Expenses This Month - CAD, USD, and Grand Total */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Total Expenses This Month
            </CardTitle>
            <CardDescription>Expenses for {format(new Date(), 'MMMM yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const now = new Date();
              const monthStart = startOfMonth(now);
              
              const expensesThisMonth = transactions.filter(t => {
                const expenseDate = new Date(t.date);
                return expenseDate >= monthStart;
              });

              const cadTotal = expensesThisMonth
                .filter(t => t.originalCurrency === 'CAD')
                .reduce((sum, t) => sum + t.amount, 0);
              
              const usdTotal = expensesThisMonth
                .filter(t => t.originalCurrency === 'USD')
                .reduce((sum, t) => sum + t.amount, 0);

              // Calculate grand total by converting to primary currency
              const cadInPrimary = convertCurrency(cadTotal, 'CAD', primaryCurrency, cadToUsdRate, usdToCadRate);
              const usdInPrimary = convertCurrency(usdTotal, 'USD', primaryCurrency, cadToUsdRate, usdToCadRate);
              const grandTotal = cadInPrimary + usdInPrimary;

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">CAD Total:</span>
                    <span className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(cadTotal, 'CAD')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">USD Total:</span>
                    <span className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(usdTotal, 'USD')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="text-sm font-semibold">Grand Total:</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(grandTotal, primaryCurrency)}</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Expenses by Category - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Breakdown of expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
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
                  <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fuel Expense Trend - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Expense Trend</CardTitle>
            <CardDescription>Last 6 months of fuel expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {fuelTrend.some(m => m.amount > 0) ? (
              <ChartContainer config={fuelTrendConfig} className="min-h-[300px] w-full">
                <LineChart data={fuelTrend}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
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
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.fullMonth;
                        }
                        return label;
                      }}
                    />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="var(--color-amount)" 
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-amount)', r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No fuel expense data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top 5 Most Expensive Trucks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Top 5 Most Expensive Trucks
            </CardTitle>
            <CardDescription>Trucks with highest total expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {topTrucks.length > 0 ? (
              <div className="space-y-4">
                {topTrucks.map((item, index) => (
                  <div key={item.unit.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push(`/units/${item.unit.id}/dashboard`)}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.unit.name}</p>
                        <p className="text-sm text-muted-foreground">{item.unit.licensePlate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">
                        {formatCurrency(item.total, primaryCurrency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {primaryCurrency === 'CAD' 
                          ? formatCurrency(convertCurrency(item.total, 'CAD', 'USD', cadToUsdRate, usdToCadRate), 'USD')
                          : formatCurrency(convertCurrency(item.total, 'USD', 'CAD', cadToUsdRate, usdToCadRate), 'CAD')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No truck expense data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Trips & Total Expense Per Trip */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Active Trips & Expenses
            </CardTitle>
            <CardDescription>Current trips with their total expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {activeTripsWithExpenses.length > 0 ? (
              <div className="space-y-3">
                {activeTripsWithExpenses.map((item) => (
                  <div key={item.trip.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium">{item.trip.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.trip.origin} → {item.trip.destination}
                        </p>
                        {item.unit && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Unit: {item.unit.name} ({item.unit.licensePlate})
                          </p>
                        )}
                      </div>
                      <Badge variant={item.trip.status === 'ongoing' ? 'default' : 'outline'}>
                        {item.trip.status === 'ongoing' ? 'Ongoing' : 'Active'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        {item.expenseCount} expense{item.expenseCount !== 1 ? 's' : ''}
                      </span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(item.totalExpenses, primaryCurrency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No active trips
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
