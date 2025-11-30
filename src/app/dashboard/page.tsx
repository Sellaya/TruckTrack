'use client';

import { TrendingDown, Truck, Calendar, BarChart3, Route, Package, Filter, DollarSign, TrendingUp, Clock, MapPin, User, ArrowRight, FileText } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { getTransactions, getTrips, getUnits, getDrivers } from '@/lib/data';
import { useEffect, useState, useMemo } from 'react';
import type { Transaction, Trip, Unit } from '@/lib/types';
import { AdminRouteGuard } from '@/components/admin-route-guard';
import {
  convertCurrency, 
  getPrimaryCurrency, 
  getCADToUSDRate,
  getUSDToCADRate,
  formatCurrency
} from '@/lib/currency';
import { GrandTotalDisplay, CurrencyDisplay } from '@/components/ui/currency-display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardContent() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Date range filter for expenses
  const [expenseStartDate, setExpenseStartDate] = useState('');
  const [expenseEndDate, setExpenseEndDate] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [transactionsData, tripsData, unitsData, driversData] = await Promise.all([
          getTransactions(),
          getTrips(),
          getUnits(),
          getDrivers(),
        ]);
        const expenses = (transactionsData || []).filter((t) => t.type === 'expense');
        setTransactions(expenses);
        setTrips(tripsData || []);
        setUnits(unitsData || []);
        setDrivers(driversData || []);
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

  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    let filtered = [...transactions];
    
    if (expenseStartDate) {
      const startDate = new Date(expenseStartDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => {
        const expenseDate = new Date(t.date);
        expenseDate.setHours(0, 0, 0, 0);
        return expenseDate >= startDate;
      });
    }
    
    if (expenseEndDate) {
      const endDate = new Date(expenseEndDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        const expenseDate = new Date(t.date);
        expenseDate.setHours(23, 59, 59, 999);
        return expenseDate <= endDate;
      });
    }
    
    return filtered;
  }, [transactions, expenseStartDate, expenseEndDate]);
  
  // Calculate total expenses for selected date range (or current month if no filter)
  const expensesThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    
    const expensesToUse = (expenseStartDate || expenseEndDate) 
      ? filteredExpenses
      : transactions.filter(t => {
          const expenseDate = new Date(t.date);
          return expenseDate >= monthStart;
        });
    
    return expensesToUse.reduce((sum, t) => {
      const converted = convertCurrency(t.amount, t.originalCurrency, primaryCurrency, cadToUsdRate, usdToCadRate);
      return sum + converted;
    }, 0);
  }, [transactions, filteredExpenses, expenseStartDate, expenseEndDate, primaryCurrency, cadToUsdRate, usdToCadRate]);

  // Top 5 most expensive trucks
  const topTrucks = useMemo(() => {
    const expensesToUse = (expenseStartDate || expenseEndDate) ? filteredExpenses : transactions;
    const truckExpenses: Record<string, { unit: Unit; total: number }> = {};
    
    units.forEach(unit => {
      const unitTrips = trips.filter(t => t.unitId === unit.id);
      const unitTripIds = unitTrips.map(t => t.id);
      const unitExpenses = expensesToUse.filter(t => t.tripId && unitTripIds.includes(t.tripId));
      
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
  }, [units, trips, transactions, filteredExpenses, expenseStartDate, expenseEndDate, primaryCurrency, cadToUsdRate, usdToCadRate]);

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
    const expensesToUse = (expenseStartDate || expenseEndDate) ? filteredExpenses : transactions;
    const activeTrips = trips.filter(t => t.status === 'ongoing' || (() => {
      const now = new Date();
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      return now >= start && now <= end;
    })());
    
    return activeTrips.map(trip => {
      const tripExpenses = expensesToUse.filter(t => t.tripId === trip.id);
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
  }, [trips, transactions, filteredExpenses, expenseStartDate, expenseEndDate, units, primaryCurrency, cadToUsdRate, usdToCadRate]);

  // Recent expenses (last 5)
  const recentExpenses = useMemo(() => {
    const expensesToUse = (expenseStartDate || expenseEndDate) ? filteredExpenses : transactions;
    return expensesToUse
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions, filteredExpenses, expenseStartDate, expenseEndDate]);

  // Upcoming trips (starting in next 7 days)
  const upcomingTrips = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return trips
      .filter(trip => {
        if (!trip.startDate) return false;
        const startDate = new Date(trip.startDate);
        return startDate > now && startDate <= sevenDaysFromNow;
      })
      .sort((a, b) => {
        const aDate = new Date(a.startDate || 0).getTime();
        const bDate = new Date(b.startDate || 0).getTime();
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [trips]);

  // Helper to get driver name
  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || 'Unknown Driver';
  };

  // Helper to get unit name
  const getUnitName = (unitId?: string) => {
    if (!unitId) return 'Unassigned';
    const unit = units.find(u => u.id === unitId);
    return unit?.name || 'Unknown Unit';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate expense totals
  const expensesToShow = (expenseStartDate || expenseEndDate) 
    ? filteredExpenses
    : (() => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        return transactions.filter(t => {
          const expenseDate = new Date(t.date);
          return expenseDate >= monthStart;
        });
      })();

  const cadTotal = expensesToShow
    .filter(t => t.originalCurrency === 'CAD')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const usdTotal = expensesToShow
    .filter(t => t.originalCurrency === 'USD')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your fleet operations and expenses
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTripsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently running</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trucks</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrucksCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In fleet</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(expensesThisMonth, primaryCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenseStartDate || expenseEndDate ? 'Filtered period' : format(new Date(), 'MMMM yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter - Minimalistic */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Date Range Filter</CardTitle>
              <CardDescription className="text-xs mt-1">
                Filter expenses across all sections below
              </CardDescription>
            </div>
            {(expenseStartDate || expenseEndDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExpenseStartDate('');
                  setExpenseEndDate('');
                }}
                className="h-8 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="expenseStartDate" className="text-xs font-medium">
                Start Date
              </Label>
              <DatePicker
                id="expenseStartDate"
                value={expenseStartDate}
                onChange={setExpenseStartDate}
                placeholder="Select start date"
                minDate={new Date(1900, 0, 1)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseEndDate" className="text-xs font-medium">
                End Date
              </Label>
              <DatePicker
                id="expenseEndDate"
                value={expenseEndDate}
                onChange={setExpenseEndDate}
                placeholder="Select end date"
                minDate={expenseStartDate ? new Date(expenseStartDate) : new Date(1900, 0, 1)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {expenseStartDate || expenseEndDate ? 'Expense Summary' : 'Monthly Expense Summary'}
          </CardTitle>
          <CardDescription>
            {expenseStartDate || expenseEndDate ? (
              <>
                From {expenseStartDate ? format(new Date(expenseStartDate), 'MMM d, yyyy') : 'beginning'} to{' '}
                {expenseEndDate ? format(new Date(expenseEndDate), 'MMM d, yyyy') : 'end'}
              </>
            ) : (
              `Expenses for ${format(new Date(), 'MMMM yyyy')}`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GrandTotalDisplay
            cadAmount={cadTotal}
            usdAmount={usdTotal}
            primaryCurrency={primaryCurrency}
            cadToUsdRate={cadToUsdRate}
            usdToCadRate={usdToCadRate}
          />
        </CardContent>
      </Card>

      {/* Useful Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Expenses</CardTitle>
              <CardDescription className="text-xs">Latest expense transactions</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/trips')}
              className="h-8 text-xs"
            >
              View All
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {recentExpenses.map((expense) => {
                  const trip = trips.find(t => t.id === expense.tripId);
                  const unit = units.find(u => u.id === expense.unitId);
                  const driver = drivers.find(d => d.id === expense.driverId);
                  
                  return (
                    <div 
                      key={expense.id}
                      className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <div className="p-1.5 rounded-md bg-muted group-hover:bg-primary/10 transition-colors mt-0.5">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{expense.description}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {expense.category && (
                                <Badge variant="outline" className="text-xs h-5 px-2">
                                  {expense.category}
                                </Badge>
                              )}
                              {trip && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {trip.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(expense.date), 'MMM d, yyyy')}
                              </span>
                              {unit && (
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  {unit.name}
                                </span>
                              )}
                              {driver && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {driver.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <CurrencyDisplay
                          amount={expense.amount}
                          originalCurrency={expense.originalCurrency}
                          variant="compact"
                          showLabel={false}
                          cadToUsdRate={cadToUsdRate}
                          usdToCadRate={usdToCadRate}
                          className="items-end font-semibold"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No expenses recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Trips */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Upcoming Trips</CardTitle>
              <CardDescription className="text-xs">Trips starting in the next 7 days</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/trips')}
              className="h-8 text-xs"
            >
              View All
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingTrips.length > 0 ? (
              <div className="space-y-3">
                {upcomingTrips.map((trip) => {
                  const unit = units.find(u => u.id === trip.unitId);
                  const driver = drivers.find(d => d.id === trip.driverId);
                  const startDate = trip.startDate ? new Date(trip.startDate) : null;
                  const daysUntilStart = startDate 
                    ? Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <div 
                      key={trip.id}
                      className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/trips`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors mt-0.5">
                            <Route className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{trip.name || 'Unnamed Trip'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {trip.origin || 'N/A'} → {trip.destination || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                              {startDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(startDate, 'MMM d, yyyy')}
                                  {daysUntilStart !== null && daysUntilStart >= 0 && (
                                    <Badge variant="outline" className="ml-1 h-4 px-1.5 text-[10px]">
                                      {daysUntilStart === 0 ? 'Today' : daysUntilStart === 1 ? 'Tomorrow' : `In ${daysUntilStart}d`}
                                    </Badge>
                                  )}
                                </span>
                              )}
                              {unit && (
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  {unit.name}
                                </span>
                              )}
                              {driver && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {driver.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Route className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No upcoming trips scheduled</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/trips')}
                  className="mt-3"
                >
                  Create New Trip
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Trucks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Expenses by Truck</CardTitle>
            <CardDescription className="text-xs">Highest spending units</CardDescription>
          </CardHeader>
          <CardContent>
            {topTrucks.length > 0 ? (
              <div className="space-y-3">
                {topTrucks.map((item, index) => (
                  <div 
                    key={item.unit.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/units/${item.unit.id}/dashboard`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.unit.name}</p>
                        <p className="text-xs text-muted-foreground">{item.unit.licensePlate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <CurrencyDisplay
                        amount={item.total}
                        originalCurrency={primaryCurrency}
                        variant="inline"
                        showLabel={false}
                        cadToUsdRate={cadToUsdRate}
                        usdToCadRate={usdToCadRate}
                        className="text-sm font-semibold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No truck expense data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Trips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Trips</CardTitle>
            <CardDescription className="text-xs">Current trips with expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {activeTripsWithExpenses.length > 0 ? (
              <div className="space-y-3">
                {activeTripsWithExpenses.map((item) => (
                  <div 
                    key={item.trip.id} 
                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.trip.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.trip.origin} → {item.trip.destination}
                        </p>
                        {item.unit && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.unit.name} • {item.unit.licensePlate}
                          </p>
                        )}
                      </div>
                      <Badge variant={item.trip.status === 'ongoing' ? 'default' : 'outline'} className="ml-2 flex-shrink-0">
                        {item.trip.status === 'ongoing' ? 'Ongoing' : 'Active'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {item.expenseCount} expense{item.expenseCount !== 1 ? 's' : ''}
                      </span>
                      <CurrencyDisplay
                        amount={item.totalExpenses}
                        originalCurrency={primaryCurrency}
                        variant="inline"
                        showLabel={false}
                        cadToUsdRate={cadToUsdRate}
                        usdToCadRate={usdToCadRate}
                        className="text-sm font-semibold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No active trips
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AdminRouteGuard>
      <DashboardContent />
    </AdminRouteGuard>
  );
}
