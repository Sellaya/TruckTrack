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
import { getTripsByDriver, getTransactionsByDriver, getDrivers, getUnits, getTrips } from '@/lib/data';
import { getTransactionsByDriver as getTransactionsByDriverFromDB } from '@/lib/supabase/database';
import type { Trip, Transaction, Driver, Unit } from '@/lib/types';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { ArrowLeft, MapPin, Calendar, Route, Package, DollarSign, User, Phone, CreditCard, PlusCircle, Receipt, ChevronDown, ChevronRight, Mail, ArrowUpDown, ArrowUp, ArrowDown, Clock, Filter, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBothCurrencies, convertCurrency, getPrimaryCurrency, getCADToUSDRate, getUSDToCADRate, formatCurrency } from '@/lib/currency';
import { GrandTotalDisplay, CurrencyDisplay } from '@/components/ui/currency-display';
import { DistanceDisplay } from '@/components/ui/distance-display';
import { useToast } from '@/hooks/use-toast';
import type { Currency } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DriverDashboardViewPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;
  const { toast } = useToast();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  
  // Filter and sort states
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expenseForm, setExpenseForm] = useState({
    unitId: '',
    tripId: '',
    description: '',
    amount: '',
    category: '',
    currency: 'CAD' as Currency,
    vendorName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    receiptUrl: '',
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load driver info
        const allDrivers = await getDrivers();
        const foundDriver = allDrivers.find(d => d.id === driverId);
        if (!foundDriver) {
          router.push('/admin/drivers/view');
          return;
        }
        setDriver(foundDriver);

        // Load trips for this driver
        const driverTrips = await getTripsByDriver(driverId);
        setTrips(driverTrips);

        // Load transactions for this driver
        const driverTransactions = await getTransactionsByDriver(driverId);
        setTransactions(driverTransactions);
        
        // Load units
        const allUnits = await getUnits();
        setUnits(allUnits);
      } catch (error) {
        console.error('Error loading driver data:', error);
        toast({
          title: "Error",
          description: "Failed to load driver data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (driverId) {
      loadData();
    }
  }, [driverId, router, toast]);

  // Filter and sort trips
  const filteredAndSortedTrips = useMemo(() => {
    let filtered = [...trips];

    // Apply date range filter
    if (filterStartDate) {
      const startDate = new Date(filterStartDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(trip => {
        if (!trip.startDate) return false;
        const tripStartDate = new Date(trip.startDate);
        tripStartDate.setHours(0, 0, 0, 0);
        return tripStartDate >= startDate;
      });
    }

    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(trip => {
        if (!trip.endDate) return false;
        const tripEndDate = new Date(trip.endDate);
        tripEndDate.setHours(23, 59, 59, 999);
        return tripEndDate <= endDate;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => {
        const tripStatus = trip.status || 'upcoming';
        return tripStatus === statusFilter;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status || 'upcoming';
          bValue = b.status || 'upcoming';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' 
        ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0)
        : (aValue > bValue ? -1 : aValue < bValue ? 1 : 0);
    });

    return filtered;
  }, [trips, filterStartDate, filterEndDate, statusFilter, sortBy, sortOrder]);

  // Group trips by status (using filtered trips)
  const completedTrips = filteredAndSortedTrips.filter(t => t.status === 'completed');
  const ongoingTrips = filteredAndSortedTrips.filter(t => t.status === 'ongoing');
  const upcomingTrips = filteredAndSortedTrips.filter(t => t.status === 'upcoming');

  // Currency conversion rates (calculate once)
  const primaryCurrency = getPrimaryCurrency();
  const cadToUsdRate = getCADToUSDRate();
  const usdToCadRate = getUSDToCADRate();

  // Group expenses by trip (computed from transactions state)
  const tripExpenses: Record<string, Transaction[]> = {};
  trips.forEach(trip => {
    const tripExpensesList = transactions.filter(
      t => t.tripId === trip.id && t.type === 'expense'
    );
    tripExpenses[trip.id] = tripExpensesList;
  });

  // Calculate trip total expenses (CAD, USD, and Grand Total)
  const getTripTotalExpenses = (tripId: string) => {
    const expenses = tripExpenses[tripId] || [];
    const cadTotal = expenses
      .filter(e => e.originalCurrency === 'CAD')
      .reduce((sum, e) => sum + e.amount, 0);
    const usdTotal = expenses
      .filter(e => e.originalCurrency === 'USD')
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate grand total by converting to primary currency
    const cadInPrimary = convertCurrency(cadTotal, 'CAD', primaryCurrency, cadToUsdRate, usdToCadRate);
    const usdInPrimary = convertCurrency(usdTotal, 'USD', primaryCurrency, cadToUsdRate, usdToCadRate);
    const grandTotal = cadInPrimary + usdInPrimary;
    
    return { cad: cadTotal, usd: usdTotal, grandTotal };
  };

  const handleSaveExpense = async () => {
    if (!driverId) {
      toast({
        title: "Error",
        description: "Missing driver information.",
        variant: "destructive",
      });
      return;
    }

    if (!expenseForm.description || !expenseForm.amount || !expenseForm.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingExpense) {
        // Update existing expense
        const { updateTransaction } = await import('@/lib/supabase/database');
        
        const updatedExpense = await updateTransaction(editingExpense.id, {
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          originalCurrency: expenseForm.currency,
          category: expenseForm.category,
          unitId: expenseForm.unitId || undefined,
          tripId: expenseForm.tripId && expenseForm.tripId !== 'none' ? expenseForm.tripId : undefined,
          vendorName: expenseForm.vendorName || undefined,
          notes: expenseForm.notes || undefined,
          date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString(),
          receiptUrl: expenseForm.receiptUrl || undefined,
        });

        if (!updatedExpense) {
          throw new Error('Failed to update expense');
        }

        toast({
          title: "Expense Updated",
          description: "Expense has been updated successfully.",
        });
      } else {
        // Create new expense
        const { createTransaction } = await import('@/lib/supabase/database');
        
        const tripId = expenseForm.tripId && expenseForm.tripId !== 'none' 
          ? expenseForm.tripId 
          : selectedTripId || undefined;
        
        const newExpense = await createTransaction({
          type: 'expense',
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          originalCurrency: expenseForm.currency,
          category: expenseForm.category,
          unitId: expenseForm.unitId || undefined,
          tripId: tripId,
          vendorName: expenseForm.vendorName || undefined,
          notes: expenseForm.notes || undefined,
          date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString(),
          driverId: driverId,
          receiptUrl: expenseForm.receiptUrl || undefined,
        });

        if (!newExpense) {
          throw new Error('Failed to create expense');
        }

        toast({
          title: "Expense Added",
          description: "Expense has been recorded successfully.",
        });
      }

      // Reload transactions and trips
      const [driverTransactions, driverTrips] = await Promise.all([
        getTransactionsByDriver(driverId),
        getTripsByDriver(driverId),
      ]);
      
      setTransactions(driverTransactions);
      setTrips(driverTrips);

      // Reset form
      setExpenseForm({
        unitId: '',
        tripId: '',
        description: '',
        amount: '',
        category: '',
        currency: 'CAD',
        vendorName: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        receiptUrl: '',
      });
      setExpenseDialogOpen(false);
      setSelectedTripId(null);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: editingExpense ? "Failed to update expense. Please try again." : "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openExpenseDialog = (tripId?: string, expense?: Transaction) => {
    if (expense) {
      // Editing existing expense
      setEditingExpense(expense);
      setSelectedTripId(expense.tripId || tripId || null);
      setExpenseForm({
        unitId: expense.unitId || '',
        tripId: expense.tripId || '',
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        currency: expense.originalCurrency,
        vendorName: expense.vendorName || '',
        date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        notes: expense.notes || '',
        receiptUrl: expense.receiptUrl || '',
      });
    } else {
      // Adding new expense
      setEditingExpense(null);
      const trip = tripId ? trips.find(t => t.id === tripId) : null;
      setSelectedTripId(tripId || null);
      setExpenseForm({
        unitId: trip?.unitId || '',
        tripId: tripId || '',
        description: '',
        amount: '',
        category: '',
        currency: 'CAD',
        vendorName: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        receiptUrl: '',
      });
    }
    setExpenseDialogOpen(true);
  };

  // Calculate totals separately by currency (for all expenses)
  const expenses = transactions.filter(t => t.type === 'expense');
  const cadTotal = expenses
    .filter(t => t.originalCurrency === 'CAD')
    .reduce((sum, t) => sum + t.amount, 0);
  const usdTotal = expenses
    .filter(t => t.originalCurrency === 'USD')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate grand total by converting to primary currency
  const cadInPrimary = convertCurrency(cadTotal, 'CAD', primaryCurrency, cadToUsdRate, usdToCadRate);
  const usdInPrimary = convertCurrency(usdTotal, 'USD', primaryCurrency, cadToUsdRate, usdToCadRate);
  const grandTotal = cadInPrimary + usdInPrimary;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/drivers/view')}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Drivers
        </Button>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">{driver.name}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{driver.email}</span>
                  </div>
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{driver.phone}</span>
                    </div>
                  )}
                  {driver.licenseNumber && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{driver.licenseNumber}</span>
                    </div>
                  )}
                  <Badge 
                    variant={driver.isActive ? "default" : "secondary"}
                    className="w-fit text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 h-5 sm:h-6"
                  >
                    {driver.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Route className="h-4 w-4" />
              Total Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{trips.length}</div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {completedTrips.length} completed, {ongoingTrips.length} ongoing, {upcomingTrips.length} upcoming
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Expenses
            </CardTitle>
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
      </div>

      {/* Filter and Sort Controls */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Filter & Sort Trips</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Date Range Filters */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-3 border-b">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <Label className="text-sm sm:text-base font-semibold text-foreground">Date Range</Label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Start Date */}
                <div className="p-3 sm:p-4 rounded-xl border-2 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/50 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Label htmlFor="filterStartDate" className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400">
                      Start Date
                    </Label>
                  </div>
                  <DatePicker
                    id="filterStartDate"
                    value={filterStartDate}
                    onChange={setFilterStartDate}
                    placeholder="Select start date"
                    minDate={new Date(1900, 0, 1)}
                    className="w-full"
                  />
                </div>
                
                {/* End Date */}
                <div className="p-3 sm:p-4 rounded-xl border-2 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 border-green-200/50 dark:border-green-800/30 hover:border-green-300 dark:hover:border-green-700 transition-all shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <Label htmlFor="filterEndDate" className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">
                      End Date
                    </Label>
                  </div>
                  <DatePicker
                    id="filterEndDate"
                    value={filterEndDate}
                    onChange={setFilterEndDate}
                    placeholder="Select end date"
                    minDate={filterStartDate ? new Date(filterStartDate) : new Date(1900, 0, 1)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            {/* Status Filter & Sort Options */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 pb-2.5 sm:pb-3 border-b border-border/50">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <Label className="text-sm sm:text-base font-semibold text-foreground">Filter & Sort</Label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Status Filter */}
                <div className="space-y-2 sm:space-y-2.5 min-w-0">
                  <Label htmlFor="statusFilter" className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="whitespace-nowrap">Status</span>
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="statusFilter" className="h-10 sm:h-11 text-sm w-full min-w-0">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Sort By */}
                <div className="space-y-2 sm:space-y-2.5 min-w-0">
                  <Label htmlFor="sortBy" className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="whitespace-nowrap">Sort By</span>
                  </Label>
                  <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'status') => setSortBy(value)}>
                    <SelectTrigger id="sortBy" className="h-10 sm:h-11 text-sm w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Sort Order */}
                <div className="space-y-2 sm:space-y-2.5 min-w-0 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="sortOrder" className="text-xs sm:text-sm font-semibold text-foreground mb-1.5 block">
                    Order
                  </Label>
                  <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                    <SelectTrigger id="sortOrder" className="h-10 sm:h-11 text-sm w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">
                        <div className="flex items-center gap-2">
                          <ArrowDown className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="hidden sm:inline">Descending</span>
                          <span className="sm:hidden">Desc</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="asc">
                        <div className="flex items-center gap-2">
                          <ArrowUp className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="hidden sm:inline">Ascending</span>
                          <span className="sm:hidden">Asc</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(filterStartDate || filterEndDate || statusFilter !== 'all') && (
            <div className="flex justify-end sm:justify-end pt-3 sm:pt-4 mt-3 sm:mt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setStatusFilter('all');
                }}
                className="h-9 sm:h-10 gap-2 w-full sm:w-auto text-sm"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Clear All Filters</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ongoing Trips */}
      {ongoingTrips.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Route className="h-5 w-5 text-primary" />
              </div>
              Ongoing Trips ({ongoingTrips.length})
            </CardTitle>
            <CardDescription className="mt-2">Trips currently in progress - click to view details and add expenses</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {ongoingTrips.map((trip) => {
                const expenses = tripExpenses[trip.id] || [];
                const isExpanded = expandedTripId === trip.id;
                const totals = getTripTotalExpenses(trip.id);
                return (
                  <Card key={trip.id} className={`overflow-hidden border-2 transition-all duration-200 ${isExpanded ? 'border-primary/50 shadow-lg' : 'hover:border-primary/30 hover:shadow-md'}`}>
                    <div 
                      className="cursor-pointer"
                      onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                    >
                      <div className="p-4 sm:p-6 bg-gradient-to-br from-muted/50 via-background to-muted/30">
                        <div className="flex flex-col gap-4">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  {isExpanded ? (
                                    <ChevronDown className="h-5 w-5 text-primary" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg sm:text-xl truncate text-foreground mb-1">
                                    {trip.name || 'Unnamed Trip'}
                                  </h3>
                                  <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 h-6 sm:h-7 shadow-sm">
                                    <div className="h-1.5 w-1.5 rounded-full bg-white/90 mr-1.5 animate-pulse" />
                                    Ongoing
                                  </Badge>
                                </div>
                              </div>

                              {/* Route Information */}
                              <div className="ml-[52px] space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                  <div className="flex items-center gap-2 min-w-0 p-2 rounded-lg bg-background/60 border border-border/50">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <MapPin className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-muted-foreground mb-0.5">Route</div>
                                      <div className="flex items-center gap-2 text-sm font-semibold">
                                        <span className="truncate">{trip.origin || 'Origin TBD'}</span>
                                        <span className="text-primary flex-shrink-0">→</span>
                                        <span className="truncate">{trip.destination || 'Destination TBD'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/50">
                                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground">Date Range</div>
                                      <div className="text-sm font-medium truncate">
                                        {trip.startDate && trip.endDate ? (
                                          <>
                                            {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                                          </>
                                        ) : (
                                          <span className="text-muted-foreground">Date TBD</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/50">
                                    <Route className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <DistanceDisplay 
                                        distance={trip.distance || 0}
                                        variant="default"
                                        showLabel={true}
                                      />
                                    </div>
                                  </div>

                                  {expenses.length > 0 && (
                                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50 border border-border/50">
                                      <div className="text-xs text-foreground font-semibold">Total Expenses</div>
                                      <GrandTotalDisplay
                                        cadAmount={totals.cad}
                                        usdAmount={totals.usd}
                                        primaryCurrency={primaryCurrency}
                                        cadToUsdRate={cadToUsdRate}
                                        usdToCadRate={usdToCadRate}
                                        variant="compact"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Cargo Details */}
                                {trip.cargoDetails && (
                                  <div className="ml-0 p-2 rounded-lg bg-background/60 border border-border/50">
                                    <div className="text-xs text-muted-foreground mb-1">Cargo Details</div>
                                    <div className="text-sm text-foreground line-clamp-2">{trip.cargoDetails}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openExpenseDialog(trip.id);
                                }}
                                className="whitespace-nowrap shadow-sm"
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Add Expense</span>
                                <span className="sm:hidden">Add</span>
                              </Button>
                              {expenses.length > 0 && (
                                <div className="text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 sm:p-6 border-t bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-lg sm:text-xl flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Trip Expenses
                          </h4>
                          <Badge variant="outline" className="text-sm">
                            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        {/* CAD Expenses */}
                        {expenses.filter(e => e.originalCurrency === 'CAD').length > 0 && (
                          <div className="border-2 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                              <h5 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <DollarSign className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">CAD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-muted text-foreground border-border text-sm font-semibold px-3 py-1">
                                {expenses.filter(e => e.originalCurrency === 'CAD').reduce((sum, e) => sum + e.amount, 0).toFixed(2)} CAD
                              </Badge>
                            </div>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold">Description</TableHead>
                                    <TableHead className="font-semibold">Category</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="text-right font-semibold">Amount</TableHead>
                                    <TableHead className="font-semibold">Receipt</TableHead>
                                    <TableHead className="font-semibold text-center">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {expenses
                                    .filter(e => e.originalCurrency === 'CAD')
                                    .map((expense) => (
                                      <TableRow key={expense.id} className="hover:bg-muted/30">
                                        <TableCell className="font-medium">{expense.description}</TableCell>
                                        <TableCell>
                                          <Badge variant="destructive" className="text-xs">{expense.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="CAD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="font-semibold text-foreground"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {expense.receiptUrl ? (
                                            <a
                                              href={expense.receiptUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline flex items-center gap-1 text-sm font-medium"
                                            >
                                              <Receipt className="h-4 w-4" />
                                              View
                                            </a>
                                          ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openExpenseDialog(trip.id, expense);
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* USD Expenses */}
                        {expenses.filter(e => e.originalCurrency === 'USD').length > 0 && (
                          <div className="border-2 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-green-50/80 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                              <h5 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <DollarSign className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">USD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-muted text-foreground border-border text-sm font-semibold px-3 py-1">
                                {expenses.filter(e => e.originalCurrency === 'USD').reduce((sum, e) => sum + e.amount, 0).toFixed(2)} USD
                              </Badge>
                            </div>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold">Description</TableHead>
                                    <TableHead className="font-semibold">Category</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="text-right font-semibold">Amount</TableHead>
                                    <TableHead className="font-semibold">Receipt</TableHead>
                                    <TableHead className="font-semibold text-center">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {expenses
                                    .filter(e => e.originalCurrency === 'USD')
                                    .map((expense) => (
                                      <TableRow key={expense.id} className="hover:bg-muted/30">
                                        <TableCell className="font-medium">{expense.description}</TableCell>
                                        <TableCell>
                                          <Badge variant="destructive" className="text-xs">{expense.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="USD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="font-semibold text-foreground"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {expense.receiptUrl ? (
                                            <a
                                              href={expense.receiptUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline flex items-center gap-1 text-sm font-medium"
                                            >
                                              <Receipt className="h-4 w-4" />
                                              View
                                            </a>
                                          ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openExpenseDialog(trip.id, expense);
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Grand Total */}
                        {expenses.length > 0 && (
                          <div className="border-2 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <h5 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <DollarSign className="h-5 w-5 text-foreground" />
                                </div>
                                <span className="text-foreground">Grand Total</span>
                              </h5>
                              <GrandTotalDisplay
                                cadAmount={getTripTotalExpenses(trip.id).cad}
                                usdAmount={getTripTotalExpenses(trip.id).usd}
                                primaryCurrency={primaryCurrency}
                                cadToUsdRate={cadToUsdRate}
                                usdToCadRate={usdToCadRate}
                                variant="compact"
                              />
                            </div>
                          </div>
                        )}

                        {expenses.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No expenses recorded for this trip yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Trips ({upcomingTrips.length})
            </CardTitle>
            <CardDescription>Scheduled trips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip Name</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingTrips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">{trip.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{trip.origin}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{trip.destination}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DistanceDisplay 
                          distance={trip.distance || 0}
                          variant="compact"
                          showLabel={false}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(trip.startDate), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {trip.cargoDetails || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Upcoming</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Trips */}
      {completedTrips.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-5 via-green-10 to-green-5 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Completed Trips ({completedTrips.length})
            </CardTitle>
            <CardDescription className="mt-2">Past completed trips - click to view details and expenses</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {completedTrips.map((trip) => {
                const expenses = tripExpenses[trip.id] || [];
                const isExpanded = expandedTripId === trip.id;
                const totals = getTripTotalExpenses(trip.id);
                return (
                  <Card key={trip.id} className={`overflow-hidden border-2 transition-all duration-200 ${isExpanded ? 'border-green-500/50 shadow-lg' : 'hover:border-green-500/30 hover:shadow-md'}`}>
                    <div 
                      className="cursor-pointer"
                      onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                    >
                      <div className="p-4 sm:p-6 bg-gradient-to-br from-muted/50 via-background to-muted/30">
                        <div className="flex flex-col gap-4">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                  {isExpanded ? (
                                    <ChevronDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg sm:text-xl truncate text-foreground mb-1">
                                    {trip.name || 'Unnamed Trip'}
                                  </h3>
                                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 h-6 sm:h-7">
                                    Completed
                                  </Badge>
                                </div>
                              </div>

                              {/* Route Information */}
                              <div className="ml-[52px] space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                  <div className="flex items-center gap-2 min-w-0 p-2 rounded-lg bg-background/60 border border-border/50">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <MapPin className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-muted-foreground mb-0.5">Route</div>
                                      <div className="flex items-center gap-2 text-sm font-semibold">
                                        <span className="truncate">{trip.origin || 'Origin TBD'}</span>
                                        <span className="text-primary flex-shrink-0">→</span>
                                        <span className="truncate">{trip.destination || 'Destination TBD'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/50">
                                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground">Completed Date</div>
                                      <div className="text-sm font-medium truncate">
                                        {trip.endDate ? format(new Date(trip.endDate), 'MMM d, yyyy') : 'Date TBD'}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/50">
                                    <Route className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <DistanceDisplay 
                                        distance={trip.distance || 0}
                                        variant="default"
                                        showLabel={true}
                                      />
                                    </div>
                                  </div>

                                  {expenses.length > 0 && (
                                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50 border border-border/50">
                                      <div className="text-xs text-foreground font-semibold">Total Expenses</div>
                                      <GrandTotalDisplay
                                        cadAmount={totals.cad}
                                        usdAmount={totals.usd}
                                        primaryCurrency={primaryCurrency}
                                        cadToUsdRate={cadToUsdRate}
                                        usdToCadRate={usdToCadRate}
                                        variant="compact"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Cargo Details */}
                                {trip.cargoDetails && (
                                  <div className="ml-0 p-2 rounded-lg bg-background/60 border border-border/50">
                                    <div className="text-xs text-muted-foreground mb-1">Cargo Details</div>
                                    <div className="text-sm text-foreground line-clamp-2">{trip.cargoDetails}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openExpenseDialog(trip.id);
                                }}
                                className="whitespace-nowrap shadow-sm bg-green-600 hover:bg-green-700"
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Add Expense</span>
                                <span className="sm:hidden">Add</span>
                              </Button>
                              {expenses.length > 0 && (
                                <div className="text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 sm:p-6 border-t bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-lg sm:text-xl flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Trip Expenses
                          </h4>
                          <Badge variant="outline" className="text-sm">
                            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        {/* CAD Expenses */}
                        {expenses.filter(e => e.originalCurrency === 'CAD').length > 0 && (
                          <div className="border-2 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                              <h5 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <DollarSign className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">CAD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 text-sm font-semibold px-3 py-1">
                                {totals.cad.toFixed(2)} CAD
                              </Badge>
                            </div>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold">Description</TableHead>
                                    <TableHead className="font-semibold">Category</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="text-right font-semibold">Amount</TableHead>
                                    <TableHead className="font-semibold">Receipt</TableHead>
                                    <TableHead className="font-semibold text-center">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {expenses
                                    .filter(e => e.originalCurrency === 'CAD')
                                    .map((expense) => (
                                      <TableRow key={expense.id} className="hover:bg-muted/30">
                                        <TableCell className="font-medium">{expense.description}</TableCell>
                                        <TableCell>
                                          <Badge variant="destructive" className="text-xs">{expense.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="CAD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="font-semibold text-foreground"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {expense.receiptUrl ? (
                                            <a
                                              href={expense.receiptUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline flex items-center gap-1 text-sm font-medium"
                                            >
                                              <Receipt className="h-4 w-4" />
                                              View
                                            </a>
                                          ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openExpenseDialog(trip.id, expense);
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* USD Expenses */}
                        {expenses.filter(e => e.originalCurrency === 'USD').length > 0 && (
                          <div className="border-2 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-green-50/80 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                              <h5 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <DollarSign className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">USD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 text-sm font-semibold px-3 py-1">
                                {totals.usd.toFixed(2)} USD
                              </Badge>
                            </div>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold">Description</TableHead>
                                    <TableHead className="font-semibold">Category</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="text-right font-semibold">Amount</TableHead>
                                    <TableHead className="font-semibold">Receipt</TableHead>
                                    <TableHead className="font-semibold text-center">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {expenses
                                    .filter(e => e.originalCurrency === 'USD')
                                    .map((expense) => (
                                      <TableRow key={expense.id} className="hover:bg-muted/30">
                                        <TableCell className="font-medium">{expense.description}</TableCell>
                                        <TableCell>
                                          <Badge variant="destructive" className="text-xs">{expense.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="USD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="font-semibold text-foreground"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {expense.receiptUrl ? (
                                            <a
                                              href={expense.receiptUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline flex items-center gap-1 text-sm font-medium"
                                            >
                                              <Receipt className="h-4 w-4" />
                                              View
                                            </a>
                                          ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openExpenseDialog(trip.id, expense);
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Grand Total */}
                        {expenses.length > 0 && (
                          <div className="border-2 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-red-50/80 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <h5 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                  <DollarSign className="h-5 w-5 text-red-700 dark:text-red-400" />
                                </div>
                                <span className="text-red-700 dark:text-red-400">Grand Total</span>
                              </h5>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-3">
                                  {totals.cad > 0 && (
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                      {formatCurrency(totals.cad, 'CAD')}
                                    </span>
                                  )}
                                  {totals.cad > 0 && totals.usd > 0 && (
                                    <span className="text-muted-foreground">+</span>
                                  )}
                                  {totals.usd > 0 && (
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                      {formatCurrency(totals.usd, 'USD')}
                                    </span>
                                  )}
                                </div>
                                <Badge variant="outline" className="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 text-base font-bold px-4 py-1.5">
                                  {formatCurrency(totals.grandTotal, primaryCurrency)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}

                        {expenses.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No expenses recorded for this trip yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              All Transactions ({transactions.length})
            </CardTitle>
            <CardDescription>Expense records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter(t => t.type === 'expense')
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Badge variant="destructive">
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.category}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay
                            amount={transaction.amount}
                            originalCurrency={transaction.originalCurrency}
                            variant="compact"
                            showLabel={false}
                            cadToUsdRate={cadToUsdRate}
                            usdToCadRate={usdToCadRate}
                            className="items-end font-semibold text-foreground"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {trips.length === 0 && transactions.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No data found</p>
              <p className="text-sm text-muted-foreground mt-2">
                This driver has no trips or transactions yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense 
                ? 'Update the expense details below. Changes will be reflected immediately.'
                : 'Add a new expense for this driver. All fields marked with * are required.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="description" className="sm:text-right">Description *</Label>
              <Input
                id="description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                className="sm:col-span-3"
                placeholder="e.g., Fuel refill"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="amount" className="sm:text-right">Amount *</Label>
              <div className="sm:col-span-3 flex flex-col sm:flex-row gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="flex-1"
                  placeholder="0.00"
                />
                <Select
                  value={expenseForm.currency}
                  onValueChange={(value) => setExpenseForm(prev => ({ ...prev, currency: value as Currency }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="category" className="sm:text-right">Category *</Label>
              <Select
                value={expenseForm.category}
                onValueChange={(value) => setExpenseForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="sm:col-span-3">
                  <SelectValue placeholder="Select expense category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fuel">Fuel</SelectItem>
                  <SelectItem value="Repairs & Maintenance">Repairs & Maintenance</SelectItem>
                  <SelectItem value="Tires">Tires</SelectItem>
                  <SelectItem value="Tolls">Tolls</SelectItem>
                  <SelectItem value="Parking">Parking</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Permits">Permits</SelectItem>
                  <SelectItem value="Driver pay / subcontractor pay">Driver pay / subcontractor pay</SelectItem>
                  <SelectItem value="Lodging / Meals">Lodging / Meals</SelectItem>
                  <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="unitId" className="sm:text-right">Truck *</Label>
              <Select
                value={expenseForm.unitId}
                onValueChange={(value) => setExpenseForm(prev => ({ ...prev, unitId: value }))}
              >
                <SelectTrigger className="sm:col-span-3">
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.make} {unit.year} {unit.model} ({unit.vin})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="tripId" className="sm:text-right">Trip</Label>
              <Select
                value={expenseForm.tripId || selectedTripId || 'none'}
                onValueChange={(value) => {
                  const actualValue = value === 'none' ? '' : value;
                  setExpenseForm(prev => ({ ...prev, tripId: actualValue }));
                  setSelectedTripId(actualValue || null);
                }}
              >
                <SelectTrigger className="sm:col-span-3">
                  <SelectValue placeholder="Select trip (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {trip.name} - {trip.origin} → {trip.destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="vendorName" className="sm:text-right">Vendor Name</Label>
              <Input
                id="vendorName"
                value={expenseForm.vendorName}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, vendorName: e.target.value }))}
                className="sm:col-span-3"
                placeholder="e.g., Petro-Canada, TA, Loves"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="date" className="sm:text-right">Date *</Label>
              <div className="sm:col-span-3">
                <DatePicker
                  id="date"
                  value={expenseForm.date}
                  onChange={(date) => setExpenseForm(prev => ({ ...prev, date: date || format(new Date(), 'yyyy-MM-dd') }))}
                  placeholder="Select date"
                  minDate={new Date(0)} // Allow past dates
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="notes" className="sm:text-right">Notes</Label>
              <Input
                id="notes"
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                className="sm:col-span-3"
                placeholder="Optional notes"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="receiptUrl" className="sm:text-right">Receipt</Label>
              <div className="sm:col-span-3 space-y-2">
                <Input
                  id="receiptUrl"
                  type="url"
                  value={expenseForm.receiptUrl}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, receiptUrl: e.target.value }))}
                  placeholder="Paste receipt image URL or upload file"
                />
                <div className="text-xs text-muted-foreground">
                  You can paste an image URL or upload a file. For file upload, use a service like imgur.com or cloudinary.com to get a URL.
                </div>
              </div>
            </div>
          </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveExpense} className="bg-[#0073ea] hover:bg-[#0058c2]">
              {editingExpense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
