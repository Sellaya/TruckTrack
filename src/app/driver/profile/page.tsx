'use client';

import { useState, useEffect } from 'react';
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
import { getTripsByDriver, getTransactionsByDriver, getUnits } from '@/lib/data';
import type { Driver, Trip, Transaction, Unit } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowLeft, User, Mail, Phone, CreditCard, Calendar, MapPin, Package, FileText, TrendingDown, BarChart3, Lock } from 'lucide-react';
import { formatBothCurrencies } from '@/lib/currency';
import { DistanceDisplay } from '@/components/ui/distance-display';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDriver, getDriverSession } from '@/lib/driver-auth';
import { DriverRouteGuard } from '@/components/driver-route-guard';

function DriverProfileContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const session = getDriverSession();
        if (!session) {
          router.push('/driver/login');
          return;
        }

        // Load current driver
        const currentDriver = await getCurrentDriver();
        if (!currentDriver) {
          router.push('/driver/login');
          return;
        }
        setDriver(currentDriver);

        // Load trips for this driver
        const driverTrips = await getTripsByDriver(currentDriver.id);
        setTrips(driverTrips);

        // Load transactions for this driver
        const driverTransactions = await getTransactionsByDriver(currentDriver.id);
        setTransactions(driverTransactions);

        // Load units for display
        const unitsData = await getUnits();
        setUnits(unitsData);
      } catch (error) {
        console.error('Error loading driver profile:', error);
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router, toast]);

  const getUnitName = (unitId?: string) => {
    if (!unitId) return 'N/A';
    return units.find(u => u.id === unitId)?.name || 'Unknown';
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

  // Calculate statistics
  const totalTrips = trips.length;
  const completedTrips = trips.filter(t => getTripStatus(t) === 'completed').length;
  const ongoingTrips = trips.filter(t => getTripStatus(t) === 'ongoing').length;
  const upcomingTrips = trips.filter(t => getTripStatus(t) === 'upcoming').length;
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/driver/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View your account information and statistics
            </p>
          </div>
        </div>

        {/* Driver Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{driver.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email Address</p>
                    <p className="font-medium">{driver.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{driver.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">License Number</p>
                    <p className="font-medium font-mono">{driver.licenseNumber || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Account Created</p>
                    <p className="font-medium">{format(new Date(driver.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={driver.isActive ? "default" : "secondary"}>
                    {driver.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalTrips}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedTrips} completed, {ongoingTrips} ongoing, {upcomingTrips} upcoming
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {formatBothCurrencies(totalExpenses, 'CAD').cad}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatBothCurrencies(totalExpenses, 'CAD').usd}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completedTrips}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{ongoingTrips + upcomingTrips}</div>
            </CardContent>
          </Card>
        </div>

        {/* Trips Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              My Trips ({trips.length})
            </CardTitle>
            <CardDescription>All trips assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {trips.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No trips assigned yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trip Name</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips.map((trip) => (
                        <TableRow key={trip.id}>
                          <TableCell className="font-medium">{trip.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {trip.origin} → {trip.destination}
                            </div>
                          </TableCell>
                          <TableCell>{getUnitName(trip.unitId)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DistanceDisplay 
                              distance={trip.distance || 0}
                              variant="inline"
                              showLabel={false}
                            />
                          </TableCell>
                          <TableCell>{getStatusBadge(getTripStatus(trip), trip)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        {Object.keys(expensesByCategory).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Expenses by Category
              </CardTitle>
              <CardDescription>Breakdown of your expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(expensesByCategory)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, amount]) => (
                          <TableRow key={category}>
                            <TableCell className="font-medium">{category}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-red-600">
                                  {formatBothCurrencies(amount, 'CAD').cad}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatBothCurrencies(amount, 'CAD').usd}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Expenses */}
        {transactions.filter(t => t.type === 'expense').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Expenses ({transactions.filter(t => t.type === 'expense').length})
              </CardTitle>
              <CardDescription>Complete list of all your expense transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Trip</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.type === 'expense')
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((transaction) => {
                        const trip = trips.find(t => t.id === transaction.tripId);
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="font-medium">{transaction.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{transaction.category}</Badge>
                            </TableCell>
                            <TableCell>
                              {trip ? (
                                <div className="text-sm">
                                  <div className="font-medium">{trip.name}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {trip.origin} → {trip.destination}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-red-600">
                                  {formatBothCurrencies(transaction.amount, transaction.originalCurrency).cad}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatBothCurrencies(transaction.amount, transaction.originalCurrency).usd}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {transaction.receiptUrl ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(transaction.receiptUrl, '_blank')}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">No receipt</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={() => router.push('/driver/dashboard')}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DriverProfilePage() {
  return (
    <DriverRouteGuard>
      <DriverProfileContent />
    </DriverRouteGuard>
  );
}

