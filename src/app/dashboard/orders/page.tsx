import { DashboardLayout } from '@/components/layout';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import OrdersClient from './OrdersClient';
import { fetchWithTimeout } from '@/lib/server-api';
import { cookies } from 'next/headers';

interface OrderShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface OrderLineItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  amount_total: number;
  image?: string;
  description?: string | null;
  size?: string | null;
  color?: string | null;
  productDescription?: string | null;
}

interface Order {
  _id: string;
  id: string;
  stripe_session_id: string;
  customer_email: string;
  amount_total_cents: number;
  currency: string;
  payment_status: string;
  shipping_address: OrderShippingAddress;
  line_items: OrderLineItem[];
  created_at: string;
}

async function fetchOrders(): Promise<Order[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return [];
    }

    const backendUrl = process.env.DOMAIN_NAME || 'https://r3sults-backend.vercel.app';
    const apiUrl = `${backendUrl.replace(/\/$/, '')}/api/admin/orders?limit=100`;

    const response = await fetchWithTimeout(
      apiUrl,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
      15000
    );

    if (!response.ok) {
      console.error('Failed to fetch orders:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.success && data.data?.orders) {
      return data.data.orders;
    }

    return [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

export default async function OrdersPage() {
  const initialOrders = await fetchOrders();

  return (
    <DashboardLayout title="Orders" subtitle="View and manage all orders" icon={<ShoppingCartIcon className="w-7 h-7" />}>
      <OrdersClient initialOrders={initialOrders} />
    </DashboardLayout>
  );
}
