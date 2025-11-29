'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import { 
  getPrimaryCurrency, 
  setPrimaryCurrency, 
  getCADToUSDRate,
  getUSDToCADRate,
  setExchangeRate,
  refreshExchangeRates,
  type Currency 
} from '@/lib/currency';

export default function SettingsPage() {
  const { toast } = useToast();
  const [primaryCurrency, setPrimaryCurrencyState] = useState<Currency>('CAD');
  const [usdToCadRate, setUsdToCadRate] = useState<string>('1.35');
  const [cadToUsdRate, setCadToUsdRate] = useState<string>('0.74');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRates = async () => {
    try {
      const rates = await refreshExchangeRates();
      setUsdToCadRate(rates.usdToCad.toFixed(4));
      setCadToUsdRate(rates.cadToUsd.toFixed(4));
      setLastUpdated(new Date());
      
      // Also update the cached CAD to USD rate for backward compatibility
      setExchangeRate(rates.cadToUsd);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      // Use cached rates as fallback
      const cadToUsd = getCADToUSDRate();
      const usdToCad = getUSDToCADRate();
      setUsdToCadRate(usdToCad.toFixed(4));
      setCadToUsdRate(cadToUsd.toFixed(4));
    }
  };

  useEffect(() => {
    // Load settings on mount
    setPrimaryCurrencyState(getPrimaryCurrency());
    
    // Load exchange rates
    loadRates().finally(() => {
      setIsLoading(false);
    });
  }, []);

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    try {
      await loadRates();
      toast({
        title: "Rates Updated",
        description: "Exchange rates have been refreshed from the API.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh exchange rates. Using cached rates.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveSettings = () => {
    setPrimaryCurrency(primaryCurrency);
    
    toast({
      title: "Settings Saved",
      description: `Primary currency set to ${primaryCurrency}. Exchange rates are automatically fetched from the API.`,
    });
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your currency preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>
            Set your primary currency for reporting. All transactions will be converted to this currency for summaries and reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="primaryCurrency" className="sm:text-right">Primary Currency</Label>
              <Select
                value={primaryCurrency}
                onValueChange={(value) => setPrimaryCurrencyState(value as Currency)}
              >
                <SelectTrigger className="sm:col-span-3" id="primaryCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAD">CAD (Canadian Dollar)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Exchange Rates</Label>
              <div className="sm:col-span-3 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">USD to CAD</div>
                    <div className="text-lg font-semibold">{usdToCadRate}</div>
                    <p className="text-xs text-muted-foreground">1 USD = {usdToCadRate} CAD</p>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">CAD to USD</div>
                    <div className="text-lg font-semibold">{cadToUsdRate}</div>
                    <p className="text-xs text-muted-foreground">1 CAD = {cadToUsdRate} USD</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshRates}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Rates'}
                  </Button>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rates are automatically fetched from Frankfurter.dev API and cached for 1 hour.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">How it works:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>All transactions can be entered in either USD or CAD</li>
                  <li>The original currency is always preserved</li>
                  <li>Reports and summaries show both currencies</li>
                  <li>All trip and expense numbers are converted to primary currency for consistency in reports</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveSettings}>Save Settings</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

