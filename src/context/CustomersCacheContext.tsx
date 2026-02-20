'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CachedCustomer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    zipCode?: string;
  };
}

interface CustomersCacheContextType {
  customers: CachedCustomer[];
  setCustomers: (customers: CachedCustomer[]) => void;
}

const CustomersCacheContext = createContext<CustomersCacheContextType | undefined>(undefined);

export function CustomersCacheProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomersState] = useState<CachedCustomer[]>([]);
  const setCustomers = useCallback((list: CachedCustomer[]) => {
    setCustomersState(list);
  }, []);
  return (
    <CustomersCacheContext.Provider value={{ customers, setCustomers }}>
      {children}
    </CustomersCacheContext.Provider>
  );
}

export function useCustomersCache(): CustomersCacheContextType | undefined {
  return useContext(CustomersCacheContext);
}
