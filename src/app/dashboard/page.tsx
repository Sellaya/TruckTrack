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
  const [isMounted, setIsMounted] = useState(false);
  
  // Date range filter for expenses
  const [expenseStartDate, setExpenseStartDate] = useState('');
  const [expenseEndDate, setExpenseEndDate] = useState('');

  // Ensure component is mounted before rendering date-dependent content
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    if (!isMounted) return 0; // Return 0 during SSR to prevent hydration mismatch
    
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
  }, [isMounted, transactions, filteredExpenses, expenseStartDate, expenseEndDate, primaryCurrency, cadToUsdRate, usdToCadRate]);

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
    if (!isMounted) return 0; // Return 0 during SSR to prevent hydration mismatch
    
    const now = new Date();
    return trips.filter(t => {
      if (t.status === 'ongoing') return true;
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      return now >= start && now <= end;
    }).length;
  }, [isMounted, trips]);

  // Total trucks count
  const totalTrucksCount = useMemo(() => {
    return units.length;
  }, [units]);

  // Active trips with total expense per trip
  const activeTripsWithExpenses = useMemo(() => {
    if (!isMounted) return []; // Return empty array during SSR to prevent hydration mismatch
    
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
  }, [isMounted, trips, transactions, filteredExpenses, expenseStartDate, expenseEndDate, units, primaryCurrency, cadToUsdRate, usdToCadRate]);

  // Recent expenses (last 5)
  const recentExpenses = useMemo(() => {
    const expensesToUse = (expenseStartDate || expenseEndDate) ? filteredExpenses : transactions;
    return expensesToUse
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions, filteredExpenses, expenseStartDate, expenseEndDate]);

  // Upcoming trips (starting in next 7 days)
  const upcomingTrips = useMemo(() => {
    if (!isMounted) return []; // Return empty array during SSR to prevent hydration mismatch
    
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
  }, [isMounted, trips]);

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
    return unit ? `${unit.make} ${unit.year} ${unit.model}` : 'Unknown Unit';
  };

  // Calculate expense totals - MUST be before early return
  const expensesToShow = useMemo(() => {
    if (expenseStartDate || expenseEndDate) {
      return filteredExpenses;
    }
    if (!isMounted) return []; // Return empty array during SSR to prevent hydration mismatch
    
    const now = new Date();
    const monthStart = startOfMonth(now);
    return transactions.filter(t => {
      const expenseDate = new Date(t.date);
      return expenseDate >= monthStart;
    });
  }, [isMounted, expenseStartDate, expenseEndDate, filteredExpenses, transactions]);

  // Calculate totals - MUST be before early return
  const cadTotal = expensesToShow
    .filter(t => t.originalCurrency === 'CAD')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const usdTotal = expensesToShow
    .filter(t => t.originalCurrency === 'USD')
    .reduce((sum, t) => sum + t.amount, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background" suppressHydrationWarning>
        <div className="flex-1 w-full p-4 sm:p-6 space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          
          {/* Stats grid skeleton */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border border-border rounded-lg shadow-md">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" suppressHydrationWarning>
      <div className="flex-1 w-full p-4 sm:p-6 space-y-6">
        {/* Header Section - Monday.com Style */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Overview of your fleet operations and expenses
            </p>
          </div>
        </div>

        {/* Key Metrics - Monday.com Style Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Active Trips</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-status-in-progress/10 flex items-center justify-center">
                <Route className="h-5 w-5 text-status-in-progress" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{activeTripsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently running</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Total Trucks</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-info" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalTrucksCount}</div>
              <p className="text-xs text-muted-foreground mt-1">In fleet</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Total Expenses</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {formatCurrency(expensesThisMonth, primaryCurrency)}
              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                {expenseStartDate || expenseEndDate ? 'Filtered period' : isMounted ? format(new Date(), 'MMMM yyyy') : 'Loading...'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Total Transactions</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{transactions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter - Monday.com Style */}
        <Card className="bg-card border border-border rounded-lg shadow-md">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Filter Expenses by Date Range</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Select a date range to filter expenses across all dashboard sections
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
                  className="h-9 px-4 text-sm rounded-lg self-start sm:self-auto"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="expenseStartDate" className="text-sm font-medium text-foreground">
                  Start Date
                </Label>
                <DatePicker
                  id="expenseStartDate"
                  value={expenseStartDate}
                  onChange={setExpenseStartDate}
                  placeholder="Select a start date"
                  minDate={new Date(1900, 0, 1)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseEndDate" className="text-sm font-medium text-foreground">
                  End Date
                </Label>
                <DatePicker
                  id="expenseEndDate"
                  value={expenseEndDate}
                  onChange={setExpenseEndDate}
                  placeholder="Select an end date"
                  minDate={expenseStartDate ? new Date(expenseStartDate) : new Date(1900, 0, 1)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Summary - Monday.com Style */}
        <Card className="bg-card border border-border rounded-lg shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              {expenseStartDate || expenseEndDate ? 'Expense Summary' : 'Monthly Expense Summary'}
            </CardTitle>
            <CardDescription className="text-sm">
              {expenseStartDate || expenseEndDate ? (
                <>
                  From {expenseStartDate ? format(new Date(expenseStartDate), 'MMM d, yyyy') : 'beginning'} to{' '}
                  {expenseEndDate ? format(new Date(expenseEndDate), 'MMM d, yyyy') : 'end'}
                </>
              ) : (
                isMounted ? `Expenses for ${format(new Date(), 'MMMM yyyy')}` : 'Loading expenses...'
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

        {/* Main Content Grid - Monday.com Style */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent Expenses */}
          <Card className="bg-card border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4 pb-3">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-semibold text-foreground">Recent Expenses</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest expense transactions</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/trips')}
                className="h-8 px-3 text-xs rounded-lg flex-shrink-0"
              >
                View All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentExpenses.length > 0 ? (
                <div className="space-y-2">
                  {recentExpenses.map((expense) => {
                    const trip = trips.find(t => t.id === expense.tripId);
                    const unit = units.find(u => u.id === expense.unitId);
                    const driver = drivers.find(d => d.id === expense.driverId);
                    
                    return (
                      <div 
                        key={expense.id}
                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors flex-shrink-0 mt-0.5">
                            <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <p className="font-medium text-sm text-foreground truncate">{expense.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {expense.category && (
                                <Badge variant="outline" className="text-xs h-5 px-2 rounded-full border-border">
                                  {expense.category}
                                </Badge>
                              )}
                              {trip && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {trip.name}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                {format(new Date(expense.date), 'MMM d, yyyy')}
                              </span>
                              {unit && (
                                <span className="flex items-center gap-1.5">
                                  <Truck className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">{unit.make} {unit.year} {unit.model}</span>
                                </span>
                              )}
                              {driver && (
                                <span className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">{driver.name}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 sm:ml-3">
                          <CurrencyDisplay
                            amount={expense.amount}
                            originalCurrency={expense.originalCurrency}
                            variant="compact"
                            showLabel={false}
                            cadToUsdRate={cadToUsdRate}
                            usdToCadRate={usdToCadRate}
                            className="items-end font-semibold text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] sm:h-[300px] text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No expenses recorded yet</p>
                  <p className="text-xs mt-1">Expenses will appear here when drivers log them</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Trips */}
          <Card className="bg-card border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4 pb-3">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-semibold text-foreground">Upcoming Trips</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Trips starting in the next 7 days</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/trips')}
                className="h-8 px-3 text-xs rounded-lg flex-shrink-0"
              >
                View All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingTrips.length > 0 ? (
                <div className="space-y-2">
                  {upcomingTrips.map((trip) => {
                    const unit = units.find(u => u.id === trip.unitId);
                    const driver = drivers.find(d => d.id === trip.driverId);
                    const startDate = trip.startDate ? new Date(trip.startDate) : null;
                    const daysUntilStart = startDate && isMounted
                      ? Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <div 
                        key={trip.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => router.push(`/trips`)}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-status-upcoming/10 group-hover:bg-status-upcoming/20 transition-colors flex-shrink-0 mt-0.5">
                            <Route className="h-4 w-4 text-status-upcoming" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <p className="font-medium text-sm text-foreground truncate">{trip.name || 'Unnamed Trip'}</p>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {trip.origin || 'N/A'} → {trip.destination || 'N/A'}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                              {startDate && (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                  {format(startDate, 'MMM d, yyyy')}
                                  {daysUntilStart !== null && daysUntilStart >= 0 && (
                                    <Badge 
                                      variant="outline" 
                                      className="ml-1.5 h-5 px-2 text-[10px] rounded-full border-status-upcoming/30 bg-status-upcoming/5 text-status-upcoming"
                                    >
                                      {daysUntilStart === 0 ? 'Today' : daysUntilStart === 1 ? 'Tomorrow' : `In ${daysUntilStart}d`}
                                    </Badge>
                                  )}
                                </span>
                              )}
                              {unit && (
                                <span className="flex items-center gap-1.5">
                                  <Truck className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">{unit.make} {unit.year} {unit.model}</span>
                                </span>
                              )}
                              {driver && (
                                <span className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">{driver.name}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] sm:h-[300px] text-muted-foreground">
                  <Route className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No upcoming trips scheduled</p>
                  <p className="text-xs mt-1 mb-3">Trips starting in the next 7 days will appear here</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/trips')}
                    className="h-9 px-4 rounded-lg"
                  >
                    Create New Trip
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Monday.com Style */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top Trucks */}
          <Card className="bg-card border border-border rounded-lg shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">Top Expenses by Truck</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Highest spending units</CardDescription>
            </CardHeader>
            <CardContent>
              {topTrucks.length > 0 ? (
                <div className="space-y-2">
                  {topTrucks.map((item, index) => (
                    <div 
                      key={item.unit.id} 
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/units/${item.unit.id}/dashboard`)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-sm font-semibold text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {item.unit.make} {item.unit.year} {item.unit.model}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">VIN: {item.unit.vin}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
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
                <div className="flex items-center justify-center h-[150px] sm:h-[200px] text-muted-foreground text-sm">
                  No truck expense data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Trips */}
          <Card className="bg-card border border-border rounded-lg shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">Active Trips</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Current trips with expenses</CardDescription>
            </CardHeader>
            <CardContent>
              {activeTripsWithExpenses.length > 0 ? (
                <div className="space-y-2">
                  {activeTripsWithExpenses.map((item) => (
                    <div 
                      key={item.trip.id} 
                      className="p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{item.trip.name}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.trip.origin} → {item.trip.destination}
                          </p>
                          {item.unit && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {item.unit.make} {item.unit.year} {item.unit.model} • VIN: {item.unit.vin}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant={item.trip.status === 'ongoing' ? 'default' : 'outline'} 
                          className="ml-2 flex-shrink-0 rounded-full h-6 px-3 text-xs"
                          style={{
                            backgroundColor: item.trip.status === 'ongoing' 
                              ? 'hsl(var(--status-in-progress))' 
                              : undefined,
                            color: item.trip.status === 'ongoing' ? 'hsl(var(--status-in-progress-foreground))' : undefined,
                          }}
                        >
                          {item.trip.status === 'ongoing' ? 'In Progress' : 'Active'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
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
                <div className="flex items-center justify-center h-[150px] sm:h-[200px] text-muted-foreground text-sm">
                  No active trips
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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