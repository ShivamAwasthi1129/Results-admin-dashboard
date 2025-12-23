import { NextRequest, NextResponse } from 'next/server';

// Free currency API - exchangerate-api.com (no API key required for free tier)
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

// Fallback rates if API fails
const fallbackRates: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.12,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149.50,
  CNY: 7.24,
  MXN: 17.15,
  BRL: 4.97,
};

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
  MXN: 'MX$',
  BRL: 'R$',
  AED: 'د.إ',
  SAR: '﷼',
  SGD: 'S$',
  HKD: 'HK$',
  CHF: 'CHF',
  NZD: 'NZ$',
};

const currencyNames: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  INR: 'Indian Rupee',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  MXN: 'Mexican Peso',
  BRL: 'Brazilian Real',
  AED: 'UAE Dirham',
  SAR: 'Saudi Riyal',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  CHF: 'Swiss Franc',
  NZD: 'New Zealand Dollar',
};

// Cache for exchange rates (update every 1 hour)
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function fetchExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const response = await fetch(EXCHANGE_RATE_API, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    cachedRates = data.rates || {};
    cacheTimestamp = now;
    
    // Ensure USD is always 1
    cachedRates['USD'] = 1;
    
    console.log('Exchange rates fetched successfully from API');
    return cachedRates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return fallback rates
    cachedRates = fallbackRates;
    cacheTimestamp = now;
    return fallbackRates;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || 'USD';
    const to = searchParams.get('to');
    const amount = parseFloat(searchParams.get('amount') || '1');
    const type = searchParams.get('type') || 'convert'; // convert, rates, list

    // Fetch real-time exchange rates
    const exchangeRates = await fetchExchangeRates();

    // Return list of currencies
    if (type === 'list') {
      const currencies = Object.keys(exchangeRates)
        .filter(code => currencyNames[code]) // Only include currencies we have names for
        .map(code => ({
          code,
          name: currencyNames[code],
          symbol: currencySymbols[code] || code,
          rate: exchangeRates[code],
        }))
        .sort((a, b) => a.code.localeCompare(b.code));
      
      return NextResponse.json({
        success: true,
        data: currencies,
        source: 'api',
        timestamp: new Date().toISOString(),
      });
    }

    // Return all exchange rates
    if (type === 'rates') {
      const rates = Object.keys(exchangeRates)
        .filter(code => currencyNames[code])
        .map(code => ({
          code,
          name: currencyNames[code],
          symbol: currencySymbols[code] || code,
          rate: exchangeRates[code],
          rateFromBase: from === 'USD' 
            ? exchangeRates[code] 
            : (exchangeRates[code] / (exchangeRates[from] || 1)).toFixed(4),
        }));
      
      return NextResponse.json({
        success: true,
        base: from,
        data: rates,
        source: 'api',
        timestamp: new Date().toISOString(),
      });
    }

    // Convert amount
    if (to && type === 'convert') {
      if (!exchangeRates[from] || !exchangeRates[to]) {
        return NextResponse.json(
          { success: false, error: 'Invalid currency code' },
          { status: 400 }
        );
      }

      const fromRate = exchangeRates[from];
      const toRate = exchangeRates[to];
      const convertedAmount = (amount / fromRate) * toRate;

      return NextResponse.json({
        success: true,
        data: {
          from: {
            code: from,
            symbol: currencySymbols[from] || from,
            name: currencyNames[from] || from,
            amount: amount,
          },
          to: {
            code: to,
            symbol: currencySymbols[to] || to,
            name: currencyNames[to] || to,
            amount: parseFloat(convertedAmount.toFixed(2)),
          },
          rate: parseFloat((toRate / fromRate).toFixed(6)),
          timestamp: new Date().toISOString(),
          source: 'api',
        },
      });
    }

    // Default: return single currency info
    if (!exchangeRates[from]) {
      return NextResponse.json(
        { success: false, error: 'Invalid currency code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        code: from,
        name: currencyNames[from] || from,
        symbol: currencySymbols[from] || from,
        rate: exchangeRates[from],
      },
      source: 'api',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Currency API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process currency request' },
      { status: 500 }
    );
  }
}
