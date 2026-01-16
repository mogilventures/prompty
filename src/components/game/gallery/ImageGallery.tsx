'use client'

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import { ImageCard } from './ImageCard';
import { Lightbox } from './Lightbox';
import { ImageData, ImageGalleryProps } from './types';

// Mock placeholder images for demo
const generateMockImages = (): ImageData[] => {
  const prompts = [
    "A cat wearing a wizard hat in a mystical forest",
    "Cyberpunk cityscape with neon lights reflecting on wet streets",
    "A majestic dragon perched on a crystal mountain peak",
    "Underwater coral reef with bioluminescent creatures",
    "Steampunk airship floating above Victorian London",
    "Ancient library filled with floating magical books",
    "Robot chef cooking in a futuristic kitchen",
    "Enchanted garden with glowing flowers and fairy lights",
    "Space station orbiting a purple nebula",
    "Medieval knight battling a mechanical demon"
  ];

  const players = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"];

  return Array.from({ length: 20 }, (_, i) => ({
    id: `img-${i}`,
    url: `https://picsum.photos/${400 + (i % 3) * 100}/${300 + (i % 4) * 100}?random=${i}`,
    thumbnailUrl: `https://picsum.photos/${200}/${150}?random=${i}`,
    player: players[i % players.length],
    prompt: prompts[i % prompts.length],
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
    isFavorite: Math.random() > 0.7,
    isNSFW: Math.random() > 0.8,
    metadata: {
      width: 400 + (i % 3) * 100,
      height: 300 + (i % 4) * 100,
      fileSize: `${(Math.random() * 2 + 0.5).toFixed(1)}MB`
    }
  }));
};

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images: propImages,
  className,
  onImageClick,
  onFavoriteToggle,
  showNSFW = false,
  enableComparison = true,
  autoLayout = true
}) => {
  const [images, setImages] = useState<ImageData[]>(
    propImages.length > 0 ? propImages : generateMockImages()
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showNSFWContent, setShowNSFWContent] = useState(showNSFW);
  const [comparisonMode, setComparisonMode] = useState(false);

  const handleImageClick = (image: ImageData, index: number) => {
    setLightboxIndex(index);
    onImageClick?.(image, index);
  };

  const handleFavoriteToggle = (imageId: string) => {
    setImages(prev => prev.map(img =>
      img.id === imageId
        ? { ...img, isFavorite: !img.isFavorite }
        : img
    ));

    const image = images.find(img => img.id === imageId);
    if (image) {
      onFavoriteToggle?.(imageId, !image.isFavorite);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);

  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
    }
  };

  const previousImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === 0 ? images.length - 1 : lightboxIndex - 1);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNSFWContent(!showNSFWContent)}
            className="flex items-center gap-1"
          >
            {showNSFWContent ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span className="text-xs">
              {showNSFWContent ? 'Hide' : 'Show'} NSFW
            </span>
          </Button>
        </div>

        <Badge variant="secondary" className="text-xs">
          {images.length} images
        </Badge>
      </div>

      {/* Masonry Grid */}
      <div
        className={cn(
          "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4",
          autoLayout && "auto-cols-max"
        )}
      >
        {images.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            index={index}
            onClick={() => handleImageClick(image, index)}
            onFavoriteToggle={() => handleFavoriteToggle(image.id)}
            showNSFW={showNSFWContent}
          />
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        images={images}
        currentIndex={lightboxIndex || 0}
        isOpen={lightboxIndex !== null}
        onClose={closeLightbox}
        onNext={nextImage}
        onPrevious={previousImage}
        showNSFW={showNSFWContent}
        comparisonMode={comparisonMode}
        onComparisonToggle={enableComparison ? () => setComparisonMode(!comparisonMode) : undefined}
      />
    </div>
  );
};

export default ImageGallery;
