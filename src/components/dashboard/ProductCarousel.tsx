'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button, Modal } from '@/components/ui';
import {
  ShoppingBagIcon,
  PhotoIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  TagIcon,
  CubeIcon,
  CheckCircleIcon,
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
}

interface ProductCarouselProps {
  products: Product[];
  isLoading?: boolean;
}

export default function ProductCarousel({ products, isLoading = false }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Filter only active products (show all, not just featured)
  const displayProducts = products.filter(p => p.status === 'active').slice(0, 20);

  useEffect(() => {
    if (displayProducts.length === 0 || isLoading) return;

    // Auto-slide every 5 seconds
    intervalRef.current = setInterval(() => {
      handleNext();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [displayProducts.length, isLoading]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handlePrev = () => {
    if (isTransitioning || displayProducts.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + displayProducts.length) % displayProducts.length);
    setTimeout(() => setIsTransitioning(false), 600);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        handleNext();
      }, 5000);
    }
  };

  const handleNext = () => {
    if (isTransitioning || displayProducts.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % displayProducts.length);
    setTimeout(() => setIsTransitioning(false), 600);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        handleNext();
      }, 5000);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card className="p-0 overflow-hidden relative">
        <div className="h-96 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[var(--text-muted)] font-medium">Fetching products...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (displayProducts.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <ShoppingBagIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">No products available</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-0 overflow-hidden relative group">
        <div
          ref={carouselRef}
          className="relative h-96 cursor-pointer overflow-hidden"
          onClick={() => displayProducts[currentIndex] && handleProductClick(displayProducts[currentIndex])}
        >
          {/* Product Slides Container */}
          <div 
            className="flex h-full transition-transform duration-[600ms] ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {displayProducts.map((product, idx) => {
              const productImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
              const productDiscountedPrice = product.discount
                ? product.sellingPrice * (1 - product.discount / 100)
                : product.sellingPrice;
              
              return (
                <div
                  key={product.id || product._id}
                  className="min-w-full h-full relative flex-shrink-0"
                >
                  {/* Background Image with Better Overlay */}
                  <div className="absolute inset-0">
                    {productImage?.url ? (
                      <img
                        src={productImage.url}
                        alt={productImage.alt || product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                        <PhotoIcon className="w-32 h-32 text-white/30" />
                      </div>
                    )}
                    {/* Dark overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70" />
                    {/* Accent gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-transparent to-pink-600/40" />
                  </div>

                  {/* Content Overlay */}
                  <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {product.isFeatured && (
                          <Badge 
                            variant="primary" 
                            className="mb-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-lg"
                          >
                            ⭐ Featured Product
                          </Badge>
                        )}
                        <h3 className="text-3xl font-bold mb-2 drop-shadow-lg">{product.name}</h3>
                        {product.description && (
                          <p className="text-white/95 text-sm mb-4 line-clamp-2 drop-shadow-md">{product.description}</p>
                        )}
                        <div className="flex items-center gap-4 mb-4">
                          {product.brand && (
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                              <TagIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">{product.brand}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            <CubeIcon className="w-4 h-4" />
                            <span className="text-sm font-medium capitalize">{product.category}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          {product.discount ? (
                            <>
                              <span className="text-4xl font-bold drop-shadow-lg">${productDiscountedPrice.toFixed(2)}</span>
                              <span className="text-xl line-through opacity-70">${product.sellingPrice.toFixed(2)}</span>
                              <Badge variant="success" className="ml-2 bg-green-500 text-white border-0 shadow-lg">
                                {product.discount}% OFF
                              </Badge>
                            </>
                          ) : (
                            <span className="text-4xl font-bold drop-shadow-lg">${product.sellingPrice.toFixed(2)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            <CheckCircleIcon className="w-4 h-4" />
                            {product.stock.availableQuantity} in stock
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="gradient"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(product);
                        }}
                        className="bg-white text-purple-600 hover:bg-white/90 shadow-xl font-semibold"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Arrows */}
          {displayProducts.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/90 hover:bg-white rounded-full transition-all shadow-xl backdrop-blur-sm group"
                disabled={isTransitioning}
              >
                <svg className="w-6 h-6 text-purple-600 group-hover:text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/90 hover:bg-white rounded-full transition-all shadow-xl backdrop-blur-sm group"
                disabled={isTransitioning}
              >
                <svg className="w-6 h-6 text-purple-600 group-hover:text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {displayProducts.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              {displayProducts.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isTransitioning) {
                      setIsTransitioning(true);
                      setCurrentIndex(index);
                      setTimeout(() => setIsTransitioning(false), 600);
                    }
                  }}
                  className={`rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-white w-8 h-2 shadow-lg' 
                      : 'bg-white/50 w-2 h-2 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
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
