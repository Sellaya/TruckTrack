'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, DollarSign, TrendingUp, Calendar, FileText } from "lucide-react";
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
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getCADToUSDRate, getUSDToCADRate } from '@/lib/currency';

export default function IncomePage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState<Currency>('CAD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const cadToUsdRate = getCADToUSDRate();
  const usdToCadRate = getUSDToCADRate();

  // Ensure component is mounted before rendering date-dependent content
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    // Validation
    if (!description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required.",
        variant: "destructive",
      });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }
    if (!category.trim()) {
      toast({
        title: "Validation Error",
        description: "Category is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newIncome = await createTransaction({
        type: 'income',
        description: description.trim(),
        amount: parseFloat(amount),
        originalCurrency: currency,
        category: category.trim(),
        date: new Date().toISOString(),
      });

      if (newIncome) {
        // Reload transactions to ensure we have the latest data from database
        const data = await getTransactions();
        const income = (data || []).filter(t => t.type === 'income');
        setTransactions(income);
        toast({ 
          title: "Income Added", 
          description: "New income has been recorded successfully." 
        });
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
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate totals
  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
  const cadTotal = transactions.filter(t => t.originalCurrency === 'CAD').reduce((sum, t) => sum + t.amount, 0);
  const usdTotal = transactions.filter(t => t.originalCurrency === 'USD').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col bg-white min-h-screen w-full overflow-x-hidden">
      {/* Header Section - Monday.com Style */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">Income</h1>
            {transactions.length > 0 && (
              <span className="text-sm text-gray-500">({transactions.length} {transactions.length === 1 ? 'record' : 'records'})</span>
            )}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#0073ea] hover:bg-[#0058c2] text-white h-9 px-4 rounded-md font-medium shadow-sm hover:shadow-md transition-all">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Income
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Add a New Income</DialogTitle>
                <DialogDescription>
                  Record income from completed trips. Fill in all required fields and click Add Income.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
                    <Input 
                      id="description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="e.g., Delivery payment, Freight charge"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium">Amount *</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input 
                        id="amount" 
                        type="number" 
                        step="0.01"
                        min="0"
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
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium">Category *</Label>
                    <Input 
                      id="category" 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)} 
                      placeholder="e.g., Freight, Delivery, Service"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddIncome} className="bg-[#0073ea] hover:bg-[#0058c2]">Add Income</Button>
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
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards - Monday.com Style */}
            {transactions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Total Income</p>
                  </div>
                  <CurrencyDisplay
                    amount={totalIncome}
                    originalCurrency={transactions[0]?.originalCurrency || 'CAD'}
                    variant="compact"
                    className="text-xl font-semibold"
                    cadToUsdRate={cadToUsdRate}
                    usdToCadRate={usdToCadRate}
                  />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">CAD Total</p>
                  </div>
                  <div className="text-xl font-semibold text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(cadTotal)} CAD
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">USD Total</p>
                  </div>
                  <div className="text-xl font-semibold text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(usdTotal)} USD
                  </div>
                </div>
              </div>
            )}

            {/* Income Records */}
            {transactions.length > 0 ? (
              <>
                {/* Desktop: Table View */}
                <div className="hidden lg:block w-full overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900 py-3">Description</TableHead>
                            <TableHead className="font-semibold text-gray-900 py-3">Category</TableHead>
                            <TableHead className="font-semibold text-gray-900 py-3">Date</TableHead>
                            <TableHead className="text-right font-semibold text-gray-900 py-3">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction) => (
                            <TableRow key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <TableCell className="font-medium text-gray-900 py-3">{transaction.description}</TableCell>
                              <TableCell className="py-3">
                                <Badge variant="success" className="rounded-full">
                                  {transaction.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 py-3">
                                {isMounted ? format(new Date(transaction.date), 'MMM d, yyyy') : 'Loading...'}
                              </TableCell>
                              <TableCell className="text-right py-3">
                                <CurrencyDisplay
                                  amount={transaction.amount}
                                  originalCurrency={transaction.originalCurrency}
                                  variant="compact"
                                  cadToUsdRate={cadToUsdRate}
                                  usdToCadRate={usdToCadRate}
                                  className="items-end"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {/* Mobile: Card View */}
                <div className="lg:hidden space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-gray-900 truncate">{transaction.description}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="success" className="rounded-full text-xs">
                                {transaction.category}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {isMounted ? format(new Date(transaction.date), 'MMM d, yyyy') : 'Loading...'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500">Amount</span>
                          <CurrencyDisplay
                            amount={transaction.amount}
                            originalCurrency={transaction.originalCurrency}
                            variant="compact"
                            cadToUsdRate={cadToUsdRate}
                            usdToCadRate={usdToCadRate}
                            className="items-end font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-1">No income recorded yet</p>
                <p className="text-sm text-gray-600 mb-4">Start tracking your income by adding your first record.</p>
                <Button
                  onClick={() => setOpen(true)}
                  className="bg-[#0073ea] hover:bg-[#0058c2] text-white"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Income
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
