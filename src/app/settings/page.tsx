'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Settings as SettingsIcon, DollarSign, Info } from 'lucide-react';
import { 
  getPrimaryCurrency, 
  setPrimaryCurrency, 
  getCADToUSDRate,
  getUSDToCADRate,
  setExchangeRate,
  refreshExchangeRates,
  type Currency 
} from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function SettingsPage() {
  const { toast } = useToast();
  const [primaryCurrency, setPrimaryCurrencyState] = useState<Currency>('CAD');
  const [usdToCadRate, setUsdToCadRate] = useState<string>('1.35');
  const [cadToUsdRate, setCadToUsdRate] = useState<string>('0.74');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering date-dependent content
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  return (
    <div className="flex flex-col bg-white min-h-screen w-full overflow-x-hidden">
      {/* Header Section - Monday.com Style */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full overflow-x-hidden px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-4 w-64 mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Currency Settings Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Currency Settings</h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Set your primary currency for reporting and summaries
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryCurrency" className="text-sm font-medium text-gray-900">
                    Primary Currency *
                  </Label>
                  <Select
                    value={primaryCurrency}
                    onValueChange={(value) => setPrimaryCurrencyState(value as Currency)}
                  >
                    <SelectTrigger className="w-full sm:max-w-xs" id="primaryCurrency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAD">CAD (Canadian Dollar)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    All transactions will be converted to this currency for summaries and reports.
                  </p>
                </div>

                {/* Exchange Rates Section */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Exchange Rates</h3>
                      <p className="text-xs text-gray-600">
                        Rates are automatically fetched from Frankfurter.dev API and cached for 1 hour.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshRates}
                      disabled={isRefreshing}
                      className="h-9 px-4 rounded-md"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 rounded bg-blue-100 flex items-center justify-center">
                          <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">USD to CAD</span>
                      </div>
                      <div className="text-2xl font-semibold text-gray-900 mb-1">
                        {usdToCadRate}
                      </div>
                      <p className="text-xs text-gray-500">1 USD = {usdToCadRate} CAD</p>
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 rounded bg-green-100 flex items-center justify-center">
                          <DollarSign className="h-3.5 w-3.5 text-green-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">CAD to USD</span>
                      </div>
                      <div className="text-2xl font-semibold text-gray-900 mb-1">
                        {cadToUsdRate}
                      </div>
                      <p className="text-xs text-gray-500">1 CAD = {cadToUsdRate} USD</p>
                    </div>
                  </div>

                  {lastUpdated && isMounted && (
                    <p className="text-xs text-gray-500 mt-3">
                      Last updated: {format(lastUpdated, 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>

                {/* Info Section */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-2">How it works:</p>
                        <ul className="text-sm text-blue-800 space-y-1.5 list-disc list-inside">
                          <li>All transactions can be entered in either USD or CAD</li>
                          <li>The original currency is always preserved</li>
                          <li>Reports and summaries show both currencies</li>
                          <li>All trip and expense numbers are converted to primary currency for consistency in reports</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <Button 
                    onClick={handleSaveSettings}
                    className="bg-[#0073ea] hover:bg-[#0058c2] text-white h-10 px-6 rounded-md font-medium"
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
