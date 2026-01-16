'use client'

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export const ImageSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-muted rounded-lg", className)}>
    <div className="aspect-[4/3] bg-muted-foreground/20 rounded-lg" />
  </div>
);

interface LazyImageProps {
  src: string;
  thumbnailSrc?: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  blurred?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  thumbnailSrc,
  alt,
  className,
  onLoad,
  onError,
  blurred
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoaded(false);
  };

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {!isInView && <ImageSkeleton className="absolute inset-0" />}

      {isInView && (
        <>
          {thumbnailSrc && !isLoaded && (
            <motion.img
              src={thumbnailSrc}
              alt={alt}
              className="absolute inset-0 w-full h-full object-cover blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}

          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground">
              <div className="text-center space-y-2">
                <p className="text-sm">Failed to load image</p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <motion.img
              src={src}
              alt={alt}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                blurred && "blur-md",
                isLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={handleLoad}
              onError={handleError}
              animate={{
                opacity: isLoaded ? 1 : 0,
                filter: blurred ? "blur(8px)" : "blur(0px)"
              }}
              transition={{ duration: 0.3 }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default LazyImage;
