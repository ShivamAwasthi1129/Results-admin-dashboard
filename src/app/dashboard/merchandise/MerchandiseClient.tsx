'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button, Modal, Input, Select, Table, SkeletonLoader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDataCache } from '@/context/DataCacheContext';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  PhotoIcon,
  ShoppingBagIcon,
  CubeIcon,
  TagIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// Dynamically import product detail modal
const ProductDetailModal = dynamic(() => import('@/components/products/ProductDetailModal'), { ssr: false });

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
  videoUrl?: string;
  model3dUrl?: string;
  model3dFormat?: 'glb' | 'gltf' | 'obj' | 'fbx' | 'dae';
  keyFeatures?: string[];
  variants?: Array<{
    id: string;
    size?: string;
    color?: string;
    strapColor?: string;
    strapWidth?: string;
    ukSize?: string;
    usSize?: string;
    stock: {
      quantity: number;
      reservedQuantity: number;
      availableQuantity: number;
    };
    sku?: string;
    price?: number;
  }>;
  categoryAttributes?: {
    shirtSizes?: string[];
    strapColors?: string[];
    strapWidths?: string[];
    watchCaseMaterial?: string;
    watchDialColor?: string;
    ukSizes?: string[];
    usSizes?: string[];
    shoeWidth?: string;
    colors?: string[];
    materials?: string[];
  };
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

interface ProductsClientProps {
  initialProducts: Product[];
}

interface Vendor {
  _id: string;
  businessName: string;
  contactPerson?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  location?: {
    address?: string;
    city?: string;
    state?: string;
  };
}

export default function ProductsClient({ initialProducts }: ProductsClientProps) {
  const { token } = useAuth();
  const { getCachedData, updateCache } = useDataCache();
  
  // Check cache first, then use initialProducts
  const cachedProducts = getCachedData('products');
  const initialData = cachedProducts && cachedProducts.length > 0 ? cachedProducts : initialProducts;
  
  const [products, setProducts] = useState<Product[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(initialData.length === 0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [featuredFilter, setFeaturedFilter] = useState(false);
  
  // Vendor selection state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  // Form data for add/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: 'shoes' as Product['category'],
    subcategory: '',
    costPrice: '',
    sellingPrice: '',
    discount: '',
    taxRate: '',
    stockQuantity: '',
    lowStockThreshold: '',
    reservedQuantity: '',
    reorderPoint: '',
    maxStock: '',
    brand: '',
    model: '',
    size: [] as string[],
    color: [] as string[],
    material: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    safetyFeatures: [] as string[],
    safetyStandards: [] as string[],
    certifications: [] as string[],
    images: [] as Array<{ url: string; alt?: string; isPrimary?: boolean }>,
    videoUrl: '',
    model3dUrl: '',
    model3dFormat: 'glb' as 'glb' | 'gltf' | 'obj' | 'fbx' | 'dae',
    keyFeatures: [] as string[],
    variants: [] as Array<{
      id: string;
      size?: string;
      color?: string;
      strapColor?: string;
      strapWidth?: string;
      ukSize?: string;
      usSize?: string;
      stockQuantity: number;
      reservedQuantity: number;
      sku?: string;
      price?: number;
    }>,
    categoryAttributes: {
      shirtSizes: [] as string[],
      strapColors: [] as string[],
      strapWidths: [] as string[],
      watchCaseMaterial: '',
      watchDialColor: '',
      ukSizes: [] as string[],
      usSizes: [] as string[],
      shoeWidth: '',
      colors: [] as string[],
      materials: [] as string[],
    },
    specifications: [] as Array<{ key: string; value: string }>,
    vendorName: '',
    vendorContact: '',
    vendorEmail: '',
    vendorAddress: '',
    status: 'active' as Product['status'],
    isFeatured: false,
    tags: [] as string[],
    warrantyPeriod: '',
    returnPolicy: '',
    shippingWeight: '',
    shippingDimensions: '',
    shippingClass: '',
  });
  
  // Variant management state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [variantForm, setVariantForm] = useState({
    id: '',
    size: '',
    color: '',
    strapColor: '',
    strapWidth: '',
    ukSize: '',
    usSize: '',
    stockQuantity: '',
    reservedQuantity: '',
    sku: '',
    price: '',
  });

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setIsInitialLoading(true);

      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (brandFilter !== 'all') params.append('brand', brandFilter);
      if (lowStockFilter) params.append('lowStock', 'true');
      if (featuredFilter) params.append('featured', 'true');
      params.append('limit', '100');

      const response = await fetch(`/api/products?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      if (data.success && data.data?.products) {
        setProducts(data.data.products);
        // Update cache
        updateCache('products', data.data.products);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [searchQuery, categoryFilter, statusFilter, brandFilter, lowStockFilter, featuredFilter, token]);

  // Fetch vendors from service providers
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch('/api/services?limit=1000', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.serviceProviders) {
            setVendors(data.data.serviceProviders);
          } else if (data.success && data.data?.providers) {
            // Fallback for different API response structure
            setVendors(data.data.providers);
          }
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    };
    if (token) {
      fetchVendors();
    }
  }, [token]);

  // Handle click outside vendor dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor => {
    if (!vendorSearchQuery) return true;
    const query = vendorSearchQuery.toLowerCase();
    return (
      vendor.businessName?.toLowerCase().includes(query) ||
      vendor.contactPerson?.name?.toLowerCase().includes(query) ||
      vendor.contactPerson?.email?.toLowerCase().includes(query) ||
      vendor.location?.city?.toLowerCase().includes(query) ||
      vendor.location?.state?.toLowerCase().includes(query)
    );
  });

  // Handle vendor selection
  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendorId(vendor._id);
    setVendorSearchQuery(vendor.businessName || '');
    setShowVendorDropdown(false);
    
    // Auto-fill vendor information
    setFormData({
      ...formData,
      vendorName: vendor.businessName || '',
      vendorContact: vendor.contactPerson?.phone || '',
      vendorEmail: vendor.contactPerson?.email || '',
      vendorAddress: [
        vendor.location?.address,
        vendor.location?.city,
        vendor.location?.state,
      ].filter(Boolean).join(', ') || '',
    });
  };

  // Get unique brands for filter
  const uniqueBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));

  // Filter products
  const filteredProducts = products.filter(product => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && product.status !== statusFilter) return false;
    if (brandFilter !== 'all' && product.brand !== brandFilter) return false;
    if (lowStockFilter && product.stock.quantity >= product.stock.lowStockThreshold) return false;
    if (featuredFilter && !product.isFeatured) return false;

    return true;
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sku: '',
      barcode: '',
      category: 'shoes',
      subcategory: '',
      costPrice: '',
      sellingPrice: '',
      discount: '',
      taxRate: '',
      stockQuantity: '',
      lowStockThreshold: '',
      reservedQuantity: '',
      reorderPoint: '',
      maxStock: '',
      brand: '',
      model: '',
      size: [],
      color: [],
      material: '',
      weight: '',
      length: '',
      width: '',
      height: '',
      safetyFeatures: [],
      safetyStandards: [],
      certifications: [],
      images: [],
      videoUrl: '',
      model3dUrl: '',
      model3dFormat: 'glb',
      keyFeatures: [],
      variants: [],
      categoryAttributes: {
        shirtSizes: [],
        strapColors: [],
        strapWidths: [],
        watchCaseMaterial: '',
        watchDialColor: '',
        ukSizes: [],
        usSizes: [],
        shoeWidth: '',
        colors: [],
        materials: [],
      },
      specifications: [],
      vendorName: '',
      vendorContact: '',
      vendorEmail: '',
      vendorAddress: '',
      status: 'active',
      isFeatured: false,
      tags: [],
      warrantyPeriod: '',
      returnPolicy: '',
      shippingWeight: '',
      shippingDimensions: '',
      shippingClass: '',
    });
    setVariantForm({
      id: '',
      size: '',
      color: '',
      strapColor: '',
      strapWidth: '',
      ukSize: '',
      usSize: '',
      stockQuantity: '',
      reservedQuantity: '',
      sku: '',
      price: '',
    });
    setEditingVariantIndex(null);
    setShowVariantModal(false);
    setSelectedProduct(null);
    setSelectedVendorId('');
    setVendorSearchQuery('');
    setShowVendorDropdown(false);
  };

  // Handle add/edit product
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        taxRate: formData.taxRate ? parseFloat(formData.taxRate) : 0,
        stock: {
          quantity: parseInt(formData.stockQuantity) || 0,
          lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
          reservedQuantity: parseInt(formData.reservedQuantity) || 0,
          reorderPoint: parseInt(formData.reorderPoint) || 0,
          maxStock: formData.maxStock ? parseInt(formData.maxStock) : undefined,
        },
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        size: formData.size.length > 0 ? formData.size : undefined,
        color: formData.color.length > 0 ? formData.color : undefined,
        material: formData.material || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dimensions: formData.length || formData.width || formData.height
          ? {
              length: formData.length ? parseFloat(formData.length) : undefined,
              width: formData.width ? parseFloat(formData.width) : undefined,
              height: formData.height ? parseFloat(formData.height) : undefined,
            }
          : undefined,
        safetyFeatures: formData.safetyFeatures.length > 0 ? formData.safetyFeatures : undefined,
        safetyStandards: formData.safetyStandards.length > 0 ? formData.safetyStandards : undefined,
        certifications: formData.certifications.length > 0 ? formData.certifications : undefined,
        images: formData.images.length > 0 ? formData.images : [],
        videoUrl: formData.videoUrl || undefined,
        model3dUrl: formData.model3dUrl || undefined,
        model3dFormat: formData.model3dUrl ? formData.model3dFormat : undefined,
        keyFeatures: formData.keyFeatures.length > 0 ? formData.keyFeatures : undefined,
        variants: formData.variants.length > 0 ? formData.variants.map(v => ({
          id: v.id,
          size: v.size || undefined,
          color: v.color || undefined,
          strapColor: v.strapColor || undefined,
          strapWidth: v.strapWidth || undefined,
          ukSize: v.ukSize || undefined,
          usSize: v.usSize || undefined,
          stock: {
            quantity: typeof v.stockQuantity === 'number' ? v.stockQuantity : parseInt(String(v.stockQuantity)) || 0,
            reservedQuantity: typeof v.reservedQuantity === 'number' ? v.reservedQuantity : parseInt(String(v.reservedQuantity)) || 0,
            availableQuantity: Math.max(0, (typeof v.stockQuantity === 'number' ? v.stockQuantity : parseInt(String(v.stockQuantity)) || 0) - (typeof v.reservedQuantity === 'number' ? v.reservedQuantity : parseInt(String(v.reservedQuantity)) || 0)),
          },
          sku: v.sku || undefined,
          price: v.price ? (typeof v.price === 'number' ? v.price : parseFloat(String(v.price))) : undefined,
        })) : undefined,
        categoryAttributes: Object.values(formData.categoryAttributes).some(v => 
          Array.isArray(v) ? v.length > 0 : v !== ''
        ) ? formData.categoryAttributes : undefined,
        specifications: formData.specifications.length > 0 ? formData.specifications : undefined,
        vendor: formData.vendorName
          ? {
              name: formData.vendorName,
              contact: formData.vendorContact,
              email: formData.vendorEmail || undefined,
              address: formData.vendorAddress || undefined,
            }
          : undefined,
        status: formData.status,
        isFeatured: formData.isFeatured,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        warrantyPeriod: formData.warrantyPeriod ? parseInt(formData.warrantyPeriod) : undefined,
        returnPolicy: formData.returnPolicy || undefined,
        shippingInfo: formData.shippingWeight
          ? {
              weight: parseFloat(formData.shippingWeight),
              dimensions: formData.shippingDimensions,
              shippingClass: formData.shippingClass,
            }
          : undefined,
      };

      const url = selectedProduct ? `/api/products/${selectedProduct._id}` : '/api/products';
      const method = selectedProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      toast.success(selectedProduct ? 'Product updated successfully!' : 'Product added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      toast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product');
    }
  };

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    
    // Try to find matching vendor
    const matchingVendor = vendors.find(v => 
      v.businessName === product.vendor?.name
    );
    if (matchingVendor) {
      setSelectedVendorId(matchingVendor._id);
      setVendorSearchQuery(matchingVendor.businessName || '');
    } else {
      setSelectedVendorId('');
      setVendorSearchQuery(product.vendor?.name || '');
    }
    
    setFormData({
      name: product.name,
      description: product.description || '',
      sku: product.sku,
      barcode: product.barcode || '',
      category: product.category,
      subcategory: product.subcategory || '',
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      discount: (product.discount || 0).toString(),
      taxRate: (product.taxRate || 0).toString(),
      stockQuantity: product.stock.quantity.toString(),
      lowStockThreshold: product.stock.lowStockThreshold.toString(),
      reservedQuantity: product.stock.reservedQuantity.toString(),
      reorderPoint: product.stock.reorderPoint.toString(),
      maxStock: product.stock.maxStock?.toString() || '',
      brand: product.brand || '',
      model: product.model || '',
      size: product.size || [],
      color: product.color || [],
      material: product.material || '',
      weight: product.weight?.toString() || '',
      length: product.dimensions?.length?.toString() || '',
      width: product.dimensions?.width?.toString() || '',
      height: product.dimensions?.height?.toString() || '',
      safetyFeatures: product.safetyFeatures || [],
      safetyStandards: product.safetyStandards || [],
      certifications: product.certifications || [],
      images: product.images || [],
      videoUrl: (product as any).videoUrl || '',
      model3dUrl: (product as any).model3dUrl || '',
      model3dFormat: (product as any).model3dFormat || 'glb',
      keyFeatures: (product as any).keyFeatures || [],
      variants: ((product as any).variants || []).map((v: any) => ({
        ...v,
        stockQuantity: v.stock?.quantity ?? v.stockQuantity ?? 0,
        reservedQuantity: v.stock?.reservedQuantity ?? v.reservedQuantity ?? 0,
      })),
      categoryAttributes: {
        shirtSizes: (product as any).categoryAttributes?.shirtSizes || [],
        strapColors: (product as any).categoryAttributes?.strapColors || [],
        strapWidths: (product as any).categoryAttributes?.strapWidths || [],
        watchCaseMaterial: (product as any).categoryAttributes?.watchCaseMaterial || '',
        watchDialColor: (product as any).categoryAttributes?.watchDialColor || '',
        ukSizes: (product as any).categoryAttributes?.ukSizes || [],
        usSizes: (product as any).categoryAttributes?.usSizes || [],
        shoeWidth: (product as any).categoryAttributes?.shoeWidth || '',
        colors: (product as any).categoryAttributes?.colors || [],
        materials: (product as any).categoryAttributes?.materials || [],
      },
      specifications: product.specifications || [],
      vendorName: product.vendor?.name || '',
      vendorContact: product.vendor?.contact || '',
      vendorEmail: product.vendor?.email || '',
      vendorAddress: product.vendor?.address || '',
      status: product.status,
      isFeatured: product.isFeatured || false,
      tags: product.tags || [],
      warrantyPeriod: product.warrantyPeriod?.toString() || '',
      returnPolicy: product.returnPolicy || '',
      shippingWeight: product.shippingInfo?.weight?.toString() || '',
      shippingDimensions: product.shippingInfo?.dimensions || '',
      shippingClass: product.shippingInfo?.shippingClass || '',
    });
    setShowAddModal(true);
  };

  // Get stock status badge
  const getStockStatus = (product: Product) => {
    const { quantity, lowStockThreshold } = product.stock;
    if (quantity === 0) return { label: 'Out of Stock', variant: 'danger' as const };
    if (quantity < lowStockThreshold * 0.2) return { label: 'Critical', variant: 'danger' as const };
    if (quantity < lowStockThreshold) return { label: 'Low Stock', variant: 'warning' as const };
    return { label: 'In Stock', variant: 'success' as const };
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShoppingBagIcon className="w-7 h-7 text-purple-500" />
            Products Management
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage products, inventory, and stock levels
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Total Products</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{products.length}</p>
            </div>
            <CubeIcon className="w-10 h-10 text-purple-500/20" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">In Stock</p>
              <p className="text-2xl font-bold text-green-500 mt-1">
                {products.filter(p => p.stock.quantity > 0).length}
              </p>
            </div>
            <ChartBarIcon className="w-10 h-10 text-green-500/20" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-500 mt-1">
                {products.filter(p => p.stock.quantity < p.stock.lowStockThreshold && p.stock.quantity > 0).length}
              </p>
            </div>
            <TagIcon className="w-10 h-10 text-yellow-500/20" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Out of Stock</p>
              <p className="text-2xl font-bold text-red-500 mt-1">
                {products.filter(p => p.stock.quantity === 0).length}
              </p>
            </div>
            <XMarkIcon className="w-10 h-10 text-red-500/20" />
          </div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="w-full">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full">
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'shoes', label: 'Shoes' },
              { value: 'boots', label: 'Boots' },
              { value: 'jackets', label: 'Jackets' },
              { value: 'watches', label: 'Watches' },
              { value: 'shirts', label: 'Shirts' },
              { value: 'safety_suits', label: 'Safety Suits' },
              { value: 'safety_equipment', label: 'Safety Equipment' },
              { value: 'accessories', label: 'Accessories' },
              { value: 'other', label: 'Other' },
            ]}
            icon={<FunnelIcon className="w-5 h-5" />}
          />
        </div>
        <div className="w-full">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'discontinued', label: 'Discontinued' },
              { value: 'out_of_stock', label: 'Out of Stock' },
            ]}
            icon={<FunnelIcon className="w-5 h-5" />}
          />
        </div>
        <div className="w-full">
          <Select
            value={brandFilter}
            onChange={setBrandFilter}
            options={[
              { value: 'all', label: 'All Brands' },
              ...uniqueBrands.map(brand => ({ value: brand!, label: brand! })),
            ]}
            icon={<FunnelIcon className="w-5 h-5" />}
          />
        </div>
        <div className="w-full">
          <Button
            variant={lowStockFilter ? 'primary' : 'secondary'}
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className="w-full"
          >
            Low Stock
          </Button>
        </div>
        <div className="w-full">
          <Button
            variant={featuredFilter ? 'primary' : 'secondary'}
            onClick={() => setFeaturedFilter(!featuredFilter)}
            className="w-full"
          >
            Featured
          </Button>
        </div>
      </div>

      {/* Products Table */}
      {isInitialLoading ? (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              <SkeletonLoader rows={10} columns={7} variant="table" />
            </tbody>
          </table>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingBagIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No products found</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first product'}
          </p>
          {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && (
            <Button variant="gradient" onClick={() => setShowAddModal(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>
              Add Product
            </Button>
          )}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table
            data={filteredProducts}
            columns={[
              {
                key: 'name',
                label: 'Product',
                render: (product: Product) => {
                  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
                  return (
                    <div className="flex items-center gap-3">
                      {primaryImage ? (
                        <img
                          src={primaryImage.url}
                          alt={primaryImage.alt || product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <PhotoIcon className="w-6 h-6 text-purple-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">SKU: {product.sku}</p>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'category',
                label: 'Category',
                render: (product: Product) => (
                  <div>
                    <Badge variant="secondary">{getCategoryLabel(product.category)}</Badge>
                    {product.subcategory && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">{product.subcategory}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'brand',
                label: 'Brand',
                render: (product: Product) => (
                  <span className="text-sm text-[var(--text-primary)]">{product.brand || '—'}</span>
                ),
              },
              {
                key: 'sellingPrice',
                label: 'Price',
                render: (product: Product) => {
                  const finalPrice = product.discount
                    ? product.sellingPrice * (1 - product.discount / 100)
                    : product.sellingPrice;
                  return (
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        ${finalPrice.toFixed(2)}
                        {product.discount && product.discount > 0 && (
                          <span className="text-xs text-green-500 ml-2">-{product.discount}%</span>
                        )}
                      </p>
                      {product.discount && product.discount > 0 && (
                        <p className="text-xs text-[var(--text-muted)] line-through">
                          ${product.sellingPrice.toFixed(2)}
                        </p>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'stock',
                label: 'Stock',
                render: (product: Product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <div>
                      <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {product.stock.quantity} / {product.stock.availableQuantity} available
                      </p>
                    </div>
                  );
                },
              },
              {
                key: 'status',
                label: 'Status',
                render: (product: Product) => {
                  const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
                    active: 'success',
                    inactive: 'secondary',
                    discontinued: 'warning',
                    out_of_stock: 'danger',
                  };
                  return (
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColors[product.status] || 'secondary'}>
                        {product.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {product.isFeatured && (
                        <Badge variant="primary" className="text-xs">Featured</Badge>
                      )}
                    </div>
                  );
                },
              },
              {
                key: '_id',
                label: 'Actions',
                render: (product: Product) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedProductForDetail(product);
                        setShowDetailModal(true);
                      }}
                      className="p-2 rounded-lg text-purple-400 hover:bg-purple-400/10 transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product._id)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rowKey="_id"
          />
        </Card>
      )}

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title={selectedProduct ? 'Edit Product' : 'Add New Product'}
        size="xl"
        className="z-[10001]"
      >
        <form onSubmit={handleSubmitProduct} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  SKU <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  placeholder="PROD-001"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
                className="w-full px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category <span className="text-red-400">*</span></label>
                <Select
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value as Product['category'] })}
                  options={[
                    { value: 'shoes', label: 'Shoes' },
                    { value: 'boots', label: 'Boots' },
                    { value: 'jackets', label: 'Jackets' },
                    { value: 'watches', label: 'Watches' },
                    { value: 'shirts', label: 'Shirts' },
                    { value: 'safety_suits', label: 'Safety Suits' },
                    { value: 'safety_equipment', label: 'Safety Equipment' },
                    { value: 'accessories', label: 'Accessories' },
                    { value: 'other', label: 'Other' },
                  ]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Subcategory</label>
                <Input
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="e.g., Work Boots, Safety Watches"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Barcode</label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Optional barcode"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
                <Select
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value as Product['status'] })}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'discontinued', label: 'Discontinued' },
                    { value: 'out_of_stock', label: 'Out of Stock' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Pricing
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Cost Price ($) <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Selling Price ($) <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Discount (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tax Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Stock Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Stock Management
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Quantity <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Low Stock Threshold <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  placeholder="10"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Reserved Quantity</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.reservedQuantity}
                  onChange={(e) => setFormData({ ...formData, reservedQuantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Reorder Point</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.reorderPoint}
                  onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Max Stock</label>
              <Input
                type="number"
                min="0"
                value={formData.maxStock}
                onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Product Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Brand</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Brand name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Model</label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Model number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Material</label>
              <Input
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="e.g., Leather, Polyester, etc."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Weight (kg)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Length (cm)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Width (cm)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Height (cm)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Product Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Product Images
            </h3>
            <div className="space-y-3">
              {formData.images.map((image, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-input)]">
                  <div className="flex-shrink-0">
                    {image.url ? (
                      <img
                        src={image.url}
                        alt={image.alt || `Product image ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Image+Error';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center">
                        <PhotoIcon className="w-8 h-8 text-[var(--text-muted)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={image.url}
                      onChange={(e) => {
                        const newImages = [...formData.images];
                        newImages[index] = { ...newImages[index], url: e.target.value };
                        setFormData({ ...formData, images: newImages });
                      }}
                      placeholder="Image URL"
                    />
                    <Input
                      value={image.alt || ''}
                      onChange={(e) => {
                        const newImages = [...formData.images];
                        newImages[index] = { ...newImages[index], alt: e.target.value };
                        setFormData({ ...formData, images: newImages });
                      }}
                      placeholder="Alt text (optional)"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = formData.images.map((img, i) => ({
                          ...img,
                          isPrimary: i === index,
                        }));
                        setFormData({ ...formData, images: newImages });
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        image.isPrimary
                          ? 'bg-purple-500 text-white'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                      }`}
                    >
                      {image.isPrimary ? 'Primary' : 'Set Primary'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = formData.images.filter((_, i) => i !== index);
                        // Ensure at least one primary if images remain
                        if (newImages.length > 0 && image.isPrimary && !newImages.some(img => img.isPrimary)) {
                          newImages[0].isPrimary = true;
                        }
                        setFormData({ ...formData, images: newImages });
                      }}
                      className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Remove image"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFormData({
                    ...formData,
                    images: [
                      ...formData.images,
                      { url: '', alt: '', isPrimary: formData.images.length === 0 },
                    ],
                  });
                }}
                leftIcon={<PlusIcon className="w-4 h-4" />}
                className="w-full"
              >
                Add Image
              </Button>
              {formData.images.length > 0 && (
                <p className="text-xs text-[var(--text-muted)]">
                  💡 Tip: Set one image as primary. The primary image will be displayed first in the product listing.
                </p>
              )}
            </div>
          </div>

          {/* Video & 3D Model */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Video & 3D Model
            </h3>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Video URL</label>
              <Input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=... or direct video URL"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Enter a YouTube URL or direct link to a product demonstration video
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">3D Model URL</label>
                <Input
                  type="url"
                  value={formData.model3dUrl}
                  onChange={(e) => setFormData({ ...formData, model3dUrl: e.target.value })}
                  placeholder="https://example.com/model.glb"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">3D Model Format</label>
                <Select
                  value={formData.model3dFormat}
                  onChange={(value) => setFormData({ ...formData, model3dFormat: value as any })}
                  options={[
                    { value: 'glb', label: 'GLB' },
                    { value: 'gltf', label: 'GLTF' },
                    { value: 'obj', label: 'OBJ' },
                    { value: 'fbx', label: 'FBX' },
                    { value: 'dae', label: 'DAE' },
                  ]}
                />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              💡 Supported formats: GLB (recommended), GLTF, OBJ, FBX, DAE. Upload your 3D model file and provide the URL here.
            </p>
          </div>

          {/* Key Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Key Features
            </h3>
            <div className="space-y-2">
              {formData.keyFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => {
                      const newFeatures = [...formData.keyFeatures];
                      newFeatures[index] = e.target.value;
                      setFormData({ ...formData, keyFeatures: newFeatures });
                    }}
                    placeholder="Enter key feature..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newFeatures = formData.keyFeatures.filter((_, i) => i !== index);
                      setFormData({ ...formData, keyFeatures: newFeatures });
                    }}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFormData({ ...formData, keyFeatures: [...formData.keyFeatures, ''] })}
                leftIcon={<PlusIcon className="w-4 h-4" />}
                className="w-full"
              >
                Add Key Feature
              </Button>
            </div>
          </div>

          {/* Category-Specific Attributes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Category-Specific Attributes
            </h3>
            {formData.category === 'shirts' && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Shirt Sizes</label>
                <div className="flex flex-wrap gap-2">
                  {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        const currentSizes = formData.categoryAttributes?.shirtSizes || [];
                        const sizes = currentSizes.includes(size)
                          ? currentSizes.filter(s => s !== size)
                          : [...currentSizes, size];
                        setFormData({
                          ...formData,
                          categoryAttributes: { ...formData.categoryAttributes, shirtSizes: sizes },
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        (formData.categoryAttributes?.shirtSizes || []).includes(size)
                          ? 'bg-purple-500 text-white'
                          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {formData.category === 'watches' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Strap Colors</label>
                  <Input
                    value={(formData.categoryAttributes?.strapColors || []).join(', ')}
                    onChange={(e) => {
                      const colors = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                      setFormData({
                        ...formData,
                        categoryAttributes: { ...formData.categoryAttributes, strapColors: colors },
                      });
                    }}
                    placeholder="Black, Brown, Blue (comma-separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Strap Widths</label>
                  <Input
                    value={(formData.categoryAttributes?.strapWidths || []).join(', ')}
                    onChange={(e) => {
                      const widths = e.target.value.split(',').map(w => w.trim()).filter(w => w);
                      setFormData({
                        ...formData,
                        categoryAttributes: { ...formData.categoryAttributes, strapWidths: widths },
                      });
                    }}
                    placeholder="20mm, 22mm, 24mm (comma-separated)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Case Material</label>
                    <Input
                      value={formData.categoryAttributes.watchCaseMaterial}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          categoryAttributes: { ...formData.categoryAttributes, watchCaseMaterial: e.target.value },
                        });
                      }}
                      placeholder="Stainless Steel, Titanium, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Dial Color</label>
                    <Input
                      value={formData.categoryAttributes.watchDialColor}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          categoryAttributes: { ...formData.categoryAttributes, watchDialColor: e.target.value },
                        });
                      }}
                      placeholder="Black, White, Blue, etc."
                    />
                  </div>
                </div>
              </div>
            )}
            {(formData.category === 'shoes' || formData.category === 'boots') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">UK Sizes</label>
                  <Input
                    value={(formData.categoryAttributes?.ukSizes || []).join(', ')}
                    onChange={(e) => {
                      const sizes = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                      setFormData({
                        ...formData,
                        categoryAttributes: { ...formData.categoryAttributes, ukSizes: sizes },
                      });
                    }}
                    placeholder="UK 6, UK 7, UK 8, UK 9 (comma-separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">US Sizes</label>
                  <Input
                    value={(formData.categoryAttributes?.usSizes || []).join(', ')}
                    onChange={(e) => {
                      const sizes = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                      setFormData({
                        ...formData,
                        categoryAttributes: { ...formData.categoryAttributes, usSizes: sizes },
                      });
                    }}
                    placeholder="US 7, US 8, US 9, US 10 (comma-separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Shoe Width</label>
                  <Select
                    value={formData.categoryAttributes.shoeWidth}
                    onChange={(value) => {
                      setFormData({
                        ...formData,
                        categoryAttributes: { ...formData.categoryAttributes, shoeWidth: value },
                      });
                    }}
                    options={[
                      { value: '', label: 'Select Width' },
                      { value: 'Narrow', label: 'Narrow' },
                      { value: 'Standard', label: 'Standard' },
                      { value: 'Wide', label: 'Wide' },
                      { value: 'Extra Wide', label: 'Extra Wide' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Product Variants (Size/Color/Strap combinations with individual stock) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
                Product Variants
              </h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setVariantForm({
                    id: '',
                    size: '',
                    color: '',
                    strapColor: '',
                    strapWidth: '',
                    ukSize: '',
                    usSize: '',
                    stockQuantity: '',
                    reservedQuantity: '',
                    sku: '',
                    price: '',
                  });
                  setEditingVariantIndex(null);
                  setShowVariantModal(true);
                }}
                leftIcon={<PlusIcon className="w-4 h-4" />}
              >
                Add Variant
              </Button>
            </div>
            {formData.variants.length > 0 ? (
              <div className="space-y-2">
                {formData.variants.map((variant, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-input)]">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {variant.size && `Size: ${variant.size}`}
                        {variant.color && ` | Color: ${variant.color}`}
                        {variant.strapColor && ` | Strap: ${variant.strapColor}`}
                        {variant.strapWidth && ` (${variant.strapWidth})`}
                        {variant.ukSize && ` | UK: ${variant.ukSize}`}
                        {variant.usSize && ` | US: ${variant.usSize}`}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Stock: {variant.stockQuantity ?? 0} | Reserved: {variant.reservedQuantity ?? 0} | Available: {Math.max(0, (variant.stockQuantity ?? 0) - (variant.reservedQuantity ?? 0))}
                        {variant.sku && ` | SKU: ${variant.sku}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const stockQty = variant.stockQuantity ?? 0;
                          const reservedQty = variant.reservedQuantity ?? 0;
                          setVariantForm({ 
                            id: variant.id || '',
                            size: variant.size || '',
                            color: variant.color || '',
                            strapColor: variant.strapColor || '',
                            strapWidth: variant.strapWidth || '',
                            ukSize: variant.ukSize || '',
                            usSize: variant.usSize || '',
                            stockQuantity: stockQty.toString(), 
                            reservedQuantity: reservedQty.toString(),
                            sku: variant.sku || '',
                            price: variant.price?.toString() || '' 
                          });
                          setEditingVariantIndex(index);
                          setShowVariantModal(true);
                        }}
                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newVariants = formData.variants.filter((_, i) => i !== index);
                          setFormData({ ...formData, variants: newVariants });
                        }}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">
                No variants added. Add variants to track stock for different sizes, colors, or other attributes.
              </p>
            )}
          </div>

          {/* Vendor Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Vendor Information
            </h3>
            
            {/* Vendor Selection Dropdown */}
            <div className="relative" ref={vendorDropdownRef}>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Select Vendor (Optional)
              </label>
              <div className="relative">
                <Input
                  icon={<MagnifyingGlassIcon className="w-5 h-5" />}
                  value={vendorSearchQuery}
                  onChange={(e) => {
                    setVendorSearchQuery(e.target.value);
                    setShowVendorDropdown(true);
                    setSelectedVendorId('');
                  }}
                  onFocus={() => setShowVendorDropdown(true)}
                  placeholder="Search vendor from Vendor & Alliance Partners..."
                  className="pr-10"
                />
                {selectedVendorId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVendorId('');
                      setVendorSearchQuery('');
                      setFormData({
                        ...formData,
                        vendorName: '',
                        vendorContact: '',
                        vendorEmail: '',
                        vendorAddress: '',
                      });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--bg-input)] text-[var(--text-muted)]"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}

                {showVendorDropdown && filteredVendors.length > 0 && (
                  <div className="absolute z-50 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredVendors.map((vendor) => (
                      <button
                        key={vendor._id}
                        type="button"
                        onClick={() => handleVendorSelect(vendor)}
                        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[var(--bg-input)] transition-colors border-b border-[var(--border-color)] last:border-b-0"
                      >
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{vendor.businessName}</p>
                          {vendor.contactPerson?.email && (
                            <p className="text-xs text-[var(--text-muted)]">{vendor.contactPerson.email}</p>
                          )}
                          {vendor.location?.city && vendor.location?.state && (
                            <p className="text-xs text-[var(--text-muted)]">
                              {vendor.location.city}, {vendor.location.state}
                            </p>
                          )}
                        </div>
                        {selectedVendorId === vendor._id && (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showVendorDropdown && vendorSearchQuery && filteredVendors.length === 0 && (
                  <div className="absolute z-50 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg mt-1 p-4">
                    <p className="text-sm text-[var(--text-muted)] text-center">
                      No vendor found. You can manually enter vendor information below.
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Select a vendor from Vendor & Alliance Partners to auto-fill information, or enter manually below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Vendor Name</label>
                <Input
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  placeholder="Vendor company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Contact</label>
                <Input
                  value={formData.vendorContact}
                  onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.vendorEmail}
                  onChange={(e) => setFormData({ ...formData, vendorEmail: e.target.value })}
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Address</label>
                <Input
                  value={formData.vendorAddress}
                  onChange={(e) => setFormData({ ...formData, vendorAddress: e.target.value })}
                  placeholder="Vendor address"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Additional Options
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 text-purple-600 bg-[var(--bg-primary)] border-[var(--border-color)] rounded focus:ring-purple-500"
              />
              <label htmlFor="isFeatured" className="text-sm font-medium text-[var(--text-secondary)]">
                Featured Product
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Warranty Period (months)</label>
              <Input
                type="number"
                min="0"
                value={formData.warrantyPeriod}
                onChange={(e) => setFormData({ ...formData, warrantyPeriod: e.target.value })}
                placeholder="12"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Return Policy</label>
              <textarea
                value={formData.returnPolicy}
                onChange={(e) => setFormData({ ...formData, returnPolicy: e.target.value })}
                placeholder="Return policy details..."
                className="w-full px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient">
              {selectedProduct ? 'Update' : 'Add'} Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Variant Modal */}
      <Modal
        isOpen={showVariantModal}
        onClose={() => {
          setShowVariantModal(false);
          setEditingVariantIndex(null);
          setVariantForm({
            id: '',
            size: '',
            color: '',
            strapColor: '',
            strapWidth: '',
            ukSize: '',
            usSize: '',
            stockQuantity: '',
            reservedQuantity: '',
            sku: '',
            price: '',
          });
        }}
        title={editingVariantIndex !== null ? 'Edit Variant' : 'Add Variant'}
        size="md"
      >
        <div className="space-y-4">
          {formData.category === 'shirts' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Size</label>
              <Select
                value={variantForm.size}
                onChange={(value) => setVariantForm({ ...variantForm, size: value })}
                options={[
                  { value: '', label: 'Select Size' },
                  ...(formData.categoryAttributes?.shirtSizes || []).map(s => ({ value: s, label: s })),
                ]}
              />
            </div>
          )}
          {(formData.category === 'shoes' || formData.category === 'boots') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">UK Size</label>
                <Select
                  value={variantForm.ukSize}
                  onChange={(value) => setVariantForm({ ...variantForm, ukSize: value })}
                  options={[
                    { value: '', label: 'Select UK Size' },
                    ...(formData.categoryAttributes?.ukSizes || []).map(s => ({ value: s, label: s })),
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">US Size</label>
                <Select
                  value={variantForm.usSize}
                  onChange={(value) => setVariantForm({ ...variantForm, usSize: value })}
                  options={[
                    { value: '', label: 'Select US Size' },
                    ...(formData.categoryAttributes?.usSizes || []).map(s => ({ value: s, label: s })),
                  ]}
                />
              </div>
            </div>
          )}
          {formData.category === 'watches' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Strap Color</label>
                <Select
                  value={variantForm.strapColor}
                  onChange={(value) => setVariantForm({ ...variantForm, strapColor: value })}
                  options={[
                    { value: '', label: 'Select Strap Color' },
                    ...(formData.categoryAttributes?.strapColors || []).map(c => ({ value: c, label: c })),
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Strap Width</label>
                <Select
                  value={variantForm.strapWidth}
                  onChange={(value) => setVariantForm({ ...variantForm, strapWidth: value })}
                  options={[
                    { value: '', label: 'Select Strap Width' },
                    ...(formData.categoryAttributes?.strapWidths || []).map(w => ({ value: w, label: w })),
                  ]}
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Color (General)</label>
            <Input
              value={variantForm.color}
              onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
              placeholder="Product color"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Stock Quantity <span className="text-red-400">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={variantForm.stockQuantity}
                onChange={(e) => setVariantForm({ ...variantForm, stockQuantity: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Reserved Quantity</label>
              <Input
                type="number"
                min="0"
                value={variantForm.reservedQuantity}
                onChange={(e) => setVariantForm({ ...variantForm, reservedQuantity: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Variant SKU</label>
              <Input
                value={variantForm.sku}
                onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value.toUpperCase() })}
                placeholder="Variant-specific SKU (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Variant Price ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={variantForm.price}
                onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                placeholder="Override product price (optional)"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowVariantModal(false);
                setEditingVariantIndex(null);
                setVariantForm({
                  id: '',
                  size: '',
                  color: '',
                  strapColor: '',
                  strapWidth: '',
                  ukSize: '',
                  usSize: '',
                  stockQuantity: '',
                  reservedQuantity: '',
                  sku: '',
                  price: '',
                });
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="gradient"
              onClick={() => {
                if (!variantForm.stockQuantity) {
                  toast.error('Stock quantity is required');
                  return;
                }
                // Preserve existing variant ID when editing, generate new ID when adding
                const variantId = editingVariantIndex !== null && formData.variants[editingVariantIndex]?.id
                  ? formData.variants[editingVariantIndex].id
                  : `${variantForm.size || variantForm.ukSize || variantForm.usSize || variantForm.strapColor || 'variant'}-${variantForm.color || 'default'}-${Date.now()}`;
                const newVariant = {
                  id: variantId,
                  size: variantForm.size || undefined,
                  color: variantForm.color || undefined,
                  strapColor: variantForm.strapColor || undefined,
                  strapWidth: variantForm.strapWidth || undefined,
                  ukSize: variantForm.ukSize || undefined,
                  usSize: variantForm.usSize || undefined,
                  stockQuantity: parseInt(variantForm.stockQuantity) || 0,
                  reservedQuantity: parseInt(variantForm.reservedQuantity) || 0,
                  sku: variantForm.sku || undefined,
                  price: variantForm.price ? parseFloat(variantForm.price) : undefined,
                };
                if (editingVariantIndex !== null) {
                  const newVariants = [...formData.variants];
                  newVariants[editingVariantIndex] = newVariant;
                  setFormData({ ...formData, variants: newVariants });
                } else {
                  setFormData({ ...formData, variants: [...formData.variants, newVariant] });
                }
                setShowVariantModal(false);
                setEditingVariantIndex(null);
                setVariantForm({
                  id: '',
                  size: '',
                  color: '',
                  strapColor: '',
                  strapWidth: '',
                  ukSize: '',
                  usSize: '',
                  stockQuantity: '',
                  reservedQuantity: '',
                  sku: '',
                  price: '',
                });
              }}
            >
              {editingVariantIndex !== null ? 'Update Variant' : 'Add Variant'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProductForDetail}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProductForDetail(null);
        }}
      />
    </div>
  );
}
