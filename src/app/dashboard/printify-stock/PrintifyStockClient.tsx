'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Modal, PhoneInput } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PhotoIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  TruckIcon,
  DocumentTextIcon,
  XCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

/** Types matching Printify list products API response (see docs/PRINTIFY_INTEGRATION.md) */
interface PrintifyShop {
  id: number;
  title: string;
  sales_channel?: string;
}

/** Printify order (list + detail) */
interface PrintifyOrder {
  id: string;
  address_to?: { first_name?: string; last_name?: string; email?: string; phone?: string; address1?: string; address2?: string; city?: string; region?: string; zip?: string; country?: string; company?: string };
  line_items?: Array<{
    product_id?: string;
    variant_id?: number;
    quantity?: number;
    metadata?: { title?: string; sku?: string; variant_label?: string };
    cost?: number;
    shipping_cost?: number;
    status?: string;
    preview_image?: { src: string };
  }>;
  total_price?: number;
  total_shipping?: number;
  total_tax?: number;
  status?: string;
  shipping_method?: number;
  shipments?: Array<{ carrier?: string; number?: string; url?: string; delivered_at?: string }>;
  created_at?: string;
  sent_to_production_at?: string | null;
  fulfilled_at?: string | null;
  label?: string;
  external_id?: string;
  metadata?: { shop_order_label?: string; order_type?: string };
  [key: string]: unknown;
}

const ORDER_STATUS_HELP: Record<string, string> = {
  pending: 'Just created; should move forward shortly.',
  'on-hold': 'Waiting (e.g. payment or validation) before production.',
  'sending-to-production': 'Being sent to the print provider.',
  'in-production': 'Print provider is fulfilling the order.',
  fulfilled: 'All items have been fulfilled.',
  'partially-fulfilled': 'Some items fulfilled; others still in progress.',
  canceled: 'Order was canceled.',
  'payment-not-received': 'Charge failed; payment not received.',
  'has-issues': 'Problem with the order (e.g. address). Check Printify for details.',
  unfulfillable: 'Inventory or technical issue; cannot fulfill as placed.',
  'cost-calculation': 'Cost is being calculated.',
  'source-check-failed': 'Source validation failed.',
};

function orderStatusBadgeVariant(status: string): 'success' | 'danger' | 'warning' | 'secondary' | 'primary' {
  if (status === 'fulfilled') return 'success';
  if (status === 'partially-fulfilled') return 'primary';
  if (status === 'canceled') return 'secondary';
  if (['has-issues', 'unfulfillable', 'payment-not-received', 'source-check-failed'].includes(status)) return 'danger';
  if (['in-production', 'sending-to-production'].includes(status)) return 'primary';
  if (status === 'on-hold') return 'warning';
  return 'warning';
}

function getOrderRowDisplay(ord: PrintifyOrder) {
  const printifyId = String(ord.id ?? '').trim();
  const labelRaw = String(ord.label ?? ord.external_id ?? '').trim();
  const merged = labelRaw.match(/^#?([a-f0-9]{24})([\s\S]*)$/i);
  let secondLine = '';
  if (merged?.[2]?.trim()) {
    secondLine = merged[2].trim();
  } else if (ord.metadata && typeof ord.metadata === 'object' && (ord.metadata as { shop_order_label?: string }).shop_order_label) {
    secondLine = String((ord.metadata as { shop_order_label?: string }).shop_order_label);
  } else {
    const titles = ord.line_items?.map((i) => i.metadata?.title).filter(Boolean) as string[];
    secondLine = titles?.length ? titles.join(', ') : labelRaw && labelRaw !== printifyId ? labelRaw : '';
  }
  const firstLine = printifyId ? `#${printifyId}` : merged?.[1] ? `#${merged[1]}` : labelRaw.slice(0, 32) || '—';
  return { firstLine, secondLine: secondLine || '—' };
}

const SHIPPING_METHOD_LABELS: Record<number, string> = {
  1: 'Standard',
  2: 'Priority / express',
  3: 'Printify Express',
  4: 'Economy',
};

interface PrintifyImage {
  mockup_id?: string;
  id?: number;
  src: string;
  position?: string;
  variant_ids?: number[];
  is_default?: boolean;
  is_selected_for_publishing?: boolean;
  order?: number | null;
}

/** Product option: color (with hex) or size */
interface PrintifyOptionValue {
  id: number;
  title: string;
  colors?: string[];
}

interface PrintifyOption {
  name: string;
  type: string;
  values: PrintifyOptionValue[];
  display_in_preview?: boolean;
}

/** Print area placeholder (front/back) with decoration and design info */
interface PrintAreaPlaceholderImage {
  id?: string;
  name?: string;
  type?: string;
  input_text?: string;
  font_family?: string;
  font_size?: number;
  font_color?: string;
  decoration_method?: string;
  [key: string]: unknown;
}

interface PrintAreaPlaceholder {
  position: string;
  images?: PrintAreaPlaceholderImage[];
  decoration_method?: string;
}

interface PrintAreaItem {
  variant_ids?: number[];
  placeholders?: PrintAreaPlaceholder[];
  font_color?: string;
  font_family?: string;
}

/** View: printable area (e.g. Front side, Back side) with asset files */
interface PrintifyViewFile {
  src: string;
  variant_ids?: number[];
}

interface PrintifyView {
  id: number;
  label: string;
  position: string;
  files?: PrintifyViewFile[];
}

interface PrintifyVariant {
  id: number;
  title?: string;
  /** Printify may use option value title (string) or value id (number) */
  options?: Record<string, string | number>;
  price?: number;
  sku?: string;
  in_stock?: boolean;
  is_available?: boolean;
  [key: string]: unknown;
}

interface PrintifyProduct {
  id: string | number;
  title?: string;
  description?: string;
  safety_information?: string;
  tags?: string[];
  options?: PrintifyOption[];
  variants?: PrintifyVariant[];
  images?: PrintifyImage[];
  created_at?: string;
  updated_at?: string;
  visible?: boolean;
  is_locked?: boolean;
  blueprint_id?: number;
  user_id?: number;
  shop_id?: number;
  print_provider_id?: number;
  print_areas?: PrintAreaItem[];
  print_details?: unknown[];
  sales_channel_properties?: unknown[];
  is_printify_express_eligible?: boolean;
  is_printify_express_enabled?: boolean;
  is_economy_shipping_eligible?: boolean;
  is_economy_shipping_enabled?: boolean;
  is_deleted?: boolean;
  original_product_id?: string;
  views?: PrintifyView[];
  [key: string]: unknown;
}

const PRODUCTS_PAGE_SIZE = 20;

/** Strip simple HTML for display */
function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** Safe HTML snippet for safety_information / description */
function HtmlBlock({ html, className = '' }: { html: string; className?: string }) {
  if (!html) return null;
  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: html.replace(/<br\s*\/?>/gi, '<br/>') }}
    />
  );
}

/** Renders a key-value row for product details */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-wrap gap-2 py-1.5 border-b border-[var(--border-color)] last:border-0">
      <span className="font-medium text-[var(--text-muted)] min-w-[180px] shrink-0">{label}</span>
      <span className="text-[var(--text-primary)] break-all">
        {typeof value === 'object' && value !== null && !React.isValidElement(value) ? JSON.stringify(value) : String(value)}
      </span>
    </div>
  );
}

/** Product options (colors + sizes) – selectable; updates preview when display_in_preview */
function OptionsSection({
  options,
  selectedOptions,
  onSelectOption,
}: {
  options: PrintifyOption[];
  selectedOptions: Record<string, string>;
  onSelectOption: (optionName: string, valueTitle: string) => void;
}) {
  if (!options?.length) return null;
  return (
    <div className="p-0">
      <h4 className="font-semibold text-[var(--text-primary)] mb-3 sr-only">Select options</h4>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Choose color and size. The product preview above updates in real time when you select options (for options marked &quot;Show in preview&quot;).
      </p>
      <div className="space-y-6">
        {options.map((opt, i) => {
          const selected = selectedOptions[opt.name];
          return (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-[var(--text-primary)]">{opt.name}</span>
                <span className="text-xs text-[var(--text-muted)]">({opt.type})</span>
                {opt.display_in_preview && (
                  <Badge variant="secondary" title="Preview image updates when you select this option">Show in preview</Badge>
                )}
              </div>
              {opt.type === 'color' && opt.values?.length ? (
                <div className="flex flex-wrap gap-2">
                  {opt.values.map((v) => {
                    const isSelected = selected === v.title;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => onSelectOption(opt.name, v.title)}
                        className={`flex flex-col items-center gap-1 rounded-lg p-1 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] ${
                          isSelected ? 'ring-2 ring-[var(--primary-500)] ring-offset-2 ring-offset-[var(--bg-card)]' : 'hover:opacity-90'
                        }`}
                        title={`${v.title} ${v.colors?.[0] ?? ''}`}
                        aria-pressed={isSelected}
                      >
                        <div
                          className="w-8 h-8 rounded-full border border-[var(--border-color)] shrink-0"
                          style={{ backgroundColor: v.colors?.[0] ?? '#ccc' }}
                        />
                        <span className="text-xs text-[var(--text-primary)] max-w-16 truncate">{v.title}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {opt.values?.map((v) => {
                    const isSelected = selected === v.title;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => onSelectOption(opt.name, v.title)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] ${
                          isSelected
                            ? 'bg-[var(--primary-500)] text-white border-2 border-[var(--primary-500)]'
                            : 'bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/80 border-2 border-[var(--border-color)]'
                        }`}
                        aria-pressed={isSelected}
                      >
                        {v.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Print areas – where artwork is applied (front/back, DTG, etc.) */
function PrintAreasSection({ printAreas }: { printAreas: PrintAreaItem[] }) {
  if (!printAreas?.length) return null;
  return (
    <Card className="p-4">
      <h4 className="font-semibold text-[var(--text-primary)] mb-3">Print areas</h4>
      <p className="text-sm text-[var(--text-muted)] mb-4">Placement positions and decoration method for each print area.</p>
      <div className="space-y-4">
        {printAreas.map((area, i) => (
          <div key={i} className="rounded-lg border border-[var(--border-color)] p-3 space-y-3">
            {area.placeholders?.map((ph, j) => (
              <div key={j}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="capitalize">{ph.position}</Badge>
                  {ph.decoration_method && (
                    <span className="text-sm text-[var(--text-muted)]">Method: {ph.decoration_method}</span>
                  )}
                </div>
                {ph.images?.length ? (
                  <ul className="list-disc list-inside text-sm text-[var(--text-primary)] space-y-1">
                    {ph.images.map((img, k) => (
                      <li key={k}>
                        {img.input_text ? `"${img.input_text}"` : 'Image/asset'}
                        {img.font_family && ` · ${img.font_family}`}
                        {img.font_size && ` · ${img.font_size}px`}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            {area.variant_ids?.length != null && area.variant_ids.length > 0 && (
              <p className="text-xs text-[var(--text-muted)]">Variant IDs: {area.variant_ids.length} linked</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Views – printable sides (Front side, Back side) with asset URLs */
function ViewsSection({ views }: { views: PrintifyView[] }) {
  if (!views?.length) return null;
  return (
    <Card className="p-4">
      <h4 className="font-semibold text-[var(--text-primary)] mb-3">Views</h4>
      <p className="text-sm text-[var(--text-muted)] mb-4">Printable sides and their asset files (SVG/image URLs).</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {views.map((v) => (
          <div key={v.id} className="rounded-lg border border-[var(--border-color)] p-3 flex gap-3">
            {v.files?.[0]?.src && (
              <div className="w-16 h-16 rounded border border-[var(--border-color)] overflow-hidden bg-[var(--bg-muted)] shrink-0">
                <img src={v.files[0].src} alt={v.label} className="w-full h-full object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-[var(--text-primary)]">{v.label}</p>
              <p className="text-xs text-[var(--text-muted)] capitalize">Position: {v.position}</p>
              {v.files?.length ? (
                <p className="text-xs text-[var(--text-muted)] mt-1">{v.files.length} file(s)</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function PrintifyStockClient() {
  const [shops, setShops] = useState<PrintifyShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [products, setProducts] = useState<PrintifyProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Product detail: list data + optional full product (when list has no variants, we fetch single product for preview/checkout) */
  const [detailProduct, setDetailProduct] = useState<PrintifyProduct | null>(null);
  const [fullProduct, setFullProduct] = useState<PrintifyProduct | null>(null);
  const [detailProductLoading, setDetailProductLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const [variantsModalOpen, setVariantsModalOpen] = useState(false);
  const [variantsProductTitle, setVariantsProductTitle] = useState('');
  const [variantSearch, setVariantSearch] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    region: '',
    zip: '',
    country: 'US',
    shipping_method: 1,
  });

  /** When true, show full checkout page instead of product list */
  const [showCheckoutPage, setShowCheckoutPage] = useState(false);

  /** My orders tab */
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [orders, setOrders] = useState<PrintifyOrder[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<PrintifyOrder | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState<string | null>(null);
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null);
  const [orderDetailEditCustomer, setOrderDetailEditCustomer] = useState(false);

  /** Checkout form validation errors */
  const [checkoutFormErrors, setCheckoutFormErrors] = useState<Record<string, string>>({});

  const checkoutSectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const ORDERS_PAGE_SIZE = 10;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const shopIdForDetail = selectedShopId || (detailProduct?.shop_id != null ? String(detailProduct.shop_id) : '');

  const fetchShops = useCallback(async () => {
    setLoadingShops(true);
    setError(null);
    try {
      const res = await fetch('/api/printify/shops', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to load shops');
        setShops([]);
        return;
      }
      const list = data?.data?.shops ?? [];
      setShops(list);
      if (list.length > 0 && !selectedShopId) {
        setSelectedShopId(String(list[0].id));
      }
    } catch (e) {
      setError('Failed to load Printify shops');
      setShops([]);
    } finally {
      setLoadingShops(false);
    }
  }, [selectedShopId]);

  const fetchProducts = useCallback(async (shopId: string, pageNum: number) => {
    if (!shopId) {
      setProducts([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/printify/products?shop_id=${encodeURIComponent(shopId)}&page=${pageNum}&limit=${PRODUCTS_PAGE_SIZE}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to load products');
        setProducts([]);
        setTotal(0);
        return;
      }
      const payload = data?.data ?? {};
      setProducts(Array.isArray(payload.products) ? payload.products : []);
      setTotal(typeof payload.total === 'number' ? payload.total : 0);
    } catch (e) {
      setError('Failed to load Printify products');
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Open detail: set list data; if list has no variants but has options, fetch full product for preview/checkout */
  const openProductDetail = useCallback(
    async (product: PrintifyProduct) => {
      setDetailProduct(product);
      setFullProduct(null);
      setSelectedImageIndex(0);
      setSelectedOptions({});
      const sid = selectedShopId || product.shop_id;
      const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
      if (!hasVariants && Array.isArray(product.options) && product.options.length > 0 && sid) {
        setDetailProductLoading(true);
        try {
          const res = await fetch(
            `/api/printify/products/${encodeURIComponent(String(product.id))}?shop_id=${encodeURIComponent(String(sid))}`,
            { cache: 'no-store' }
          );
          const data = await res.json();
          if (res.ok && data?.data) setFullProduct(data.data);
        } catch {
          // keep list data only
        } finally {
          setDetailProductLoading(false);
        }
      } else if (hasVariants) {
        setFullProduct(product);
      }
    },
    [selectedShopId]
  );

  const productForVariants = fullProduct ?? detailProduct;

  /** Get option value id by option name and value title (for matching when API uses ids in variant.options) */
  const getOptionValueId = useCallback(
    (optionName: string, valueTitle: string): number | null => {
      const opts = productForVariants?.options ?? [];
      const opt = opts.find((o) => o.name === optionName);
      const val = opt?.values?.find((v) => (v.title ?? '').trim() === (valueTitle ?? '').trim());
      return val?.id != null ? Number(val.id) : null;
    },
    [productForVariants?.options]
  );

  /** Resolve selected options to a single variant. Printify may store option value as title (string) or id (number). */
  const resolvedVariant = useMemo(() => {
    const variants = productForVariants?.variants ?? [];
    const productOptions = productForVariants?.options ?? [];
    const opts = selectedOptions;
    const optionNames = productOptions.map((o) => o.name);
    if (optionNames.length === 0 || variants.length === 0) return null;
    const allSelected = optionNames.every((name) => opts[name] != null && String(opts[name]).trim() !== '');
    if (!allSelected) return null;

    const selectedTitles = optionNames.map((k) => String(opts[k]).trim().toLowerCase());
    const norm = (s: string) => String(s).trim().toLowerCase();

    const matchByOptions = (v: PrintifyVariant) => {
      const vOpts = v.options ?? {};
      const vKeys = Object.keys(vOpts);
      return optionNames.every((optName) => {
        const selectedVal = opts[optName];
        const variantVal = vOpts[optName];
        if (variantVal != null) {
          if (String(variantVal).trim() === String(selectedVal).trim()) return true;
          const valueId = getOptionValueId(optName, selectedVal);
          if (valueId != null && Number(variantVal) === valueId) return true;
        }
        const matchKey = vKeys.find((k) => norm(k) === norm(optName));
        if (matchKey != null) {
          const val = vOpts[matchKey];
          if (String(val).trim() === String(selectedVal).trim()) return true;
          const valueId = getOptionValueId(optName, selectedVal);
          if (valueId != null && Number(val) === valueId) return true;
        }
        return false;
      });
    };

    let found = variants.find(matchByOptions);
    if (found) return found;

    const selectedValueIds = new Set(
      optionNames.map((name) => getOptionValueId(name, opts[name])).filter((id): id is number => id != null)
    );
    if (selectedValueIds.size === optionNames.length) {
      found = variants.find((v) => {
        const vOpts = v.options ?? {};
        const vValues = new Set(Object.values(vOpts).map((x) => Number(x)).filter((n) => !Number.isNaN(n)));
        if (vValues.size !== selectedValueIds.size) return false;
        return [...selectedValueIds].every((id) => vValues.has(id));
      });
      if (found) return found;
    }

    const hasOptionKeys = variants.some((v) => v.options && Object.keys(v.options).length > 0);
    if (hasOptionKeys) return null;

    return variants.find((v) => {
      const t = (v.title ?? '').toLowerCase();
      return selectedTitles.every((sel) => t.includes(sel));
    }) ?? null;
  }, [productForVariants?.variants, productForVariants?.options, selectedOptions, getOptionValueId]);

  /** When resolved variant changes, switch main image to one that includes this variant (real-time preview) */
  useEffect(() => {
    const images = productForVariants?.images ?? [];
    if (!images.length || !resolvedVariant) return;
    const variantIdNum = Number(resolvedVariant.id);
    const idx = images.findIndex((img) => {
      if (!Array.isArray(img.variant_ids)) return false;
      return img.variant_ids.some((id) => Number(id) === variantIdNum);
    });
    if (idx >= 0) setSelectedImageIndex(idx);
  }, [productForVariants?.images, resolvedVariant]);

  const handleSelectOption = useCallback((optionName: string, valueTitle: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: valueTitle }));
  }, []);

  const closeProductDetail = useCallback(() => {
    setDetailProduct(null);
    setFullProduct(null);
    setSelectedImageIndex(0);
    setVariantsModalOpen(false);
    setVariantSearch('');
    setCheckoutModalOpen(false);
  }, []);

  const variantsList = productForVariants?.variants ?? [];
  const filteredVariants = useMemo(() => {
    if (!variantSearch.trim()) return variantsList;
    const q = variantSearch.trim().toLowerCase();
    return variantsList.filter((v) => {
      const title = (v.title ?? '').toLowerCase();
      const sku = (v.sku ?? '').toLowerCase();
      const idStr = String(v.id).toLowerCase();
      const optionsStr = v.options ? Object.values(v.options).join(' ').toLowerCase() : '';
      return title.includes(q) || sku.includes(q) || idStr.includes(q) || optionsStr.includes(q);
    });
  }, [variantsList, variantSearch]);

  const openVariantsModal = useCallback(() => {
    setVariantsProductTitle(detailProduct?.title ?? 'Product');
    setVariantsModalOpen(true);
  }, [detailProduct?.title]);

  const fetchOrders = useCallback(async (shopId: string, pageNum: number, status: string) => {
    if (!shopId) return;
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams({ shop_id: shopId, page: String(pageNum), limit: String(ORDERS_PAGE_SIZE) });
      if (status) params.set('status', status);
      const res = await fetch(`/api/printify/orders?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setOrders([]);
        setOrdersTotal(0);
        return;
      }
      const list = data?.data?.data ?? [];
      const total = typeof data?.data?.total === 'number' ? data.data.total : 0;
      setOrders(Array.isArray(list) ? list : []);
      setOrdersTotal(total);
    } catch {
      setOrders([]);
      setOrdersTotal(0);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchOrderDetail = useCallback(async (orderId: string) => {
    const shopId = selectedShopId || '';
    if (!shopId) return;
    setOrderDetailLoading(true);
    setOrderDetail(null);
    setOrderDetailError(null);
    try {
      const res = await fetch(`/api/printify/orders/${encodeURIComponent(orderId)}?shop_id=${encodeURIComponent(shopId)}`, { cache: 'no-store' });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOrderDetailError(raw?.error ?? raw?.message ?? `Failed to load order (${res.status})`);
        return;
      }
      const order = raw?.data && typeof raw.data === 'object' && (raw.data.id != null || raw.data.app_order_id != null)
        ? raw.data
        : raw?.id != null || raw?.app_order_id != null
          ? raw
          : null;
      if (order) setOrderDetail(order as PrintifyOrder);
      else setOrderDetailError('Order data could not be read.');
    } catch {
      setOrderDetailError('Failed to load order.');
    } finally {
      setOrderDetailLoading(false);
    }
  }, [selectedShopId]);

  const sendOrderToProduction = useCallback(async (orderId: string) => {
    const shopId = selectedShopId || '';
    if (!shopId) return;
    setOrderActionLoading(orderId);
    try {
      const res = await fetch(`/api/printify/orders/${encodeURIComponent(orderId)}/send_to_production?shop_id=${encodeURIComponent(shopId)}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to send to production');
        return;
      }
      toast.success('Order sent to production');
      setSelectedOrderId(null);
      setOrderDetail(null);
      fetchOrders(shopId, ordersPage, orderStatusFilter);
    } catch {
      toast.error('Request failed');
    } finally {
      setOrderActionLoading(null);
    }
  }, [selectedShopId, ordersPage, orderStatusFilter, fetchOrders]);

  const cancelOrderAction = useCallback(async (orderId: string) => {
    const shopId = selectedShopId || '';
    if (!shopId) return;
    if (!confirm('Cancel this order? This action cannot be undone.')) return;
    setOrderActionLoading(orderId);
    try {
      const res = await fetch(`/api/printify/orders/${encodeURIComponent(orderId)}/cancel?shop_id=${encodeURIComponent(shopId)}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to cancel order');
        return;
      }
      toast.success('Order canceled');
      setSelectedOrderId(null);
      setOrderDetail(null);
      fetchOrders(shopId, ordersPage, orderStatusFilter);
    } catch {
      toast.error('Request failed');
    } finally {
      setOrderActionLoading(null);
    }
  }, [selectedShopId, ordersPage, orderStatusFilter, fetchOrders]);

  const validateCheckoutForm = useCallback((form: typeof checkoutForm): Record<string, string> => {
    const err: Record<string, string> = {};
    if (!form.first_name?.trim()) err.first_name = 'First name is required';
    if (!form.last_name?.trim()) err.last_name = 'Last name is required';
    if (!form.email?.trim()) err.email = 'Email is required';
    else if (!EMAIL_REGEX.test(form.email.trim())) err.email = 'Enter a valid email address';
    if (!form.address1?.trim()) err.address1 = 'Address is required';
    if (!form.city?.trim()) err.city = 'City is required';
    if (!form.zip?.trim()) err.zip = 'ZIP / Postal code is required';
    if (!form.country?.trim()) err.country = 'Country is required';
    else if (form.country.trim().length !== 2) err.country = 'Use 2-letter country code (e.g. US)';
    return err;
  }, []);

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      fetchProducts(selectedShopId, page);
    } else if (!loadingShops) {
      setLoading(true);
      setError(null);
      fetch(`/api/printify/products?page=${page}&limit=${PRODUCTS_PAGE_SIZE}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.data) {
            const payload = data.data;
            setProducts(Array.isArray(payload.products) ? payload.products : []);
            setTotal(typeof payload.total === 'number' ? payload.total : 0);
            setError(null);
          } else {
            setProducts([]);
            setTotal(0);
            setError(data?.error ?? 'Failed to load products');
          }
        })
        .catch(() => {
          setError('Failed to load Printify products');
          setProducts([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    } else {
      setProducts([]);
      setTotal(0);
      setLoading(false);
    }
  }, [selectedShopId, page, loadingShops, fetchProducts]);

  useEffect(() => {
    if (activeTab === 'orders' && selectedShopId) {
      fetchOrders(selectedShopId, ordersPage, orderStatusFilter);
    }
  }, [activeTab, selectedShopId, ordersPage, orderStatusFilter, fetchOrders]);

  useEffect(() => {
    if (selectedOrderId) fetchOrderDetail(selectedOrderId);
  }, [selectedOrderId, fetchOrderDetail]);

  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));
  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / ORDERS_PAGE_SIZE));
  const allImages = productForVariants?.images ?? detailProduct?.images ?? [];
  const mainImage = allImages[selectedImageIndex];
  const variantCount = (productForVariants?.variants ?? detailProduct?.variants ?? []).length;

  const openCheckoutPage = useCallback(() => {
    if (resolvedVariant && detailProduct) {
      setCheckoutModalOpen(false);
      setShowCheckoutPage(true);
    }
  }, [resolvedVariant, detailProduct]);

  const closeCheckoutPage = useCallback(() => {
    setShowCheckoutPage(false);
    setCheckoutError(null);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {showCheckoutPage && detailProduct && resolvedVariant ? (
          /* Checkout page */
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={closeCheckoutPage}>
                <ChevronLeftIcon className="h-5 w-5 mr-1" />
                Back to products
              </Button>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Checkout</h1>
            </div>
            <Card className="p-6">
              <h2 className="font-semibold text-[var(--text-primary)] mb-4">Order summary</h2>
              <div className="flex gap-4 mb-4">
                {mainImage?.src && (
                  <img src={mainImage.src} alt="" className="h-24 w-24 object-cover rounded-lg border border-[var(--border-color)]" />
                )}
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{detailProduct.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                  {resolvedVariant.price != null && (
                    <p className="font-semibold text-[var(--text-primary)] mt-1">
                      ${(Number(resolvedVariant.price) >= 100 ? Number(resolvedVariant.price) / 100 : Number(resolvedVariant.price)).toFixed(2)}
                      {resolvedVariant.price >= 100 && <span className="text-sm font-normal text-[var(--text-muted)]"> (excl. shipping)</span>}
                    </p>
                  )}
                </div>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const errs = validateCheckoutForm(checkoutForm);
                  setCheckoutFormErrors(errs);
                  if (Object.keys(errs).length > 0) {
                    toast.warning('Please fix the form errors.');
                    return;
                  }
                  setCheckoutSubmitting(true);
                  setCheckoutError(null);
                  try {
                    const res = await fetch('/api/printify/orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        shop_id: shopIdForDetail || detailProduct.shop_id,
                        external_id: `printify-${Date.now()}`,
                        label: `Printify: ${detailProduct.title}`,
                        line_items: [
                          { product_id: String(detailProduct.id), variant_id: resolvedVariant.id, quantity: 1 },
                        ],
                        shipping_method: Number(checkoutForm.shipping_method),
                        send_shipping_notification: true,
                        address_to: {
                          first_name: checkoutForm.first_name,
                          last_name: checkoutForm.last_name,
                          email: checkoutForm.email,
                          phone: checkoutForm.phone || undefined,
                          address1: checkoutForm.address1,
                          address2: checkoutForm.address2 || undefined,
                          city: checkoutForm.city,
                          region: checkoutForm.region || undefined,
                          zip: checkoutForm.zip,
                          country: checkoutForm.country,
                        },
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setCheckoutError(data?.error ?? 'Order failed');
                      return;
                    }
                    toast.success(`Order created: ${data.data?.order_id ?? data.data?.external_id ?? 'OK'}`);
                    setShowCheckoutPage(false);
                    setCheckoutForm({ first_name: '', last_name: '', email: '', phone: '', address1: '', address2: '', city: '', region: '', zip: '', country: 'US', shipping_method: 1 });
                    setCheckoutFormErrors({});
                    setDetailProduct(null);
                    setFullProduct(null);
                    if (activeTab === 'orders' && selectedShopId) fetchOrders(selectedShopId, 1, orderStatusFilter);
                  } catch (err) {
                    setCheckoutError('Request failed');
                  } finally {
                    setCheckoutSubmitting(false);
                  }
                }}
                className="space-y-6"
              >
                <div>
                  <h3 className="font-medium text-[var(--text-primary)] mb-3">Shipping address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input required placeholder="First name" value={checkoutForm.first_name} onChange={(e) => { setCheckoutForm((f) => ({ ...f, first_name: e.target.value })); setCheckoutFormErrors((e) => ({ ...e, first_name: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.first_name ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                      {checkoutFormErrors.first_name && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.first_name}</p>}
                    </div>
                    <div>
                      <input required placeholder="Last name" value={checkoutForm.last_name} onChange={(e) => { setCheckoutForm((f) => ({ ...f, last_name: e.target.value })); setCheckoutFormErrors((e) => ({ ...e, last_name: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.last_name ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                      {checkoutFormErrors.last_name && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.last_name}</p>}
                    </div>
                  </div>
                  <div className="mt-3">
                    <input required type="email" placeholder="Email" value={checkoutForm.email} onChange={(e) => { setCheckoutForm((f) => ({ ...f, email: e.target.value })); setCheckoutFormErrors((e) => ({ ...e, email: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.email ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                    {checkoutFormErrors.email && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.email}</p>}
                  </div>
                  <div className="mt-3">
                    <PhoneInput value={checkoutForm.phone} onChange={(v) => setCheckoutForm((f) => ({ ...f, phone: v ?? '' }))} placeholder="Phone number" />
                  </div>
                  <div className="mt-3">
                    <input required placeholder="Address line 1" value={checkoutForm.address1} onChange={(e) => { setCheckoutForm((f) => ({ ...f, address1: e.target.value })); setCheckoutFormErrors((e) => ({ ...e, address1: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.address1 ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                    {checkoutFormErrors.address1 && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.address1}</p>}
                  </div>
                  <input placeholder="Address line 2" value={checkoutForm.address2} onChange={(e) => setCheckoutForm((f) => ({ ...f, address2: e.target.value }))} className="w-full mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div>
                      <input required placeholder="City" value={checkoutForm.city} onChange={(e) => { setCheckoutForm((f) => ({ ...f, city: e.target.value })); setCheckoutFormErrors((e) => ({ ...e, city: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.city ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                      {checkoutFormErrors.city && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.city}</p>}
                    </div>
                    <input placeholder="State / Region" value={checkoutForm.region} onChange={(e) => setCheckoutForm((f) => ({ ...f, region: e.target.value }))} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]" />
                    <div>
                      <input required placeholder="ZIP" value={checkoutForm.zip} onChange={(e) => { setCheckoutForm((f) => ({ ...f, zip: e.target.value })); setCheckoutFormErrors((e) => ({ ...e, zip: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.zip ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                      {checkoutFormErrors.zip && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.zip}</p>}
                    </div>
                  </div>
                  <div className="mt-3">
                    <input required placeholder="Country (2-letter, e.g. US)" value={checkoutForm.country} onChange={(e) => { setCheckoutForm((f) => ({ ...f, country: e.target.value.toUpperCase().slice(0, 2) })); setCheckoutFormErrors((e) => ({ ...e, country: '' })); }} className={`w-full max-w-[8rem] rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.country ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                    {checkoutFormErrors.country && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.country}</p>}
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-[var(--text-primary)] mb-2">Shipping method</label>
                  <select value={checkoutForm.shipping_method} onChange={(e) => setCheckoutForm((f) => ({ ...f, shipping_method: Number(e.target.value) }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]">
                    <option value={1}>Standard</option>
                    <option value={2}>Priority</option>
                    <option value={3}>Printify Express</option>
                    <option value={4}>Economy</option>
                  </select>
                </div>
                {checkoutError && <p className="text-sm text-red-600 dark:text-red-400">{checkoutError}</p>}
                <div className="pt-4 border-t border-[var(--border-color)]">
                  <h3 className="font-medium text-[var(--text-primary)] mb-2">Payment & place order</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    This order will be sent to Printify for fulfillment. Charges apply to your Printify account.
                  </p>
                  <div className="flex gap-3">
                    <Button type="submit" variant="primary" disabled={checkoutSubmitting}>
                      {checkoutSubmitting ? 'Placing order…' : 'Place order'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={closeCheckoutPage}>Cancel</Button>
                  </div>
                </div>
              </form>
            </Card>
          </div>
        ) : (
          <>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ArchiveBoxIcon className="h-8 w-8" />
              Printify Stock
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {activeTab === 'products' ? 'Products created in your Printify dashboard' : 'Orders placed via this admin panel'}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              fetchShops();
              if (selectedShopId) {
                if (activeTab === 'products') fetchProducts(selectedShopId, page);
                else fetchOrders(selectedShopId, ordersPage, orderStatusFilter);
              }
            }}
            disabled={loading || loadingShops || ordersLoading}
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex gap-2 border-b border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'products' ? 'bg-[var(--primary-500)] text-white border-b-2 border-[var(--primary-500)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-muted)] border-b-2 border-transparent'}`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'orders' ? 'bg-[var(--primary-500)] text-white border-b-2 border-[var(--primary-500)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-muted)] border-b-2 border-transparent'}`}
          >
            <DocumentTextIcon className="h-5 w-5 inline-block mr-1.5 align-middle" />
            My orders
          </button>
        </div>

        {error && (
          <Card className="p-4 border border-amber-500/50 bg-amber-500/10">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Ensure PRINTIFY_API_TOKEN (or PRINTIFY_API_KEY) and PRINTIFY_SHOP_ID are set in .env.local.
            </p>
          </Card>
        )}

        {!loadingShops && shops.length > 0 && (
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Shop</label>
                <select
                  value={selectedShopId}
                  onChange={(e) => { setSelectedShopId(e.target.value); setPage(1); }}
                  className="min-w-[200px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.title} (ID: {s.id})
                    </option>
                  ))}
                </select>
              </div>
              {activeTab === 'orders' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Status</label>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => { setOrderStatusFilter(e.target.value); setOrdersPage(1); }}
                    className="min-w-[140px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                  >
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="on-hold">On hold</option>
                    <option value="in-production">In production</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              )}
            </div>
          </Card>
        )}

        {!loadingShops && shops.length === 0 && !error && (
          <Card className="p-6 text-center text-[var(--text-muted)]">
            No Printify shops found. Set PRINTIFY_SHOP_ID or create a shop in Printify.
          </Card>
        )}

        {activeTab === 'products' && selectedShopId && (
          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-[var(--text-muted)]">Loading products…</div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)]">
                No products in this shop yet.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] bg-[var(--bg-muted)]">
                        <th className="p-3 font-medium text-[var(--text-muted)]">Image</th>
                        <th className="p-3 font-medium text-[var(--text-muted)]">Product</th>
                        <th className="p-3 font-medium text-[var(--text-muted)]">ID</th>
                        <th className="p-3 font-medium text-[var(--text-muted)]">Variants</th>
                        <th className="p-3 font-medium text-[var(--text-muted)]">Status</th>
                        <th className="p-3 font-medium text-[var(--text-muted)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => {
                        const img = p.images?.[0];
                        return (
                          <tr
                            key={String(p.id)}
                            className="border-b border-[var(--border-color)] hover:bg-[var(--bg-muted)]/50 cursor-pointer"
                            onClick={() => openProductDetail(p)}
                          >
                            <td className="p-3">
                              <button
                                type="button"
                                className="focus:outline-none focus:ring-2 focus:ring-[var(--primary)] rounded"
                                onClick={() => openProductDetail(p)}
                                aria-label="View product"
                              >
                                {img?.src ? (
                                  <img
                                    src={img.src}
                                    alt=""
                                    className="h-14 w-14 object-cover rounded border border-[var(--border-color)]"
                                    width={56}
                                    height={56}
                                  />
                                ) : (
                                  <div className="h-14 w-14 rounded border border-[var(--border-color)] bg-[var(--bg-muted)] flex items-center justify-center">
                                    <PhotoIcon className="h-6 w-6 text-[var(--text-muted)]" />
                                  </div>
                                )}
                              </button>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-[var(--text-primary)]">{p.title || '—'}</div>
                              {p.description && (
                                <div className="text-sm text-[var(--text-muted)] line-clamp-2 max-w-md" title={stripHtml(p.description)}>
                                  {stripHtml(p.description).slice(0, 120)}…
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-[var(--text-muted)] font-mono text-sm">{p.id}</td>
                            <td className="p-3">
                              <Badge variant="secondary">
                                {Array.isArray(p.variants) ? p.variants.length : 0} variants
                              </Badge>
                            </td>
                            <td className="p-3">
                              {p.is_locked ? (
                                <Badge variant="secondary">Locked</Badge>
                              ) : (
                                <Badge variant="success">Active</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); openProductDetail(p); }}
                              >
                                <PhotoIcon className="h-4 w-4 mr-1.5" />
                                Preview
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-4 p-3 border-t border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-muted)]">
                      Page {page} of {totalPages} · {total} total
                    </p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                        <ChevronLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {activeTab === 'orders' && selectedShopId && (
          <Card className="overflow-hidden max-w-full">
            {ordersLoading ? (
              <div className="p-12 text-center text-[var(--text-muted)]">Loading orders…</div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)]">No orders in this shop.</div>
            ) : (
              <>
                {/* Mobile / narrow: stacked cards — no horizontal scroll */}
                <div className="md:hidden space-y-3 p-3">
                  {orders.map((ord) => {
                    const addr = ord.address_to ?? {};
                    const customer = [addr.first_name, addr.last_name].filter(Boolean).join(' ') || '—';
                    const totalCents = ord.total_price ?? 0;
                    const totalFormatted = totalCents >= 100 ? `$${(totalCents / 100).toFixed(2)}` : `$${Number(totalCents).toFixed(2)}`;
                    const sentAt = ord.sent_to_production_at ?? null;
                    const tracking = ord.shipments?.[0];
                    const status = ord.status ?? '—';
                    const { firstLine, secondLine } = getOrderRowDisplay(ord);
                    return (
                      <div
                        key={ord.id}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-[var(--text-primary)] break-all">{firstLine}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1 break-words line-clamp-4">{secondLine}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-[var(--text-muted)] block text-xs">Customer</span>
                            <span className="text-[var(--text-primary)] break-words">{customer}</span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block text-xs">Total</span>
                            <span className="text-[var(--text-primary)]">{totalFormatted}</span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block text-xs">Sent to prod.</span>
                            <span className="text-[var(--text-muted)]">{sentAt ? new Date(sentAt).toLocaleDateString() : 'Pending'}</span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block text-xs">Tracking</span>
                            {tracking?.url ? (
                              <a href={tracking.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary-500)] hover:underline break-all text-sm">
                                {tracking.number ?? 'Track'}
                              </a>
                            ) : (
                              <span className="text-[var(--text-muted)]">Pending</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant={orderStatusBadgeVariant(status)} size="sm">{status}</Badge>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              title="View order"
                              onClick={() => setSelectedOrderId(ord.id)}
                              className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/80"
                              aria-label="View order"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            {status === 'on-hold' && (
                              <button
                                type="button"
                                title="Submit to production"
                                disabled={orderActionLoading === ord.id}
                                onClick={() => sendOrderToProduction(ord.id)}
                                className="p-2 rounded-lg border border-[var(--primary-500)] bg-[var(--primary-500)] text-white disabled:opacity-50"
                                aria-label="Submit to production"
                              >
                                <PlayIcon className="h-4 w-4" />
                              </button>
                            )}
                            {status !== 'fulfilled' && status !== 'canceled' && (
                              <button
                                type="button"
                                title="Cancel order"
                                disabled={orderActionLoading === ord.id}
                                onClick={() => cancelOrderAction(ord.id)}
                                className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] disabled:opacity-50"
                                aria-label="Cancel order"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* md+: table with wrapped order column — avoid wide single-line cells */}
                <div className="hidden md:block w-full overflow-hidden">
                  <table className="w-full text-left table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[min(28%,20rem)]" />
                      <col className="w-[10%]" />
                      <col className="w-[14%]" />
                      <col className="w-[9%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[15%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[var(--border-color)] bg-[var(--bg-muted)]">
                        <th className="p-3 font-medium text-[var(--text-muted)] align-bottom">Order</th>
                        <th className="p-3 font-medium text-[var(--text-muted)] align-bottom">Sent to prod.</th>
                        <th className="p-3 font-medium text-[var(--text-muted)] align-bottom">Customer</th>
                        <th className="p-3 font-medium text-[var(--text-muted)] align-bottom">Total</th>
                        <th className="p-3 font-medium text-[var(--text-muted)] align-bottom">Tracking</th>
                        <th className="p-3 font-medium text-[var(--text-muted)] align-bottom">Status</th>
                        <th className="p-3 font-medium text-[var(--text-muted)] align-bottom text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((ord) => {
                        const addr = ord.address_to ?? {};
                        const customer = [addr.first_name, addr.last_name].filter(Boolean).join(' ') || '—';
                        const totalCents = ord.total_price ?? 0;
                        const totalFormatted = totalCents >= 100 ? `$${(totalCents / 100).toFixed(2)}` : `$${Number(totalCents).toFixed(2)}`;
                        const sentAt = ord.sent_to_production_at ?? null;
                        const tracking = ord.shipments?.[0];
                        const status = ord.status ?? '—';
                        const { firstLine, secondLine } = getOrderRowDisplay(ord);
                        return (
                          <tr key={ord.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-muted)]/50 align-top">
                            <td className="p-3 min-w-0 max-w-0">
                              <span className="font-mono text-sm font-medium text-[var(--text-primary)] block break-all">{firstLine}</span>
                              <span className="text-xs text-[var(--text-muted)] block mt-1 break-words hyphens-auto max-h-20 overflow-y-auto leading-snug">{secondLine}</span>
                            </td>
                            <td className="p-3 text-[var(--text-muted)] text-sm whitespace-nowrap align-top">{sentAt ? new Date(sentAt).toLocaleDateString() : 'Pending'}</td>
                            <td className="p-3 text-[var(--text-primary)] text-sm break-words min-w-0 align-top" title={customer}>{customer}</td>
                            <td className="p-3 text-[var(--text-primary)] text-sm whitespace-nowrap align-top">{totalFormatted}</td>
                            <td className="p-3 min-w-0 align-top">
                              {tracking?.url ? (
                                <a href={tracking.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary-500)] hover:underline text-sm break-all line-clamp-2" title={tracking.number ?? 'Track'}>{tracking.number ?? 'Track'}</a>
                              ) : (
                                <span className="text-[var(--text-muted)] text-sm">Pending</span>
                              )}
                            </td>
                            <td className="p-3 align-top">
                              <Badge variant={orderStatusBadgeVariant(status)} size="sm" className="max-w-full truncate">{status}</Badge>
                            </td>
                            <td className="p-3 align-top text-right">
                              <div className="inline-flex items-center gap-1 flex-nowrap justify-end">
                                <button type="button" title="View order" onClick={(e) => { e.stopPropagation(); setSelectedOrderId(ord.id); }} className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] shrink-0" aria-label="View order"><EyeIcon className="h-4 w-4" /></button>
                                {status === 'on-hold' && (
                                  <button type="button" title="Submit to production" disabled={orderActionLoading === ord.id} onClick={(e) => { e.stopPropagation(); sendOrderToProduction(ord.id); }} className="p-2 rounded-lg border border-[var(--primary-500)] bg-[var(--primary-500)] text-white hover:opacity-90 disabled:opacity-50 shrink-0" aria-label="Submit to production"><PlayIcon className="h-4 w-4" /></button>
                                )}
                                {status !== 'fulfilled' && status !== 'canceled' && (
                                  <button type="button" title="Cancel order" disabled={orderActionLoading === ord.id} onClick={(e) => { e.stopPropagation(); cancelOrderAction(ord.id); }} className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-50 shrink-0" aria-label="Cancel order"><XCircleIcon className="h-4 w-4" /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {ordersTotalPages > 1 && (
                  <div className="flex justify-between gap-4 p-3 border-t border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-muted)]">Page {ordersPage} of {ordersTotalPages} · {ordersTotal} total</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setOrdersPage((p) => Math.max(1, p - 1))} disabled={ordersPage <= 1}>Previous</Button>
                      <Button size="sm" variant="secondary" onClick={() => setOrdersPage((p) => Math.min(ordersTotalPages, p + 1))} disabled={ordersPage >= ordersTotalPages}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </>
        )}
      </div>

      {/* Product detail modal – hidden when checkout page is shown */}
      {detailProduct && !showCheckoutPage && (
        <Modal
          isOpen={true}
          onClose={closeProductDetail}
          title={detailProduct.title ?? 'Product details'}
          size="full"
        >
          {detailProductLoading && (
            <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">Loading product details for preview…</div>
          )}
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto flex-1 min-h-0 pr-2">
              {/* Left: main image + gallery – sticky so it stays visible while right side scrolls */}
              <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-0 lg:self-start">
                {resolvedVariant && (
                  <p className="text-sm font-medium text-[var(--primary-500)]">Preview — selected variant</p>
                )}
                <div className="aspect-square max-h-[400px] w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] overflow-hidden flex items-center justify-center">
                  {mainImage?.src ? (
                    <img
                      src={mainImage.src}
                      alt={mainImage.position ?? `View ${selectedImageIndex + 1}`}
                      className="max-h-full w-full object-contain"
                    />
                  ) : (
                    <PhotoIcon className="h-24 w-24 text-[var(--text-muted)]" />
                  )}
                </div>
                {allImages.length > 1 && (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-muted)] disabled:opacity-50"
                        onClick={() => setSelectedImageIndex((i) => Math.max(0, i - 1))}
                        disabled={selectedImageIndex === 0}
                        aria-label="Previous image"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <span className="text-sm text-[var(--text-muted)]">
                        {selectedImageIndex + 1} / {allImages.length}
                      </span>
                      <button
                        type="button"
                        className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-muted)] disabled:opacity-50"
                        onClick={() => setSelectedImageIndex((i) => Math.min(allImages.length - 1, i + 1))}
                        disabled={selectedImageIndex === allImages.length - 1}
                        aria-label="Next image"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-muted)] mb-2">View</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {allImages.map((img, idx) => (
                          <button
                            key={img.mockup_id ?? img.id ?? idx}
                            type="button"
                            className={`rounded-lg border-2 overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] ${
                              selectedImageIndex === idx ? 'border-[var(--primary-500)]' : 'border-[var(--border-color)]'
                            }`}
                            onClick={() => setSelectedImageIndex(idx)}
                          >
                            <img src={img.src} alt={img.position ?? `View ${idx + 1}`} className="h-16 w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right: e-commerce style – options & checkout first, then description & metadata */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={openVariantsModal}>
                    <Squares2X2Icon className="h-5 w-5 mr-2" />
                    View all variants ({variantCount})
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditTitle(detailProduct.title ?? '');
                      setEditDescription(detailProduct.description ?? '');
                      setEditError(null);
                      setEditModalOpen(true);
                    }}
                  >
                    <PencilSquareIcon className="h-5 w-5 mr-2" />
                    Edit product
                  </Button>
                </div>

                {/* 1) Options (color/size) – at top so user can select without scrolling */}
                {Array.isArray(detailProduct.options) && detailProduct.options.length > 0 && (
                  <Card className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">Choose options</h4>
                    <p className="text-sm text-[var(--text-muted)] mb-3">Select color and size. Preview updates in real time.</p>
                    <OptionsSection
                      options={detailProduct.options}
                      selectedOptions={selectedOptions}
                      onSelectOption={handleSelectOption}
                    />
                  </Card>
                )}

                {/* 2) Checkout CTA – immediately below options when variant is selected */}
                {resolvedVariant ? (
                  <div ref={checkoutSectionRef}>
                    <Card className="p-4 border-2 border-[var(--primary-500)]/30 bg-[var(--primary-500)]/5">
                      <h4 className="font-semibold text-[var(--text-primary)] mb-1">Ready to order</h4>
                      <p className="text-sm text-[var(--text-muted)] mb-2">
                        {Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                      {resolvedVariant.price != null && (
                        <p className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                          ${(Number(resolvedVariant.price) >= 100 ? Number(resolvedVariant.price) / 100 : Number(resolvedVariant.price)).toFixed(2)}
                          {resolvedVariant.price >= 100 && <span className="text-sm font-normal text-[var(--text-muted)]"> (excl. shipping)</span>}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="primary" onClick={() => { setCheckoutError(null); openCheckoutPage(); }}>
                          <ShoppingCartIcon className="h-5 w-5 mr-2" />
                          Go to checkout page
                        </Button>
                        <Button variant="secondary" onClick={() => { setCheckoutError(null); setCheckoutModalOpen(true); }}>
                          Quick checkout (modal)
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            router.push(
                              `/dashboard/orders?fromPrintify=1&productId=${encodeURIComponent(String(detailProduct.id))}&variantId=${resolvedVariant.id}&shopId=${shopIdForDetail}&title=${encodeURIComponent(detailProduct.title ?? '')}`
                            );
                            closeProductDetail();
                          }}
                        >
                          Go to Orders
                        </Button>
                        <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(String(resolvedVariant.id)); toast.success('Variant ID copied'); }}>
                          Copy variant ID
                        </Button>
                      </div>
                    </Card>
                  </div>
                ) : Array.isArray(detailProduct.options) && detailProduct.options.length > 0 && (
                  <Card className="p-4 border border-amber-500/30 bg-amber-500/5">
                    <p className="text-sm text-[var(--text-muted)]">
                      Select color and size above to enable checkout.
                    </p>
                  </Card>
                )}

                {/* 3) Description */}
                {detailProduct.description && (
                  <Card className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3">Description</h4>
                    <div className="text-[var(--text-primary)] text-sm">
                      <HtmlBlock html={detailProduct.description.replace(/<br\s*\/?>/gi, '<br/>')} />
                    </div>
                  </Card>
                )}

                {/* 4) Core metadata */}
                <Card className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <h4 className="font-semibold text-[var(--text-primary)] mb-3">Details</h4>
                  <div className="space-y-0">
                    <DetailRow label="Product ID" value={String(detailProduct.id)} />
                    <DetailRow label="Title" value={detailProduct.title} />
                    <DetailRow label="Blueprint ID" value={detailProduct.blueprint_id} />
                    <DetailRow label="Print provider ID" value={detailProduct.print_provider_id} />
                    <DetailRow label="Shop ID" value={detailProduct.shop_id} />
                    <DetailRow label="User ID" value={detailProduct.user_id} />
                    <DetailRow label="Created" value={detailProduct.created_at} />
                    <DetailRow label="Updated" value={detailProduct.updated_at} />
                    <DetailRow label="Visible" value={detailProduct.visible != null ? String(detailProduct.visible) : undefined} />
                    <DetailRow label="Locked" value={detailProduct.is_locked != null ? String(detailProduct.is_locked) : undefined} />
                    <DetailRow label="Deleted" value={detailProduct.is_deleted != null ? String(detailProduct.is_deleted) : undefined} />
                    <DetailRow label="Original product ID" value={detailProduct.original_product_id || undefined} />
                  </div>
                </Card>

                {detailProduct.safety_information && (
                  <Card className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3">Safety information</h4>
                    <div className="text-[var(--text-primary)] text-sm">
                      <HtmlBlock html={detailProduct.safety_information} />
                    </div>
                  </Card>
                )}

                {Array.isArray(detailProduct.tags) && detailProduct.tags.length > 0 && (
                  <Card className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {detailProduct.tags.map((t, i) => (
                        <Badge key={i} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <h4 className="font-semibold text-[var(--text-primary)] mb-3">Shipping & express</h4>
                  <div className="space-y-0">
                    <DetailRow label="Printify Express eligible" value={detailProduct.is_printify_express_eligible != null ? String(detailProduct.is_printify_express_eligible) : undefined} />
                    <DetailRow label="Printify Express enabled" value={detailProduct.is_printify_express_enabled != null ? String(detailProduct.is_printify_express_enabled) : undefined} />
                    <DetailRow label="Economy shipping eligible" value={detailProduct.is_economy_shipping_eligible != null ? String(detailProduct.is_economy_shipping_eligible) : undefined} />
                    <DetailRow label="Economy shipping enabled" value={detailProduct.is_economy_shipping_enabled != null ? String(detailProduct.is_economy_shipping_enabled) : undefined} />
                  </div>
                </Card>

                {Array.isArray(detailProduct.print_areas) && detailProduct.print_areas.length > 0 && (
                  <PrintAreasSection printAreas={detailProduct.print_areas} />
                )}
                {Array.isArray(detailProduct.views) && detailProduct.views.length > 0 && (
                  <ViewsSection views={detailProduct.views} />
                )}
                {(Array.isArray(detailProduct.print_details) && detailProduct.print_details.length > 0) || (Array.isArray(detailProduct.sales_channel_properties) && detailProduct.sales_channel_properties.length > 0) ? (
                  <Card className="p-4">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3">Other</h4>
                    <div className="space-y-0">
                      <DetailRow label="Print details" value={Array.isArray(detailProduct.print_details) && detailProduct.print_details.length > 0 ? JSON.stringify(detailProduct.print_details) : undefined} />
                      <DetailRow label="Sales channel properties" value={Array.isArray(detailProduct.sales_channel_properties) && detailProduct.sales_channel_properties.length > 0 ? JSON.stringify(detailProduct.sales_channel_properties) : undefined} />
                    </div>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Order detail modal – Printify-style layout */}
      <Modal
        isOpen={!!selectedOrderId}
        onClose={() => { setSelectedOrderId(null); setOrderDetail(null); setOrderDetailError(null); setOrderDetailEditCustomer(false); }}
        title={orderDetail ? `#${orderDetail.label ?? orderDetail.external_id ?? orderDetail.id}` : 'Order details'}
        size="xl"
      >
        {orderDetailLoading && !orderDetail && !orderDetailError && (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading order…</div>
        )}
        {!orderDetailLoading && selectedOrderId && !orderDetail && orderDetailError && (
          <div className="p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-amber-500 mb-3" />
            <p className="text-[var(--text-primary)] font-medium mb-1">Could not load order</p>
            <p className="text-sm text-[var(--text-muted)] mb-4">{orderDetailError}</p>
            <Button variant="secondary" onClick={() => fetchOrderDetail(selectedOrderId)}>Try again</Button>
          </div>
        )}
        {orderDetail && (
          <>
            {(() => {
              const st = orderDetail.status ?? '—';
              const help = ORDER_STATUS_HELP[st] ?? 'Current order state from Printify.';
              return (
                <div className="mb-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)]/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Status</p>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant={orderStatusBadgeVariant(st)}>{st}</Badge>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">{help}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {orderDetail.status !== 'fulfilled' && orderDetail.status !== 'canceled' && (
                        <Button size="sm" variant="secondary" disabled={!!orderActionLoading} onClick={() => cancelOrderAction(orderDetail.id)}>
                          <XCircleIcon className="h-4 w-4 mr-1" /> Cancel order
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => setOrderDetailEditCustomer((v) => !v)}>
                        <PencilSquareIcon className="h-4 w-4 mr-1" /> Edit order
                      </Button>
                      {orderDetail.status === 'on-hold' && (
                        <Button size="sm" variant="primary" disabled={!!orderActionLoading} onClick={() => sendOrderToProduction(orderDetail.id)}>
                          Submit to production
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border-color)]">
                    Created {orderDetail.created_at ? new Date(orderDetail.created_at).toLocaleString() : '—'}
                  </p>
                </div>
              );
            })()}

            <div className="mb-4 rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-card)] text-sm space-y-1">
              <p className="font-medium text-[var(--text-primary)] mb-2">Order identifiers</p>
              <p className="text-[var(--text-muted)] break-all">
                <span className="text-[var(--text-muted)] font-medium">Printify ID:</span>{' '}
                <span className="text-[var(--text-primary)] font-mono">{orderDetail.id}</span>
              </p>
              {orderDetail.external_id != null && String(orderDetail.external_id) !== String(orderDetail.id) && (
                <p className="text-[var(--text-muted)] break-all">
                  <span className="font-medium">External / reference:</span>{' '}
                  <span className="text-[var(--text-primary)]">{String(orderDetail.external_id)}</span>
                </p>
              )}
              {orderDetail.label != null && String(orderDetail.label).trim() !== '' && (
                <p className="text-[var(--text-muted)] break-all">
                  <span className="font-medium">Label:</span>{' '}
                  <span className="text-[var(--text-primary)]">{String(orderDetail.label)}</span>
                </p>
              )}
              {orderDetail.metadata && typeof orderDetail.metadata === 'object' && Object.keys(orderDetail.metadata as object).length > 0 && (
                <p className="text-[var(--text-muted)] break-words">
                  <span className="font-medium">Metadata:</span>{' '}
                  <span className="text-[var(--text-primary)] text-xs">{JSON.stringify(orderDetail.metadata)}</span>
                </p>
              )}
              {orderDetail.shipping_method != null && (
                <p className="text-[var(--text-muted)]">
                  <span className="font-medium">Shipping method:</span>{' '}
                  {SHIPPING_METHOD_LABELS[Number(orderDetail.shipping_method)] ?? `Option ${orderDetail.shipping_method}`}
                </p>
              )}
              {orderDetail.total_tax != null && Number(orderDetail.total_tax) > 0 && (
                <p className="text-[var(--text-muted)]">
                  <span className="font-medium">Tax (raw):</span>{' '}
                  {Number(orderDetail.total_tax) >= 100
                    ? `$${(Number(orderDetail.total_tax) / 100).toFixed(2)}`
                    : `$${Number(orderDetail.total_tax).toFixed(2)}`}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Product + Timeline + Tracking */}
              <div className="lg:col-span-2 space-y-4">
                {orderDetail.line_items && orderDetail.line_items.length > 0 && (
                  <div className="rounded-lg border border-[var(--border-color)] p-4 bg-[var(--bg-card)]">
                    <h4 className="font-medium text-[var(--text-primary)] mb-3">Product</h4>
                    <ul className="space-y-3">
                      {orderDetail.line_items.map((item, idx) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          {item.preview_image?.src ? (
                            <img src={item.preview_image.src} alt="" className="w-16 h-16 object-cover rounded border border-[var(--border-color)]" />
                          ) : (
                            <div className="w-16 h-16 rounded border border-[var(--border-color)] bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)]">
                              <PhotoIcon className="h-8 w-8" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--text-primary)]">{item.metadata?.title ?? 'Product'}</p>
                            <p className="text-[var(--text-muted)]">
                              {item.metadata?.sku ? `SKU ${item.metadata.sku}` : ''}
                              {item.metadata?.variant_label ? ` – ${item.metadata.variant_label}` : ''}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-[var(--text-muted)] text-sm">Qty {item.quantity ?? 1}</p>
                              {item.status && (
                                <Badge variant={orderStatusBadgeVariant(String(item.status))} size="sm">
                                  Item: {item.status}
                                </Badge>
                              )}
                              {item.product_id != null && (
                                <span className="text-xs text-[var(--text-muted)] font-mono">Product {item.product_id}</span>
                              )}
                              {item.variant_id != null && (
                                <span className="text-xs text-[var(--text-muted)] font-mono">Variant {item.variant_id}</span>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="rounded-lg border border-[var(--border-color)] p-4 bg-[var(--bg-card)]">
                  <h4 className="font-medium text-[var(--text-primary)] mb-3">Timeline & costs</h4>
                  <ul className="text-sm text-[var(--text-muted)] space-y-2 mb-3">
                    <li>
                      <span className="font-medium text-[var(--text-primary)]">Created:</span>{' '}
                      {orderDetail.created_at ? new Date(orderDetail.created_at).toLocaleString() : '—'}
                    </li>
                    <li>
                      <span className="font-medium text-[var(--text-primary)]">Sent to production:</span>{' '}
                      {orderDetail.sent_to_production_at ? new Date(orderDetail.sent_to_production_at).toLocaleString() : 'Not yet'}
                    </li>
                    <li>
                      <span className="font-medium text-[var(--text-primary)]">Fulfilled:</span>{' '}
                      {orderDetail.fulfilled_at ? new Date(orderDetail.fulfilled_at).toLocaleString() : '—'}
                    </li>
                  </ul>
                  <p className="text-sm text-[var(--text-primary)]">
                    Production cost: USD {((orderDetail.total_price ?? 0) >= 100 ? (orderDetail.total_price! / 100) : orderDetail.total_price ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border-color)] p-4 bg-[var(--bg-card)]">
                  <h4 className="font-medium text-[var(--text-primary)] mb-2">Tracking</h4>
                  {orderDetail.shipments && orderDetail.shipments.length > 0 ? (
                    <ul className="space-y-2">
                      {orderDetail.shipments.map((s, i) => (
                        <li key={i}>
                          {s.url ? (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                              {s.carrier}: {s.number}
                            </a>
                          ) : (
                            <span className="text-[var(--text-muted)]">{s.carrier ?? 'Carrier'}: {s.number ?? 'Pending'}</span>
                          )}
                          {s.delivered_at && <span className="text-[var(--text-muted)] ml-2">· Delivered {new Date(s.delivered_at).toLocaleDateString()}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">Pending</p>
                  )}
                </div>
              </div>
              {/* Right: Customer + Billing */}
              <div className="space-y-4">
                {orderDetail.address_to && (
                  <div className="rounded-lg border border-[var(--border-color)] p-4 bg-[var(--bg-card)]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-[var(--text-primary)]">Customer</h4>
                      <button type="button" className="text-sm text-[var(--primary)] hover:underline" onClick={() => setOrderDetailEditCustomer((v) => !v)}>Edit</button>
                    </div>
                    {!orderDetailEditCustomer ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        {[orderDetail.address_to.first_name, orderDetail.address_to.last_name].filter(Boolean).join(' ')}<br />
                        {orderDetail.address_to.email}<br />
                        {orderDetail.address_to.phone}<br />
                        {[orderDetail.address_to.address1, orderDetail.address_to.address2].filter(Boolean).join(', ')}<br />
                        {[orderDetail.address_to.city, orderDetail.address_to.region, orderDetail.address_to.zip, orderDetail.address_to.country].filter(Boolean).join(', ')}
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--text-muted)]">Order edits (e.g. address) are not supported via Printify API from this panel. Update the order in Printify dashboard if needed.</p>
                    )}
                  </div>
                )}
                <div className="rounded-lg border border-[var(--border-color)] p-4 bg-[var(--bg-card)]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-[var(--text-primary)]">Billing</h4>
                    <button type="button" className="text-sm text-[var(--primary)] hover:underline" onClick={() => toast.info('Invoice download can be added when Printify provides an invoice API.')}>Download</button>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="flex justify-between text-[var(--text-muted)]"><span>Production cost</span> USD {((orderDetail.total_price ?? 0) >= 100 ? (orderDetail.total_price! / 100) : orderDetail.total_price ?? 0).toFixed(2)}</p>
                    <p className="flex justify-between text-[var(--text-muted)]"><span>Shipping</span> USD {((orderDetail.total_shipping ?? 0) >= 100 ? (orderDetail.total_shipping! / 100) : orderDetail.total_shipping ?? 0).toFixed(2)}</p>
                    <p className="flex justify-between font-medium text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
                      <span>Total</span> USD {(((orderDetail.total_price ?? 0) + (orderDetail.total_shipping ?? 0)) >= 100 ? ((orderDetail.total_price ?? 0) + (orderDetail.total_shipping ?? 0)) / 100 : (orderDetail.total_price ?? 0) + (orderDetail.total_shipping ?? 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-end">
              <Button variant="secondary" onClick={() => { setSelectedOrderId(null); setOrderDetail(null); setOrderDetailError(null); setOrderDetailEditCustomer(false); }}>Close</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Variants modal – data from same product object, with search */}
      <Modal
        isOpen={variantsModalOpen}
        onClose={() => { setVariantsModalOpen(false); setVariantSearch(''); }}
        title={`Variants — ${variantsProductTitle}`}
        subtitle={productForVariants ? `${filteredVariants.length} of ${(productForVariants.variants ?? []).length} variant(s)` : undefined}
        size="full"
      >
        {variantsList.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-sm text-[var(--text-muted)]">
                Each row is a sellable variant (e.g. size + color). Use search to filter by title, SKU, option value, or variant ID.
              </p>
              <div className="relative flex-shrink-0">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type="search"
                  placeholder="Search variants…"
                  value={variantSearch}
                  onChange={(e) => setVariantSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  aria-label="Search variants"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-muted)]">
                    <th className="p-3 font-medium text-[var(--text-muted)]" title="Unique Printify variant identifier">Variant ID</th>
                    <th className="p-3 font-medium text-[var(--text-muted)]" title="Display name for this variant">Title</th>
                    <th className="p-3 font-medium text-[var(--text-muted)]" title="e.g. Color, Size">Options</th>
                    <th className="p-3 font-medium text-[var(--text-muted)]" title="Retail price in cents (if provided)">Price</th>
                    <th className="p-3 font-medium text-[var(--text-muted)]" title="Stock keeping unit">SKU</th>
                    <th className="p-3 font-medium text-[var(--text-muted)]" title="Whether this variant is in stock">In stock</th>
                    <th className="p-3 font-medium text-[var(--text-muted)]" title="Whether this variant can be ordered">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-[var(--text-muted)]">
                        No variants match &quot;{variantSearch}&quot;. Try a different search.
                      </td>
                    </tr>
                  ) : (
                    filteredVariants.map((v, idx) => (
                      <tr key={v.id ?? idx} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-muted)]/50">
                        <td className="p-3 font-mono text-sm text-[var(--text-muted)]" title="Use this ID when submitting orders to Printify">{v.id}</td>
                        <td className="p-3 text-[var(--text-primary)]">{v.title ?? '—'}</td>
                        <td className="p-3">
                          {v.options && Object.keys(v.options).length > 0 ? (
                            <ul className="list-none space-y-0.5">
                              {Object.entries(v.options).map(([k, val]) => (
                                <li key={k} className="text-sm"><span className="text-[var(--text-muted)] capitalize">{k}:</span> {val}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="p-3" title="Price (format depends on API: may be in cents or dollars)">{v.price != null ? `$${Number(v.price).toFixed(2)}` : '—'}</td>
                        <td className="p-3 font-mono text-sm">{v.sku ?? '—'}</td>
                        <td className="p-3">
                          {v.in_stock != null ? (v.in_stock ? <span className="text-green-600 dark:text-green-400">Yes</span> : <span className="text-[var(--text-muted)]">No</span>) : '—'}
                        </td>
                        <td className="p-3">
                          {v.is_available != null ? (v.is_available ? <span className="text-green-600 dark:text-green-400">Yes</span> : <span className="text-[var(--text-muted)]">No</span>) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-[var(--text-muted)]">No variants for this product.</p>
        )}
      </Modal>

      {/* Edit product modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditError(null); }}
        title="Edit product"
        subtitle={detailProduct ? String(detailProduct.id) : undefined}
        size="lg"
      >
        {detailProduct && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setEditSaving(true);
              setEditError(null);
              try {
                const editShopId = String(detailProduct.shop_id ?? selectedShopId ?? '').trim();
                if (!editShopId) {
                  setEditError('Shop ID is missing; select a shop and try again.');
                  return;
                }
                const res = await fetch(
                  `/api/printify/products/${encodeURIComponent(String(detailProduct.id))}?shop_id=${encodeURIComponent(editShopId)}`,
                  {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: editTitle || undefined, description: editDescription || undefined }),
                  }
                );
                const data = await res.json();
                if (!res.ok) {
                  setEditError(data?.error ?? 'Update failed');
                  return;
                }
                const updated = data?.data;
                if (updated && typeof updated === 'object') {
                  setDetailProduct((prev) => (prev ? { ...prev, ...(updated as object) } : null));
                  setFullProduct((prev) =>
                    prev && String(prev.id) === String(detailProduct.id) ? { ...prev, ...(updated as object) } : prev
                  );
                  setProducts((list) =>
                    list.map((p) => (String(p.id) === String(detailProduct.id) ? { ...p, ...(updated as object) } : p))
                  );
                } else {
                  setDetailProduct((prev) => (prev ? { ...prev, title: editTitle, description: editDescription } : null));
                }
                toast.success('Product updated');
                setEditModalOpen(false);
              } catch (err) {
                setEditError('Request failed');
              } finally {
                setEditSaving(false);
              }
            }}
            className="space-y-4"
          >
            {editError && (
              <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Checkout modal – address + shipping, then place order */}
      <Modal
        isOpen={checkoutModalOpen}
        onClose={() => { setCheckoutModalOpen(false); setCheckoutError(null); setCheckoutFormErrors({}); }}
        title="Checkout"
        subtitle={detailProduct?.title ?? ''}
        size="lg"
      >
        {detailProduct && resolvedVariant && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const errs = validateCheckoutForm(checkoutForm);
              setCheckoutFormErrors(errs);
              if (Object.keys(errs).length > 0) {
                toast.warning('Please fix the form errors.');
                return;
              }
              setCheckoutSubmitting(true);
              setCheckoutError(null);
              try {
                const res = await fetch('/api/printify/orders', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    shop_id: shopIdForDetail || detailProduct.shop_id,
                    external_id: `printify-${Date.now()}`,
                    label: `Printify: ${detailProduct.title}`,
                    line_items: [
                      { product_id: String(detailProduct.id), variant_id: resolvedVariant.id, quantity: 1 },
                    ],
                    shipping_method: Number(checkoutForm.shipping_method),
                    send_shipping_notification: true,
                    address_to: {
                      first_name: checkoutForm.first_name,
                      last_name: checkoutForm.last_name,
                      email: checkoutForm.email,
                      phone: checkoutForm.phone || undefined,
                      address1: checkoutForm.address1,
                      address2: checkoutForm.address2 || undefined,
                      city: checkoutForm.city,
                      region: checkoutForm.region || undefined,
                      zip: checkoutForm.zip,
                      country: checkoutForm.country,
                    },
                  }),
                });
                const data = await res.json();
                if (!res.ok) {
                  setCheckoutError(data?.error ?? 'Order failed');
                  return;
                }
                toast.success(`Order created: ${data.data?.order_id ?? data.data?.external_id ?? 'OK'}`);
                setCheckoutModalOpen(false);
                setCheckoutForm({ first_name: '', last_name: '', email: '', phone: '', address1: '', address2: '', city: '', region: '', zip: '', country: 'US', shipping_method: 1 });
              } catch (err) {
                setCheckoutError('Request failed');
              } finally {
                setCheckoutSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            {checkoutError && <p className="text-sm text-red-600 dark:text-red-400">{checkoutError}</p>}
            <p className="text-sm text-[var(--text-muted)]">
              Variant: {Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' · ')} · ID: {resolvedVariant.id}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input required placeholder="First name" value={checkoutForm.first_name} onChange={(e) => { setCheckoutForm((f) => ({ ...f, first_name: e.target.value })); setCheckoutFormErrors((err) => ({ ...err, first_name: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.first_name ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                {checkoutFormErrors.first_name && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.first_name}</p>}
              </div>
              <div>
                <input required placeholder="Last name" value={checkoutForm.last_name} onChange={(e) => { setCheckoutForm((f) => ({ ...f, last_name: e.target.value })); setCheckoutFormErrors((err) => ({ ...err, last_name: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.last_name ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                {checkoutFormErrors.last_name && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.last_name}</p>}
              </div>
            </div>
            <div>
              <input required type="email" placeholder="Email" value={checkoutForm.email} onChange={(e) => { setCheckoutForm((f) => ({ ...f, email: e.target.value })); setCheckoutFormErrors((err) => ({ ...err, email: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.email ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
              {checkoutFormErrors.email && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.email}</p>}
            </div>
            <PhoneInput value={checkoutForm.phone} onChange={(v) => setCheckoutForm((f) => ({ ...f, phone: v ?? '' }))} placeholder="Phone number" />
            <div>
              <input required placeholder="Address line 1" value={checkoutForm.address1} onChange={(e) => { setCheckoutForm((f) => ({ ...f, address1: e.target.value })); setCheckoutFormErrors((err) => ({ ...err, address1: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.address1 ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
              {checkoutFormErrors.address1 && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.address1}</p>}
            </div>
            <input placeholder="Address line 2" value={checkoutForm.address2} onChange={(e) => setCheckoutForm((f) => ({ ...f, address2: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input required placeholder="City" value={checkoutForm.city} onChange={(e) => { setCheckoutForm((f) => ({ ...f, city: e.target.value })); setCheckoutFormErrors((err) => ({ ...err, city: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.city ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                {checkoutFormErrors.city && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.city}</p>}
              </div>
              <input placeholder="State / Region" value={checkoutForm.region} onChange={(e) => setCheckoutForm((f) => ({ ...f, region: e.target.value }))} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]" />
              <div>
                <input required placeholder="ZIP" value={checkoutForm.zip} onChange={(e) => { setCheckoutForm((f) => ({ ...f, zip: e.target.value })); setCheckoutFormErrors((err) => ({ ...err, zip: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.zip ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
                {checkoutFormErrors.zip && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.zip}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Country (2-letter)</label>
              <input required placeholder="US" value={checkoutForm.country} onChange={(e) => { setCheckoutForm((f) => ({ ...f, country: e.target.value.toUpperCase().slice(0, 2) })); setCheckoutFormErrors((err) => ({ ...err, country: '' })); }} className={`w-full rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] ${checkoutFormErrors.country ? 'border-red-500' : 'border-[var(--border-color)]'}`} />
              {checkoutFormErrors.country && <p className="text-xs text-red-500 mt-1">{checkoutFormErrors.country}</p>}
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Shipping method</label>
              <select value={checkoutForm.shipping_method} onChange={(e) => setCheckoutForm((f) => ({ ...f, shipping_method: Number(e.target.value) }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]">
                <option value={1}>Standard</option>
                <option value={2}>Priority</option>
                <option value={3}>Printify Express</option>
                <option value={4}>Economy</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={checkoutSubmitting}>{checkoutSubmitting ? 'Placing order…' : 'Place order'}</Button>
              <Button type="button" variant="secondary" onClick={() => setCheckoutModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
}
