'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MapPin, Calendar, Route, Package, FileText, Truck, User, Edit, ChevronDown, ChevronRight, Receipt, ExternalLink, Filter, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getTrips, getUnits, getDrivers, createTrip, updateTrip, deleteTrip, getTransactions } from '@/lib/data';
import type { Trip, Unit, Location, Driver, Currency, RouteStop } from '@/lib/types';
import { CityAutocomplete } from '@/components/ui/city-autocomplete';
import { calculateDistanceMiles, calculateMultiStopDistance } from '@/lib/distance-calculator';
import { MultiStopRouteInput } from '@/components/ui/multi-stop-route-input';
import { RouteDisplay } from '@/components/ui/route-display';
import { DistanceDisplay } from '@/components/ui/distance-display';
import { GrandTotalDisplay } from '@/components/ui/currency-display';
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

function TripsPageContent(): React.JSX.Element {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originLocation, setOriginLocation] = useState<Location | undefined>(undefined);
  const [destinationLocation, setDestinationLocation] = useState<Location | undefined>(undefined);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
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
  const [tripNumberSearch, setTripNumberSearch] = useState('');
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

  // Auto-calculate distance when route stops are selected
  useEffect(() => {
    // Use route stops if available, otherwise fall back to origin/destination
    if (routeStops.length >= 2 && routeStops.every(s => s.location.latitude && s.location.longitude)) {
      const miles = calculateMultiStopDistance(routeStops);
      const kilometers = miles * 1.60934;
      setCalculatedDistance({ miles, kilometers });
      setDistance(miles.toString());
    } else if (originLocation?.latitude && originLocation?.longitude && 
        destinationLocation?.latitude && destinationLocation?.longitude) {
      // Fallback to origin/destination for backward compatibility
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
  }, [routeStops, originLocation, destinationLocation]);

  const resetForm = () => {
    setName('');
    setOrigin('');
    setDestination('');
    setOriginLocation(undefined);
    setDestinationLocation(undefined);
    setRouteStops([]);
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
          <span 
            className="inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-medium text-gray-700 bg-gray-100"
          >
            Unknown
          </span>
        );
      }
      const now = new Date();
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return (
          <span 
            className="inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-medium text-gray-700 bg-gray-100"
          >
            Invalid Date
          </span>
        );
      }
      
      if (now < start) {
        return (
          <span 
            className="inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-medium text-white bg-[#0073ea] shadow-sm"
          >
            Upcoming
          </span>
        );
      }
      
      if (now > end) {
        return (
          <span 
            className="inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-medium text-white bg-[#00c875] shadow-sm"
          >
            Completed
          </span>
        );
      }
      
      return (
        <span 
          className="inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-medium text-white bg-[#ff642e] shadow-sm whitespace-nowrap"
        >
          In Progress
        </span>
      );
    } catch (error) {
      console.error('Error getting trip status:', error);
      return (
        <span 
          className="inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-medium text-gray-700 bg-gray-100"
        >
          Error
        </span>
      );
    }
  }

  const getUnitName = (unitId?: string) => {
    try {
      if (!unitId || !Array.isArray(units)) return 'N/A';
      const unit = units.find(u => u && u.id === unitId);
      return unit ? `${unit.make} ${unit.year} ${unit.model}` : 'Unknown';
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

    // Apply trip number search filter
    if (tripNumberSearch.trim()) {
      const searchTerm = tripNumberSearch.trim().toLowerCase();
      filtered = filtered.filter(trip => {
        const tripNum = trip.tripNumber || '';
        return tripNum.toLowerCase().includes(searchTerm);
      });
    }

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
  }, [trips, filterStartDate, filterEndDate, statusFilter, tripNumberSearch, sortBy, sortOrder]);

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
      // Load route stops if available, otherwise build from origin/destination
      if (trip.stops && trip.stops.length > 0) {
        setRouteStops(trip.stops);
      } else if (trip.originLocation && trip.destinationLocation) {
        setRouteStops([
          {
            displayName: trip.origin || '',
            location: trip.originLocation,
          },
          {
            displayName: trip.destination || '',
            location: trip.destinationLocation,
          },
        ]);
      } else {
        setRouteStops([]);
      }
      
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
    // Validate route stops
    const validStops = routeStops.filter(s => s.displayName && s.location.city);
    if (validStops.length < 2) {
      toast({
        title: "Validation Error",
        description: "Please add at least 2 route stops (origin and destination).",
        variant: "destructive",
      });
      return;
    }
    
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
        const validStops = routeStops.filter(s => s.displayName && s.location.city);
        const firstStop = validStops[0];
        const lastStop = validStops[validStops.length - 1];
        
        const updatedTrip = await updateTrip(editingTrip.id, {
          name,
          origin: firstStop?.displayName || origin,
          destination: lastStop?.displayName || destination,
          originLocation: firstStop?.location || originLocation,
          destinationLocation: lastStop?.location || destinationLocation,
          stops: validStops.length > 2 ? validStops : undefined,
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
        // Create new trip (tripNumber will be auto-generated)
        const validStops = routeStops.filter(s => s.displayName && s.location.city);
        const firstStop = validStops[0];
        const lastStop = validStops[validStops.length - 1];
        
        const newTripData: Omit<Trip, 'id' | 'tripNumber'> = {
          name,
          origin: firstStop?.displayName || origin,
          destination: lastStop?.displayName || destination,
          originLocation: firstStop?.location || originLocation,
          destinationLocation: lastStop?.location || destinationLocation,
          stops: validStops.length > 2 ? validStops : undefined, // Only include if more than 2 stops
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
    <div className="flex flex-col bg-white min-h-screen w-full overflow-x-hidden">
      {/* Header Section - Monday.com Style */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">Trips</h1>
            {trips.length > 0 && (
              <span className="text-sm text-gray-500">({filteredAndSortedTrips.length} {filteredAndSortedTrips.length === 1 ? 'trip' : 'trips'})</span>
            )}
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  resetForm();
                  setOpen(true);
                }} 
                className="bg-[#0073ea] hover:bg-[#0058c2] text-white h-9 px-4 rounded-md font-medium shadow-sm hover:shadow-md transition-all"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Trip
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingTrip ? 'Edit Trip' : 'Log a New Trip'}</DialogTitle>
              <DialogDescription>
                Fill in the details below to log a new trip. Distance will be auto-calculated when you select origin and destination cities.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                {/* Route Section - Multi-Stop */}
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">Route Stops</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">{routeStops.filter(s => s.displayName).length} stops</span>
                  </div>
                  <MultiStopRouteInput
                    stops={routeStops}
                    onChange={(stops) => {
                      setRouteStops(stops);
                      // Update origin/destination for backward compatibility
                      if (stops.length > 0) {
                        setOrigin(stops[0].displayName);
                        setOriginLocation(stops[0].location);
                      }
                      if (stops.length > 1) {
                        setDestination(stops[stops.length - 1].displayName);
                        setDestinationLocation(stops[stops.length - 1].location);
                      }
                    }}
                    minStops={2}
                    maxStops={20}
                  />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-sm font-medium">Start Date *</Label>
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
                      <Label htmlFor="endDate" className="text-sm font-medium">End Date *</Label>
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
                              <SelectItem key={unit.id} value={unit.id}>{unit.make} {unit.year} {unit.model} ({unit.vin})</SelectItem>
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
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveTrip} className="bg-[#0073ea] hover:bg-[#0058c2]">
                <PlusCircle className="mr-2 h-4 w-4" />
                {editingTrip ? 'Save Changes' : 'Add Trip'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Section - Monday.com Style */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        {/* Mobile: Accordion */}
        <div className="lg:hidden">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="filters" className="border-0 bg-white rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-900">Filters</span>
                  {(filterStartDate || filterEndDate || statusFilter !== 'all' || tripNumberSearch.trim()) && (
                    <span className="ml-2 h-5 px-2 rounded-full bg-[#0073ea] text-white text-xs font-medium flex items-center">
                      Active
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4 pt-2">
                  {/* Trip Number Search */}
                  <div className="space-y-2">
                    <Label htmlFor="tripNumberSearchMobile" className="text-xs font-medium text-gray-700">Search Trip Number</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="tripNumberSearchMobile"
                        type="text"
                        value={tripNumberSearch}
                        onChange={(e) => setTripNumberSearch(e.target.value)}
                        placeholder="e.g., 0001, 0234"
                        className="h-9 pl-10 bg-white border-gray-300 rounded-md focus:ring-2 focus:ring-[#0073ea] focus:border-[#0073ea]"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="filterStartDateMobile" className="text-xs font-medium text-gray-700">Start Date</Label>
                      <DatePicker
                        id="filterStartDateMobile"
                        value={filterStartDate}
                        onChange={setFilterStartDate}
                        placeholder="Start date"
                        minDate={new Date(1900, 0, 1)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filterEndDateMobile" className="text-xs font-medium text-gray-700">End Date</Label>
                      <DatePicker
                        id="filterEndDateMobile"
                        value={filterEndDate}
                        onChange={setFilterEndDate}
                        placeholder="End date"
                        minDate={filterStartDate ? new Date(filterStartDate) : new Date(1900, 0, 1)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Status & Sort */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="statusFilterMobile" className="text-xs font-medium text-gray-700">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="statusFilterMobile" className="h-9 bg-white border-gray-300">
                          <SelectValue placeholder="All" />
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
                      <Label htmlFor="sortByMobile" className="text-xs font-medium text-gray-700">Sort By</Label>
                      <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'status' | 'distance') => setSortBy(value)}>
                        <SelectTrigger id="sortByMobile" className="h-9 bg-white border-gray-300">
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
                  </div>

                  {/* Sort Order */}
                  <div className="space-y-2">
                    <Label htmlFor="sortOrderMobile" className="text-xs font-medium text-gray-700">Order</Label>
                    <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                      <SelectTrigger id="sortOrderMobile" className="h-9 bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  {(filterStartDate || filterEndDate || statusFilter !== 'all' || tripNumberSearch.trim()) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterStartDate('');
                        setFilterEndDate('');
                        setStatusFilter('all');
                        setTripNumberSearch('');
                      }}
                      className="w-full h-9 gap-2 text-sm border-gray-300 hover:bg-gray-50"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Desktop: Inline Filters */}
        <div className="hidden lg:flex lg:items-center lg:gap-3 lg:flex-wrap">
          {/* Trip Number Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="tripNumberSearch"
              type="text"
              value={tripNumberSearch}
              onChange={(e) => setTripNumberSearch(e.target.value)}
              placeholder="Search by trip number..."
              className="h-9 pl-10 bg-white border-gray-300 rounded-md focus:ring-2 focus:ring-[#0073ea] focus:border-[#0073ea]"
              maxLength={4}
            />
          </div>

          {/* Date Range */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <DatePicker
              id="filterStartDate"
              value={filterStartDate}
              onChange={setFilterStartDate}
              placeholder="Start date"
              minDate={new Date(1900, 0, 1)}
              className="w-full sm:w-36 sm:h-9"
            />
            <span className="text-gray-400 flex-shrink-0 hidden sm:inline">-</span>
            <DatePicker
              id="filterEndDate"
              value={filterEndDate}
              onChange={setFilterEndDate}
              placeholder="End date"
              minDate={filterStartDate ? new Date(filterStartDate) : new Date(1900, 0, 1)}
              className="w-full sm:w-36 sm:h-9"
            />
          </div>

          {/* Status Filter */}
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

          {/* Sort By */}
          <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'status' | 'distance') => setSortBy(value)}>
            <SelectTrigger className="h-9 w-32 bg-white border-gray-300 flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
            <SelectTrigger className="h-9 w-28 bg-white border-gray-300 flex-shrink-0">
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

          {/* Clear Filters */}
          {(filterStartDate || filterEndDate || statusFilter !== 'all' || tripNumberSearch.trim()) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStartDate('');
                setFilterEndDate('');
                setStatusFilter('all');
                setTripNumberSearch('');
              }}
              className="h-9 px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Trips Table/Cards Section - Monday.com Style */}
      <div className="flex-1 bg-white w-full overflow-x-hidden">
          {isLoading ? (
            <div className="px-6 py-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredAndSortedTrips.length > 0 ? (
            <React.Fragment>
              {/* Mobile Card View - Monday.com Style */}
              <div className="lg:hidden space-y-2 p-4">
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
                      <div key={trip.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="space-y-3">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-gray-500 font-medium">#{trip.tripNumber || 'N/A'}</span>
                                <h3 className="font-semibold text-base text-gray-900 truncate">{trip.name || 'Unnamed Trip'}</h3>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getStatus(trip)}
                                <span className="text-xs text-gray-500">
                                  {trip.startDate && trip.endDate ? (
                                    format(new Date(trip.startDate), 'MMM d') + ' - ' + format(new Date(trip.endDate), 'MMM d, yyyy')
                                  ) : 'Date TBD'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTrip(trip);
                                }}
                                className="h-8 w-8 hover:bg-gray-100 text-gray-600"
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
                                className="h-8 w-8 hover:bg-red-50 text-gray-600 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                          
                          {/* Details Row */}
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

                          {/* Metrics Row */}
                          <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-1.5">
                              <Route className="h-3.5 w-3.5 text-gray-400" />
                              <DistanceDisplay 
                                distance={trip.distance || 0} 
                                variant="compact"
                                showLabel={false}
                                className="text-xs text-gray-600"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <GrandTotalDisplay
                                cadAmount={totals.cad}
                                usdAmount={totals.usd}
                                primaryCurrency={primaryCurrency}
                                cadToUsdRate={cadToUsdRate}
                                usdToCadRate={usdToCadRate}
                                variant="compact"
                                className="text-xs font-medium text-gray-900"
                              />
                            </div>
                          </div>

                          {/* Expand Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                            className="w-full h-8 text-xs justify-between"
                          >
                            <span>{tripExpenses.length} expense{tripExpenses.length !== 1 ? 's' : ''}</span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>

                          {/* Expanded Expenses */}
                          {isExpanded && (
                              <div className="pt-3 border-t space-y-3">
                                <h4 className="font-semibold text-sm">Trip Expenses</h4>
                                {tripExpenses.length > 0 ? (
                                  <div className="space-y-2">
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
                                          <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-medium ${currency === 'CAD' ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'}`}>
                                              {currency} Expenses
                                            </span>
                                            <Badge variant="outline" className={`text-xs h-5 ${currency === 'CAD' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300' : 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300'}`}>
                                              {currencyTotal.toFixed(2)} {currency}
                                            </Badge>
                                          </div>
                                          <div className="space-y-1.5">
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
                                                    <div key={expense.id} className="p-2 bg-background rounded border text-xs">
                                                      <div className="flex items-start justify-between gap-2 mb-1">
                                                        <div className="flex-1 min-w-0">
                                                          <p className="font-medium truncate">{expense.description || '-'}</p>
                                                          <p className="text-xs text-muted-foreground mt-0.5">
                                                            {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : '-'}
                                                          </p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                          <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(amount, currency as Currency)}</p>
                                                          {expense.category && (
                                                            <Badge variant="destructive" className="text-[10px] mt-1 h-4">{expense.category}</Badge>
                                                          )}
                                                        </div>
                                                      </div>
                                                      {(expense.vendorName || expense.notes) && (
                                                        <div className="mt-1 pt-1 border-t text-[10px] text-muted-foreground">
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
                                  <div className="text-center py-4 text-muted-foreground text-xs">
                                    <p>No expenses recorded for this trip yet.</p>
                                    <p className="text-[10px] mt-1">Drivers can add expenses from their dashboard.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                    );
                  } catch (error) {
                    console.error('Error rendering trip:', error, trip);
                    return null;
                  }
                }).filter(Boolean)}
              </div>
              
              {/* Desktop Table View - Monday.com Style */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table className="min-w-full">
                    <TableHeader className="sticky top-0 z-10 bg-white border-b border-gray-200">
                      <TableRow className="border-b border-gray-200 hover:bg-transparent">
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Trip #</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Trip Name</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Unit</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Driver</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Route</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Dates</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Status</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50 text-right">Distance</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50 text-right whitespace-nowrap">Total Expenses</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50 text-right">Actions</TableHead>
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
                                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${expandedTripId === trip.id ? 'bg-blue-50/50' : 'bg-white'}`}
                                onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                              >
                                <TableCell className="py-3 px-4">
                                  <span className="font-mono text-sm font-medium text-gray-600">
                                    #{trip.tripNumber || 'N/A'}
                                  </span>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  <div className="flex items-center gap-2 min-w-[180px]">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    )}
                                    <span className="font-medium text-sm text-gray-900">{trip.name || 'Unnamed Trip'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  <span className="text-sm text-gray-700">{getUnitName(trip.unitId)}</span>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  <span className="text-sm text-gray-700">{getDriverName(trip.driverId)}</span>
                                </TableCell>
                                <TableCell className="py-3 px-4 min-w-[200px] max-w-[280px]">
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
                                <TableCell className="py-3 px-4 min-w-[140px] whitespace-nowrap">
                                  <div className="flex flex-col gap-0.5">
                                    {trip.startDate && trip.endDate ? (
                                      <>
                                        <span className="text-sm font-medium text-gray-900 leading-tight">{format(new Date(trip.startDate), 'MMM d, yyyy')}</span>
                                        <span className="text-xs text-gray-500 leading-tight">to {format(new Date(trip.endDate), 'MMM d, yyyy')}</span>
                                      </>
                                    ) : (
                                      <span className="text-sm text-gray-500">Date TBD</span>
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
                                    className="items-end justify-end text-gray-700"
                                  />
                                </TableCell>
                                <TableCell className="text-right py-3 px-4 whitespace-nowrap">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <GrandTotalDisplay
                                      cadAmount={totals.cad}
                                      usdAmount={totals.usd}
                                      primaryCurrency={getPrimaryCurrency()}
                                      cadToUsdRate={getCADToUSDRate()}
                                      usdToCadRate={getUSDToCADRate()}
                                      variant="compact"
                                      className="text-gray-900 font-medium text-sm"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditTrip(trip)}
                                      className="h-8 w-8 hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteTrip(trip)}
                                      className="h-8 w-8 hover:bg-red-50 text-gray-600 hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={10} className="bg-muted/20 p-0 border-t">
                                    <div className="p-6">
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                                        <h4 className="font-semibold text-base">Trip Expenses</h4>
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
                                              <div key={currency} className="border rounded-lg p-4 bg-background">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                                                  <h5 className="font-medium flex items-center gap-2">
                                                    <span className={currency === 'CAD' ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'}>
                                                      {currency} Expenses
                                                    </span>
                                                    <Badge variant="outline" className={currency === 'CAD' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300' : 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300'}>
                                                      {currencyTotal.toFixed(2)} {currency}
                                                    </Badge>
                                                  </h5>
                                                </div>
                                                <div className="overflow-x-auto -mx-4 sm:mx-0">
                                                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                                                    <Table className="min-w-full">
                                                      <TableHeader>
                                                        <TableRow>
                                                          <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                                                          <TableHead className="text-xs min-w-[150px]">Description</TableHead>
                                                          <TableHead className="text-xs whitespace-nowrap">Category</TableHead>
                                                          <TableHead className="text-xs whitespace-nowrap min-w-[100px]">Vendor</TableHead>
                                                          <TableHead className="text-xs text-right whitespace-nowrap">Amount</TableHead>
                                                          <TableHead className="text-xs min-w-[120px] max-w-[200px]">Notes</TableHead>
                                                          <TableHead className="text-xs whitespace-nowrap">Receipt</TableHead>
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
                                                                <TableCell className="text-sm">
                                                                  {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : '-'}
                                                                </TableCell>
                                                                <TableCell className="font-medium text-sm">
                                                                  {expense.description || '-'}
                                                                </TableCell>
                                                                <TableCell>
                                                                  <Badge variant="destructive" className="text-xs">{expense.category || 'N/A'}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-sm">
                                                                  {expense.vendorName || (
                                                                    <span className="text-muted-foreground">N/A</span>
                                                                  )}
                                                                </TableCell>
                                                                <TableCell className="text-right whitespace-nowrap">
                                                                  <div className="flex flex-col items-end gap-0.5">
                                                                    <span className="font-semibold text-red-600 dark:text-red-400 text-sm leading-tight">
                                                                      {formatCurrency(amount, currency)}
                                                                    </span>
                                                                    {currency !== primaryCurrency && !isNaN(convertedAmount) && (
                                                                      <span className="text-xs text-muted-foreground leading-tight">
                                                                        ≈ {formatCurrency(convertedAmount, primaryCurrency)}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </TableCell>
                                                                <TableCell className="text-sm max-w-[200px]">
                                                                  {expense.notes ? (
                                                                    <span className="truncate block">{expense.notes}</span>
                                                                  ) : (
                                                                    <span className="text-muted-foreground">-</span>
                                                                  )}
                                                                </TableCell>
                                                                <TableCell>
                                                                  {expense.receiptUrl ? (
                                                                    <a
                                                                      href={expense.receiptUrl}
                                                                      target="_blank"
                                                                      rel="noopener noreferrer"
                                                                      className="text-primary hover:underline flex items-center gap-1 text-sm"
                                                                      onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                      <Receipt className="h-4 w-4" />
                                                                      <span>View</span>
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
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="text-center py-12 text-muted-foreground">
                                          <p className="text-sm">No expenses recorded for this trip yet.</p>
                                          <p className="text-xs mt-2">Drivers can add expenses to this trip from their dashboard.</p>
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
              </div>
            </React.Fragment>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Route className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No trips found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                {trips.length > 0 
                  ? 'No trips match your current filters. Try adjusting your search criteria.'
                  : 'Get started by logging your first trip. Track routes, assign drivers and units, and monitor expenses.'}
              </p>
              {trips.length === 0 && (
                <Button onClick={() => {
                  resetForm();
                  setOpen(true);
                }} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Log Your First Trip
                </Button>
              )}
            </div>
          )}
      </div>

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
