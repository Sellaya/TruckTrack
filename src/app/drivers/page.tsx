'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Eye, EyeOff, Users, Loader2, User, Trash2, Mail, Phone, FileText, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
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

export default function DriversPage() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [open, setOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [isActive, setIsActive] = useState(true);

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
      setPassword('');
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

    // Check for duplicate email
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
        // Update driver
        const updateData: Partial<Omit<Driver, 'id' | 'createdAt'>> = {
          name,
          email,
          phone: phone.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          isActive,
        };
        
        if (password.trim()) {
          updateData.password = password;
        }
        
        const updatedDriver = await updateDriver(editingDriver.id, updateData);
        
        if (updatedDriver) {
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
        // Add new driver
        const result = await createDriverAction({
          name,
          email,
          password,
          phone: phone.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
        });

        if (result.success && result.driverId) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const data = await getDrivers();
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
    <div className="flex flex-col bg-white min-h-screen w-full overflow-x-hidden">
      {/* Header Section - Monday.com Style */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">Drivers</h1>
            {drivers.length > 0 && (
              <span className="text-sm text-gray-500">({drivers.length} {drivers.length === 1 ? 'driver' : 'drivers'})</span>
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
                onClick={() => handleOpenDialog(null)} 
                className="bg-[#0073ea] hover:bg-[#0058c2] text-white h-9 px-4 rounded-md font-medium shadow-sm hover:shadow-md transition-all"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingDriver ? 'Edit Driver Profile' : 'Add a New Driver'}</DialogTitle>
                <DialogDescription>
                  {editingDriver 
                    ? 'Update driver information and credentials' 
                    : 'Create a new driver profile with login credentials'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="grid gap-6">
                  <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">
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
                    <Label htmlFor="email" className="text-sm font-semibold">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="e.g., john.smith@trucktrack.com" 
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold">
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
                      <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
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
                      <Label htmlFor="licenseNumber" className="text-sm font-semibold">License Number</Label>
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
                      <Label htmlFor="isActive" className="text-sm font-semibold">Account Status</Label>
                      <div className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
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
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveDriver} className="bg-[#0073ea] hover:bg-[#0058c2]">
                  {editingDriver ? 'Save Changes' : 'Create Driver'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content - Monday.com Style */}
      <div className="flex-1 bg-white w-full overflow-x-hidden">
        {isLoading ? (
          <div className="px-6 py-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : drivers.length > 0 ? (
          <div className="px-4 sm:px-6 py-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <Table className="min-w-full">
                    <TableHeader className="sticky top-0 z-10 bg-white border-b border-gray-200">
                      <TableRow className="border-b border-gray-200 hover:bg-transparent">
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Name</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Email</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Phone</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">License Number</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Status</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50">Created</TableHead>
                        <TableHead className="font-medium text-xs text-gray-600 py-3 px-4 h-11 bg-gray-50 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drivers.map((driver) => (
                        <TableRow 
                          key={driver.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="py-3 px-4">
                            <span className="font-medium text-sm text-gray-900">{driver.name}</span>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <a 
                              href={`mailto:${driver.email}`}
                              className="text-sm text-[#0073ea] hover:underline flex items-center gap-1"
                            >
                              <Mail className="h-3 w-3" />
                              {driver.email}
                            </a>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            {driver.phone ? (
                              <a 
                                href={`tel:${driver.phone}`}
                                className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1"
                              >
                                <Phone className="h-3 w-3" />
                                {driver.phone}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            {driver.licenseNumber ? (
                              <span className="font-mono text-sm text-gray-700">{driver.licenseNumber}</span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge 
                              className={`${
                                driver.isActive 
                                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                                  : 'bg-gray-300 text-gray-700'
                              } rounded-full px-3 py-1 text-xs font-medium`}
                            >
                              {driver.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(driver.createdAt), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.location.href = `/admin/drivers/${driver.id}/profile`}
                                className="h-8 px-3 hover:bg-blue-50 text-gray-600 hover:text-[#0073ea] text-xs"
                              >
                                <User className="h-3 w-3 mr-1" />
                                Profile
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleOpenDialog(driver)}
                                className="h-8 w-8 hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteDriver(driver)}
                                className="h-8 w-8 hover:bg-red-50 text-gray-600 hover:text-red-600"
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
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {drivers.map((driver) => (
                <div 
                  key={driver.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base text-gray-900 mb-1">{driver.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          className={`${
                            driver.isActive 
                              ? 'bg-green-500 hover:bg-green-600 text-white' 
                              : 'bg-gray-300 text-gray-700'
                          } rounded-full px-2 py-0.5 text-xs font-medium`}
                        >
                          {driver.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenDialog(driver)}
                        className="h-8 w-8 hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteDriver(driver)}
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${driver.email}`} className="text-[#0073ea] hover:underline">
                        {driver.email}
                      </a>
                    </div>
                    {driver.phone && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${driver.phone}`} className="hover:underline">
                          {driver.phone}
                        </a>
                      </div>
                    )}
                    {driver.licenseNumber && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="font-mono">{driver.licenseNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(driver.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/admin/drivers/${driver.id}/profile`}
                      className="w-full"
                    >
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No drivers found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Get started by adding your first driver profile. Drivers can log in to view their assigned trips and add expenses.
            </p>
            <Button 
              onClick={() => handleOpenDialog(null)} 
              className="bg-[#0073ea] hover:bg-[#0058c2] text-white"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Driver
            </Button>
          </div>
        )}
      </div>

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

