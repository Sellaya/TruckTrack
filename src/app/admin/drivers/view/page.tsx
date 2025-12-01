'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDrivers } from '@/lib/data';
import type { Driver } from '@/lib/types';
import { format } from 'date-fns';
import { Eye, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ViewDriversPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDrivers = async () => {
      setIsLoading(true);
      try {
        const data = await getDrivers();
        setDrivers(data || []);
      } catch (error) {
        console.error('Error loading drivers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDrivers();
  }, []);

  const handleViewDashboard = (driverId: string) => {
    if (!driverId) {
      toast({
        title: "Error",
        description: "Driver ID is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }
    const path = `/admin/drivers/${driverId}/dashboard`;
    router.push(path);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="h-6 w-6" />
          View Driver Dashboards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View individual driver dashboards and their trip details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Drivers</CardTitle>
          <CardDescription>Click on a driver to view their dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading drivers...</p>
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">No drivers found.</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card layout */}
              <div className="grid gap-3 sm:gap-4 md:hidden">
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => handleViewDashboard(driver.id)}
                    className="text-left bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {driver.name}
                          </p>
                          <Badge variant={driver.isActive ? "default" : "secondary"}>
                            {driver.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {driver.email}
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>Phone: <span className="text-foreground">{driver.phone || '-'}</span></p>
                          <p>License: <span className="text-foreground">{driver.licenseNumber || '-'}</span></p>
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Joined {format(new Date(driver.createdAt), 'MMM d, yyyy')}
                    </p>
                  </button>
                ))}
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>License Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>{driver.email}</TableCell>
                        <TableCell>{driver.phone || '-'}</TableCell>
                        <TableCell>{driver.licenseNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={driver.isActive ? "default" : "secondary"}>
                            {driver.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(driver.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleViewDashboard(driver.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Dashboard
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

