export interface ImageData {
  id: string;
  url: string;
  thumbnailUrl?: string;
  player: string;
  prompt: string;
  timestamp: Date;
  isFavorite?: boolean;
  isNSFW?: boolean;
  metadata?: {
    width?: number;
    height?: number;
    fileSize?: string;
  };
}

export interface ImageGalleryProps {
  images: ImageData[];
  className?: string;
  onImageClick?: (image: ImageData, index: number) => void;
  onFavoriteToggle?: (imageId: string, isFavorite: boolean) => void;
  showNSFW?: boolean;
  enableComparison?: boolean;
  autoLayout?: boolean;
}
