'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Eye, EyeOff, Users, Loader2, User, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDrivers, updateDriver, deleteDriver } from '@/lib/data';
import type { Driver } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { createDriverAction } from './actions';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';

export default function DriversPage() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [open, setOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  // Load drivers from Supabase on mount
  useEffect(() => {
    const loadDrivers = async () => {
      setIsLoading(true);
      try {
        const data = await getDrivers();
        setDrivers(data || []);
      } catch (error) {
        console.error('Error loading drivers:', error);
        toast({
          title: "Error Loading Drivers",
          description: "Failed to load drivers. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setLicenseNumber('');
    setIsActive(true);
    setEditingDriver(null);
    setShowPassword(false);
  };

  const handleOpenDialog = (driver: Driver | null) => {
    if (driver) {
      setEditingDriver(driver);
      setName(driver.name);
      setEmail(driver.email);
      setPassword(''); // Don't show existing password
      setPhone(driver.phone || '');
      setLicenseNumber(driver.licenseNumber || '');
      setIsActive(driver.isActive);
    } else {
      resetForm();
    }
    setOpen(true);
  };

  const handleSaveDriver = async () => {
    // Validation
    if (!name.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Driver name is required.",
        variant: "destructive"
      });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast({ 
        title: "Validation Error", 
        description: "Valid email is required.",
        variant: "destructive"
      });
      return;
    }
    if (!editingDriver && !password.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Password is required for new drivers.",
        variant: "destructive"
      });
      return;
    }
    if (password.trim() && password.length < 6) {
      toast({ 
        title: "Validation Error", 
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate email only in local state (for quick feedback)
    // The server will also check against the database
    if (!editingDriver) {
      const emailExists = drivers.some(
        d => d.email.toLowerCase() === email.toLowerCase()
      );
      if (emailExists) {
        toast({ 
          title: "Validation Error", 
          description: "A driver with this email already exists.",
          variant: "destructive"
        });
        return;
      }
    } else {
      // When editing, check if email conflicts with another driver
      const emailExists = drivers.some(
        d => d.email.toLowerCase() === email.toLowerCase() && d.id !== editingDriver.id
      );
      if (emailExists) {
        toast({ 
          title: "Validation Error", 
          description: "A driver with this email already exists.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      if (editingDriver) {
        // Update driver in Supabase
        const updateData: Partial<Omit<Driver, 'id' | 'createdAt'>> = {
          name,
          email,
          phone: phone.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          isActive,
        };
        
        // Only update password if a new one is provided
        if (password.trim()) {
          updateData.password = password;
        }
        
        const updatedDriver = await updateDriver(editingDriver.id, updateData);
        
        if (updatedDriver) {
          // Reload drivers to get the updated data from database
          const data = await getDrivers();
          setDrivers(data || []);
          toast({ title: "Driver Updated", description: `${name}'s profile has been updated.` });
        } else {
          toast({
            title: "Error",
            description: "Failed to update driver. Please try again.",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Add new driver - use server action
        const result = await createDriverAction({
          name,
          email,
          password,
          phone: phone.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
        });

        if (result.success && result.driverId) {
          // Reload drivers to get the full driver object from database
          // Add a small delay to ensure database write is complete
          await new Promise(resolve => setTimeout(resolve, 500));
          const data = await getDrivers();
          console.log('Reloaded drivers after creation:', data);
          setDrivers(data || []);
          toast({ title: "Driver Added", description: `${name} has been added as a driver.` });
        } else {
          toast({ 
            title: "Error", 
            description: result.error || "Failed to create driver.",
            variant: "destructive"
          });
          return;
        }
      }
      setOpen(false);
      resetForm();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDriver = async (driver: Driver) => {
    setDriverToDelete(driver);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDriver = async () => {
    if (!driverToDelete) return;

    try {
      const success = await deleteDriver(driverToDelete.id);
      
      if (success) {
        // Reload drivers after deletion
        const data = await getDrivers();
        setDrivers(data || []);
        toast({ 
          title: "Driver Deleted", 
          description: `${driverToDelete.name}'s profile has been permanently deleted.` 
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete driver. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the driver.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDriverToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Manage driver profiles and credentials
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingDriver ? 'Edit Driver Profile' : 'Add a New Driver'}
              </DialogTitle>
              <CardDescription className="mt-1">
                {editingDriver 
                  ? 'Update driver information and credentials' 
                  : 'Create a new driver profile with login credentials'}
              </CardDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g., John Smith" 
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="e.g., john.smith@truckops.com" 
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {editingDriver ? 'New Password (leave blank to keep current)' : 'Password *'}
                    {!editingDriver && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder={editingDriver ? "Leave blank to keep current password" : "Minimum 6 characters"} 
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="e.g., +1-555-0101" 
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber" className="text-sm font-medium">License Number</Label>
                    <Input 
                      id="licenseNumber" 
                      value={licenseNumber} 
                      onChange={(e) => setLicenseNumber(e.target.value)} 
                      placeholder="e.g., DL-123456" 
                      className="h-11"
                    />
                  </div>
                </div>
                
                {editingDriver && (
                  <div className="space-y-2">
                    <Label htmlFor="isActive" className="text-sm font-medium">Account Status</Label>
                    <div className="flex items-center gap-3 p-3 border rounded-md">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="isActive" className="cursor-pointer text-sm">
                        Active driver account
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveDriver}>
                {editingDriver ? 'Save Changes' : 'Create Driver'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* Driver Profiles Card */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Driver Profiles</CardTitle>
              <CardDescription className="mt-1">
                A list of all drivers in your system. {drivers.length > 0 && `(${drivers.length} total)`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Loading drivers...</p>
            </div>
          ) : drivers.length > 0 ? (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">License Number</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver, index) => (
                      <TableRow 
                        key={driver.id} 
                        className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>
                          <a 
                            href={`mailto:${driver.email}`}
                            className="text-primary hover:underline"
                          >
                            {driver.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          {driver.phone ? (
                            <a 
                              href={`tel:${driver.phone}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {driver.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {driver.licenseNumber || <span className="text-muted-foreground">-</span>}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={driver.isActive ? "default" : "secondary"}
                            className={driver.isActive ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            {driver.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(driver.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.location.href = `/admin/drivers/${driver.id}/profile`}
                              className="hover:bg-primary/10"
                            >
                              <User className="h-4 w-4 mr-2" />
                              Profile
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleOpenDialog(driver)}
                              className="hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteDriver(driver)}
                              className="hover:bg-destructive/10 hover:text-destructive"
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
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No drivers found</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Get started by adding your first driver profile. Drivers can log in to view their assigned trips and add expenses.
              </p>
              <Button onClick={() => handleOpenDialog(null)} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Your First Driver
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Driver Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{driverToDelete?.name}</strong>'s profile? 
              This action cannot be undone. The driver will no longer be able to log in, and all associated data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDriverToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDriver}
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

