'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getTransactions } from '@/lib/data';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { formatBothCurrencies } from '@/lib/currency';

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await getTransactions();
        // Only show expense transactions
        const expenses = (data || []).filter(t => t.type === 'expense');
        setTransactions(expenses);
      } catch (error) {
        console.error('Error loading transactions:', error);
      }
    };
    loadTransactions();
  }, []);

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Expenses</CardTitle>
        <CardDescription>Your 5 most recent expense transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <div className="font-medium">{transaction.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.category}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                   <Badge variant="destructive">
                    expense
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-destructive">
                  <div className="flex flex-col items-end">
                    <span>
                      -{formatBothCurrencies(transaction.amount, transaction.originalCurrency).cad}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatBothCurrencies(transaction.amount, transaction.originalCurrency).usd})
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
