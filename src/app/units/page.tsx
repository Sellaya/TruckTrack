'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, BarChart3 } from "lucide-react";
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
import { getUnits, createUnit, updateUnit } from '@/lib/data';
import type { Unit } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';

export default function UnitsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [staticCost, setStaticCost] = useState('');
  const [coveredMiles, setCoveredMiles] = useState('');

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
    setName('');
    setLicensePlate('');
    setPurchaseDate('');
    setStaticCost('');
    setCoveredMiles('');
    setEditingUnit(null);
  };

  const handleOpenDialog = (unit: Unit | null) => {
    if (unit) {
      setEditingUnit(unit);
      setName(unit.name);
      setLicensePlate(unit.licensePlate);
      setPurchaseDate(format(new Date(unit.purchaseDate), 'yyyy-MM-dd'));
      setStaticCost(String(unit.staticCost));
      setCoveredMiles(String(unit.coveredMiles));
    } else {
      resetForm();
    }
    setOpen(true);
  };

  // Helper function to parse date safely
  const parseDateSafely = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString();
    try {
      // Handle yyyy-MM-dd format
      if (dateStr.includes('-') && !dateStr.includes('T')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day);
          if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString();
          }
        }
      }
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch (e) {
      console.error('Error parsing date:', e);
    }
    return new Date().toISOString();
  };

  const handleSaveUnit = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Unit name is required.",
        variant: "destructive",
      });
      return;
    }
    if (!licensePlate.trim()) {
      toast({
        title: "Validation Error",
        description: "License plate is required.",
        variant: "destructive",
      });
      return;
    }
    if (!purchaseDate) {
      toast({
        title: "Validation Error",
        description: "Purchase date is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingUnit) {
        // Edit existing unit
        const updatedUnit = await updateUnit(editingUnit.id, {
          name,
          licensePlate,
          purchaseDate: parseDateSafely(purchaseDate),
          staticCost: parseFloat(staticCost),
          coveredMiles: parseFloat(coveredMiles),
        });
        if (updatedUnit) {
          // Reload units to ensure we have the latest data from database
          const updatedUnits = await getUnits();
          setUnits(updatedUnits || []);
          toast({ title: "Unit Updated", description: `${name} has been updated.` });
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
          name: name.trim(),
          licensePlate: licensePlate.trim(),
          purchaseDate: parseDateSafely(purchaseDate),
          staticCost: parseFloat(staticCost) || 0,
          coveredMiles: parseFloat(coveredMiles) || 0,
        };
        
        console.log('Attempting to create unit with data:', unitData);
        
        const newUnit = await createUnit(unitData);
        
        if (!newUnit) {
          throw new Error('Unit creation returned null. Please try again.');
        }
        
        // Reload units to ensure we have the latest data from database
        const updatedUnits = await getUnits();
        setUnits(updatedUnits || []);
        toast({ title: "Unit Added", description: `${name} has been added to your fleet.` });
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Units</h1>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add a New Unit'}</DialogTitle>
              <DialogDescription>
                {editingUnit 
                  ? 'Update the unit information below. License plate must be unique.'
                  : 'Fill in the details to add a new unit to your fleet. License plate must be unique.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="name" className="sm:text-right">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="sm:col-span-3" placeholder="e.g., Freightliner Cascadia" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="licensePlate" className="sm:text-right">License Plate</Label>
                <Input id="licensePlate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className="sm:col-span-3" placeholder="e.g., TRUCK1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="purchaseDate" className="sm:text-right">Purchase Date</Label>
                <div className="sm:col-span-3">
                  <DatePicker
                    id="purchaseDate"
                    value={purchaseDate}
                    onChange={setPurchaseDate}
                    placeholder="Select purchase date"
                    minDate={new Date(1900, 0, 1)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="staticCost" className="sm:text-right">Static Cost ($)</Label>
                <Input id="staticCost" type="number" value={staticCost} onChange={(e) => setStaticCost(e.target.value)} className="sm:col-span-3" placeholder="e.g., 1500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="coveredMiles" className="sm:text-right">Covered Miles</Label>
                <Input id="coveredMiles" type="number" value={coveredMiles} onChange={(e) => setCoveredMiles(e.target.value)} className="sm:col-span-3" placeholder="e.g., 150000" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveUnit}>{editingUnit ? 'Save Changes' : 'Add Unit'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Fleet</CardTitle>
          <CardDescription>A list of all units in your fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          {units.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit Name</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Static Cost</TableHead>
                  <TableHead>Covered Miles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell>{unit.licensePlate}</TableCell>
                    <TableCell>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(unit.staticCost)}</TableCell>
                    <TableCell>{new Intl.NumberFormat().format(unit.coveredMiles)} mi</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/units/${unit.id}/dashboard`)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Dashboard
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(unit)}>
                          <Edit className="h-4 w-4" />
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
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">No units added yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
