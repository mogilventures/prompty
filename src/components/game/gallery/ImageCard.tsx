'use client'

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heart, HeartOff, User, Clock, EyeOff } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { ImageData } from './types';

interface ImageCardProps {
  image: ImageData;
  index: number;
  onClick: () => void;
  onFavoriteToggle: () => void;
  showNSFW: boolean;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  index,
  onClick,
  onFavoriteToggle,
  showNSFW
}) => {
  const isBlurred = image.isNSFW && !showNSFW;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative break-inside-avoid mb-4"
    >
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-[4/3]" onClick={onClick}>
          <LazyImage
            src={image.url}
            thumbnailSrc={image.thumbnailUrl}
            alt={image.prompt}
            className="w-full h-full"
            blurred={isBlurred}
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <p className="text-xs line-clamp-2">{image.prompt}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {image.isNSFW && (
              <Badge variant="destructive" className="text-xs">
                NSFW
              </Badge>
            )}
          </div>

          {/* Blur overlay for NSFW */}
          {isBlurred && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="text-center text-white">
                <EyeOff className="w-6 h-6 mx-auto mb-1" />
                <p className="text-xs">Content Hidden</p>
              </div>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span>{image.player}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle();
              }}
              className="p-1 h-auto"
            >
              {image.isFavorite ? (
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              ) : (
                <HeartOff className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{image.timestamp.toLocaleDateString()}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default ImageCard;
