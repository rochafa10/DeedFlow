"use client";

/**
 * ImageGallery Component
 *
 * Displays property images in a responsive grid with lightbox functionality.
 * Supports viewing images fullscreen with captions and source information.
 *
 * Features:
 * - Responsive grid layout (1 col mobile, 2 tablet, 3 desktop)
 * - Hover effects with zoom icon overlay
 * - Fullscreen lightbox modal
 * - Keyboard navigation (Escape to close)
 * - Proper ARIA accessibility attributes
 * - Empty state for no images
 *
 * @module components/property-management/ImageGallery
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-24
 */

import { useState, useEffect, useCallback } from "react";
import { ZoomIn, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageGalleryProps, PropertyImage } from "@/types/property-management";

/**
 * ImageGallery displays property images in a responsive grid with lightbox capability.
 *
 * @param images - Array of PropertyImage objects to display
 * @param showSource - Whether to display the image source badge (default: true)
 * @param allowFullscreen - Whether to enable lightbox viewing (default: true)
 * @param onImageClick - Optional callback when an image is clicked
 * @param className - Additional CSS classes for the container
 *
 * @example
 * ```tsx
 * <ImageGallery
 *   images={property.images}
 *   showSource={true}
 *   allowFullscreen={true}
 *   onImageClick={(image, index) => console.log('Clicked:', image.caption)}
 * />
 * ```
 */
export function ImageGallery({
  images,
  showSource = true,
  allowFullscreen = true,
  onImageClick,
  className,
}: ImageGalleryProps) {
  // State for the lightbox modal
  const [enlargedImage, setEnlargedImage] = useState<{
    image: PropertyImage;
    index: number;
  } | null>(null);

  /**
   * Handle image click - open lightbox and trigger callback
   */
  const handleImageClick = useCallback(
    (image: PropertyImage, index: number) => {
      // Trigger external callback if provided
      onImageClick?.(image, index);

      // Open lightbox if allowed
      if (allowFullscreen) {
        setEnlargedImage({ image, index });
      }
    },
    [allowFullscreen, onImageClick]
  );

  /**
   * Close the lightbox modal
   */
  const closeLightbox = useCallback(() => {
    setEnlargedImage(null);
  }, []);

  /**
   * Handle keyboard events for lightbox
   */
  useEffect(() => {
    if (!enlargedImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [enlargedImage, closeLightbox]);

  // Empty state when no images
  if (!images || images.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-slate-500",
          className
        )}
        role="status"
        aria-label="No images available"
      >
        <ImageIcon className="h-12 w-12 mb-4 opacity-50" aria-hidden="true" />
        <p className="text-center">No images available for this property yet.</p>
        <p className="text-sm mt-2 text-center">
          Images will be loaded from Regrid after enrichment.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Image Grid */}
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Property Images ({images.length})
          </h3>
        </div>

        {/* Responsive Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          role="list"
          aria-label="Property images"
        >
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              role="listitem"
              className={cn(
                "relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-sm transition-shadow hover:shadow-md",
                allowFullscreen && "cursor-pointer"
              )}
              onClick={() => handleImageClick(image, index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleImageClick(image, index);
                }
              }}
              tabIndex={allowFullscreen ? 0 : undefined}
              aria-label={`${image.caption}. ${allowFullscreen ? "Press Enter to view full size." : ""}`}
            >
              {/* Image */}
              <div className="relative">
                <img
                  src={image.url}
                  alt={image.caption}
                  className="w-full h-56 sm:h-48 md:h-52 object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Hover Overlay with Zoom Icon */}
                {allowFullscreen && (
                  <div
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/90 rounded-full p-2.5 shadow-lg">
                        <ZoomIn className="h-5 w-5 text-slate-700" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Caption and Source */}
              <div className="p-3 bg-white">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {image.caption}
                </p>
                {showSource && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Source: {formatSource(image.source)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`Viewing image: ${enlargedImage.image.caption}`}
        >
          {/* Modal Content Container */}
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute -top-10 sm:-top-12 right-0 p-2 text-white hover:text-slate-300 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50 rounded-full"
              aria-label="Close image viewer"
            >
              <X className="h-6 w-6 sm:h-8 sm:w-8" />
            </button>

            {/* Large Image */}
            <img
              src={enlargedImage.image.url}
              alt={enlargedImage.image.caption}
              className="w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />

            {/* Caption Below Image */}
            <div className="text-center mt-2 sm:mt-4 px-4">
              <p className="text-white text-sm sm:text-lg">
                {enlargedImage.image.caption}
              </p>
              {showSource && (
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Source: {formatSource(enlargedImage.image.source)}
                </p>
              )}
              {/* Image counter */}
              <p className="text-slate-500 text-xs mt-2">
                {enlargedImage.index + 1} of {images.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Format the image source for display
 * Converts source identifiers to human-readable labels
 */
function formatSource(source: string): string {
  const sourceMap: Record<string, string> = {
    regrid: "Regrid",
    google_maps: "Google Maps",
    street_view: "Street View",
    google_street_view: "Google Street View",
    user_upload: "User Upload",
    zillow: "Zillow",
    aerial: "Aerial View",
    satellite: "Satellite",
  };

  // Check for known sources
  const lowerSource = source.toLowerCase();
  if (sourceMap[lowerSource]) {
    return sourceMap[lowerSource];
  }

  // Capitalize first letter of unknown sources
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export default ImageGallery;
