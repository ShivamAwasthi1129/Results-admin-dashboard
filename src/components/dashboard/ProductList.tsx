'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button, Modal, Input, Table } from '@/components/ui';
import Link from 'next/link';
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
  warrantyPeriod?: number;
  returnPolicy?: string;
  createdAt?: string;
  updatedAt?: string;
  sku?: string;
  costPrice?: number;
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
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)] font-medium">Fetching products...</p>
        </div>
      </Card>
    );
  }

  if (activeProducts.length === 0) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <ShoppingBagIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">No products available</p>
        </div>
      </Card>
    );
  }

  if (filteredProducts.length === 0 && searchQuery) {
    return (
      <Card className="overflow-hidden h-full flex flex-col">
        {/* Header with Search */}
        <div className="p-4 border-b border-[var(--border-color)] flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className=" text-lg font-bold text-[var(--text-primary)]">Products</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {activeProducts.length} active products
              </p>
            </div>
          </div>
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, brand, category..."
              icon={<MagnifyingGlassIcon className="w-4 h-4" />}
              iconPosition="left"
              className="text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-input)] transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ShoppingBagIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)]">No products found matching "{searchQuery}"</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-0 overflow-hidden h-full flex flex-col">
        {/* Header with Search */}
        <div className="p-2 border-b border-[var(--border-color)] flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Products</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {searchQuery ? `${filteredProducts.length} of ${activeProducts.length}` : activeProducts.length} active products
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, brand, category..."
                icon={<MagnifyingGlassIcon className="w-4 h-4" />}
                iconPosition="left"
                className="text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-input)] transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
            </div>
            <Link href="/dashboard/merchandise">
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center gap-1.5 whitespace-nowrap"
              >
                Show All Products
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Products Table - Fixed height matching weather card, no horizontal scroll */}
        <div className="flex-1 overflow-y-auto" style={{ height: '100%', maxHeight: 'calc(100vh - 450px)', minHeight: '300px', overflowX: 'hidden' }}>
          <div className="w-full overflow-x-hidden">
            <Table
              columns={columns}
              data={filteredProducts.map((product) => {
              const productImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
              const discountedPrice = product.discount
                ? product.sellingPrice * (1 - product.discount / 100)
                : product.sellingPrice;

              return {
                image: (
                  <div className="w-10 h-10 rounded overflow-hidden bg-[var(--bg-input)] flex items-center justify-center flex-shrink-0">
                    {productImage?.url ? (
                      <img
                        src={productImage.url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PhotoIcon className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
                  </div>
                ),
                name: (
                  <div className="min-w-0 max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-[var(--text-primary)] truncate">{product.name}</span>
                      {product.isFeatured && (
                        <Badge variant="primary" size="sm" className="text-xs flex-shrink-0">
                          ⭐
                        </Badge>
                      )}
                    </div>
                    {product.brand && (
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {product.brand}
                      </p>
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
        </div>
      </Card>

      {/* Product Detail Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedProduct(null);
        }}
        title={selectedProduct?.name || 'Product Details'}
        size="lg"
        className="z-[10001]"
      >
        {selectedProduct && (() => {
          const selectedImage = selectedProduct.images?.find(img => img.isPrimary) || selectedProduct.images?.[0];
          const selectedDiscountedPrice = selectedProduct.discount
            ? selectedProduct.sellingPrice * (1 - selectedProduct.discount / 100)
            : selectedProduct.sellingPrice;
          
          return (
            <div className="space-y-6">
              {/* Product Image */}
              {selectedImage?.url && (
                <div className="relative w-full h-64 rounded-lg overflow-hidden bg-[var(--bg-input)]">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.alt || selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Category</p>
                  <p className="font-medium capitalize">{selectedProduct.category}</p>
                </div>
                {selectedProduct.brand && (
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">Brand</p>
                    <p className="font-medium">{selectedProduct.brand}</p>
                  </div>
                )}
                {selectedProduct.sku && (
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">SKU</p>
                    <p className="font-medium">{selectedProduct.sku}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Status</p>
                  <Badge
                    variant={selectedProduct.status === 'active' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {selectedProduct.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Price</p>
                  <div className="flex items-center gap-2">
                    {selectedProduct.discount ? (
                      <>
                        <span className="font-bold text-lg">${selectedDiscountedPrice.toFixed(2)}</span>
                        <span className="text-sm line-through text-[var(--text-muted)]">
                          ${selectedProduct.sellingPrice.toFixed(2)}
                        </span>
                        <Badge variant="success" size="sm">
                          {selectedProduct.discount}% OFF
                        </Badge>
                      </>
                    ) : (
                      <span className="font-bold text-lg">${selectedProduct.sellingPrice.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Stock</p>
                  <p className="font-medium">
                    {selectedProduct.stock.availableQuantity} available
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Description</p>
                  <p className="text-[var(--text-primary)]">{selectedProduct.description}</p>
                </div>
              )}

              {/* Specifications */}
              {selectedProduct.specifications && selectedProduct.specifications.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Specifications</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProduct.specifications.map((spec, idx) => (
                      <div key={idx} className="p-2 bg-[var(--bg-input)] rounded">
                        <p className="text-xs text-[var(--text-muted)]">{spec.key}</p>
                        <p className="text-sm font-medium">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Features */}
              {selectedProduct.safetyFeatures && selectedProduct.safetyFeatures.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Safety Features</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.safetyFeatures.map((feature, idx) => (
                      <Badge key={idx} variant="primary" size="sm">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendor Information */}
              {selectedProduct.vendor && (
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Vendor Information</p>
                  <div className="p-4 bg-[var(--bg-input)] rounded-lg space-y-2">
                    <p className="text-sm">
                      <span className="text-[var(--text-muted)]">Name:</span>{' '}
                      <span className="font-medium">{selectedProduct.vendor.name}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-[var(--text-muted)]">Contact:</span>{' '}
                      <span className="font-medium">{selectedProduct.vendor.contact}</span>
                    </p>
                    {selectedProduct.vendor.email && (
                      <p className="text-sm">
                        <span className="text-[var(--text-muted)]">Email:</span>{' '}
                        <span className="font-medium">{selectedProduct.vendor.email}</span>
                      </p>
                    )}
                    {selectedProduct.vendor.address && (
                      <p className="text-sm">
                        <span className="text-[var(--text-muted)]">Address:</span>{' '}
                        <span className="font-medium">{selectedProduct.vendor.address}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
                {selectedProduct.warrantyPeriod && (
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">Warranty</p>
                    <p className="font-medium">{selectedProduct.warrantyPeriod} months</p>
                  </div>
                )}
                {selectedProduct.returnPolicy && (
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">Return Policy</p>
                    <p className="font-medium text-sm">{selectedProduct.returnPolicy}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>


    </>
  );
}
