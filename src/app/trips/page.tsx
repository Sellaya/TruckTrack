'use client';

import React, { useState, useMemo } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MapPin, Calendar, Route, Package, FileText, Truck, User, Edit, ChevronDown, ChevronRight, Receipt, ExternalLink, Filter, ArrowUpDown, ArrowUp, ArrowDown, Clock, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrips, getUnits, getDrivers, createTrip, updateTrip, deleteTrip, getTransactions } from '@/lib/data';
import type { Trip, Unit, Location, Driver } from '@/lib/types';
import { CityAutocomplete } from '@/components/ui/city-autocomplete';
import type { CityLocation } from '@/lib/address-autocomplete';
import { calculateDistanceMiles } from '@/lib/distance-calculator';
import { DistanceDisplay } from '@/components/ui/distance-display';
import { GrandTotalDisplay, CurrencyDisplay } from '@/components/ui/currency-display';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  convertCurrency, 
  getPrimaryCurrency, 
  getCADToUSDRate,
  getUSDToCADRate,
  formatCurrency
} from '@/lib/currency';

function TripsPageContent() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originLocation, setOriginLocation] = useState<Location | undefined>(undefined);
  const [destinationLocation, setDestinationLocation] = useState<Location | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [distance, setDistance] = useState('');
  const [calculatedDistance, setCalculatedDistance] = useState<{ miles: number; kilometers: number } | null>(null);
  const [cargoDetails, setCargoDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [unitId, setUnitId] = useState<string | undefined>(undefined);
  const [driverId, setDriverId] = useState<string | undefined>(undefined);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [status, setStatus] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Filter and sort states
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status' | 'distance'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Load each data source independently to prevent one failure from breaking everything
      const loadTrips = async () => {
        try {
          const data = await getTrips();
          return Array.isArray(data) ? data : [];
        } catch (error) {
          console.error('Error loading trips:', error);
          return [];
        }
      };

      const loadUnits = async () => {
        try {
          const data = await getUnits();
          return Array.isArray(data) ? data : [];
        } catch (error) {
          console.error('Error loading units:', error);
          return [];
        }
      };

      const loadDrivers = async () => {
        try {
          const data = await getDrivers();
          return Array.isArray(data) ? data : [];
        } catch (error) {
          console.error('Error loading drivers:', error);
          return [];
        }
      };

      const loadTransactions = async () => {
        try {
          const data = await getTransactions();
          return Array.isArray(data) ? data : [];
        } catch (error) {
          console.error('Error loading transactions:', error);
          return [];
        }
      };

      try {
        // Load all data in parallel, but handle each independently
        const [tripsData, unitsData, driversData, transactionsData] = await Promise.allSettled([
          loadTrips(),
          loadUnits(),
          loadDrivers(),
          loadTransactions(),
        ]);

        setTrips(tripsData.status === 'fulfilled' ? tripsData.value : []);
        setUnits(unitsData.status === 'fulfilled' ? unitsData.value : []);
        setDrivers(driversData.status === 'fulfilled' ? driversData.value : []);
        setTransactions(transactionsData.status === 'fulfilled' ? transactionsData.value : []);

        // Show warning if any failed
        const failures = [
          tripsData.status === 'rejected' && 'trips',
          unitsData.status === 'rejected' && 'units',
          driversData.status === 'rejected' && 'drivers',
          transactionsData.status === 'rejected' && 'transactions',
        ].filter(Boolean);

        if (failures.length > 0) {
          console.warn('Some data failed to load:', failures);
        }
      } catch (error) {
        console.error('Unexpected error loading data:', error);
        toast({
          title: "Error Loading Data",
          description: "Some data may not have loaded. Please refresh the page if needed.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-calculate distance when both locations are selected
  useEffect(() => {
    if (originLocation?.latitude && originLocation?.longitude && 
        destinationLocation?.latitude && destinationLocation?.longitude) {
      const miles = calculateDistanceMiles(
        { latitude: originLocation.latitude, longitude: originLocation.longitude },
        { latitude: destinationLocation.latitude, longitude: destinationLocation.longitude }
      );
      const kilometers = miles * 1.60934;
      setCalculatedDistance({ miles, kilometers });
      setDistance(miles.toString());
    } else {
      setCalculatedDistance(null);
    }
  }, [originLocation, destinationLocation]);

  const resetForm = () => {
    setName('');
    setOrigin('');
    setDestination('');
    setOriginLocation(undefined);
    setDestinationLocation(undefined);
    setStartDate('');
    setEndDate('');
    setDistance('');
    setCalculatedDistance(null);
    setCargoDetails('');
    setNotes('');
    setUnitId(undefined);
    setDriverId(undefined);
    setStatus('upcoming');
    setEditingTrip(null);
  };

  const getStatus = (trip: Trip) => {
    try {
      if (!trip || !trip.startDate || !trip.endDate) {
        return (
          <Badge 
            variant="outline" 
            className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 h-5 sm:h-6 flex items-center justify-center min-w-fit"
          >
            Unknown
          </Badge>
        );
      }
      const now = new Date();
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return (
          <Badge 
            variant="outline" 
            className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 h-5 sm:h-6 flex items-center justify-center min-w-fit"
          >
            Invalid Date
          </Badge>
        );
      }
      
      if (now < start) {
        return (
          <Badge 
            variant="outline" 
            className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 h-5 sm:h-6 flex items-center justify-center min-w-fit"
          >
            Upcoming
          </Badge>
        );
      }
      
      if (now > end) {
        return (
          <Badge 
            variant="secondary" 
            className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 h-5 sm:h-6 flex items-center justify-center min-w-fit"
          >
            Completed
          </Badge>
        );
      }
      
      return (
        <Badge 
          className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 h-5 sm:h-6 flex items-center justify-center min-w-fit whitespace-nowrap"
        >
          In Progress
        </Badge>
      );
    } catch (error) {
      console.error('Error getting trip status:', error);
      return (
        <Badge 
          variant="outline" 
          className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 h-5 sm:h-6 flex items-center justify-center min-w-fit"
        >
          Error
        </Badge>
      );
    }
  }

  const getUnitName = (unitId?: string) => {
    try {
      if (!unitId || !Array.isArray(units)) return 'N/A';
      return units.find(u => u && u.id === unitId)?.name || 'Unknown';
    } catch (error) {
      console.error('Error getting unit name:', error);
      return 'N/A';
    }
  }

  const getDriverName = (driverId?: string) => {
    try {
      if (!driverId || !Array.isArray(drivers)) return 'Unassigned';
      return drivers.find(d => d && d.id === driverId)?.name || 'Unknown';
    } catch (error) {
      console.error('Error getting driver name:', error);
      return 'Unassigned';
    }
  }

  const getTripTotalExpenses = (tripId: string) => {
    if (!Array.isArray(transactions) || transactions.length === 0 || !tripId) {
      return { cad: 0, usd: 0 };
    }
    
    const tripTransactions = transactions.filter(t => 
      t && 
      typeof t === 'object' &&
      t.tripId === tripId && 
      t.type === 'expense' &&
      typeof t.amount === 'number' &&
      t.originalCurrency
    );
    
    if (tripTransactions.length === 0) {
      return { cad: 0, usd: 0 };
    }
    
    const cadTotal = tripTransactions
      .filter(t => t.originalCurrency === 'CAD')
      .reduce((sum, t) => {
        try {
          const amount = typeof t.amount === 'number' ? t.amount : 0;
          return sum + (isNaN(amount) ? 0 : amount);
        } catch (error) {
          console.error('Error calculating CAD expense:', error, t);
          return sum;
        }
      }, 0);
    
    const usdTotal = tripTransactions
      .filter(t => t.originalCurrency === 'USD')
      .reduce((sum, t) => {
        try {
          const amount = typeof t.amount === 'number' ? t.amount : 0;
          return sum + (isNaN(amount) ? 0 : amount);
        } catch (error) {
          console.error('Error calculating USD expense:', error, t);
          return sum;
        }
      }, 0);
    
    return { 
      cad: isNaN(cadTotal) ? 0 : cadTotal, 
      usd: isNaN(usdTotal) ? 0 : usdTotal 
    };
  }

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
      const now = new Date();
      filtered = filtered.filter(trip => {
        let tripStatus = trip.status;
        
        // Calculate status if not set
        if (!tripStatus && trip.startDate && trip.endDate) {
          const start = new Date(trip.startDate);
          const end = new Date(trip.endDate);
          if (now < start) tripStatus = 'upcoming';
          else if (now > end) tripStatus = 'completed';
          else tripStatus = 'ongoing';
        }

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
          const now = new Date();
          aValue = a.status || (a.startDate && a.endDate ? 
            (now < new Date(a.startDate) ? 'upcoming' : 
             now > new Date(a.endDate) ? 'completed' : 'ongoing') : 'unknown');
          bValue = b.status || (b.startDate && b.endDate ? 
            (now < new Date(b.startDate) ? 'upcoming' : 
             now > new Date(b.endDate) ? 'completed' : 'ongoing') : 'unknown');
          break;
        case 'distance':
          aValue = a.distance || 0;
          bValue = b.distance || 0;
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

  const handleDeleteTrip = (trip: Trip) => {
    setTripToDelete(trip);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;

    try {
      const success = await deleteTrip(tripToDelete.id);
      
      if (success) {
        // Reload trips after deletion
        const data = await getTrips();
        setTrips(data || []);
        toast({ 
          title: "Trip Deleted", 
          description: `${tripToDelete.name || 'Trip'} has been permanently deleted.` 
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete trip. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred while deleting the trip.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTripToDelete(null);
    }
  };

  const handleEditTrip = (trip: Trip) => {
    try {
      if (!trip || !trip.id) {
        toast({
          title: "Error",
          description: "Invalid trip data. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }
      
      setEditingTrip(trip);
      setName(trip.name || '');
      setOrigin(trip.origin || '');
      setDestination(trip.destination || '');
      setOriginLocation(trip.originLocation);
      setDestinationLocation(trip.destinationLocation);
      
      try {
        if (trip.startDate) {
          const startDateObj = new Date(trip.startDate);
          if (!isNaN(startDateObj.getTime())) {
            setStartDate(format(startDateObj, 'yyyy-MM-dd'));
          } else {
            setStartDate('');
          }
        } else {
          setStartDate('');
        }
        
        if (trip.endDate) {
          const endDateObj = new Date(trip.endDate);
          if (!isNaN(endDateObj.getTime())) {
            setEndDate(format(endDateObj, 'yyyy-MM-dd'));
          } else {
            setEndDate('');
          }
        } else {
          setEndDate('');
        }
      } catch (dateError) {
        console.error('Error parsing trip dates:', dateError);
        setStartDate('');
        setEndDate('');
      }
      
      setDistance(trip.distance?.toString() || '0');
      setCargoDetails(trip.cargoDetails || '');
      setNotes(trip.notes || '');
      setUnitId(trip.unitId);
      setDriverId(trip.driverId);
      setStatus(trip.status || 'upcoming');
      setOpen(true);
    } catch (error) {
      console.error('Error editing trip:', error);
      toast({
        title: "Error",
        description: "Failed to load trip data. Please refresh and try again.",
        variant: "destructive",
      });
    }
  }

  const handleSaveTrip = async () => {
    // Validate dates
    if (!startDate || !endDate) {
      toast({
        title: "Validation Error",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    // Validate driver assignment
    if (!driverId) {
      toast({
        title: "Validation Error",
        description: "Please assign a driver to this trip. Drivers can only view and add expenses to trips assigned to them.",
        variant: "destructive",
      });
      return;
    }

    // Parse dates properly (handle yyyy-MM-dd format)
    const parseDate = (dateStr: string): Date => {
      try {
        if (!dateStr || typeof dateStr !== 'string') {
          return new Date();
        }
        // If it's already in ISO format, parse directly
        if (dateStr.includes('T')) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) return parsed;
        }
        // Otherwise, parse yyyy-MM-dd format
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const parsed = new Date(year, month, day);
            if (!isNaN(parsed.getTime())) return parsed;
          }
        }
        // Fallback to direct parsing
        const parsed = new Date(dateStr);
        return !isNaN(parsed.getTime()) ? parsed : new Date();
      } catch (error) {
        console.error('Error parsing date:', error, dateStr);
        return new Date();
      }
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast({
        title: "Invalid Date",
        description: "Please select valid dates.",
        variant: "destructive",
      });
      return;
    }

    // Validate end date is after start date
    if (end < start) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const now = new Date();
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Determine status based on dates
    let calculatedStatus: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
    if (nowDateOnly > endDateOnly) calculatedStatus = 'completed';
    else if (nowDateOnly >= startDateOnly && nowDateOnly <= endDateOnly) calculatedStatus = 'ongoing';

    // Set time to start of day for consistent storage
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    try {
      if (editingTrip) {
        // Update existing trip
        const updatedTrip = await updateTrip(editingTrip.id, {
          name,
          origin,
          destination,
          originLocation,
          destinationLocation,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          distance: parseInt(distance, 10),
          cargoDetails,
          notes,
          unitId,
          driverId,
          status: calculatedStatus,
        });

        if (updatedTrip) {
          // Reload trips to ensure we have the latest data from database
          const updatedTrips = await getTrips();
          setTrips(updatedTrips || []);
          resetForm();
          setOpen(false);
          toast({
            title: "Trip Updated",
            description: `${name} has been updated successfully.`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to update trip. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Create new trip
        const newTripData: Omit<Trip, 'id'> = {
          name,
          origin,
          destination,
          originLocation,
          destinationLocation,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          distance: parseInt(distance, 10),
          cargoDetails,
          notes,
          unitId,
          driverId,
          status: calculatedStatus,
        };

        const newTrip = await createTrip(newTripData);
        
        if (newTrip) {
          // Reload trips to ensure we have the latest data from database
          const updatedTrips = await getTrips();
          setTrips(updatedTrips || []);
          resetForm();
          setOpen(false);
          toast({
            title: "Trip Added",
            description: `${name} has been added successfully.`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create trip. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while saving the trip';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }


  return (
    <div className="flex flex-col gap-6 w-full max-w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Route className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Trips</h1>
          </div>
          <p className="text-sm text-muted-foreground sm:ml-[52px]">
            Manage and track your trucking trips
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setOpen(true);
            }} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Log New Trip
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-2xl">{editingTrip ? 'Edit Trip' : 'Log a New Trip'}</DialogTitle>
              <CardDescription className="text-base mt-2">
                Fill in the details below to log a new trip. Distance will be auto-calculated when you select origin and destination cities.
              </CardDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
              {/* Left Column - Trip Details */}
              <div className="space-y-6">
                {/* Trip Name Section */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-2">
                    <Route className="h-4 w-4 text-primary" />
                    Trip Name *
                  </Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g., Coast to Coast" 
                    className="h-11"
                    required
                  />
                </div>

                {/* Route Section */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Route Information</Label>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <CityAutocomplete
                        value={origin}
                        onChange={(value, location) => {
                          setOrigin(value);
                          if (location) {
                            setOriginLocation({
                              city: location.name,
                              state: location.state,
                              country: location.country,
                              latitude: location.latitude,
                              longitude: location.longitude,
                            });
                          } else {
                            setOriginLocation(undefined);
                          }
                        }}
                        placeholder="Search origin city..."
                        label="Origin City *"
                      />
                    </div>
                    <div>
                      <CityAutocomplete
                        value={destination}
                        onChange={(value, location) => {
                          setDestination(value);
                          if (location) {
                            setDestinationLocation({
                              city: location.name,
                              state: location.state,
                              country: location.country,
                              latitude: location.latitude,
                              longitude: location.longitude,
                            });
                          } else {
                            setDestinationLocation(undefined);
                          }
                        }}
                        placeholder="Search destination city..."
                        label="Destination City *"
                      />
                    </div>
                  </div>
                </div>

                {/* Distance Section */}
                <div className="space-y-2 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                  <Label htmlFor="distance" className="text-sm font-semibold flex items-center gap-2">
                    <Route className="h-4 w-4 text-primary" />
                    Distance
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input 
                        id="distance" 
                        type="number" 
                        value={distance} 
                        onChange={(e) => setDistance(e.target.value)} 
                        placeholder="Auto-calculated"
                        className={`h-11 ${calculatedDistance ? 'bg-background border-primary/30' : ''}`}
                      />
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[50px]">miles</span>
                    </div>
                    {calculatedDistance && (
                      <div className="flex flex-col gap-2 p-3 bg-background/80 rounded-md border border-primary/20 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Auto-calculated</span>
                          <span className="text-xs text-muted-foreground">Editable</span>
                        </div>
                        <div className="flex items-baseline gap-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-foreground">{calculatedDistance.miles.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                            <span className="text-sm text-muted-foreground">mi</span>
                          </div>
                          <span className="text-muted-foreground">•</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-foreground">{calculatedDistance.kilometers.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                            <span className="text-sm text-muted-foreground">km</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {!calculatedDistance && (!originLocation || !destinationLocation) && (
                      <div className="p-3 bg-muted/50 rounded-md border border-dashed">
                        <p className="text-xs text-muted-foreground">
                          {!originLocation && !destinationLocation 
                            ? 'Select both origin and destination cities to auto-calculate distance'
                            : !originLocation 
                            ? 'Select origin city to calculate distance'
                            : 'Select destination city to calculate distance'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Section */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Schedule</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-xs">Start Date *</Label>
                      <DatePicker
                        id="startDate"
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Select start date"
                        required
                        minDate={new Date()} // Prevent past dates
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-xs">End Date *</Label>
                      <DatePicker
                        id="endDate"
                        value={endDate}
                        onChange={setEndDate}
                        placeholder="Select end date"
                        required
                        minDate={(() => {
                          // End date must be >= start date, or today if no start date
                          if (startDate) {
                            try {
                              // Parse yyyy-MM-dd format
                              if (startDate.includes('-') && !startDate.includes('T')) {
                                const parts = startDate.split('-');
                                if (parts.length === 3) {
                                  const year = parseInt(parts[0], 10);
                                  const month = parseInt(parts[1], 10) - 1;
                                  const day = parseInt(parts[2], 10);
                                  const start = new Date(year, month, day);
                                  if (!isNaN(start.getTime())) {
                                    return start;
                                  }
                                }
                              }
                              const start = new Date(startDate);
                              if (!isNaN(start.getTime())) {
                                return start;
                              }
                            } catch {
                              // Invalid start date, use today
                            }
                          }
                          return new Date();
                        })()}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Assignment & Details */}
              <div className="space-y-6">
                {/* Assignment Section */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Assignments</Label>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit" className="text-xs flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5" />
                        Assign Unit
                      </Label>
                      <Select value={unitId || ""} onValueChange={setUnitId}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={isLoading ? "Loading units..." : units.length === 0 ? "No units available" : "Select a unit"} />
                        </SelectTrigger>
                        <SelectContent>
                          {units.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No units available. Add units first.</div>
                          ) : (
                            units.map(unit => (
                              <SelectItem key={unit.id} value={unit.id}>{unit.name} ({unit.licensePlate})</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driver" className="text-xs flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        Assign Driver <span className="text-red-500">*</span>
                      </Label>
                      <Select value={driverId || ""} onValueChange={setDriverId} required>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={isLoading ? "Loading drivers..." : drivers.filter(d => d.isActive).length === 0 ? "No active drivers" : "Select a driver (required)"} />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.filter(d => d.isActive).length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No active drivers available. Add drivers first.</div>
                          ) : (
                            drivers.filter(d => d.isActive).map(driver => (
                              <SelectItem key={driver.id} value={driver.id}>{driver.name} ({driver.email})</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        The assigned driver will be able to view this trip and add expenses to it.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cargo Details */}
                <div className="space-y-2">
                  <Label htmlFor="cargoDetails" className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Cargo Details
                  </Label>
                  <Textarea 
                    id="cargoDetails" 
                    value={cargoDetails} 
                    onChange={(e) => setCargoDetails(e.target.value)} 
                    placeholder="e.g., 20 pallets of electronics, weight, dimensions..."
                    className="min-h-[100px] resize-none"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Additional Notes
                  </Label>
                  <Textarea 
                    id="notes" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="e.g., Special instructions, contact info, delivery requirements..."
                    className="min-h-[120px] resize-none"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-3">
              <DialogClose asChild>
                <Button variant="outline" className="h-11 px-6">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveTrip} className="h-11 px-6">
                <PlusCircle className="mr-2 h-4 w-4" />
                {editingTrip ? 'Save Changes' : 'Add Trip'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trips List Card */}
      <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg lg:text-xl">Your Trips</CardTitle>
                    <CardDescription className="mt-1 text-xs sm:text-sm">
                      A list of all your logged trips. {trips.length > 0 && `(${filteredAndSortedTrips.length} of ${trips.length} shown)`}
                    </CardDescription>
                  </div>
                </div>
                
                {/* Filter and Sort Controls */}
                <div className="pt-3 sm:pt-4 border-t">
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
                      <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'status' | 'distance') => setSortBy(value)}>
                        <SelectTrigger id="sortBy" className="h-10 sm:h-11 text-sm w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="distance">Distance</SelectItem>
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 sm:p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedTrips.length > 0 ? (
            <React.Fragment>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4 sm:p-6">
                {filteredAndSortedTrips.map((trip) => {
                  try {
                    if (!trip || !trip.id) return null;
                    const totals = getTripTotalExpenses(trip.id);
                    const primaryCurrency = getPrimaryCurrency();
                    const cadToUsdRate = getCADToUSDRate();
                    const usdToCadRate = getUSDToCADRate();
                    
                    // Calculate grand total by converting to primary currency
                    const cadInPrimary = convertCurrency(totals.cad, 'CAD', primaryCurrency, cadToUsdRate, usdToCadRate);
                    const usdInPrimary = convertCurrency(totals.usd, 'USD', primaryCurrency, cadToUsdRate, usdToCadRate);
                    const grandTotal = cadInPrimary + usdInPrimary;
                    const tripExpenses = (Array.isArray(transactions) ? transactions : []).filter((t: any) => 
                      t && typeof t === 'object' && t.tripId === trip.id && t.type === 'expense'
                    );
                    const isExpanded = expandedTripId === trip.id;
                    
                    return (
                      <Card key={trip.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div 
                            className="cursor-pointer space-y-3"
                            onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <h3 className="font-semibold text-lg truncate">{trip.name || 'Unnamed Trip'}</h3>
                                </div>
                                <div className="flex items-center gap-2 ml-6 mb-2 flex-shrink-0">
                                  {getStatus(trip)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTrip(trip);
                                  }}
                                  className="flex-shrink-0 hover:bg-primary/10"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTrip(trip);
                                  }}
                                  className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-2 ml-6 text-sm">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{trip.origin || 'Origin TBD'}</p>
                                  <p className="text-muted-foreground truncate">→ {trip.destination || 'Destination TBD'}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">
                                  {trip.startDate && trip.endDate ? (
                                    <>
                                      {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                                    </>
                                  ) : (
                                    'Date TBD'
                                  )}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <Route className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <DistanceDisplay 
                                    distance={trip.distance || 0} 
                                    variant="inline"
                                    showLabel={false}
                                    className="text-muted-foreground"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground truncate">
                                    {getDriverName(trip.driverId)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground truncate">
                                    {getUnitName(trip.unitId)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="pt-2 border-t">
                                <GrandTotalDisplay
                                  cadAmount={totals.cad}
                                  usdAmount={totals.usd}
                                  primaryCurrency={primaryCurrency}
                                  cadToUsdRate={cadToUsdRate}
                                  usdToCadRate={usdToCadRate}
                                  variant="compact"
                                />
                                {tripExpenses.length > 0 && (
                                  <div className="pt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {tripExpenses.length} expense{tripExpenses.length !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t space-y-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold">Trip Expenses</h4>
                                <Badge variant="outline">
                                  {tripExpenses.length} expense{tripExpenses.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              {tripExpenses.length > 0 ? (
                                <div className="space-y-3">
                                  {['CAD', 'USD'].map((currency) => {
                                    const currencyExpenses = tripExpenses.filter((e: any) => 
                                      e && e.originalCurrency === currency && typeof e.amount === 'number'
                                    );
                                    if (currencyExpenses.length === 0) return null;
                                    
                                    const currencyTotal = currencyExpenses.reduce((sum: number, e: any) => {
                                      const amount = typeof e?.amount === 'number' ? e.amount : 0;
                                      return sum + (isNaN(amount) ? 0 : amount);
                                    }, 0);
                                    
                                    return (
                                      <div key={currency} className="border rounded-lg p-3 bg-muted/30">
                                        <div className="flex items-center justify-between mb-3">
                                          <span className={`font-medium ${currency === 'CAD' ? 'text-blue-700' : 'text-green-700'}`}>
                                            {currency} Expenses
                                          </span>
                                          <Badge variant="outline" className={currency === 'CAD' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-green-100 text-green-700 border-green-300'}>
                                            {currencyTotal.toFixed(2)} {currency}
                                          </Badge>
                                        </div>
                                        <div className="space-y-2">
                                          {currencyExpenses
                                            .filter((e: any) => e && e.id && e.date)
                                            .sort((a: any, b: any) => {
                                              try {
                                                const dateA = a.date ? new Date(a.date).getTime() : 0;
                                                const dateB = b.date ? new Date(b.date).getTime() : 0;
                                                return isNaN(dateB) || isNaN(dateA) ? 0 : dateB - dateA;
                                              } catch {
                                                return 0;
                                              }
                                            })
                                            .map((expense: any) => {
                                              if (!expense || !expense.id) return null;
                                              try {
                                                const amount = typeof expense.amount === 'number' ? expense.amount : 0;
                                                return (
                                                  <div key={expense.id} className="p-2 bg-background rounded border text-sm">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                      <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{expense.description || '-'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                          {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : '-'}
                                                        </p>
                                                      </div>
                                                      <div className="text-right flex-shrink-0">
                                                        <p className="font-semibold text-red-600">{formatCurrency(amount, currency)}</p>
                                                        {expense.category && (
                                                          <Badge variant="destructive" className="text-xs mt-1">{expense.category}</Badge>
                                                        )}
                                                      </div>
                                                    </div>
                                                    {(expense.vendorName || expense.notes) && (
                                                      <div className="mt-1 pt-1 border-t text-xs text-muted-foreground">
                                                        {expense.vendorName && <p>Vendor: {expense.vendorName}</p>}
                                                        {expense.notes && <p className="truncate">{expense.notes}</p>}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              } catch (error) {
                                                console.error('Error rendering expense:', error, expense);
                                                return null;
                                              }
                                            })
                                            .filter(Boolean)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-muted-foreground text-sm">
                                  <p>No expenses recorded for this trip yet.</p>
                                  <p className="text-xs mt-1">Drivers can add expenses from their dashboard.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  } catch (error) {
                    console.error('Error rendering trip:', error, trip);
                    return null;
                  }
                }).filter(Boolean)}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block border-t">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 border-b">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider py-3 px-4">Trip Name</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider py-3 px-4">Unit</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider py-3 px-4">Driver</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider py-3 px-4">Route</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider py-3 px-4">Dates</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider py-3 px-4">Status</TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wider py-3 px-4">Distance</TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wider py-3 px-4">Total Expenses</TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wider py-3 px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                {filteredAndSortedTrips.map((trip) => {
                  try {
                    if (!trip || !trip.id) return null;
                    const totals = getTripTotalExpenses(trip.id);
                    const primaryCurrency = getPrimaryCurrency();
                    const cadToUsdRate = getCADToUSDRate();
                    const usdToCadRate = getUSDToCADRate();
                    
                    // Calculate grand total by converting to primary currency
                    const cadInPrimary = convertCurrency(totals.cad, 'CAD', primaryCurrency, cadToUsdRate, usdToCadRate);
                    const usdInPrimary = convertCurrency(totals.usd, 'USD', primaryCurrency, cadToUsdRate, usdToCadRate);
                    const grandTotal = cadInPrimary + usdInPrimary;
                    
                    const tripExpenses = (Array.isArray(transactions) ? transactions : []).filter((t: any) => 
                      t && 
                      typeof t === 'object' &&
                      t.tripId === trip.id && 
                      t.type === 'expense'
                    );
                    const isExpanded = expandedTripId === trip.id;
                    
                    return (
                      <React.Fragment key={trip.id}>
                      <TableRow 
                        className={`cursor-pointer hover:bg-muted/50 ${expandedTripId === trip.id ? 'bg-muted/30' : ''}`}
                        onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                      >
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2 min-w-[150px]">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm">{trip.name || 'Unnamed Trip'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">{getUnitName(trip.unitId)}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">{getDriverName(trip.driverId)}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 min-w-[200px]">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium leading-tight">{trip.origin || 'Origin TBD'}</span>
                            <span className="text-xs text-muted-foreground leading-tight flex items-center gap-1">
                              <span className="text-primary">→</span>
                              <span>{trip.destination || 'Destination TBD'}</span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 min-w-[140px]">
                          <div className="flex flex-col gap-1">
                            {trip.startDate && trip.endDate ? (
                              <>
                                <span className="text-sm leading-tight">{format(new Date(trip.startDate), 'MMM d, yyyy')}</span>
                                <span className="text-xs text-muted-foreground leading-tight">to {format(new Date(trip.endDate), 'MMM d, yyyy')}</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">Date TBD</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {getStatus(trip)}
                        </TableCell>
                        <TableCell className="text-right py-3 px-4">
                          <DistanceDisplay 
                            distance={trip.distance || 0} 
                            variant="compact"
                            showLabel={false}
                            className="items-end"
                          />
                        </TableCell>
                        <TableCell className="text-right py-3 px-4">
                          <GrandTotalDisplay
                            cadAmount={totals.cad}
                            usdAmount={totals.usd}
                            primaryCurrency={getPrimaryCurrency()}
                            cadToUsdRate={getCADToUSDRate()}
                            usdToCadRate={getUSDToCADRate()}
                            variant="compact"
                            className="items-end"
                          />
                        </TableCell>
                        <TableCell className="text-right py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTrip(trip)}
                              className="hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTrip(trip)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30 p-0 border-t">
                            <div className="p-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                                <h4 className="font-semibold text-lg">Trip Expenses</h4>
                                <Badge variant="outline">
                                  {tripExpenses.length} expense{tripExpenses.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              {tripExpenses.length > 0 ? (
                                <div className="space-y-4">
                                  {/* Group expenses by currency */}
                                  {['CAD', 'USD'].map((currency) => {
                                    const currencyExpenses = tripExpenses.filter((e: any) => 
                                      e && e.originalCurrency === currency && typeof e.amount === 'number'
                                    );
                                    if (currencyExpenses.length === 0) return null;
                                    
                                    const currencyTotal = currencyExpenses.reduce((sum: number, e: any) => {
                                      const amount = typeof e?.amount === 'number' ? e.amount : 0;
                                      return sum + (isNaN(amount) ? 0 : amount);
                                    }, 0);
                                    
                                    return (
                                      <div key={currency} className="border rounded-lg p-3 sm:p-4 bg-background">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                                          <h5 className="font-medium flex items-center gap-2">
                                            <span className={currency === 'CAD' ? 'text-blue-700' : 'text-green-700'}>
                                              {currency} Expenses
                                            </span>
                                            <Badge variant="outline" className={currency === 'CAD' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-green-100 text-green-700 border-green-300'}>
                                              {currencyTotal.toFixed(2)} {currency}
                                            </Badge>
                                          </h5>
                                        </div>
                                        <div className="overflow-x-auto -mx-3 sm:mx-0">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="text-xs sm:text-sm">Date</TableHead>
                                                <TableHead className="text-xs sm:text-sm">Description</TableHead>
                                                <TableHead className="text-xs sm:text-sm">Category</TableHead>
                                                <TableHead className="text-xs sm:text-sm">Vendor</TableHead>
                                                <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                                                <TableHead className="text-xs sm:text-sm">Notes</TableHead>
                                                <TableHead className="text-xs sm:text-sm">Receipt</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                          <TableBody>
                                            {currencyExpenses
                                              .filter((e: any) => e && e.id && e.date)
                                              .sort((a: any, b: any) => {
                                                try {
                                                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                                                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                                                  return isNaN(dateB) || isNaN(dateA) ? 0 : dateB - dateA;
                                                } catch {
                                                  return 0;
                                                }
                                              })
                                              .map((expense: any) => {
                                                if (!expense || !expense.id) return null;
                                                
                                                try {
                                                  const primaryCurrency = getPrimaryCurrency();
                                                  const cadToUsdRate = getCADToUSDRate();
                                                  const usdToCadRate = getUSDToCADRate();
                                                  const amount = typeof expense.amount === 'number' ? expense.amount : 0;
                                                  const currency = expense.originalCurrency || primaryCurrency;
                                                  const convertedAmount = convertCurrency(
                                                    amount,
                                                    currency,
                                                    primaryCurrency,
                                                    cadToUsdRate,
                                                    usdToCadRate
                                                  );
                                                  
                                                  return (
                                                    <TableRow key={expense.id}>
                                                      <TableCell>
                                                        {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : '-'}
                                                      </TableCell>
                                                      <TableCell className="font-medium">
                                                        {expense.description || '-'}
                                                      </TableCell>
                                                      <TableCell>
                                                        <Badge variant="destructive">{expense.category || 'N/A'}</Badge>
                                                      </TableCell>
                                                      <TableCell>
                                                        {expense.vendorName || (
                                                          <span className="text-muted-foreground">N/A</span>
                                                        )}
                                                      </TableCell>
                                                      <TableCell>
                                                        <div className="flex flex-col">
                                                          <span className="font-semibold text-red-600">
                                                            {formatCurrency(amount, currency)}
                                                          </span>
                                                          {currency !== primaryCurrency && !isNaN(convertedAmount) && (
                                                            <span className="text-xs text-muted-foreground">
                                                              ≈ {formatCurrency(convertedAmount, primaryCurrency)}
                                                            </span>
                                                          )}
                                                        </div>
                                                      </TableCell>
                                                      <TableCell>
                                                        {expense.notes ? (
                                                          <span className="text-sm">{expense.notes}</span>
                                                        ) : (
                                                          <span className="text-muted-foreground text-sm">-</span>
                                                        )}
                                                      </TableCell>
                                                      <TableCell>
                                                        {expense.receiptUrl ? (
                                                          <a
                                                            href={expense.receiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline flex items-center gap-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                          >
                                                            <Receipt className="h-4 w-4" />
                                                            <span className="text-sm">View</span>
                                                            <ExternalLink className="h-3 w-3" />
                                                          </a>
                                                        ) : (
                                                          <span className="text-muted-foreground text-sm">-</span>
                                                        )}
                                                      </TableCell>
                                                    </TableRow>
                                                  );
                                                } catch (error) {
                                                  console.error('Error rendering expense:', error, expense);
                                                  return null;
                                                }
                                              })
                                              .filter(Boolean)}
                                          </TableBody>
                                        </Table>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p>No expenses recorded for this trip yet.</p>
                                  <p className="text-sm mt-2">Drivers can add expenses to this trip from their dashboard.</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                  } catch (error) {
                    console.error('Error rendering trip:', error, trip);
                    return null;
                  }
                }).filter(Boolean)}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </React.Fragment>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Route className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No trips found</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Get started by logging your first trip. Track routes, assign drivers and units, and monitor expenses.
              </p>
              <Button onClick={() => {
                resetForm();
                setOpen(true);
              }} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Log Your First Trip
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{tripToDelete?.name || 'this trip'}</strong>? 
              This action cannot be undone. All expenses associated with this trip will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTripToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTrip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TripsPage() {
  return (
    <ErrorBoundary>
      <TripsPageContent />
    </ErrorBoundary>
  );
}
