'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, Input, Select, Table, SkeletonLoader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
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
} from '@heroicons/react/24/outline';

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

interface MerchandiseClientProps {
  initialProducts: Product[];
}

export default function MerchandiseClient({ initialProducts }: MerchandiseClientProps) {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(initialProducts.length === 0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [featuredFilter, setFeaturedFilter] = useState(false);

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
    setSelectedProduct(null);
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
            Merchandise Management
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

          {/* Vendor Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Vendor Information
            </h3>
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
    </div>
  );
}
