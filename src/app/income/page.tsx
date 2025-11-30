'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTransactions, createTransaction } from '@/lib/data';
import type { Transaction, Currency } from '@/lib/types';
import { format } from 'date-fns';
import { formatBothCurrencies } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';

export default function IncomePage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState<Currency>('CAD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load income from Supabase on mount
  useEffect(() => {
    const loadIncome = async () => {
      setIsLoading(true);
      try {
        const data = await getTransactions();
        const income = (data || []).filter(t => t.type === 'income');
        setTransactions(income);
      } catch (error) {
        console.error('Error loading income:', error);
        toast({
          title: "Error Loading Income",
          description: "Failed to load income. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadIncome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddIncome = async () => {
    if (!description.trim() || !amount || !category.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newIncome = await createTransaction({
        type: 'income',
        description,
        amount: parseFloat(amount),
        originalCurrency: currency,
        category,
        date: new Date().toISOString(),
      });

      if (newIncome) {
        // Reload transactions to ensure we have the latest data from database
        const data = await getTransactions();
        const income = (data || []).filter(t => t.type === 'income');
        setTransactions(income);
        toast({ title: "Income Added", description: "New income has been recorded." });
        setDescription('');
        setAmount('');
        setCategory('');
        setCurrency('CAD');
        setOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to create income. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating income:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Income</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Income
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add a New Income</DialogTitle>
              <DialogDescription>
                Record income from completed trips. Fill in all required fields and click Add Income.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="description" className="sm:text-right">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="amount" className="sm:text-right">Amount</Label>
                <div className="sm:col-span-3 flex flex-col sm:flex-row gap-2">
                  <Input 
                    id="amount" 
                    type="number" 
                    step="0.01"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className="flex-1" 
                    placeholder="0.00"
                  />
                  <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="category" className="sm:text-right">Category</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="sm:col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddIncome}>Add Income</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Income Records</CardTitle>
          <CardDescription>A list of all your income transactions.</CardDescription>
        </CardHeader>
        <CardContent>
           {transactions.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(transaction.date), 'PPP')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-green-600">+{formatBothCurrencies(transaction.amount, transaction.originalCurrency).cad}</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatBothCurrencies(transaction.amount, transaction.originalCurrency).usd})
                        </span>
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
              <p className="text-lg text-muted-foreground">No income recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
