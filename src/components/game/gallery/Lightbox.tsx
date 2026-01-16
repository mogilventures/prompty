'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Columns2
} from 'lucide-react';
import { LazyImage } from './LazyImage';
import { ImageData } from './types';

interface LightboxProps {
  images: ImageData[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  showNSFW: boolean;
  comparisonMode?: boolean;
  onComparisonToggle?: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  showNSFW,
  comparisonMode = false,
  onComparisonToggle
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [comparisonIndex, setComparisonIndex] = useState(currentIndex + 1);

  const currentImage = images[currentIndex];
  const comparisonImage = images[comparisonIndex] || images[0];

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDrag = (event: PointerEvent, info: PanInfo) => {
    if (zoom > 1) {
      setPosition({
        x: position.x + info.delta.x,
        y: position.y + info.delta.y
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    setZoom(newZoom);

    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrevious();
          break;
        case 'ArrowRight':
          onNext();
          break;
        case 'f':
        case 'F':
          setIsFullscreen(!isFullscreen);
          break;
        case '+':
        case '=':
          setZoom(Math.min(3, zoom * 1.2));
          break;
        case '-':
          setZoom(Math.max(0.5, zoom / 1.2));
          break;
        case '0':
          resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrevious, isFullscreen, zoom]);

  useEffect(() => {
    resetZoom();
  }, [currentIndex]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen || !currentImage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button variant="secondary" size="sm" onClick={() => setZoom(Math.max(0.5, zoom / 1.2))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setZoom(Math.min(3, zoom * 1.2))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={resetZoom}>
            {zoom.toFixed(1)}x
          </Button>
          {onComparisonToggle && (
            <Button variant="secondary" size="sm" onClick={onComparisonToggle}>
              <Columns2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Image Container */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
        >
          {comparisonMode ? (
            <div className="flex gap-4 max-w-[90vw] max-h-[90vh]">
              <motion.div
                drag={zoom > 1}
                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                onDrag={handleDrag}
                className="relative"
                style={{
                  scale: zoom,
                  x: position.x,
                  y: position.y,
                }}
              >
                <img
                  src={currentImage.url}
                  alt={currentImage.prompt}
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                  <p className="text-sm">{currentImage.player}: {currentImage.prompt}</p>
                </div>
              </motion.div>

              <motion.div
                drag={zoom > 1}
                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                onDrag={handleDrag}
                className="relative"
                style={{
                  scale: zoom,
                  x: position.x,
                  y: position.y,
                }}
              >
                <img
                  src={comparisonImage.url}
                  alt={comparisonImage.prompt}
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                  <p className="text-sm">{comparisonImage.player}: {comparisonImage.prompt}</p>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              drag={zoom > 1}
              dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
              onDrag={handleDrag}
              className="relative max-w-[90vw] max-h-[90vh]"
              style={{
                scale: zoom,
                x: position.x,
                y: position.y,
              }}
            >
              <LazyImage
                src={currentImage.url}
                alt={currentImage.prompt}
                className="max-w-full max-h-full object-contain"
                blurred={currentImage.isNSFW && !showNSFW}
              />
            </motion.div>
          )}
        </div>

        {/* Metadata */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-4 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium">{currentImage.prompt}</p>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <span>By {currentImage.player}</span>
                <span>{currentImage.timestamp.toLocaleString()}</span>
                {currentImage.metadata && (
                  <span>{currentImage.metadata.width}×{currentImage.metadata.height}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Image Counter */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Lightbox;
