'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { getTripsByDriver, getTransactionsByDriver, getUnits, getTrips } from '@/lib/data';
import type { Trip, Transaction, Currency, Driver, Unit } from '@/lib/types';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDriver, clearDriverSession, getDriverSession } from '@/lib/driver-auth';
import { LogOut, Receipt, PlusCircle, DollarSign, Upload, FileImage, Edit, User, Trash2, Calendar, TrendingUp, Lock, MapPin, Truck, Route, Clock, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { formatBothCurrencies, convertCurrency, getPrimaryCurrency, getCADToUSDRate, getUSDToCADRate, formatCurrency } from '@/lib/currency';
import { DistanceDisplay } from '@/components/ui/distance-display';
import { GrandTotalDisplay, CurrencyDisplay } from '@/components/ui/currency-display';
import { DriverRouteGuard } from '@/components/driver-route-guard';

function DriverDashboardContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [driverTrips, setDriverTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tripExpenses, setTripExpenses] = useState<Record<string, Transaction[]>>({});
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
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
  const [otherCategory, setOtherCategory] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Filter and sort states
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Exchange rates - available throughout component
  const cadToUsdRate = useMemo(() => getCADToUSDRate(), []);
  const usdToCadRate = useMemo(() => getUSDToCADRate(), []);

  useEffect(() => {
    const loadDriverData = async () => {
      const session = getDriverSession();
      if (!session) {
        router.push('/driver/login');
        return;
      }

      const driver = await getCurrentDriver();
      if (!driver) {
        clearDriverSession();
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        router.push('/driver/login');
        return;
      }

      // Check if driver is still active
      if (!driver.isActive) {
        clearDriverSession();
        toast({
          title: "Account Inactive",
          description: "Your profile is inactive. Please contact your administrator to reactivate your account.",
          variant: "destructive",
        });
        router.push('/driver/login');
        return;
      }

      setCurrentDriver(driver);

      try {
        // Fetch trips for this driver from Supabase
        const myTrips = await getTripsByDriver(driver.id);
        setDriverTrips(myTrips);

        // Fetch all trips and units for dropdowns
        const [allTripsData, unitsData] = await Promise.all([
          getTrips(),
          getUnits(),
        ]);
        setAllTrips(allTripsData || []);
        setUnits(unitsData || []);

        // Fetch all transactions for this driver from Supabase
        const driverTransactions = await getTransactionsByDriver(driver.id);

        // Group expenses by trip
        const expensesByTrip: Record<string, Transaction[]> = {};
        myTrips.forEach(trip => {
          const tripExpensesList = driverTransactions.filter(
            t => t.tripId === trip.id && t.type === 'expense'
          );
          expensesByTrip[trip.id] = tripExpensesList;
        });
        setTripExpenses(expensesByTrip);
      } catch (error) {
        console.error('Error loading driver data:', error);
        toast({
          title: "Error",
          description: "Failed to load your trips. Please try again.",
          variant: "destructive",
        });
      }
    };

    loadDriverData();
  }, [router, toast]);

  const getTripStatus = (trip: Trip) => {
    const now = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    
    if (trip.status) return trip.status;
    
    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'ongoing';
  };

  const isTripLocked = (trip: Trip): boolean => {
    const now = new Date();
    const endDate = new Date(trip.endDate);
    // Add 24 hours (24 * 60 * 60 * 1000 milliseconds)
    const lockDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    return now > lockDate;
  };

  const getStatusBadge = (status: string, trip?: Trip) => {
    const locked = trip ? isTripLocked(trip) : false;
    
    switch (status) {
      case 'upcoming':
        return <Badge variant="outline">Upcoming</Badge>;
      case 'ongoing':
        return <Badge>In Progress</Badge>;
      case 'completed':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Completed</Badge>
            {locked && (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUnitName = (unitId?: string) => {
    if (!unitId) return 'N/A';
    return units.find(u => u.id === unitId)?.name || 'Unknown';
  };

  const uploadReceiptImage = async (file: File): Promise<string> => {
    try {
      // Try to upload to Supabase Storage if available
      const { supabase } = await import('@/lib/supabase/client');
      
      if (supabase) {
        // Create a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentDriver?.id || 'driver'}-${Date.now()}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('receipts')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.warn('Supabase upload error (falling back to base64):', error.message || error);
          // Fallback to base64 if Supabase upload fails (e.g., bucket not found)
          return await convertToBase64(file);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);

        return urlData.publicUrl;
      } else {
        // Fallback to base64 if Supabase is not configured
        return await convertToBase64(file);
      }
    } catch (error: any) {
      console.warn('Error uploading image to Supabase (falling back to base64):', error?.message || error);
      // Fallback to base64 for any error (including bucket not found)
      return await convertToBase64(file);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setReceiptFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddExpense = async () => {
    if (!currentDriver) return;

    // Validate required fields
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.category || !expenseForm.unitId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate "Other" category has custom value
    if (expenseForm.category === 'Other' && !otherCategory.trim()) {
      toast({
        title: "Validation Error",
        description: "Please specify the category name when selecting 'Other'.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    let receiptUrl = expenseForm.receiptUrl;

    try {
      // Upload receipt image if a file is selected
      if (receiptFile) {
        receiptUrl = await uploadReceiptImage(receiptFile);
      }

      if (editingExpense) {
        // Update existing expense
        const { updateTransaction } = await import('@/lib/supabase/database');
        
        // Security check: Verify the expense belongs to this driver
        if (editingExpense.driverId !== currentDriver.id) {
          toast({
            title: "Access Denied",
            description: "You can only edit your own expenses.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        // Drivers cannot change unit or trip - use original values from the expense
        // If expense has a trip, use the trip's unit; otherwise use expense's original unitId
        const expenseTrip = editingExpense.tripId ? driverTrips.find(t => t.id === editingExpense.tripId) : null;
        const lockedUnitId = expenseTrip?.unitId || editingExpense.unitId || undefined;
        const lockedTripId = editingExpense.tripId || undefined;
        
        // Use custom category if "Other" is selected, otherwise use selected category
        const finalCategory = expenseForm.category === 'Other' ? otherCategory.trim() : expenseForm.category;
        
        const updatedExpense = await updateTransaction(editingExpense.id, {
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          originalCurrency: expenseForm.currency,
          category: finalCategory,
          // Keep original unitId and tripId - drivers cannot change these (admin-only)
          unitId: lockedUnitId,
          tripId: lockedTripId,
          vendorName: expenseForm.vendorName || undefined,
          notes: expenseForm.notes || undefined,
          date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString(),
          receiptUrl: receiptUrl || undefined,
        });

        if (!updatedExpense) {
          throw new Error('Failed to update expense');
        }

        toast({
          title: "Expense Updated",
          description: "Your expense has been updated successfully.",
        });
      } else {
        // Create new expense
        const { createTransaction } = await import('@/lib/supabase/database');
        
        // Validate required fields
        if (!expenseForm.description || !expenseForm.amount || !expenseForm.category) {
          throw new Error('Missing required fields: description, amount, or category');
        }

        if (!expenseForm.unitId) {
          throw new Error('Unit is required');
        }
        
        // Validate "Other" category has custom value
        if (expenseForm.category === 'Other' && !otherCategory.trim()) {
          throw new Error('Please specify the category name when selecting "Other"');
        }

        // For new expenses: if trip is selected, use trip's unit; otherwise use selected unit
        // Drivers cannot change unit/trip assignment - it's locked to the trip they're adding expense to
        const selectedTrip = selectedTripId ? driverTrips.find(t => t.id === selectedTripId) : null;
        const finalUnitId = selectedTrip?.unitId || expenseForm.unitId || undefined;
        const finalTripId = selectedTripId && selectedTripId !== 'none' && selectedTripId.trim() !== '' ? selectedTripId : undefined;
        
        // Use custom category if "Other" is selected, otherwise use selected category
        const finalCategory = expenseForm.category === 'Other' ? otherCategory.trim() : expenseForm.category;

        const transactionData = {
          type: 'expense' as const,
          description: expenseForm.description.trim(),
          amount: parseFloat(expenseForm.amount),
          originalCurrency: expenseForm.currency as 'USD' | 'CAD',
          category: finalCategory,
          unitId: finalUnitId,
          tripId: finalTripId,
          vendorName: expenseForm.vendorName?.trim() || undefined,
          notes: expenseForm.notes?.trim() || undefined,
          date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString(),
          driverId: currentDriver.id,
          receiptUrl: receiptUrl || undefined,
        };

        console.log('Creating transaction with data:', transactionData);

        const newExpense = await createTransaction(transactionData);

        if (!newExpense) {
          throw new Error('Failed to create expense - no data returned');
        }

        toast({
          title: "Expense Added",
          description: "Your expense has been recorded successfully.",
        });
      }

      // Reload trips and transactions to ensure we have the latest data from database
      const [updatedTrips, driverTransactions] = await Promise.all([
        getTripsByDriver(currentDriver.id),
        getTransactionsByDriver(currentDriver.id),
      ]);
      
      setDriverTrips(updatedTrips);
      
      // Group expenses by trip
      const expensesByTrip: Record<string, Transaction[]> = {};
      updatedTrips.forEach(trip => {
        const tripExpensesList = driverTransactions.filter(
          t => t.tripId === trip.id && t.type === 'expense'
        );
        expensesByTrip[trip.id] = tripExpensesList;
      });
      setTripExpenses(expensesByTrip);

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
      setOtherCategory('');
      setReceiptFile(null);
      setReceiptPreview(null);
      setExpenseDialogOpen(false);
      setSelectedTripId(null);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage || (editingExpense ? "Failed to update expense. Please try again." : "Failed to add expense. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    clearDriverSession();
    router.push('/driver/login');
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!currentDriver) return;

    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      const { deleteTransaction } = await import('@/lib/supabase/database');
      const success = await deleteTransaction(expenseId);

      if (!success) {
        throw new Error('Failed to delete expense');
      }

      toast({
        title: "Expense Deleted",
        description: "The expense has been deleted successfully.",
      });

      // Reload trips and transactions
      const [updatedTrips, driverTransactions] = await Promise.all([
        getTripsByDriver(currentDriver.id),
        getTransactionsByDriver(currentDriver.id),
      ]);
      
      setDriverTrips(updatedTrips);
      
      // Group expenses by trip
      const expensesByTrip: Record<string, Transaction[]> = {};
      updatedTrips.forEach(trip => {
        const tripExpensesList = driverTransactions.filter(
          t => t.tripId === trip.id && t.type === 'expense'
        );
        expensesByTrip[trip.id] = tripExpensesList;
      });
      setTripExpenses(expensesByTrip);
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTripTotalExpenses = (tripId: string) => {
    const expenses = tripExpenses[tripId] || [];
    const cadTotal = expenses
      .filter(e => e.originalCurrency === 'CAD')
      .reduce((sum, e) => sum + e.amount, 0);
    const usdTotal = expenses
      .filter(e => e.originalCurrency === 'USD')
      .reduce((sum, e) => sum + e.amount, 0);
    return { cad: cadTotal, usd: usdTotal };
  };

  const openExpenseDialog = (tripId?: string, expense?: Transaction) => {
    if (expense) {
      // Editing existing expense - verify it belongs to this driver
      if (expense.driverId !== currentDriver?.id) {
        toast({
          title: "Access Denied",
          description: "You can only edit your own expenses.",
          variant: "destructive",
        });
        return;
      }
      setEditingExpense(expense);
      // For existing expenses, lock the unit and trip to their original values
      // If expense has a tripId, use the trip's unit; otherwise use expense's unitId
      const expenseTrip = expense.tripId ? driverTrips.find(t => t.id === expense.tripId) : null;
      const lockedUnitId = expenseTrip?.unitId || expense.unitId || '';
      const lockedTripId = expense.tripId || '';
      
      // Check if category is in the standard list, otherwise treat as "Other"
      const standardCategories = ['Fuel', 'Repairs & Maintenance', 'Tires', 'Tolls', 'Parking', 'Insurance', 'Permits', 'Driver pay / subcontractor pay', 'Lodging', 'Meals', 'Miscellaneous'];
      const isCustomCategory = !standardCategories.includes(expense.category);
      
      setExpenseForm({
        unitId: lockedUnitId,
        tripId: lockedTripId,
        description: expense.description,
        amount: expense.amount.toString(),
        category: isCustomCategory ? 'Other' : expense.category,
        currency: expense.originalCurrency,
        vendorName: expense.vendorName || '',
        date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        notes: expense.notes || '',
        receiptUrl: expense.receiptUrl || '',
      });
      setOtherCategory(isCustomCategory ? expense.category : '');
      setReceiptPreview(expense.receiptUrl || null);
      setReceiptFile(null);
      setSelectedTripId(expense.tripId || tripId || null);
    } else {
      setEditingExpense(null);
      const defaultTripId = tripId || '';
      // When adding expense to a trip, automatically set the unit to the trip's assigned unit
      // Drivers cannot change this - it's locked to the trip's unit assignment
      const selectedTrip = tripId ? driverTrips.find(t => t.id === tripId) : null;
      setExpenseForm({
        unitId: selectedTrip?.unitId || '',
        tripId: defaultTripId,
        description: '',
        amount: '',
        category: '',
        currency: 'CAD',
        vendorName: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        receiptUrl: '',
      });
      setOtherCategory('');
      setReceiptPreview(null);
      setReceiptFile(null);
      setSelectedTripId(tripId || null);
    }

    setExpenseDialogOpen(true);
  };

  // Filter and sort driver trips - MUST be called before any early returns to follow Rules of Hooks
  const filteredAndSortedTrips = useMemo(() => {
    let filtered = [...driverTrips];

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
        const status = getTripStatus(trip);
        return status === statusFilter;
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
          aValue = getTripStatus(a);
          bValue = getTripStatus(b);
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
  }, [driverTrips, filterStartDate, filterEndDate, statusFilter, sortBy, sortOrder]);

  const upcomingTrips = useMemo(() => 
    filteredAndSortedTrips.filter(t => getTripStatus(t) === 'upcoming'),
    [filteredAndSortedTrips]
  );
  
  const ongoingTrips = useMemo(() => 
    filteredAndSortedTrips.filter(t => getTripStatus(t) === 'ongoing'),
    [filteredAndSortedTrips]
  );
  
  const completedTrips = useMemo(() => 
    filteredAndSortedTrips.filter(t => getTripStatus(t) === 'completed'),
    [filteredAndSortedTrips]
  );

  // Early return check - must come AFTER all hooks
  if (!currentDriver) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col bg-white min-h-screen w-full overflow-x-hidden">
      {/* Header Section - Monday.com Style */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">Driver Dashboard</h1>
            {currentDriver && (
              <span className="text-sm text-gray-500">Welcome, {currentDriver.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/driver/profile')}
              className="h-9 px-4 rounded-md hidden sm:flex"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/driver/profile')}
              className="h-9 w-9 sm:hidden"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="h-9 px-4 rounded-md"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full overflow-x-hidden px-4 sm:px-6 py-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{driverTrips.length}</div>
              <p className="text-xs text-muted-foreground">
                {completedTrips.length} completed, {ongoingTrips.length} active, {upcomingTrips.length} upcoming
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {(() => {
                const allTotals = driverTrips.reduce((acc, trip) => {
                  const totals = getTripTotalExpenses(trip.id);
                  return {
                    cad: acc.cad + totals.cad,
                    usd: acc.usd + totals.usd,
                  };
                }, { cad: 0, usd: 0 });

                const primaryCurrency = getPrimaryCurrency();
                
                // Calculate grand total by converting to primary currency
                const cadInPrimary = convertCurrency(allTotals.cad, 'CAD', primaryCurrency, cadToUsdRate, usdToCadRate);
                const usdInPrimary = convertCurrency(allTotals.usd, 'USD', primaryCurrency, cadToUsdRate, usdToCadRate);
                const grandTotal = cadInPrimary + usdInPrimary;

                return (
                  <GrandTotalDisplay
                    cadAmount={allTotals.cad}
                    usdAmount={allTotals.usd}
                    primaryCurrency={primaryCurrency}
                    cadToUsdRate={cadToUsdRate}
                    usdToCadRate={usdToCadRate}
                  />
                );
              })()}
              <p className="text-xs text-muted-foreground mt-2">
                Across all trips
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ongoingTrips.length}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Active Trip
              </CardTitle>
              <CardDescription>Current trip in progress - add expenses as needed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ongoingTrips.map((trip) => {
                  const expenses = tripExpenses[trip.id] || [];
                  return (
                    <div key={trip.id} className="space-y-4">
                      <div className="border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        {/* Header Section */}
                        <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-bold text-xl text-foreground">{trip.name}</h3>
                                {getStatusBadge(getTripStatus(trip), trip)}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span className="font-medium">{trip.origin}</span>
                                <Route className="h-3 w-3 mx-1" />
                                <span className="font-medium">{trip.destination}</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => openExpenseDialog(trip.id)}
                              className="flex-1 sm:flex-initial"
                              disabled={isTripLocked(trip)}
                              title={isTripLocked(trip) ? "This trip is locked. You cannot add expenses after 24 hours from the trip end date." : ""}
                              size="lg"
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add Expense
                            </Button>
                          </div>
                        </div>

                        {/* Details Section */}
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Date Range */}
                            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="p-2 bg-primary/10 rounded-md">
                                <Calendar className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Trip Dates</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>

                            {/* Unit */}
                            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="p-2 bg-primary/10 rounded-md">
                                <Truck className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Unit</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {getUnitName(trip.unitId)}
                                </p>
                              </div>
                            </div>

                            {/* Distance */}
                            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="p-2 bg-primary/10 rounded-md flex-shrink-0">
                                <Route className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <DistanceDisplay 
                                  distance={trip.distance || 0}
                                  variant="default"
                                  showLabel={true}
                                />
                              </div>
                            </div>

                            {/* Total Expenses */}
                            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                              <div className="p-2 bg-primary/20 rounded-md">
                                <DollarSign className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Total Expenses</p>
                                {expenses.length > 0 ? (
                                  <p className="text-sm font-bold text-primary">
                                    {(() => {
                                      const totals = getTripTotalExpenses(trip.id);
                                      const total = totals.cad + totals.usd;
                                      const formatted = formatBothCurrencies(total, 'CAD');
                                      return `${formatted.cad} / ${formatted.usd}`;
                                    })()}
                                  </p>
                                ) : (
                                  <p className="text-sm font-semibold text-muted-foreground">No expenses yet</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-lg">Trip Expenses</h4>
                          {expenses.length > 0 && (
                            <Badge variant="secondary">
                              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
                            </Badge>
                          )}
                        </div>
                        
                        {expenses.length > 0 ? (
                          <div className="space-y-4">
                            {/* CAD Expenses */}
                          {expenses.filter(e => e.originalCurrency === 'CAD').length > 0 && (
                            <div className="border-2 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <h5 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
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
                                    <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                                      <TableHead className="font-semibold">Description</TableHead>
                                      <TableHead className="font-semibold">Category</TableHead>
                                      <TableHead className="font-semibold">Date</TableHead>
                                      <TableHead className="text-right font-semibold">Amount</TableHead>
                                      <TableHead className="font-semibold">Receipt</TableHead>
                                      <TableHead className="text-right font-semibold">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {expenses
                                      .filter(e => e.originalCurrency === 'CAD')
                                      .map((expense) => (
                                        <TableRow key={expense.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/10">
                                          <TableCell className="font-medium">{expense.description}</TableCell>
                                          <TableCell>
                                            <Badge variant="destructive" className="text-xs">{expense.category}</Badge>
                                          </TableCell>
                                          <TableCell className="text-sm">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                          <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
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
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openExpenseDialog(trip.id, expense)}
                                                disabled={isTripLocked(trip)}
                                                title={isTripLocked(trip) ? "This trip is locked. You cannot edit expenses after 24 hours from the trip end date." : "Edit expense"}
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteExpense(expense.id)}
                                                className="text-destructive hover:text-destructive"
                                                disabled={isTripLocked(trip)}
                                                title={isTripLocked(trip) ? "This trip is locked. You cannot delete expenses after 24 hours from the trip end date." : "Delete expense"}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
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
                                  <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
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
                                    <TableRow className="bg-green-50/50 dark:bg-green-950/20">
                                      <TableHead className="font-semibold">Description</TableHead>
                                      <TableHead className="font-semibold">Category</TableHead>
                                      <TableHead className="font-semibold">Date</TableHead>
                                      <TableHead className="text-right font-semibold">Amount</TableHead>
                                      <TableHead className="font-semibold">Receipt</TableHead>
                                      <TableHead className="text-right font-semibold">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {expenses
                                      .filter(e => e.originalCurrency === 'USD')
                                      .map((expense) => (
                                        <TableRow key={expense.id} className="hover:bg-green-50/30 dark:hover:bg-green-950/10">
                                          <TableCell className="font-medium">{expense.description}</TableCell>
                                          <TableCell>
                                            <Badge variant="destructive" className="text-xs">{expense.category}</Badge>
                                          </TableCell>
                                          <TableCell className="text-sm">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                          <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
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
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openExpenseDialog(trip.id, expense)}
                                                disabled={isTripLocked(trip)}
                                                title={isTripLocked(trip) ? "This trip is locked. You cannot edit expenses after 24 hours from the trip end date." : "Edit expense"}
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteExpense(expense.id)}
                                                className="text-destructive hover:text-destructive"
                                                disabled={isTripLocked(trip)}
                                                title={isTripLocked(trip) ? "This trip is locked. You cannot delete expenses after 24 hours from the trip end date." : "Delete expense"}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/50">
                            <p>No expenses recorded for this trip yet.</p>
                            <p className="text-xs mt-2">Click "Add Expense" to start tracking expenses for this trip.</p>
                          </div>
                        )}
                      </div>
                    </div>
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
              <CardTitle>Upcoming Trips</CardTitle>
              <CardDescription>Your scheduled trips - you can add expenses once the trip starts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingTrips.map((trip) => {
                  const expenses = tripExpenses[trip.id] || [];
                  return (
                    <div key={trip.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{trip.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {trip.origin} → {trip.destination} • {format(new Date(trip.startDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        {getStatusBadge(getTripStatus(trip))}
                      </div>
                      {expenses.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground mb-2">
                            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} recorded
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Trips */}
        {completedTrips.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed Trips</CardTitle>
              <CardDescription>Past trips and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedTrips.map((trip) => {
                  const expenses = tripExpenses[trip.id] || [];
                  return (
                    <div key={trip.id} className="border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden border-l-4 border-l-primary">
                      {/* Header Section */}
                      <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-xl text-foreground">{trip.name}</h3>
                              {getStatusBadge(getTripStatus(trip), trip)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span className="font-medium">{trip.origin}</span>
                              <Route className="h-3 w-3 mx-1" />
                              <span className="font-medium">{trip.destination}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => openExpenseDialog(trip.id)}
                            className="flex-1 sm:flex-initial"
                            disabled={isTripLocked(trip)}
                            title={isTripLocked(trip) ? "This trip is locked. You cannot add expenses after 24 hours from the trip end date." : ""}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Expense
                          </Button>
                        </div>
                      </div>

                      {/* Details Section */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Date Range */}
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="p-2 bg-primary/10 rounded-md">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Trip Dates</p>
                              <p className="text-sm font-semibold text-foreground">
                                {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>

                          {/* Unit */}
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="p-2 bg-primary/10 rounded-md">
                              <Truck className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Unit</p>
                              <p className="text-sm font-semibold text-foreground">
                                {getUnitName(trip.unitId)}
                              </p>
                            </div>
                          </div>

                          {/* Distance */}
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="p-2 bg-primary/10 rounded-md flex-shrink-0">
                              <Route className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <DistanceDisplay 
                                distance={trip.distance || 0}
                                variant="default"
                                showLabel={true}
                              />
                            </div>
                          </div>

                          {/* Total Expenses */}
                          <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="p-2 bg-primary/20 rounded-md">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Total Expenses</p>
                              {expenses.length > 0 ? (
                                <p className="text-sm font-bold text-primary">
                                  {(() => {
                                    const totals = getTripTotalExpenses(trip.id);
                                    const total = totals.cad + totals.usd;
                                    const formatted = formatBothCurrencies(total, 'CAD');
                                    return `${formatted.cad} / ${formatted.usd}`;
                                  })()}
                                </p>
                              ) : (
                                <p className="text-sm font-semibold text-muted-foreground">No expenses yet</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expenses Section */}
                      <div className="p-6 pt-0">
                        {expenses.length > 0 ? (
                          <div className="space-y-4">
                            {/* CAD Expenses */}
                            {expenses.filter(e => e.originalCurrency === 'CAD').length > 0 && (
                              <div className="border-2 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                  <h5 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
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
                                    <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                                      <TableHead className="font-semibold">Description</TableHead>
                                      <TableHead className="font-semibold">Category</TableHead>
                                      <TableHead className="font-semibold">Date</TableHead>
                                      <TableHead className="text-right font-semibold">Amount</TableHead>
                                      <TableHead className="font-semibold">Receipt</TableHead>
                                      <TableHead className="text-right font-semibold">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {expenses
                                      .filter(e => e.originalCurrency === 'CAD')
                                      .map((expense) => (
                                        <TableRow key={expense.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/10">
                                          <TableCell className="font-medium">{expense.description}</TableCell>
                                          <TableCell>
                                            <Badge variant="destructive" className="text-xs">{expense.category}</Badge>
                                          </TableCell>
                                          <TableCell className="text-sm">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                          <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
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
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openExpenseDialog(trip.id, expense)}
                                                disabled={isTripLocked(trip)}
                                                title={isTripLocked(trip) ? "This trip is locked. You cannot edit expenses after 24 hours from the trip end date." : "Edit expense"}
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteExpense(expense.id)}
                                                className="text-destructive hover:text-destructive"
                                                disabled={isTripLocked(trip)}
                                                title={isTripLocked(trip) ? "This trip is locked. You cannot delete expenses after 24 hours from the trip end date." : "Delete expense"}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
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
                                  <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
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
                                    <TableRow className="bg-green-50/50 dark:bg-green-950/20">
                                      <TableHead className="font-semibold">Description</TableHead>
                                      <TableHead className="font-semibold">Category</TableHead>
                                      <TableHead className="font-semibold">Date</TableHead>
                                      <TableHead className="text-right font-semibold">Amount</TableHead>
                                      <TableHead className="font-semibold">Receipt</TableHead>
                                      <TableHead className="text-right font-semibold">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {expenses
                                      .filter(e => e.originalCurrency === 'USD')
                                      .map((expense) => (
                                        <TableRow key={expense.id} className="hover:bg-green-50/30 dark:hover:bg-green-950/10">
                                          <TableCell className="font-medium">{expense.description}</TableCell>
                                          <TableCell>
                                            <Badge variant="destructive" className="text-xs">{expense.category}</Badge>
                                          </TableCell>
                                          <TableCell className="text-sm">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                          <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
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
                                          <TableCell className="text-right">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => openExpenseDialog(trip.id, expense)}
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
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No expenses recorded for this trip yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {driverTrips.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">No trips assigned yet.</p>
            </CardContent>
          </Card>
        )}

        {/* Add Expense Dialog */}
        <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
              <DialogDescription>
                {editingExpense 
                  ? 'Update the expense details below. Changes will be reflected immediately.'
                  : 'Add a new expense for this trip. All fields marked with * are required.'}
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
                    <SelectTrigger className="w-full sm:w-32">
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
                <Label htmlFor="unitId" className="sm:text-right">Truck *</Label>
                <div className="sm:col-span-3">
                  <Select
                    value={expenseForm.unitId}
                    onValueChange={(value) => setExpenseForm(prev => ({ ...prev, unitId: value }))}
                    disabled={true}
                  >
                    <SelectTrigger className="bg-muted">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Truck assignment is managed by admin only
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="tripId" className="sm:text-right">Trip</Label>
                <div className="sm:col-span-3">
                  <Select
                    value={expenseForm.tripId || 'none'}
                    onValueChange={(value) => setExpenseForm(prev => ({ ...prev, tripId: value === 'none' ? '' : value }))}
                    disabled={true}
                  >
                    <SelectTrigger className="bg-muted">
                      <SelectValue placeholder="Select trip (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {driverTrips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id}>
                          {trip.name} - {trip.origin} → {trip.destination}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trip assignment is managed by admin only
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="category" className="sm:text-right">Category *</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(value) => {
                    setExpenseForm(prev => ({ ...prev, category: value }));
                    // Clear otherCategory if switching away from "Other"
                    if (value !== 'Other') {
                      setOtherCategory('');
                    }
                  }}
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
                    <SelectItem value="Lodging">Lodging</SelectItem>
                    <SelectItem value="Meals">Meals</SelectItem>
                    <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {expenseForm.category === 'Other' && (
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="otherCategory" className="sm:text-right">Category Name *</Label>
                  <Input
                    id="otherCategory"
                    value={otherCategory}
                    onChange={(e) => setOtherCategory(e.target.value)}
                    className="sm:col-span-3"
                    placeholder="Enter custom category name"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="vendorName" className="sm:text-right">Vendor Name</Label>
                <div className="sm:col-span-3">
                  <Input
                    id="vendorName"
                    value={expenseForm.vendorName}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, vendorName: e.target.value }))}
                    placeholder="e.g., Petro-Canada, TA, Loves"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter vendor name manually if not detected from receipt
                  </p>
                </div>
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
                <Label htmlFor="receipt" className="sm:text-right">Receipt</Label>
                <div className="sm:col-span-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Label
                      htmlFor="receipt"
                      className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {receiptFile ? 'Change Image' : 'Take Photo or Select from Gallery'}
                      </span>
                    </Label>
                  </div>
                  
                  {receiptPreview && (
                    <div className="relative border rounded-lg p-2 bg-muted/30">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="max-h-48 w-auto mx-auto rounded"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setReceiptFile(null);
                          setReceiptPreview(null);
                          setExpenseForm(prev => ({ ...prev, receiptUrl: '' }));
                          // Reset file input
                          const fileInput = document.getElementById('receipt') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Click to take a photo with your camera or select an image from your gallery. Maximum file size: 10MB
                  </div>
                </div>
              </div>
            </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isUploading}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddExpense} disabled={isUploading} className="bg-[#0073ea] hover:bg-[#0058c2]">
                {isUploading ? 'Uploading...' : editingExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function DriverDashboardPage() {
  return (
    <DriverRouteGuard>
      <DriverDashboardContent />
    </DriverRouteGuard>
  );
}

