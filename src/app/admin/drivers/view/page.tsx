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
    console.log('Navigating to driver dashboard:', driverId);
    if (!driverId) {
      console.error('Driver ID is missing');
      toast({
        title: "Error",
        description: "Driver ID is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }
    const path = `/admin/drivers/${driverId}/dashboard`;
    console.log('Navigation path:', path);
    
    // Use window.location as primary method to avoid Next.js prefetch issues
    // This is more reliable for dynamic routes
    window.location.href = path;
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
                          console.log('Button clicked for driver:', driver.id, driver.name);
                          if (driver.id) {
                            handleViewDashboard(driver.id);
                          } else {
                            console.error('Driver ID is missing:', driver);
                          }
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

