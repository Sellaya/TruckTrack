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
import { ArrowLeft, MapPin, Calendar, Route, Package, DollarSign, User, Phone, CreditCard, PlusCircle, Receipt, ChevronDown, ChevronRight, Mail, ArrowUpDown, ArrowUp, ArrowDown, Clock, Filter, Edit, Trash2, Upload } from 'lucide-react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const [otherCategory, setOtherCategory] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const uploadReceiptImage = async (file: File): Promise<string> => {
    try {
      // Try to upload to Supabase Storage if available
      const { supabase } = await import('@/lib/supabase/client');
      
      if (supabase) {
        // Create a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${driverId || 'admin'}-${Date.now()}.${fileExt}`;
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
          // Fallback to base64 if Supabase upload fails
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
      // Fallback to base64 for any error
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
    
    // Validate "Other" category has custom value
    if (expenseForm.category === 'Other' && !otherCategory.trim()) {
      toast({
        title: "Validation Error",
        description: "Please specify the category name when selecting 'Other'.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Use custom category if "Other" is selected, otherwise use selected category
      const finalCategory = expenseForm.category === 'Other' ? otherCategory.trim() : expenseForm.category;
      
      // Upload receipt image if a file is selected
      let receiptUrl = expenseForm.receiptUrl;
      if (receiptFile) {
        receiptUrl = await uploadReceiptImage(receiptFile);
      }
      
      if (editingExpense) {
        // Update existing expense
        const { updateTransaction } = await import('@/lib/supabase/database');
        
        const updatedExpense = await updateTransaction(editingExpense.id, {
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          originalCurrency: expenseForm.currency,
          category: finalCategory,
          unitId: expenseForm.unitId || undefined,
          tripId: expenseForm.tripId && expenseForm.tripId !== 'none' ? expenseForm.tripId : undefined,
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
          category: finalCategory,
          unitId: expenseForm.unitId || undefined,
          tripId: tripId,
          vendorName: expenseForm.vendorName || undefined,
          notes: expenseForm.notes || undefined,
          date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString(),
          driverId: driverId,
          receiptUrl: receiptUrl || undefined,
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
      setOtherCategory('');
      setReceiptFile(null);
      setReceiptPreview(null);
      setExpenseDialogOpen(false);
      setSelectedTripId(null);
      setIsUploading(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: editingExpense ? "Failed to update expense. Please try again." : "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openExpenseDialog = (tripId?: string, expense?: Transaction) => {
    if (expense) {
      // Editing existing expense
      // Check if category is in the standard list, otherwise treat as "Other"
      const standardCategories = ['Fuel', 'Repairs & Maintenance', 'Tires', 'Tolls', 'Parking', 'Insurance', 'Permits', 'Driver pay / subcontractor pay', 'Lodging', 'Meals', 'Miscellaneous'];
      const isCustomCategory = !standardCategories.includes(expense.category);
      
      setEditingExpense(expense);
      setSelectedTripId(expense.tripId || tripId || null);
      setExpenseForm({
        unitId: expense.unitId || '',
        tripId: expense.tripId || '',
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
      setOtherCategory('');
      setReceiptPreview(null);
      setReceiptFile(null);
    }
    setExpenseDialogOpen(true);
  };

  // Calculate totals separately by currency (for all expenses) - single calculation
  const allExpenses = transactions.filter(t => t.type === 'expense');
  const cadTotal = allExpenses
    .filter(t => t.originalCurrency === 'CAD')
    .reduce((sum, t) => sum + t.amount, 0);
  const usdTotal = allExpenses
    .filter(t => t.originalCurrency === 'USD')
    .reduce((sum, t) => sum + t.amount, 0);

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
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden bg-background">
      {/* Header Section - Monday.com Style */}
      <div className="sticky top-0 z-20 bg-white border-b border-border w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 w-full max-w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              onClick={() => router.push('/drivers')}
              className="h-9 px-2 sm:px-3 rounded-lg -ml-2 flex-shrink-0 hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Drivers</span>
            </Button>
            <div className="h-6 w-px bg-border flex-shrink-0 hidden sm:block" />
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-semibold text-foreground truncate">{driver.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Driver Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Driver Info Card - Monday.com Style */}
        <Card className="border border-border rounded-lg shadow-sm bg-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0 w-full space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate flex-1 min-w-0">{driver.name}</h2>
                  <Badge 
                    variant={driver.isActive ? "default" : "secondary"}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${
                      driver.isActive 
                        ? 'bg-green-500/10 text-green-700 border-green-200' 
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {driver.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <a href={`mailto:${driver.email}`} className="text-primary hover:underline truncate min-w-0">
                      {driver.email}
                    </a>
                  </div>
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <a href={`tel:${driver.phone}`} className="hover:text-foreground truncate">
                        {driver.phone}
                      </a>
                    </div>
                  )}
                  {driver.licenseNumber && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{driver.licenseNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards - Monday.com Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border border-border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Total Trips</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Route className="h-5 w-5 text-info" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{trips.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedTrips.length} completed, {ongoingTrips.length} ongoing, {upcomingTrips.length} upcoming
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Total Expenses</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
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

        {/* Filter and Sort Controls - Mobile: Accordion, Desktop: Card */}
        {/* Mobile: Accordion */}
        <div className="lg:hidden">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="filters" className="border border-gray-200 rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Filters</span>
                {(filterStartDate || filterEndDate || statusFilter !== 'all') && (
                  <Badge className="rounded-full px-2 py-0.5 text-xs bg-blue-100 text-blue-700">
                    Active
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div className="space-y-4">
                {/* Date Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Date Range
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Start Date</Label>
                      <DatePicker
                        id="filterStartDate"
                        value={filterStartDate}
                        onChange={setFilterStartDate}
                        placeholder="Select start date"
                        minDate={new Date(1900, 0, 1)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">End Date</Label>
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

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full h-11">
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

                {/* Sort Options */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Sort By</Label>
                    <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'status') => setSortBy(value)}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Order</Label>
                    <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">
                          <div className="flex items-center gap-2">
                            <ArrowDown className="h-3.5 w-3.5" />
                            <span>Desc</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="asc">
                          <div className="flex items-center gap-2">
                            <ArrowUp className="h-3.5 w-3.5" />
                            <span>Asc</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear Filters */}
                {(filterStartDate || filterEndDate || statusFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setStatusFilter('all');
                    }}
                    className="w-full h-10 gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Clear All Filters</span>
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

        {/* Desktop: Card */}
        <Card className="hidden lg:block border border-border rounded-lg shadow-sm bg-card">
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
        <Card className="overflow-hidden mb-4 sm:mb-6">
          <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Route className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="truncate">Ongoing Trips ({ongoingTrips.length})</span>
            </CardTitle>
            <CardDescription className="mt-2 text-xs sm:text-sm">Trips currently in progress - click to view details and add expenses</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6">
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
                      <div className="p-4 sm:p-5 lg:p-6 bg-card">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-primary" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-lg sm:text-xl text-foreground truncate">
                                  {trip.name || 'Unnamed Trip'}
                                </h3>
                                <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 text-xs px-2.5 py-1 h-6 shadow-sm">
                                  <div className="h-1.5 w-1.5 rounded-full bg-white/90 mr-1.5 animate-pulse" />
                                  Ongoing
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openExpenseDialog(trip.id);
                            }}
                            className="bg-[#0073ea] hover:bg-[#0058c2] text-white shadow-sm flex-shrink-0"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Add Expense</span>
                            <span className="sm:hidden">Add</span>
                          </Button>
                        </div>

                        {/* Trip Details Grid */}
                        <div className="space-y-4">
                          {/* Route Card - Full Width */}
                          <div className="p-4 sm:p-5 rounded-lg border-2 border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-blue-100/30">
                            <div className="flex items-center gap-2 mb-4">
                              <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Route</span>
                            </div>
                            <div className="space-y-3">
                              <div className="text-base sm:text-lg font-bold text-foreground">
                                {trip.origin || 'Origin TBD'}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-0.5 bg-blue-300"></div>
                                <ChevronDown className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 h-0.5 bg-blue-300"></div>
                              </div>
                              <div className="text-base sm:text-lg font-bold text-foreground">
                                {trip.destination || 'Destination TBD'}
                              </div>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {/* Date Range Card */}
                            <div className="p-4 sm:p-5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-semibold text-muted-foreground">Date Range</span>
                              </div>
                              <div className="text-base font-bold text-foreground">
                                {trip.startDate && trip.endDate ? (
                                  <>
                                    {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground font-normal">Date TBD</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Distance Card */}
                            <div className="p-4 sm:p-5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-2 mb-3">
                                <Route className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-semibold text-muted-foreground">Distance</span>
                              </div>
                              <DistanceDisplay 
                                distance={trip.distance || 0}
                                variant="default"
                                showLabel={false}
                                className="text-base font-bold"
                              />
                            </div>

                            {/* Total Expenses Card */}
                            {expenses.length > 0 && (
                              <div className="p-4 sm:p-5 rounded-lg border-2 border-green-200/50 bg-gradient-to-br from-green-50/50 to-green-100/30">
                                <div className="flex items-center gap-2 mb-3">
                                  <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
                                  <span className="text-sm font-semibold text-green-700">Total Expenses</span>
                                </div>
                                <GrandTotalDisplay
                                  cadAmount={totals.cad}
                                  usdAmount={totals.usd}
                                  primaryCurrency={primaryCurrency}
                                  cadToUsdRate={cadToUsdRate}
                                  usdToCadRate={usdToCadRate}
                                  variant="compact"
                                  className="text-base font-bold"
                                />
                                <div className="mt-3 pt-3 border-t border-green-200/50">
                                  <span className="text-sm font-medium text-green-700">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Cargo Details Card */}
                          {trip.cargoDetails && (
                            <div className="p-4 sm:p-5 rounded-lg border border-border bg-card">
                              <div className="flex items-center gap-2 mb-3">
                                <Package className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-semibold text-muted-foreground">Cargo Details</span>
                              </div>
                              <div className="text-sm font-medium text-foreground leading-relaxed">{trip.cargoDetails}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-3 sm:p-4 lg:p-6 border-t bg-muted/20 space-y-3 sm:space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                          <h4 className="font-bold text-base sm:text-lg lg:text-xl flex items-center gap-2">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Trip Expenses
                          </h4>
                          <Badge variant="outline" className="text-xs sm:text-sm self-start sm:self-center">
                            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        {/* CAD Expenses */}
                        {expenses.filter(e => e.originalCurrency === 'CAD').length > 0 && (
                          <div className="border-2 rounded-xl p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <h5 className="font-bold text-sm sm:text-base lg:text-lg flex items-center gap-2">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">CAD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-muted text-foreground border-border text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 self-start sm:self-center">
                                {expenses.filter(e => e.originalCurrency === 'CAD').reduce((sum, e) => sum + e.amount, 0).toFixed(2)} CAD
                              </Badge>
                            </div>
                            
                            {/* Mobile: Card Layout */}
                            <div className="md:hidden space-y-3">
                              {expenses
                                .filter(e => e.originalCurrency === 'CAD')
                                .map((expense) => (
                                  <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <h6 className="font-semibold text-sm sm:text-base text-gray-900 truncate mb-1">
                                          {expense.description}
                                        </h6>
                                        <Badge variant="destructive" className="text-xs mb-2">
                                          {expense.category}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openExpenseDialog(trip.id, expense);
                                        }}
                                        className="h-8 w-8 p-0 flex-shrink-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                      <div>
                                        <span className="text-gray-500">Date:</span>
                                        <span className="ml-1 font-medium text-gray-900">{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-gray-500">Amount:</span>
                                        <div className="ml-1 font-semibold text-gray-900">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="CAD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    {expense.receiptUrl && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <a
                                          href={expense.receiptUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                                        >
                                          <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          View Receipt
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                            
                            {/* Desktop: Table Layout */}
                            <div className="hidden md:block overflow-x-auto">
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
                          <div className="border-2 rounded-xl p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-green-50/80 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <h5 className="font-bold text-sm sm:text-base lg:text-lg flex items-center gap-2">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">USD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-muted text-foreground border-border text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 self-start sm:self-center">
                                {expenses.filter(e => e.originalCurrency === 'USD').reduce((sum, e) => sum + e.amount, 0).toFixed(2)} USD
                              </Badge>
                            </div>
                            
                            {/* Mobile: Card Layout */}
                            <div className="md:hidden space-y-3">
                              {expenses
                                .filter(e => e.originalCurrency === 'USD')
                                .map((expense) => (
                                  <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <h6 className="font-semibold text-sm sm:text-base text-gray-900 truncate mb-1">
                                          {expense.description}
                                        </h6>
                                        <Badge variant="destructive" className="text-xs mb-2">
                                          {expense.category}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openExpenseDialog(trip.id, expense);
                                        }}
                                        className="h-8 w-8 p-0 flex-shrink-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                      <div>
                                        <span className="text-gray-500">Date:</span>
                                        <span className="ml-1 font-medium text-gray-900">{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-gray-500">Amount:</span>
                                        <div className="ml-1 font-semibold text-gray-900">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="USD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    {expense.receiptUrl && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <a
                                          href={expense.receiptUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                                        >
                                          <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          View Receipt
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                            
                            {/* Desktop: Table Layout */}
                            <div className="hidden md:block overflow-x-auto">
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
                          <div className="border-2 rounded-xl p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                              <h5 className="font-bold text-sm sm:text-base lg:text-lg flex items-center gap-2">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-foreground" />
                                </div>
                                <span className="text-foreground">Grand Total</span>
                              </h5>
                              <div className="self-start sm:self-center">
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
        <Card className="overflow-hidden mb-4 sm:mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-blue-500/5 border-b p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <span className="truncate">Upcoming Trips ({upcomingTrips.length})</span>
            </CardTitle>
            <CardDescription className="mt-2 text-xs sm:text-sm">Scheduled trips - click to view details</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="space-y-4">
              {upcomingTrips.map((trip) => {
                const expenses = tripExpenses[trip.id] || [];
                const isExpanded = expandedTripId === trip.id;
                const totals = getTripTotalExpenses(trip.id);
                return (
                  <Card key={trip.id} className={`overflow-hidden border-2 transition-all duration-200 ${isExpanded ? 'border-blue-500/50 shadow-lg' : 'hover:border-blue-500/30 hover:shadow-md'}`}>
                    <div 
                      className="cursor-pointer"
                      onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                    >
                      <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-muted/50 via-background to-muted/30">
                        <div className="flex flex-col gap-3 sm:gap-4">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-base sm:text-lg lg:text-xl truncate text-foreground mb-1.5">
                                    {trip.name || 'Unnamed Trip'}
                                  </h3>
                                  <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 h-5 sm:h-6 shadow-sm">
                                    Upcoming
                                  </Badge>
                                </div>
                              </div>

                              {/* Route Information */}
                              <div className="ml-0 sm:ml-[52px] space-y-2.5 sm:space-y-3">
                                <div className="w-full">
                                  <div className="flex items-start gap-2.5 min-w-0 p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-blue-50/50 to-blue-100/30 border-2 border-blue-200/50">
                                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-gray-600 mb-1.5">Route</div>
                                      <div className="flex flex-col gap-1.5">
                                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                                          <span className="truncate block">{trip.origin || 'Origin TBD'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <div className="flex-1 h-px bg-gray-300"></div>
                                          <span className="text-primary text-xs font-medium">↓</span>
                                          <div className="flex-1 h-px bg-gray-300"></div>
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                                          <span className="truncate block">{trip.destination || 'Destination TBD'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-background/60 border border-border/50">
                                    <Calendar className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Start Date</div>
                                      <div className="text-sm font-semibold text-foreground">
                                        {trip.startDate ? (
                                          format(new Date(trip.startDate), 'MMM d, yyyy')
                                        ) : (
                                          <span className="text-muted-foreground font-normal">Date TBD</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-background/60 border border-border/50">
                                    <Route className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Distance</div>
                                      <DistanceDisplay 
                                        distance={trip.distance || 0}
                                        variant="default"
                                        showLabel={false}
                                        className="text-sm font-semibold"
                                      />
                                    </div>
                                  </div>

                                  {expenses.length > 0 && (
                                    <div className="flex flex-col gap-1.5 p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-green-50/50 to-green-100/30 border-2 border-green-200/50">
                                      <div className="text-xs font-semibold text-gray-700">Total Expenses</div>
                                      <GrandTotalDisplay
                                        cadAmount={totals.cad}
                                        usdAmount={totals.usd}
                                        primaryCurrency={primaryCurrency}
                                        cadToUsdRate={cadToUsdRate}
                                        usdToCadRate={usdToCadRate}
                                        variant="compact"
                                        className="text-sm"
                                      />
                                    </div>
                                  )}

                                  {trip.cargoDetails && (
                                    <div className="p-2.5 sm:p-3 rounded-lg bg-background/60 border border-border/50">
                                      <div className="text-xs font-medium text-muted-foreground mb-1.5">Cargo Details</div>
                                      <div className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">{trip.cargoDetails}</div>
                                    </div>
                                  )}
                                </div>
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
                                className="whitespace-nowrap shadow-sm bg-blue-600 hover:bg-blue-700"
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
                      <div className="p-3 sm:p-4 lg:p-6 border-t bg-muted/20 space-y-3 sm:space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                          <h4 className="font-bold text-base sm:text-lg lg:text-xl flex items-center gap-2">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Trip Expenses
                          </h4>
                          <Badge variant="outline" className="text-xs sm:text-sm self-start sm:self-center">
                            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        {/* CAD Expenses */}
                        {expenses.filter(e => e.originalCurrency === 'CAD').length > 0 && (
                          <div className="border-2 rounded-xl p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <h5 className="font-bold text-sm sm:text-base lg:text-lg flex items-center gap-2">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">CAD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 self-start sm:self-center">
                                {totals.cad.toFixed(2)} CAD
                              </Badge>
                            </div>
                            
                            {/* Mobile: Card Layout */}
                            <div className="md:hidden space-y-3">
                              {expenses
                                .filter(e => e.originalCurrency === 'CAD')
                                .map((expense) => (
                                  <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <h6 className="font-semibold text-sm sm:text-base text-gray-900 truncate mb-1">
                                          {expense.description}
                                        </h6>
                                        <Badge variant="destructive" className="text-xs mb-2">
                                          {expense.category}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openExpenseDialog(trip.id, expense);
                                        }}
                                        className="h-8 w-8 p-0 flex-shrink-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                      <div>
                                        <span className="text-gray-500">Date:</span>
                                        <span className="ml-1 font-medium text-gray-900">{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-gray-500">Amount:</span>
                                        <div className="ml-1 font-semibold text-gray-900">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="CAD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    {expense.receiptUrl && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <a
                                          href={expense.receiptUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                                        >
                                          <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          View Receipt
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                            
                            {/* Desktop: Table Layout */}
                            <div className="hidden md:block overflow-x-auto">
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
                          <div className="border-2 rounded-xl p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-green-50/80 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <h5 className="font-bold text-sm sm:text-base lg:text-lg flex items-center gap-2">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">USD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 self-start sm:self-center">
                                {totals.usd.toFixed(2)} USD
                              </Badge>
                            </div>
                            
                            {/* Mobile: Card Layout */}
                            <div className="md:hidden space-y-3">
                              {expenses
                                .filter(e => e.originalCurrency === 'USD')
                                .map((expense) => (
                                  <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <h6 className="font-semibold text-sm sm:text-base text-gray-900 truncate mb-1">
                                          {expense.description}
                                        </h6>
                                        <Badge variant="destructive" className="text-xs mb-2">
                                          {expense.category}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openExpenseDialog(trip.id, expense);
                                        }}
                                        className="h-8 w-8 p-0 flex-shrink-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                      <div>
                                        <span className="text-gray-500">Date:</span>
                                        <span className="ml-1 font-medium text-gray-900">{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-gray-500">Amount:</span>
                                        <div className="ml-1 font-semibold text-gray-900">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="USD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    {expense.receiptUrl && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <a
                                          href={expense.receiptUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                                        >
                                          <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          View Receipt
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                            
                            {/* Desktop: Table Layout */}
                            <div className="hidden md:block overflow-x-auto">
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
                          <div className="border-2 rounded-xl p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                              <h5 className="font-bold text-sm sm:text-base lg:text-lg flex items-center gap-2">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-foreground" />
                                </div>
                                <span className="text-foreground">Grand Total</span>
                              </h5>
                              <div className="self-start sm:self-center">
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

        {/* Completed Trips */}
      {completedTrips.length > 0 && (
        <Card className="overflow-hidden mb-4 sm:mb-6">
          <CardHeader className="bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5 border-b p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <span className="truncate">Completed Trips ({completedTrips.length})</span>
            </CardTitle>
            <CardDescription className="mt-2 text-xs sm:text-sm">Past completed trips - click to view details and expenses</CardDescription>
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
                                  <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 h-5 sm:h-6 shadow-sm">
                                    Completed
                                  </Badge>
                                </div>
                              </div>

                              {/* Route Information */}
                              <div className="ml-0 sm:ml-[52px] space-y-2.5 sm:space-y-3">
                                <div className="w-full">
                                  <div className="flex items-start gap-2.5 min-w-0 p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-blue-50/50 to-blue-100/30 border-2 border-blue-200/50">
                                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-gray-600 mb-1.5">Route</div>
                                      <div className="flex flex-col gap-1.5">
                                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                                          <span className="truncate block">{trip.origin || 'Origin TBD'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <div className="flex-1 h-px bg-gray-300"></div>
                                          <span className="text-primary text-xs font-medium">↓</span>
                                          <div className="flex-1 h-px bg-gray-300"></div>
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                                          <span className="truncate block">{trip.destination || 'Destination TBD'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-background/60 border border-border/50">
                                    <Calendar className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Completed Date</div>
                                      <div className="text-sm font-semibold text-foreground">
                                        {trip.endDate ? format(new Date(trip.endDate), 'MMM d, yyyy') : <span className="text-muted-foreground font-normal">Date TBD</span>}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-background/60 border border-border/50">
                                    <Route className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Distance</div>
                                      <DistanceDisplay 
                                        distance={trip.distance || 0}
                                        variant="default"
                                        showLabel={false}
                                        className="text-sm font-semibold"
                                      />
                                    </div>
                                  </div>

                                  {expenses.length > 0 && (
                                    <div className="flex flex-col gap-1.5 p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-green-50/50 to-green-100/30 border-2 border-green-200/50">
                                      <div className="text-xs font-semibold text-gray-700">Total Expenses</div>
                                      <GrandTotalDisplay
                                        cadAmount={totals.cad}
                                        usdAmount={totals.usd}
                                        primaryCurrency={primaryCurrency}
                                        cadToUsdRate={cadToUsdRate}
                                        usdToCadRate={usdToCadRate}
                                        variant="compact"
                                        className="text-sm"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Cargo Details */}
                                {trip.cargoDetails && (
                                  <div className="ml-0 p-2.5 sm:p-3 rounded-lg bg-background/60 border border-border/50">
                                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Cargo Details</div>
                                    <div className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">{trip.cargoDetails}</div>
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
                      <div className="p-3 sm:p-4 lg:p-6 border-t bg-muted/20 space-y-3 sm:space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                          <h4 className="font-bold text-base sm:text-lg lg:text-xl flex items-center gap-2">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Trip Expenses
                          </h4>
                          <Badge variant="outline" className="text-xs sm:text-sm self-start sm:self-center">
                            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        {/* CAD Expenses */}
                        {expenses.filter(e => e.originalCurrency === 'CAD').length > 0 && (
                          <div className="border-2 rounded-xl p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <h5 className="font-bold text-sm sm:text-base lg:text-lg flex items-center gap-2">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">CAD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 self-start sm:self-center">
                                {totals.cad.toFixed(2)} CAD
                              </Badge>
                            </div>
                            
                            {/* Mobile: Card Layout */}
                            <div className="md:hidden space-y-3">
                              {expenses
                                .filter(e => e.originalCurrency === 'CAD')
                                .map((expense) => (
                                  <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <h6 className="font-semibold text-sm sm:text-base text-gray-900 truncate mb-1">
                                          {expense.description}
                                        </h6>
                                        <Badge variant="destructive" className="text-xs mb-2">
                                          {expense.category}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openExpenseDialog(trip.id, expense);
                                        }}
                                        className="h-8 w-8 p-0 flex-shrink-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                      <div>
                                        <span className="text-gray-500">Date:</span>
                                        <span className="ml-1 font-medium text-gray-900">{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-gray-500">Amount:</span>
                                        <div className="ml-1 font-semibold text-gray-900">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="CAD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    {expense.receiptUrl && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <a
                                          href={expense.receiptUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                                        >
                                          <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          View Receipt
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                            
                            {/* Desktop: Table Layout */}
                            <div className="hidden md:block overflow-x-auto">
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
                          <div className="border-2 rounded-xl p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-green-50/80 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <h5 className="font-bold text-sm sm:text-base lg:text-lg flex items-center gap-2">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                                </div>
                                <span className="text-foreground">USD Expenses</span>
                              </h5>
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 self-start sm:self-center">
                                {totals.usd.toFixed(2)} USD
                              </Badge>
                            </div>
                            
                            {/* Mobile: Card Layout */}
                            <div className="md:hidden space-y-3">
                              {expenses
                                .filter(e => e.originalCurrency === 'USD')
                                .map((expense) => (
                                  <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <h6 className="font-semibold text-sm sm:text-base text-gray-900 truncate mb-1">
                                          {expense.description}
                                        </h6>
                                        <Badge variant="destructive" className="text-xs mb-2">
                                          {expense.category}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openExpenseDialog(trip.id, expense);
                                        }}
                                        className="h-8 w-8 p-0 flex-shrink-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                      <div>
                                        <span className="text-gray-500">Date:</span>
                                        <span className="ml-1 font-medium text-gray-900">{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-gray-500">Amount:</span>
                                        <div className="ml-1 font-semibold text-gray-900">
                                          <CurrencyDisplay
                                            amount={expense.amount}
                                            originalCurrency="USD"
                                            variant="inline"
                                            showLabel={false}
                                            cadToUsdRate={cadToUsdRate}
                                            usdToCadRate={usdToCadRate}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    {expense.receiptUrl && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <a
                                          href={expense.receiptUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                                        >
                                          <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          View Receipt
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                            
                            {/* Desktop: Table Layout */}
                            <div className="hidden md:block overflow-x-auto">
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
                          <div className="border-2 rounded-xl p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                              <h5 className="font-bold text-sm sm:text-base lg:text-lg flex items-center gap-2">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-foreground" />
                                </div>
                                <span className="text-foreground">Grand Total</span>
                              </h5>
                              <div className="self-start sm:self-center">
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

        {/* Empty State - No Trips */}
        {filteredAndSortedTrips.length === 0 && trips.length > 0 && (
          <Card className="border border-border rounded-lg shadow-sm bg-card">
            <CardContent className="p-8 sm:p-12 text-center">
              <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No trips match your filters</h3>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your filter criteria to see more trips.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setStatusFilter('all');
                }}
                className="h-9 px-4"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {trips.length === 0 && (
          <Card className="border border-border rounded-lg shadow-sm bg-card">
            <CardContent className="p-8 sm:p-12 text-center">
              <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No trips assigned yet</h3>
              <p className="text-sm text-muted-foreground">This driver hasn't been assigned any trips yet.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
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
                  Take a photo directly from your device camera or select an image from your gallery. Supported formats: JPG, PNG, WebP.
                </div>
              </div>
            </div>
          </div>
          </div>
          <DialogFooter className="bg-gray-50 border-t border-gray-100 px-6 py-4 space-x-3">
            <DialogClose asChild>
              <Button variant="outline" className="hover:bg-gray-100">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleSaveExpense} 
              className="bg-[#0073ea] hover:bg-[#0058c2] text-white"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : editingExpense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
