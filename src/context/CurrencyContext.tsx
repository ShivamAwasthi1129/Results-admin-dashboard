'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

interface CurrencyContextType {
  selectedCurrency: Currency;
  currencies: Currency[];
  setCurrency: (code: string) => void;
  convert: (amount: number, from?: string) => number; // Synchronous for immediate display
  convertAsync: (amount: number, from?: string) => Promise<number>; // Async for real-time rates
  formatPrice: (amount: number, from?: string) => string;
  isLoading: boolean;
}

const defaultCurrency: Currency = {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  rate: 1,
};

const CurrencyContext = createContext<CurrencyContextType>({
  selectedCurrency: defaultCurrency,
  currencies: [defaultCurrency],
  setCurrency: () => {},
  convert: (amount) => amount,
  convertAsync: async (amount) => amount,
  formatPrice: (amount) => `$${amount.toFixed(2)}`,
  isLoading: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(defaultCurrency);
  const [currencies, setCurrencies] = useState<Currency[]>([defaultCurrency]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCurrencies = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/currency?type=list', {
          next: { revalidate: 3600 }, // Revalidate every hour
        });
        const data = await response.json();
        if (data.success) {
          setCurrencies(data.data);
          console.log('Currencies loaded from', data.source || 'cache');
        }
      } catch (error) {
        console.error('Error fetching currencies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrencies();

    // Load saved currency preference
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency) {
      try {
        const parsed = JSON.parse(savedCurrency);
        setSelectedCurrency(parsed);
      } catch {
        // Use default if parsing fails
      }
    }
  }, []);

  const setCurrency = (code: string) => {
    const currency = currencies.find(c => c.code === code);
    if (currency) {
      setSelectedCurrency(currency);
      localStorage.setItem('preferredCurrency', JSON.stringify(currency));
    }
  };

  const convert = (amount: number, from: string = 'USD'): number => {
    // Synchronous conversion using cached rates (for immediate display)
    const fromCurrency = currencies.find(c => c.code === from);
    if (!fromCurrency) return amount;
    
    // Convert to USD first (base), then to selected currency
    const usdAmount = amount / fromCurrency.rate;
    return usdAmount * selectedCurrency.rate;
  };

  const convertAsync = async (amount: number, from: string = 'USD'): Promise<number> => {
    // Fetch latest rates for accurate real-time conversion
    try {
      const response = await fetch(`/api/currency?from=${from}&to=${selectedCurrency.code}&amount=${amount}`);
      const data = await response.json();
      if (data.success) {
        return data.data.to.amount;
      }
    } catch (error) {
      console.error('Error converting currency:', error);
    }
    
    // Fallback to cached rates
    return convert(amount, from);
  };

  const formatPrice = (amount: number, from: string = 'USD'): string => {
    // Use synchronous conversion for display (uses cached rates)
    const fromCurrency = currencies.find(c => c.code === from);
    if (!fromCurrency) {
      return `${selectedCurrency.symbol}${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    
    const usdAmount = amount / fromCurrency.rate;
    const convertedAmount = usdAmount * selectedCurrency.rate;
    
    return `${selectedCurrency.symbol}${convertedAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        currencies,
        setCurrency,
        convert,
        convertAsync,
        formatPrice,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export default CurrencyContext;

