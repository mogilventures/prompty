import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import ResponsiveImageGrid from "@/components/grid/ResponsiveImageGrid";
import { ImageItem, generateMockImages } from "@/types/imageGrid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ImageGridDemo: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Initialize with mock images
  useEffect(() => {
    const initialImages = generateMockImages(50);
    setImages(initialImages);
  }, []);

  const handleImageClick = (image: ImageItem) => {
    console.log("Image clicked:", image);
    // Could open lightbox, navigate to detail page, etc.
  };

  const handleImagesReorder = (reorderedImages: ImageItem[]) => {
    setImages(reorderedImages);
  };

  const handleLoadMore = async () => {
    if (loading) return;
    
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newImages = generateMockImages(20);
    setImages(prev => [...prev, ...newImages]);
    
    // Simulate reaching end of results
    if (images.length >= 100) {
      setHasMore(false);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Image Grid Demo - Responsive Gallery</title>
        <meta name="description" content="Responsive image grid with filtering, sorting, and advanced controls" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Responsive Image Grid</h1>
          <div className="flex flex-wrap gap-4 items-center">
            <Card className="flex-1 min-w-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Badge variant="outline">Responsive</Badge>
                  <Badge variant="outline">Draggable</Badge>
                  <Badge variant="outline">Filterable</Badge>
                  <Badge variant="outline">Sortable</Badge>
                  <Badge variant="outline">Selectable</Badge>
                  <Badge variant="outline">Searchable</Badge>
                  <Badge variant="outline">Virtualized</Badge>
                  <Badge variant="outline">Infinite Scroll</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Images:</span>
                    <Badge>{images.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Unique Tags:</span>
                    <Badge>{[...new Set(images.flatMap(img => img.tags))].length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Has More:</span>
                    <Badge variant={hasMore ? "default" : "secondary"}>
                      {hasMore ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Grid */}
        <ResponsiveImageGrid
          images={images}
          onImageClick={handleImageClick}
          onImagesReorder={handleImagesReorder}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ImageGridDemo;