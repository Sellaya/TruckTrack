'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Calendar, Filter, ArrowUpDown } from "lucide-react";
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
    return unit?.name || 'Unknown';
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
        unit?.licensePlate || '',
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

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Export detailed trip reports for accounting and analysis
          </p>
        </div>
        <Button 
          onClick={handleExportTrips} 
          className="w-full sm:w-auto"
          disabled={isLoading || filteredTrips.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Trips Report
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Filter & Export Options</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-1">
            Filter trips by date range, status, or driver before exporting
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Date Range Filters */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 pb-2.5 sm:pb-3 border-b border-border/50">
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
                    <Label htmlFor="startDate" className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400">
                      Start Date
                    </Label>
                  </div>
                  <DatePicker
                    id="startDate"
                    value={startDate}
                    onChange={setStartDate}
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
                    <Label htmlFor="endDate" className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">
                      End Date
                    </Label>
                  </div>
                  <DatePicker
                    id="endDate"
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Select end date"
                    minDate={startDate ? new Date(startDate) : new Date(1900, 0, 1)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            {/* Status & Driver Filter Options */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 pb-2.5 sm:pb-3 border-b border-border/50">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <Label className="text-sm sm:text-base font-semibold text-foreground">Filter Options</Label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                
                {/* Driver Filter */}
                <div className="space-y-2 sm:space-y-2.5 min-w-0">
                  <Label htmlFor="driverFilter" className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="whitespace-nowrap">Driver</span>
                  </Label>
                  <Select value={driverFilter} onValueChange={setDriverFilter}>
                    <SelectTrigger id="driverFilter" className="h-10 sm:h-11 text-sm w-full min-w-0">
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
            </div>
          </div>
          
          {/* Clear Filters Button & Results Count */}
          {(startDate || endDate || statusFilter !== 'all' || driverFilter !== 'all') && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t">
              <Badge variant="secondary" className="w-full sm:w-auto justify-center sm:justify-start">
                {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''} match your filters
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearFilters}
                className="h-9 sm:h-10 gap-2 w-full sm:w-auto text-sm"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Clear All Filters</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Report Summary</CardTitle>
          <CardDescription>
            Preview of filtered trips that will be included in the export
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Loading report data...</p>
            </div>
          ) : filteredTrips.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Trips</p>
                  <p className="text-2xl font-bold">{filteredTrips.length}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Distance</p>
                  <div className="flex flex-col gap-1">
                    <DistanceDisplay 
                      distance={filteredTrips.reduce((sum, trip) => sum + trip.distance, 0)}
                      variant="default"
                      showLabel={false}
                      className="text-2xl"
                    />
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(
                      filteredTrips.reduce((sum, trip) => sum + getTripTotalExpenses(trip.id), 0),
                      getPrimaryCurrency()
                    )}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Expenses (Records)</p>
                  <p className="text-2xl font-bold">
                    {filteredTrips.reduce((sum, trip) => sum + getTripExpenses(trip.id).length, 0)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Trip Name</TableHead>
                      <TableHead className="font-semibold">Route</TableHead>
                      <TableHead className="font-semibold">Dates</TableHead>
                      <TableHead className="font-semibold">Driver</TableHead>
                      <TableHead className="font-semibold">Unit</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Expenses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.slice(0, 10).map(trip => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">{trip.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{trip.origin}</div>
                            <div className="text-muted-foreground">→ {trip.destination}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(new Date(trip.startDate), 'MMM d, yyyy')}</div>
                            <div className="text-muted-foreground">to {format(new Date(trip.endDate), 'MMM d, yyyy')}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getDriverName(trip.driverId)}</TableCell>
                        <TableCell>{getUnitName(trip.unitId)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            getTripStatus(trip) === 'completed' ? 'secondary' :
                            getTripStatus(trip) === 'ongoing' ? 'default' : 'outline'
                          }>
                            {getTripStatus(trip)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            getTripTotalExpenses(trip.id),
                            getPrimaryCurrency()
                          )}
                          <div className="text-xs text-muted-foreground">
                            ({getTripExpenses(trip.id).length} expense{getTripExpenses(trip.id).length !== 1 ? 's' : ''})
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredTrips.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing first 10 trips. All {filteredTrips.length} trips will be included in the export.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                {trips.length === 0 
                  ? 'No trips found. Add trips to generate reports.'
                  : 'No trips match your current filters. Try adjusting your filter criteria.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
