'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal, Badge } from '@/components/ui';
import dynamic from 'next/dynamic';
import {
  PhotoIcon,
  FilmIcon,
  CubeTransparentIcon,
  DocumentTextIcon,
  TagIcon,
  StarIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// Dynamically import 3D model viewer to avoid SSR issues
const Model3DViewer = dynamic(() => import('@/components/products/Model3DViewer'), { ssr: false });

interface Product {
  _id: string;
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
  sku?: string;
  material?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'images' | 'video' | '3d' | 'specs' | 'variants'>('overview');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [showZoom, setShowZoom] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('overview');
      setSelectedImageIndex(0);
      setShowZoom(false);
    }
  }, [isOpen]);

  if (!product) return null;

  const images = product.images || [];
  const currentImage = images[selectedImageIndex] || images[0];
  const selectedDiscountedPrice = product.discount
    ? product.sellingPrice * (1 - product.discount / 100)
    : product.sellingPrice;

  // Extract YouTube video ID for embedding
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  const videoEmbedUrl = product.videoUrl ? getYouTubeEmbedUrl(product.videoUrl) : null;

  // Handle image zoom on hover (Amazon-style)
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || !currentImage?.url) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setActiveTab('overview');
        setSelectedImageIndex(0);
        setShowZoom(false);
      }}
      title={product.name}
      size="xl"
      className="z-[10001] max-w-7xl"
    >
      <div className="space-y-4">
        {/* Tabs Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-[var(--border-color)] pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4 inline mr-1.5" />
            Overview
          </button>
          {images.length > 0 && (
            <button
              onClick={() => setActiveTab('images')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'images'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <PhotoIcon className="w-4 h-4 inline mr-1.5" />
              Images ({images.length})
            </button>
          )}
          {product.videoUrl && (
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <FilmIcon className="w-4 h-4 inline mr-1.5" />
              Video
            </button>
          )}
          {product.model3dUrl && (
            <button
              onClick={() => setActiveTab('3d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === '3d'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CubeTransparentIcon className="w-4 h-4 inline mr-1.5" />
              3D Model
            </button>
          )}
          {(product.specifications?.length || product.safetyFeatures?.length) && (
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'specs'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <DocumentTextIcon className="w-4 h-4 inline mr-1.5" />
              Specifications
            </button>
          )}
          {product.variants && product.variants.length > 0 && (
            <button
              onClick={() => setActiveTab('variants')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'variants'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <TagIcon className="w-4 h-4 inline mr-1.5" />
              Variants ({product.variants.length})
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Image with Zoom */}
              <div className="space-y-4">
                {currentImage?.url ? (
                  <div className="relative">
                    <div
                      ref={imageContainerRef}
                      className="relative w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-[var(--bg-input)] to-[var(--bg-secondary)] border-2 border-[var(--border-color)] cursor-zoom-in"
                      onMouseMove={handleImageMouseMove}
                      onMouseEnter={() => setShowZoom(true)}
                      onMouseLeave={() => setShowZoom(false)}
                    >
                      <img
                        src={currentImage.url}
                        alt={currentImage.alt || product.name}
                        className="w-full h-full object-contain transition-transform duration-300"
                      />
                      {/* Zoom Lens */}
                      {showZoom && (
                        <div
                          ref={zoomRef}
                          className="absolute pointer-events-none"
                          style={{
                            left: `${zoomPosition.x}%`,
                            top: `${zoomPosition.y}%`,
                            transform: 'translate(-50%, -50%)',
                            width: '150px',
                            height: '150px',
                            border: '2px solid rgba(147, 51, 234, 0.8)',
                            borderRadius: '50%',
                            background: 'rgba(147, 51, 234, 0.1)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 10,
                          }}
                        />
                      )}
                    </div>
                    {/* Zoomed Image Preview */}
                    {showZoom && (
                      <div
                        className="absolute left-full ml-4 top-0 w-96 h-96 rounded-xl overflow-hidden border-2 border-purple-500 shadow-2xl z-20 pointer-events-none hidden lg:block"
                        style={{
                          backgroundImage: `url(${currentImage.url})`,
                          backgroundSize: '300%',
                          backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                    )}
                    {/* Thumbnail Gallery */}
                    {images.length > 1 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4">
                        {images.map((image, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedImageIndex(idx);
                              setShowZoom(false);
                            }}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                              selectedImageIndex === idx
                                ? 'border-purple-500 ring-2 ring-purple-500/50 scale-105'
                                : 'border-[var(--border-color)] hover:border-purple-300 hover:scale-105'
                            }`}
                          >
                            <img
                              src={image.url}
                              alt={image.alt || `${product.name} - Image ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {image.isPrimary && (
                              <div className="absolute top-1 right-1">
                                <Badge variant="primary" size="sm" className="text-xs px-1 py-0">P</Badge>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-[var(--bg-input)] to-[var(--bg-secondary)] border-2 border-[var(--border-color)] flex items-center justify-center">
                    <PhotoIcon className="w-24 h-24 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>

              {/* Right Column - Product Info */}
              <div className="space-y-6">
                {/* Title and Badges */}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] pr-4">{product.name}</h2>
                    {product.isFeatured && (
                      <Badge variant="primary" className="flex items-center gap-1 flex-shrink-0">
                        <StarIcon className="w-4 h-4" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  {product.brand && (
                    <p className="text-lg text-[var(--text-muted)] mb-3">by {product.brand}</p>
                  )}
                  {product.sku && (
                    <p className="text-sm text-[var(--text-muted)]">SKU: {product.sku}</p>
                  )}
                </div>

                {/* Price Section */}
                <div className="p-6 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-xl border border-purple-500/20">
                  <div className="flex items-baseline gap-3 mb-2">
                    {product.discount ? (
                      <>
                        <span className="text-4xl font-bold text-[var(--text-primary)]">
                          ${selectedDiscountedPrice.toFixed(2)}
                        </span>
                        <span className="text-xl line-through text-[var(--text-muted)]">
                          ${product.sellingPrice.toFixed(2)}
                        </span>
                        <Badge variant="success" size="sm" className="text-base px-3 py-1">
                          Save {product.discount}%
                        </Badge>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-[var(--text-primary)]">
                        ${product.sellingPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className={`w-5 h-5 ${product.stock.availableQuantity > 0 ? 'text-green-500' : 'text-red-500'}`} />
                      <span className={`font-semibold ${product.stock.availableQuantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {product.stock.availableQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--text-muted)]">
                      {product.stock.availableQuantity} available
                    </span>
                  </div>
                </div>

                {/* Key Features */}
                {product.keyFeatures && product.keyFeatures.length > 0 && (
                  <div className="p-5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <StarIcon className="w-5 h-5 text-yellow-500" />
                      Key Features
                    </h3>
                    <ul className="space-y-2.5">
                      {product.keyFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-[var(--text-primary)]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Description */}
                {product.description && (
                  <div className="p-5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Description</h3>
                    <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {product.category && (
                    <div className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Category</p>
                      <p className="font-medium capitalize">{product.category.replace('_', ' ')}</p>
                    </div>
                  )}
                  {product.material && (
                    <div className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Material</p>
                      <p className="font-medium text-sm">{product.material}</p>
                    </div>
                  )}
                  {product.weight && (
                    <div className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Weight</p>
                      <p className="font-medium">{product.weight} kg</p>
                    </div>
                  )}
                  <div className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
                    <Badge
                      variant={product.status === 'active' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {product.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Safety Features */}
                {product.safetyFeatures && product.safetyFeatures.length > 0 && (
                  <div className="p-5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <ShieldCheckIcon className="w-5 h-5 text-blue-500" />
                      Safety Features
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {product.safetyFeatures.map((feature, idx) => (
                        <Badge key={idx} variant="primary" size="sm">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vendor Information */}
                {product.vendor && (
                  <div className="p-5 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl border border-blue-500/20">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />
                      Vendor Information
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-1">Name</p>
                        <p className="font-medium">{product.vendor.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-[var(--text-muted)] mb-1">Contact</p>
                          <p className="font-medium text-sm">{product.vendor.contact}</p>
                        </div>
                        {product.vendor.email && (
                          <div>
                            <p className="text-xs text-[var(--text-muted)] mb-1">Email</p>
                            <p className="font-medium text-sm">{product.vendor.email}</p>
                          </div>
                        )}
                      </div>
                      {product.vendor.address && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)] mb-1">Address</p>
                          <p className="font-medium text-sm">{product.vendor.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="flex gap-4 pt-4 border-t border-[var(--border-color)]">
                  {product.warrantyPeriod && (
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-5 h-5 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Warranty</p>
                        <p className="font-medium">{product.warrantyPeriod} months</p>
                      </div>
                    </div>
                  )}
                  {product.returnPolicy && (
                    <div className="flex items-center gap-2">
                      <TruckIcon className="w-5 h-5 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Return Policy</p>
                        <p className="font-medium text-sm">{product.returnPolicy}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Images Tab - Full Gallery */}
          {activeTab === 'images' && images.length > 0 && (
            <div className="space-y-4">
              <div className="relative w-full h-[500px] rounded-xl overflow-hidden bg-gradient-to-br from-[var(--bg-input)] to-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
                <img
                  src={currentImage?.url}
                  alt={currentImage?.alt || product.name}
                  className="w-full h-full object-contain"
                />
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {images.map((image, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageIndex === idx
                          ? 'border-purple-500 ring-2 ring-purple-500/50 scale-105'
                          : 'border-[var(--border-color)] hover:border-purple-300 hover:scale-105'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.alt || `${product.name} - Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {image.isPrimary && (
                        <div className="absolute top-1 right-1">
                          <Badge variant="primary" size="sm" className="text-xs">Primary</Badge>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Video Tab */}
          {activeTab === 'video' && product.videoUrl && (
            <div className="space-y-4">
              {videoEmbedUrl ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[var(--bg-input)] border-2 border-[var(--border-color)] shadow-lg">
                  <iframe
                    src={videoEmbedUrl}
                    title={`${product.name} - Video`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="p-12 bg-[var(--bg-input)] rounded-xl text-center border-2 border-[var(--border-color)]">
                  <FilmIcon className="w-20 h-20 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-muted)] mb-4 text-lg">Video URL format not supported for embedding</p>
                  <a
                    href={product.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    <PlayIcon className="w-5 h-5" />
                    Open Video in New Tab
                  </a>
                </div>
              )}
              <div className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">Video URL</p>
                <a
                  href={product.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-500 hover:underline text-sm break-all"
                >
                  {product.videoUrl}
                </a>
              </div>
            </div>
          )}

          {/* 3D Model Tab */}
          {activeTab === '3d' && product.model3dUrl && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border-2 border-[var(--border-color)] shadow-lg">
                <Model3DViewer
                  modelUrl={product.model3dUrl}
                  format={product.model3dFormat || 'glb'}
                  height="600px"
                  className="w-full"
                />
              </div>
              <div className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">3D Model URL</p>
                <a
                  href={product.model3dUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-500 hover:underline text-sm break-all"
                >
                  {product.model3dUrl}
                </a>
                {product.model3dFormat && (
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Format: {product.model3dFormat.toUpperCase()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Specifications Tab */}
          {activeTab === 'specs' && (
            <div className="space-y-6">
              {product.specifications && product.specifications.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Product Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.specifications.map((spec, idx) => (
                      <div key={idx} className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] hover:border-purple-500/50 transition-colors">
                        <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">{spec.key}</p>
                        <p className="text-base font-semibold text-[var(--text-primary)]">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.safetyFeatures && product.safetyFeatures.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <ShieldCheckIcon className="w-6 h-6 text-blue-500" />
                    Safety Features
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.safetyFeatures.map((feature, idx) => (
                      <Badge key={idx} variant="primary" size="sm" className="text-sm px-3 py-1.5">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.safetyStandards && product.safetyStandards.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Safety Standards</h3>
                  <ul className="space-y-2">
                    {product.safetyStandards.map((standard, idx) => (
                      <li key={idx} className="flex items-center gap-3 p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-[var(--text-primary)]">{standard}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.certifications && product.certifications.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.certifications.map((cert, idx) => (
                      <Badge key={idx} variant="success" size="sm" className="text-sm px-3 py-1.5">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.dimensions && (
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Dimensions</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {product.dimensions.length && (
                      <div className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] text-center">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Length</p>
                        <p className="text-xl font-bold">{product.dimensions.length} cm</p>
                      </div>
                    )}
                    {product.dimensions.width && (
                      <div className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] text-center">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Width</p>
                        <p className="text-xl font-bold">{product.dimensions.width} cm</p>
                      </div>
                    )}
                    {product.dimensions.height && (
                      <div className="p-4 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] text-center">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Height</p>
                        <p className="text-xl font-bold">{product.dimensions.height} cm</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Variants Tab */}
          {activeTab === 'variants' && product.variants && product.variants.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Product Variants</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {product.variants.map((variant, idx) => (
                  <div key={idx} className="p-5 bg-gradient-to-br from-[var(--bg-input)] to-[var(--bg-secondary)] rounded-xl border-2 border-[var(--border-color)] hover:border-purple-500/50 transition-all">
                    <div className="mb-4">
                      <p className="font-semibold text-[var(--text-primary)] mb-2 text-sm">
                        {variant.size && `Size: ${variant.size}`}
                        {variant.color && ` | Color: ${variant.color}`}
                        {variant.strapColor && ` | Strap: ${variant.strapColor}`}
                        {variant.strapWidth && ` (${variant.strapWidth})`}
                        {variant.ukSize && ` | UK: ${variant.ukSize}`}
                        {variant.usSize && ` | US: ${variant.usSize}`}
                      </p>
                      {variant.sku && (
                        <p className="text-xs text-[var(--text-muted)] mb-2">SKU: {variant.sku}</p>
                      )}
                      {variant.price && (
                        <p className="text-lg font-bold text-purple-500">
                          ${variant.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[var(--border-color)]">
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Total</p>
                        <p className="font-semibold text-sm">{variant.stock.quantity}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Reserved</p>
                        <p className="font-semibold text-sm">{variant.stock.reservedQuantity}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Available</p>
                        <p className={`font-semibold text-sm ${variant.stock.availableQuantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {variant.stock.availableQuantity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
