import ProductsClient from './MerchandiseClient';
import { fetchWithTimeout } from '@/lib/server-api';
import { cookies } from 'next/headers';

interface Product {
  _id: string;
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: 'shoes' | 'boots' | 'jackets' | 'watches' | 'shirts' | 'safety_suits' | 'safety_equipment' | 'accessories' | 'other';
  subcategory?: string;
  costPrice: number;
  sellingPrice: number;
  discount?: number;
  taxRate?: number;
  stock: {
    quantity: number;
    lowStockThreshold: number;
    reservedQuantity: number;
    availableQuantity: number;
    reorderPoint: number;
    maxStock?: number;
  };
  brand?: string;
  model?: string;
  size?: string[];
  color?: string[];
  material?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  safetyFeatures?: string[];
  safetyStandards?: string[];
  certifications?: string[];
  images?: Array<{ url: string; alt?: string; isPrimary?: boolean }>;
  specifications?: Array<{ key: string; value: string }>;
  vendor?: {
    name: string;
    contact: string;
    email?: string;
    address?: string;
  };
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  isFeatured?: boolean;
  tags?: string[];
  warrantyPeriod?: number;
  returnPolicy?: string;
  shippingInfo?: {
    weight: number;
    dimensions: string;
    shippingClass: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return [];
    }

    const apiUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/products?limit=100`
      : `http://localhost:3000/api/products?limit=100`;

    const response = await fetchWithTimeout(
      apiUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
      15000
    );

    if (!response.ok) {
      console.error('Failed to fetch products:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (data.success && data.data?.products) {
      return data.data.products;
    }

    return [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function ProductsPage() {
  const initialProducts = await fetchProducts();

  return <ProductsClient initialProducts={initialProducts} />;
}
