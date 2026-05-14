'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Input, Modal, Table } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  EyeIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  PhotoIcon,
  PhoneIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

interface OrderShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface OrderBillingAddress {
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
  product?: {
    id?: string;
    _id: string;
    name?: string;
    description?: string;
    category?: string;
    sellingPrice?: number;
    images?: Array<{ url: string; alt?: string; isPrimary?: boolean }>;
    status?: string;
    sku?: string;
  } | null;
}

interface Order {
  id?: string;
  _id: string;
  stripe_session_id?: string;
  /** Sales channel / provider (e.g. Stripe, Printify) when provided by API */
  sales_provider?: string;
  order_type?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  customer_email: string;
  amount_total?: number;
  amount_total_cents?: number;
  amount_subtotal?: number;
  shipping_amount?: number;
  currency: string;
  payment_status: string;
  shipping_address: OrderShippingAddress;
  billing_address?: OrderBillingAddress;
  billing_same_as_shipping?: boolean;
  line_items: OrderLineItem[];
  created_at: string;
}

interface OrdersClientProps {
  initialOrders: Order[];
}

const paymentStatusVariant: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
  paid: 'success',
  unpaid: 'warning',
  no_payment_required: 'secondary',
};

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const { token, hasAction } = useAuth();
  const canRead = hasAction('orders.read');
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (searchQuery) params.append('search', searchQuery);
      if (paymentFilter !== 'all') params.append('payment_status', paymentFilter);

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.orders) {
          setOrders(data.data.orders);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [searchQuery, paymentFilter, token]);

  const fetchOrderDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.order) {
          setDetailOrder(data.data.order);
        }
      }
    } catch (error) {
      console.error('Error fetching order detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    setDetailOrder(null);
    fetchOrderDetail(order.id || order._id);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoney = (value: number, currency = 'usd') =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(value);

  const getOrderTypeLabel = (o: Order) => {
    const m = o.metadata;
    return (
      o.sales_provider ||
      (typeof m?.sales_provider === 'string' ? m.sales_provider : undefined) ||
      o.order_type ||
      (typeof m?.order_type === 'string' ? m.order_type : undefined) ||
      o.channel ||
      (typeof m?.channel === 'string' ? m.channel : undefined) ||
      'Sales provider'
    );
  };

  const formatAmount = (order: Order) => {
    const amount =
      order.amount_total != null
        ? Number(order.amount_total)
        : order.amount_total_cents != null
          ? order.amount_total_cents / 100
          : 0;
    return formatMoney(amount, order.currency);
  };

  const displayOrder = detailOrder ?? selectedOrder;
  const shipping = displayOrder?.shipping_address;
  const billing = displayOrder?.billing_address;

  const columns = [
    { key: 'id', label: 'Order ID', width: '14%' },
    {
      key: 'customer',
      label: 'Customer',
      width: '14%',
      render: (o: Order) => (
        <span className="text-[var(--text-primary)] truncate block">
          {o.shipping_address?.firstName} {o.shipping_address?.lastName}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      width: '14%',
      render: (o: Order) => (
        <span className="text-[var(--text-secondary)] text-sm truncate block">{o.customer_email}</span>
      ),
    },
    {
      key: 'order_type',
      label: 'Order type',
      width: '12%',
      render: (o: Order) => {
        const sales = getOrderTypeLabel(o);
        return (
          <span className="text-sm text-[var(--text-secondary)] truncate block" title={String(sales)}>
            {sales}
          </span>
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      width: '10%',
      render: (o: Order) => (
        <span className="font-semibold text-[var(--text-primary)]">
          {formatAmount(o)}
        </span>
      ),
    },
    {
      key: 'payment_status',
      label: 'Payment',
      width: '10%',
      render: (o: Order) => (
        <Badge variant={paymentStatusVariant[o.payment_status] || 'secondary'}>
          {o.payment_status}
        </Badge>
      ),
    },
    {
      key: 'shipping',
      label: 'Shipping',
      width: '18%',
      render: (o: Order) => (
        <span className="text-sm text-[var(--text-muted)] truncate block">
          {[o.shipping_address?.city, o.shipping_address?.state, o.shipping_address?.country].filter(Boolean).join(', ')}
        </span>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      width: '8%',
      render: (o: Order) => (
        <span className="text-[var(--text-primary)]">{o.line_items?.length ?? 0}</span>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      width: '12%',
      render: (o: Order) => (
        <span className="text-sm text-[var(--text-muted)]">{formatDate(o.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '8%',
      render: (o: Order) => canRead ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(o);
          }}
          className="flex items-center gap-1"
        >
          <EyeIcon className="w-4 h-4" />
          View
        </Button>
      ) : null,
    },
  ];

  return (
    <>
      <Card padding="none" className="overflow-visible">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-input)]">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingCartIcon className="w-5 h-5" />
              Orders
            </h2>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial min-w-[180px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm"
              >
                <option value="all">All payment status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="no_payment_required">No payment required</option>
              </select>
            </div>
          </div>
        </div>

        <div
          className="overflow-x-scroll overflow-y-visible w-full border border-[var(--border-color)] rounded-lg pb-1"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className="min-w-[1100px] min-h-0">
            <Table<Order>
              columns={columns}
              data={orders}
              isLoading={isLoading}
              emptyMessage="No orders found."
              rowKey="id"
              compact
            />
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOrder(null);
          setDetailOrder(null);
        }}
        title={displayOrder ? `Order ${displayOrder.id}` : 'Order details'}
        size="lg"
      >
        {loadingDetail && !displayOrder ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--primary-500)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayOrder ? (
          <div className="space-y-5">
            {/* Header: Order ID + Date + Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Order {displayOrder.id}</h2>
                <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                  <CalendarIcon className="w-4 h-4" />
                  {formatDate(displayOrder.created_at)}
                </p>
              </div>
              <Badge variant={paymentStatusVariant[displayOrder.payment_status] || 'secondary'} className="text-sm px-3 py-1">
                {displayOrder.payment_status}
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Order type / sales provider:{' '}
              <span className="font-medium text-[var(--text-primary)]">{getOrderTypeLabel(displayOrder)}</span>
            </p>

            {/* Customer + Payment breakdown side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)]/50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Customer
                </h3>
                <p className="font-semibold text-[var(--text-primary)]">
                  {shipping?.firstName} {shipping?.lastName}
                </p>
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mt-1">
                  <EnvelopeIcon className="w-3.5 h-3.5 shrink-0" /> {displayOrder.customer_email}
                </p>
                {shipping?.phone && (
                  <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mt-1">
                    <PhoneIcon className="w-3.5 h-3.5 shrink-0" /> {shipping.phone}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)]/50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <CurrencyDollarIcon className="w-4 h-4" /> Price breakdown
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[var(--text-primary)]">
                    <span>Subtotal</span>
                    <span>
                      {displayOrder.amount_subtotal != null
                        ? formatMoney(displayOrder.amount_subtotal, displayOrder.currency)
                        : displayOrder.line_items?.length
                          ? formatMoney(
                              displayOrder.line_items.reduce((sum, i) => {
                                const amt = i.amount_total != null ? (i.amount_total >= 1000 ? i.amount_total / 100 : i.amount_total) : 0;
                                return sum + amt;
                              }, 0),
                              displayOrder.currency
                            )
                          : '—'}
                    </span>
                  </div>
                  {(displayOrder.shipping_amount != null && displayOrder.shipping_amount > 0) && (
                    <div className="flex justify-between text-[var(--text-primary)]">
                      <span>Shipping</span>
                      <span>{formatMoney(displayOrder.shipping_amount, displayOrder.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-[var(--text-primary)] pt-2 mt-1 border-t border-[var(--border-color)]">
                    <span>Total</span>
                    <span>{formatAmount(displayOrder)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)]/50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" /> Shipping address
                </h3>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  {shipping?.line1}
                  {shipping?.line2 && `, ${shipping.line2}`}
                  <br />
                  {shipping?.city}, {shipping?.state} {shipping?.postalCode}
                  <br />
                  {shipping?.country}
                </p>
              </div>
              {displayOrder.billing_address && (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)]/50 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-2">
                    <HomeIcon className="w-4 h-4" /> Billing address
                    {displayOrder.billing_same_as_shipping && (
                      <span className="text-[10px] font-normal normal-case">(same as shipping)</span>
                    )}
                  </h3>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {billing?.line1}
                    {billing?.line2 && `, ${billing.line2}`}
                    <br />
                    {billing?.city}, {billing?.state} {billing?.postalCode}
                    <br />
                    {billing?.country}
                  </p>
                </div>
              )}
            </div>

            {/* Line items */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Items ({displayOrder.line_items?.length ?? 0})
              </h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {(displayOrder.line_items || []).map((item: OrderLineItem, idx: number) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)]/50 hover:bg-[var(--bg-input)]/80 transition-colors"
                  >
                    <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)]">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PhotoIcon className="w-6 h-6 text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {item.quantity} × {formatMoney(item.price ?? 0, displayOrder.currency)} ={' '}
                        {formatMoney(
                          item.amount_total != null && item.amount_total < 1000 ? item.amount_total : (item.amount_total ?? 0) / 100,
                          displayOrder.currency
                        )}
                      </p>
                      {(item.description || item.size || item.color) && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {[item.description, item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
