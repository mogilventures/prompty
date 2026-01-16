import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ImageItem, GridSettings, FilterOptions, SortOption } from "@/types/imageGrid";
import ImageGridControls from "./ImageGridControls";
import ImageGridItem from "./ImageGridItem";
import { useIsMobile } from "@/hooks/useMobileDetection";
import { cn } from "@/lib/utils";

interface ResponsiveImageGridProps {
  images: ImageItem[];
  onImageClick?: (image: ImageItem) => void;
  onImagesReorder?: (images: ImageItem[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
}

const SortableGridItem: React.FC<{
  image: ImageItem;
  index: number;
  columnIndex: number;
  rowIndex: number;
  columnWidth: number;
  rowHeight: number;
  gap: number;
  aspectRatio: string;
  isSelected: boolean;
  onImageClick: (image: ImageItem) => void;
  onSelectionToggle: (image: ImageItem) => void;
  isDragging: boolean;
}> = ({ 
  image, 
  index, 
  columnIndex,
  rowIndex,
  columnWidth, 
  rowHeight, 
  gap, 
  aspectRatio, 
  isSelected, 
  onImageClick, 
  onSelectionToggle,
  isDragging 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const left = columnIndex * (columnWidth + gap);
  const top = rowIndex * (rowHeight + gap);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'absolute',
        left,
        top,
        width: columnWidth,
        height: rowHeight,
      }}
      {...attributes}
      {...listeners}
    >
      <ImageGridItem
        image={image}
        isSelected={isSelected}
        onImageClick={onImageClick}
        onSelectionToggle={onSelectionToggle}
        aspectRatio={aspectRatio}
        isDragging={isDragging || isSortableDragging}
      />
    </div>
  );
};

const ResponsiveImageGrid: React.FC<ResponsiveImageGridProps> = ({
  images,
  onImageClick,
  onImagesReorder,
  onLoadMore,
  hasMore = false,
  loading = false,
  className,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    columns: { mobile: 1, tablet: 2, desktop: 3, wide: 5 },
    gap: 16,
    aspectRatio: "auto",
    itemSize: "medium",
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    tags: [],
    aspectRatio: "auto",
  });
  const [sortOption, setSortOption] = useState<SortOption>({
    key: "newest",
    label: "Newest First",
    direction: "desc",
  });
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Screen size detection
  const [screenSize, setScreenSize] = useState<"mobile" | "tablet" | "desktop" | "wide">("desktop");
  
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize("mobile");
      else if (width < 768) setScreenSize("tablet");
      else if (width < 1536) setScreenSize("desktop");
      else setScreenSize("wide");
    };
    
    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter and sort images
  const processedImages = useMemo(() => {
    let filtered = [...images];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(image =>
        image.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        image.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply tag filters
    if (filterOptions.tags.length > 0) {
      filtered = filtered.filter(image =>
        filterOptions.tags.some(tag => image.tags.includes(tag))
      );
    }

    // Apply aspect ratio filter
    if (filterOptions.aspectRatio && filterOptions.aspectRatio !== "auto") {
      filtered = filtered.filter(image => {
        const ratio = image.aspectRatio;
        switch (filterOptions.aspectRatio) {
          case "square":
            return Math.abs(ratio - 1) < 0.1;
          case "landscape":
            return ratio > 1.2;
          case "portrait":
            return ratio < 0.8;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { key, direction } = sortOption;
      let comparison = 0;

      switch (key) {
        case "newest":
        case "oldest":
          comparison = b.createdAt.getTime() - a.createdAt.getTime();
          if (key === "oldest") comparison = -comparison;
          break;
        case "popular":
          comparison = b.popularity - a.popularity;
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "random":
          comparison = Math.random() - 0.5;
          break;
      }

      return direction === "asc" ? -comparison : comparison;
    });

    return filtered;
  }, [images, filterOptions, sortOption, searchQuery]);

  // Grid calculations
  const columns = gridSettings.columns[screenSize];
  const gap = gridSettings.gap;
  
  const calculateDimensions = useCallback(() => {
    if (!gridRef.current) return { columnWidth: 200, rowHeight: 200 };
    
    const containerWidth = gridRef.current.clientWidth;
    const availableWidth = containerWidth - (gap * (columns - 1));
    const columnWidth = Math.floor(availableWidth / columns);
    
    let rowHeight = columnWidth;
    
    // Adjust height based on aspect ratio setting
    if (gridSettings.aspectRatio !== "auto") {
      switch (gridSettings.aspectRatio) {
        case "square":
          rowHeight = columnWidth;
          break;
        case "landscape":
          rowHeight = Math.floor(columnWidth * 0.75);
          break;
        case "portrait":
          rowHeight = Math.floor(columnWidth * 1.33);
          break;
      }
    }
    
    // Apply size multiplier
    const sizeMultipliers = { small: 0.8, medium: 1, large: 1.2 };
    const multiplier = sizeMultipliers[gridSettings.itemSize];
    
    return {
      columnWidth: Math.floor(columnWidth * multiplier),
      rowHeight: Math.floor(rowHeight * multiplier),
    };
  }, [columns, gap, gridSettings.aspectRatio, gridSettings.itemSize]);

  const { columnWidth, rowHeight } = calculateDimensions();

  // Calculate grid layout
  const rows = Math.ceil(processedImages.length / columns);
  const gridHeight = rows * (rowHeight + gap) - gap;

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = processedImages.findIndex(item => item.id === active.id);
      const newIndex = processedImages.findIndex(item => item.id === over?.id);
      
      const newImages = arrayMove(processedImages, oldIndex, newIndex);
      onImagesReorder?.(newImages);
    }
  }, [processedImages, onImagesReorder]);

  // Selection handlers
  const handleSelectionToggle = useCallback((image: ImageItem) => {
    if (!selectionMode) return;
    
    const newSelected = new Set(selectedImages);
    if (newSelected.has(image.id)) {
      newSelected.delete(image.id);
    } else {
      newSelected.add(image.id);
    }
    setSelectedImages(newSelected);
  }, [selectedImages, selectionMode]);

  const handleSelectAll = useCallback(() => {
    if (selectedImages.size === processedImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(processedImages.map(img => img.id)));
    }
  }, [processedImages, selectedImages.size]);

  // Render grid items
  const renderGridItems = () => {
    return processedImages.map((image, index) => {
      const columnIndex = index % columns;
      const rowIndex = Math.floor(index / columns);
      
      return (
        <SortableGridItem
          key={image.id}
          image={image}
          index={index}
          columnIndex={columnIndex}
          rowIndex={rowIndex}
          columnWidth={columnWidth}
          rowHeight={rowHeight}
          gap={gap}
          aspectRatio={gridSettings.aspectRatio}
          isSelected={selectedImages.has(image.id)}
          onImageClick={onImageClick || (() => {})}
          onSelectionToggle={handleSelectionToggle}
          isDragging={false}
        />
      );
    });
  };

  // Empty state
  if (processedImages.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <ImageGridControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          gridSettings={gridSettings}
          onGridSettingsChange={setGridSettings}
          filterOptions={filterOptions}
          onFilterOptionsChange={setFilterOptions}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
          selectionMode={selectionMode}
          onSelectionModeChange={setSelectionMode}
          selectedCount={selectedImages.size}
          totalCount={processedImages.length}
          onSelectAll={handleSelectAll}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          availableTags={[...new Set(images.flatMap(img => img.tags))]}
        />
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-lg font-semibold mb-2">No images found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or search query.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <ImageGridControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        gridSettings={gridSettings}
        onGridSettingsChange={setGridSettings}
        filterOptions={filterOptions}
        onFilterOptionsChange={setFilterOptions}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        selectionMode={selectionMode}
        onSelectionModeChange={setSelectionMode}
        selectedCount={selectedImages.size}
        totalCount={processedImages.length}
        onSelectAll={handleSelectAll}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        availableTags={[...new Set(images.flatMap(img => img.tags))]}
      />

      {viewMode === "grid" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={gridRef}
            className="relative w-full"
            style={{ height: gridHeight }}
          >
            <SortableContext
              items={processedImages.map(img => img.id)}
              strategy={rectSortingStrategy}
            >
              {renderGridItems()}
            </SortableContext>
          </div>
        </DndContext>
      ) : (
        // List view
        <div className="space-y-4">
          {processedImages.map((image) => (
            <motion.div
              key={image.id}
              layout
              className="flex items-center space-x-4 p-4 bg-card rounded-lg border"
            >
              <img
                src={image.src}
                alt={image.title}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{image.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {image.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {image.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-block bg-muted text-muted-foreground text-xs px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {image.popularity} views
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center pt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More Images"}
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default ResponsiveImageGrid;