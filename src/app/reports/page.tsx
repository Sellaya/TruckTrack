'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Calendar, Filter, User, Truck, MapPin, Route, TrendingUp, X, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTransactions, getTrips, getDrivers, getUnits } from '@/lib/data';
import type { Trip, Transaction, Driver, Unit } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  convertCurrency, 
  getPrimaryCurrency, 
  getCADToUSDRate,
  getUSDToCADRate,
  formatCurrency,
} from '@/lib/currency';
import { format } from 'date-fns';
import { DistanceDisplay } from '@/components/ui/distance-display';
import { RouteDisplay } from '@/components/ui/route-display';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function ReportsPage() {
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [tripsData, transactionsData, driversData, unitsData] = await Promise.all([
          getTrips(),
          getTransactions(),
          getDrivers(),
          getUnits(),
        ]);
        setTrips(tripsData || []);
        setTransactions(transactionsData || []);
        setDrivers(driversData || []);
        setUnits(unitsData || []);
      } catch (error) {
        console.error('Error loading report data:', error);
        toast({
          title: "Error Loading Reports",
          description: "Failed to load report data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Filter trips based on selected filters
  const filteredTrips = trips.filter(trip => {
    // Date range filter
    if (startDate) {
      const tripStartDate = new Date(trip.startDate);
      const filterStartDate = new Date(startDate);
      if (tripStartDate < filterStartDate) return false;
    }
    if (endDate) {
      const tripEndDate = new Date(trip.endDate);
      const filterEndDate = new Date(endDate);
      filterEndDate.setHours(23, 59, 59, 999);
      if (tripEndDate > filterEndDate) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const now = new Date();
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      let tripStatus = trip.status;
      
      if (!tripStatus) {
        if (now < start) tripStatus = 'upcoming';
        else if (now > end) tripStatus = 'completed';
        else tripStatus = 'ongoing';
      }

      if (tripStatus !== statusFilter) return false;
    }

    // Driver filter
    if (driverFilter !== 'all' && trip.driverId !== driverFilter) {
      return false;
    }

    return true;
  });

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || 'Unknown';
  };

  const getUnitName = (unitId?: string) => {
    if (!unitId) return 'N/A';
    const unit = units.find(u => u.id === unitId);
    return unit ? `${unit.make} ${unit.year} ${unit.model}` : 'Unknown';
  };

  const getTripExpenses = (tripId: string) => {
    return transactions.filter(t => t.tripId === tripId && t.type === 'expense');
  };

  const getTripTotalExpenses = (tripId: string) => {
    const expenses = getTripExpenses(tripId);
    const primaryCurrency = getPrimaryCurrency();
    const cadToUsdRate = getCADToUSDRate();
    const usdToCadRate = getUSDToCADRate();

    const total = expenses.reduce((sum, expense) => {
      const converted = convertCurrency(
        expense.amount,
        expense.originalCurrency,
        primaryCurrency,
        cadToUsdRate,
        usdToCadRate
      );
      return sum + converted;
    }, 0);

    return total;
  };

  const getTripStatus = (trip: Trip) => {
    if (trip.status) return trip.status;
    const now = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'ongoing';
  };

  const getStatusBadge = (trip: Trip) => {
    const status = getTripStatus(trip);
    const statusConfig = {
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
      ongoing: { label: 'In Progress', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.upcoming;
    
    return (
      <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // Export trips to CSV
  const handleExportTrips = () => {
    if (filteredTrips.length === 0) {
      toast({
        title: "No Trips to Export",
        description: "Please adjust your filters or add trips to export.",
        variant: "destructive",
      });
      return;
    }

    const primaryCurrency = getPrimaryCurrency();
    const cadToUsdRate = getCADToUSDRate();
    const usdToCadRate = getUSDToCADRate();

    // Create CSV content
    const csvRows: string[][] = [
      ['TRIPS DETAIL REPORT'],
      [`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm:ss')}`],
      [`Date Range: ${startDate ? format(new Date(startDate), 'MMM d, yyyy') : 'All'} - ${endDate ? format(new Date(endDate), 'MMM d, yyyy') : 'All'}`],
      [`Status Filter: ${statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`],
      [`Driver Filter: ${driverFilter === 'all' ? 'All' : getDriverName(driverFilter)}`],
      [`Total Trips: ${filteredTrips.length}`],
      [],
      ['=== TRIP SUMMARY ==='],
      [],
      ['Trip ID', 'Trip Name', 'Status', 'Start Date', 'End Date', 'Origin', 'Destination', 'Distance (miles)', 'Distance (km)', 'Unit Name', 'License Plate', 'Driver Name', 'Driver Email', 'Total Expenses (Primary)', 'Total Expenses (CAD)', 'Total Expenses (USD)', 'Cargo Details', 'Notes'],
    ];

    // Add trip summary rows
    filteredTrips.forEach(trip => {
      const expenses = getTripExpenses(trip.id);
      const totalPrimary = getTripTotalExpenses(trip.id);
      const totalCAD = expenses.reduce((sum, e) => {
        const converted = convertCurrency(e.amount, e.originalCurrency, 'CAD', cadToUsdRate, usdToCadRate);
        return sum + converted;
      }, 0);
      const totalUSD = expenses.reduce((sum, e) => {
        const converted = convertCurrency(e.amount, e.originalCurrency, 'USD', cadToUsdRate, usdToCadRate);
        return sum + converted;
      }, 0);
      const unit = units.find(u => u.id === trip.unitId);
      const driver = drivers.find(d => d.id === trip.driverId);

      csvRows.push([
        trip.id,
        trip.name || '',
        getTripStatus(trip),
        format(new Date(trip.startDate), 'yyyy-MM-dd'),
        format(new Date(trip.endDate), 'yyyy-MM-dd'),
        trip.origin || '',
        trip.destination || '',
        trip.distance.toString(),
        (trip.distance * 1.60934).toFixed(2),
        getUnitName(trip.unitId),
        unit?.plate || '',
        getDriverName(trip.driverId),
        driver?.email || '',
        formatCurrency(totalPrimary, primaryCurrency).replace(/[^\d.-]/g, ''),
        formatCurrency(totalCAD, 'CAD').replace(/[^\d.-]/g, ''),
        formatCurrency(totalUSD, 'USD').replace(/[^\d.-]/g, ''),
        trip.cargoDetails || '',
        trip.notes || '',
      ]);
    });

    csvRows.push([]);
    csvRows.push(['=== TRIP EXPENSES DETAIL ===']);
    csvRows.push([]);
    csvRows.push(['Trip ID', 'Trip Name', 'Expense ID', 'Date', 'Description', 'Category', 'Amount (Original Currency)', 'Currency', 'Amount (CAD)', 'Amount (USD)', 'Vendor Name', 'Notes', 'Receipt URL']);

    // Add expense detail rows
    filteredTrips.forEach(trip => {
      const expenses = getTripExpenses(trip.id).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      expenses.forEach(expense => {
        const amountCAD = convertCurrency(expense.amount, expense.originalCurrency, 'CAD', cadToUsdRate, usdToCadRate);
        const amountUSD = convertCurrency(expense.amount, expense.originalCurrency, 'USD', cadToUsdRate, usdToCadRate);

        csvRows.push([
          trip.id,
          trip.name || '',
          expense.id,
          format(new Date(expense.date), 'yyyy-MM-dd'),
          expense.description || '',
          expense.category || '',
          expense.amount.toString(),
          expense.originalCurrency || '',
          amountCAD.toFixed(2),
          amountUSD.toFixed(2),
          expense.vendorName || '',
          expense.notes || '',
          expense.receiptUrl || '',
        ]);
      });
    });

    // Add summary totals
    csvRows.push([]);
    csvRows.push(['=== SUMMARY TOTALS ===']);
    csvRows.push([]);
    
    const totalExpensesPrimary = filteredTrips.reduce((sum, trip) => sum + getTripTotalExpenses(trip.id), 0);
    const allExpenses = filteredTrips.flatMap(trip => getTripExpenses(trip.id));
    const totalCAD = allExpenses.reduce((sum, e) => {
      const converted = convertCurrency(e.amount, e.originalCurrency, 'CAD', cadToUsdRate, usdToCadRate);
      return sum + converted;
    }, 0);
    const totalUSD = allExpenses.reduce((sum, e) => {
      const converted = convertCurrency(e.amount, e.originalCurrency, 'USD', cadToUsdRate, usdToCadRate);
      return sum + converted;
    }, 0);
    const totalDistance = filteredTrips.reduce((sum, trip) => sum + trip.distance, 0);

    csvRows.push(['Total Trips', filteredTrips.length.toString()]);
    csvRows.push(['Total Distance (miles)', totalDistance.toFixed(2)]);
    csvRows.push(['Total Distance (km)', (totalDistance * 1.60934).toFixed(2)]);
    csvRows.push([`Total Expenses (${primaryCurrency})`, formatCurrency(totalExpensesPrimary, primaryCurrency).replace(/[^\d.-]/g, '')]);
    csvRows.push(['Total Expenses (CAD)', formatCurrency(totalCAD, 'CAD').replace(/[^\d.-]/g, '')]);
    csvRows.push(['Total Expenses (USD)', formatCurrency(totalUSD, 'USD').replace(/[^\d.-]/g, '')]);
    csvRows.push([]);
    csvRows.push(['Exchange Rates']);
    csvRows.push(['1 CAD', getCADToUSDRate().toString() + ' USD']);
    csvRows.push(['1 USD', getUSDToCADRate().toString() + ' CAD']);

    // Convert to CSV string
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        // Escape commas and quotes in cell content
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const dateRange = startDate || endDate 
      ? `_${startDate ? format(new Date(startDate), 'yyyy-MM-dd') : 'all'}_to_${endDate ? format(new Date(endDate), 'yyyy-MM-dd') : 'all'}`
      : '';
    a.download = `Trips_Report${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: `${filteredTrips.length} trip(s) exported successfully. Ready to share with your accountant.`,
    });
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setDriverFilter('all');
  };

  const hasActiveFilters = startDate || endDate || statusFilter !== 'all' || driverFilter !== 'all';
  const totalDistance = filteredTrips.reduce((sum, trip) => sum + trip.distance, 0);
  const totalExpenses = filteredTrips.reduce((sum, trip) => sum + getTripTotalExpenses(trip.id), 0);
  const totalExpenseRecords = filteredTrips.reduce((sum, trip) => sum + getTripExpenses(trip.id).length, 0);

  return (
    <div className="flex flex-col bg-white min-h-screen w-full overflow-x-hidden">
      {/* Header Section - Monday.com Style */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
            {filteredTrips.length > 0 && (
              <span className="text-sm text-gray-500">({filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => router.push('/reports/ifta')}
              className="h-9 px-4 rounded-md font-medium"
            >
              <Receipt className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">IFTA Reports</span>
              <span className="sm:hidden">IFTA</span>
            </Button>
            <Button 
              onClick={handleExportTrips} 
              disabled={isLoading || filteredTrips.length === 0}
              className="bg-[#0073ea] hover:bg-[#0058c2] text-white h-9 px-4 rounded-md font-medium shadow-sm hover:shadow-md transition-all"
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full overflow-x-hidden px-4 sm:px-6 py-6">
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Filters Section */}
            {/* Mobile: Accordion */}
            <div className="lg:hidden mb-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="filters" className="border border-gray-200 rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Filters</span>
                      {hasActiveFilters && (
                        <Badge className="rounded-full px-2 py-0.5 text-xs bg-blue-100 text-blue-700">
                          Active
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Start Date</Label>
                        <DatePicker
                          id="startDate"
                          value={startDate}
                          onChange={setStartDate}
                          placeholder="Select start date"
                          minDate={new Date(1900, 0, 1)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">End Date</Label>
                        <DatePicker
                          id="endDate"
                          value={endDate}
                          onChange={setEndDate}
                          placeholder="Select end date"
                          minDate={startDate ? new Date(startDate) : new Date(1900, 0, 1)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full">
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
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Driver</Label>
                        <Select value={driverFilter} onValueChange={setDriverFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Drivers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Drivers</SelectItem>
                            {drivers.filter(d => d.isActive).map(driver => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {hasActiveFilters && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleClearFilters}
                        className="w-full"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Desktop: Inline Filters */}
            <div className="hidden lg:flex lg:items-center lg:gap-3 lg:flex-wrap lg:mb-6">
              <DatePicker
                id="startDate"
                value={startDate}
                onChange={setStartDate}
                placeholder="Start date"
                minDate={new Date(1900, 0, 1)}
                className="w-36 h-9 flex-shrink-0"
              />
              <span className="text-gray-400 flex-shrink-0">-</span>
              <DatePicker
                id="endDate"
                value={endDate}
                onChange={setEndDate}
                placeholder="End date"
                minDate={startDate ? new Date(startDate) : new Date(1900, 0, 1)}
                className="w-36 h-9 flex-shrink-0"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-36 bg-white border-gray-300 flex-shrink-0">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger className="h-9 min-w-[160px] bg-white border-gray-300 flex-shrink-0">
                  <SelectValue placeholder="All Drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {drivers.filter(d => d.isActive).map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9 text-sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            {/* Summary Metrics - Monday.com Style */}
            {filteredTrips.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Route className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Total Trips</p>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{filteredTrips.length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Total Distance</p>
                  </div>
                  <DistanceDisplay 
                    distance={totalDistance}
                    variant="default"
                    showLabel={false}
                    className="text-xl font-semibold"
                  />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Total Expenses</p>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(totalExpenses, getPrimaryCurrency())}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Expense Records</p>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{totalExpenseRecords}</p>
                </div>
              </div>
            )}

            {/* Trips Section */}
            {filteredTrips.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-1">
                  {trips.length === 0 
                    ? 'No trips found' 
                    : 'No trips match your filters'}
                </p>
                <p className="text-sm text-gray-600">
                  {trips.length === 0 
                    ? 'Add trips to generate reports.'
                    : 'Try adjusting your filter criteria.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop: Table View */}
                <div className="hidden lg:block w-full overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900 py-3">Trip Name</TableHead>
                            <TableHead className="font-semibold text-gray-900 py-3">Route</TableHead>
                            <TableHead className="font-semibold text-gray-900 py-3">Dates</TableHead>
                            <TableHead className="font-semibold text-gray-900 py-3">Driver</TableHead>
                            <TableHead className="font-semibold text-gray-900 py-3">Unit</TableHead>
                            <TableHead className="font-semibold text-gray-900 py-3">Status</TableHead>
                            <TableHead className="text-right font-semibold text-gray-900 py-3">Expenses</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTrips.slice(0, 10).map(trip => (
                            <TableRow key={trip.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <TableCell className="font-medium text-gray-900 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-gray-500">#{trip.tripNumber || 'N/A'}</span>
                                  <span>{trip.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <RouteDisplay
                                  stops={trip.stops || []}
                                  origin={trip.origin}
                                  destination={trip.destination}
                                  originLocation={trip.originLocation}
                                  destinationLocation={trip.destinationLocation}
                                  variant="compact"
                                  maxStops={3}
                                  className="text-sm text-gray-700"
                                />
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 py-3">
                                <div>{format(new Date(trip.startDate), 'MMM d, yyyy')}</div>
                                <div className="text-xs text-gray-500">to {format(new Date(trip.endDate), 'MMM d, yyyy')}</div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 py-3">{getDriverName(trip.driverId)}</TableCell>
                              <TableCell className="text-sm text-gray-600 py-3">{getUnitName(trip.unitId)}</TableCell>
                              <TableCell className="py-3">
                                {getStatusBadge(trip)}
                              </TableCell>
                              <TableCell className="text-right py-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(getTripTotalExpenses(trip.id), getPrimaryCurrency())}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ({getTripExpenses(trip.id).length} record{getTripExpenses(trip.id).length !== 1 ? 's' : ''})
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {/* Mobile: Card View */}
                <div className="lg:hidden space-y-3">
                  {filteredTrips.slice(0, 10).map(trip => (
                    <div key={trip.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-500 font-medium">#{trip.tripNumber || 'N/A'}</span>
                              <h3 className="font-semibold text-base text-gray-900 truncate">{trip.name}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {getStatusBadge(trip)}
                              <span className="text-xs text-gray-500">
                                {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Route */}
                        <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <RouteDisplay
                              stops={trip.stops || []}
                              origin={trip.origin}
                              destination={trip.destination}
                              originLocation={trip.originLocation}
                              destinationLocation={trip.destinationLocation}
                              variant="compact"
                              maxStops={4}
                              className="text-xs text-gray-700"
                            />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-sm">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-600 truncate max-w-[100px]">{getDriverName(trip.driverId)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-600 truncate max-w-[100px]">{getUnitName(trip.unitId)}</span>
                          </div>
                        </div>

                        {/* Expenses */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500">Total Expenses</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(getTripTotalExpenses(trip.id), getPrimaryCurrency())}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Records</p>
                            <p className="text-sm font-medium text-gray-900">
                              {getTripExpenses(trip.id).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Note */}
                {filteredTrips.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Showing first 10 trips. All <span className="font-medium">{filteredTrips.length}</span> trips will be included in the export.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
