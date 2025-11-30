'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Calendar, Filter, User, Truck, MapPin, Route, TrendingUp, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTransactions, getTrips, getDrivers, getUnits } from '@/lib/data';
import type { Trip, Transaction, Driver, Unit, Location } from '@/lib/types';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { US_STATES, CANADIAN_PROVINCES } from '@/lib/states-provinces';

interface JurisdictionData {
  code: string;
  name: string;
  country: 'USA' | 'Canada';
  totalMiles: number;
  fuelPurchases: number;
  fuelGallons: number;
  trips: Trip[];
}

export default function IFTAReportsPage() {
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<'all' | 'USA' | 'Canada'>('all');

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        console.error('Error loading IFTA report data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load report data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Extract jurisdiction from location
  const getJurisdictionFromLocation = (location?: Location): { code: string; name: string; country: 'USA' | 'Canada' } | null => {
    if (!location) return null;
    
    if (location.country === 'USA' && location.state) {
      const state = US_STATES.find(s => s.abbreviation === location.state || s.name === location.state);
      if (state) {
        return { code: state.abbreviation, name: state.name, country: 'USA' };
      }
    } else if (location.country === 'Canada' && location.state) {
      const province = CANADIAN_PROVINCES.find(p => p.abbreviation === location.state || p.name === location.state);
      if (province) {
        return { code: province.abbreviation, name: province.name, country: 'Canada' };
      }
    }
    
    // Fallback: try to extract from state field directly
    if (location.state) {
      return { 
        code: location.state, 
        name: location.state, 
        country: location.country as 'USA' | 'Canada' || 'USA' 
      };
    }
    
    return null;
  };

  // Extract all jurisdictions from a trip
  const getTripJurisdictions = (trip: Trip): Array<{ code: string; name: string; country: 'USA' | 'Canada' }> => {
    const jurisdictions = new Map<string, { code: string; name: string; country: 'USA' | 'Canada' }>();
    
    // Add origin jurisdiction
    const originJurisdiction = getJurisdictionFromLocation(trip.originLocation);
    if (originJurisdiction) {
      jurisdictions.set(originJurisdiction.code, originJurisdiction);
    }
    
    // Add destination jurisdiction
    const destJurisdiction = getJurisdictionFromLocation(trip.destinationLocation);
    if (destJurisdiction) {
      jurisdictions.set(destJurisdiction.code, destJurisdiction);
    }
    
    // Add jurisdictions from route stops
    if (trip.stops && trip.stops.length > 0) {
      trip.stops.forEach(stop => {
        const stopJurisdiction = getJurisdictionFromLocation(stop.location);
        if (stopJurisdiction) {
          jurisdictions.set(stopJurisdiction.code, stopJurisdiction);
        }
      });
    }
    
    return Array.from(jurisdictions.values());
  };

  // Get fuel transactions for a trip
  const getFuelTransactions = (tripId: string) => {
    return transactions.filter(t => 
      t.tripId === tripId && 
      t.type === 'expense' &&
      (t.category?.toLowerCase().includes('fuel') || 
       t.category?.toLowerCase().includes('gas') ||
       t.category?.toLowerCase().includes('diesel'))
    );
  };

  // Extract jurisdiction from fuel transaction (from vendor name or notes)
  const getFuelJurisdiction = (transaction: Transaction, trip: Trip): { code: string; name: string; country: 'USA' | 'Canada' } | null => {
    // Try to extract from vendor name (e.g., "Petro-Canada - ON" or "Shell - CA")
    if (transaction.vendorName) {
      const parts = transaction.vendorName.split('-');
      if (parts.length > 1) {
        const code = parts[parts.length - 1].trim();
        const state = US_STATES.find(s => s.abbreviation === code);
        const province = CANADIAN_PROVINCES.find(p => p.abbreviation === code);
        if (state) return { code: state.abbreviation, name: state.name, country: 'USA' };
        if (province) return { code: province.abbreviation, name: province.name, country: 'Canada' };
      }
    }
    
    // Fallback: use trip destination jurisdiction
    const tripJurisdictions = getTripJurisdictions(trip);
    return tripJurisdictions.length > 0 ? tripJurisdictions[0] : null;
  };

  // Filter trips based on selected filters
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
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

      // Unit filter
      if (unitFilter !== 'all' && trip.unitId !== unitFilter) {
        return false;
      }

      // Jurisdiction filter
      if (jurisdictionFilter !== 'all') {
        const tripJurisdictions = getTripJurisdictions(trip);
        const hasJurisdiction = tripJurisdictions.some(j => j.code === jurisdictionFilter);
        if (!hasJurisdiction) return false;
      }

      // Country filter
      if (countryFilter !== 'all') {
        const tripJurisdictions = getTripJurisdictions(trip);
        const hasCountry = tripJurisdictions.some(j => j.country === countryFilter);
        if (!hasCountry) return false;
      }

      return true;
    });
  }, [trips, startDate, endDate, statusFilter, driverFilter, unitFilter, jurisdictionFilter, countryFilter]);

  // Calculate jurisdiction data
  const jurisdictionData = useMemo(() => {
    const jurisdictionMap = new Map<string, JurisdictionData>();

    filteredTrips.forEach(trip => {
      const tripJurisdictions = getTripJurisdictions(trip);
      
      tripJurisdictions.forEach(jurisdiction => {
        const key = `${jurisdiction.country}-${jurisdiction.code}`;
        
        if (!jurisdictionMap.has(key)) {
          jurisdictionMap.set(key, {
            code: jurisdiction.code,
            name: jurisdiction.name,
            country: jurisdiction.country,
            totalMiles: 0,
            fuelPurchases: 0,
            fuelGallons: 0,
            trips: [],
          });
        }
        
        const data = jurisdictionMap.get(key)!;
        
        // Add trip distance (divided equally among jurisdictions for now)
        // In a more sophisticated implementation, this would calculate actual miles per jurisdiction
        const distancePerJurisdiction = trip.distance / Math.max(tripJurisdictions.length, 1);
        data.totalMiles += distancePerJurisdiction;
        
        if (!data.trips.find(t => t.id === trip.id)) {
          data.trips.push(trip);
        }
      });

      // Add fuel purchases
      const fuelTransactions = getFuelTransactions(trip.id);
      fuelTransactions.forEach(transaction => {
        const fuelJurisdiction = getFuelJurisdiction(transaction, trip);
        if (fuelJurisdiction) {
          const key = `${fuelJurisdiction.country}-${fuelJurisdiction.code}`;
          
          if (!jurisdictionMap.has(key)) {
            jurisdictionMap.set(key, {
              code: fuelJurisdiction.code,
              name: fuelJurisdiction.name,
              country: fuelJurisdiction.country,
              totalMiles: 0,
              fuelPurchases: 0,
              fuelGallons: 0,
              trips: [],
            });
          }
          
          const data = jurisdictionMap.get(key)!;
          data.fuelPurchases += transaction.amount;
          // Estimate gallons (assuming average price per gallon - this should be improved)
          // For now, we'll use a placeholder calculation
          const estimatedPricePerGallon = 3.50; // USD - should be configurable
          const gallons = transaction.originalCurrency === 'USD' 
            ? transaction.amount / estimatedPricePerGallon
            : transaction.amount / (estimatedPricePerGallon * getCADToUSDRate());
          data.fuelGallons += gallons;
        }
      });
    });

    return Array.from(jurisdictionMap.values()).sort((a, b) => {
      if (a.country !== b.country) return a.country.localeCompare(b.country);
      return a.code.localeCompare(b.code);
    });
  }, [filteredTrips, transactions]);

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

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setDriverFilter('all');
    setUnitFilter('all');
    setJurisdictionFilter('all');
    setCountryFilter('all');
  };

  const hasActiveFilters = startDate || endDate || statusFilter !== 'all' || driverFilter !== 'all' || unitFilter !== 'all' || jurisdictionFilter !== 'all' || countryFilter !== 'all';

  // Export IFTA report to CSV
  const handleExportIFTA = () => {
    if (filteredTrips.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please adjust your filters or ensure there are trips in the selected period.",
        variant: "destructive",
      });
      return;
    }

    const cadToUsdRate = getCADToUSDRate();
    const usdToCadRate = getUSDToCADRate();
    const primaryCurrency = getPrimaryCurrency();

    // Create CSV content
    const csvRows: string[][] = [
      ['IFTA QUARTERLY REPORT'],
      [`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm:ss')}`],
      [`Report Period: ${startDate ? format(new Date(startDate), 'MMM d, yyyy') : 'All'} - ${endDate ? format(new Date(endDate), 'MMM d, yyyy') : 'All'}`],
      [`Total Trips: ${filteredTrips.length}`],
      [`Total Jurisdictions: ${jurisdictionData.length}`],
      [],
      ['=== JURISDICTION SUMMARY ==='],
      [],
      ['Country', 'Jurisdiction Code', 'Jurisdiction Name', 'Total Miles', 'Fuel Purchases (USD)', 'Fuel Purchases (CAD)', 'Estimated Gallons', 'Number of Trips'],
    ];

    // Add jurisdiction summary
    jurisdictionData.forEach(jurisdiction => {
      const fuelUSD = jurisdiction.country === 'USA' 
        ? jurisdiction.fuelPurchases 
        : convertCurrency(jurisdiction.fuelPurchases, 'CAD', 'USD', cadToUsdRate, usdToCadRate);
      
      const fuelCAD = jurisdiction.country === 'Canada'
        ? jurisdiction.fuelPurchases
        : convertCurrency(jurisdiction.fuelPurchases, 'USD', 'CAD', cadToUsdRate, usdToCadRate);

      csvRows.push([
        jurisdiction.country,
        jurisdiction.code,
        jurisdiction.name,
        jurisdiction.totalMiles.toFixed(2),
        fuelUSD.toFixed(2),
        fuelCAD.toFixed(2),
        jurisdiction.fuelGallons.toFixed(2),
        jurisdiction.trips.length.toString(),
      ]);
    });

    csvRows.push([]);
    csvRows.push(['=== TRIP DETAILS ===']);
    csvRows.push([]);
    csvRows.push(['Trip #', 'Trip Name', 'Start Date', 'End Date', 'Origin', 'Destination', 'Jurisdictions', 'Distance (miles)', 'Distance (km)', 'Unit', 'Driver', 'Status']);

    // Add trip details
    filteredTrips.forEach(trip => {
      const tripJurisdictions = getTripJurisdictions(trip);
      const jurisdictionCodes = tripJurisdictions.map(j => j.code).join(', ');
      const unit = units.find(u => u.id === trip.unitId);
      const driver = drivers.find(d => d.id === trip.driverId);
      const now = new Date();
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      let status = trip.status || (now < start ? 'upcoming' : now > end ? 'completed' : 'ongoing');

      csvRows.push([
        trip.tripNumber || trip.id.slice(0, 8),
        trip.name || '',
        format(new Date(trip.startDate), 'yyyy-MM-dd'),
        format(new Date(trip.endDate), 'yyyy-MM-dd'),
        trip.origin || '',
        trip.destination || '',
        jurisdictionCodes || 'N/A',
        trip.distance.toString(),
        (trip.distance * 1.60934).toFixed(2),
        getUnitName(trip.unitId),
        getDriverName(trip.driverId),
        status,
      ]);
    });

    csvRows.push([]);
    csvRows.push(['=== FUEL PURCHASES ===']);
    csvRows.push([]);
    csvRows.push(['Trip #', 'Date', 'Jurisdiction', 'Vendor', 'Amount (Original)', 'Currency', 'Category', 'Description', 'Receipt']);

    // Add fuel purchase details
    filteredTrips.forEach(trip => {
      const fuelTransactions = getFuelTransactions(trip.id);
      fuelTransactions.forEach(transaction => {
        const fuelJurisdiction = getFuelJurisdiction(transaction, trip);
        const jurisdictionCode = fuelJurisdiction ? `${fuelJurisdiction.code}, ${fuelJurisdiction.country}` : 'Unknown';

        csvRows.push([
          trip.tripNumber || trip.id.slice(0, 8),
          format(new Date(transaction.date), 'yyyy-MM-dd'),
          jurisdictionCode,
          transaction.vendorName || '',
          transaction.amount.toString(),
          transaction.originalCurrency || '',
          transaction.category || '',
          transaction.description || '',
          transaction.receiptUrl || 'N/A',
        ]);
      });
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `IFTA_Report_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "IFTA Report Exported",
      description: "The IFTA report has been downloaded successfully.",
    });
  };

  // Get all available jurisdictions from filtered trips
  const availableJurisdictions = useMemo(() => {
    const jurisdictionSet = new Set<string>();
    filteredTrips.forEach(trip => {
      const tripJurisdictions = getTripJurisdictions(trip);
      tripJurisdictions.forEach(j => {
        jurisdictionSet.add(j.code);
      });
    });
    return Array.from(jurisdictionSet).sort();
  }, [filteredTrips]);

  const totalMiles = filteredTrips.reduce((sum, trip) => sum + trip.distance, 0);
  const totalFuelTransactions = filteredTrips.reduce((sum, trip) => sum + getFuelTransactions(trip.id).length, 0);

  return (
    <div className="flex flex-col bg-white min-h-screen w-full overflow-x-hidden">
      {/* Header Section - Monday.com Style */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">IFTA Reports</h1>
            {filteredTrips.length > 0 && (
              <span className="text-sm text-gray-500">
                ({filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'})
              </span>
            )}
          </div>
          <Button
            onClick={handleExportIFTA}
            disabled={filteredTrips.length === 0 || isLoading}
            className="bg-[#0073ea] hover:bg-[#0058c2] text-white h-9 px-4 rounded-md font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Download className="mr-2 h-4 w-4" />
            Export IFTA Report
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full overflow-x-hidden px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <>
            {/* Filters Section */}
            <Card className="mb-6 border border-gray-200 rounded-lg shadow-sm">
              <CardHeader className="pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg font-semibold text-gray-900">Filter Options</CardTitle>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 px-3 text-xs rounded-md"
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Clear All
                    </Button>
                  )}
                </div>
                <CardDescription className="text-sm text-gray-600 mt-1">
                  Select filters to generate customized IFTA reports
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Mobile: Accordion */}
                <div className="lg:hidden">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="filters">
                      <AccordionTrigger className="text-sm font-medium">
                        Filters ({hasActiveFilters ? 'Active' : 'None'})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Date Range</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label htmlFor="iftaStartDate" className="text-xs text-gray-600">Start Date</Label>
                                  <DatePicker
                                    id="iftaStartDate"
                                    value={startDate}
                                    onChange={setStartDate}
                                    placeholder="Start date"
                                    className="w-full"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="iftaEndDate" className="text-xs text-gray-600">End Date</Label>
                                  <DatePicker
                                    id="iftaEndDate"
                                    value={endDate}
                                    onChange={setEndDate}
                                    placeholder="End date"
                                    minDate={startDate ? new Date(startDate) : undefined}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="iftaStatus" className="text-sm font-medium">Status</Label>
                              <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger id="iftaStatus" className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Statuses</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="ongoing">In Progress</SelectItem>
                                  <SelectItem value="upcoming">Upcoming</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="iftaDriver" className="text-sm font-medium">Driver</Label>
                              <Select value={driverFilter} onValueChange={setDriverFilter}>
                                <SelectTrigger id="iftaDriver" className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Drivers</SelectItem>
                                  {drivers.map(driver => (
                                    <SelectItem key={driver.id} value={driver.id}>
                                      {driver.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="iftaUnit" className="text-sm font-medium">Vehicle/Unit</Label>
                              <Select value={unitFilter} onValueChange={setUnitFilter}>
                                <SelectTrigger id="iftaUnit" className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Vehicles</SelectItem>
                                  {units.map(unit => (
                                    <SelectItem key={unit.id} value={unit.id}>
                                      {unit.make} {unit.year} {unit.model} ({unit.plate})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="iftaCountry" className="text-sm font-medium">Country</Label>
                              <Select value={countryFilter} onValueChange={(value) => setCountryFilter(value as typeof countryFilter)}>
                                <SelectTrigger id="iftaCountry" className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Countries</SelectItem>
                                  <SelectItem value="USA">USA</SelectItem>
                                  <SelectItem value="Canada">Canada</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="iftaJurisdiction" className="text-sm font-medium">Jurisdiction</Label>
                              <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
                                <SelectTrigger id="iftaJurisdiction" className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Jurisdictions</SelectItem>
                                  {availableJurisdictions.map(code => (
                                    <SelectItem key={code} value={code}>
                                      {code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* Desktop: Inline Filters */}
                <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <DatePicker
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Start"
                        className="w-full"
                      />
                      <DatePicker
                        value={endDate}
                        onChange={setEndDate}
                        placeholder="End"
                        minDate={startDate ? new Date(startDate) : undefined}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iftaStatus">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="iftaStatus" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="ongoing">In Progress</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iftaDriver">Driver</Label>
                    <Select value={driverFilter} onValueChange={setDriverFilter}>
                      <SelectTrigger id="iftaDriver" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Drivers</SelectItem>
                        {drivers.map(driver => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iftaUnit">Vehicle/Unit</Label>
                    <Select value={unitFilter} onValueChange={setUnitFilter}>
                      <SelectTrigger id="iftaUnit" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vehicles</SelectItem>
                        {units.map(unit => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.make} {unit.year} {unit.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iftaCountry">Country</Label>
                    <Select value={countryFilter} onValueChange={(value) => setCountryFilter(value as typeof countryFilter)}>
                      <SelectTrigger id="iftaCountry" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iftaJurisdiction">Jurisdiction</Label>
                    <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
                      <SelectTrigger id="iftaJurisdiction" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Jurisdictions</SelectItem>
                        {availableJurisdictions.map(code => (
                          <SelectItem key={code} value={code}>
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            {filteredTrips.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="border border-gray-200 rounded-lg shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Trips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-gray-900">{filteredTrips.length}</p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200 rounded-lg shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Miles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DistanceDisplay distance={totalMiles} variant="compact" className="text-2xl font-semibold" />
                  </CardContent>
                </Card>
                <Card className="border border-gray-200 rounded-lg shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Jurisdictions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-gray-900">{jurisdictionData.length}</p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200 rounded-lg shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Fuel Purchases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-gray-900">{totalFuelTransactions}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Jurisdiction Summary Table */}
            {jurisdictionData.length > 0 ? (
              <Card className="mb-6 border border-gray-200 rounded-lg shadow-sm">
                <CardHeader className="pb-4 border-b border-gray-100">
                  <CardTitle className="text-lg font-semibold text-gray-900">Jurisdiction Summary</CardTitle>
                  <CardDescription className="text-sm text-gray-600 mt-1">
                    Miles traveled and fuel purchased by jurisdiction
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Desktop: Table View */}
                  <div className="hidden lg:block w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                          <TableHead className="font-semibold text-gray-900 py-3">Country</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3">Jurisdiction</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3 text-right">Total Miles</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3 text-right">Fuel Purchases</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3 text-right">Est. Gallons</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3 text-right">Trips</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jurisdictionData.map((jurisdiction) => {
                          const cadToUsdRate = getCADToUSDRate();
                          const usdToCadRate = getUSDToCADRate();
                          const fuelUSD = jurisdiction.country === 'USA' 
                            ? jurisdiction.fuelPurchases 
                            : convertCurrency(jurisdiction.fuelPurchases, 'CAD', 'USD', cadToUsdRate, usdToCadRate);
                          
                          const fuelCAD = jurisdiction.country === 'Canada'
                            ? jurisdiction.fuelPurchases
                            : convertCurrency(jurisdiction.fuelPurchases, 'USD', 'CAD', cadToUsdRate, usdToCadRate);

                          return (
                            <TableRow key={`${jurisdiction.country}-${jurisdiction.code}`} className="border-b border-gray-100 hover:bg-gray-50">
                              <TableCell className="py-3">
                                <Badge variant={jurisdiction.country === 'USA' ? 'default' : 'secondary'} className="rounded-full">
                                  {jurisdiction.country}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-gray-900 py-3">
                                {jurisdiction.name} ({jurisdiction.code})
                              </TableCell>
                              <TableCell className="text-right py-3">
                                <DistanceDisplay distance={jurisdiction.totalMiles} variant="inline" className="text-sm" />
                              </TableCell>
                              <TableCell className="text-right py-3">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatCurrency(fuelUSD, 'USD').replace(/[^\d.,-]/g, '')} USD
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatCurrency(fuelCAD, 'CAD').replace(/[^\d.,-]/g, '')} CAD
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right py-3 text-sm text-gray-900">
                                {jurisdiction.fuelGallons.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right py-3">
                                <Badge variant="outline" className="rounded-full">
                                  {jurisdiction.trips.length}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: Card View */}
                  <div className="lg:hidden space-y-3 p-4">
                    {jurisdictionData.map((jurisdiction) => {
                      const cadToUsdRate = getCADToUSDRate();
                      const usdToCadRate = getUSDToCADRate();
                      const fuelUSD = jurisdiction.country === 'USA' 
                        ? jurisdiction.fuelPurchases 
                        : convertCurrency(jurisdiction.fuelPurchases, 'CAD', 'USD', cadToUsdRate, usdToCadRate);
                      
                      const fuelCAD = jurisdiction.country === 'Canada'
                        ? jurisdiction.fuelPurchases
                        : convertCurrency(jurisdiction.fuelPurchases, 'USD', 'CAD', cadToUsdRate, usdToCadRate);

                      return (
                        <div key={`${jurisdiction.country}-${jurisdiction.code}`} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={jurisdiction.country === 'USA' ? 'default' : 'secondary'} className="rounded-full text-xs">
                                  {jurisdiction.country}
                                </Badge>
                                <h3 className="font-semibold text-base text-gray-900">
                                  {jurisdiction.name} ({jurisdiction.code})
                                </h3>
                              </div>
                            </div>
                            <Badge variant="outline" className="rounded-full">
                              {jurisdiction.trips.length} {jurisdiction.trips.length === 1 ? 'trip' : 'trips'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Total Miles</span>
                              <DistanceDisplay distance={jurisdiction.totalMiles} variant="inline" className="font-semibold" />
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Fuel Purchases</span>
                              <div className="text-right">
                                <div className="font-semibold text-gray-900">
                                  {formatCurrency(fuelUSD, 'USD').replace(/[^\d.,-]/g, '')} USD
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(fuelCAD, 'CAD').replace(/[^\d.,-]/g, '')} CAD
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Est. Gallons</span>
                              <span className="font-semibold text-gray-900">{jurisdiction.fuelGallons.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : filteredTrips.length === 0 ? (
              <Card className="border border-gray-200 rounded-lg shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-1">No trips found</p>
                  <p className="text-sm text-gray-600 mb-4">Adjust your filters or add trips to generate IFTA reports.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-gray-200 rounded-lg shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-1">No jurisdiction data</p>
                  <p className="text-sm text-gray-600 mb-4">Trips need location information (state/province) to generate jurisdiction reports.</p>
                </CardContent>
              </Card>
            )}

            {/* Trip Details Section */}
            {filteredTrips.length > 0 && (
              <Card className="border border-gray-200 rounded-lg shadow-sm">
                <CardHeader className="pb-4 border-b border-gray-100">
                  <CardTitle className="text-lg font-semibold text-gray-900">Trip Details</CardTitle>
                  <CardDescription className="text-sm text-gray-600 mt-1">
                    Detailed trip information included in this IFTA report
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Desktop: Table View */}
                  <div className="hidden lg:block w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                          <TableHead className="font-semibold text-gray-900 py-3">Trip #</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3">Trip Name</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3">Dates</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3">Route</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3">Jurisdictions</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3 text-right">Distance</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3">Unit</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3">Driver</TableHead>
                          <TableHead className="font-semibold text-gray-900 py-3">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTrips.map((trip) => {
                          const tripJurisdictions = getTripJurisdictions(trip);
                          const jurisdictionCodes = tripJurisdictions.map(j => j.code).join(', ');
                          const unit = units.find(u => u.id === trip.unitId);
                          const driver = drivers.find(d => d.id === trip.driverId);
                          const now = new Date();
                          const start = new Date(trip.startDate);
                          const end = new Date(trip.endDate);
                          let status = trip.status || (now < start ? 'upcoming' : now > end ? 'completed' : 'ongoing');
                          
                          const statusConfig = {
                            completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
                            ongoing: { label: 'In Progress', className: 'bg-orange-100 text-orange-700 border-orange-200' },
                            upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700 border-blue-200' },
                          };
                          const statusBadge = statusConfig[status as keyof typeof statusConfig] || statusConfig.upcoming;

                          return (
                            <TableRow key={trip.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <TableCell className="font-mono text-sm text-gray-900 py-3">
                                {trip.tripNumber || trip.id.slice(0, 8)}
                              </TableCell>
                              <TableCell className="font-medium text-gray-900 py-3">{trip.name || 'Unnamed Trip'}</TableCell>
                              <TableCell className="text-sm text-gray-600 py-3">
                                {isMounted ? (
                                  <>
                                    {format(new Date(trip.startDate), 'MMM d, yyyy')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                                  </>
                                ) : 'Loading...'}
                              </TableCell>
                              <TableCell className="py-3">
                                <RouteDisplay stops={trip.stops} origin={trip.origin} destination={trip.destination} />
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 py-3">
                                {jurisdictionCodes || 'N/A'}
                              </TableCell>
                              <TableCell className="text-right py-3">
                                <DistanceDisplay distance={trip.distance} variant="inline" className="text-sm" />
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 py-3">
                                {unit ? `${unit.make} ${unit.year}` : 'N/A'}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 py-3">
                                {driver?.name || 'Unassigned'}
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusBadge.className}`}>
                                  {statusBadge.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: Card View */}
                  <div className="lg:hidden space-y-3 p-4">
                    {filteredTrips.map((trip) => {
                      const tripJurisdictions = getTripJurisdictions(trip);
                      const jurisdictionCodes = tripJurisdictions.map(j => `${j.code} (${j.country})`).join(', ');
                      const unit = units.find(u => u.id === trip.unitId);
                      const driver = drivers.find(d => d.id === trip.driverId);
                      const now = new Date();
                      const start = new Date(trip.startDate);
                      const end = new Date(trip.endDate);
                      let status = trip.status || (now < start ? 'upcoming' : now > end ? 'completed' : 'ongoing');
                      
                      const statusConfig = {
                        completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
                        ongoing: { label: 'In Progress', className: 'bg-orange-100 text-orange-700 border-orange-200' },
                        upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700 border-blue-200' },
                      };
                      const statusBadge = statusConfig[status as keyof typeof statusConfig] || statusConfig.upcoming;

                      return (
                        <div key={trip.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-gray-600">
                                  #{trip.tripNumber || trip.id.slice(0, 8)}
                                </span>
                                <Badge className={`rounded-full px-2 py-0.5 text-xs font-medium border ${statusBadge.className}`}>
                                  {statusBadge.label}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-base text-gray-900 mb-1">{trip.name || 'Unnamed Trip'}</h3>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              {isMounted ? (
                                <>
                                  {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                                </>
                              ) : 'Loading...'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Route className="h-4 w-4" />
                              <RouteDisplay stops={trip.stops} origin={trip.origin} destination={trip.destination} />
                            </div>
                            {jurisdictionCodes && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="h-4 w-4" />
                                <span>{jurisdictionCodes}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Truck className="h-4 w-4" />
                              <span>{unit ? `${unit.make} ${unit.year} ${unit.model}` : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="h-4 w-4" />
                              <span>{driver?.name || 'Unassigned'}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-xs text-gray-500">Distance</span>
                              <DistanceDisplay distance={trip.distance} variant="inline" className="font-semibold" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

