'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button, Input, Table } from '@/components/ui';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ShoppingBagIcon,
  PhotoIcon,
  TagIcon,
  CubeIcon,
  CheckCircleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowRightIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

// Dynamically import product detail modal
const ProductDetailModal = dynamic(() => import('@/components/products/ProductDetailModal'), { ssr: false });

interface Product {
  _id: string;
  id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  sellingPrice: number;
  discount?: number;
  stock: {
    quantity: number;
    availableQuantity: number;
  };
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
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  isFeatured?: boolean;
  tags?: string[];
  vendor?: {
    name: string;
    contact: string;
    email?: string;
    address?: string;
  };
  specifications?: Array<{ key: string; value: string }>;
  safetyFeatures?: string[];
  safetyStandards?: string[];
  certifications?: string[];
  warrantyPeriod?: number;
  returnPolicy?: string;
  createdAt?: string;
  updatedAt?: string;
  sku?: string;
  costPrice?: string;
  taxRate?: number;
  material?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
}

export default function ProductList({ products, isLoading = false }: ProductListProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only active products
  const activeProducts = products.filter(p => p.status === 'active');

  // Filter products based on search query - remove duplicates by _id
  const filteredProducts = activeProducts.filter((product, index, self) => {
    // Remove duplicates by _id
    const firstIndex = self.findIndex(p => p._id === product._id);
    if (firstIndex !== index) return false;
    
    // Apply search filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.brand?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Show all filtered products (table container will limit visible rows with max-height)
  const displayProducts = filteredProducts;

  // Table columns definition - only essential columns
  const columns = [
    { key: 'image', label: '', sortable: false },
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'price', label: 'Price', sortable: true },
    { key: 'stock', label: 'Stock', sortable: true },
    { key: 'actions', label: '', sortable: false },
  ];

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <div className="p-4 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingBagIcon className="w-5 h-5" />
              Products
            </h2>
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[var(--bg-input)] rounded-lg" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col p-0">
        <div className="p-3 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingBagIcon className="w-5 h-5" />
              Products
            </h2>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Link href="/dashboard/merchandise">
                <Button variant="secondary" size="sm" className="flex items-center gap-1 whitespace-nowrap">
                  <span className="hidden sm:inline">Show All</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-3">
              <ShoppingBagIcon className="w-16 h-16 text-[var(--text-muted)] mb-4" />
              <p className="text-[var(--text-muted)] text-center">
                {searchQuery ? 'No products found matching your search.' : 'No products available.'}
              </p>
            </div>
          ) : (
            <div className="p-2 overflow-y-auto scrollbar-thin" style={{ 
              scrollbarWidth: 'thin', 
              scrollbarColor: 'var(--border-color) var(--bg-input)', 
              maxHeight: '380px', // Shows approximately 5 rows (60px per row + header)
              height: '100%'
            }}>
              <Table
                columns={columns}
                data={displayProducts.map((product) => {
                const discountedPrice = product.discount
                  ? product.sellingPrice * (1 - product.discount / 100)
                  : product.sellingPrice;
                const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];

                return {
                  image: (
                    <div className="flex items-center justify-center w-12 h-12">
                      {primaryImage ? (
                        <img
                          src={primaryImage.url}
                          alt={primaryImage.alt || product.name}
                          className="w-full h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <PhotoIcon className="w-6 h-6 text-purple-500" />
                        </div>
                      )}
                    </div>
                  ),
                  name: (
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text-primary)] truncate max-w-[200px]">{product.name}</p>
                      {product.sku && (
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">SKU: {product.sku}</p>
                      )}
                    </div>
                  ),
                  category: (
                    <span className="capitalize text-sm truncate max-w-[100px] block">{product.category}</span>
                  ),
                  price: (
                    <div className="min-w-0">
                      {product.discount ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-[var(--text-primary)]">
                            ${discountedPrice.toFixed(2)}
                          </span>
                          <span className="text-xs line-through text-[var(--text-muted)]">
                            ${product.sellingPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-sm text-[var(--text-primary)]">
                          ${product.sellingPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ),
                  stock: (
                    <div className="flex items-center gap-1 text-sm">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{product.stock.availableQuantity}</span>
                    </div>
                  ),
                  actions: (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleProductClick(product)}
                      className="flex items-center gap-1 text-xs px-2 py-1"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">View Details</span>
                      <span className="sm:hidden">View</span>
                    </Button>
                  ),
                };
              })}
              compact
            />
            </div>
          )}
        </div>
      </Card>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedProduct(null);
        }}
      />
    </>
  );
}
