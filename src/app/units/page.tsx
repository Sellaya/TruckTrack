'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, BarChart3, Trash2, Truck, MoreVertical } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getUnits, createUnit, updateUnit, deleteUnit } from '@/lib/data';
import type { Unit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { getPrimaryCurrency } from '@/lib/currency';
import { DistanceDisplay } from '@/components/ui/distance-display';
import { 
  US_STATES, 
  CANADIAN_PROVINCES, 
  getStateProvincesByCountry, 
  getStateProvinceLabel,
  type Country 
} from '@/lib/states-provinces';
import { Skeleton } from '@/components/ui/skeleton';

export default function UnitsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  const [make, setMake] = useState('');
  const [year, setYear] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [plate, setPlate] = useState('');
  const [country, setCountry] = useState<Country>('USA');
  const [province, setProvince] = useState('');
  const [staticCost, setStaticCost] = useState('');
  const [odometerReading, setOdometerReading] = useState('');

  // Load units from Supabase on mount
  useEffect(() => {
    const loadUnits = async () => {
      setIsLoading(true);
      try {
        const data = await getUnits();
        setUnits(data || []);
      } catch (error) {
        console.error('Error loading units:', error);
        toast({
          title: "Error Loading Units",
          description: "Failed to load units. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setMake('');
    setYear('');
    setModel('');
    setVin('');
    setPlate('');
    setCountry('USA');
    setProvince('');
    setStaticCost('');
    setOdometerReading('');
    setEditingUnit(null);
  };

  const handleOpenDialog = (unit: Unit | null) => {
    if (unit) {
      setEditingUnit(unit);
      setMake(unit.make);
      setYear(String(unit.year));
      setModel(unit.model);
      setVin(unit.vin);
      setPlate(unit.plate || '');
      setCountry(unit.country || 'USA');
      setProvince(unit.province || '');
      setStaticCost(String(unit.staticCost));
      setOdometerReading(String(unit.odometerReading));
    } else {
      resetForm();
    }
    setOpen(true);
  };

  const handleSaveUnit = async () => {
    // Validation
    if (!make.trim()) {
      toast({
        title: "Validation Error",
        description: "Make is required.",
        variant: "destructive",
      });
      return;
    }
    if (!year.trim() || isNaN(parseInt(year))) {
      toast({
        title: "Validation Error",
        description: "Year must be a valid number.",
        variant: "destructive",
      });
      return;
    }
    if (!model.trim()) {
      toast({
        title: "Validation Error",
        description: "Model is required.",
        variant: "destructive",
      });
      return;
    }
    if (!vin.trim()) {
      toast({
        title: "Validation Error",
        description: "VIN is required.",
        variant: "destructive",
      });
      return;
    }
    if (!plate.trim()) {
      toast({
        title: "Validation Error",
        description: "Plate is required.",
        variant: "destructive",
      });
      return;
    }
    if (!country) {
      toast({
        title: "Validation Error",
        description: "Country is required.",
        variant: "destructive",
      });
      return;
    }
    if (!province.trim()) {
      toast({
        title: "Validation Error",
        description: `${getStateProvinceLabel(country)} is required.`,
        variant: "destructive",
      });
      return;
    }
    if (!staticCost.trim() || isNaN(parseFloat(staticCost)) || parseFloat(staticCost) < 0) {
      toast({
        title: "Validation Error",
        description: "Static Cost must be a valid positive number.",
        variant: "destructive",
      });
      return;
    }
    if (!odometerReading.trim() || isNaN(parseFloat(odometerReading)) || parseFloat(odometerReading) < 0) {
      toast({
        title: "Validation Error",
        description: "Odometer Reading must be a valid positive number.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingUnit) {
        // Edit existing unit
        const updatedUnit = await updateUnit(editingUnit.id, {
          make: make.trim(),
          year: parseInt(year, 10),
          model: model.trim(),
          vin: vin.trim(),
          plate: plate.trim(),
          country,
          province: province.trim(),
          staticCost: parseFloat(staticCost),
          odometerReading: parseFloat(odometerReading),
        });
        if (updatedUnit) {
          // Reload units to ensure we have the latest data from database
          const updatedUnits = await getUnits();
          setUnits(updatedUnits || []);
          toast({ title: "Unit Updated", description: `${make} ${year} ${model} has been updated.` });
        } else {
          toast({
            title: "Error",
            description: "Failed to update unit. Please try again.",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Add new unit
        const unitData = {
          make: make.trim(),
          year: parseInt(year, 10),
          model: model.trim(),
          vin: vin.trim(),
          plate: plate.trim(),
          country,
          province: province.trim(),
          staticCost: parseFloat(staticCost) || 0,
          odometerReading: parseFloat(odometerReading) || 0,
        };
        
        console.log('Attempting to create unit with data:', unitData);
        
        const newUnit = await createUnit(unitData);
        
        if (!newUnit) {
          throw new Error('Unit creation returned null. Please try again.');
        }
        
        // Reload units to ensure we have the latest data from database
        const updatedUnits = await getUnits();
        setUnits(updatedUnits || []);
        toast({ title: "Unit Added", description: `${make} ${year} ${model} has been added to your fleet.` });
      }
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving unit:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getUnitDisplayName = (unit: Unit) => {
    return `${unit.make} ${unit.year} ${unit.model}`;
  };

  const handleDeleteUnit = (unit: Unit) => {
    setUnitToDelete(unit);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUnit = async () => {
    if (!unitToDelete) return;

    try {
      const success = await deleteUnit(unitToDelete.id);
      
      if (success) {
        // Reload units after deletion
        const data = await getUnits();
        setUnits(data || []);
        toast({ 
          title: "Unit Deleted", 
          description: `${getUnitDisplayName(unitToDelete)} has been permanently deleted.` 
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete unit. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while deleting the unit.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setUnitToDelete(null);
    }
  };

  return (
    <div className="flex flex-col bg-white min-h-screen w-full overflow-x-hidden">
      {/* Header Section - Monday.com Style */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">Units</h1>
            {units.length > 0 && (
              <span className="text-sm text-gray-500">({units.length} {units.length === 1 ? 'unit' : 'units'})</span>
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
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
                <DialogDescription>
                  {editingUnit 
                    ? 'Update the unit information below.'
                    : 'Fill in the details to add a new unit to your fleet.'}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="make">Make *</Label>
                    <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g., Freightliner" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g., 2023" min="1900" max="2100" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="model">Model *</Label>
                    <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g., Cascadia" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vin">VIN *</Label>
                    <Input id="vin" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} placeholder="e.g., 1HGBH41JXMN109186" maxLength={17} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="plate">Plate *</Label>
                    <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="e.g., ABC-123" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select value={country} onValueChange={(value: Country) => {
                      setCountry(value);
                      setProvince(''); // Reset province when country changes
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="province">{getStateProvinceLabel(country)} *</Label>
                    <Select value={province} onValueChange={setProvince} disabled={!country}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${getStateProvinceLabel(country).toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getStateProvincesByCountry(country).map((sp) => (
                          <SelectItem key={sp.abbreviation} value={sp.abbreviation}>
                            {sp.name} ({sp.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="staticCost">Static Cost *</Label>
                    <Input id="staticCost" type="number" step="0.01" value={staticCost} onChange={(e) => setStaticCost(e.target.value)} placeholder="e.g., 1500.00" min="0" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="odometerReading">Odometer Reading *</Label>
                    <Input id="odometerReading" type="number" value={odometerReading} onChange={(e) => setOdometerReading(e.target.value)} placeholder="e.g., 150000" min="0" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveUnit} className="bg-[#0073ea] hover:bg-[#0058c2]">{editingUnit ? 'Save Changes' : 'Add Unit'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full overflow-x-hidden px-4 sm:px-6 py-6">
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards - Monday.com Style */}
            {units.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Total Units</p>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{units.length}</p>
                  <p className="text-xs text-gray-500 mt-1">units in fleet</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Total Static Cost</p>
                  </div>
                  <CurrencyDisplay 
                    amount={units.reduce((sum, unit) => sum + unit.staticCost, 0)} 
                    originalCurrency={getPrimaryCurrency()}
                    variant="compact"
                    className="text-xl font-semibold"
                  />
                  <p className="text-xs text-gray-500 mt-1">monthly operating costs</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Total Odometer</p>
                  </div>
                  <DistanceDisplay 
                    distance={units.reduce((sum, unit) => sum + unit.odometerReading, 0)} 
                    variant="compact" 
                    className="text-xl font-semibold"
                  />
                  <p className="text-xs text-gray-500 mt-1">combined mileage</p>
                </div>
              </div>
            )}

            {/* Units List */}
            {units.length > 0 ? (
              <div className="space-y-3">
                {units.map((unit) => (
                  <div key={unit.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Truck className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-base sm:text-lg text-gray-900">{getUnitDisplayName(unit)}</h3>
                              <Badge variant="outline" className="rounded-full text-xs">
                                {unit.year}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mb-2">
                              <span className="font-mono">{unit.vin}</span>
                              <span>•</span>
                              <span className="font-mono">{unit.plate}</span>
                              <span>•</span>
                              <span>{unit.province}, {unit.country}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                              <CurrencyDisplay 
                                amount={unit.staticCost} 
                                originalCurrency={getPrimaryCurrency()}
                                variant="inline"
                                className="text-xs sm:text-sm"
                              />
                              <span className="text-gray-400">•</span>
                              <DistanceDisplay distance={unit.odometerReading} variant="inline" className="text-xs sm:text-sm" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/units/${unit.id}/dashboard`)}
                          className="hidden sm:flex h-9 px-4 rounded-md"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Dashboard
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => router.push(`/units/${unit.id}/dashboard`)}
                          className="sm:hidden h-9 w-9"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(unit)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUnit(unit)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
                <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No units yet</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Get started by adding your first fleet unit
                </p>
                <Button 
                  onClick={() => handleOpenDialog(null)}
                  className="bg-[#0073ea] hover:bg-[#0058c2] text-white"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Your First Unit
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{unitToDelete ? getUnitDisplayName(unitToDelete) : 'this unit'}</strong>? 
              This action cannot be undone and will permanently remove the unit from your fleet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUnit}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
